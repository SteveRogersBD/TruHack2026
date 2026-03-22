from __future__ import annotations

import hashlib
import logging
import re
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

from agent import get_llm, graph as agent_graph
from db import get_db
from models import AuthSession, ChatMessage, ChatMode, ChatSession, MessageRole, User, UserRole
from tools import image_finder, python_executor, webpage_processor, youtube_finder, youtube_processor

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
app = FastAPI(title="Tutor Agent API")
logger = logging.getLogger("scholar.server")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"(https://.*-609208975469\.us-central1\.run\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+)",
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
    mode: Optional[ChatMode] = None


class SessionOut(BaseModel):
    id: UUID
    user_id: UUID
    title: Optional[str] = None
    mode: ChatMode
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
    url: Optional[str] = None
    mode: Optional[ChatMode] = None


class ResourceAnalyzeRequest(BaseModel):
    message: str = Field(min_length=1)
    url: str = Field(min_length=1)


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
    mode: ChatMode
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
    mode: ChatMode
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
        mode=s.mode,
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


def _find_resource_context_message(
    db: Session,
    session_id: UUID,
    resource_type: str,
    resource_url: Optional[str] = None,
) -> Optional[ChatMessage]:
    messages = db.scalars(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id, ChatMessage.role == MessageRole.SYSTEM)
        .order_by(ChatMessage.created_at.desc())
    ).all()
    for message in messages:
        meta = message.meta or {}
        if meta.get("resource_type") != resource_type:
            continue
        if resource_url and meta.get("resource_url") != resource_url:
            continue
        return message
    return None


def _save_system_message(
    db: Session,
    session: ChatSession,
    content: str,
    meta: Optional[Dict[str, Any]] = None,
) -> ChatMessage:
    msg = ChatMessage(
        session_id=session.id,
        role=MessageRole.SYSTEM,
        content=content,
        meta=meta,
    )
    db.add(msg)
    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)
    return msg


def _is_youtube_url(url: str) -> bool:
    lowered = url.lower()
    return "youtube.com" in lowered or "youtu.be" in lowered


def _extract_url_from_message(message: str) -> Optional[str]:
    match = re.search(r"https?://\S+", message)
    if not match:
        return None
    return match.group(0).rstrip(").,!?]}")


def _looks_like_coding(message: str, current_code: Optional[str]) -> bool:
    lowered = message.lower()
    coding_markers = (
        "```",
        "function ",
        "const ",
        "let ",
        "var ",
        "class ",
        "def ",
        "import ",
        "console.log",
        "syntax error",
        "stack trace",
        "debug",
        "compile",
        "python",
        "javascript",
        "react",
        "code",
    )
    return bool(current_code) or any(marker in lowered for marker in coding_markers)


def _looks_like_math(message: str) -> bool:
    lowered = message.lower()
    math_markers = (
        "solve ",
        "equation",
        "integrate",
        "derivative",
        "differentiate",
        "simplify",
        "algebra",
        "calculus",
        "geometry",
        "trigonometry",
        "fraction",
    )
    symbol_markers = ("=", "^", "sqrt", "sin(", "cos(", "tan(", "log(", "lim ")
    return any(marker in lowered for marker in math_markers) or any(symbol in lowered for symbol in symbol_markers)


def _extract_media_query(message: str, media_type: str) -> Optional[str]:
    lowered = message.lower().strip()
    patterns = [
        rf"(?:find|show|get|search(?: for)?|look up)\s+(?:me\s+)?(?:an?\s+)?{media_type}\s+(?:of|for|about|on)\s+(.+)",
        rf"(?:find|show|get|search(?: for)?|look up)\s+(.+?)\s+{media_type}",
    ]
    for pattern in patterns:
        match = re.search(pattern, lowered, flags=re.IGNORECASE)
        if match:
            return match.group(1).strip(" ?.!,'\"")
    return None


def _search_media_preview(message: str) -> Optional[StructuredTutorResponse]:
    image_query = _extract_media_query(message, "image")
    if image_query:
        image_url = image_finder(image_query)
        if image_url.startswith("http"):
            return StructuredTutorResponse(
                speech=f"I found an image for {image_query}.",
                emotion="explaining",
                canvas_mode="whiteboard",
                canvas_actions=[
                    CanvasAction(
                        type="image",
                        content=image_url,
                        language=None,
                        step=1,
                        narration=f"Image result for {image_query}",
                    )
                ],
                follow_up_suggestions=[
                    "Explain what is shown",
                    "Find another image",
                    "Summarize the topic",
                ],
            )

    video_query = _extract_media_query(message, "video")
    if video_query:
        video_url = youtube_finder(video_query)
        if video_url.startswith("http"):
            return StructuredTutorResponse(
                speech=f"I found a video for {video_query}.",
                emotion="explaining",
                canvas_mode="whiteboard",
                canvas_actions=[
                    CanvasAction(
                        type="video",
                        content=video_url,
                        language=None,
                        step=1,
                        narration=f"Video result for {video_query}",
                    )
                ],
                follow_up_suggestions=[
                    "Summarize this video",
                    "Find another video",
                    "Explain the topic first",
                ],
            )

    return None


def _extract_code_from_structured(structured_data: dict | None) -> Optional[tuple[str, str]]:
    if not structured_data:
        return None
    for action in structured_data.get("canvas_actions", []):
        if action.get("type") == "code" and action.get("content"):
            return action["content"], action.get("language") or "python"
    return None


def _normalize_structured_response(
    *,
    mode: ChatMode,
    message: str,
    speech: str,
    structured_data: dict | None,
) -> dict | None:
    data = dict(structured_data or {})
    data.setdefault("speech", speech)
    data.setdefault("emotion", "explaining")
    data.setdefault("follow_up_suggestions", [])
    actions = list(data.get("canvas_actions") or [])

    if mode == ChatMode.CODING:
        data["canvas_mode"] = "split" if actions else "code"
    elif mode == ChatMode.MATH:
        data["canvas_mode"] = "whiteboard"
    else:
        data.setdefault("canvas_mode", "whiteboard")

    normalized_actions = []
    for idx, action in enumerate(actions, start=1):
        if not isinstance(action, dict):
            continue
        item = dict(action)
        item["step"] = int(item.get("step") or idx)
        item["narration"] = item.get("narration") or f"Step {item['step']}"
        normalized_actions.append(item)

    data["canvas_actions"] = normalized_actions
    return data




def _resolve_chat_mode(
    message: str,
    attached_url: Optional[str],
    requested_mode: Optional[ChatMode],
    session: ChatSession,
) -> ChatMode:
    if requested_mode:
        return requested_mode
    if attached_url:
        return ChatMode.YOUTUBE if _is_youtube_url(attached_url) else ChatMode.WEBPAGE
    extracted_url = _extract_url_from_message(message)
    if extracted_url:
        return ChatMode.YOUTUBE if _is_youtube_url(extracted_url) else ChatMode.WEBPAGE
    if _looks_like_coding(message, session.current_code):
        return ChatMode.CODING
    if _looks_like_math(message):
        return ChatMode.MATH
    return session.mode if session.mode else ChatMode.GENERAL


def _ensure_youtube_context(
    db: Session,
    session: ChatSession,
    url: str,
) -> ChatMessage:
    existing = _find_resource_context_message(db, session.id, "youtube", url)
    if existing:
        logger.info("youtube.context.reuse session_id=%s url=%s", session.id, url)
        print(f"youtube.context.reuse session_id={session.id} url={url}")
        return existing

    logger.info("youtube.ingest.start session_id=%s url=%s", session.id, url)
    print(f"youtube.ingest.start session_id={session.id} url={url}")
    processed = youtube_processor(url)
    context_body = (
        "You are answering questions about an attached YouTube video.\n"
        "Use this saved video context as the primary source for follow-up answers.\n\n"
        f"{processed['context']}"
    )
    meta = {
        "resource_type": "youtube",
        "resource_url": processed.get("url", url),
        "resource_title": processed.get("title"),
        "resource_channel": processed.get("channel"),
        "resource_duration": processed.get("duration"),
        "transcript_source": processed.get("transcript_source"),
        "ingest_ok": processed.get("ok", False),
    }
    saved = _save_system_message(db, session, context_body, meta)
    logger.info(
        "youtube.context.saved session_id=%s url=%s transcript_source=%s ok=%s",
        session.id,
        meta["resource_url"],
        meta["transcript_source"],
        meta["ingest_ok"],
    )
    print(
        f"youtube.context.saved session_id={session.id} "
        f"url={meta['resource_url']} transcript_source={meta['transcript_source']} ok={meta['ingest_ok']}"
    )
    return saved


def _run_tutor(
    messages: list,
    mode: ChatMode,
    resource_url: Optional[str],
    learning_goal: str,
    current_code: str,
    last_execution: str,
) -> tuple[str, dict | None]:
    """Invoke the agent graph and return (speech_content, structured_data)."""
    final_state = agent_graph.invoke({
        "messages": messages,
        "next_agent": "tutor",
        "mode": mode.value,
        "resource_url": resource_url or "",
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


def _svg_card(title: str, subtitle: str) -> str:
    safe_title = (title or "Resource").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    safe_subtitle = (subtitle or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return (
        "<svg xmlns='http://www.w3.org/2000/svg' width='960' height='240' viewBox='0 0 960 240'>"
        "<defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>"
        "<stop offset='0%' stop-color='#0f172a'/><stop offset='100%' stop-color='#1d4ed8'/>"
        "</linearGradient></defs>"
        "<rect width='960' height='240' rx='24' fill='url(#g)'/>"
        "<rect x='28' y='28' width='904' height='184' rx='18' fill='rgba(255,255,255,0.06)' stroke='rgba(255,255,255,0.18)'/>"
        f"<text x='56' y='104' fill='white' font-size='30' font-family='Arial, sans-serif' font-weight='700'>{safe_title}</text>"
        f"<text x='56' y='148' fill='#bfdbfe' font-size='18' font-family='Arial, sans-serif'>{safe_subtitle}</text>"
        "</svg>"
    )


def _build_resource_structured(
    *,
    answer: str,
    resource_type: str,
    resource_url: str,
    title: str,
) -> StructuredTutorResponse:
    if resource_type == "youtube":
        canvas_actions = [
            CanvasAction(
                type="video",
                content=resource_url,
                language=None,
                step=1,
                narration="Play the attached YouTube video",
            )
        ]
        suggestions = [
            "Give me a short summary",
            "What are the key points?",
            "Explain the most important idea",
        ]
    else:
        canvas_actions = [
            CanvasAction(
                type="draw",
                content=_svg_card(title or "Webpage", resource_url),
                language=None,
                step=1,
                narration="Webpage overview",
            )
        ]
        suggestions = [
            "Summarize this page",
            "What are the important details?",
            "Explain this page simply",
        ]

    return StructuredTutorResponse(
        speech=answer,
        emotion="explaining",
        canvas_mode="whiteboard",
        canvas_actions=canvas_actions,
        follow_up_suggestions=suggestions,
    )


def _answer_resource_question(resource_type: str, resource_title: str, resource_url: str, context: str, question: str) -> str:
    llm = get_llm()
    prompt = (
        f"You are helping a user understand a {resource_type} resource.\n"
        f"Resource title: {resource_title}\n"
        f"Resource URL: {resource_url}\n\n"
        "Answer the user's question using the provided resource context. "
        "Be concise, specific, and say when context is limited.\n\n"
        f"User question:\n{question}\n\n"
        f"Resource context:\n{context}"
    )
    try:
        response = llm.invoke(prompt)
        content = response.content if hasattr(response, "content") else str(response)
        return str(content).strip() or "I couldn't produce an answer from the resource."
    except Exception as exc:
        logger.exception("resource.answer.error type=%s url=%s", resource_type, resource_url)
        print(f"resource.answer.error type={resource_type} url={resource_url} error={exc}")
        fallback = context[:1200] if context else "No resource context was available."
        return f"I couldn't fully analyze the {resource_type}. Here is the best available context:\n\n{fallback}"


def _save_resource_messages(
    db: Session,
    session: ChatSession,
    user_content: str,
    assistant_content: str,
    assistant_meta: dict,
) -> MessageOut:
    user_msg = ChatMessage(session_id=session.id, role=MessageRole.USER, content=user_content)
    db.add(user_msg)
    db.commit()

    ai_msg = _save_ai_message(db, session, assistant_content, assistant_meta)
    return _msg_to_out(ai_msg)


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
    s = ChatSession(
        user_id=user.id,
        title=req.title or "New Chat",
        mode=req.mode or ChatMode.GENERAL,
        learning_goal=req.learning_goal,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    logger.info("session.created session_id=%s user_id=%s title=%s", s.id, user.id, s.title)
    print(f"session.created session_id={s.id} user_id={user.id} title={s.title!r}")
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
    session.mode = ChatMode.CODING
    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"saved": True, "timestamp": session.updated_at.isoformat(), "mode": session.mode.value}


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
    session.mode = ChatMode.CODING
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
        mode=session.mode,
        resource_url=None,
        learning_goal=session.learning_goal or "Not specified",
        current_code=req.code,
        last_execution=last_execution_str,
    )
    structured_data = _normalize_structured_response(
        mode=session.mode,
        message=exec_summary,
        speech=content,
        structured_data=structured_data,
    )

    # Save the AI response as a message
    user_exec_msg = ChatMessage(session_id=session_id, role=MessageRole.USER, content=exec_summary)
    db.add(user_exec_msg)
    ai_msg = _save_ai_message(db, session, content, structured_data)

    return ExecuteResponse(
        session_id=session_id,
        mode=session.mode,
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


# --- Separate resource flows ---

@app.post("/sessions/{session_id}/youtube/analyze", response_model=ChatResponse)
def analyze_youtube(
    req: ResourceAnalyzeRequest,
    session_id: UUID = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatResponse:
    session = _get_session_or_404(session_id, user.id, db)
    session.mode = ChatMode.YOUTUBE
    print(f"youtube.endpoint.start session_id={session.id} url={req.url}")
    processed = youtube_processor(req.url)
    answer = _answer_resource_question(
        "youtube video",
        processed.get("title", "YouTube Video"),
        processed.get("url", req.url),
        processed.get("context", ""),
        req.message,
    )
    structured = _build_resource_structured(
        answer=answer,
        resource_type="youtube",
        resource_url=processed.get("url", req.url),
        title=processed.get("title", "YouTube Video"),
    )
    reply = _save_resource_messages(
        db,
        session,
        user_content=f"{req.message}\n\nAttached URL: {req.url}",
        assistant_content=answer,
        assistant_meta=structured.model_dump(),
    )
    return ChatResponse(
        session_id=session_id,
        mode=ChatMode.YOUTUBE,
        reply=reply,
        structured=structured,
    )


@app.post("/sessions/{session_id}/webpage/analyze", response_model=ChatResponse)
def analyze_webpage(
    req: ResourceAnalyzeRequest,
    session_id: UUID = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatResponse:
    session = _get_session_or_404(session_id, user.id, db)
    session.mode = ChatMode.WEBPAGE
    print(f"webpage.endpoint.start session_id={session.id} url={req.url}")
    processed = webpage_processor(req.url)
    answer = _answer_resource_question(
        "webpage",
        processed.get("title", "Webpage"),
        processed.get("url", req.url),
        processed.get("context", ""),
        req.message,
    )
    structured = _build_resource_structured(
        answer=answer,
        resource_type="webpage",
        resource_url=processed.get("url", req.url),
        title=processed.get("title", "Webpage"),
    )
    reply = _save_resource_messages(
        db,
        session,
        user_content=f"{req.message}\n\nAttached URL: {req.url}",
        assistant_content=answer,
        assistant_meta=structured.model_dump(),
    )
    return ChatResponse(
        session_id=session_id,
        mode=ChatMode.WEBPAGE,
        reply=reply,
        structured=structured,
    )


# --- Chat ---

@app.post("/sessions/{session_id}/chat", response_model=ChatResponse)
def chat(
    req: ChatRequest,
    session_id: UUID = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatResponse:
    session = _get_session_or_404(session_id, user.id, db)

    resolved_mode = _resolve_chat_mode(req.message, req.url, req.mode, session)
    session.mode = resolved_mode
    enhanced_message = req.message
    url_to_process = req.url

    logger.info(
        "chat.received session_id=%s mode=%s has_url=%s",
        session.id,
        resolved_mode.value,
        bool(req.url),
    )
    if not url_to_process:
        url_to_process = _extract_url_from_message(req.message)

    print(
        f"chat.received session_id={session.id} mode={resolved_mode.value} "
        f"req_url={req.url!r} extracted_url={url_to_process!r}"
    )

    if url_to_process and resolved_mode != ChatMode.YOUTUBE:
        enhanced_message += f"\n\n[Attached Resource Context]:\nAttached webpage URL: {url_to_process}"

    media_preview = _search_media_preview(req.message)

    user_msg = ChatMessage(session_id=session_id, role=MessageRole.USER, content=enhanced_message)
    db.add(user_msg)
    db.commit()

    if media_preview:
        ai_msg = _save_ai_message(db, session, media_preview.speech, media_preview.model_dump())
        return ChatResponse(
            session_id=session_id,
            mode=resolved_mode,
            reply=_msg_to_out(ai_msg),
            structured=media_preview,
        )

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
        mode=resolved_mode,
        resource_url=url_to_process,
        learning_goal=session.learning_goal or "Not specified",
        current_code=session.current_code or "No code yet",
        last_execution=last_execution_str,
    )
    structured_data = _normalize_structured_response(
        mode=resolved_mode,
        message=req.message,
        speech=content,
        structured_data=structured_data,
    )

    extracted_code = _extract_code_from_structured(structured_data)
    if extracted_code:
        code_content, _language = extracted_code
        session.current_code = code_content
        if resolved_mode == ChatMode.CODING:
            session.mode = ChatMode.CODING
        db.commit()

    ai_msg = _save_ai_message(db, session, content, structured_data)

    return ChatResponse(
        session_id=session_id,
        mode=resolved_mode,
        reply=_msg_to_out(ai_msg),
        structured=_build_structured(structured_data),
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8001, reload=True)
