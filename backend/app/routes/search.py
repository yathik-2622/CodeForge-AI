"""
CodeForge AI — Web Search Route
Exposes Tavily web search as an API endpoint and lists available models.
"""
import logging
from fastapi import APIRouter, Query
from app.lib.search import web_search
from app.config import settings

log = logging.getLogger("codeforge.routes.search")
router = APIRouter(prefix="/api/search", tags=["search"])

# Full model list (mirrors node_api and /api/models)
_ALL_MODELS = [
    # OpenRouter (free)
    {"id": "mistralai/mistral-7b-instruct:free",          "label": "Mistral 7B Instruct",        "provider": "openrouter", "context": 32768,  "badge": "Fast"},
    {"id": "meta-llama/llama-3.1-8b-instruct:free",       "label": "Llama 3.1 8B Instruct",      "provider": "openrouter", "context": 131072, "badge": "128k ctx"},
    {"id": "meta-llama/llama-3-8b-instruct:free",         "label": "Llama 3 8B",                 "provider": "openrouter", "context": 8192,   "badge": "Meta"},
    {"id": "microsoft/phi-3-mini-128k-instruct:free",     "label": "Phi-3 Mini 128k",            "provider": "openrouter", "context": 131072, "badge": "Microsoft"},
    {"id": "google/gemma-3-12b-it:free",                  "label": "Gemma 3 12B",                "provider": "openrouter", "context": 131072, "badge": "Google"},
    {"id": "google/gemma-2-9b-it:free",                   "label": "Gemma 2 9B",                 "provider": "openrouter", "context": 8192,   "badge": "Google"},
    {"id": "deepseek/deepseek-r1:free",                   "label": "DeepSeek R1",                "provider": "openrouter", "context": 163840, "badge": "Reasoning"},
    {"id": "deepseek/deepseek-r1-distill-llama-70b:free", "label": "DeepSeek R1 Distill 70B",    "provider": "openrouter", "context": 131072, "badge": "Reasoning"},
    {"id": "qwen/qwen-2.5-7b-instruct:free",              "label": "Qwen 2.5 7B",                "provider": "openrouter", "context": 131072, "badge": "Alibaba"},
    {"id": "mistralai/mistral-nemo:free",                 "label": "Mistral Nemo 12B",           "provider": "openrouter", "context": 131072, "badge": "12B"},
    {"id": "openchat/openchat-7b:free",                   "label": "OpenChat 7B",                "provider": "openrouter", "context": 8192,   "badge": "Chat"},
    # Groq (fast)
    {"id": "groq/meta-llama/llama-4-maverick-17b-128e-instruct-fp8", "label": "Llama 4 Maverick 17B (128E)", "provider": "groq", "context": 131072, "badge": "New"},
    {"id": "groq/meta-llama/llama-4-scout-17b-16e-instruct",         "label": "Llama 4 Scout 17B (16E)",     "provider": "groq", "context": 131072, "badge": "New"},
    {"id": "groq/llama-3.3-70b-versatile",       "label": "Llama 3.3 70B Versatile",  "provider": "groq", "context": 131072, "badge": "Groq Fast"},
    {"id": "groq/llama-3.1-8b-instant",          "label": "Llama 3.1 8B Instant",     "provider": "groq", "context": 131072, "badge": "Groq Instant"},
    {"id": "groq/llama3-70b-8192",               "label": "Llama 3 70B",              "provider": "groq", "context": 8192,   "badge": "Groq"},
    {"id": "groq/llama3-8b-8192",                "label": "Llama 3 8B",               "provider": "groq", "context": 8192,   "badge": "Groq"},
    {"id": "groq/qwen-qwq-32b",                  "label": "Qwen QwQ 32B",             "provider": "groq", "context": 131072, "badge": "Reasoning"},
    {"id": "groq/deepseek-r1-distill-llama-70b", "label": "DeepSeek R1 Distill 70B",  "provider": "groq", "context": 131072, "badge": "Reasoning"},
    {"id": "groq/deepseek-r1-distill-qwen-32b",  "label": "DeepSeek R1 Distill 32B",  "provider": "groq", "context": 131072, "badge": "Reasoning"},
    {"id": "groq/mixtral-8x7b-32768",            "label": "Mixtral 8x7B 32k",         "provider": "groq", "context": 32768,  "badge": "MoE"},
    {"id": "groq/gemma2-9b-it",                  "label": "Gemma 2 9B",               "provider": "groq", "context": 8192,   "badge": "Groq"},
    {"id": "groq/compound-beta",                 "label": "Compound Beta",            "provider": "groq", "context": 131072, "badge": "Agentic"},
]


@router.get("/web")
async def search_web(
    q: str = Query(..., min_length=1, description="Search query"),
    max_results: int = Query(default=5, ge=1, le=10),
):
    """Search the web using Tavily AI and return structured results."""
    log.info(f"Web search: '{q}' (max_results={max_results})")
    results = await web_search(q, max_results=max_results)
    return {
        "query": q,
        "results": results,
        "configured": bool(settings.TAVILY_API_KEY),
        "result_count": len(results),
    }


@router.get("/models")
async def list_models():
    """Return the full list of 23 available AI models."""
    models = []
    for m in _ALL_MODELS:
        if m["provider"] == "openrouter" and settings.OPENROUTER_API_KEY:
            models.append(m)
        elif m["provider"] == "groq" and settings.groq_api_key:
            models.append(m)
    return {"models": models if models else [m for m in _ALL_MODELS if m["provider"] == "openrouter"]}
