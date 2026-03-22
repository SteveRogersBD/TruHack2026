from __future__ import annotations

import json
import logging
import os
import re
import subprocess
import tempfile
from html import unescape

logger = logging.getLogger("scholar.youtube")


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


def _clean_subtitle_text(raw_text: str) -> str:
    text = raw_text.replace("\ufeff", "")
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"^\s*WEBVTT.*$", " ", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+\s*$", " ", text, flags=re.MULTILINE)
    text = re.sub(r"\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}", " ", text)
    text = re.sub(r"\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}\.\d{3}", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def _extract_subtitle_text(track_url: str, ext: str) -> str:
    import requests

    resp = requests.get(track_url, timeout=20)
    resp.raise_for_status()
    body = resp.text

    if ext == "json3":
        data = json.loads(body)
        events = data.get("events", [])
        parts = []
        for event in events:
            for seg in event.get("segs", []):
                text = seg.get("utf8", "").strip()
                if text:
                    parts.append(text)
        return " ".join(parts).strip()

    return _clean_subtitle_text(body)


def youtube_processor(url: str) -> dict:
    """Extract reusable YouTube context with transcript/subtitle fallbacks."""
    try:
        import yt_dlp

        logger.info("youtube.start url=%s", url)
        print(f"youtube.start url={url}")
        ydl_opts = {
            "quiet": True,
            "skip_download": True,
            "no_warnings": True,
            "extract_flat": False,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            title = info.get("title", "Unknown Title")
            channel = info.get("uploader", "Unknown Channel")
            duration = info.get("duration", 0)
            description = (info.get("description") or "").strip()
            webpage_url = info.get("webpage_url") or url

            transcript_text = ""
            transcript_source = "metadata"

            subtitle_groups = [info.get("subtitles") or {}, info.get("automatic_captions") or {}]
            preferred_langs = ("en", "en-US", "en-GB")
            for group in subtitle_groups:
                if transcript_text:
                    break
                for lang in preferred_langs:
                    tracks = group.get(lang) or []
                    if not tracks:
                        continue
                    preferred_tracks = sorted(
                        tracks,
                        key=lambda track: 0 if track.get("ext") in {"json3", "vtt"} else 1,
                    )
                    for track in preferred_tracks:
                        track_url = track.get("url")
                        ext = track.get("ext", "")
                        if not track_url:
                            continue
                        try:
                            transcript_text = _extract_subtitle_text(track_url, ext)
                            if transcript_text:
                                transcript_source = f"subtitle:{lang}:{ext or 'unknown'}"
                                logger.info("youtube.transcript.success url=%s source=%s", url, transcript_source)
                                print(f"youtube.transcript.success url={url} source={transcript_source}")
                                break
                        except Exception as subtitle_exc:
                            logger.warning(
                                "youtube.transcript.failed url=%s source=%s error=%s",
                                url,
                                f"{lang}:{ext or 'unknown'}",
                                subtitle_exc,
                            )
                            print(
                                f"youtube.transcript.failed url={url} "
                                f"source={lang}:{ext or 'unknown'} error={subtitle_exc}"
                            )
                    if transcript_text:
                        break

            if not transcript_text:
                logger.info("youtube.fallback.metadata_used url=%s", url)
                print(f"youtube.fallback.metadata_used url={url}")
                transcript_text = description[:4000]

            compact_description = description[:1200] if description else "No description available."
            compact_transcript = transcript_text[:12000] if transcript_text else "No transcript available."
            context = (
                f"Video URL: {webpage_url}\n"
                f"Title: {title}\n"
                f"Channel: {channel}\n"
                f"Duration: {duration} seconds\n"
                f"Transcript Source: {transcript_source}\n"
                f"Description:\n{compact_description}\n\n"
                f"Transcript / Extracted Audio Context:\n{compact_transcript}"
            )

            logger.info("youtube.context.ready url=%s transcript_source=%s", url, transcript_source)
            print(f"youtube.context.ready url={url} transcript_source={transcript_source}")
            return {
                "ok": True,
                "url": webpage_url,
                "title": title,
                "channel": channel,
                "duration": duration,
                "transcript_source": transcript_source,
                "context": context,
            }
    except Exception as e:
        logger.exception("youtube.processing.error url=%s", url)
        print(f"youtube.processing.error url={url} error={e}")
        return {
            "ok": False,
            "url": url,
            "title": "Unknown Title",
            "channel": "Unknown Channel",
            "duration": 0,
            "transcript_source": "error",
            "context": f"Video processing error: {str(e)}",
        }


def webpage_processor(url: str) -> dict:
    """Fetch and clean webpage text with basic fallbacks."""
    try:
        import requests

        logger.info("webpage.start url=%s", url)
        print(f"webpage.start url={url}")
        resp = requests.get(
            url,
            timeout=20,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                              "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
            },
        )
        resp.raise_for_status()
        html = resp.text

        title_match = re.search(r"<title[^>]*>(.*?)</title>", html, flags=re.IGNORECASE | re.DOTALL)
        title = unescape(title_match.group(1).strip()) if title_match else url

        cleaned = re.sub(r"(?is)<script.*?>.*?</script>", " ", html)
        cleaned = re.sub(r"(?is)<style.*?>.*?</style>", " ", cleaned)
        cleaned = re.sub(r"(?is)<noscript.*?>.*?</noscript>", " ", cleaned)
        cleaned = re.sub(r"(?is)<svg.*?>.*?</svg>", " ", cleaned)
        cleaned = re.sub(r"(?is)<[^>]+>", " ", cleaned)
        cleaned = unescape(cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        excerpt = cleaned[:14000] if cleaned else "No readable page text found."

        logger.info("webpage.context.ready url=%s", url)
        print(f"webpage.context.ready url={url}")
        return {
            "ok": True,
            "url": url,
            "title": title[:300],
            "context": f"Page URL: {url}\nTitle: {title}\n\nPage Text:\n{excerpt}",
        }
    except Exception as e:
        logger.exception("webpage.processing.error url=%s", url)
        print(f"webpage.processing.error url={url} error={e}")
        return {
            "ok": False,
            "url": url,
            "title": url,
            "context": f"Webpage processing error: {str(e)}",
        }
