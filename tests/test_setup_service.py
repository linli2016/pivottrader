import os
import tempfile
import unittest
import yaml
from application.services.setup_service import SetupService


class TestSetupServiceVisibility(unittest.TestCase):
    def setUp(self):
        self.temp_yaml = tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False)
        test_config = {
            "folders": {
                "active_folder": {
                    "id": "active_folder",
                    "name": "Active Folder",
                    "visible": True,
                    "screeners": [
                        {
                            "id": "visible_screener",
                            "name": "Visible Screener",
                            "visible": True,
                            "expression": "C > 10"
                        },
                        {
                            "id": "hidden_screener",
                            "name": "Hidden Screener",
                            "visible": False,
                            "expression": "C > 20"
                        },
                        {
                            "id": "default_visible_screener",
                            "name": "Default Screener",
                            "expression": "C > 30"
                        }
                    ]
                },
                "hidden_folder": {
                    "id": "hidden_folder",
                    "name": "Hidden Folder",
                    "visible": False,
                    "screeners": [
                        {
                            "id": "screener_in_hidden_folder",
                            "name": "Screener in Hidden Folder",
                            "expression": "C > 40"
                        }
                    ]
                }
            },
            "setups": {
                "active_setup": {
                    "id": "active_setup",
                    "name": "Active Setup",
                    "sub_setups": [
                        {"id": "sub_vis", "name": "Visible Sub", "visible": True},
                        {"id": "sub_hid", "name": "Hidden Sub", "visible": False}
                    ]
                },
                "hidden_setup": {
                    "id": "hidden_setup",
                    "name": "Hidden Setup",
                    "visible": False
                }
            }
        }
        yaml.dump(test_config, self.temp_yaml)
        self.temp_yaml.close()
        self.service = SetupService(yaml_path=self.temp_yaml.name)

    def tearDown(self):
        if os.path.exists(self.temp_yaml.name):
            os.remove(self.temp_yaml.name)

    def test_default_and_explicit_visibility_parsing(self):
        cfg = self.service.get_setups_config(visible_only=False)
        folders = {f["id"]: f for f in cfg["folders"]}
        self.assertTrue(folders["active_folder"]["visible"])
        self.assertFalse(folders["hidden_folder"]["visible"])

        screeners = {s["id"]: s for s in folders["active_folder"]["screeners"]}
        self.assertTrue(screeners["visible_screener"]["visible"])
        self.assertFalse(screeners["hidden_screener"]["visible"])
        self.assertTrue(screeners["default_visible_screener"]["visible"])

        setups = {s["id"]: s for s in cfg["setups"]}
        self.assertTrue(setups["active_setup"]["visible"])
        self.assertFalse(setups["hidden_setup"]["visible"])

        subs = {sub["id"]: sub for sub in setups["active_setup"]["sub_setups"]}
        self.assertTrue(subs["sub_vis"]["visible"])
        self.assertFalse(subs["sub_hid"]["visible"])

    def test_visible_only_filtering(self):
        cfg_visible = self.service.get_setups_config(visible_only=True)

        # Hidden folder should be excluded
        folder_ids = [f["id"] for f in cfg_visible["folders"]]
        self.assertIn("active_folder", folder_ids)
        self.assertNotIn("hidden_folder", folder_ids)

        # Screeners inside active folder: hidden screener should be excluded
        active_f = next(f for f in cfg_visible["folders"] if f["id"] == "active_folder")
        screener_ids = [s["id"] for s in active_f["screeners"]]
        self.assertIn("visible_screener", screener_ids)
        self.assertIn("default_visible_screener", screener_ids)
        self.assertNotIn("hidden_screener", screener_ids)

        # Setups: hidden setup should be excluded
        setup_ids = [s["id"] for s in cfg_visible["setups"]]
        self.assertIn("active_setup", setup_ids)
        self.assertNotIn("hidden_setup", setup_ids)

        active_s = next(s for s in cfg_visible["setups"] if s["id"] == "active_setup")
        sub_ids = [sub["id"] for sub in active_s["sub_setups"]]
        self.assertIn("sub_vis", sub_ids)
        self.assertNotIn("sub_hid", sub_ids)

    def test_get_setup_by_id_finds_hidden_setups(self):
        # Hidden screener should still be resolvable by ID
        hidden_s = self.service.get_setup_by_id("hidden_screener")
        self.assertIsNotNone(hidden_s)
        self.assertEqual(hidden_s.get("id"), "hidden_screener")
        self.assertFalse(hidden_s.get("visible"))

        # Screener in hidden folder should still be resolvable
        screener_in_hidden = self.service.get_setup_by_id("screener_in_hidden_folder")
        self.assertIsNotNone(screener_in_hidden)
        self.assertEqual(screener_in_hidden.get("id"), "screener_in_hidden_folder")

        # Hidden setup should still be resolvable
        hidden_setup = self.service.get_setup_by_id("hidden_setup")
        self.assertIsNotNone(hidden_setup)
        self.assertEqual(hidden_setup.get("id"), "hidden_setup")


if __name__ == "__main__":
    unittest.main()

