from __future__ import annotations

from functools import lru_cache
from openai import OpenAI

from config import get_settings


@lru_cache
def get_openai() -> OpenAI:
    return OpenAI(api_key=get_settings().openai_api_key)
