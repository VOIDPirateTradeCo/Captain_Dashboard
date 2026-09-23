from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime


@dataclass
class AgentConfig:
    agent_id: str
    name: str
    master_host: str
    api_key: str
    capabilities: list = field(default_factory=list)
    db_path: Optional[str] = None


@dataclass
class Task:
    task_id: str
    agent_id: str
    task_type: str
    payload: dict
    status: str = "pending"
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    completed_at: Optional[str] = None


@dataclass
class DependencyReport:
    machine: str
    timestamp: str
    packages: list = field(default_factory=list)
    
    def to_dict(self):
        return {
            "machine": self.machine,
            "timestamp": self.timestamp,
            "packages": self.packages
        }
