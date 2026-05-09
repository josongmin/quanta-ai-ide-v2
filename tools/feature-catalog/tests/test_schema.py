"""Schema and load-time invariants for the feature catalog.

Run with `pytest` from `tools/feature-catalog/` (or via `python -m pytest`).
The tests load the real `catalog/` so they double as a CI gate — if a
family yaml goes wrong, the test suite goes red.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import ValidationError

from feature_catalog.loader import CatalogLoadError, default_catalog_root, load_catalog
from feature_catalog.models import Feature, Tier


@pytest.fixture(scope="module")
def catalog():
    return load_catalog(default_catalog_root())


def test_catalog_loads_clean(catalog):
    """The shipped catalog must round-trip through Pydantic without error."""
    assert len(catalog.families) >= 1
    assert len(catalog.features) >= 1


def test_every_family_has_at_least_one_feature(catalog):
    """A family with zero features is dead weight — flag it."""
    for family in catalog.families:
        members = catalog.features_in(family.id)
        assert members, f"family {family.id!r} has no features"


def test_feature_ids_are_globally_unique(catalog):
    ids = [f.id for f in catalog.features]
    assert len(ids) == len(set(ids)), "duplicate feature ids — loader should have caught this"


def test_related_refs_resolve(catalog):
    by_id = {f.id: f for f in catalog.features}
    for feature in catalog.features:
        for ref in feature.related:
            assert ref in by_id, f"{feature.id!r} relates to nonexistent {ref!r}"


def test_every_feature_has_evidence(catalog):
    """Catalog rule: a feature claim without a code pointer is just marketing."""
    for feature in catalog.features:
        ev = feature.evidence
        assert ev.symbols or ev.tests or ev.locales, (
            f"{feature.id!r} has no evidence — add at least one symbol/test/locale"
        )


def test_marketing_fluff_is_rejected():
    """The description validator should reject the fluff word list."""
    payload = {
        "id": "fake-feature",
        "label": "Fake",
        "tier": "leading",
        "description": "A revolutionary 10x next-gen breakthrough.",
        "evidence": {"symbols": ["src/foo.ts"]},
        "pattern": {"source": "n/a", "rationale": "test"},
        "added_in": "2026-01-01",
    }
    with pytest.raises(ValidationError):
        Feature.model_validate(payload)


def test_kebab_id_constraint_rejects_underscores():
    """ids must be kebab-case so they survive in URLs and CLI flags."""
    payload = {
        "id": "snake_case_id",
        "label": "Bad",
        "tier": "parity",
        "description": "Plain prose.",
        "evidence": {"symbols": ["src/foo.ts"]},
        "pattern": {"source": "n/a", "rationale": "test"},
        "added_in": "2026-01-01",
    }
    with pytest.raises(ValidationError):
        Feature.model_validate(payload)


def test_unknown_tier_is_rejected():
    payload = {
        "id": "bad-tier",
        "label": "Bad",
        "tier": "supreme",  # not in enum
        "description": "Plain prose.",
        "evidence": {"symbols": ["src/foo.ts"]},
        "pattern": {"source": "n/a", "rationale": "test"},
        "added_in": "2026-01-01",
    }
    with pytest.raises(ValidationError):
        Feature.model_validate(payload)


def test_at_least_one_leading_feature(catalog):
    """We claim to lead the industry on several axes — make that claim explicit."""
    leading = catalog.by_tier(Tier.LEADING)
    assert len(leading) >= 5, "catalog should surface at least 5 leading features"


def test_family_filename_mismatch_errors(tmp_path: Path):
    """If a feature declares family=X but lives in Y.yaml, loader must reject."""
    root = tmp_path / "catalog"
    (root / "families").mkdir(parents=True)
    (root / "_families.yaml").write_text(
        "families:\n"
        "  - id: alpha\n"
        "    label: Alpha\n"
        "    order: 10\n"
        "    rationale: test\n"
    )
    (root / "families" / "alpha.yaml").write_text(
        "- id: x-test\n"
        "  label: Test\n"
        "  family: beta\n"  # mismatch
        "  tier: parity\n"
        "  description: Plain prose.\n"
        "  evidence:\n"
        "    symbols: [src/foo.ts]\n"
        "  pattern:\n"
        "    source: n/a\n"
        "    rationale: test\n"
        "  added_in: '2026-01-01'\n"
    )
    with pytest.raises(CatalogLoadError, match="declares family="):
        load_catalog(root)
