import os
import tempfile
import unittest

from application.database import DatabaseManager, check_database_safety
from application.services.database import db_service


class TestDatabaseSafety(unittest.TestCase):
    def test_production_db_blocked_in_tests(self):
        """Verifies that attempting to connect to production data.db in unit tests triggers a hard RuntimeError."""
        with self.assertRaises(RuntimeError) as ctx:
            check_database_safety("data.db")
        self.assertIn("CRITICAL SAFETY VIOLATION", str(ctx.exception))

        with self.assertRaises(RuntimeError) as ctx:
            DatabaseManager("data.db", init_schema=False)
        self.assertIn("CRITICAL SAFETY VIOLATION", str(ctx.exception))

    def test_isolated_db_allowed(self):
        """Verifies that non-production databases (such as tempfiles) are allowed."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            temp_db = os.path.join(tmp_dir, "safe_test.db")
            # Should not raise
            check_database_safety(temp_db)
            db = DatabaseManager(temp_db, init_schema=True)
            with db.get_connection() as conn:
                res = conn.execute("SELECT 1").fetchone()
                self.assertEqual(res[0], 1)

    def test_db_service_set_db_path_isolation(self):
        """Verifies that db_service dynamically adopts the isolated test database path."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            temp_db = os.path.join(tmp_dir, "service_test.db")
            db_service.set_db_path(temp_db)
            try:
                self.assertEqual(db_service.get_db_path(), temp_db)
                with db_service.get_read_only_conn() as conn:
                    tables = conn.execute("SHOW TABLES").fetchall()
                    self.assertGreater(len(tables), 0)
            finally:
                db_service.set_db_path(None)


if __name__ == "__main__":
    unittest.main()
