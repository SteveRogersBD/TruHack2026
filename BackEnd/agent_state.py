from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Role(Enum):
    LEARNER = "learner"
    TUTOR = "tutor"
    ADMIN = "admin"


@dataclass
class Subject:
    course_name: str
    topic_name: str
    details: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "course_name": self.course_name,
            "topic_name": self.topic_name,
            "details": self.details
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Subject":
        if not data:
            return cls(course_name="general", topic_name="unspecified")
        return cls(
            course_name=data.get("course_name", "general"),
            topic_name=data.get("topic_name", "unspecified"),
            details=data.get("details")
        )


@dataclass
class AgentState:
    user_id: str
    role: Role
    session_id: str
    mode: str = "general"
    learning_goal: str = ""
    current_code: str = ""
    last_output: str = ""
    last_error: Optional[str] = None
    feature_flags: List[str] = field(default_factory=list)
    updated_at: datetime = field(default_factory=_now)
    subject: "Subject" = field(default_factory=lambda: Subject(course_name="general", topic_name="unspecified"))

    def update_code(self, code: str) -> None:
        self.current_code = code
        self.updated_at = _now()

    def record_execution_result(self, output: str, error: Optional[str]) -> None:
        self.last_output = output
        self.last_error = error
        self.updated_at = _now()

    def set_learning_goal(self, goal: str) -> None:
        self.learning_goal = goal
        self.updated_at = _now()

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["role"] = self.role.value
        data["updated_at"] = self.updated_at.isoformat()
        data["subject"] = self.subject.to_dict()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AgentState":
        return cls(
            user_id=data["user_id"],
            role=Role(data["role"]),
            session_id=data["session_id"],
            mode=data.get("mode", "general"),
            learning_goal=data.get("learning_goal", ""),
            current_code=data.get("current_code", ""),
            last_output=data.get("last_output", ""),
            last_error=data.get("last_error"),
            feature_flags=list(data.get("feature_flags", [])),
            subject=Subject.from_dict(data.get("subject", {})),
            updated_at=datetime.fromisoformat(data.get("updated_at")) if data.get("updated_at") else _now(),
        )

    @classmethod
    def create(cls, user_id: str, role: Role = Role.LEARNER) -> "AgentState":
        return cls(user_id=user_id, role=role, session_id=str(uuid.uuid4()))

    def set_subject(self, subject: "Subject") -> None:
        self.subject = subject
        self.updated_at = _now()


class AgentStateStore:
    def __init__(self, path: Path | str):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def save(self, state: AgentState) -> None:
        with open(self.path, "w", encoding="utf-8") as handle:
            json.dump(state.to_dict(), handle, indent=2)

    def load(self) -> Optional[AgentState]:
        if not self.path.exists():
            return None
        with open(self.path, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
        return AgentState.from_dict(payload)


class SessionManager:
    def __init__(self, store: AgentStateStore):
        self.store = store
        self.state: Optional[AgentState] = store.load()

    def start_session(self, user_id: str, role: Role = Role.LEARNER) -> AgentState:
        self.state = AgentState.create(user_id=user_id, role=role)
        self.store.save(self.state)
        return self.state

    def resume(self) -> Optional[AgentState]:
        return self.state

    def persist(self) -> None:
        if self.state:
            self.store.save(self.state)
