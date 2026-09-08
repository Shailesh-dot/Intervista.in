from app.schemas.submission_schema import SubmissionRequest, RunRequest
from app.schemas.question_schema import QuestionAdminResponse
from app.services.question_service import fetch_question
from app.services.execution_service import execute
from app.storage.submission_store import (
    get_submission,
    get_submissions_by_candidate, get_submissions_by_question,
    list_all_submissions, store_submission_enqueue, update_submission_status, store_submission_results
)
from app.utils.languages import get_language_id, is_supported
from app.exceptions.custom_exceptions import InvalidInputError
from app.utils.id_generator import generate_id
from app.core.logger import logger
from app.services.execution.code_builder import build_code
from app.services.judge0_service import submit_batch, poll_batch
from app.utils.formatter import normalize_output
from app.constants import (
    STATUS_COMPILE_ERROR, VERDICT_ACCEPTED, VERDICT_WRONG_ANSWER, 
    VERDICT_COMPILE_ERROR, VERDICT_PARTIAL
)

def _safe_parse_time(val) -> float:
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0

def _get_cpu_limit(difficulty: str) -> float:
    return {"Easy": 1.0, "Medium": 2.0, "Hard": 3.0}.get(difficulty, 2.0)

def _resolve_language(language: str, allowed_languages: list, boilerplates: dict) -> int:
    lang = language.lower().strip()
    if not is_supported(lang):
        raise InvalidInputError(f"Language '{lang}' is not supported")

    if allowed_languages and lang not in allowed_languages:
        raise InvalidInputError(f"Language '{lang}' is not allowed for this question.")

    bp = boilerplates.get(lang)
    if bp and "language_id" in bp:
        return bp["language_id"]

    return get_language_id(lang)

def run_code_request(request: RunRequest) -> dict:
    question = fetch_question(request.question_id)
    language_id = _resolve_language(request.language, question.allowed_languages, question.boilerplates)
    
    if request.stdin:
        # Legacy/Custom string payload evaluation
        result = execute(request.source_code, language_id, request.stdin)
        result["language"] = request.language
        return {"type": "custom", "results": [result]}
        
    sample_cases = question.sample_test_cases
    if not sample_cases:
        return {"type": "samples", "results": []}

    final_code = build_code(request.source_code)
    cpu_limit = _get_cpu_limit(question.difficulty)
    payloads = [
        {"source_code": final_code, "language_id": language_id, "stdin": tc.get("input") if isinstance(tc, dict) else tc.input_data, "cpu_time_limit": cpu_limit}
        for tc in sample_cases
    ]
    
    tokens, _ = submit_batch(payloads)
    results, _, _ = poll_batch(tokens)
    
    parsed_results = []
    for res, tc in zip(results, sample_cases):
        actual = normalize_output(res["stdout"])
        expected = normalize_output(tc.get("expected_output") if isinstance(tc, dict) else tc.expected_output)
        stderr = res["stderr"].strip()
        
        if stderr and res["status_id"] not in (3, 4):
            is_correct = False
            status_label = res["status"]
        else:
            is_correct = (actual == expected)
            status_label = "Accepted" if is_correct else "Wrong Answer" if res["status_id"] in (3, 4) else res["status"]
                
        parsed_results.append({
            "status": status_label,
            "execution_time": _safe_parse_time(res.get("time")),
            "stdout": actual,
            "stderr": stderr,
            "compile_output": res.get("compile_output", ""),
            "expected_output": expected
        })

    return {"type": "samples", "results": parsed_results}

def process_submission_worker(
    submission_id: str,
    question: QuestionAdminResponse, # Has nested dicts for sample and hidden
    source_code: str,
    language_id: int
):
    import time
    from app.utils.metrics import metrics
    from app.exceptions.custom_exceptions import Judge0Error

    worker_start_time = time.time()
    logger.info(f"[METRIC] Worker pick-up for submission_id={submission_id}")

    try:
        final_code = build_code(source_code)
        
        # Combine test cases into tuples (dict_data, is_hidden, test_case_id)
        all_cases = []
        for tc in question.sample_test_cases:
            all_cases.append((tc, False))
        for tc in question.hidden_test_cases:
            all_cases.append((tc, True))

        total_test_cases = len(all_cases)
        if not all_cases:
            update_submission_status(submission_id, {"status": "Accepted", "job_status": "completed", "total_test_cases": 0})
            metrics.record_submission_completed(time.time() - worker_start_time, 0)
            return

        cpu_limit = _get_cpu_limit(question.difficulty)
        payloads = [
            {"source_code": final_code, "language_id": language_id, "stdin": tc[0]["input"], "cpu_time_limit": cpu_limit}
            for tc in all_cases
        ]
        
        update_submission_status(submission_id, {"job_status": "running"})
        
        # 1. Submit Batch
        batch_submit_start = time.time()
        tokens, submit_duration = submit_batch(payloads)
        
        # 2. Poll Batch
        poll_start_time = time.time()
        results, poll_attempts, poll_duration = poll_batch(tokens)
        
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
                    status_label = "Accepted" if is_correct else "Wrong Answer"
                else:
                    status_label = res["status"]
                
            if is_correct:
                passed += 1
                
            tc_results_db.append({
                "test_case_id": tc.get("id", i + 1), # fallback mock index
                "status": status_label,
                "execution_time": _safe_parse_time(res.get("time")),
                "stdout": "**hidden**" if is_hidden else actual,
                "stderr": "**hidden**" if is_hidden else stderr,
                "compile_output": compile_error_output if i == 0 else "" # Don't duplicate massive strings
            })
            
        score = round((passed / total) * 100, 2) if total > 0 else 0.0
        if compile_error_output:
            verdict = VERDICT_COMPILE_ERROR
        elif passed == total:
            verdict = VERDICT_ACCEPTED
        elif passed == 0:
            verdict = VERDICT_WRONG_ANSWER
        else:
            verdict = f"{VERDICT_PARTIAL} ({passed}/{total} passed)"
            
        store_submission_results(submission_id, tc_results_db)
        
        max_time = max([tc["execution_time"] for tc in tc_results_db]) if tc_results_db else 0.0
        
        # Calculate max memory safely, falling back to 0.0 if not returned
        try:
            max_mem = max([float(r.get("memory") or 0.0) for r in results]) if results else 0.0
        except (ValueError, TypeError):
            max_mem = 0.0
        
        update_submission_status(submission_id, {
            "status": verdict,
            "job_status": "completed",
            "passed_test_cases": passed,
            "total_test_cases": total,
            "score": score,
            "compile_output": compile_error_output,
            "execution_time": max_time,
            "memory": max_mem
        })

        total_worker_duration = time.time() - worker_start_time
        metrics.record_submission_completed(total_worker_duration, total_test_cases)

        logger.info(
            f"[METRIC] submission_id={submission_id} test_cases={total_test_cases} "
            f"tokens_returned={len(tokens)} submit_duration={submit_duration:.3f}s "
            f"poll_attempts={poll_attempts} poll_duration={poll_duration:.3f}s "
            f"total_duration={total_worker_duration:.3f}s verdict='{verdict}'"
        )

    except TimeoutError as te:
        total_worker_duration = time.time() - worker_start_time
        metrics.record_submission_failed(is_timeout=True)
        logger.error(
            f"[METRIC_FAIL] submission_id={submission_id} reason=TimeoutError "
            f"duration={total_worker_duration:.3f}s error='{te}'"
        )
        update_submission_status(submission_id, {
            "status": "Internal Error", 
            "job_status": "completed",
            "compile_output": str(te)
        })

    except Judge0Error as je:
        total_worker_duration = time.time() - worker_start_time
        metrics.record_submission_failed(is_judge0_err=True)
        logger.error(
            f"[METRIC_FAIL] submission_id={submission_id} reason=Judge0Error "
            f"duration={total_worker_duration:.3f}s error='{je}'"
        )
        update_submission_status(submission_id, {
            "status": "Internal Error", 
            "job_status": "completed",
            "compile_output": str(je)
        })

    except Exception as e:
        total_worker_duration = time.time() - worker_start_time
        metrics.record_submission_failed()
        logger.error(
            f"[METRIC_FAIL] submission_id={submission_id} reason=Exception "
            f"duration={total_worker_duration:.3f}s error='{e}'", 
            exc_info=True
        )
        update_submission_status(submission_id, {
            "status": "Internal Error", 
            "job_status": "completed",
            "compile_output": str(e)
        })

def enqueue_submission(request: SubmissionRequest) -> str:
    question = fetch_question(request.question_id)
    language_id = _resolve_language(request.language, question.allowed_languages, question.boilerplates)
    
    sub_id = generate_id()
    store_submission_enqueue(
        sub_id=sub_id,
        question_id=request.question_id,
        candidate_id=request.candidate_id,
        language=request.language,
        code=request.source_code
    )
    
    return sub_id, question, language_id

def get_submission_by_id(submission_id: str):
    result = get_submission(submission_id)
    if not result:
        raise ValueError(f"Submission '{submission_id}' not found")
    return result

def get_candidate_history(candidate_id: str) -> list:
    return get_submissions_by_candidate(candidate_id)

def get_question_submissions(question_id: str) -> list:
    return get_submissions_by_question(question_id)

def get_all_submissions() -> list:
    return list_all_submissions()
