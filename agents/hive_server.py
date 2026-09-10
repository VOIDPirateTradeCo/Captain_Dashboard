from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import json
from datetime import datetime
from pathlib import Path

app = FastAPI(title="Pirate Captain Hive Mind", version="0.1.0")

# Database path
DB_PATH = Path(__file__).parent / "hive.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS agents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            capabilities TEXT DEFAULT '[]',
            status TEXT DEFAULT 'offline',
            last_seen TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT NOT NULL,
            task_type TEXT NOT NULL,
            payload TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            result TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
        );
        
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            event_type TEXT NOT NULL,
            payload TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()

init_db()


# --- Models ---

class AgentRegister(BaseModel):
    agent_id: str
    name: str
    capabilities: List[str] = []


class Heartbeat(BaseModel):
    status: str = "online"


class TaskReport(BaseModel):
    task_id: int
    status: str = "completed"
    result: dict = {}


class TaskDispatch(BaseModel):
    agent_id: str
    task_type: str
    payload: dict


class EventCreate(BaseModel):
    agent_id: Optional[str]
    event_type: str
    payload: dict


# --- Endpoints ---

@app.post("/api/agents/register")
def register_agent(reg: AgentRegister, db=Depends(get_db)):
    existing = db.execute("SELECT id FROM agents WHERE agent_id = ?", (reg.agent_id,)).fetchone()
    if existing:
        db.execute("""
            UPDATE agents SET name = ?, capabilities = ?, status = 'online', 
            last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
            WHERE agent_id = ?
        """, (reg.name, json.dumps(reg.capabilities), reg.agent_id))
        db.commit()
        return {"agent_id": reg.agent_id, "status": "updated"}
    
    db.execute("""
        INSERT INTO agents (agent_id, name, capabilities, status, last_seen)
        VALUES (?, ?, ?, 'online', CURRENT_TIMESTAMP)
    """, (reg.agent_id, reg.name, json.dumps(reg.capabilities)))
    db.commit()
    return {"agent_id": reg.agent_id, "status": "registered"}


@app.get("/api/agents")
def list_agents(db=Depends(get_db)):
    rows = db.execute("SELECT * FROM agents ORDER BY last_seen DESC").fetchall()
    return {"agents": [dict(r) for r in rows]}


@app.get("/api/agents/{agent_id}")
def get_agent(agent_id: str, db=Depends(get_db)):
    row = db.execute("SELECT * FROM agents WHERE agent_id = ?", (agent_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Agent not found")
    return dict(row)


@app.post("/api/agents/{agent_id}/heartbeat")
def heartbeat(agent_id: str, hb: Heartbeat, db=Depends(get_db)):
    row = db.execute("SELECT id FROM agents WHERE agent_id = ?", (agent_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Agent not found")
    
    db.execute("""
        UPDATE agents SET status = ?, last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
        WHERE agent_id = ?
    """, (hb.status, agent_id))
    db.commit()
    return {"agent_id": agent_id, "status": hb.status}


@app.post("/api/tasks/dispatch")
def dispatch_task(td: TaskDispatch, db=Depends(get_db)):
    agent = db.execute("SELECT id FROM agents WHERE agent_id = ?", (td.agent_id,)).fetchone()
    if not agent:
        raise HTTPException(404, "Agent not found")
    
    cursor = db.execute("""
        INSERT INTO tasks (agent_id, task_type, payload, status)
        VALUES (?, ?, ?, 'pending')
    """, (td.agent_id, td.task_type, json.dumps(td.payload)))
    db.commit()
    return {"task_id": cursor.lastrowid, "status": "dispatched"}


@app.get("/api/tasks/{agent_id}")
def get_pending_tasks(agent_id: str, db=Depends(get_db)):
    rows = db.execute("""
        SELECT * FROM tasks WHERE agent_id = ? AND status = 'pending'
        ORDER BY created_at ASC LIMIT 10
    """, (agent_id,)).fetchall()
    return {"agent_id": agent_id, "tasks": [dict(r) for r in rows]}


@app.post("/api/tasks/report")
def report_task(report: TaskReport, db=Depends(get_db)):
    db.execute("""
        UPDATE tasks SET status = ?, result = ?, completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (report.status, json.dumps(report.result), report.task_id))
    db.commit()
    return {"task_id": report.task_id, "status": report.status}


@app.post("/api/events")
def create_event(event: EventCreate, db=Depends(get_db)):
    db.execute("""
        INSERT INTO events (agent_id, event_type, payload)
        VALUES (?, ?, ?)
    """, (event.agent_id, event.event_type, json.dumps(event.payload)))
    db.commit()
    return {"status": "logged"}


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "Pirate Captain Hive Mind"
    }
