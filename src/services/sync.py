import sys
import subprocess
import threading
from datetime import datetime
from typing import Dict, Any

class SyncService:
    def __init__(self):
        self.sync_status = {
            "status": "idle", # idle, running, completed, failed
            "start_time": None,
            "end_time": None,
            "log_output": "",
            "error_message": None
        }
        self.sync_lock = threading.Lock()

    def run_sync_subprocess(self, skip_prices: bool = False, skip_fundamentals: bool = False, include_premarket: bool = False, history_years: int = None, force_full: bool = False):
        with self.sync_lock:
            self.sync_status["status"] = "running"
            self.sync_status["start_time"] = datetime.now().isoformat()
            self.sync_status["end_time"] = None
            self.sync_status["log_output"] = ""
            self.sync_status["error_message"] = None

        # Call the python src.pipeline module
        cmd = [sys.executable, "-m", "src.pipeline"]
        if include_premarket:
            cmd.append("--include-premarket")
        elif skip_prices:
            cmd.append("--skip-prices")
        if skip_fundamentals:
            cmd.append("--skip-fundamentals")
        if history_years is not None:
            cmd.extend(["--history-years", str(history_years)])
        if force_full:
            cmd.append("--force-full")
        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            
            log_acc = []
            for line in iter(process.stdout.readline, ""):
                log_acc.append(line)
                # Update log output live
                with self.sync_lock:
                    self.sync_status["log_output"] = "".join(log_acc)
                    
            process.stdout.close()
            return_code = process.wait()
            
            with self.sync_lock:
                if return_code == 0:
                    self.sync_status["status"] = "completed"
                else:
                    self.sync_status["status"] = "failed"
                    self.sync_status["error_message"] = f"Pipeline exited with return code {return_code}"
                self.sync_status["end_time"] = datetime.now().isoformat()
                
        except Exception as e:
            with self.sync_lock:
                self.sync_status["status"] = "failed"
                self.sync_status["error_message"] = str(e)
                self.sync_status["end_time"] = datetime.now().isoformat()

    def trigger_sync_run(self, background_tasks, skip_prices: bool = False, skip_fundamentals: bool = False, include_premarket: bool = False, history_years: int = None, force_full: bool = False) -> Dict[str, Any]:
        with self.sync_lock:
            if self.sync_status["status"] == "running":
                return {"message": "Sync pipeline is already running", "status": self.sync_status}
                
        background_tasks.add_task(
            self.run_sync_subprocess, 
            skip_prices=skip_prices, 
            skip_fundamentals=skip_fundamentals,
            include_premarket=include_premarket,
            history_years=history_years,
            force_full=force_full
        )
        return {"message": "Sync pipeline triggered in background", "status": "running"}

    def get_sync_status(self) -> Dict[str, Any]:
        with self.sync_lock:
            return self.sync_status

sync_service = SyncService()
