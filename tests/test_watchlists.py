import unittest
from application.services import db_service
from application.router import get_stock_peers

class TestWatchlists(unittest.TestCase):
    def test_get_watchlists(self):
        watchlists = db_service.get_watchlists()
        self.assertIsInstance(watchlists, list)
        self.assertGreater(len(watchlists), 0)
        # Verify Watchlist is present or can be fetched
        w_names = [w["name"] for w in watchlists]
        self.assertTrue("Watchlist" in w_names or "Default" in w_names or "Mag 7" in w_names)

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
            self.assertIn("industry", item)
            self.assertIn("themes", item)
            self.assertIn("group_rs_rank", item)
            self.assertIn("industry_quadrant", item)
            self.assertIn("sector_quadrant", item)
            self.assertIn("rs_line", item)
            self.assertIn("normalized_rs", item)

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

    def test_watchlist_item_tags_and_merging(self):
        wl = db_service.create_watchlist("Test_Tags_WL")
        wl_id = wl["id"]
        try:
            # 1. Add single item with tag BO
            db_service.add_watchlist_item(wl_id, "NVDA", tag="BO")
            items = db_service.get_watchlist_items(wl_id)
            nvda = next(i for i in items if i["symbol"] == "NVDA")
            self.assertIn("BO", nvda["tags"])

            # 2. Add same symbol with another tag VCP -> should merge tags
            db_service.add_watchlist_item(wl_id, "NVDA", tag="VCP")
            items = db_service.get_watchlist_items(wl_id)
            nvda = next(i for i in items if i["symbol"] == "NVDA")
            self.assertIn("BO", nvda["tags"])
            self.assertIn("VCP", nvda["tags"])

            # 3. Add batch items with tag EP
            db_service.add_watchlist_items_batch(wl_id, ["NVDA", "AAPL"], tag="EP")
            items = db_service.get_watchlist_items(wl_id)
            nvda = next(i for i in items if i["symbol"] == "NVDA")
            self.assertIn("BO", nvda["tags"])
            self.assertIn("VCP", nvda["tags"])
            self.assertIn("EP", nvda["tags"])
            aapl = next(i for i in items if i["symbol"] == "AAPL")
            self.assertIn("EP", aapl["tags"])

            # 4. Explicitly update tags for a symbol
            db_service.update_watchlist_item_tags(wl_id, "AAPL", ["IPO", "SHORT"])
            items = db_service.get_watchlist_items(wl_id)
            aapl = next(i for i in items if i["symbol"] == "AAPL")
            self.assertEqual(set(aapl["tags"]), {"IPO", "SHORT"})

            # 5. Test get_all_watchlist_symbols
            all_syms = db_service.get_all_watchlist_symbols()
            self.assertIn("NVDA", all_syms)
            self.assertIn("AAPL", all_syms)
        finally:
            db_service.delete_watchlist(wl_id)

    def test_watchlist_color_flags(self):
        wl = db_service.create_watchlist("Test_Flag_WL")
        wl_id = wl["id"]
        try:
            # 1. Add item with flag_color 'green'
            db_service.add_watchlist_item(wl_id, "MSFT", flag_color="green")
            items = db_service.get_watchlist_items(wl_id)
            msft = next(i for i in items if i["symbol"] == "MSFT")
            self.assertEqual(msft["flag_color"], "green")

            # 2. Update flag_color to 'red'
            db_service.update_watchlist_item_flag("MSFT", "red", watchlist_id=wl_id)
            items = db_service.get_watchlist_items(wl_id)
            msft = next(i for i in items if i["symbol"] == "MSFT")
            self.assertEqual(msft["flag_color"], "red")

            # 3. Unflag
            db_service.update_watchlist_item_flag("MSFT", None, watchlist_id=wl_id)
            items = db_service.get_watchlist_items(wl_id)
            msft = next(i for i in items if i["symbol"] == "MSFT")
            self.assertIsNone(msft["flag_color"])

            # 4. Batch add with flags
            db_service.add_watchlist_items_batch(
                wl_id,
                items=[
                    {"symbol": "NVDA", "flag_color": "green"},
                    {"symbol": "TSLA", "flag_color": "orange"}
                ]
            )
            items = db_service.get_watchlist_items(wl_id)
            nvda = next(i for i in items if i["symbol"] == "NVDA")
            tsla = next(i for i in items if i["symbol"] == "TSLA")
            self.assertEqual(nvda["flag_color"], "green")
            self.assertEqual(tsla["flag_color"], "orange")
        finally:
            db_service.delete_watchlist(wl_id)

    def test_watchlist_api_routes_dispatch(self):
        import asyncio
        from server import app

        async def make_request(method: str, path: str, body: bytes = b""):
            response_started = {}
            response_body = []
            async def receive():
                return {"type": "http.request", "body": body, "more_body": False}
            async def send(message):
                if message["type"] == "http.response.start":
                    response_started["status"] = message["status"]
                    response_started["headers"] = message["headers"]
                elif message["type"] == "http.response.body":
                    response_body.append(message.get("body", b""))
            headers = [(b"content-type", b"application/json")] if body else []
            scope = {
                "type": "http",
                "http_version": "1.1",
                "method": method,
                "path": path,
                "raw_path": path.encode(),
                "query_string": b"",
                "headers": headers,
                "app": app,
            }
            await app(scope, receive, send)
            return response_started.get("status"), b"".join(response_body)

        # 1. Test DELETE /api/watchlists/items (must NOT be intercepted by /{watchlist_id} with 422)
        status, body = asyncio.run(make_request("DELETE", "/api/watchlists/items"))
        self.assertEqual(status, 200, f"Expected 200 for clear items, got {status}: {body}")

        # 2. Test lifecycle on a dedicated test watchlist
        test_wl = db_service.create_watchlist("Test_API_Routes_WL")
        test_wl_id = test_wl["id"]
        try:
            db_service.add_watchlist_items_batch(test_wl_id, ["AAPL", "NVDA", "MSFT"])

            # Test DELETE /api/watchlists/{watchlist_id}/items
            status, body = asyncio.run(make_request("DELETE", f"/api/watchlists/{test_wl_id}/items"))
            self.assertEqual(status, 200)
            self.assertEqual(len(db_service.get_watchlist_items(test_wl_id)), 0)

            # Re-add items
            db_service.add_watchlist_items_batch(test_wl_id, ["AAPL", "NVDA", "MSFT"])

            # Test DELETE /api/watchlists/{watchlist_id}/items/batch
            status, body = asyncio.run(make_request("DELETE", f"/api/watchlists/{test_wl_id}/items/batch", b'{"symbols": ["AAPL"]}'))
            self.assertEqual(status, 200)
            remaining = [i["symbol"] for i in db_service.get_watchlist_items(test_wl_id)]
            self.assertNotIn("AAPL", remaining)

            # Test DELETE /api/watchlists/{watchlist_id}/items/{symbol}
            status, body = asyncio.run(make_request("DELETE", f"/api/watchlists/{test_wl_id}/items/NVDA"))
            self.assertEqual(status, 200)
            remaining = [i["symbol"] for i in db_service.get_watchlist_items(test_wl_id)]
            self.assertNotIn("NVDA", remaining)
        finally:
            # Test DELETE /api/watchlists/{watchlist_id}
            status, body = asyncio.run(make_request("DELETE", f"/api/watchlists/{test_wl_id}"))
            self.assertEqual(status, 200)


if __name__ == "__main__":
    unittest.main()

