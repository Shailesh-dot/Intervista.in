import os
import sys
import time
import signal
import threading
import logging
from concurrent.futures import ThreadPoolExecutor, Future
from typing import Optional, Dict, Any, Tuple

from app.queue.eval_queue import get_eval_queue, EvalQueue
from app.services.question_service import fetch_question
from app.services.execution.code_builder import build_code
from app.services.judge0_service import submit_batch, poll_batch
from app.utils.formatter import normalize_output
from app.utils.languages import get_language_id
from app.exceptions.custom_exceptions import Judge0Error
from app.storage.submission_store import (
    get_submission,
    get_submission_record,
    update_submission_status,
    store_final_submission_results,
)

from app.utils.metrics import metrics
from app.constants import (
    STATUS_COMPILE_ERROR,
    VERDICT_ACCEPTED,
    VERDICT_WRONG_ANSWER,
    VERDICT_COMPILE_ERROR,
    VERDICT_PARTIAL,
)

logger = logging.getLogger("evaluator_worker")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


def _safe_parse_time(val) -> float:
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0


def _get_cpu_limit(difficulty: str) -> float:
    return {"Easy": 1.0, "Medium": 2.0, "Hard": 3.0}.get(difficulty, 2.0)


class EvaluatorWorker:
    """
    Dedicated evaluator worker process with controlled concurrency,
    heartbeat lease renewals, persistent retry handling, and atomic DB updates.
    """

    def __init__(
        self,
        eval_queue: Optional[EvalQueue] = None,
        concurrency: Optional[int] = None,
        shutdown_timeout: int = 30,
    ):
        self.queue = eval_queue or get_eval_queue()
        self.concurrency = concurrency or int(os.getenv("EVALUATOR_CONCURRENCY", "4"))
        self.shutdown_timeout = shutdown_timeout
        self.running = False
        self.executor: Optional[ThreadPoolExecutor] = None
        self._reconciler_thread: Optional[threading.Thread] = None

    def start(self):
        """
        Starts worker pool loop and background reconciler.
        Blocks until SIGINT/SIGTERM is received.
        """
        logger.info(
            f"🚀 Starting Evaluator Worker (EVALUATOR_CONCURRENCY={self.concurrency})"
        )
        self.running = True

        # Register signal handlers
        signal.signal(signal.SIGINT, self._handle_shutdown)
        signal.signal(signal.SIGTERM, self._handle_shutdown)

        # Initial stuck-job recovery sweep on startup
        try:
            reclaimed = self.queue.recover_stuck_jobs()
            if reclaimed > 0:
                logger.info(f"Startup sweep reclaimed {reclaimed} stuck job(s)")
        except Exception as e:
            logger.error(f"Error during startup stuck-job sweep: {e}")

        # Start periodic background reconciler
        self._reconciler_thread = threading.Thread(
            target=self._run_reconciler_loop, daemon=True
        )
        self._reconciler_thread.start()

        # Start ThreadPoolExecutor for concurrent worker threads
        self.executor = ThreadPoolExecutor(
            max_workers=self.concurrency, thread_name_prefix="eval_worker"
        )

        futures: Dict[Future, int] = {}

        try:
            while self.running:
                # Submit work to pool while slots are available
                while len(futures) < self.concurrency and self.running:
                    # Dequeue next job with 2s timeout
                    payload, claim_token, raw_payload_str = self.queue.dequeue_and_claim(
                        timeout=2
                    )
                    if payload and claim_token and raw_payload_str:
                        fut = self.executor.submit(
                            self._process_job, payload, claim_token, raw_payload_str
                        )
                        futures[fut] = payload.get("submission_id")
                    else:
                        break

                # Clean up completed futures
                done = [f for f in futures if f.done()]
                for f in done:
                    sub_id = futures.pop(f)
                    try:
                        f.result()
                    except Exception as e:
                        logger.error(
                            f"Unhandled exception in worker thread for {sub_id}: {e}",
                            exc_info=True,
                        )

                time.sleep(0.1)

        except KeyboardInterrupt:
            logger.info("KeyboardInterrupt received")

        finally:
            self.stop()

    def stop(self):
        """
        Gracefully stops worker threadpool and shuts down cleanly.
        """
        if not self.running:
            return
        logger.info("🛑 Shutting down Evaluator Worker gracefully...")
        self.running = False

        if self.executor:
            self.executor.shutdown(wait=True, cancel_futures=False)
            logger.info("Worker thread pool terminated cleanly.")

    def _handle_shutdown(self, signum, frame):
        logger.info(f"Signal {signum} received. Initiating graceful shutdown...")
        self.stop()
        sys.exit(0)

    def _run_reconciler_loop(self):
        """
        Periodically (every 60s) checks eval_processing and reclaims stuck jobs.
        """
        while self.running:
            try:
                time.sleep(60)
                if self.running:
                    reclaimed = self.queue.recover_stuck_jobs()
                    if reclaimed > 0:
                        logger.info(f"Reconciler sweep reclaimed {reclaimed} stuck job(s)")
            except Exception as e:
                logger.error(f"Error in reconciler loop: {e}")

    def _process_job(
        self, payload: Dict[str, Any], claim_token: str, raw_payload_str: str
    ):
        """
        Executes single submission evaluation with heartbeat lease renewal.
        """
        sub_id = payload.get("submission_id")
        start_time = time.time()
        logger.info(f"Processing submission_id={sub_id} (claim_token={claim_token[:8]}...)")

        # 1. State Gate Check
        existing_sub = get_submission_record(sub_id)
        if not existing_sub:
            logger.error(f"Submission {sub_id} not found in DB. Skipping.")
            self.queue.ack(raw_payload_str, sub_id, claim_token)
            return

        if existing_sub.get("job_status") == "completed":
            logger.info(f"Submission {sub_id} is already completed. Skipping & ACKing.")
            self.queue.ack(raw_payload_str, sub_id, claim_token)
            return

        # Start heartbeat thread for this active job
        heartbeat_stop_event = threading.Event()
        heartbeat_thread = threading.Thread(
            target=self._run_heartbeat,
            args=(sub_id, claim_token, heartbeat_stop_event),
            daemon=True,
        )
        heartbeat_thread.start()

        # Update DB job status to running
        update_submission_status(sub_id, {"job_status": "running"})

        try:
            # 2. Fetch question details & prepare execution payloads
            question = fetch_question(existing_sub["question_id"])
            language_id = get_language_id(existing_sub["language"])
            final_code = build_code(existing_sub["source_code"])


            all_cases = []
            for tc in question.sample_test_cases:
                all_cases.append((tc, False))
            for tc in question.hidden_test_cases:
                all_cases.append((tc, True))

            total_test_cases = len(all_cases)
            if not all_cases:
                store_final_submission_results(
                    sub_id,
                    {"status": VERDICT_ACCEPTED, "job_status": "completed", "total_test_cases": 0, "score": 100.0},
                    [],
                )
                self.queue.ack(raw_payload_str, sub_id, claim_token)
                metrics.record_submission_completed(time.time() - start_time, 0)
                return

            cpu_limit = _get_cpu_limit(question.difficulty)
            payloads = [
                {
                    "source_code": final_code,
                    "language_id": language_id,
                    "stdin": tc[0]["input"],
                    "cpu_time_limit": cpu_limit,
                }
                for tc in all_cases
            ]

            # 3. Judge0 Execution (submit_batch + poll_batch)
            tokens, submit_duration = submit_batch(payloads)
            results, poll_attempts, poll_duration = poll_batch(tokens)

            # 4. Parse candidate code verdicts
            passed = 0
            compile_error_output = ""
            total = len(all_cases)
            tc_results_db = []

            for i, (res, (tc, is_hidden)) in enumerate(zip(results, all_cases)):
                if res["status_id"] == STATUS_COMPILE_ERROR:
                    compile_error_output = res["compile_output"]

                actual = normalize_output(res["stdout"])
                expected = normalize_output(tc["expected_output"])
                stderr = res["stderr"].strip()

                if stderr and res["status_id"] not in (3, 4):
                    is_correct = False
                    status_label = res["status"]
                else:
                    is_correct = (actual == expected)
                    if res["status_id"] in (3, 4):
                        status_label = VERDICT_ACCEPTED if is_correct else VERDICT_WRONG_ANSWER
                    else:
                        status_label = res["status"]

                if is_correct:
                    passed += 1

                tc_results_db.append(
                    {
                        "test_case_id": tc.get("id", i + 1),
                        "status": status_label,
                        "execution_time": _safe_parse_time(res.get("time")),
                        "stdout": "**hidden**" if is_hidden else actual,
                        "stderr": "**hidden**" if is_hidden else stderr,
                        "compile_output": compile_error_output if i == 0 else "",
                    }
                )

            score = round((passed / total) * 100, 2) if total > 0 else 0.0
            if compile_error_output:
                verdict = VERDICT_COMPILE_ERROR
            elif passed == total:
                verdict = VERDICT_ACCEPTED
            elif passed == 0:
                verdict = VERDICT_WRONG_ANSWER
            else:
                verdict = f"{VERDICT_PARTIAL} ({passed}/{total} passed)"

            max_time = max([tc["execution_time"] for tc in tc_results_db]) if tc_results_db else 0.0
            try:
                max_mem = max([float(r.get("memory") or 0.0) for r in results]) if results else 0.0
            except (ValueError, TypeError):
                max_mem = 0.0

            # 5. Atomic DB Persistence (purges old test case rows & writes new ones + updates sub in 1 transaction)
            store_final_submission_results(
                sub_id,
                {
                    "status": verdict,
                    "job_status": "completed",
                    "passed_test_cases": passed,
                    "total_test_cases": total,
                    "score": score,
                    "compile_output": compile_error_output,
                    "execution_time": max_time,
                    "memory": max_mem,
                },
                tc_results_db,
            )

            total_duration = time.time() - start_time
            metrics.record_submission_completed(total_duration, total_test_cases)

            logger.info(
                f"✅ Completed submission_id={sub_id} verdict='{verdict}' score={score}% "
                f"duration={total_duration:.3f}s"
            )

            # 6. ACK complete job from Redis
            self.queue.ack(raw_payload_str, sub_id, claim_token)

        except (Judge0Error, TimeoutError, ConnectionError, OSError) as infra_err:
            # Infrastructure failure -> retry logic
            total_duration = time.time() - start_time
            metrics.record_submission_failed(is_judge0_err=True)
            logger.warning(
                f"⚠️ Infrastructure failure for submission_id={sub_id}: {infra_err}"
            )
            re_enqueued = self.queue.nack_retry(
                payload=payload,
                raw_payload_str=raw_payload_str,
                claim_token=claim_token,
                error_msg=str(infra_err),
            )
            if not re_enqueued:
                # Retries exhausted -> update DB to Internal Error
                update_submission_status(
                    sub_id,
                    {
                        "status": "Internal Error",
                        "job_status": "completed",
                        "compile_output": f"Infrastructure failure exhausted: {infra_err}",
                    },
                )

        except Exception as e:
            # Unhandled application exception -> mark failed & ACK to prevent infinite loop
            total_duration = time.time() - start_time
            metrics.record_submission_failed()
            logger.error(
                f"❌ Unhandled application error for submission_id={sub_id}: {e}",
                exc_info=True,
            )
            update_submission_status(
                sub_id,
                {
                    "status": "Internal Error",
                    "job_status": "completed",
                    "compile_output": str(e),
                },
            )
            self.queue.ack(raw_payload_str, sub_id, claim_token)

        finally:
            # Stop heartbeat thread
            heartbeat_stop_event.set()

    def _run_heartbeat(
        self, submission_id: str, claim_token: str, stop_event: threading.Event
    ):
        """
        Renews Redis lease every 10 seconds while job is executing.
        """
        while not stop_event.wait(timeout=10.0):
            try:
                renewed = self.queue.renew_lease(submission_id, claim_token)
                if not renewed:
                    logger.warning(
                        f"Heartbeat renewal failed for {submission_id} (lease expired or token mismatch)"
                    )
            except Exception as e:
                logger.error(f"Heartbeat error for {submission_id}: {e}")


def start_evaluator_worker():
    worker = EvaluatorWorker()
    worker.start()


if __name__ == "__main__":
    start_evaluator_worker()
