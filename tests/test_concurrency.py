import unittest
import threading
import time
from application.services import db_service

class TestDatabaseConcurrency(unittest.TestCase):
    def test_concurrent_read_write(self):
        """Verifies that in-process concurrent read and write connections do not crash with ConnectionException or lock conflicts."""
        results = []
        errors = []

        def reader(idx):
            try:
                for _ in range(5):
                    detail = db_service.get_stock_detail("TSLA")
                    self.assertIsInstance(detail, dict)
                    time.sleep(0.01)
                results.append((f"reader_{idx}", True))
            except Exception as e:
                errors.append((f"reader_{idx}", str(e)))

        def writer(idx):
            try:
                for _ in range(3):
                    with db_service.get_write_conn() as conn:
                        conn.execute("CREATE OR REPLACE TEMP TABLE test_concurrent AS SELECT 1")
                        time.sleep(0.02)
                results.append((f"writer_{idx}", True))
            except Exception as e:
                errors.append((f"writer_{idx}", str(e)))

        threads = []
        for i in range(4):
            threads.append(threading.Thread(target=reader, args=(i,)))
            threads.append(threading.Thread(target=writer, args=(i,)))

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(errors), 0, f"Encountered concurrency errors: {errors}")
        self.assertEqual(len(results), 8)

if __name__ == "__main__":
    unittest.main()

