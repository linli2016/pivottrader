import os
import tempfile
import unittest

from unittest.mock import MagicMock, patch

import requests

from application.providers.ibkr_flex_prov import (
    parse_flex_trades, parse_flex_date, parse_flex_datetime, FlexError, IBKRFlexClient,
)
from application.services.journal_service import (
    JournalService, build_round_trips, compute_statistics, compute_period_pnl, compute_equity_curve,
)


def _trade_xml(trade_id, symbol, dt, qty, price, commission=-1.0, oc="O", fifo=0.0, level="EXECUTION",
               asset="STK", conid="100", fx="1", account_id="U1"):
    buy_sell = "BUY" if qty > 0 else "SELL"
    proceeds = -qty * price
    net_cash = proceeds + commission
    return (
        f'<Trade accountId="{account_id}" currency="USD" fxRateToBase="{fx}" assetCategory="{asset}" symbol="{symbol}" '
        f'description="{symbol} INC" conid="{conid}" tradeID="{trade_id}" dateTime="{dt}" tradeDate="{dt[:8]}" '
        f'quantity="{qty}" tradePrice="{price}" proceeds="{proceeds}" ibCommission="{commission}" '
        f'netCash="{net_cash}" fifoPnlRealized="{fifo}" buySell="{buy_sell}" openCloseIndicator="{oc}" '
        f'levelOfDetail="{level}" />'
    )


def _statement(*trades):
    return (
        '<FlexQueryResponse queryName="journal" type="AF"><FlexStatements count="1">'
        '<FlexStatement accountId="U1"><Trades>' + "".join(trades) + "</Trades></FlexStatement>"
        "</FlexStatements></FlexQueryResponse>"
    ).encode()


def _multi_statement(*statements):
    return (
        '<FlexQueryResponse queryName="journal" type="AF"><FlexStatements>'
        + "".join(statements)
        + "</FlexStatements></FlexQueryResponse>"
    ).encode()


def _exec(eid, dt, qty, price, commission=-1.0, oc="O", fifo=None, symbol="AAPL", conid="100"):
    proceeds = -qty * price
    return {
        "exec_id": str(eid), "account_id": "U1", "conid": conid, "symbol": symbol, "description": "",
        "currency": "USD", "fx_rate_to_base": 1.0, "trade_date": dt[:10], "date_time": dt,
        "quantity": qty, "price": price, "proceeds": proceeds, "commission": commission,
        "net_cash": proceeds + commission, "fifo_pnl_realized": fifo, "buy_sell": "BUY" if qty > 0 else "SELL",
        "open_close": oc,
    }


class TestFlexParsing(unittest.TestCase):
    def test_date_formats(self):
        self.assertEqual(parse_flex_date("20240115"), "2024-01-15")
        self.assertEqual(parse_flex_date("2024-01-15"), "2024-01-15")
        self.assertEqual(parse_flex_date("01/15/2024"), "2024-01-15")
        self.assertEqual(parse_flex_datetime("20240115;093512"), "2024-01-15T09:35:12")
        self.assertEqual(parse_flex_datetime("2024-01-15, 09:35:12"), "2024-01-15T09:35:12")
        self.assertEqual(parse_flex_datetime("", fallback_date="2024-01-15"), "2024-01-15T00:00:00")

    def test_parse_filters_levels_and_assets(self):
        xml = _statement(
            _trade_xml("1", "AAPL", "20240115;093512", 100, 10.0),
            _trade_xml("2", "AAPL", "20240115;093512", 100, 10.0, level="ORDER"),
            _trade_xml("3", "AAPL  240119C00100000", "20240115;093512", 1, 2.0, asset="OPT"),
            _trade_xml("4", "AAPL", "20240120;100000", -100, 12.0, oc="C", fifo=198.0),
        )
        parsed = parse_flex_trades(xml)
        self.assertEqual([e["exec_id"] for e in parsed["executions"]], ["1", "4"])
        self.assertEqual(parsed["skipped"], 1)
        self.assertTrue(parsed["has_fifo_pnl"])
        sell = parsed["executions"][1]
        self.assertEqual(sell["quantity"], -100)
        self.assertEqual(sell["date_time"], "2024-01-20T10:00:00")
        self.assertAlmostEqual(sell["net_cash"], 1199.0)

    def test_error_response_raises(self):
        xml = b"<FlexStatementResponse><Status>Fail</Status><ErrorCode>1020</ErrorCode><ErrorMessage>Invalid request</ErrorMessage></FlexStatementResponse>"
        with self.assertRaises(FlexError):
            parse_flex_trades(xml)


class TestRoundTrips(unittest.TestCase):
    def test_scale_in_scale_out_single_trade(self):
        execs = [
            _exec(1, "2024-01-02T10:00:00", 100, 10.0),
            _exec(2, "2024-01-03T10:00:00", 100, 11.0),
            _exec(3, "2024-01-10T10:00:00", -50, 13.0, oc="C"),
            _exec(4, "2024-01-15T10:00:00", -150, 12.0, oc="C"),
        ]
        trades = build_round_trips(execs)
        self.assertEqual(len(trades), 1)
        t = trades[0]
        self.assertEqual(t["status"], "CLOSED")
        self.assertEqual(t["direction"], "LONG")
        self.assertEqual(t["max_position"], 200)
        self.assertAlmostEqual(t["avg_entry"], 10.5)
        # Proceeds 650 + 1800 - cost 2100 - 4 commissions
        self.assertAlmostEqual(t["pnl"], 346.0)
        self.assertAlmostEqual(t["pnl_pct"], 346.0 / 2100 * 100)
        self.assertEqual(t["holding_days"], 13)
        self.assertEqual(t["close_date"], "2024-01-15")

    def test_combine_same_datetime_split_fills(self):
        # 2 fills at entry (same second), 2 fills at exit (same second)
        execs = [
            _exec(1, "2026-09-08T11:46:45", 6, 93.30, commission=-1.0),
            _exec(2, "2026-09-08T11:46:45", 6, 93.40, commission=0.0),
            _exec(3, "2026-09-23T10:08:15", -6, 91.60, commission=-1.01, oc="C"),
            _exec(4, "2026-09-23T10:08:15", -6, 91.60, commission=-0.01, oc="C"),
        ]
        trades = build_round_trips(execs)
        self.assertEqual(len(trades), 1)
        t = trades[0]
        # Should be combined into 2 executions (1 ENTRY, 1 EXIT) instead of 4
        self.assertEqual(len(t["executions"]), 2)
        self.assertEqual(t["num_executions"], 2)
        entry_exec = t["executions"][0]
        self.assertEqual(entry_exec["action"], "ENTRY")
        self.assertEqual(entry_exec["quantity"], 12)
        self.assertAlmostEqual(entry_exec["price"], 93.35)
        self.assertAlmostEqual(entry_exec["commission"], -1.0)
        exit_exec = t["executions"][1]
        self.assertEqual(exit_exec["action"], "EXIT")
        self.assertEqual(exit_exec["quantity"], -12)
        self.assertAlmostEqual(exit_exec["price"], 91.60)
        self.assertAlmostEqual(exit_exec["commission"], -1.02)

    def test_flip_splits_execution(self):
        execs = [
            _exec(1, "2024-01-02T10:00:00", 100, 10.0, commission=-2.0),
            _exec(2, "2024-01-05T10:00:00", -150, 9.0, commission=-3.0, oc="C;O"),
            _exec(3, "2024-01-08T10:00:00", 50, 8.0, commission=-1.0, oc="C"),
        ]
        trades = sorted(build_round_trips(execs), key=lambda t: t["open_datetime"])
        self.assertEqual(len(trades), 2)
        long_t, short_t = trades
        self.assertEqual(long_t["direction"], "LONG")
        self.assertAlmostEqual(long_t["pnl"], -1000 + 900 - 2 - 2)
        self.assertEqual(short_t["direction"], "SHORT")
        self.assertEqual(short_t["status"], "CLOSED")
        self.assertAlmostEqual(short_t["pnl"], 450 - 400 - 1 - 1)

    def test_pre_history_close_uses_fifo(self):
        execs = [
            _exec(1, "2024-01-02T10:00:00", -100, 20.0, oc="C", fifo=500.0),
            _exec(2, "2024-01-03T10:00:00", -50, 21.0, oc="C", fifo=300.0),
            _exec(3, "2024-02-01T10:00:00", 10, 25.0),
        ]
        trades = sorted(build_round_trips(execs), key=lambda t: t["open_datetime"])
        self.assertEqual(len(trades), 2)
        old, new = trades
        self.assertTrue(old["incomplete"])
        self.assertEqual(old["status"], "CLOSED")
        self.assertAlmostEqual(old["pnl"], 800.0)
        self.assertEqual(new["status"], "OPEN")
        self.assertIsNone(new["pnl"])

    def test_oversell_marks_incomplete(self):
        execs = [
            _exec(1, "2024-01-02T10:00:00", 50, 10.0),
            _exec(2, "2024-01-05T10:00:00", -150, 12.0, oc="C", fifo=250.0),
        ]
        trades = build_round_trips(execs)
        self.assertEqual(len(trades), 1)
        self.assertTrue(trades[0]["incomplete"])
        self.assertEqual(trades[0]["status"], "CLOSED")
        self.assertAlmostEqual(trades[0]["pnl"], 250.0)

    def test_symbols_are_independent(self):
        execs = [
            _exec(1, "2024-01-02T10:00:00", 100, 10.0),
            _exec(2, "2024-01-02T11:00:00", 10, 50.0, symbol="MSFT", conid="200"),
            _exec(3, "2024-01-03T10:00:00", -100, 11.0, oc="C"),
        ]
        trades = build_round_trips(execs)
        by_sym = {t["symbol"]: t for t in trades}
        self.assertEqual(by_sym["AAPL"]["status"], "CLOSED")
        self.assertEqual(by_sym["MSFT"]["status"], "OPEN")


def _closed(pnl, pct, close_date, hold=5):
    return {"id": close_date + str(pnl), "symbol": "X", "status": "CLOSED", "pnl": pnl, "pnl_pct": pct,
            "close_date": close_date, "close_datetime": close_date + "T10:00:00", "holding_days": hold,
            "commission": -2.0}


class TestStatistics(unittest.TestCase):
    def setUp(self):
        self.trades = [
            _closed(300, 15.0, "2024-01-10", hold=10),
            _closed(-100, -5.0, "2024-01-20", hold=2),
            _closed(-50, -2.5, "2024-02-05", hold=3),
            _closed(200, 10.0, "2024-02-15", hold=8),
            _closed(-150, -7.5, "2025-03-01", hold=4),
        ]

    def test_core_stats(self):
        s = compute_statistics(self.trades)
        self.assertEqual(s["total_trades"], 5)
        self.assertAlmostEqual(s["win_rate"], 40.0)
        self.assertAlmostEqual(s["total_pnl"], 200.0)
        self.assertAlmostEqual(s["profit_factor"], 500 / 300)
        self.assertAlmostEqual(s["avg_win"], 250.0)
        self.assertAlmostEqual(s["avg_loss"], -100.0)
        self.assertAlmostEqual(s["win_loss_ratio"], 2.5)
        self.assertAlmostEqual(s["adjusted_win_loss_ratio"], 12.5 / 5.0)
        self.assertAlmostEqual(s["expectancy_pct"], 0.4 * 12.5 + 0.6 * -5.0)
        self.assertEqual(s["max_consecutive_losses"], 2)
        # Cum: 300, 200, 150, 350, 200 -> max drawdown -150
        self.assertAlmostEqual(s["max_drawdown"], -150.0)
        self.assertAlmostEqual(s["avg_hold_days_win"], 9.0)
        self.assertEqual(s["largest_loss"]["pnl"], -150)

    def test_period_pnl_and_curve(self):
        monthly = compute_period_pnl(self.trades, "month")
        self.assertEqual([m["period"] for m in monthly], ["2024-01", "2024-02", "2025-03"])
        self.assertAlmostEqual(monthly[0]["pnl"], 200.0)
        self.assertAlmostEqual(monthly[1]["win_rate"], 50.0)
        yearly = compute_period_pnl(self.trades, "year")
        self.assertEqual([(y["period"], y["pnl"]) for y in yearly], [("2024", 350.0), ("2025", -150.0)])
        curve = compute_equity_curve(self.trades)
        self.assertAlmostEqual(curve[-1]["cum_pnl"], 200.0)

    def test_empty(self):
        s = compute_statistics([])
        self.assertEqual(s["total_trades"], 0)
        self.assertIsNone(s["win_rate"])


class TestJournalService(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.svc = JournalService(
            db_path=os.path.join(self.tmp.name, "journal.db"),
            config_path=os.path.join(self.tmp.name, "flex.json"),
        )

    def tearDown(self):
        self.tmp.cleanup()

    def test_import_is_idempotent_and_notes_persist(self):
        xml = _statement(
            _trade_xml("1", "AAPL", "20240115;093512", 100, 10.0),
            _trade_xml("2", "AAPL", "20240120;100000", -100, 12.0, oc="C", fifo=198.0),
        )
        r1 = self.svc.import_statement(xml)
        r2 = self.svc.import_statement(xml)
        self.assertEqual(r1["new_executions"], 2)
        self.assertEqual(r2["new_executions"], 0)

        journal = self.svc.get_journal()
        self.assertEqual(len(journal["trades"]), 1)
        trade_id = journal["trades"][0]["id"]
        self.assertAlmostEqual(journal["stats"]["total_pnl"], 198.0)

        self.svc.update_notes(trade_id, "Clean VCP breakout", ["vcp", " breakout ", ""], initial_stop=9.0)
        trade = self.svc.get_journal()["trades"][0]
        self.assertEqual(trade["notes"], "Clean VCP breakout")
        self.assertEqual(trade["tags"], ["breakout", "vcp"])
        self.assertEqual(trade["initial_stop"], 9.0)
        # Entry price: 10.0, stop: 9.0 -> risk per share: 1.0. Qty: 100 -> total risk: 100. Pnl: 198 -> R = 1.98
        self.assertAlmostEqual(trade["initial_risk_per_share"], 1.0)
        self.assertAlmostEqual(trade["initial_risk_total"], 100.0)
        self.assertAlmostEqual(trade["r_multiple"], 1.98)
        self.assertAlmostEqual(self.svc.get_journal()["stats"]["avg_r_multiple"], 1.98)

        self.assertEqual(len(self.svc.get_journal(start="2024-02-01")["trades"]), 0)
        self.assertEqual(len(self.svc.get_journal(symbol="aap")["trades"]), 1)


    def test_flex_config_masks_token(self):
        cfg = self.svc.update_flex_config("123456789012", "987654")
        self.assertEqual(cfg["query_id"], "987654")
        self.assertTrue(cfg["has_token"])
        self.assertNotIn("1234567", cfg["token_masked"])
        self.assertTrue(cfg["token_masked"].endswith("9012"))
        # Blank token update keeps existing token
        cfg = self.svc.update_flex_config("", "111")
        self.assertTrue(cfg["has_token"])
        self.assertEqual(cfg["query_id"], "111")

    def test_ignore_and_unignore_trade(self):
        xml = _statement(
            _trade_xml("1", "AAPL", "20240115;093512", 100, 10.0, conid="100"),
            _trade_xml("2", "AAPL", "20240120;100000", -100, 12.0, oc="C", fifo=198.0, conid="100"),
            _trade_xml("3", "MSFT", "20240116;093512", 10, 50.0, conid="200"),
            _trade_xml("4", "MSFT", "20240121;100000", -10, 60.0, oc="C", fifo=98.0, conid="200"),
        )
        self.svc.import_statement(xml)
        j1 = self.svc.get_journal()
        self.assertEqual(len(j1["trades"]), 2)
        self.assertAlmostEqual(j1["stats"]["total_pnl"], 296.0)

        # Ignore MSFT trade
        msft_trade = [t for t in j1["trades"] if t["symbol"] == "MSFT"][0]
        self.svc.ignore_trade(msft_trade["id"], reason="Personal long term holding, not swing trading")

        j2 = self.svc.get_journal()
        self.assertEqual(len(j2["trades"]), 1)
        self.assertEqual(j2["trades"][0]["symbol"], "AAPL")
        self.assertAlmostEqual(j2["stats"]["total_pnl"], 198.0)
        self.assertEqual(j2["ignored_count"], 1)

        # Include ignored in query
        j_all = self.svc.get_journal(include_ignored=True)
        self.assertEqual(len(j_all["trades"]), 2)
        msft_in_all = [t for t in j_all["trades"] if t["symbol"] == "MSFT"][0]
        self.assertTrue(msft_in_all["is_ignored"])
        self.assertEqual(msft_in_all["ignored_reason"], "Personal long term holding, not swing trading")

        # Unignore MSFT trade
        self.svc.unignore_trade(msft_trade["id"])
        j3 = self.svc.get_journal()
        self.assertEqual(len(j3["trades"]), 2)
        self.assertAlmostEqual(j3["stats"]["total_pnl"], 296.0)
        self.assertEqual(j3["ignored_count"], 0)

    def test_open_trade_current_price_metrics(self):
        # Open LONG trade: bought 100 shares at $10.00
        xml = _statement(
            _trade_xml("10", "NVDA", "20240115;093512", 100, 10.0, conid="300"),
        )
        self.svc.import_statement(xml)
        price_map = {"NVDA": (12.50, "2024-01-16")}

        # Check trades with price_map
        trades = self.svc.get_trades(price_map=price_map)
        self.assertEqual(len(trades), 1)
        t = trades[0]
        self.assertEqual(t["status"], "OPEN")
        self.assertEqual(t["direction"], "LONG")
        self.assertEqual(t["open_qty"], 100)
        self.assertEqual(t["avg_entry"], 10.0)
        self.assertEqual(t["current_price"], 12.50)
        self.assertEqual(t["current_price_date"], "2024-01-16")
        # Unrealized PnL: (12.50 - 10.00) * 100 = 250.0
        self.assertAlmostEqual(t["unrealized_pnl"], 250.0)
        self.assertAlmostEqual(t["unrealized_pnl_pct"], 25.0)
        self.assertAlmostEqual(t["pnl"], 250.0)
        self.assertAlmostEqual(t["pnl_pct"], 25.0)

        # Set initial stop to $9.00 -> risk per share: $1.00, total risk: $100.0
        # R-Multiple = 250.0 / 100.0 = +2.5 R
        self.svc.update_notes(t["id"], "Breakout buy", ["breakout"], initial_stop=9.0)
        t_updated = self.svc.get_trades(price_map=price_map)[0]
        self.assertAlmostEqual(t_updated["initial_risk_per_share"], 1.0)
        self.assertAlmostEqual(t_updated["initial_risk_total"], 100.0)
        self.assertAlmostEqual(t_updated["r_multiple"], 2.5)

    def test_open_trade_scale_out_metrics(self):
        # Scale-out: bought 20 shares @ $50, sold 10 shares @ $60 (realized PnL = 100 - commissions)
        # Remaining 10 shares open @ $50. Current price = $55.
        xml = _statement(
            _trade_xml("20", "TSLA", "20240115;093512", 20, 50.0, commission=-1.0, conid="400"),
            _trade_xml("21", "TSLA", "20240120;100000", -10, 60.0, commission=-1.0, oc="C", fifo=98.0, conid="400"),
        )
        self.svc.import_statement(xml)
        price_map = {"TSLA": (55.0, "2024-01-22")}

        trades = self.svc.get_trades(price_map=price_map)
        self.assertEqual(len(trades), 1)
        t = trades[0]
        self.assertEqual(t["status"], "OPEN")
        self.assertEqual(t["entry_qty"], 20.0)
        self.assertEqual(t["exit_qty"], 10.0)
        self.assertEqual(t["open_qty"], 10.0)
        # Realized FIFO = 98.0
        self.assertAlmostEqual(t["realized_pnl"], 98.0)
        # Unrealized: (55 - 50) * 10 = 50.0
        self.assertAlmostEqual(t["unrealized_pnl"], 50.0)
        self.assertAlmostEqual(t["unrealized_pnl_pct"], 10.0)
        # Total PnL = 98.0 + 50.0 = 148.0
        self.assertAlmostEqual(t["pnl"], 148.0)
        # Entry notional = 20 * 50 = 1000. Total Return = 148 / 1000 * 100 = 14.8%
        self.assertAlmostEqual(t["pnl_pct"], 14.8)

        # Compute statistics includes open_pnl
        stats = compute_statistics(trades)
        self.assertEqual(stats["open_trades"], 1)
        self.assertAlmostEqual(stats["open_pnl"], 148.0)
        self.assertAlmostEqual(stats["avg_open_pnl_pct"], 14.8)

    def test_multi_account_support_and_filtering(self):
        # XML containing trades for two accounts: U1 (Taxable) and U2 (Roth IRA)
        stmt1 = '<FlexStatement accountId="U1"><Trades>' + "".join([
            _trade_xml("1", "AAPL", "20240115;093512", 100, 10.0, account_id="U1"),
            _trade_xml("2", "AAPL", "20240120;100000", -100, 15.0, oc="C", fifo=498.0, account_id="U1"),
        ]) + '</Trades></FlexStatement>'
        stmt2 = '<FlexStatement accountId="U2"><Trades>' + "".join([
            _trade_xml("3", "AAPL", "20240116;093512", 50, 12.0, account_id="U2"),
            _trade_xml("4", "AAPL", "20240122;100000", -50, 18.0, oc="C", fifo=298.0, account_id="U2"),
            _trade_xml("5", "TSLA", "20240118;093512", 10, 200.0, conid="200", account_id="U2"),
        ]) + '</Trades></FlexStatement>'

        xml = _multi_statement(stmt1, stmt2)
        res = self.svc.import_statement(xml)
        self.assertEqual(res["accounts"], ["U1", "U2"])
        self.assertEqual(res["new_executions"], 5)

        # Journal with no account filter: shows all trades across both accounts
        j_all = self.svc.get_journal()
        self.assertEqual(len(j_all["trades"]), 3)
        self.assertEqual(j_all["accounts"], ["U1", "U2"])
        # Closed trades: 1 on U1 (pnl=498), 1 on U2 (pnl=298) -> total 796
        self.assertAlmostEqual(j_all["stats"]["total_pnl"], 796.0)

        # Filter by Account U1 only
        j_u1 = self.svc.get_journal(account="U1")
        self.assertEqual(len(j_u1["trades"]), 1)
        self.assertEqual(j_u1["trades"][0]["symbol"], "AAPL")
        self.assertEqual(j_u1["trades"][0]["account_id"], "U1")
        self.assertAlmostEqual(j_u1["stats"]["total_pnl"], 498.0)
        self.assertEqual(j_u1["accounts"], ["U1", "U2"])

        # Filter by Account U2 only
        j_u2 = self.svc.get_journal(account="U2")
        self.assertEqual(len(j_u2["trades"]), 2)
        self.assertTrue(all(t["account_id"] == "U2" for t in j_u2["trades"]))
        self.assertAlmostEqual(j_u2["stats"]["total_pnl"], 298.0)

    def test_multi_query_config_and_sync(self):
        # Configure multiple queries
        cfg = self.svc.update_flex_config(
            token="default_secret_token",
            queries=[
                {"name": "Taxable Account", "query_id": "111111"},
                {"name": "Roth IRA", "query_id": "222222", "token": "custom_token_2"},
            ]
        )
        self.assertEqual(len(cfg["queries"]), 2)
        self.assertEqual(cfg["queries"][0]["name"], "Taxable Account")
        self.assertEqual(cfg["queries"][0]["query_id"], "111111")
        self.assertFalse(cfg["queries"][0]["has_custom_token"])
        self.assertTrue(cfg["queries"][1]["has_custom_token"])
        self.assertTrue(cfg["queries"][1]["token_masked"].endswith("en_2"))

        # Mock IBKRFlexClient to test multi-query sync
        xml_q1 = _statement(
            _trade_xml("101", "NVDA", "20240115;093512", 10, 100.0, account_id="U10"),
            _trade_xml("102", "NVDA", "20240120;100000", -10, 120.0, oc="C", fifo=198.0, account_id="U10"),
        )
        xml_q2 = _statement(
            _trade_xml("201", "AMZN", "20240116;093512", 20, 150.0, account_id="U20"),
            _trade_xml("202", "AMZN", "20240122;100000", -20, 160.0, oc="C", fifo=198.0, account_id="U20"),
        )

        def mock_fetch(self_client):
            if self_client.query_id == "111111":
                return xml_q1
            elif self_client.query_id == "222222":
                return xml_q2
            raise FlexError("Unknown query")

        with patch.object(IBKRFlexClient, "fetch_statement", autospec=True, side_effect=mock_fetch):
            sync_res = self.svc.sync_from_flex()
            self.assertEqual(sync_res["status"], "success")
            self.assertEqual(sync_res["fetched"], 4)
            self.assertEqual(sync_res["accounts"], ["U10", "U20"])
            self.assertEqual(len(sync_res["query_results"]), 2)

        j = self.svc.get_journal()
        self.assertEqual(j["accounts"], ["U10", "U20"])
        self.assertEqual(len(j["trades"]), 2)


class TestIBKRFlexClient(unittest.TestCase):
    def test_get_retries_on_connection_error(self):
        mock_session = MagicMock()
        success_resp = MagicMock()
        success_resp.content = b"<FlexQueryResponse></FlexQueryResponse>"
        success_resp.raise_for_status.return_value = None

        mock_session.get.side_effect = [
            requests.exceptions.ConnectionError("Failed to resolve gdcdyn.interactivebrokers.com"),
            success_resp,
        ]

        client = IBKRFlexClient("dummy_token", "12345", session=mock_session)
        content = client._get("https://gdcdyn.interactivebrokers.com/test", {}, retries=2, backoff=0.01)
        self.assertEqual(content, b"<FlexQueryResponse></FlexQueryResponse>")
        self.assertEqual(mock_session.get.call_count, 2)

    def test_get_statement_falls_back_to_base_url(self):
        mock_session = MagicMock()
        success_resp = MagicMock()
        success_resp.content = b"<FlexQueryResponse></FlexQueryResponse>"
        success_resp.raise_for_status.return_value = None

        def side_effect(url, **kwargs):
            if "gdcdyn" in url:
                raise requests.exceptions.ConnectionError("DNS failure on gdcdyn")
            return success_resp

        mock_session.get.side_effect = side_effect

        client = IBKRFlexClient("dummy_token", "12345", session=mock_session, base_url="https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService")
        orig_get = client._get

        def quick_get(url, params, **kwargs):
            return orig_get(url, params, retries=1)

        with patch.object(client, "_get", side_effect=quick_get):
            content = client.get_statement(
                "ref_999",
                "https://gdcdyn.interactivebrokers.com/AccountManagement/FlexWebService/GetStatement",
            )
            self.assertEqual(content, b"<FlexQueryResponse></FlexQueryResponse>")


if __name__ == "__main__":
    unittest.main()

