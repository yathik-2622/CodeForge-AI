import logging
import httpx
from app.config import settings

log = logging.getLogger("codeforge.lib.search")

TAVILY_API_URL = "https://api.tavily.com/search"


async def web_search(query: str, max_results: int = 5) -> list[dict]:
    if not settings.TAVILY_API_KEY:
        log.warning("TAVILY_API_KEY not set — web search disabled")
        return []

    log.info(f"Tavily search: '{query}' (max={max_results})")

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                TAVILY_API_URL,
                json={
                    "api_key": settings.TAVILY_API_KEY,
                    "query": query,
                    "max_results": max_results,
                    "include_raw_content": False,
                    "search_depth": "advanced",
                    "include_answer": True,
                },
            )
            response.raise_for_status()
            data = response.json()
            results = data.get("results", [])

            # Prepend the Tavily answer snippet as a synthetic first result
            answer = data.get("answer")
            if answer:
                results.insert(0, {
                    "title": "Summary",
                    "url": "https://tavily.com",
                    "content": answer,
                    "score": 1.0,
                })

            log.info(f"Search returned {len(results)} results for '{query}'")
            return results

    except httpx.TimeoutException:
        log.error(f"Tavily search timed out: '{query}'")
        return []
    except httpx.HTTPStatusError as e:
        log.error(f"Tavily API {e.response.status_code}: {e.response.text[:200]}")
        return []
    except Exception as e:
        log.error(f"Search error: {e}")
        return []


def should_search(message: str) -> bool:
    triggers = [
        "search", "find", "latest", "recent", "news", "what is", "who is",
        "how to", "docs", "documentation", "tutorial", "example", "cve",
        "vulnerability", "best practice", "compare", "vs ", "2024", "2025",
        "current", "today", "update", "release", "version",
    ]
    lower = message.lower()
    return any(kw in lower for kw in triggers)


def format_search_context(results: list[dict]) -> str:
    if not results:
        return ""
    lines = []
    for i, r in enumerate(results[:5], 1):
        title = r.get("title", "Untitled")
        url = r.get("url", "")
        content = (r.get("content") or "")[:500].strip()
        lines.append(f"[{i}] {title}\n    URL: {url}\n    {content}")
    return "\n\n".join(lines)
