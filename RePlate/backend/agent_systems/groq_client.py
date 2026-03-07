"""Shared async Groq HTTP client used by all RePlate AI agents."""

from __future__ import annotations

import json
from typing import Any

import httpx

from app.core.config import settings


async def call_groq_async(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.3,
    max_tokens: int = 600,
    json_mode: bool = True,
) -> dict[str, Any]:
    """Call Groq chat completions API asynchronously.

    Returns the parsed JSON body of the first choice's message content.
    Falls back to a raw string dict if the model returns non-JSON.
    """
    if not settings.GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not configured in .env")

    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    # Inject JSON instruction into the first system message if json_mode is on
    if json_mode:
        for m in messages:
            if m.get("role") == "system":
                m["content"] = (
                    m["content"].rstrip()
                    + " Always respond with valid JSON only — no markdown, no code fences."
                )
                break

    payload = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(settings.GROQ_ENDPOINT, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

    content = data["choices"][0]["message"]["content"].strip()
    # Strip accidental markdown fences
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {"raw": content}


def call_groq_sync(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.3,
    max_tokens: int = 600,
    json_mode: bool = True,
) -> dict[str, Any]:
    """Synchronous variant — used only by standalone agent scripts."""
    if not settings.GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not configured in .env")

    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    if json_mode:
        for m in messages:
            if m.get("role") == "system":
                m["content"] = (
                    m["content"].rstrip()
                    + " Always respond with valid JSON only — no markdown, no code fences."
                )
                break

    payload = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    with httpx.Client(timeout=20.0) as client:
        response = client.post(settings.GROQ_ENDPOINT, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

    content = data["choices"][0]["message"]["content"].strip()
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {"raw": content}
