# tests package
import os
os.environ["PIVOTTRADER_TESTING"] = "1"

try:
    from tests.test_db_helper import get_or_create_default_test_db
    get_or_create_default_test_db()
except Exception:
    pass
