from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app

client = TestClient(app)

MOCK_OK = {
    "stdout": "8\n", "stderr": "", "compile_output": "",
    "status": "Accepted", "status_id": 3,
    "time": "0.04", "memory": "1024",
}


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_run_code_empty_source_422():
    resp = client.post("/code/run", json={"source_code": "", "language_id": 71})
    assert resp.status_code == 422


@patch("app.routes.code.execute")
def test_raw_run_success(mock_exec):
    mock_exec.return_value = MOCK_OK
    resp = client.post("/code/run", json={
        "source_code": "print(8)",
        "language_id": 71,
        "stdin": "3 5",
    })
    assert resp.status_code == 200
    assert resp.json()["data"]["stdout"] == "8\n"


@patch("app.routes.code.execute")
def test_raw_run_compile_error(mock_exec):
    mock_exec.return_value = {
        **MOCK_OK, "stdout": "",
        "compile_output": "SyntaxError", "status": "Compilation Error", "status_id": 6,
    }
    resp = client.post("/code/run", json={"source_code": "def bad(:", "language_id": 71})
    assert resp.status_code == 200
    assert resp.json()["data"]["status_id"] == 6


def test_metrics_reset_auth_fail_closed(monkeypatch):
    # In production without ADMIN_API_KEY, reset MUST fail closed with HTTP 500
    monkeypatch.setenv("ENV", "production")
    monkeypatch.delenv("ADMIN_API_KEY", raising=False)
    monkeypatch.delenv("ADMIN_SECRET_KEY", raising=False)

    resp = client.post("/health/metrics/reset")
    assert resp.status_code == 500
    assert "not configured" in resp.json()["detail"]

    # In production with ADMIN_API_KEY set, wrong key MUST return 403
    monkeypatch.setenv("ADMIN_API_KEY", "super-secret-admin-key")
    resp_wrong = client.post("/health/metrics/reset", headers={"X-Admin-Key": "wrong-key"})
    assert resp_wrong.status_code == 403

    # Correct key MUST succeed
    resp_correct = client.post("/health/metrics/reset", headers={"X-Admin-Key": "super-secret-admin-key"})
    assert resp_correct.status_code == 200
    assert resp_correct.json()["status"] == "reset"

