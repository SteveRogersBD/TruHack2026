from __future__ import annotations

import hashlib
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from agent import graph as agent_graph
from db import get_db
from models import AuthSession, ChatMessage, ChatSession, MessageRole, User, UserRole
from tools import python_executor

app = FastAPI(title="Tutor Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://scholar-frontend-609208975469.us-central1.run.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()


# ---------------------------------------------------------------------------
# Password hashing (stdlib — no extra deps)
# ---------------------------------------------------------------------------

def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260_000).hex()
    return f"pbkdf2:{salt}:{key}"


def _verify_password(plain: str, stored: str) -> bool:
    if stored.startswith("pbkdf2:"):
        try:
            _, salt, key = stored.split(":", 2)
            candidate = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt.encode(), 260_000).hex()
            return secrets.compare_digest(candidate, key)
        except Exception:
            return False
    # Legacy plaintext fallback for existing accounts
    return secrets.compare_digest(plain, stored)


# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    auth_session = db.scalar(select(AuthSession).where(AuthSession.token == token))
    if not auth_session:
        raise HTTPException(status_code=401, detail="Invalid token")
    if auth_session.expires_at < datetime.now(timezone.utc):
        db.delete(auth_session)
        db.commit()
        raise HTTPException(status_code=401, detail="Token expired")
    return auth_session.user


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class UserOut(BaseModel):
    id: UUID
    email: str
    role: UserRole
    created_at: datetime


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=1)
    role: UserRole = UserRole.STUDENT


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=1)


class AuthResponse(BaseModel):
    user: UserOut
    access_token: str


class CreateSessionRequest(BaseModel):
    title: Optional[str] = None
    learning_goal: Optional[str] = None


class SessionOut(BaseModel):
    id: UUID
    user_id: UUID
    title: Optional[str] = None
    learning_goal: Optional[str] = None
    current_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ListSessionsResponse(BaseModel):
    sessions: List[SessionOut]


class MessageOut(BaseModel):
    id: UUID
    session_id: UUID
    role: MessageRole
    content: str
    meta: Optional[Dict[str, Any]] = None
    created_at: datetime


class ListMessagesResponse(BaseModel):
    messages: List[MessageOut]


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)


class CanvasAction(BaseModel):
    type: str
    content: str
    language: Optional[str] = None
    step: int
    narration: str


class StructuredTutorResponse(BaseModel):
    speech: str
    emotion: str
    canvas_mode: str
    canvas_actions: List[CanvasAction]
    follow_up_suggestions: List[str]


class ChatResponse(BaseModel):
    session_id: UUID
    reply: MessageOut
    structured: Optional[StructuredTutorResponse] = None


class SetGoalRequest(BaseModel):
    goal: str = Field(min_length=1)


class SaveCodeRequest(BaseModel):
    code: str


class ExecuteRequest(BaseModel):
    code: str = Field(min_length=1)
    language: str = "python"


class ExecutionResult(BaseModel):
    output: str
    error: Optional[str] = None
    success: bool
    execution_time_ms: int


class ExecuteResponse(BaseModel):
    session_id: UUID
    execution: ExecutionResult
    reply: MessageOut
    structured: Optional[StructuredTutorResponse] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _session_to_out(s: ChatSession) -> SessionOut:
    return SessionOut(
        id=s.id,
        user_id=s.user_id,
        title=s.title,
        learning_goal=s.learning_goal,
        current_code=s.current_code,
        created_at=s.created_at,
        updated_at=s.updated_at,
    )


def _get_session_or_404(session_id: UUID, user_id: UUID, db: Session) -> ChatSession:
    session = db.scalar(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user_id)
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def _build_langchain_messages(db_messages: list[ChatMessage]) -> list:
    from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
    result = []
    for m in db_messages:
        if m.role == MessageRole.USER:
            result.append(HumanMessage(content=m.content))
        elif m.role == MessageRole.ASSISTANT:
            result.append(AIMessage(content=m.content))
        elif m.role == MessageRole.SYSTEM:
            result.append(SystemMessage(content=m.content))
    return result


def _run_tutor(
    messages: list,
    learning_goal: str,
    current_code: str,
    last_execution: str,
) -> tuple[str, dict | None]:
    """Invoke the agent graph and return (speech_content, structured_data)."""
    final_state = agent_graph.invoke({
        "messages": messages,
        "next_agent": "tutor",
        "topic": "General",
        "course": "General",
        "learning_goal": learning_goal,
        "current_code": current_code,
        "last_execution": last_execution,
    })
    ai_msg = final_state["messages"][-1]
    content = ai_msg.content if hasattr(ai_msg, "content") else str(ai_msg)
    structured = None
    if hasattr(ai_msg, "additional_kwargs"):
        structured = ai_msg.additional_kwargs.get("structured")
    return content, structured


def _build_structured(data: dict | None) -> StructuredTutorResponse | None:
    if not data:
        return None
    try:
        return StructuredTutorResponse(**data)
    except Exception:
        return None


def _save_ai_message(
    db: Session,
    session: ChatSession,
    content: str,
    structured_data: dict | None,
) -> ChatMessage:
    msg = ChatMessage(
        session_id=session.id,
        role=MessageRole.ASSISTANT,
        content=content,
        meta=structured_data,
    )
    db.add(msg)
    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)
    return msg


def _msg_to_out(m: ChatMessage) -> MessageOut:
    return MessageOut(
        id=m.id,
        session_id=m.session_id,
        role=m.role.value,
        content=m.content,
        meta=m.meta,
        created_at=m.created_at,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


# --- Auth ---

@app.post("/auth/register", response_model=AuthResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    if db.scalar(select(User).where(User.email == req.email)):
        raise HTTPException(status_code=400, detail="User already exists")
    new_user = User(email=req.email, password=_hash_password(req.password), role=req.role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = secrets.token_hex(32)
    db.add(AuthSession(
        token=token,
        user_id=new_user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    ))
    db.commit()
    return AuthResponse(
        user=UserOut(id=new_user.id, email=new_user.email, role=new_user.role, created_at=new_user.created_at),
        access_token=token,
    )


@app.post("/auth/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == req.email))
    if not user or not _verify_password(req.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = secrets.token_hex(32)
    db.add(AuthSession(
        token=token,
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    ))
    db.commit()
    return AuthResponse(
        user=UserOut(id=user.id, email=user.email, role=user.role, created_at=user.created_at),
        access_token=token,
    )


# --- Sessions ---

@app.get("/sessions", response_model=ListSessionsResponse)
def list_sessions(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ListSessionsResponse:
    sessions = db.scalars(
        select(ChatSession).where(ChatSession.user_id == user.id).order_by(ChatSession.created_at.desc())
    ).all()
    return ListSessionsResponse(sessions=[_session_to_out(s) for s in sessions])


@app.post("/sessions", response_model=SessionOut)
def create_session(
    req: CreateSessionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionOut:
    s = ChatSession(user_id=user.id, title=req.title or "New Chat", learning_goal=req.learning_goal)
    db.add(s)
    db.commit()
    db.refresh(s)
    return _session_to_out(s)


@app.get("/sessions/{session_id}", response_model=SessionOut)
def get_session(
    session_id: UUID = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionOut:
    return _session_to_out(_get_session_or_404(session_id, user.id, db))


@app.delete("/sessions/{session_id}")
def delete_session(
    session_id: UUID = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, str]:
    session = _get_session_or_404(session_id, user.id, db)
    db.delete(session)
    db.commit()
    return {"status": "deleted"}


# --- Workspace state ---

@app.put("/sessions/{session_id}/goal", response_model=SessionOut)
def set_goal(
    req: SetGoalRequest,
    session_id: UUID = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionOut:
    session = _get_session_or_404(session_id, user.id, db)
    session.learning_goal = req.goal
    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return _session_to_out(session)


@app.put("/sessions/{session_id}/code")
def save_code(
    req: SaveCodeRequest,
    session_id: UUID = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    session = _get_session_or_404(session_id, user.id, db)
    session.current_code = req.code
    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"saved": True, "timestamp": session.updated_at.isoformat()}


# --- Code execution ---

@app.post("/sessions/{session_id}/execute", response_model=ExecuteResponse)
def execute_code(
    req: ExecuteRequest,
    session_id: UUID = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExecuteResponse:
    from langchain_core.messages import HumanMessage

    session = _get_session_or_404(session_id, user.id, db)

    if req.language != "python":
        raise HTTPException(status_code=400, detail="Only 'python' is supported server-side. Use Pyodide in the browser for other languages.")

    # Execute code and time it
    t0 = time.perf_counter()
    raw_output = python_executor(req.code)
    elapsed_ms = int((time.perf_counter() - t0) * 1000)

    has_error = "[Errors]:" in raw_output
    execution = ExecutionResult(
        output=raw_output,
        error=raw_output.split("[Errors]:")[1].strip() if has_error else None,
        success=not has_error,
        execution_time_ms=elapsed_ms,
    )

    # Persist code + execution result to session
    session.current_code = req.code
    session.last_execution = {
        "output": execution.output,
        "error": execution.error,
        "success": execution.success,
        "execution_time_ms": elapsed_ms,
    }
    db.commit()

    # Build execution summary message for the tutor
    exec_summary = (
        f"The student ran the following code:\n```python\n{req.code}\n```\n\n"
        f"Output:\n{execution.output}"
    )

    # Load conversation history + append the execution event
    history = db.scalars(
        select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc())
    ).all()
    lc_messages = _build_langchain_messages(history) + [HumanMessage(content=exec_summary)]

    last_execution_str = (
        f"Output: {execution.output}\nError: {execution.error or 'None'}"
    )

    content, structured_data = _run_tutor(
        messages=lc_messages,
        learning_goal=session.learning_goal or "Not specified",
        current_code=req.code,
        last_execution=last_execution_str,
    )

    # Save the AI response as a message
    user_exec_msg = ChatMessage(session_id=session_id, role=MessageRole.USER, content=exec_summary)
    db.add(user_exec_msg)
    ai_msg = _save_ai_message(db, session, content, structured_data)

    return ExecuteResponse(
        session_id=session_id,
        execution=execution,
        reply=_msg_to_out(ai_msg),
        structured=_build_structured(structured_data),
    )


# --- Messages ---

@app.get("/sessions/{session_id}/messages", response_model=ListMessagesResponse)
def list_messages(
    session_id: UUID = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ListMessagesResponse:
    _get_session_or_404(session_id, user.id, db)
    messages = db.scalars(
        select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc())
    ).all()
    return ListMessagesResponse(messages=[_msg_to_out(m) for m in messages])


# --- Chat ---

@app.post("/sessions/{session_id}/chat", response_model=ChatResponse)
def chat(
    req: ChatRequest,
    session_id: UUID = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatResponse:
    session = _get_session_or_404(session_id, user.id, db)

    # Persist user message
    user_msg = ChatMessage(session_id=session_id, role=MessageRole.USER, content=req.message)
    db.add(user_msg)
    db.commit()

    # Build message history for the agent
    history = db.scalars(
        select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc())
    ).all()
    lc_messages = _build_langchain_messages(history)

    # Format last execution for context
    last_execution_str = "No executions yet"
    if session.last_execution:
        ex = session.last_execution
        last_execution_str = f"Output: {ex.get('output', '')}\nError: {ex.get('error') or 'None'}"

    content, structured_data = _run_tutor(
        messages=lc_messages,
        learning_goal=session.learning_goal or "Not specified",
        current_code=session.current_code or "No code yet",
        last_execution=last_execution_str,
    )

    ai_msg = _save_ai_message(db, session, content, structured_data)

    return ChatResponse(
        session_id=session_id,
        reply=_msg_to_out(ai_msg),
        structured=_build_structured(structured_data),
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
