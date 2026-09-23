#!/usr/bin/env python3
"""
Hive Server — Pirate Captain Crew Monitor
FastAPI service with agent registry + task dispatch + status dashboard.
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import json
from datetime import datetime, timedelta
from pathlib import Path

app = FastAPI(title="Pirate Captain Hive Mind", version="0.2.0")

# Database path — defaults to local hive.db; override with MC_DB_PATH
DEFAULT_DB = Path(__file__).parent / "hive.db"
MC_DB_PATH = Path(__file__).parent.parent / "mission-control/.next/standalone/.data/mission-control.db"
DB_PATH = MC_DB_PATH if MC_DB_PATH.exists() else DEFAULT_DB

STALE_THRESHOLD_HOURS = 24  # beyond this, an "online" agent is marked stale


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


# --- Agent Registry Endpoints ---

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


@app.get("/api/agents/status")
def agents_status(db=Depends(get_db)):
    """
    Aggregated crew status dashboard:
    - total / online / offline / stale counts
    - full agent list with computed is_stale flag
    - stale threshold in hours
    """
    rows = db.execute("SELECT * FROM agents ORDER BY last_seen DESC").fetchall()
    agents = [dict(r) for r in rows]

    now = datetime.utcnow()
    cutoff = now - timedelta(hours=STALE_THRESHOLD_HOURS)

    online = 0
    offline = 0
    stale = 0
    enriched = []

    for a in agents:
        last_seen_str = a.get("last_seen")
        is_stale = False

        if a["status"] == "online" and last_seen_str:
            try:
                ls = datetime.fromisoformat(last_seen_str.replace("Z", "+00:00").replace("+00:00", ""))
                if ls < cutoff:
                    is_stale = True
                    stale += 1
                else:
                    online += 1
            except (ValueError, TypeError):
                is_stale = True
                stale += 1
        elif a["status"] == "online":
            # online but no timestamp — treat as online
            online += 1
        else:
            offline += 1

        enriched.append({
            "agent_id": a["agent_id"],
            "name": a["name"],
            "status": a["status"],
            "last_seen": last_seen_str,
            "capabilities": json.loads(a["capabilities"]) if a.get("capabilities") else [],
            "is_stale": is_stale,
        })

    return {
        "summary": {
            "total": len(agents),
            "online": online,
            "offline": offline,
            "stale": stale,
            "stale_threshold_hours": STALE_THRESHOLD_HOURS,
        },
        "agents": enriched,
        "generated_at": now.isoformat(),
    }


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


# --- Task Endpoints ---

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


# --- Event Endpoints ---

@app.post("/api/events")
def create_event(event: EventCreate, db=Depends(get_db)):
    db.execute("""
        INSERT INTO events (agent_id, event_type, payload)
        VALUES (?, ?, ?)
    """, (event.agent_id, event.event_type, json.dumps(event.payload)))
    db.commit()
    return {"status": "logged"}


# --- Health ---

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "Pirate Captain Hive Mind",
        "version": "0.2.0",
    }
