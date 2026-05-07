"""Standalone test for smart_pricing_agent.py.

Runs two scenarios:
  1. AI path  — real Groq call using the key in .env
  2. Failsafe — Groq call is patched to raise, so rule-based logic runs

No live database or FastAPI app is required.
DB helpers (fetch_listing, save_strategy, apply_price) are mocked.
"""

from __future__ import annotations

import asyncio
import json
import sys
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

# ── make sure the backend source is on sys.path ───────────────────────────────
import pathlib

BACKEND_DIR = pathlib.Path(__file__).parent
sys.path.insert(0, str(BACKEND_DIR))

from agent_systems.smart_pricing_agent import (  # noqa: E402
    ListingSnapshot,
    generate_pricing_strategy,
)


# ── shared test fixture ───────────────────────────────────────────────────────


def _make_listing(hours_remaining: float = 2.5) -> ListingSnapshot:
    """Return a realistic ListingSnapshot without touching the DB."""
    expiry = datetime.now(timezone.utc) + timedelta(hours=hours_remaining)
    return ListingSnapshot(
        food_id="test-food-001",
        food_name="Masala Dosa",
        category="South Indian",
        quantity_available=8,
        original_price=120.00,
        current_price=100.00,
        expiry_time=expiry,
        seller_id="seller-abc",
        orders_today=1,
    )


def _make_mock_db() -> AsyncMock:
    """Return a mock AsyncSession — execute / commit are no-ops."""
    db = AsyncMock()
    # execute() returns an object whose mappings().first() returns None
    # (save_strategy will write to it but we don't need a real result)
    mock_result = MagicMock()
    mock_result.mappings.return_value.first.return_value = None
    db.execute.return_value = mock_result
    db.commit.return_value = None
    return db


def _print_result(label: str, strategy: dict) -> None:
    print(f"\n{'=' * 60}")
    print(f"  {label}")
    print("=" * 60)
    print(json.dumps(strategy, indent=2, default=str))


# ── test 1: AI path ───────────────────────────────────────────────────────────


async def test_ai_path() -> None:
    listing = _make_listing(hours_remaining=2.5)
    mock_db = _make_mock_db()

    # Patch fetch_listing and save_strategy; leave call_groq_async real
    with (
        patch(
            "agent_systems.smart_pricing_agent.fetch_listing",
            new=AsyncMock(return_value=listing),
        ),
        patch(
            "agent_systems.smart_pricing_agent.save_strategy",
            new=AsyncMock(return_value=None),
        ),
    ):
        strategy = await generate_pricing_strategy(
            mock_db,
            listing.food_id,
            lat=19.0748,
            lon=72.8856,
            auto_apply=False,
        )

    _print_result("TEST 1 — AI PATH (real Groq call)", strategy)

    # Basic assertions
    assert "priority_level" in strategy, "Missing priority_level"
    assert "recommended_discount" in strategy, "Missing recommended_discount"
    assert "suggested_price" in strategy, "Missing suggested_price"
    assert isinstance(strategy["promotion_strategy"], list), "promotion_strategy must be a list"
    assert strategy["reasoning"] != "Rule-based fallback (AI unavailable).", (
        "Expected AI reasoning, got fallback"
    )
    print("\n[PASS] AI path assertions OK")


# ── test 2: failsafe path ─────────────────────────────────────────────────────


async def test_failsafe_path() -> None:
    listing = _make_listing(hours_remaining=1.5)  # CRITICAL range
    mock_db = _make_mock_db()

    # Patch Groq client to raise so failsafe kicks in
    with (
        patch(
            "agent_systems.smart_pricing_agent.fetch_listing",
            new=AsyncMock(return_value=listing),
        ),
        patch(
            "agent_systems.smart_pricing_agent.save_strategy",
            new=AsyncMock(return_value=None),
        ),
        patch(
            "agent_systems.smart_pricing_agent.call_groq_async",
            new=AsyncMock(side_effect=RuntimeError("Groq unavailable (intentional test)")),
        ),
    ):
        strategy = await generate_pricing_strategy(
            mock_db,
            listing.food_id,
            lat=19.0748,
            lon=72.8856,
            auto_apply=False,
        )

    _print_result("TEST 2 — FAILSAFE PATH (Groq mocked to fail)", strategy)

    assert strategy["reasoning"] == "Rule-based fallback (AI unavailable).", (
        f"Expected failsafe reasoning, got: {strategy['reasoning']}"
    )
    assert strategy["recommended_discount"] == 0.50, (
        f"Expected 0.50 discount for <2h listing, got {strategy['recommended_discount']}"
    )
    assert strategy["priority_level"] in {"CRITICAL", "HIGH", "MEDIUM", "LOW"}, (
        f"Unexpected priority: {strategy['priority_level']}"
    )
    print("\n[PASS] Failsafe path assertions OK")


# ── runner ────────────────────────────────────────────────────────────────────


async def main() -> None:
    print("SmartPricingAgent — standalone test")
    print("Location: Mumbai (lat=19.0748, lon=72.8856)")

    errors: list[str] = []

    print("\nRunning TEST 1 — AI path...")
    try:
        await test_ai_path()
    except Exception as exc:
        errors.append(f"TEST 1 FAILED: {exc}")
        print(f"\n[FAIL] {exc}")

    print("\nRunning TEST 2 — Failsafe path...")
    try:
        await test_failsafe_path()
    except Exception as exc:
        errors.append(f"TEST 2 FAILED: {exc}")
        print(f"\n[FAIL] {exc}")

    print(f"\n{'=' * 60}")
    if errors:
        print(f"RESULT: {len(errors)} test(s) FAILED")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    else:
        print("RESULT: All tests PASSED")


if __name__ == "__main__":
    asyncio.run(main())
