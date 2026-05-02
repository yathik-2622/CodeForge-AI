"""
=============================================================================
CodeForge AI — LangGraph Multi-Agent Workflow
=============================================================================

LangGraph lets us build AI workflows as a GRAPH (like a flowchart).
Each node is an AI agent with a specific job.
Edges define how control flows between agents.

Our Agent Graph:
    ┌──────────┐
    │  START   │
    └────┬─────┘
         │
    ┌────▼─────────┐
    │  SUPERVISOR  │  ← Decides: needs search? direct answer? complex task?
    └────┬─────────┘
         │
    ┌────▼────────────────────────────────────┐
    │  Route:                                  │
    │  "research" → Researcher                 │
    │  "code"     → Coder                      │
    │  "direct"   → END (simple answers)       │
    └────┬──────────────────────────────────── ┘
         │
    ┌────▼─────────┐     ┌──────────────┐
    │  RESEARCHER  │────►│   CODER      │
    │  (web search)│     │  (generates  │
    └──────────────┘     │   code)      │
                         └──────┬───────┘
                                │
                         ┌──────▼───────┐
                         │   REVIEWER   │  ← Reviews and improves output
                         └──────┬───────┘
                                │
                           ┌────▼────┐
                           │   END   │
                           └─────────┘

=============================================================================
"""

import logging
from typing import TypedDict, Annotated, Literal
import operator
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langgraph.graph import StateGraph, END
from app.config import settings
from app.lib.search import web_search, should_search, format_search_context

log = logging.getLogger("codeforge.agents.graph")

# ── Agent State ───────────────────────────────────────────────────────────────
# This is shared between all nodes. Each node reads from it and can add to it.
# The Annotated[list, operator.add] means new messages are APPENDED (not replaced).

class AgentState(TypedDict):
    """
    The shared state that flows through the entire agent graph.
    Each agent reads this, does its job, and updates it.
    """
    messages: Annotated[list[BaseMessage], operator.add]  # Full conversation history
    user_message: str                                      # The latest user message
    search_results: str                                    # Web search results (if any)
    plan: str                                              # Supervisor's routing decision
    final_answer: str                                      # The final response to send


def _build_llm(model: str | None = None) -> ChatOpenAI:
    """
    Create a LangChain LLM connected to OpenRouter (free models).

    OpenRouter is OpenAI-compatible, so we just change the base_url.
    """
    return ChatOpenAI(
        model=model or settings.DEFAULT_MODEL,
        openai_api_key=settings.OPENROUTER_API_KEY,
        openai_api_base=settings.OPENROUTER_BASE_URL,
        temperature=0.7,
        max_tokens=2048,
        streaming=True,  # Enable token-by-token streaming
    )


# ── Node: Supervisor ──────────────────────────────────────────────────────────

async def supervisor_node(state: AgentState) -> AgentState:
    """
    The Supervisor decides how to route the request.
    Looks at the user's message and decides:
    - "research"  → needs web search first
    - "code"      → direct coding task
    - "direct"    → simple question, answer directly
    """
    log.info("🧠 Supervisor: analyzing request")
    user_msg = state["user_message"]

    # Simple heuristic routing (no LLM cost for routing decision)
    if should_search(user_msg):
        plan = "research"
        log.info("Supervisor: routing to RESEARCH (search needed)")
    elif any(kw in user_msg.lower() for kw in ["write", "generate", "create", "fix", "refactor", "implement", "build", "code"]):
        plan = "code"
        log.info("Supervisor: routing to CODE")
    else:
        plan = "direct"
        log.info("Supervisor: routing to DIRECT answer")

    return {**state, "plan": plan}


# ── Node: Researcher ──────────────────────────────────────────────────────────

async def researcher_node(state: AgentState) -> AgentState:
    """
    The Researcher performs a web search and formats the results
    as context for the Coder agent.
    """
    log.info("🔍 Researcher: performing web search")
    results = await web_search(state["user_message"], max_results=3)
    context = format_search_context(results)
    log.info(f"Researcher: found {len(results)} results")
    return {**state, "search_results": context, "plan": "code"}


# ── Node: Coder ───────────────────────────────────────────────────────────────

async def coder_node(state: AgentState) -> AgentState:
    """
    The Coder generates the main AI response using the LLM.
    Has access to conversation history, search results, and the user's message.
    """
    log.info("👨‍💻 Coder: generating response")
    llm = _build_llm()

    # Build the system prompt with context
    system_content = """You are CodeForge AI — an autonomous coding agent and expert software engineer.

You help developers:
- Write, refactor, and debug code in any language
- Explain programming concepts clearly
- Find and fix bugs
- Review code for quality and security
- Design software architecture

Be precise, practical, and include working code examples.
Format code with proper syntax highlighting markers (```language\\ncode\\n```).
"""

    if state.get("search_results"):
        system_content += f"\n\nRelevant web search results:{state['search_results']}"

    messages: list[BaseMessage] = [SystemMessage(content=system_content)]
    messages.extend(state["messages"])

    # Generate response (non-streaming for the graph — streaming happens in the route)
    response = await llm.ainvoke(messages)
    answer = response.content
    log.info(f"Coder: generated response ({len(answer)} chars)")
    return {**state, "final_answer": answer}


# ── Node: Direct Answer ───────────────────────────────────────────────────────

async def direct_node(state: AgentState) -> AgentState:
    """
    For simple questions that don't need web search or complex coding.
    Just answers directly using the conversation history.
    """
    log.info("💬 Direct: answering question")
    llm = _build_llm()

    messages: list[BaseMessage] = [
        SystemMessage(content="You are CodeForge AI, an expert coding assistant. Answer clearly and concisely."),
        *state["messages"],
    ]
    response = await llm.ainvoke(messages)
    return {**state, "final_answer": response.content}


# ── Routing Logic ─────────────────────────────────────────────────────────────

def route_from_supervisor(state: AgentState) -> Literal["researcher", "coder", "direct"]:
    """Reads the plan and routes to the appropriate next node."""
    return state.get("plan", "direct")  # type: ignore


def route_from_researcher(state: AgentState) -> Literal["coder"]:
    """After research, always go to the coder."""
    return "coder"


# ── Build and Compile the Graph ───────────────────────────────────────────────

def build_agent_graph() -> StateGraph:
    """
    Assemble all nodes and edges into a complete agent graph.
    Returns a compiled graph ready to execute.
    """
    graph = StateGraph(AgentState)

    # Register all nodes (agents)
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("researcher", researcher_node)
    graph.add_node("coder", coder_node)
    graph.add_node("direct", direct_node)

    # Set the starting point
    graph.set_entry_point("supervisor")

    # Add conditional routing from supervisor
    graph.add_conditional_edges(
        "supervisor",
        route_from_supervisor,
        {
            "research": "researcher",
            "code": "coder",
            "direct": "direct",
        },
    )

    # After researcher, always go to coder
    graph.add_edge("researcher", "coder")

    # Both coder and direct end the workflow
    graph.add_edge("coder", END)
    graph.add_edge("direct", END)

    compiled = graph.compile()
    log.info("✅ LangGraph agent workflow compiled")
    return compiled


# Global compiled graph — created once, reused for all requests
agent_graph = build_agent_graph()


async def run_agent_graph(
    user_message: str,
    history: list[dict],
    model: str | None = None,
) -> str:
    """
    Run the full agent graph for a user message.

    Args:
        user_message: The user's latest message
        history:      Previous messages [{"role": "user"/"agent", "content": "..."}]
        model:        Optional model override

    Returns:
        The AI's final response as a string
    """
    # Convert history to LangChain message format
    lc_messages: list[BaseMessage] = []
    for m in history[-10:]:  # Last 10 messages for context window management
        if m["role"] == "user":
            lc_messages.append(HumanMessage(content=m["content"]))
        else:
            lc_messages.append(AIMessage(content=m["content"]))

    # Add the current user message
    lc_messages.append(HumanMessage(content=user_message))

    # Run the graph
    initial_state: AgentState = {
        "messages": lc_messages,
        "user_message": user_message,
        "search_results": "",
        "plan": "",
        "final_answer": "",
    }

    log.info(f"Running agent graph for message: '{user_message[:50]}...'")
    result = await agent_graph.ainvoke(initial_state)
    answer = result.get("final_answer", "I was unable to generate a response.")
    log.info(f"Agent graph complete. Response: {len(answer)} chars")
    return answer


async def stream_agent_graph(
    user_message: str,
    history: list[dict],
    model: str | None = None,
):
    """
    Stream the agent graph response token by token using LangChain streaming.

    Yields:
        Token strings as they are generated by the LLM
    """
    # Convert history to LangChain messages
    lc_messages: list[BaseMessage] = []
    for m in history[-10:]:
        if m["role"] == "user":
            lc_messages.append(HumanMessage(content=m["content"]))
        else:
            lc_messages.append(AIMessage(content=m["content"]))
    lc_messages.append(HumanMessage(content=user_message))

    # Check if we need web search
    search_context = ""
    if should_search(user_message):
        log.info("Streaming: performing web search before generation")
        results = await web_search(user_message, max_results=3)
        search_context = format_search_context(results)

    # Build system prompt
    system_content = """You are CodeForge AI — an autonomous coding agent and expert software engineer.
Help with coding, debugging, code review, architecture, and technical explanations.
Format code blocks with proper language tags. Be precise and practical."""

    if search_context:
        system_content += f"\n\nWeb search results for context:{search_context}"

    messages: list[BaseMessage] = [SystemMessage(content=system_content), *lc_messages]

    # Stream using LangChain
    llm = _build_llm(model)
    log.info(f"Streaming response for: '{user_message[:50]}...'")

    async for chunk in llm.astream(messages):
        if chunk.content:
            yield chunk.content
