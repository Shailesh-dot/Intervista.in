import os
from fastapi import APIRouter, Depends, HTTPException, Header
import requests
from app.config import JUDGE0_URL
from app.storage.question_store import count_questions
from app.storage.submission_store import count_submissions
from app.storage.user_store import count_users
from app.core.logger import logger
from app.auth.dependencies import admin_required

router = APIRouter(tags=["Health"])


@router.get("/health", summary="API health check")
def health():
    return {
        "status": "ok",
        "service": "Coding Assessment API v6",
        "questions_loaded": count_questions(),
        "submissions_stored": count_submissions(),
        "users_registered": count_users(),
    }


@router.get("/health/judge0", summary="Judge0 connectivity check")
def judge0_health():
    try:
        resp = requests.get(f"{JUDGE0_URL}/statuses", timeout=5)
        env = (os.getenv("ENV") or os.getenv("ENVIRONMENT") or "").lower()
        is_prod = env == "production"
        if resp.status_code == 200:
            return {
                "status": "ok",
                "judge0_status": "reachable" if is_prod else JUDGE0_URL,
            }
        return {
            "status": "degraded",
            "http_status": resp.status_code,
        }
    except Exception as e:
        logger.error(f"Judge0 unreachable: {e}")
        return {"status": "unreachable", "detail": str(e)}


@router.get("/health/metrics", summary="Get load testing aggregate metrics")
def get_system_metrics():
    from app.utils.metrics import metrics
    return metrics.get_summary()


@router.post("/health/metrics/reset", summary="Reset load testing metrics counter")
def reset_system_metrics(x_admin_key: str = Header(None)):
    """
    Clears metrics counters.
    Requires X-Admin-Key in production or when ENABLE_METRICS_RESET_AUTH=true.
    Fail-closed in production if ADMIN_API_KEY / ADMIN_SECRET_KEY is not configured.
    """
    env = (os.getenv("ENV") or os.getenv("ENVIRONMENT") or "").lower()
    is_prod = env == "production"
    require_auth = is_prod or os.getenv("ENABLE_METRICS_RESET_AUTH") == "true"
    admin_key_secret = os.getenv("ADMIN_API_KEY") or os.getenv("ADMIN_SECRET_KEY")

    if require_auth:
        if not admin_key_secret:
            logger.error("Attempted to reset metrics in production with unconfigured ADMIN_API_KEY")
            raise HTTPException(
                status_code=500,
                detail="Admin API key is not configured in production environment",
            )
        if not x_admin_key or x_admin_key != admin_key_secret:
            raise HTTPException(
                status_code=403,
                detail="Admin authentication required to reset metrics",
            )

    from app.utils.metrics import metrics
    metrics.reset()
    return {"status": "reset", "message": "Metrics counters cleared successfully."}
