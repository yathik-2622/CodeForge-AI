"""
=============================================================================
CodeForge AI — Web Search Integration (Tavily AI)
=============================================================================

Tavily is an AI-optimized web search API.
Unlike regular web scraping, Tavily returns clean, structured content
that's perfect for feeding into an AI model.

The AI automatically decides when to search based on the user's message.
Keywords that trigger a search: "latest", "recent", "news", "how to",
"what is", "docs", "documentation", "search", "find", "CVE".

Free tier: 1,000 searches/month at https://tavily.com

=============================================================================
"""

import logging
import httpx
from app.config import settings

log = logging.getLogger("codeforge.lib.search")

# Tavily API endpoint
TAVILY_API_URL = "https://api.tavily.com/search"


async def web_search(query: str, max_results: int = 5) -> list[dict]:
    """
    Search the web using Tavily AI Search API.

    Args:
        query:       The search query
        max_results: Maximum number of results to return (default 5)

    Returns:
        List of search results, each with:
        - title:   Page title
        - url:     Page URL
        - content: Cleaned text content (no HTML)
        - score:   Relevance score (0-1)

    Example:
        results = await web_search("React 19 concurrent features")
        for r in results:
            print(r["title"], r["url"])
    """
    if not settings.TAVILY_API_KEY:
        log.warning("TAVILY_API_KEY not set — web search disabled. Set it in .env to enable.")
        return []

    log.info(f"Searching web for: '{query}'")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                TAVILY_API_URL,
                json={
                    "api_key": settings.TAVILY_API_KEY,
                    "query": query,
                    "max_results": max_results,
                    "include_raw_content": False,  # Only get cleaned content
                    "search_depth": "basic",        # "advanced" is slower but more thorough
                },
            )
            response.raise_for_status()
            data = response.json()
            results = data.get("results", [])
            log.info(f"Web search returned {len(results)} results for '{query}'")
            return results

    except httpx.TimeoutException:
        log.error(f"Web search timed out for query: '{query}'")
        return []
    except httpx.HTTPStatusError as e:
        log.error(f"Tavily API error {e.response.status_code}: {e.response.text}")
        return []
    except Exception as e:
        log.error(f"Web search failed: {e}")
        return []


def should_search(message: str) -> bool:
    """
    Detect if a user message likely needs a web search.
    Returns True if search keywords are found.

    Args:
        message: The user's message text

    Returns:
        True if a web search would be helpful, False otherwise
    """
    search_triggers = [
        "search", "find", "latest", "recent", "news",
        "what is", "how to", "docs", "documentation",
        "tutorial", "example", "cve", "vulnerability",
        "best practice", "compare", "vs ", "2024", "2025",
    ]
    lower = message.lower()
    triggered = any(keyword in lower for keyword in search_triggers)
    if triggered:
        log.debug(f"Search triggered for message: '{message[:50]}...'")
    return triggered


def format_search_context(results: list[dict]) -> str:
    """
    Format search results as a string to include in AI context.

    Args:
        results: List of search result dicts from web_search()

    Returns:
        Formatted string to append to the AI's system context
    """
    if not results:
        return ""

    lines = ["\n\n[Web Search Results]"]
    for r in results[:3]:  # Limit to top 3 to save context tokens
        lines.append(f"\n• {r.get('title', 'Untitled')}")
        lines.append(f"  URL: {r.get('url', '')}")
        content = r.get("content", "")
        if content:
            lines.append(f"  {content[:300]}...")  # Truncate to 300 chars

    return "\n".join(lines)
