import os
from slowapi import Limiter
from slowapi.util import get_remote_address

RATE_LIMIT_SUBMIT = os.getenv("RATE_LIMIT_SUBMIT", "5/minute")
limiter = Limiter(key_func=get_remote_address)

