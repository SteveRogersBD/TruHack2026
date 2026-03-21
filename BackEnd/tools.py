from __future__ import annotations

import os
import subprocess
import tempfile


def python_executor(code: str) -> str:
    """Execute Python code in a subprocess and return stdout/stderr."""
    fd, path = tempfile.mkstemp(suffix=".py")
    ret = ""
    try:
        with os.fdopen(fd, "w") as tmp:
            tmp.write(code)
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
        if os.path.exists(path):
            os.remove(path)
    return ret


def image_finder(query: str) -> str:
    """Find a relevant image via the Pexels API. Returns image URL."""
    api_key = os.getenv("PEXELS_API_KEY")
    if not api_key:
        return "Image search failed: No Pexels API key found."
    import requests
    try:
        resp = requests.get(
            f"https://api.pexels.com/v1/search?query={query}&per_page=1",
            headers={"Authorization": api_key},
            timeout=10,
        )
        data = resp.json()
        if data.get("photos"):
            return data["photos"][0]["src"]["large"]
        return f"No images found for: {query}"
    except Exception as e:
        return f"Image search error: {str(e)}"


def youtube_finder(query: str) -> str:
    """Find a relevant YouTube video. Returns watch URL."""
    api_key = os.getenv("YT_API_KEY")
    if not api_key:
        return "YouTube search failed: No YouTube API key found."
    import requests
    try:
        resp = requests.get(
            f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={query}&key={api_key}&type=video&maxResults=1",
            timeout=10,
        )
        data = resp.json()
        if data.get("items"):
            video_id = data["items"][0]["id"]["videoId"]
            return f"https://www.youtube.com/watch?v={video_id}"
        return f"No videos found for: {query}"
    except Exception as e:
        return f"YouTube search error: {str(e)}"


def math_solver(expression: str, command: str = "simplify") -> str:
    """Solve a math expression with SymPy. Returns LaTeX string."""
    try:
        import sympy
        from sympy import diff, integrate, latex, simplify, solve, symbols

        x, y, z, t = symbols("x y z t")
        expr = sympy.sympify(expression)
        if command == "solve":
            res = solve(expr, x)
        elif command == "diff":
            res = diff(expr, x)
        elif command == "integrate":
            res = integrate(expr, x)
        else:
            res = simplify(expr)
        return latex(res)
    except Exception as e:
        return f"Math Error: {str(e)}"
