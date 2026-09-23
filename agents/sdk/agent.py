import requests
import sqlite3
import json
import os
import urllib.parse
from pathlib import Path
from datetime import datetime

from .models import AgentConfig, Task


class Agent:
    def __init__(self, agent_id, name, master_host, api_key, capabilities=None, db_path=None):
        self.agent_id = agent_id
        self.name = name
        self.master_host = master_host.rstrip('/')
        self.api_key = api_key
        self.capabilities = capabilities or []
        self.db_path = Path(db_path) if db_path else Path(__file__).parent / "queue.db"
        self._init_db()
    
    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS task_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_type TEXT NOT NULL,
                payload TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'pending',
                forwarded_at TIMESTAMP NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS agent_state (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        conn.close()
    
    def register(self):
        try:
            r = requests.post(
                f"{self.master_host}/api/agents/node/register",
                headers={"x-agent-api-key": self.api_key, "Content-Type": "application/json"},
                json={
                    "agentId": self.agent_id,
                    "name": self.name,
                    "capabilities": self.capabilities
                },
                timeout=10
            )
            return r.status_code == 200 or r.status_code == 201
        except Exception as e:
            print(f"Register error: {e}")
            return False
    
    def heartbeat(self, status="online"):
        try:
            r = requests.post(
                f"{self.master_host}/api/agents/node/{urllib.parse.quote(self.name)}/heartbeat",
                headers={"x-agent-api-key": self.api_key, "Content-Type": "application/json"},
                json={"status": status},
                timeout=5
            )
            return r.status_code == 200
        except:
            return False
    
    def report(self, task_id, status="completed", result=None):
        try:
            r = requests.post(
                f"{self.master_host}/api/tasks/{task_id}/report",
                headers={"x-api-key": self.api_key, "Content-Type": "application/json"},
                json={"status": status, "result": result or {}},
                timeout=10
            )
            return r.status_code == 200
        except:
            return False
    
    def enqueue(self, task_type, payload):
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            "INSERT INTO task_queue (task_type, payload) VALUES (?, ?)",
            (task_type, json.dumps(payload))
        )
        conn.commit()
        conn.close()
    
    def dequeue(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute(
            "SELECT id, task_type, payload FROM task_queue WHERE status = 'pending' ORDER BY created_at"
        )
        tasks = cursor.fetchall()
        forwarded = []
        for task_id, task_type, payload in tasks:
            try:
                r = requests.post(
                    f"{self.master_host}/api/tasks/report",
                    headers={"x-api-key": self.api_key, "Content-Type": "application/json"},
                    json={"taskId": str(task_id), "type": task_type, "result": json.loads(payload)},
                    timeout=5
                )
                if r.status_code == 200:
                    conn.execute(
                        "UPDATE task_queue SET status = 'forwarded', forwarded_at = CURRENT_TIMESTAMP WHERE id = ?",
                        (task_id,)
                    )
                    forwarded.append(task_id)
            except:
                break
        conn.commit()
        conn.close()
        return forwarded
    
    def poll_tasks(self):
        try:
            r = requests.get(
                f"{self.master_host}/api/tasks/{self.agent_id}",
                headers={"x-api-key": self.api_key},
                timeout=5
            )
            if r.status_code == 200:
                return r.json().get("tasks", [])
        except:
            pass
        return []
    
    def get_state(self, key):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute("SELECT value FROM agent_state WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else None
    
    def set_state(self, key, value):
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            "INSERT OR REPLACE INTO agent_state (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
            (key, value)
        )
        conn.commit()
        conn.close()
