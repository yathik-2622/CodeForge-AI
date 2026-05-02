import logging
import asyncio
from langchain_core.tools import tool
from app.lib.search import web_search
from app.lib.github_client import search_repos
from app.db.qdrant import embed_text, search_similar_code
from app.config import settings

log = logging.getLogger("codeforge.agents.tools")


def _run_async(coro):
    try:
        loop = asyncio.get_running_loop()
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(asyncio.run, coro)
            return future.result(timeout=30)
    except RuntimeError:
        return asyncio.run(coro)


@tool
def web_search_tool(query: str) -> str:
    """
    Search the web for up-to-date information, documentation, CVEs, tutorials, or news.
    Use when the user asks about 'latest', 'recent', 'docs', 'how to', 'what is', or current events.

    Args:
        query: The search query

    Returns:
        Formatted search results with titles, URLs, and content snippets
    """
    log.info(f"web_search_tool: '{query}'")
    results = _run_async(web_search(query, max_results=5))

    if not results:
        return "No web search results found. The Tavily API may not be configured."

    lines = [f"Web search results for '{query}':\n"]
    for i, r in enumerate(results[:5], 1):
        title = r.get("title", "Untitled")
        url = r.get("url", "")
        content = (r.get("content") or "")[:400].strip()
        lines.append(f"{i}. **{title}**\n   {url}\n   {content}\n")

    return "\n".join(lines)


@tool
def github_search_tool(query: str) -> str:
    """
    Search GitHub for public repositories matching the query.
    Use when the user wants to find open source libraries, examples, or projects.

    Args:
        query: GitHub search query (e.g., 'fastapi jwt authentication')

    Returns:
        Formatted list of matching GitHub repositories with stars and descriptions
    """
    log.info(f"github_search_tool: '{query}'")
    repos = _run_async(search_repos(query))

    if not repos:
        return f"No GitHub repositories found for '{query}'."

    lines = [f"GitHub repositories matching '{query}':\n"]
    for r in repos[:6]:
        name = r.get("full_name", "")
        stars = r.get("stargazers_count", 0)
        desc = (r.get("description") or "No description")[:120]
        url = r.get("html_url", "")
        lang = r.get("language") or "Unknown"
        lines.append(f"• **{name}** ⭐{stars:,} [{lang}]\n  {desc}\n  {url}\n")

    return "\n".join(lines)


@tool
def semantic_code_search_tool(query: str, repo_id: str = "") -> str:
    """
    Search connected repositories using semantic vector search.
    Finds code that is semantically similar to the query, even without exact keyword matches.
    Use when the user asks about code in their connected repositories.

    Args:
        query:   Natural language description of what to find
        repo_id: Optional repository ID to restrict search to

    Returns:
        Matching code snippets with file paths and similarity scores
    """
    log.info(f"semantic_code_search: '{query}' repo_id={repo_id or 'all'}")

    try:
        vector = embed_text(query)
        results = _run_async(search_similar_code(
            collection=settings.QDRANT_COLLECTION,
            query_vector=vector,
            limit=5,
            filter_repo_id=repo_id or None,
        ))
    except Exception as e:
        log.error(f"Semantic search error: {e}")
        return f"Semantic search failed: {e}"

    if not results:
        return "No matching code found in the connected repositories for that query."

    lines = [f"Semantic code search results for '{query}':\n"]
    for r in results:
        score = r.get("score", 0)
        path = r.get("file_path", "unknown")
        lang = r.get("language", "")
        content = (r.get("content") or "")[:300].strip()
        lines.append(f"• **{path}** (similarity: {score:.2f}) [{lang}]\n```\n{content}\n```\n")

    return "\n".join(lines)


@tool
def analyze_code_tool(code: str) -> str:
    """
    Perform static analysis on a code snippet to identify issues, patterns, and improvements.
    Use when the user pastes code and asks for a review or debugging help.

    Args:
        code: The source code to analyze

    Returns:
        Structured analysis: language, complexity, issues, suggestions
    """
    log.info(f"analyze_code_tool: {len(code)} chars")

    lines = code.splitlines()
    line_count = len(lines)

    # Detect language
    if any(kw in code for kw in ["def ", "import ", "async def", "class ", "elif ", "__init__"]):
        lang = "Python"
    elif any(kw in code for kw in ["const ", "let ", "=>", "interface ", "React.", "useState"]):
        lang = "TypeScript/JavaScript"
    elif "func " in code and "package " in code:
        lang = "Go"
    elif "#include" in code or "::" in code:
        lang = "C/C++"
    elif "fn " in code and "let mut" in code:
        lang = "Rust"
    elif "public class" in code or "void main" in code:
        lang = "Java"
    else:
        lang = "Unknown"

    # Checks
    has_error_handling = any(kw in code for kw in ["try", "except", "catch", "Result<", "Option<"])
    has_types = any(kw in code for kw in [": str", ": int", ": bool", "->", "interface ", "<T>", ": string"])
    has_tests = any(kw in code for kw in ["def test_", "it(", "describe(", "#[test]", "@Test"])
    has_logging = any(kw in code for kw in ["log.", "logger.", "console.log", "print(", "fmt.Print"])

    issues = []
    if not has_error_handling:
        issues.append("⚠️  No error handling detected — add try/except or Result types")
    if not has_types and lang in ("Python", "TypeScript/JavaScript"):
        issues.append("⚠️  No type annotations — consider adding types for maintainability")
    if line_count > 200:
        issues.append("⚠️  Large function/file — consider splitting into smaller components")
    if "password" in code.lower() and ("=" in code):
        issues.append("🔴  Possible hardcoded secret detected — use environment variables")
    if "SELECT *" in code.upper():
        issues.append("⚠️  SELECT * is inefficient — specify only needed columns")

    analysis = f"""## Code Analysis

**Language:** {lang}
**Lines:** {line_count}
**Has Error Handling:** {'✅' if has_error_handling else '❌'}
**Has Type Annotations:** {'✅' if has_types else '❌'}
**Has Tests:** {'✅' if has_tests else '❌'}
**Has Logging:** {'✅' if has_logging else '❌'}

### Issues Found
{chr(10).join(issues) if issues else '✅ No critical issues found'}

### Suggestions
- {'Add explicit error handling for all I/O and external calls' if not has_error_handling else 'Error handling is present — verify all edge cases are covered'}
- {'Add type annotations for better IDE support and documentation' if not has_types else 'Types are present — ensure generics are used where appropriate'}
- {'Add unit tests to verify behavior' if not has_tests else 'Tests detected — ensure coverage >80%'}
"""
    return analysis


ALL_TOOLS = [web_search_tool, github_search_tool, semantic_code_search_tool, analyze_code_tool]
