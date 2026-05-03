"""
=============================================================================
CodeForge AI — Models Endpoint
Returns all available AI models (same list as node_api/src/lib/ai.ts)
=============================================================================
"""
import logging
from typing import Literal
from fastapi import APIRouter
from pydantic import BaseModel
from app.config import settings

log    = logging.getLogger("codeforge.routes.models")
router = APIRouter(prefix="/api", tags=["models"])


class ModelInfo(BaseModel):
    id:       str
    label:    str
    provider: Literal["openrouter", "groq"]
    context:  int
    badge:    str | None = None


OPENROUTER_MODELS: list[ModelInfo] = [
    ModelInfo(id="mistralai/mistral-7b-instruct:free",          label="Mistral 7B Instruct",           provider="openrouter", context=32768,  badge="Fast"),
    ModelInfo(id="meta-llama/llama-3.1-8b-instruct:free",       label="Llama 3.1 8B Instruct",         provider="openrouter", context=131072, badge="128k ctx"),
    ModelInfo(id="meta-llama/llama-3-8b-instruct:free",         label="Llama 3 8B",                    provider="openrouter", context=8192,   badge="Meta"),
    ModelInfo(id="microsoft/phi-3-mini-128k-instruct:free",     label="Phi-3 Mini 128k",               provider="openrouter", context=131072, badge="Microsoft"),
    ModelInfo(id="google/gemma-3-12b-it:free",                  label="Gemma 3 12B",                   provider="openrouter", context=131072, badge="Google"),
    ModelInfo(id="google/gemma-2-9b-it:free",                   label="Gemma 2 9B",                    provider="openrouter", context=8192,   badge="Google"),
    ModelInfo(id="deepseek/deepseek-r1:free",                   label="DeepSeek R1",                   provider="openrouter", context=163840, badge="Reasoning"),
    ModelInfo(id="deepseek/deepseek-r1-distill-llama-70b:free", label="DeepSeek R1 Distill 70B",       provider="openrouter", context=131072, badge="Reasoning"),
    ModelInfo(id="qwen/qwen-2.5-7b-instruct:free",              label="Qwen 2.5 7B",                   provider="openrouter", context=131072, badge="Alibaba"),
    ModelInfo(id="mistralai/mistral-nemo:free",                 label="Mistral Nemo 12B",              provider="openrouter", context=131072, badge="12B"),
    ModelInfo(id="openchat/openchat-7b:free",                   label="OpenChat 7B",                   provider="openrouter", context=8192,   badge="Chat"),
]

GROQ_MODELS: list[ModelInfo] = [
    ModelInfo(id="groq/meta-llama/llama-4-maverick-17b-128e-instruct-fp8", label="Llama 4 Maverick 17B (128E)", provider="groq", context=131072, badge="🔥 New"),
    ModelInfo(id="groq/meta-llama/llama-4-scout-17b-16e-instruct",        label="Llama 4 Scout 17B (16E)",     provider="groq", context=131072, badge="🔥 New"),
    ModelInfo(id="groq/llama-3.3-70b-versatile",       label="Llama 3.3 70B Versatile",  provider="groq", context=131072, badge="Groq Fast"),
    ModelInfo(id="groq/llama-3.1-8b-instant",          label="Llama 3.1 8B Instant",     provider="groq", context=131072, badge="Groq Instant"),
    ModelInfo(id="groq/llama3-70b-8192",               label="Llama 3 70B",              provider="groq", context=8192,   badge="Groq"),
    ModelInfo(id="groq/llama3-8b-8192",                label="Llama 3 8B",               provider="groq", context=8192,   badge="Groq"),
    ModelInfo(id="groq/qwen-qwq-32b",                  label="Qwen QwQ 32B",             provider="groq", context=131072, badge="Reasoning"),
    ModelInfo(id="groq/deepseek-r1-distill-llama-70b", label="DeepSeek R1 Distill 70B",  provider="groq", context=131072, badge="Reasoning"),
    ModelInfo(id="groq/deepseek-r1-distill-qwen-32b",  label="DeepSeek R1 Distill 32B",  provider="groq", context=131072, badge="Reasoning"),
    ModelInfo(id="groq/mixtral-8x7b-32768",            label="Mixtral 8x7B 32k",         provider="groq", context=32768,  badge="MoE"),
    ModelInfo(id="groq/gemma2-9b-it",                  label="Gemma 2 9B",               provider="groq", context=8192,   badge="Groq"),
    ModelInfo(id="groq/compound-beta",                 label="Compound Beta",            provider="groq", context=131072, badge="Agentic"),
]


@router.get("/models", response_model=list[ModelInfo])
async def list_models():
    """Return all available AI models filtered by which API keys are configured."""
    models: list[ModelInfo] = []
    if settings.OPENROUTER_API_KEY:
        models.extend(OPENROUTER_MODELS)
    if settings.groq_api_key:
        models.extend(GROQ_MODELS)
    # Always return at least OpenRouter models so UI is never empty
    return models if models else OPENROUTER_MODELS
