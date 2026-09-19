import unittest
import os
import tempfile
from application.services.theme_service import ThemeService
from application.services.group_radar_service import GroupRadarService
from application.router import (
    get_themes,
    create_or_update_theme,
    delete_theme,
    get_group_strength,
    get_group_constituents,
    ThemeCreateUpdateSchema
)


class TestThemeService(unittest.TestCase):
    def setUp(self):
        self.temp_file = tempfile.NamedTemporaryFile(suffix=".yaml", delete=False)
        self.temp_file.close()
        # Remove it so ThemeService initializes defaults
        os.unlink(self.temp_file.name)
        self.service = ThemeService(file_path=self.temp_file.name)

    def tearDown(self):
        if os.path.exists(self.temp_file.name):
            os.unlink(self.temp_file.name)

    def test_default_themes_seeded(self):
        themes = self.service.load_themes()
        self.assertGreaterEqual(len(themes), 10)
        theme_names = [t["name"] for t in themes]
        self.assertIn("Crypto & Blockchain", theme_names)
        self.assertIn("AI & Data Center Infrastructure", theme_names)
        self.assertIn("Nuclear & Uranium Power", theme_names)

    def test_create_and_get_theme(self):
        created = self.service.create_or_update_theme(
            name="Autonomous Robotics",
            description="Robotics, automation, and vision AI",
            symbols=["tsla", "ISRG", "path"]
        )
        self.assertEqual(created["name"], "Autonomous Robotics")
        self.assertEqual(created["symbols"], ["TSLA", "ISRG", "PATH"])

        fetched = self.service.get_theme("autonomous robotics")
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched["symbols"], ["TSLA", "ISRG", "PATH"])

    def test_delete_theme(self):
        self.service.create_or_update_theme(
            name="Temporary Theme",
            description="To be deleted",
            symbols=["ABC"]
        )
        self.assertIsNotNone(self.service.get_theme("Temporary Theme"))

        deleted = self.service.delete_theme("Temporary Theme")
        self.assertTrue(deleted)
        self.assertIsNone(self.service.get_theme("Temporary Theme"))


class TestGroupRadarService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.service = GroupRadarService(db_path="data.db")

    def test_group_strength_themes(self):
        results = self.service.get_group_strength("themes")
        self.assertIsInstance(results, list)
        self.assertGreater(len(results), 0)

        first = results[0]
        self.assertIn("name", first)
        self.assertIn("stock_count", first)
        self.assertIn("today_pct", first)
        self.assertIn("ret_1w_pct", first)
        self.assertIn("ret_1m_pct", first)
        self.assertIn("ret_3m_pct", first)
        self.assertIn("ret_ytd_pct", first)
        self.assertIn("rs_rank", first)
        self.assertIn("dist_52wh_pct", first)
        self.assertIn("rvol_pct", first)
        self.assertIn("top_symbols", first)

    def test_group_strength_industries(self):
        results = self.service.get_group_strength("industries")
        self.assertIsInstance(results, list)
        self.assertGreater(len(results), 50)

        # Check Semiconductors or Computer Software
        names = [r["name"] for r in results]
        self.assertTrue(any("Semiconductors" in n or "Software" in n for n in names))

    def test_group_strength_sectors(self):
        results = self.service.get_group_strength("sectors")
        self.assertIsInstance(results, list)
        self.assertGreaterEqual(len(results), 10)

        # Technology, Health Care, Finance should be present
        names = [r["name"] for r in results]
        self.assertIn("Technology", names)
        self.assertIn("Health Care", names)

    def test_group_strength_industries_in_sector(self):
        results = self.service.get_group_strength("industries", sector="Technology")
        self.assertIsInstance(results, list)
        self.assertGreaterEqual(len(results), 5)
        names = [r["name"] for r in results]
        self.assertTrue(any("Software" in n or "Semiconductors" in n for n in names))

    def test_group_strength_themes_in_sector(self):
        results = self.service.get_group_strength("themes", sector="Technology")
        self.assertIsInstance(results, list)
        self.assertGreater(len(results), 0)
        names = [r["name"] for r in results]
        self.assertTrue(any("AI" in n or "Cybersecurity" in n for n in names))

    def test_group_constituents_theme(self):
        constituents = self.service.get_group_constituents("themes", "Crypto & Blockchain")
        self.assertIsInstance(constituents, list)
        self.assertGreater(len(constituents), 0)

        first = constituents[0]
        self.assertIn("symbol", first)
        self.assertIn("close", first)
        self.assertIn("today_pct", first)
        self.assertIn("ret_1w_pct", first)
        self.assertIn("rs_rank", first)
        self.assertIn("setups", first)
        self.assertIsInstance(first["setups"], list)

    def test_group_constituents_industry(self):
        constituents = self.service.get_group_constituents("industries", "Semiconductors")
        self.assertIsInstance(constituents, list)
        self.assertGreater(len(constituents), 0)

        symbols = [c["symbol"] for c in constituents]
        self.assertTrue(any(s in symbols for s in ["AMD", "MU", "INTC", "MRVL"]))

    def test_group_constituents_rs_blue_dot(self):
        constituents = self.service.get_group_constituents("industries", "Major Banks")
        self.assertIsInstance(constituents, list)
        self.assertGreater(len(constituents), 0)
        # Check that setups list includes 'RS Blue Dot' for qualifying banks
        has_blue_dot = any("RS Blue Dot" in c.get("setups", []) for c in constituents)
        self.assertTrue(has_blue_dot)

    def test_get_rrg_data_sectors(self):
        rrg = self.service.get_rrg_data("sectors", trail_bars=5)
        self.assertIsInstance(rrg, list)
        self.assertGreaterEqual(len(rrg), 10)
        first = rrg[0]
        self.assertIn("name", first)
        self.assertIn("symbol", first)
        self.assertIn("x", first)
        self.assertIn("y", first)
        self.assertIn("quadrant", first)
        self.assertIn(first["quadrant"], ["Leading", "Weakening", "Lagging", "Improving"])
        self.assertIn("trail", first)
        self.assertGreater(len(first["trail"]), 0)

    def test_get_rrg_data_themes(self):
        rrg = self.service.get_rrg_data("themes", trail_bars=5)
        self.assertIsInstance(rrg, list)
        self.assertGreater(len(rrg), 5)
        first = rrg[0]
        self.assertIn("quadrant", first)
        self.assertIn("trail", first)

    def test_get_rrg_data_industries(self):
        rrg = self.service.get_rrg_data("industries", trail_bars=5)
        self.assertIsInstance(rrg, list)
        self.assertGreaterEqual(len(rrg), 10)


class TestGroupRadarEndpoints(unittest.TestCase):
    def test_endpoints_callable(self):
        themes = get_themes()
        self.assertIsInstance(themes, list)
        self.assertGreater(len(themes), 0)

        strength = get_group_strength(type="themes")
        self.assertIsInstance(strength, list)
        self.assertGreater(len(strength), 0)

        constituents = get_group_constituents(type="themes", name="Crypto & Blockchain")
        self.assertIsInstance(constituents, list)
        self.assertGreater(len(constituents), 0)

        from application.router import get_groups_rrg
        rrg = get_groups_rrg(type="sectors")
        self.assertIsInstance(rrg, list)
        self.assertGreater(len(rrg), 0)


if __name__ == "__main__":
    unittest.main()

