from langchain_openai import ChatOpenAI
from app.config import (
    PRIMARY_LLM_BASE_URL,
    PRIMARY_LLM_MODEL,
    PRIMARY_LLM_API_KEY,
    VERIFIER_LLM_BASE_URL,
    VERIFIER_LLM_MODEL,
    VERIFIER_LLM_API_KEY,
    LLM_TEMPERATURE,
    LLM_TIMEOUT_SECONDS,
)


def _build(base_url: str, model: str, api_key: str) -> ChatOpenAI:
    return ChatOpenAI(
        model=model,
        base_url=base_url,
        api_key=api_key,
        temperature=LLM_TEMPERATURE,
        timeout=LLM_TIMEOUT_SECONDS,
    )


def get_primary_llm() -> ChatOpenAI:
    return _build(PRIMARY_LLM_BASE_URL, PRIMARY_LLM_MODEL, PRIMARY_LLM_API_KEY)


def get_verifier_llm() -> ChatOpenAI:
    return _build(VERIFIER_LLM_BASE_URL, VERIFIER_LLM_MODEL, VERIFIER_LLM_API_KEY)
