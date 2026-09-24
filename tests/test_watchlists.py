import unittest
from application.services import db_service
from application.router import get_stock_peers

class TestWatchlists(unittest.TestCase):
    def test_get_watchlists(self):
        watchlists = db_service.get_watchlists()
        self.assertIsInstance(watchlists, list)
        self.assertGreater(len(watchlists), 0)
        # Verify Mag 7 is present or can be fetched
        w_names = [w["name"] for w in watchlists]
        self.assertTrue("Default" in w_names or "Mag 7" in w_names)

    def test_get_watchlist_items_enhanced_metrics(self):
        watchlists = db_service.get_watchlists()
        # Find Mag 7 or Default watchlist
        w_id = None
        for w in watchlists:
            if w["name"] == "Mag 7":
                w_id = w["id"]
                break
        if not w_id:
            w_id = watchlists[0]["id"]

        items = db_service.get_watchlist_items(w_id)
        self.assertIsInstance(items, list)
        if items:
            item = items[0]
            self.assertIn("symbol", item)
            self.assertIn("close", item)
            self.assertIn("rs_rank", item)
            self.assertIn("chg_pct", item)
            self.assertIn("rvol_pct", item)
            self.assertIn("adr_20d", item)
            self.assertIn("ema_10", item)
            self.assertIn("ema_20", item)
            self.assertIn("ema_50", item)
            self.assertIn("sma_200", item)
            self.assertIn("industry", item)

    def test_get_industry_peers(self):
        peers_data = db_service.get_industry_peers("AAPL", limit=5)
        self.assertEqual(peers_data["symbol"], "AAPL")
        self.assertIsNotNone(peers_data["industry"])
        self.assertIsInstance(peers_data["peers"], list)
        self.assertGreater(len(peers_data["peers"]), 0)
        top_peer = peers_data["peers"][0]
        self.assertIn("symbol", top_peer)
        self.assertIn("rs_rank", top_peer)
        self.assertIn("close", top_peer)
        self.assertIn("chg_pct", top_peer)

    def test_get_stock_peers_api(self):
        data = get_stock_peers("AAPL", limit=4)
        self.assertEqual(data["symbol"], "AAPL")
        self.assertIn("peers", data)
        self.assertLessEqual(len(data["peers"]), 4)

    def test_stock_detail_has_description(self):
        detail = db_service.get_stock_detail("AAPL")
        self.assertIn("metadata", detail)
        self.assertIn("description", detail["metadata"])
        self.assertIn("Apple Inc.", detail["metadata"]["description"])

    def test_watchlist_crud_lifecycle(self):
        # 1. Create
        test_wl_name = "Test_Lifecycle_WL"
        wl = db_service.create_watchlist(test_wl_name)
        wl_id = wl["id"]
        self.assertEqual(wl["name"], test_wl_name)

        try:
            # 2. Add single and batch
            db_service.add_watchlist_item(wl_id, "AAPL")
            db_service.add_watchlist_items_batch(wl_id, ["MSFT", "NVDA", "GOOG"])
            items = db_service.get_watchlist_items(wl_id)
            symbols = [i["symbol"] for i in items]
            self.assertIn("AAPL", symbols)
            self.assertIn("NVDA", symbols)

            # 3. Rename
            renamed_name = "Test_Lifecycle_WL_Renamed"
            updated = db_service.update_watchlist(wl_id, renamed_name)
            self.assertEqual(updated["name"], renamed_name)

            # 4. Remove single
            db_service.remove_watchlist_item(wl_id, "AAPL")
            items_after_single = db_service.get_watchlist_items(wl_id)
            self.assertNotIn("AAPL", [i["symbol"] for i in items_after_single])

            # 5. Remove batch
            db_service.remove_watchlist_items_batch(wl_id, ["MSFT", "NVDA"])
            items_after_batch = db_service.get_watchlist_items(wl_id)
            self.assertNotIn("MSFT", [i["symbol"] for i in items_after_batch])
            self.assertNotIn("NVDA", [i["symbol"] for i in items_after_batch])

            # 6. Clear all
            db_service.clear_watchlist_items(wl_id)
            items_after_clear = db_service.get_watchlist_items(wl_id)
            self.assertEqual(len(items_after_clear), 0)
        finally:
            # 7. Delete
            deleted = db_service.delete_watchlist(wl_id)
            self.assertTrue(deleted)

if __name__ == "__main__":
    unittest.main()

