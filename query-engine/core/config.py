"""
core/config.py
Loads settings.yaml (with env-var interpolation) and .env,
exposing a single typed `settings` object used throughout the pipeline.
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import yaml
from dotenv import load_dotenv

# Load .env first so env vars are available for YAML interpolation
load_dotenv()

_CONFIG_PATH = Path(__file__).parent.parent / "config" / "settings.yaml"


def _interpolate_env(text: str) -> str:
    """Replace ${VAR:-default} patterns with env values."""
    def replacer(m: re.Match) -> str:
        var, _, default = m.group(1).partition(":-")
        return os.environ.get(var, default)
    return re.sub(r"\$\{([^}]+)\}", replacer, text)


def _load_yaml() -> dict:
    raw = _CONFIG_PATH.read_text()
    return yaml.safe_load(_interpolate_env(raw))


# ─────────────────────────────────────────────
#  Typed config dataclasses
# ─────────────────────────────────────────────

@dataclass
class LLMConfig:
    model:       str
    base_url:    str
    max_tokens:  int
    temperature: float
    api_key:     str = field(default_factory=lambda: os.environ["DEEPSEEK_API_KEY"])


@dataclass
class IntentConfig:
    confidence_threshold: float
    model_name:           str
    candidate_labels:     list[str]


@dataclass
class TopicFilterConfig:
    similarity_threshold: float
    allowed_keywords:     list[str]


@dataclass
class LanguageConfig:
    supported: list[str]
    strict:    bool


@dataclass
class DomainRouterConfig:
    allowed_domains: list[str]
    blocked_domains: list[str]


@dataclass
class DatasetEntry:
    id:            str
    project_id:    str
    name:          str
    geometry_type: str
    crs:           str
    keywords:      list[str]


@dataclass
class ProjectEntry:
    id:       str
    name:     str
    domains:  list[str]
    keywords: list[str]


@dataclass
class Settings:
    llm:           LLMConfig
    intent:        IntentConfig
    topic_filter:  TopicFilterConfig
    language:      LanguageConfig
    domain_router: DomainRouterConfig
    projects:      list[ProjectEntry]
    datasets:      list[DatasetEntry]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    cfg = _load_yaml()
    return Settings(
        llm=LLMConfig(**cfg["llm"]),
        intent=IntentConfig(**cfg["intent_classifier"]),
        topic_filter=TopicFilterConfig(**cfg["topic_filter"]),
        language=LanguageConfig(**cfg["language"]),
        domain_router=DomainRouterConfig(**cfg["domain_router"]),
        projects=[ProjectEntry(**p) for p in cfg["projects"]],
        datasets=[DatasetEntry(**d) for d in cfg["datasets"]],
    )
