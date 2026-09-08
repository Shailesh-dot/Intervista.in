import json
import uuid
import pytest
from unittest.mock import MagicMock, patch
from app.queue.eval_queue import EvalQueue, EVAL_LEASE_PREFIX
from app.storage.submission_store import (
    store_submission_enqueue,
    store_final_submission_results,
    get_submission,
)
from app.models.submission_result import SubmissionResult as DBSubmissionResult
from app.db.session import db_session


class FakeRedis:
    """In-memory Redis mock supporting BRPOPLPUSH, LREM, RPUSH, SET, GET, EXPIRE, DEL, EXISTS."""

    def __init__(self):
        self.lists = {}
        self.kv = {}
        self.scripts = {}

    def rpush(self, key, value):
        self.lists.setdefault(key, []).append(value)
        return len(self.lists[key])

    def brpoplpush(self, src, dst, timeout=2):
        if src in self.lists and self.lists[src]:
            val = self.lists[src].pop(0)
            self.lists.setdefault(dst, []).append(val)
            return val
        return None

    def lrem(self, key, count, value):
        if key not in self.lists:
            return 0
        removed = 0
        lst = self.lists[key]
        i = 0
        while i < len(lst):
            if lst[i] == value:
                lst.pop(i)
                removed += 1
                if count > 0 and removed >= count:
                    break
            else:
                i += 1
        return removed

    def lrange(self, key, start, end):
        lst = self.lists.get(key, [])
        if end == -1:
            return lst[start:]
        return lst[start : end + 1]

    def llen(self, key):
        return len(self.lists.get(key, []))

    def set(self, key, value, ex=None):
        self.kv[key] = str(value)
        return True

    def get(self, key):
        return self.kv.get(key)

    def incr(self, key, amount=1):
        cur = int(self.kv.get(key, 0))
        new_val = cur + amount
        self.kv[key] = str(new_val)
        return new_val

    def mget(self, keys):
        return [self.kv.get(k) for k in keys]

    def ltrim(self, key, start, end):
        if key in self.lists:
            self.lists[key] = self.lists[key][start:]
        return True

    def pipeline(self):
        class Pipeline:
            def __init__(p_self, redis_inst):
                p_self.redis_inst = redis_inst
                p_self.cmds = []

            def incr(p_self, key, amount=1):
                p_self.cmds.append(("incr", key, amount))
                return p_self

            def rpush(p_self, key, val):
                p_self.cmds.append(("rpush", key, val))
                return p_self

            def ltrim(p_self, key, start, end):
                p_self.cmds.append(("ltrim", key, start, end))
                return p_self

            def execute(p_self):
                res = []
                for cmd in p_self.cmds:
                    if cmd[0] == "incr":
                        res.append(p_self.redis_inst.incr(cmd[1], cmd[2]))
                    elif cmd[0] == "rpush":
                        res.append(p_self.redis_inst.rpush(cmd[1], cmd[2]))
                    elif cmd[0] == "ltrim":
                        res.append(p_self.redis_inst.ltrim(cmd[1], cmd[2], cmd[3]))
                return res

        return Pipeline(self)

    def delete(self, *keys):
        count = 0
        for k in keys:
            if k in self.kv:
                del self.kv[k]
                count += 1
            if k in self.lists:
                del self.lists[k]
                count += 1
        return count

    def exists(self, key):
        return 1 if key in self.kv or key in self.lists else 0



    def register_script(self, script_str):
        def script_runner(keys, args):
            # Simple emulation of Lua scripts for testing
            if "EXPIRE" in script_str and "GET" in script_str:
                # Renew lease script
                key, token, ttl = keys[0], args[0], args[1]
                if self.kv.get(key) == str(token):
                    return 1
                return 0

            if "GET" in script_str and "LREM" in script_str:
                # ACK script (verifies ownership before LREM)
                proc_key, lease_key = keys[0], keys[1]
                payload_str, token = args[0], args[1]
                if self.kv.get(lease_key) == str(token):
                    self.lrem(proc_key, 1, payload_str)
                    self.delete(lease_key)
                    return 1
                return 0

            if "EXISTS" in script_str and "RPUSH" in script_str:
                # Reclaim script
                proc_key, queue_key, lease_key = keys[0], keys[1], keys[2]
                payload_str = args[0]
                if lease_key not in self.kv:
                    rem = self.lrem(proc_key, 1, payload_str)
                    if rem > 0:
                        self.rpush(queue_key, payload_str)
                        return 1
                return 0

            return 0

        return script_runner


def test_queue_enqueue_and_dequeue():
    fake_redis = FakeRedis()
    queue = EvalQueue(redis_client=fake_redis)

    sub_id = str(uuid.uuid4())
    payload = queue.enqueue(sub_id)

    assert payload["submission_id"] == sub_id
    assert payload["retry_count"] == 0
    assert fake_redis.llen(queue.queue_key) == 1

    dequeued_payload, token, raw_str = queue.dequeue_and_claim(timeout=1)
    assert dequeued_payload["submission_id"] == sub_id
    assert token is not None
    assert fake_redis.llen(queue.queue_key) == 0
    assert fake_redis.llen(queue.processing_key) == 1

    lease_key = f"{EVAL_LEASE_PREFIX}{sub_id}"
    assert fake_redis.get(lease_key) == token


def test_lease_renewal_and_ownership():
    fake_redis = FakeRedis()
    queue = EvalQueue(redis_client=fake_redis)

    sub_id = str(uuid.uuid4())
    queue.enqueue(sub_id)
    payload, token, raw_str = queue.dequeue_and_claim()

    # Valid token renewal
    assert queue.renew_lease(sub_id, token) is True

    # Invalid token renewal
    assert queue.renew_lease(sub_id, "wrong_token") is False


def test_atomic_ack_and_cleanup():
    fake_redis = FakeRedis()
    queue = EvalQueue(redis_client=fake_redis)

    sub_id = str(uuid.uuid4())
    queue.enqueue(sub_id)
    payload, token, raw_str = queue.dequeue_and_claim()

    assert fake_redis.llen(queue.processing_key) == 1
    lease_key = f"{EVAL_LEASE_PREFIX}{sub_id}"
    assert fake_redis.get(lease_key) == token

    ack_res = queue.ack(raw_str, sub_id, token)
    assert ack_res is True

    assert fake_redis.llen(queue.processing_key) == 0
    assert fake_redis.get(lease_key) is None


def test_ack_fails_with_wrong_claim_token():
    fake_redis = FakeRedis()
    queue = EvalQueue(redis_client=fake_redis)

    sub_id = str(uuid.uuid4())
    queue.enqueue(sub_id)
    payload, token_a, raw_str = queue.dequeue_and_claim()

    lease_key = f"{EVAL_LEASE_PREFIX}{sub_id}"

    # Worker B attempts ACK with wrong token
    wrong_token_b = str(uuid.uuid4())
    ack_res = queue.ack(raw_str, sub_id, wrong_token_b)

    # ACK must fail
    assert ack_res is False
    # Processing key must still contain the job
    assert fake_redis.llen(queue.processing_key) == 1
    # Worker A's lease must still exist
    assert fake_redis.get(lease_key) == token_a

    # Worker A can still successfully ACK with correct token
    ack_res_a = queue.ack(raw_str, sub_id, token_a)
    assert ack_res_a is True
    assert fake_redis.llen(queue.processing_key) == 0
    assert fake_redis.get(lease_key) is None



def test_persistent_retry_count():
    fake_redis = FakeRedis()
    queue = EvalQueue(redis_client=fake_redis, max_retries=3)

    sub_id = str(uuid.uuid4())
    queue.enqueue(sub_id)

    # Attempt 1 -> Failure 1
    p1, t1, raw1 = queue.dequeue_and_claim()
    retried = queue.nack_retry(p1, raw1, t1, error_msg="503 Error")
    assert retried is True
    assert fake_redis.llen(queue.queue_key) == 1

    # Attempt 2 -> Failure 2
    p2, t2, raw2 = queue.dequeue_and_claim()
    assert p2["retry_count"] == 1
    retried = queue.nack_retry(p2, raw2, t2, error_msg="503 Error")
    assert retried is True

    # Attempt 3 -> Failure 3 (Retries exhausted)
    p3, t3, raw3 = queue.dequeue_and_claim()
    assert p3["retry_count"] == 2
    retried = queue.nack_retry(p3, raw3, t3, error_msg="503 Error")
    assert retried is False  # Dead lettered!
    assert fake_redis.llen(queue.dead_letter_key) == 1
    assert fake_redis.llen(queue.queue_key) == 0


def test_reclaim_stuck_jobs_only_after_lease_expiry():
    fake_redis = FakeRedis()
    queue = EvalQueue(redis_client=fake_redis)

    sub_id_active = str(uuid.uuid4())
    sub_id_stuck = str(uuid.uuid4())

    queue.enqueue(sub_id_active)
    queue.enqueue(sub_id_stuck)

    # Claim active job
    p_act, t_act, raw_act = queue.dequeue_and_claim()

    # Claim stuck job and manually delete its lease key
    p_stk, t_stk, raw_stk = queue.dequeue_and_claim()
    fake_redis.delete(f"{EVAL_LEASE_PREFIX}{sub_id_stuck}")

    # Reclaim sweep
    reclaimed = queue.recover_stuck_jobs()
    assert reclaimed == 1
    assert fake_redis.llen(queue.queue_key) == 1
    assert fake_redis.llen(queue.processing_key) == 1  # Active job remains in processing


def test_store_final_submission_results_idempotency():
    sub_id = f"test_idemp_{uuid.uuid4()}"
    store_submission_enqueue(
        sub_id=sub_id,
        question_id="q_sum_of_digits",
        candidate_id="cand_test",
        language="python",
        code="print(1)",
    )

    tc_results = [
        {"test_case_id": "1", "status": "Accepted", "execution_time": 0.01, "stdout": "1", "stderr": "", "compile_output": ""},
        {"test_case_id": "2", "status": "Accepted", "execution_time": 0.02, "stdout": "2", "stderr": "", "compile_output": ""},
    ]

    # First write
    store_final_submission_results(
        sub_id,
        {"status": "Accepted", "job_status": "completed", "score": 100.0},
        tc_results,
    )

    sub1 = get_submission(sub_id)
    assert len(sub1.test_case_results) == 2
    assert sub1.status == "Accepted"

    # Second write (retry overwrite)
    tc_results_retry = [
        {"test_case_id": "1", "status": "Accepted", "execution_time": 0.01, "stdout": "1", "stderr": "", "compile_output": ""},
        {"test_case_id": "2", "status": "Accepted", "execution_time": 0.02, "stdout": "2", "stderr": "", "compile_output": ""},
        {"test_case_id": "3", "status": "Accepted", "execution_time": 0.03, "stdout": "3", "stderr": "", "compile_output": ""},
    ]

    store_final_submission_results(
        sub_id,
        {"status": "Accepted", "job_status": "completed", "score": 100.0},
        tc_results_retry,
    )

    sub2 = get_submission(sub_id)
    # Guaranteed exact row count, zero duplicates!
    assert len(sub2.test_case_results) == 3


def test_redis_backed_global_metrics_increment_and_read():
    from app.utils.metrics import SystemMetrics
    fake_redis = FakeRedis()
    m = SystemMetrics(redis_client=fake_redis)

    m.record_submission_accepted()
    m.record_submission_completed(duration=0.5, test_cases=10)
    m.record_submission_completed(duration=1.5, test_cases=10)
    m.record_submission_failed(is_timeout=True)

    summary = m.get_summary()
    assert summary["scope"] == "global_redis"
    assert summary["submissions_accepted"] == 1
    assert summary["submissions_completed"] == 2
    assert summary["submissions_failed"] == 1
    assert summary["queue_timeout_errors"] == 1
    assert summary["evaluation_duration_seconds"]["average"] == 1.0
    assert summary["evaluation_duration_seconds"]["max"] == 1.5


def test_metrics_reset_clears_global_counters():
    from app.utils.metrics import SystemMetrics
    fake_redis = FakeRedis()
    m = SystemMetrics(redis_client=fake_redis)

    m.record_submission_accepted()
    m.reset()

    summary = m.get_summary()
    assert summary["submissions_accepted"] == 0
    assert summary["submissions_completed"] == 0


def test_metrics_fail_safe_behavior():
    from app.utils.metrics import SystemMetrics

    class BrokenRedis:
        def incr(self, *args, **kwargs):
            raise Exception("Redis Connection Error")

        def pipeline(self, *args, **kwargs):
            raise Exception("Redis Connection Error")

    m = SystemMetrics(redis_client=BrokenRedis())
    # Should log warning and NOT raise exception
    m.record_submission_accepted()
    m.record_submission_completed(duration=0.1, test_cases=5)
    m.record_submission_failed(is_timeout=True)

