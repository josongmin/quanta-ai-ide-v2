"""Catalog renderers — markdown, JSON, mermaid mind-map.

Each renderer takes the validated `Catalog` and returns a string.
Output is fully deterministic — same catalog ⇒ byte-identical output —
so we can land rendered artefacts in the repo without diff churn.
"""

from __future__ import annotations

import json
from io import StringIO

from feature_catalog.models import Catalog, Feature, Tier

_TIER_LABEL: dict[Tier, str] = {
    Tier.LEADING: "🔵 leading",
    Tier.PARITY: "🟢 parity",
    Tier.PROGRESSIVE: "🟡 progressive",
    Tier.TABLE_STAKES: "⚪ table-stakes",
}


def _features_by_family(catalog: Catalog) -> list[tuple[str, list[Feature]]]:
    """Group features by family in display order, deterministically."""
    families = sorted(catalog.families, key=lambda f: (f.order, f.id))
    out: list[tuple[str, list[Feature]]] = []
    for fam in families:
        items = [f for f in catalog.features if f.family == fam.id]
        items.sort(key=lambda f: f.id)
        out.append((fam.id, items))
    return out


# ─── Markdown ────────────────────────────────────────────────────────────


def render_markdown(catalog: Catalog) -> str:
    buf = StringIO()
    buf.write("# Feature Catalog\n\n")
    buf.write(f"_{len(catalog.features)} features across {len(catalog.families)} families._\n\n")

    # Tier summary up-front so a skim catches the headline.
    counts = {tier: len(catalog.by_tier(tier)) for tier in Tier}
    buf.write("## Tier distribution\n\n")
    buf.write("| Tier | Count |\n|---|---|\n")
    for tier in (Tier.LEADING, Tier.PARITY, Tier.PROGRESSIVE, Tier.TABLE_STAKES):
        buf.write(f"| {_TIER_LABEL[tier]} | {counts[tier]} |\n")
    buf.write("\n")

    # Per-family sections.
    for family_id, features in _features_by_family(catalog):
        family = catalog.family(family_id)
        if family is None or not features:
            continue
        buf.write(f"## {family.label}\n\n")
        buf.write(f"_{family.rationale.strip()}_\n\n")
        buf.write("| ID | Tier | Feature | Pattern |\n|---|---|---|---|\n")
        for feature in features:
            buf.write(
                f"| `{feature.id}` "
                f"| {_TIER_LABEL[feature.tier]} "
                f"| **{feature.label}** — {feature.description.strip()} "
                f"| {feature.pattern.source} "
                f"|\n"
            )
        buf.write("\n")
    return buf.getvalue()


# ─── JSON (machine-readable) ─────────────────────────────────────────────


def render_json(catalog: Catalog) -> str:
    """Stable JSON dump — sorted keys + indented for review-friendly diffs."""
    return json.dumps(
        catalog.model_dump(mode="json"),
        indent=2,
        sort_keys=True,
        ensure_ascii=False,
    )


# ─── Mermaid mind-map ────────────────────────────────────────────────────


def render_mermaid(catalog: Catalog) -> str:
    """Mind-map of family → features, suitable for docs / readme.

    Uses Mermaid `mindmap` syntax. Tier markers go on each leaf so the
    diagram doubles as a coverage map.
    """
    buf = StringIO()
    buf.write("mindmap\n  root((/coding feature catalog))\n")
    for family_id, features in _features_by_family(catalog):
        family = catalog.family(family_id)
        if family is None or not features:
            continue
        buf.write(f"    {family.label}\n")
        for feature in features:
            tier_glyph = {
                Tier.LEADING: "🔵",
                Tier.PARITY: "🟢",
                Tier.PROGRESSIVE: "🟡",
                Tier.TABLE_STAKES: "⚪",
            }[feature.tier]
            buf.write(f"      {tier_glyph} {feature.label}\n")
    return buf.getvalue()


# ─── SOTA coverage matrix ────────────────────────────────────────────────


def render_coverage(catalog: Catalog) -> str:
    """Markdown table: feature × competitor presence."""
    competitors = ["cursor", "claude_code", "devin", "openhands", "cody", "continue_ide", "windsurf", "copilot_ws"]
    headers = ["Feature", "Tier", *(c.replace("_", " ") for c in competitors), "Ours"]
    buf = StringIO()
    buf.write("# SOTA coverage\n\n")
    buf.write("| " + " | ".join(headers) + " |\n")
    buf.write("|" + "|".join(["---"] * len(headers)) + "|\n")

    def cell(value: bool | str) -> str:
        if value is True:
            return "✅"
        if value == "partial":
            return "◐"
        return "·"

    for family_id, features in _features_by_family(catalog):
        for feature in features:
            row = [
                f"`{feature.id}` {feature.label}",
                _TIER_LABEL[feature.tier],
            ]
            sota_dump = feature.sota.model_dump()
            row.extend(cell(sota_dump[c]) for c in competitors)
            row.append("✅")  # always present in our build by definition
            buf.write("| " + " | ".join(row) + " |\n")
    return buf.getvalue()
