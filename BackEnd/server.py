from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID, uuid4

from fastapi import Depends, FastAPI, HTTPException, Path
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from agent import graph as agent_graph
from db import get_db
from models import AuthSession, ChatMessage, ChatSession, MessageRole, User, UserRole

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Tutor Agent API")

# Add CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for hackathon simplicity
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    auth_session = db.scalar(
        select(AuthSession).where(AuthSession.token == token)
    )
    if not auth_session:
        raise HTTPException(status_code=401, detail="Invalid token")
    if auth_session.expires_at < datetime.now(timezone.utc):
        db.delete(auth_session)
        db.commit()
        raise HTTPException(status_code=401, detail="Token expired")
    return auth_session.user



# -----------------------------
# Schemas (Request / Response)
# -----------------------------


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
    # Hackathon placeholder. Replace with JWT/session token later.
    access_token: str


class CreateSessionRequest(BaseModel):
    title: Optional[str] = None


class SessionOut(BaseModel):
    id: UUID
    user_id: UUID
    title: Optional[str] = None
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


class ChatResponse(BaseModel):
    session_id: UUID
    reply: MessageOut


# -----------------------------
# Endpoints (stubs only)
# -----------------------------


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/register", response_model=AuthResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    existing_user = db.scalar(select(User).where(User.email == req.email))
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    new_user = User(
        email=req.email,
        password=req.password,
        role=req.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = secrets.token_hex(32)
    auth_session = AuthSession(
        token=token,
        user_id=new_user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    db.add(auth_session)
    db.commit()

    return AuthResponse(
        user=UserOut(
            id=new_user.id, email=new_user.email, role=new_user.role, created_at=new_user.created_at
        ),
        access_token=token
    )


@app.post("/auth/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == req.email))
    if not user or user.password != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = secrets.token_hex(32)
    auth_session = AuthSession(
        token=token,
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    db.add(auth_session)
    db.commit()

    return AuthResponse(
        user=UserOut(
            id=user.id, email=user.email, role=user.role, created_at=user.created_at
        ),
        access_token=token
    )


@app.get("/sessions", response_model=ListSessionsResponse)
def list_sessions(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ListSessionsResponse:
    sessions = db.scalars(
        select(ChatSession).where(ChatSession.user_id == user.id).order_by(ChatSession.created_at.desc())
    ).all()
    return ListSessionsResponse(
        sessions=[
            SessionOut(id=s.id, user_id=s.user_id, title=s.title, created_at=s.created_at, updated_at=s.updated_at)
            for s in sessions
        ]
    )


@app.post("/sessions", response_model=SessionOut)
def create_session(req: CreateSessionRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> SessionOut:
    new_session = ChatSession(
        user_id=user.id,
        title=req.title or "New Chat"
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return SessionOut(
        id=new_session.id, user_id=new_session.user_id, title=new_session.title,
        created_at=new_session.created_at, updated_at=new_session.updated_at
    )


@app.get("/sessions/{session_id}", response_model=SessionOut)
def get_session(session_id: UUID = Path(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> SessionOut:
    session = db.scalar(select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user.id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionOut(
        id=session.id, user_id=session.user_id, title=session.title,
        created_at=session.created_at, updated_at=session.updated_at
    )


@app.delete("/sessions/{session_id}")
def delete_session(session_id: UUID = Path(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, str]:
    session = db.scalar(select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user.id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"status": "deleted"}


@app.get("/sessions/{session_id}/messages", response_model=ListMessagesResponse)
def list_messages(session_id: UUID = Path(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ListMessagesResponse:
    session = db.scalar(select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user.id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = db.scalars(
        select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc())
    ).all()
    # Ensure role safely matches enum
    return ListMessagesResponse(
        messages=[
            MessageOut(
                id=m.id, session_id=m.session_id, role=m.role.value, content=m.content,
                meta=m.meta, created_at=m.created_at
            )
            for m in messages
        ]
    )


@app.post("/sessions/{session_id}/chat", response_model=ChatResponse)
def chat(
    session_id: UUID = Path(...),
    req: ChatRequest = ...,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ChatResponse:
    from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

    session = db.scalar(select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user.id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Add user message to DB
    user_msg = ChatMessage(
        session_id=session_id,
        role=MessageRole.USER,
        content=req.message
    )
    db.add(user_msg)
    db.commit()

    # Get recent messages to give as context to agent (we can take last N)
    recent_messages = db.scalars(
        select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc())
    ).all()

    langchain_messages = []
    for m in recent_messages:
        if m.role == MessageRole.USER:
            langchain_messages.append(HumanMessage(content=m.content))
        elif m.role == MessageRole.ASSISTANT:
            langchain_messages.append(AIMessage(content=m.content))
        elif m.role == MessageRole.SYSTEM:
            langchain_messages.append(SystemMessage(content=m.content))
        # tool messages omitted for simple context handling

    # Prepare graph state
    initial_state = {
        "messages": langchain_messages,
        "next_agent": "tutor",
        "topic": "General",
        "course": "General"
    }

    # Run agent
    final_state = agent_graph.invoke(initial_state)

    # Extract assistant reply which is expected to be the last message
    ai_reply_msg = final_state["messages"][-1]
    ai_reply_content = ai_reply_msg.content if hasattr(ai_reply_msg, 'content') else str(ai_reply_msg)

    # Store AI response
    ai_msg = ChatMessage(
        session_id=session_id,
        role=MessageRole.ASSISTANT,
        content=ai_reply_content
    )
    db.add(ai_msg)
    
    # Touch session to update updated_at
    session.title = session.title  # simple trigger for onupdate if needed
    db.commit()
    db.refresh(ai_msg)

    return ChatResponse(
        session_id=session_id,
        reply=MessageOut(
            id=ai_msg.id,
            session_id=ai_msg.session_id,
            role=ai_msg.role.value,
            content=ai_msg.content,
            meta=ai_msg.meta,
            created_at=ai_msg.created_at
        )
    )


# -----------------------------
# Minimal dev-only sample data
# (kept unused; helps type-checking)
# -----------------------------


def _example_user() -> UserOut:
    now = datetime.utcnow()
    return UserOut(id=uuid4(), email="student@example.com", role="student", created_at=now)
