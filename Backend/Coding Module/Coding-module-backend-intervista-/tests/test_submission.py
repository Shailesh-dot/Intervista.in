from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app
from app.storage.question_store import add_question
from app.schemas.question_schema import QuestionCreate

client = TestClient(app)

QUESTION_DATA = {
    "id": "ts_v6_sub",
    "title": "Add",
    "description": "Print a+b",
    "difficulty": "Easy",
    "sample_test_cases": [{"input": "3 5", "expected_output": "8"}],
    "hidden_test_cases": [{"input": "10 20", "expected_output": "30"}],
    "boilerplates": {"python": {"template": "a,b=map(int,input().split());print(a+b)\n", "language_id": 71}},
    "allowed_languages": ["python"],
}


def _load_question():
    try:
        add_question(QuestionCreate(**QUESTION_DATA))
    except Exception:
        pass



@patch("app.queue.eval_queue.EvalQueue.enqueue")
def test_submit_enqueues_job(mock_enqueue):
    _load_question()
    mock_enqueue.return_value = {"submission_id": "sub_test_123", "retry_count": 0}

    resp = client.post(
        "/submit/",
        json={
            "question_id": "ts_v6_sub",
            "candidate_id": "candidate_test_001",
            "language": "python",
            "source_code": "a,b=map(int,input().split());print(a+b)",
        },
    )

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "submission_id" in data
    assert data["status"] == "processing"
    assert mock_enqueue.called


@patch("app.queue.eval_queue.EvalQueue.enqueue")
def test_submit_queue_failure_fallback_503(mock_enqueue):
    _load_question()
    mock_enqueue.side_effect = Exception("Redis connection refused")

    resp = client.post(
        "/submit/",
        json={
            "question_id": "ts_v6_sub",
            "candidate_id": "candidate_test_503",
            "language": "python",
            "source_code": "print(1)",
        },
    )

    assert resp.status_code == 503
    assert "Evaluation queue temporarily unavailable" in resp.json()["detail"]


@patch("app.queue.eval_queue.EvalQueue.enqueue")
def test_get_submission_status(mock_enqueue):
    _load_question()
    mock_enqueue.return_value = {}

    submit_resp = client.post(
        "/submit/",
        json={
            "question_id": "ts_v6_sub",
            "candidate_id": "cand_poll",
            "language": "python",
            "source_code": "print(1)",
        },
    )
    sub_id = submit_resp.json()["data"]["submission_id"]

    status_resp = client.get(f"/submit/{sub_id}/status")
    assert status_resp.status_code == 200
    assert status_resp.json()["data"]["submission_id"] == sub_id
    assert status_resp.json()["data"]["job_status"] == "queued"
