import os
import operator
import json
from typing import Literal, TypedDict, List, Annotated

from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, HumanMessage, BaseMessage
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from prompts import *

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
    llm = get_llm()
    course = state.get("course", "General")
    topic = state.get("topic", "General")
    
    system_prompt = TUTOR_NODE_PROMPT.format(course=course, topic=topic)
    
    response = llm.invoke([SystemMessage(content=system_prompt)] + state["messages"])
    return {"messages": [response]}

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

# Both agents end at END
workflow.add_edge("tutor", END)
workflow.add_edge("admin", END)

# Compile graph
graph = workflow.compile()

