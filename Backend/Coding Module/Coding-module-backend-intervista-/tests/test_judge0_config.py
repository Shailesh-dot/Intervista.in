import os
import importlib

def test_default_judge0_max_retries():
    if "JUDGE0_MAX_RETRIES" in os.environ:
        del os.environ["JUDGE0_MAX_RETRIES"]
    
    import app.constants as constants
    importlib.reload(constants)
    
    assert constants.JUDGE0_MAX_RETRIES == 60
    assert constants.JUDGE0_POLL_INTERVAL == 1.0

def test_custom_judge0_max_retries():
    os.environ["JUDGE0_MAX_RETRIES"] = "120"
    
    import app.constants as constants
    importlib.reload(constants)
    
    assert constants.JUDGE0_MAX_RETRIES == 120
    
    # Reset env for safety
    del os.environ["JUDGE0_MAX_RETRIES"]
    importlib.reload(constants)
