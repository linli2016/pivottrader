import os
import tempfile
import unittest
from application.services.chart_drawings_service import ChartDrawingsService


class TestChartDrawingsService(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.file_path = os.path.join(self.temp_dir.name, "test_drawings.json")
        self.service = ChartDrawingsService(file_path=self.file_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_empty_drawings(self):
        drawings = self.service.get_drawings("AAPL")
        self.assertEqual(drawings, [])

    def test_save_and_retrieve_drawings(self):
        mock_drawings = [
            {
                "id": "line_1",
                "type": "line",
                "p1": {"logical": 10, "price": 150.0, "time": "2026-01-05"},
                "p2": {"logical": 20, "price": 165.0, "time": "2026-01-15"},
                "color": "#ffffff",
                "width": 1,
            },
            {
                "id": "text_1",
                "type": "text",
                "p": {"logical": 20, "price": 170.0, "time": "2026-01-15"},
                "text": "Breakout",
                "color": "#ffffff",
                "fontSize": 12,
            },
        ]

        saved = self.service.save_drawings("aapl", mock_drawings)
        self.assertEqual(len(saved), 2)

        # Case insensitive retrieval
        retrieved = self.service.get_drawings("AAPL")
        self.assertEqual(len(retrieved), 2)
        self.assertEqual(retrieved[0]["id"], "line_1")
        self.assertEqual(retrieved[1]["text"], "Breakout")

        # Check get_all_drawings
        all_drawings = self.service.get_all_drawings()
        self.assertIn("AAPL", all_drawings)
        self.assertEqual(len(all_drawings["AAPL"]), 2)

    def test_delete_drawings(self):
        self.service.save_drawings("NVDA", [{"id": "line_1", "type": "line"}])
        self.assertEqual(len(self.service.get_drawings("NVDA")), 1)

        deleted = self.service.delete_drawings("nvda")
        self.assertTrue(deleted)
        self.assertEqual(self.service.get_drawings("NVDA"), [])

        # Deleting nonexistent returns False
        self.assertFalse(self.service.delete_drawings("NONEXISTENT"))

    def test_clear_via_empty_save(self):
        self.service.save_drawings("TSLA", [{"id": "line_1", "type": "line"}])
        self.assertEqual(len(self.service.get_drawings("TSLA")), 1)

        # Saving empty list clears the key
        self.service.save_drawings("TSLA", [])
        self.assertEqual(self.service.get_drawings("TSLA"), [])
        all_drawings = self.service.get_all_drawings()
        self.assertNotIn("TSLA", all_drawings)


class TestChartDrawingsAPI(unittest.TestCase):
    def test_api_router_functions(self):
        from application.routers.stocks import (
            get_stock_drawings,
            update_stock_drawings,
            delete_stock_drawings,
            get_all_stock_drawings,
            StockDrawingsUpdateSchema,
        )
        sym = "TEST_SYM_123"
        payload = StockDrawingsUpdateSchema(
            drawings=[
                {
                    "id": "line_test_1",
                    "type": "line",
                    "p1": {"price": 100.0, "time": "2026-01-01"},
                    "p2": {"price": 110.0, "time": "2026-01-02"},
                    "color": "#ffffff",
                    "width": 1,
                }
            ]
        )
        # Save via update_stock_drawings
        saved = update_stock_drawings(sym, payload)
        self.assertEqual(len(saved), 1)

        # Retrieve via get_stock_drawings
        drawings = get_stock_drawings(sym)
        self.assertEqual(len(drawings), 1)
        self.assertEqual(drawings[0]["id"], "line_test_1")

        # Check in get_all_stock_drawings
        all_drawings = get_all_stock_drawings()
        self.assertIn(sym, all_drawings)

        # Cleanup via delete_stock_drawings
        res = delete_stock_drawings(sym)
        self.assertTrue(res.get("deleted"))

        # Verify empty after delete
        self.assertEqual(get_stock_drawings(sym), [])


if __name__ == "__main__":
    unittest.main()
