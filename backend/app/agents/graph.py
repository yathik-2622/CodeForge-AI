"""
CodeForge AI — Production LangGraph Multi-Agent System

Architecture:
    START → Supervisor → [Researcher | Coder | Direct] → END

The Supervisor is the intelligence layer — it reads the user's intent,
routes to the right specialist, and ensures quality output.

Researcher: Searches the web with Tavily for up-to-date information.
Coder:      Expert software engineer with deep prompt engineering.
Direct:     Fast answers for simple, factual, or conversational queries.
"""

import logging
import re
from typing import TypedDict, Annotated, Literal
import operator
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langgraph.graph import StateGraph, END
from app.config import settings
from app.lib.search import web_search, format_search_context

log = logging.getLogger("codeforge.agents.graph")


# ── Shared State ──────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]
    user_message: str
    search_results: str
    repo_context: str
    plan: str
    reasoning: str
    final_answer: str


# ── LLM Factory ───────────────────────────────────────────────────────────────

def _build_llm(model: str | None = None, temperature: float | None = None, streaming: bool = True) -> ChatOpenAI:
    return ChatOpenAI(
        model=model or settings.DEFAULT_MODEL,
        openai_api_key=settings.OPENROUTER_API_KEY,
        openai_api_base=settings.OPENROUTER_BASE_URL,
        temperature=temperature if temperature is not None else settings.ai_temperature,
        max_tokens=settings.max_tokens,
        streaming=streaming,
        default_headers={
            "HTTP-Referer": settings.APP_URL,
            "X-Title": "CodeForge AI",
        },
    )


# ── Routing Logic ─────────────────────────────────────────────────────────────

_SEARCH_TRIGGERS = re.compile(
    r"\b(latest|recent|current|today|news|2024|2025|docs|documentation|"
    r"what is|who is|when did|where is|how does .+ work|best .+ library|"
    r"compare|vs\.|versus|release|version|update|changelog)\b",
    re.IGNORECASE,
)

_CODE_TRIGGERS = re.compile(
    r"\b(write|generate|create|implement|build|code|function|class|script|"
    r"fix|debug|refactor|optimize|review|test|unit test|explain this code|"
    r"add feature|make it|convert|migrate|lint|format)\b",
    re.IGNORECASE,
)


def _classify_intent(message: str) -> Literal["research", "code", "direct"]:
    msg = message.strip()
    if _SEARCH_TRIGGERS.search(msg) and len(msg) > 20:
        return "research"
    if _CODE_TRIGGERS.search(msg):
        return "code"
    if len(msg) < 80 and not any(c in msg for c in ["```", "def ", "class ", "function"]):
        return "direct"
    return "code"


# ── Node: Supervisor ──────────────────────────────────────────────────────────

async def supervisor_node(state: AgentState) -> AgentState:
    user_msg = state["user_message"]
    plan = _classify_intent(user_msg)
    log.info(f"Supervisor → route: {plan!r} | query: {user_msg[:60]!r}")
    return {**state, "plan": plan}


# ── Node: Researcher ──────────────────────────────────────────────────────────

async def researcher_node(state: AgentState) -> AgentState:
    log.info("Researcher: performing Tavily web search")
    try:
        results = await web_search(state["user_message"], max_results=5)
        context = format_search_context(results)
        log.info(f"Researcher: {len(results)} results found")
    except Exception as e:
        log.error(f"Search failed: {e}")
        context = ""
    return {**state, "search_results": context, "plan": "code"}


# ── Node: Coder (Expert Software Engineer) ────────────────────────────────────

_CODER_SYSTEM = """You are CodeForge AI — a world-class autonomous software engineer and coding agent.

## Your Identity
You are an expert with deep mastery across all major programming languages, frameworks, architectures, 
and software engineering best practices. You write production-ready code, not toy examples.

## Core Principles
1. **Correctness first** — Your code must work. No pseudo-code, no placeholders, no `# TODO` comments.
2. **Best practices** — Follow SOLID principles, proper error handling, type hints, and idiomatic patterns.
3. **Explain clearly** — Before code, briefly explain your approach. After code, explain key decisions.
4. **Security-aware** — Actively avoid SQL injection, XSS, hardcoded secrets, unsafe deserialization.
5. **Complete implementations** — Never truncate code with "..." or "rest of implementation here".

## Code Formatting Rules
- Always use proper language-tagged code blocks: ```python, ```typescript, ```javascript, etc.
- Include imports at the top.
- Add type annotations for all function parameters and return values.
- Include meaningful comments for non-obvious logic.
- Production-level error handling with specific exception types.

## Response Structure
For coding tasks:
1. **Brief approach** (1-3 sentences) — What you'll implement and why
2. **Complete code** — Full working implementation  
3. **Key notes** — Edge cases, performance, security considerations
4. **Usage example** — If helpful

For debugging tasks:
1. **Root cause** — What's causing the bug
2. **Fixed code** — Complete corrected implementation
3. **Explanation** — Why this fixes it and how to avoid it

For architecture tasks:
1. **Recommended approach** — Technology choices and reasoning
2. **Architecture diagram** (ASCII or description)
3. **Implementation steps** — Ordered, actionable

## Languages You Excel At
Python, TypeScript, JavaScript, Rust, Go, Java, C++, SQL, Bash, React, Vue, FastAPI, Django, Express,
Next.js, PostgreSQL, MongoDB, Redis, Docker, Kubernetes, AWS, GCP, Azure, and more.
"""


async def coder_node(state: AgentState) -> AgentState:
    log.info("Coder: generating expert response")
    llm = _build_llm(streaming=False)

    system_parts = [_CODER_SYSTEM]

    if state.get("search_results"):
        system_parts.append(
            f"\n\n## Live Web Search Results\nUse the following up-to-date information in your response:\n\n{state['search_results']}"
        )

    if state.get("repo_context"):
        system_parts.append(
            f"\n\n## Connected Repository Context\n{state['repo_context']}"
        )

    messages: list[BaseMessage] = [
        SystemMessage(content="\n".join(system_parts)),
        *state["messages"],
    ]

    response = await llm.ainvoke(messages)
    log.info(f"Coder: {len(response.content)} chars generated")
    return {**state, "final_answer": response.content}


# ── Node: Direct (Fast Conversational Answers) ────────────────────────────────

_DIRECT_SYSTEM = """You are CodeForge AI — an expert coding assistant.

Answer clearly, concisely, and accurately. 
- For technical questions: give precise, correct answers.
- For conceptual questions: use clear analogies.
- For comparisons: use structured bullet points or tables.
- Keep responses focused — no unnecessary padding.
- Use code snippets only when they genuinely help.
"""


async def direct_node(state: AgentState) -> AgentState:
    log.info("Direct: answering concisely")
    llm = _build_llm(temperature=0.1, streaming=False)
    messages: list[BaseMessage] = [
        SystemMessage(content=_DIRECT_SYSTEM),
        *state["messages"],
    ]
    response = await llm.ainvoke(messages)
    return {**state, "final_answer": response.content}


# ── Routing Functions ─────────────────────────────────────────────────────────

def route_from_supervisor(state: AgentState) -> Literal["researcher", "coder", "direct"]:
    plan = state.get("plan", "direct")
    if plan == "research":
        return "researcher"
    if plan == "code":
        return "coder"
    return "direct"


# ── Build Graph ───────────────────────────────────────────────────────────────

def build_agent_graph():
    graph = StateGraph(AgentState)
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("researcher", researcher_node)
    graph.add_node("coder", coder_node)
    graph.add_node("direct", direct_node)

    graph.set_entry_point("supervisor")
    graph.add_conditional_edges(
        "supervisor",
        route_from_supervisor,
        {"researcher": "researcher", "coder": "coder", "direct": "direct"},
    )
    graph.add_edge("researcher", "coder")
    graph.add_edge("coder", END)
    graph.add_edge("direct", END)

    compiled = graph.compile()
    log.info("✅ LangGraph agent graph compiled (supervisor→researcher/coder/direct)")
    return compiled


agent_graph = build_agent_graph()


# ── Public API ────────────────────────────────────────────────────────────────

def _build_lc_messages(history: list[dict], user_message: str) -> list[BaseMessage]:
    lc: list[BaseMessage] = []
    for m in history[-12:]:
        role = m.get("role", "user")
        content = m.get("content", "")
        if role == "user":
            lc.append(HumanMessage(content=content))
        else:
            lc.append(AIMessage(content=content))
    lc.append(HumanMessage(content=user_message))
    return lc


async def run_agent_graph(
    user_message: str,
    history: list[dict],
    model: str | None = None,
    repo_context: str = "",
) -> str:
    lc_messages = _build_lc_messages(history, user_message)
    initial_state: AgentState = {
        "messages": lc_messages,
        "user_message": user_message,
        "search_results": "",
        "repo_context": repo_context,
        "plan": "",
        "reasoning": "",
        "final_answer": "",
    }
    result = await agent_graph.ainvoke(initial_state)
    return result.get("final_answer") or "I could not generate a response. Please try again."


async def stream_agent_graph(
    user_message: str,
    history: list[dict],
    model: str | None = None,
    repo_context: str = "",
):
    """
    Stream tokens from the agent graph.
    Yields string chunks as the LLM generates them.
    Yields special dict events for tool use:
        {"event": "search_start"}
        {"event": "search_done", "results": [...]}
        {"event": "route", "plan": "code"}
    """
    lc_messages = _build_lc_messages(history, user_message)

    # Classify intent
    plan = _classify_intent(user_message)
    yield {"event": "route", "plan": plan}

    # Web search if needed
    search_context = ""
    if plan == "research":
        yield {"event": "search_start"}
        try:
            results = await web_search(user_message, max_results=5)
            search_context = format_search_context(results)
            yield {"event": "search_done", "result_count": len(results)}
        except Exception as e:
            log.error(f"Stream search error: {e}")
            yield {"event": "search_error", "error": str(e)}

    # Build system prompt
    system_parts = [_CODER_SYSTEM if plan in ("code", "research") else _DIRECT_SYSTEM]
    if search_context:
        system_parts.append(
            f"\n\n## Live Web Search Results\n{search_context}"
        )
    if repo_context:
        system_parts.append(f"\n\n## Repository Context\n{repo_context}")

    messages: list[BaseMessage] = [
        SystemMessage(content="\n".join(system_parts)),
        *lc_messages,
    ]

    llm = _build_llm(model, streaming=True)
    log.info(f"Streaming: model={model or settings.DEFAULT_MODEL} plan={plan}")

    async for chunk in llm.astream(messages):
        if chunk.content:
            yield chunk.content
