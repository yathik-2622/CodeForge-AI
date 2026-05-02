"""
=============================================================================
CodeForge AI — LangChain Agent Tools
=============================================================================

Tools are functions that AI agents can call during their reasoning process.
Think of them like superpowers the AI can use:
    - web_search_tool: "Let me Google that for you"
    - github_search_tool: "Let me search GitHub for relevant code"
    - qdrant_search_tool: "Let me find similar code in your repos"

LangChain wraps these as "Tool" objects so the LLM can decide when to use them.

=============================================================================
"""

import logging
import asyncio
from langchain_core.tools import tool
from app.lib.search import web_search
from app.lib.github_client import search_repos
from app.config import settings

log = logging.getLogger("codeforge.agents.tools")


@tool
def web_search_tool(query: str) -> str:
    """
    Search the web for up-to-date information, documentation, or news.
    Use this when the user asks about 'latest', 'recent', 'how to', 'docs', CVEs, etc.

    Args:
        query: The search query to look up

    Returns:
        Formatted search results as a string
    """
    log.info(f"Tool: web_search_tool called with query='{query}'")

    # Run async function in sync context (LangChain tools are sync by default)
    try:
        loop = asyncio.get_event_loop()
        results = loop.run_until_complete(web_search(query, max_results=3))
    except RuntimeError:
        # If there's no event loop, create one
        results = asyncio.run(web_search(query, max_results=3))

    if not results:
        return "No web search results found. The search API may not be configured."

    formatted = f"Web search results for '{query}':\n\n"
    for i, r in enumerate(results, 1):
        formatted += f"{i}. **{r.get('title', 'Untitled')}**\n"
        formatted += f"   URL: {r.get('url', '')}\n"
        content = r.get("content", "")
        if content:
            formatted += f"   {content[:400]}\n\n"

    log.info(f"Tool: web_search_tool returned {len(results)} results")
    return formatted


@tool
def github_search_tool(query: str) -> str:
    """
    Search GitHub for public repositories related to the query.
    Use this to find relevant open source projects, examples, or libraries.

    Args:
        query: GitHub search query (e.g., 'react typescript authentication')

    Returns:
        Formatted list of matching GitHub repositories
    """
    log.info(f"Tool: github_search_tool called with query='{query}'")

    try:
        loop = asyncio.get_event_loop()
        repos = loop.run_until_complete(search_repos(query))
    except RuntimeError:
        repos = asyncio.run(search_repos(query))

    if not repos:
        return "No GitHub repositories found for that query."

    formatted = f"GitHub repositories matching '{query}':\n\n"
    for r in repos[:5]:
        formatted += f"• **{r.get('full_name', '')}** ⭐{r.get('stargazers_count', 0)}\n"
        if r.get("description"):
            formatted += f"  {r['description'][:150]}\n"
        formatted += f"  URL: {r.get('html_url', '')}\n\n"

    log.info(f"Tool: github_search_tool returned {len(repos)} repos")
    return formatted


@tool
def code_analysis_tool(code: str) -> str:
    """
    Analyze a code snippet and identify potential issues, improvements, and patterns.
    Use this when the user asks you to review, debug, or improve their code.

    Args:
        code: The code snippet to analyze

    Returns:
        Analysis results as a formatted string
    """
    log.info(f"Tool: code_analysis_tool called (code length: {len(code)})")

    # This is a placeholder — in a full implementation, this could:
    # - Run static analysis tools (pylint, eslint)
    # - Check against known vulnerability patterns
    # - Detect code smells
    analysis = f"""Code Analysis Summary:
- Length: {len(code.splitlines())} lines
- Language: {'Python' if 'def ' in code or 'import ' in code else 'JavaScript/TypeScript' if 'const ' in code or 'function ' in code else 'Unknown'}
- Contains async: {'Yes' if 'async' in code else 'No'}
- Contains error handling: {'Yes' if 'try' in code or 'catch' in code or 'except' in code else 'No'}
"""
    return analysis


# ── Collect all available tools ───────────────────────────────────────────────
# This list is passed to LangGraph agents as their available tools
ALL_TOOLS = [web_search_tool, github_search_tool, code_analysis_tool]
