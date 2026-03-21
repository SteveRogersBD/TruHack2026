from __future__ import annotations

import os
import subprocess
import tempfile
from typing import Any, Dict, List, Optional, TypedDict

from openai import OpenAI


class WebSearchSource(TypedDict):
    title: str
    url: str
    snippet: str


class WebSearchResult(TypedDict):
    answer: str
    sources: List[WebSearchSource]


def _to_dict(obj: Any) -> Any:
    """
    Best-effort conversion for OpenAI SDK response objects (pydantic-like) into plain dicts.
    Keeps this tool resilient across minor SDK shape changes.
    """

    if obj is None:
        return None
    if isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, list):
        return [_to_dict(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _to_dict(v) for k, v in obj.items()}

    # pydantic v2 models
    dump = getattr(obj, "model_dump", None)
    if callable(dump):
        return dump()

    # fallback: try attribute dict
    d = getattr(obj, "__dict__", None)
    if isinstance(d, dict) and d:
        return {k: _to_dict(v) for k, v in d.items() if not k.startswith("_")}

    return str(obj)


def web_search_tool(
    query: str,
    *,
    model: str = "gpt-4o-mini",
    max_sources: int = 5,
    timeout_s: Optional[float] = 30.0,
) -> WebSearchResult:
    """
    Uses OpenAI's built-in `web_search` tool to answer a query and return sources.

    Contract:
    - Input: `query` (string)
    - Output: { "answer": str, "sources": [{title,url,snippet}, ...] }
    """

    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError("Missing OPENAI_API_KEY in environment.")

    client = OpenAI()

    resp = client.responses.create(
        model=model,
        tools=[{"type": "web_search"}],
        input=(
            "Answer the question using web search. Be concise and accurate.\n"
            "If the question is time-sensitive, prioritize the most recent reliable sources.\n"
            f"Question: {query}"
        ),
        timeout=timeout_s,
    )

    answer = getattr(resp, "output_text", "") or ""

    sources: List[WebSearchSource] = []

    # The exact response shape can vary by SDK version. We parse defensively.
    output_items = getattr(resp, "output", None)
    output_items = _to_dict(output_items) if output_items is not None else []

    for item in output_items or []:
        content = item.get("content") if isinstance(item, dict) else None
        if not isinstance(content, list):
            continue
        for part in content:
            if not isinstance(part, dict):
                continue
            if part.get("type") not in ("web_search_results", "web_search_result"):
                continue
            results = part.get("results") or []
            if not isinstance(results, list):
                continue
            for r in results:
                if not isinstance(r, dict):
                    continue
                sources.append(
                    {
                        "title": (r.get("title") or "").strip(),
                        "url": (r.get("url") or "").strip(),
                        "snippet": (r.get("snippet") or "").strip(),
                    }
                )

    # Deduplicate (by URL) while preserving order.
    seen: set[str] = set()
    deduped: List[WebSearchSource] = []
    for s in sources:
        url = s.get("url", "")
        if url and url in seen:
            continue
        if url:
            seen.add(url)
        deduped.append(s)

    return {"answer": answer, "sources": deduped[: max_sources if max_sources > 0 else 0]}


def python_executor(code: str) -> str:
    """
    Executes Python code in a separate process and returns the output.
    """
    # Create a temporary file for the script
    fd, path = tempfile.mkstemp(suffix=".py")
    ret = ""
    try:
        with os.fdopen(fd, "w") as tmp:
            tmp.write(code)

        # Run the script and capture output
        result = subprocess.run(
            ["python", path],
            capture_output=True,
            text=True,
            timeout=15,
        )

        output = result.stdout
        if result.stderr:
            output += "\n[Errors]:\n" + result.stderr

        ret = output if output else "Execution successful (no output)."
    except Exception as e:
        ret = f"Failed to execute code: {str(e)}"
    finally:
        # Ensure the temporary file is removed
        if os.path.exists(path):
            os.remove(path)
    return ret


def image_finder(query: str) -> str:
    """
    Finds a relevant image using the Pexels API.
    Returns the URL of the first image found.
    """
    # Use API key directly from .env (PEXELS_API_KEY)
    api_key = os.getenv("PEXELS_API_KEY")
    if not api_key:
        return "Image search failed: No Pexels API key found."

    import requests

    headers = {"Authorization": api_key}
    url = f"https://api.pexels.com/v1/search?query={query}&per_page=1"

    try:
        resp = requests.get(url, headers=headers, timeout=10)
        data = resp.json()
        if data.get("photos"):
            return data["photos"][0]["src"]["large"]
        return f"No images found for: {query}"
    except Exception as e:
        return f"Image search error: {str(e)}"


def youtube_finder(query: str) -> str:
    """
    Finds a relevant YouTube video using the YouTube Data API.
    Returns the URL of the first video found.
    """
    # Use API key directly from .env (YT_API_KEY)
    api_key = os.getenv("YT_API_KEY")
    if not api_key:
        return "YouTube search failed: No YouTube API key found."

    import requests

    url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={query}&key={api_key}&type=video&maxResults=1"

    try:
        resp = requests.get(url, timeout=10)
        data = resp.json()
        if data.get("items"):
            video_id = data["items"][0]["id"]["videoId"]
            return f"https://www.youtube.com/watch?v={video_id}"
        return f"No videos found for: {query}"
    except Exception as e:
        return f"YouTube search error: {str(e)}"


def math_solver(expression: str, command: str = "simplify") -> str:
    """
    Solves math problems using SymPy. Supports 'solve', 'diff', 'integrate', and 'simplify'.
    Returns the result in LaTeX format for the frontend.
    """
    try:
        import sympy
        from sympy import symbols, solve, diff, integrate, latex, simplify

        # Common symbols for university students
        x, y, z, t = symbols("x y z t")

        # Convert string to sympy expression
        expr = sympy.sympify(expression)

        if command == "solve":
            res = solve(expr, x)
        elif command == "diff":
            res = diff(expr, x)
        elif command == "integrate":
            res = integrate(expr, x)
        else:
            res = simplify(expr)

        # Output the result as a LaTeX string
        return latex(res)

    except Exception as e:
        return f"Math Error: {str(e)}"
