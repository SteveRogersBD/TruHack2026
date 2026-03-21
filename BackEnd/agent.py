import os
import operator
import json
from typing import TypedDict, List, Annotated

from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, BaseMessage
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from prompts import ROUTER_NODE_PROMPT, TUTOR_NODE_PROMPT, ADMIN_NODE_PROMPT


# Load environment variables
load_dotenv()

# Map OPEN_API_KEY -> OPENAI_API_KEY for LangChain compatibility
api_key = os.getenv("OPEN_API_KEY")
if api_key:
    os.environ["OPENAI_API_KEY"] = api_key

# Models — NVIDIA NIM is OpenAI-compatible; swap base_url to use it
ROUTER_MODEL = "gpt-4o-mini"
BEST_MODEL = "gpt-4o"
BEST_GEMINI_MODEL = "gemini-1.5-flash"


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

class State(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]
    next_agent: str
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


# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------

def router_node(state: State) -> dict:
    """Classifies the query and routes to tutor or admin."""
    llm = get_llm(model=ROUTER_MODEL)
    messages = [SystemMessage(content=ROUTER_NODE_PROMPT)] + state["messages"]
    response = llm.invoke(messages)

    try:
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        data = json.loads(content)
        return {
            "course": data.get("course", "General"),
            "topic": data.get("topic", "General"),
            "next_agent": data.get("next_agent", "tutor"),
        }
    except Exception as e:
        print(f"router_node: failed to parse response: {e}")
        return {"course": "General", "topic": "General", "next_agent": "tutor"}


def tutor_node(state: State) -> dict:
    """Socratic tutor — returns structured JSON per the d.md schema."""
    llm = get_llm()

    system_prompt = TUTOR_NODE_PROMPT.format(
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
workflow.add_node("tutor", tutor_node)
workflow.add_node("admin", admin_node)

workflow.set_entry_point("router")
workflow.add_conditional_edges("router", _route_to_agent, {"tutor": "tutor", "admin": "admin"})
workflow.add_edge("tutor", END)
workflow.add_edge("admin", END)

graph = workflow.compile()
