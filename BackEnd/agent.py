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
from tools import python_executor, image_finder, youtube_finder, math_solver


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

def tutor_node(state: State):
    """The educational/tutor sub-agent, specialized in a course/topic."""
    llm = get_llm().bind_tools(tutor_tools)
    course = state.get("course", "General")
    topic = state.get("topic", "General")
    
    system_prompt = TUTOR_NODE_PROMPT.format(course=course, topic=topic)
    
    response = llm.invoke([SystemMessage(content=system_prompt)] + state["messages"])
    return {"messages": [response]}

def should_use_tools(state: State):
    """Check if the last message from the tutor has tool calls."""
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END

def admin_node(state: State):
    """The administrative/technical sub-agent."""
    llm = get_llm()
    course = state.get("course", "General")
    
    system_prompt = ADMIN_NODE_PROMPT.format(course=course)
    
    response = llm.invoke([SystemMessage(content=system_prompt)] + state["messages"])
    return {"messages": [response]}

# --- Graph Construction ---

workflow = StateGraph(State)

# Add nodes to the graph
workflow.add_node("router", router_node)
workflow.add_node("tutor", tutor_node)
workflow.add_node("admin", admin_node)
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
        "admin": "admin"
    }
)

# Tutor can either use tools or finish
workflow.add_conditional_edges("tutor", should_use_tools, {"tools": "tools", END: END})

# After tools run, loop back to tutor so it can read the result
workflow.add_edge("tools", "tutor")

# Admin goes straight to END
workflow.add_edge("admin", END)

# Compile graph
graph = workflow.compile()
