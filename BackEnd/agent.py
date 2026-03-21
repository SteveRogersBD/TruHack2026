import os
import operator
import json
from typing import Literal, TypedDict, List, Annotated

from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import SystemMessage, HumanMessage, BaseMessage
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

# Map the OPEN_API_KEY from .env to the standard key for LangChain
api_key = os.getenv("OPEN_API_KEY")
if api_key:
    os.environ["OPENAI_API_KEY"] = api_key

# Models
ROUTER_MODEL = "gpt-4o-mini"
BEST_GPT_MODEL = "gpt-5.4"
BEST_GEMINI_MODEL = "gemini-3-flash-preview"

# State Definition
class State(TypedDict):
    # operator.add ensures new messages are appended to the list rather than overwriting
    messages: Annotated[List[BaseMessage], operator.add]
    next_agent: str
    topic: str #particular topic of a course
    course: str #particular course of a student



def get_llm(model=BEST_GPT_MODEL):
    """Select LLM provider based on available environment variables."""
    if os.getenv("OPENAI_API_KEY"):
        return ChatOpenAI(model=model)
    elif os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"):
        return ChatGoogleGenerativeAI(model=BEST_GEMINI_MODEL)
    raise ValueError("No API keys found for OpenAI or Gemini. Please check your .env file.")

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


# --- Graph Nodes ---

def router_node(state: State):
    """
    Orchestrator node: Extracts course/topic and decides which sub-agent should handle the request.
    Uses GPT-4o mini for extraction and routing.
    """
    llm = get_llm(model=ROUTER_MODEL)
    
    # Prompt for extraction and routing logic
    prompt = ROUTER_NODE_PROMPT
    
    # Using the last few messages for context
    messages = [SystemMessage(content=prompt)] + state["messages"]
    response = llm.invoke(messages)
    
    try:
        # Attempt to parse JSON from the response
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        data = json.loads(content)
        
        return {
            "course": data.get("course", "General"),
            "topic": data.get("topic", "General"),
            "next_agent": data.get("next_agent", "tutor")
        }
    except Exception as e:
        print(f"Error parsing orchestrator response: {e}")
        # Default fallback
        return {
            "course": "General",
            "topic": "General",
            "next_agent": "tutor"
        }

def agent_node_factory(prompt_template, allowed_tools=None):
    """Creates a node for a specific agent type."""
    def node(state: State):
        llm = get_llm()
        if allowed_tools:
            llm = llm.bind_tools(allowed_tools)
        
        course = state.get("course", "General")
        topic = state.get("topic", "General")
        
        system_prompt = prompt_template.format(course=course, topic=topic)
        
        response = llm.invoke([SystemMessage(content=system_prompt)] + state["messages"])
        return {"messages": [response]}
    return node

tutor_node = agent_node_factory(TUTOR_NODE_PROMPT, tutor_tools)
admin_node = agent_node_factory(ADMIN_NODE_PROMPT)
web_search_node = agent_node_factory(WEB_SEARCH_NODE_PROMPT, tutor_tools)
rag_search_node = agent_node_factory(RAG_SEARCH_NODE_PROMPT, tutor_tools)
quiz_gen_node = agent_node_factory(QUIZ_GEN_NODE_PROMPT, tutor_tools)
study_plan_node = agent_node_factory(STUDY_PLAN_NODE_PROMPT, tutor_tools)
integrity_node = agent_node_factory(INTEGRITY_NODE_PROMPT, tutor_tools)
diagrammer_node = agent_node_factory(DIAGRAMMER_NODE_PROMPT, tutor_tools)
exporter_node = agent_node_factory(EXPORTER_NODE_PROMPT, tutor_tools)
progress_db_node = agent_node_factory(PROGRESS_DB_NODE_PROMPT, tutor_tools)
formulator_node = agent_node_factory(FORMULATOR_NODE_PROMPT, tutor_tools)

def should_use_tools(state: State):
    """Check if the last message from the tutor has tool calls."""
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END

# --- Graph Construction ---

workflow = StateGraph(State)

# Add nodes to the graph
workflow.add_node("router", router_node)
workflow.add_node("tutor", tutor_node)
workflow.add_node("admin", admin_node)
workflow.add_node("web_search", web_search_node)
workflow.add_node("rag_search", rag_search_node)
workflow.add_node("quiz_gen", quiz_gen_node)
workflow.add_node("study_plan", study_plan_node)
workflow.add_node("integrity", integrity_node)
workflow.add_node("diagrammer", diagrammer_node)
workflow.add_node("exporter", exporter_node)
workflow.add_node("progress_db", progress_db_node)
workflow.add_node("formulator", formulator_node)
workflow.add_node("tools", tool_node)

# Entry point starts at the router
workflow.set_entry_point("router")

# Routing logic based on state['next_agent']
def route_to_agent(state: State):
    return state["next_agent"]

# Router chooses path to agent
workflow.add_conditional_edges(
    "router",
    route_to_agent,
    {
        "tutor": "tutor",
        "admin": "admin",
        "web_search": "web_search",
        "rag_search": "rag_search",
        "quiz_gen": "quiz_gen",
        "study_plan": "study_plan",
        "integrity": "integrity",
        "diagrammer": "diagrammer",
        "exporter": "exporter",
        "progress_db": "progress_db",
        "formulator": "formulator",
    }
)

# Agents can either use tools or finish
for node in ["tutor", "web_search", "rag_search", "quiz_gen", "study_plan", "integrity", "diagrammer", "exporter", "progress_db", "formulator"]:
    workflow.add_conditional_edges(node, should_use_tools, {"tools": "tools", END: END})

# After tools run, loop back to the *router* (or back to the node that called it)
# Actually, for simplicity in LangGraph, we can loop back to the router to decide the next step
# or bind tools back to all nodes. 
# Here we loop back to 'tutor' as a default if we don't track the caller, but better is to go back to the caller.
# For now, let's keep the tool loop simple.
workflow.add_edge("tools", "tutor") # Fallback to tutor for now, or we could handle this better.

# Admin goes straight to END
workflow.add_edge("admin", END)

# Compile graph
graph = workflow.compile()
