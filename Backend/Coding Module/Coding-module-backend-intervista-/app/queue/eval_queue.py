import json
import os
import time
import uuid
import logging
from typing import Optional, Tuple, Dict, Any, List
import redis

logger = logging.getLogger("eval_queue")

EVAL_QUEUE_KEY = "eval_queue"
EVAL_PROCESSING_KEY = "eval_processing"
EVAL_DEAD_LETTER_KEY = "eval_dead_letter"
EVAL_LEASE_PREFIX = "eval_lease:"

DEFAULT_LEASE_TTL = 30  # seconds
DEFAULT_MAX_RETRIES = 3

# Lua Script Definitions for Atomic Operations
RENEW_LEASE_LUA = """
if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('EXPIRE', KEYS[1], ARGV[2])
else
    return 0
end
"""

ACK_LUA = """
if redis.call('GET', KEYS[2]) == ARGV[2] then
    redis.call('LREM', KEYS[1], 1, ARGV[1])
    redis.call('DEL', KEYS[2])
    return 1
else
    return 0
end
"""


RECLAIM_STUCK_JOB_LUA = """
if redis.call('EXISTS', KEYS[3]) == 0 then
    local removed = redis.call('LREM', KEYS[1], 1, ARGV[1])
    if removed > 0 then
        redis.call('RPUSH', KEYS[2], ARGV[1])
        return 1
    end
end
return 0
"""


class EvalQueue:
    """
    Durable Redis reliable queue implementation using BRPOPLPUSH / RPOPLPUSH
    with atomic heartbeat lease ownership and persistent retry tracking.
    """

    def __init__(
        self,
        redis_client: Optional[redis.Redis] = None,
        redis_url: Optional[str] = None,
        queue_key: str = EVAL_QUEUE_KEY,
        processing_key: str = EVAL_PROCESSING_KEY,
        dead_letter_key: str = EVAL_DEAD_LETTER_KEY,
        lease_ttl: int = DEFAULT_LEASE_TTL,
        max_retries: int = DEFAULT_MAX_RETRIES,
    ):
        if redis_client:
            self.redis = redis_client
        else:
            url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
            self.redis = redis.Redis.from_url(url, decode_responses=True)

        self.queue_key = queue_key
        self.processing_key = processing_key
        self.dead_letter_key = dead_letter_key
        self.lease_ttl = lease_ttl
        self.max_retries = max_retries

        # Register Lua scripts
        self._renew_script = self.redis.register_script(RENEW_LEASE_LUA)
        self._ack_script = self.redis.register_script(ACK_LUA)
        self._reclaim_script = self.redis.register_script(RECLAIM_STUCK_JOB_LUA)

    def enqueue(self, submission_id: str) -> Dict[str, Any]:
        """
        Pushes a new submission job payload to eval_queue.
        Returns the created job payload dictionary.
        """
        payload = {
            "submission_id": str(submission_id),
            "enqueued_at": time.time(),
            "retry_count": 0,
        }
        payload_str = json.dumps(payload)
        self.redis.rpush(self.queue_key, payload_str)
        logger.info(f"Enqueued submission {submission_id} to {self.queue_key}")
        return payload

    def dequeue_and_claim(
        self, timeout: int = 2
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str], Optional[str]]:
        """
        Atomically pops job from eval_queue to eval_processing using BRPOPLPUSH.
        Sets a unique lease token on eval_lease:{submission_id} with TTL=30s.
        Returns: (payload_dict, claim_token, raw_payload_json_str) or (None, None, None)
        """
        raw_payload = self.redis.brpoplpush(
            self.queue_key, self.processing_key, timeout=timeout
        )
        if not raw_payload:
            return None, None, None

        # Handle decoding if redis client doesn't decode responses automatically
        if isinstance(raw_payload, bytes):
            raw_payload_str = raw_payload.decode("utf-8")
        else:
            raw_payload_str = str(raw_payload)

        try:
            payload = json.loads(raw_payload_str)
        except Exception as e:
            logger.error(f"Failed to parse dequeued job payload: {raw_payload_str}, error: {e}")
            # Move unparseable job to dead letter
            self.redis.lrem(self.processing_key, 1, raw_payload_str)
            self.redis.rpush(self.dead_letter_key, raw_payload_str)
            return None, None, None

        submission_id = payload.get("submission_id")
        claim_token = str(uuid.uuid4())
        lease_key = f"{EVAL_LEASE_PREFIX}{submission_id}"

        # Set lease with claim_token and TTL atomically
        self.redis.set(lease_key, claim_token, ex=self.lease_ttl)
        logger.info(f"Claimed job {submission_id} with claim_token {claim_token}")
        return payload, claim_token, raw_payload_str

    def renew_lease(self, submission_id: str, claim_token: str) -> bool:
        """
        Atomically extends lease TTL to 30s if current claim_token matches.
        Returns True if successful, False if lease was lost or owned by another worker.
        """
        lease_key = f"{EVAL_LEASE_PREFIX}{submission_id}"
        result = self._renew_script(keys=[lease_key], args=[claim_token, self.lease_ttl])
        return bool(result)

    def ack(self, raw_payload_str: str, submission_id: str, claim_token: str) -> bool:
        """
        Acknowledges complete job by removing raw_payload_str from eval_processing
        and deleting the lease key ONLY if owned by claim_token.
        Returns True if successful, False if ownership check failed.
        """
        lease_key = f"{EVAL_LEASE_PREFIX}{submission_id}"
        result = self._ack_script(
            keys=[self.processing_key, lease_key],
            args=[raw_payload_str, claim_token],
        )
        if bool(result):
            logger.info(f"ACK completed for submission {submission_id}")
            return True
        else:
            logger.warning(f"ACK failed for submission {submission_id}: lease not owned by claim_token")
            return False


    def nack_retry(
        self,
        payload: Dict[str, Any],
        raw_payload_str: str,
        claim_token: str,
        error_msg: str = "",
    ) -> bool:
        """
        Handles infrastructure retry failure.
        Increments payload['retry_count'] and evaluates against MAX_JOB_RETRIES (3).
        If retries remaining: re-enqueues updated payload to eval_queue.
        If retries exhausted: moves to eval_dead_letter queue.
        Always cleans up processing key and lease for current claim attempt.
        Returns True if re-enqueued for retry, False if sent to dead-letter queue.
        """
        submission_id = payload.get("submission_id")
        current_retries = payload.get("retry_count", 0) + 1
        payload["retry_count"] = current_retries

        # Remove old payload from processing & lease key
        lease_key = f"{EVAL_LEASE_PREFIX}{submission_id}"
        self._ack_script(
            keys=[self.processing_key, lease_key],
            args=[raw_payload_str, claim_token],
        )

        new_payload_str = json.dumps(payload)
        if current_retries < self.max_retries:
            logger.warning(
                f"Infrastructure failure for {submission_id} ({error_msg}). "
                f"Retrying ({current_retries}/{self.max_retries})..."
            )
            self.redis.rpush(self.queue_key, new_payload_str)
            return True
        else:
            logger.error(
                f"Infrastructure failure retries EXHAUSTED for {submission_id} ({error_msg}). "
                f"Moving job to {self.dead_letter_key}..."
            )
            self.redis.rpush(self.dead_letter_key, new_payload_str)
            return False

    def recover_stuck_jobs(self) -> int:
        """
        Sweeps eval_processing and atomically reclaims jobs whose lease key
        is genuinely missing/expired.
        Returns total count of reclaimed jobs.
        """
        items = self.redis.lrange(self.processing_key, 0, -1)
        reclaimed_count = 0
        for item in items:
            item_str = item.decode("utf-8") if isinstance(item, bytes) else str(item)
            try:
                payload = json.loads(item_str)
                sub_id = payload.get("submission_id")
                if not sub_id:
                    continue
                lease_key = f"{EVAL_LEASE_PREFIX}{sub_id}"
                # Atomic Lua check & reclaim
                res = self._reclaim_script(
                    keys=[self.processing_key, self.queue_key, lease_key],
                    args=[item_str],
                )
                if res:
                    reclaimed_count += 1
                    logger.warning(f"Reclaimed stuck job {sub_id} from {self.processing_key} to {self.queue_key}")
            except Exception as e:
                logger.error(f"Error checking stuck job item {item_str}: {e}")
        return reclaimed_count

    def get_stats(self) -> Dict[str, int]:
        """
        Returns real-time queue length metrics.
        """
        try:
            return {
                "queue_depth": self.redis.llen(self.queue_key) or 0,
                "processing_count": self.redis.llen(self.processing_key) or 0,
                "dead_letter_count": self.redis.llen(self.dead_letter_key) or 0,
            }
        except Exception as e:
            logger.error(f"Error fetching queue stats: {e}")
            return {"queue_depth": 0, "processing_count": 0, "dead_letter_count": 0}


# Global singleton instance holder
_queue_instance: Optional[EvalQueue] = None


def get_eval_queue() -> EvalQueue:
    global _queue_instance
    if _queue_instance is None:
        _queue_instance = EvalQueue()
    return _queue_instance
