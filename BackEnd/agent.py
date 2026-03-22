import os
import operator
import json
import re
from typing import TypedDict, List, Annotated

from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, BaseMessage
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from prompts import TUTOR_NODE_PROMPT, ADMIN_NODE_PROMPT
from tools import youtube_processor


# Load environment variables
load_dotenv()

# Map OPEN_API_KEY -> OPENAI_API_KEY for LangChain compatibility
api_key = os.getenv("OPEN_API_KEY")
if api_key:
    os.environ["OPENAI_API_KEY"] = api_key

# Models — NVIDIA NIM is OpenAI-compatible; swap base_url to use it
BEST_MODEL = "gpt-4o"
BEST_GEMINI_MODEL = "gemini-1.5-flash"
YOUTUBE_CONTEXT_PREFIX = "[YOUTUBE_CONTEXT]"


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

class State(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]
    next_agent: str
    mode: str
    resource_url: str
    topic: str           # specific topic within the course
    course: str          # broad subject / course name
    learning_goal: str   # user's stated learning objective for this session
    current_code: str    # current code in the IDE
    last_execution: str  # last code execution result (human-readable summary)


# ---------------------------------------------------------------------------
# LLM selector
# ---------------------------------------------------------------------------

def get_llm(model: str = BEST_MODEL) -> ChatOpenAI | ChatGoogleGenerativeAI:
    nvidia_key = os.getenv("NVIDIA_API_KEY")
    if nvidia_key:
        return ChatOpenAI(
            model=model,
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=nvidia_key,
        )
    if os.getenv("OPENAI_API_KEY"):
        return ChatOpenAI(model=model)
    if os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"):
        return ChatGoogleGenerativeAI(model=BEST_GEMINI_MODEL)
    raise ValueError("No API key found. Set NVIDIA_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY.")


# ---------------------------------------------------------------------------
# Fallback structured response (used when JSON parsing fails)
# ---------------------------------------------------------------------------

_TUTOR_FALLBACK = {
    "speech": "I'm here to help! Could you tell me more about what you'd like to learn?",
    "emotion": "idle",
    "canvas_mode": "whiteboard",
    "canvas_actions": [
        {
            "type": "diagram",
            "content": "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='100'><rect width='400' height='100' fill='#f8f9fa' rx='8'/><text x='200' y='55' text-anchor='middle' font-family='sans-serif' font-size='18' fill='#495057'>Ask me anything to get started!</text></svg>",
            "step": 1,
            "narration": "Ready to learn",
        }
    ],
    "follow_up_suggestions": [
        "Explain a concept to me",
        "Help me debug my code",
        "Give me a practice problem",
    ],
}


def _parse_tutor_json(content: str) -> dict:
    text = content.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    return json.loads(text)


def _extract_text_from_last_user_message(messages: List[BaseMessage]) -> str:
    for message in reversed(messages):
        if getattr(message, "type", "") == "human":
            return str(getattr(message, "content", "") or "")
    return ""


def _extract_url_from_text(text: str) -> str:
    match = re.search(r"https?://\S+", text)
    if not match:
        return ""
    return match.group(0).rstrip(").,!?]}")


def _is_youtube_url(url: str) -> bool:
    lowered = url.lower()
    return "youtube.com" in lowered or "youtu.be" in lowered


def _looks_like_admin(text: str) -> bool:
    lowered = text.lower()
    admin_markers = (
        "login",
        "sign in",
        "api key",
        "token",
        "environment variable",
        "env var",
        "server error",
        "not working",
        "setup",
        "install",
        "deployment",
        "database",
        "migration",
    )
    return any(marker in lowered for marker in admin_markers)


def _looks_like_coding(text: str, current_code: str) -> bool:
    lowered = text.lower()
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


def _looks_like_math(text: str) -> bool:
    lowered = text.lower()
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


def _existing_youtube_context(messages: List[BaseMessage], resource_url: str) -> bool:
    for message in messages:
        if getattr(message, "type", "") != "system":
            continue
        content = str(getattr(message, "content", "") or "")
        if YOUTUBE_CONTEXT_PREFIX not in content:
            continue
        if not resource_url or f"URL: {resource_url}" in content:
            return True
    return False


# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------

def router_node(state: State) -> dict:
    """Deterministically choose mode and the next graph branch."""
    message_text = _extract_text_from_last_user_message(state["messages"])
    resource_url = state.get("resource_url") or _extract_url_from_text(message_text)
    current_mode = state.get("mode", "general")

    if resource_url:
        mode = "youtube" if _is_youtube_url(resource_url) else "webpage"
    elif _looks_like_admin(message_text):
        mode = current_mode
    elif _looks_like_coding(message_text, state.get("current_code", "")):
        mode = "coding"
    elif _looks_like_math(message_text):
        mode = "math"
    else:
        mode = current_mode or "general"

    if _looks_like_admin(message_text):
        next_agent = "admin"
    elif mode == "youtube" and resource_url and not _existing_youtube_context(state["messages"], resource_url):
        next_agent = "youtube_ingest"
    else:
        next_agent = "tutor"

    print(
        f"router_node mode={mode} next_agent={next_agent} resource_url={resource_url!r}"
    )
    return {
        "course": "General",
        "topic": "General",
        "mode": mode,
        "resource_url": resource_url,
        "next_agent": next_agent,
    }


def youtube_ingest_node(state: State) -> dict:
    """Ingest a YouTube video once and add remembered context to the graph state."""
    resource_url = state.get("resource_url", "")
    if not resource_url:
        print("youtube_ingest_node skipped: missing resource_url")
        return {"next_agent": "tutor"}

    print(f"youtube_ingest_node start url={resource_url}")
    processed = youtube_processor(resource_url)
    context_message = (
        f"{YOUTUBE_CONTEXT_PREFIX}\n"
        f"URL: {processed.get('url', resource_url)}\n"
        "Use this remembered YouTube context as the primary source for follow-up answers.\n\n"
        f"{processed.get('context', '')}"
    )
    system_message = SystemMessage(content=context_message)
    print(
        f"youtube_ingest_node saved url={processed.get('url', resource_url)} "
        f"source={processed.get('transcript_source')}"
    )
    return {"messages": [system_message], "next_agent": "tutor"}


def tutor_node(state: State) -> dict:
    """Socratic tutor — returns structured JSON per the d.md schema."""
    llm = get_llm()

    system_prompt = TUTOR_NODE_PROMPT.format(
        mode=state.get("mode", "general"),
        course=state.get("course", "General"),
        topic=state.get("topic", "General"),
        learning_goal=state.get("learning_goal", "Not specified"),
        current_code=state.get("current_code", "No code yet"),
        last_execution=state.get("last_execution", "No executions yet"),
    )

    response = llm.invoke([SystemMessage(content=system_prompt)] + state["messages"])

    try:
        structured = _parse_tutor_json(response.content)
    except Exception as e:
        print(f"tutor_node: failed to parse structured response: {e}")
        structured = _TUTOR_FALLBACK

    response.additional_kwargs["structured"] = structured
    response.content = structured.get("speech", response.content)

    return {"messages": [response]}


def admin_node(state: State) -> dict:
    """Technical support agent — free-text responses."""
    llm = get_llm()
    system_prompt = ADMIN_NODE_PROMPT.format(course=state.get("course", "General"))
    response = llm.invoke([SystemMessage(content=system_prompt)] + state["messages"])
    return {"messages": [response]}


# ---------------------------------------------------------------------------
# Graph construction
# ---------------------------------------------------------------------------

def _route_to_agent(state: State) -> str:
    return state["next_agent"]


workflow = StateGraph(State)
workflow.add_node("router", router_node)
workflow.add_node("youtube_ingest", youtube_ingest_node)
workflow.add_node("tutor", tutor_node)
workflow.add_node("admin", admin_node)

workflow.set_entry_point("router")
workflow.add_conditional_edges(
    "router",
    _route_to_agent,
    {"tutor": "tutor", "admin": "admin", "youtube_ingest": "youtube_ingest"},
)
workflow.add_edge("youtube_ingest", "tutor")
workflow.add_edge("tutor", END)
workflow.add_edge("admin", END)

graph = workflow.compile()
