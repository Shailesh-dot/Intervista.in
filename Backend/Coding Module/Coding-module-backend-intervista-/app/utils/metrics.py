import os
import time
import logging
import threading
from typing import Dict, List, Any, Optional
import redis

logger = logging.getLogger("metrics")

METRIC_ACCEPTED_KEY = "metrics:submissions_accepted"
METRIC_COMPLETED_KEY = "metrics:submissions_completed"
METRIC_FAILED_KEY = "metrics:submissions_failed"
METRIC_429_KEY = "metrics:http_429_count"
METRIC_JUDGE0_ERR_KEY = "metrics:judge0_api_errors"
METRIC_TIMEOUT_ERR_KEY = "metrics:queue_timeout_errors"
METRIC_DURATIONS_KEY = "metrics:eval_durations"
METRIC_TESTCASES_KEY = "metrics:test_case_counts"

MAX_HISTOGRAM_SAMPLES = 1000


class SystemMetrics:
    """
    Shared, Redis-backed metric collector for process-global observability
    across multi-worker FastAPI and Evaluator deployments.
    Fully fail-safe: failures during metrics operations will never disrupt core submission flow.
    """

    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self._lock = threading.Lock()
        self._redis_client = redis_client
        # Local fallback counters
        self.submissions_accepted = 0
        self.submissions_completed = 0
        self.submissions_failed = 0
        self.http_429_count = 0
        self.judge0_api_errors = 0
        self.queue_timeout_errors = 0
        self.eval_durations: List[float] = []
        self.test_case_counts: List[int] = []

    def _get_redis(self) -> Optional[redis.Redis]:
        if self._redis_client is not None:
            return self._redis_client
        try:
            url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            self._redis_client = redis.Redis.from_url(url, decode_responses=True)
            return self._redis_client
        except Exception as e:
            logger.warning(f"Metrics failed to connect to Redis: {e}")
            return None

    def record_submission_accepted(self):
        with self._lock:
            self.submissions_accepted += 1
        try:
            r = self._get_redis()
            if r:
                r.incr(METRIC_ACCEPTED_KEY)
        except Exception as e:
            logger.warning(f"Fail-safe metric recording error (record_submission_accepted): {e}")

    def record_submission_completed(self, duration: float, test_cases: int):
        with self._lock:
            self.submissions_completed += 1
            self.eval_durations.append(duration)
            self.test_case_counts.append(test_cases)
        try:
            r = self._get_redis()
            if r:
                pipe = r.pipeline()
                pipe.incr(METRIC_COMPLETED_KEY)
                pipe.rpush(METRIC_DURATIONS_KEY, float(duration))
                pipe.ltrim(METRIC_DURATIONS_KEY, -MAX_HISTOGRAM_SAMPLES, -1)
                pipe.rpush(METRIC_TESTCASES_KEY, int(test_cases))
                pipe.ltrim(METRIC_TESTCASES_KEY, -MAX_HISTOGRAM_SAMPLES, -1)
                pipe.execute()
        except Exception as e:
            logger.warning(f"Fail-safe metric recording error (record_submission_completed): {e}")

    def record_submission_failed(self, is_timeout: bool = False, is_judge0_err: bool = False):
        with self._lock:
            self.submissions_failed += 1
            if is_timeout:
                self.queue_timeout_errors += 1
            if is_judge0_err:
                self.judge0_api_errors += 1
        try:
            r = self._get_redis()
            if r:
                pipe = r.pipeline()
                pipe.incr(METRIC_FAILED_KEY)
                if is_timeout:
                    pipe.incr(METRIC_TIMEOUT_ERR_KEY)
                if is_judge0_err:
                    pipe.incr(METRIC_JUDGE0_ERR_KEY)
                pipe.execute()
        except Exception as e:
            logger.warning(f"Fail-safe metric recording error (record_submission_failed): {e}")

    def record_429(self):
        with self._lock:
            self.http_429_count += 1
        try:
            r = self._get_redis()
            if r:
                r.incr(METRIC_429_KEY)
        except Exception as e:
            logger.warning(f"Fail-safe metric recording error (record_429): {e}")

    def get_summary(self) -> Dict[str, Any]:
        """
        Returns globally aggregated metrics from Application Redis if available,
        falling back to local in-memory metrics on connection failure.
        """
        try:
            r = self._get_redis()
            if r:
                # Read global atomic counters
                vals = r.mget([
                    METRIC_ACCEPTED_KEY,
                    METRIC_COMPLETED_KEY,
                    METRIC_FAILED_KEY,
                    METRIC_429_KEY,
                    METRIC_JUDGE0_ERR_KEY,
                    METRIC_TIMEOUT_ERR_KEY,
                ])
                acc = int(vals[0] or 0)
                comp = int(vals[1] or 0)
                fail = int(vals[2] or 0)
                c429 = int(vals[3] or 0)
                j_err = int(vals[4] or 0)
                t_err = int(vals[5] or 0)

                # Fetch global duration list for percentiles
                raw_durations = r.lrange(METRIC_DURATIONS_KEY, 0, -1)
                durations = sorted([float(d) for d in raw_durations if d])
                count = len(durations)

                avg_dur = sum(durations) / count if count > 0 else 0.0
                p50_dur = durations[int(count * 0.50)] if count > 0 else 0.0
                p95_dur = durations[int(count * 0.95)] if count > 0 else 0.0
                max_dur = max(durations) if count > 0 else 0.0

                raw_tc = r.lrange(METRIC_TESTCASES_KEY, 0, -1)
                tc_list = [int(tc) for tc in raw_tc if tc]
                avg_tc = sum(tc_list) / len(tc_list) if tc_list else 0.0

                queue_stats = {"queue_depth": 0, "processing_count": 0, "dead_letter_count": 0}
                try:
                    from app.queue.eval_queue import get_eval_queue
                    queue_stats = get_eval_queue().get_stats()
                except Exception:
                    pass

                return {
                    "scope": "global_redis",
                    "submissions_accepted": acc,
                    "submissions_completed": comp,
                    "submissions_failed": fail,
                    "http_429_count": c429,
                    "judge0_api_errors": j_err,
                    "queue_timeout_errors": t_err,
                    "queue": queue_stats,
                    "evaluation_duration_seconds": {
                        "average": round(avg_dur, 3),
                        "p50": round(p50_dur, 3),
                        "p95": round(p95_dur, 3),
                        "max": round(max_dur, 3),
                    },
                    "average_test_cases_per_submission": round(avg_tc, 2),
                }
        except Exception as e:
            logger.warning(f"Error fetching global Redis metrics: {e}. Falling back to process local.")

        # Process-local fallback
        with self._lock:
            durations = sorted(self.eval_durations)
            count = len(durations)
            avg_dur = sum(durations) / count if count > 0 else 0.0
            p50_dur = durations[int(count * 0.50)] if count > 0 else 0.0
            p95_dur = durations[int(count * 0.95)] if count > 0 else 0.0
            max_dur = max(durations) if count > 0 else 0.0
            avg_tc = sum(self.test_case_counts) / count if count > 0 else 0.0

            return {
                "scope": "process_local_fallback",
                "submissions_accepted": self.submissions_accepted,
                "submissions_completed": self.submissions_completed,
                "submissions_failed": self.submissions_failed,
                "http_429_count": self.http_429_count,
                "judge0_api_errors": self.judge0_api_errors,
                "queue_timeout_errors": self.queue_timeout_errors,
                "queue": {"queue_depth": 0, "processing_count": 0, "dead_letter_count": 0},
                "evaluation_duration_seconds": {
                    "average": round(avg_dur, 3),
                    "p50": round(p50_dur, 3),
                    "p95": round(p95_dur, 3),
                    "max": round(max_dur, 3),
                },
                "average_test_cases_per_submission": round(avg_tc, 2),
            }

    def reset(self):
        """
        Resets both Redis global counters and process-local fallback metrics.
        """
        with self._lock:
            self.submissions_accepted = 0
            self.submissions_completed = 0
            self.submissions_failed = 0
            self.http_429_count = 0
            self.judge0_api_errors = 0
            self.queue_timeout_errors = 0
            self.eval_durations.clear()
            self.test_case_counts.clear()

        try:
            r = self._get_redis()
            if r:
                r.delete(
                    METRIC_ACCEPTED_KEY,
                    METRIC_COMPLETED_KEY,
                    METRIC_FAILED_KEY,
                    METRIC_429_KEY,
                    METRIC_JUDGE0_ERR_KEY,
                    METRIC_TIMEOUT_ERR_KEY,
                    METRIC_DURATIONS_KEY,
                    METRIC_TESTCASES_KEY,
                )
        except Exception as e:
            logger.warning(f"Error resetting Redis global metrics: {e}")


metrics = SystemMetrics()
