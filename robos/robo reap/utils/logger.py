import json
import datetime
import sys

class Logger:
    def __init__(self, case_id=None):
        self.case_id = case_id

    def log(self, level, message, step=None, details=None):
        entry = {
            "timestamp": datetime.datetime.now().isoformat(),
            "level": level.upper(),
            "message": message,
            "case_id": self.case_id,
            "step": step,
            "details": details
        }
        # Print JSON to stdout for Electron/Parent process to capture
        print(json.dumps(entry), flush=True)

    def info(self, message, step=None, details=None):
        self.log("INFO", message, step, details)

    def error(self, message, step=None, details=None):
        self.log("ERROR", message, step, details)
    
    def warn(self, message, step=None, details=None):
        self.log("WARN", message, step, details)

# Singleton instance for quick usage if needed, though instantiating per case is better
global_logger = Logger()
