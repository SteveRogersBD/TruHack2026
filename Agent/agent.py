import os
import operator
import json
from typing import TypedDict, List, Annotated

from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import SystemMessage, BaseMessage
from langchain_core.tools import StructuredTool
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from prompts import *
from tools import (
    python_executor,
    image_finder,
    youtube_finder,
    math_solver,
    web_search_tool,
    rag_search_tool,
    quiz_gen_tool,
    study_plan_tool,
    integrity_check_tool,
    diagram_tool,
    export_tool,
    progress_db_tool,
    units_checker_tool,
)


# Load environment variables
load_dotenv()

# Map OPEN_API_KEY -> OPENAI_API_KEY for LangChain compatibility
api_key = os.getenv("OPEN_API_KEY")
if api_key:
    os.environ["OPENAI_API_KEY"] = api_key

# Models — NVIDIA NIM is OpenAI-compatible; swap base_url to use it
ROUTER_MODEL = "gpt-4o-mini"
BEST_MODEL = "gpt-4o"
BEST_GEMINI_MODEL = "gemini-3-flash-preview"


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


# --- Tools Setup ---

tutor_tools = [
    StructuredTool.from_function(python_executor, name="python_executor", description="Run Python code and return output."),
    StructuredTool.from_function(image_finder, name="image_finder", description="Find a relevant image using Pexels."),
    StructuredTool.from_function(youtube_finder, name="youtube_finder", description="Find a relevant YouTube video."),
    StructuredTool.from_function(math_solver, name="math_solver", description="Solve math using SymPy. Returns LaTeX."),
    StructuredTool.from_function(web_search_tool, name="web_search", description="Search the web for info."),
    StructuredTool.from_function(rag_search_tool, name="rag_search", description="Search course materials."),
    StructuredTool.from_function(quiz_gen_tool, name="quiz_gen", description="Generate practice quizzes."),
    StructuredTool.from_function(study_plan_tool, name="study_plan", description="Generate study plans."),
    StructuredTool.from_function(integrity_check_tool, name="integrity_check", description="Check academic integrity."),
    StructuredTool.from_function(diagram_tool, name="diagram_gen", description="Generate diagrams."),
    StructuredTool.from_function(export_tool, name="export_tool", description="Export sessions."),
    StructuredTool.from_function(progress_db_tool, name="progress_db", description="Interact with learner progress DB."),
    StructuredTool.from_function(units_checker_tool, name="units_checker", description="Check unit consistency."),
]

tool_node = ToolNode(tutor_tools)


# ---------------------------------------------------------------------------
# Fallback structured response (used when JSON parsing fails)
# ---------------------------------------------------------------------------

_TUTOR_FALLBACK = {
    "speech": "I'm here to help! Could you tell me more about what you'd like to learn?",
    "emotion": "idle",
    "canvas_mode": "whiteboard",
    "canvas_actions": [
        {
            "type": "draw",
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
    # Bind tools to the LLM
    llm = llm.bind_tools(tutor_tools)

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
        if getattr(response, "tool_calls", None):
            structured = _TUTOR_FALLBACK
        else:
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


def agent_node_factory(prompt_template, allowed_tools=None):
    """Creates a node for a specific agent type."""
    def node(state: State):
        llm = get_llm()
        if allowed_tools:
            llm = llm.bind_tools(allowed_tools)
        
        course = state.get("course", "General")
        topic = state.get("topic", "General")
        
        try:
            system_prompt = prompt_template.format(course=course, topic=topic)
        except KeyError:
            system_prompt = str(prompt_template)
            
        response = llm.invoke([SystemMessage(content=system_prompt)] + state["messages"])
        return {"messages": [response]}
    return node


# Fallback assignments in case the prompt variables haven't been created yet
try:
    web_search_node = agent_node_factory(WEB_SEARCH_NODE_PROMPT, tutor_tools)
    rag_search_node = agent_node_factory(RAG_SEARCH_NODE_PROMPT, tutor_tools)
    quiz_gen_node = agent_node_factory(QUIZ_GEN_NODE_PROMPT, tutor_tools)
    study_plan_node = agent_node_factory(STUDY_PLAN_NODE_PROMPT, tutor_tools)
    integrity_node = agent_node_factory(INTEGRITY_NODE_PROMPT, tutor_tools)
    diagrammer_node = agent_node_factory(DIAGRAMMER_NODE_PROMPT, tutor_tools)
    exporter_node = agent_node_factory(EXPORTER_NODE_PROMPT, tutor_tools)
    progress_db_node = agent_node_factory(PROGRESS_DB_NODE_PROMPT, tutor_tools)
    formulator_node = agent_node_factory(FORMULATOR_NODE_PROMPT, tutor_tools)
except NameError:
    web_search_node = None


def should_use_tools(state: State):
    """Check if the last message has tool calls."""
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END


# ---------------------------------------------------------------------------
# Graph construction
# ---------------------------------------------------------------------------

def _route_to_agent(state: State) -> str:
    return state["next_agent"]


workflow = StateGraph(State)
workflow.add_node("router", router_node)
workflow.add_node("tutor", tutor_node)
workflow.add_node("admin", admin_node)

agents = [
    ("web_search", web_search_node),
    ("rag_search", rag_search_node),
    ("quiz_gen", quiz_gen_node),
    ("study_plan", study_plan_node),
    ("integrity", integrity_node),
    ("diagrammer", diagrammer_node),
    ("exporter", exporter_node),
    ("progress_db", progress_db_node),
    ("formulator", formulator_node),
]

route_mapping = {
    "tutor": "tutor",
    "admin": "admin",
}

for name, node_func in agents:
    if node_func:
        workflow.add_node(name, node_func)
        route_mapping[name] = name

workflow.add_node("tools", tool_node)
workflow.set_entry_point("router")
workflow.add_conditional_edges("router", _route_to_agent, route_mapping)
workflow.add_conditional_edges("tutor", should_use_tools, {"tools": "tools", END: END})

for name, node_func in agents:
    if node_func:
        workflow.add_conditional_edges(name, should_use_tools, {"tools": "tools", END: END})

workflow.add_edge("tools", "tutor") # Loop back to tutor after tool invocation
workflow.add_edge("admin", END)

graph = workflow.compile()
