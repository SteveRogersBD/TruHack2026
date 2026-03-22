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
from prompts import TUTOR_NODE_PROMPT
from tools import (
    python_executor,
    math_solver,
    image_finder,
    youtube_finder,
    web_search_tool as serp_scholar_search,
    get_youtube_transcript as youtube_processor,
    scrape_webpage as webpage_processor,
)
from langgraph.prebuilt import ToolNode

# Load environment variables
load_dotenv()

# Map OPEN_API_KEY -> OPENAI_API_KEY for LangChain compatibility
api_key = os.getenv("OPEN_API_KEY")
if api_key:
    os.environ["OPENAI_API_KEY"] = api_key

BEST_MODEL = "gpt-4o" # or "gpt-4o-latest"
BEST_GEMINI_MODEL = "gemini-1.5-flash"

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

class State(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]
    topic: str
    course: str
    learning_goal: str
    current_code: str
    last_execution: str

# ---------------------------------------------------------------------------
# LLM
# ---------------------------------------------------------------------------

def get_llm() -> ChatOpenAI | ChatGoogleGenerativeAI:
    nvidia_key = os.getenv("NVIDIA_API_KEY")
    if nvidia_key:
        return ChatOpenAI(
            model=BEST_MODEL,
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=nvidia_key,
            temperature=0,
        )
    if os.getenv("OPENAI_API_KEY"):
        # Enforce JSON mode for OpenAI
        return ChatOpenAI(model=BEST_MODEL, temperature=0)
    if os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"):
        return ChatGoogleGenerativeAI(model=BEST_GEMINI_MODEL, temperature=0)
    raise ValueError("No API key found. Set NVIDIA_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY.")

# ---------------------------------------------------------------------------
# Node
# ---------------------------------------------------------------------------

ALL_TOOLS = [
    python_executor,
    math_solver,
    image_finder,
    youtube_finder,
    serp_scholar_search,
    youtube_processor,
    webpage_processor,
]

tool_node = ToolNode(ALL_TOOLS)

_FALLBACK = {
    "speech": "I'm ready to learn! How can I help you today?",
    "emotion": "idle",
    "canvas_mode": "whiteboard",
    "canvas_actions": [],
    "follow_up_suggestions": ["Explain a concept", "Solve a problem"],
}

def _parse_json(content: str) -> dict:
    text = content.strip()
    try:
        # 1. Try to find JSON inside code fences
        if "```" in text:
            blocks = text.split("```")
            for block in blocks:
                block = block.strip()
                if block.lower().startswith("json"):
                    block = block[4:].strip()
                try:
                    return json.loads(block)
                except:
                    continue
        
        # 2. Try to find the first { and last }
        match = re.search(r"(\{.*\})", text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
            
        # 3. Last ditch: try loading the whole string
        return json.loads(text)
    except Exception as e:
        print(f"JSON Parse Error: {e}")
        # 4. Final Recovery: If it's not JSON but has text, wrap it into a valid speech JSON
        if len(text) > 10:
            recovery = _FALLBACK.copy()
            recovery["speech"] = text
            return recovery
        return _FALLBACK

def tutor_node(state: State) -> dict:
    """The only node — handles tools and response generation."""
    llm = get_llm().bind_tools(ALL_TOOLS)
    
    prompt = TUTOR_NODE_PROMPT.format(
        course=state.get("course", "General"),
        topic=state.get("topic", "General"),
        learning_goal=state.get("learning_goal", "Not specified"),
        current_code=state.get("current_code", "No code yet"),
        last_execution=state.get("last_execution", "No executions yet"),
    )
    
    messages = [SystemMessage(content=prompt)] + state["messages"]
    response = llm.invoke(messages)
    
    # Process output if no tool call
    if not hasattr(response, "tool_calls") or not response.tool_calls:
        structured = _parse_json(response.content)
        
        # FAIL-SAFE: If code blocks are in speech, pull them out and put them in canvas
        speech = structured.get("speech", "")
        code_blocks = re.findall(r"```(?:python)?\n?(.*?)```", speech, re.DOTALL)
        if code_blocks:
            # Strip the blocks from speech
            structured["speech"] = re.sub(r"```(?:python)?\n?.*?```", "", speech, flags=re.DOTALL).strip()
            # Ensure canvas actions exists and add the code
            if "canvas_actions" not in structured: structured["canvas_actions"] = []
            for code in code_blocks:
                # Avoid duplicates
                if not any(a.get("type") == "code" and a.get("content") == code.strip() for a in structured["canvas_actions"]):
                    structured["canvas_actions"].append({
                        "type": "code",
                        "content": code.strip(),
                        "language": "python",
                        "step": len(structured["canvas_actions"]) + 1,
                        "narration": "Program implementation"
                    })
            # Force canvas mode to code if code is present
            structured["canvas_mode"] = "code"

        response.additional_kwargs["structured"] = structured
        response.content = structured.get("speech", response.content)
        
    return {"messages": [response]}

# ---------------------------------------------------------------------------
# Graph
# ---------------------------------------------------------------------------

def _should_continue(state: State) -> str:
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END

workflow = StateGraph(State)
workflow.add_node("agent", tutor_node)
workflow.add_node("tools", tool_node)

workflow.set_entry_point("agent")
workflow.add_conditional_edges("agent", _should_continue, {"tools": "tools", END: END})
workflow.add_edge("tools", "agent")

agent_graph = workflow.compile()
