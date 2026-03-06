"""Shared environmental impact calculation constants and helpers.

Single source of truth for all CO₂ and waste reduction formulas used
across the backend (orders, seller impact, NGO impact, inspector aggregation).

Formulas (from EPA / WRAP food waste research):
  CO₂ reduction  = food_saved_kg × 2.5  kg CO₂ per kg food saved
  Landfill reduction = food_saved_kg × 0.8  kg waste per kg food saved
"""

from __future__ import annotations

# ── Emission factors ──────────────────────────────────────────────────────────

# kg CO₂ prevented per kg of food saved from waste
CO2_PER_KG_FOOD: float = 2.5

# kg of landfill waste reduced per kg of food saved
LANDFILL_PER_KG_FOOD: float = 0.8


# ── Calculation helpers ───────────────────────────────────────────────────────


def co2_from_food_kg(food_kg: float) -> float:
    """Return kg of CO₂ prevented for a given food weight saved."""
    return round(food_kg * CO2_PER_KG_FOOD, 3)


def landfill_from_food_kg(food_kg: float) -> float:
    """Return kg of landfill waste reduced for a given food weight saved."""
    return round(food_kg * LANDFILL_PER_KG_FOOD, 3)


def food_kg_from_co2(co2_kg: float) -> float:
    """Infer food weight from a CO₂ saving (inverse of co2_from_food_kg)."""
    return round(co2_kg / CO2_PER_KG_FOOD, 3)
