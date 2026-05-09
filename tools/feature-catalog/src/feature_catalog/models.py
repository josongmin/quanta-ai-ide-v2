"""Pydantic models for the feature catalog.

Single source of truth at runtime. The YAML schema mirror in
`catalog/_schema.yaml` is documentation; this file is the law.

Design notes
------------
* `Tier` is enum-string so YAML stays human-readable.
* `SotaPresence` is `bool | "partial"` — three-state because "absent" is the
  most common value and we don't want every feature carrying eight `false`
  fields. The validator coerces missing keys to `False`.
* `Feature.id` is the stable handle used by cross-references (`related`)
  and audit (`evidence.symbols`). Globally unique across all families.
* `evidence.symbols` may be either a bare path (`src/.../File.tsx`) or a
  symbol-qualified path (`src/.../File.tsx::FunctionName`). The audit step
  runs `rg` to confirm both forms resolve.
"""

from __future__ import annotations

from enum import Enum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

# kebab-case identifier — lowercase letters, digits, single dashes.
KebabId = Annotated[
    str,
    StringConstraints(pattern=r"^[a-z][a-z0-9]*(-[a-z0-9]+)*$", min_length=2, max_length=64),
]


class Tier(str, Enum):
    """How the feature stacks against the strongest competing IDE.

    The tier is a *judgement*, refreshed when we re-survey the SOTA
    landscape (see `catalog/sota-snapshot.yaml`). It is *not* derived
    from the per-competitor `sota.*` flags — those answer "do they
    have it?" while tier answers "are we ahead?"
    """

    LEADING = "leading"
    PARITY = "parity"
    PROGRESSIVE = "progressive"
    TABLE_STAKES = "table-stakes"


SotaPresence = bool | Literal["partial"]


class Sota(BaseModel):
    """Per-competitor presence for this feature.

    Default `False` for missing fields — most features won't be present
    in most tools, and listing eight `false` per entry is noise.
    """

    model_config = ConfigDict(extra="forbid")

    cursor: SotaPresence = False
    claude_code: SotaPresence = False
    devin: SotaPresence = False
    openhands: SotaPresence = False
    cody: SotaPresence = False
    continue_ide: SotaPresence = False
    windsurf: SotaPresence = False
    copilot_ws: SotaPresence = False

    def has_any(self) -> bool:
        return any(v is True or v == "partial" for v in self.model_dump().values())

    def count(self) -> tuple[int, int]:
        """Returns (full, partial) counts."""
        values = list(self.model_dump().values())
        full = sum(1 for v in values if v is True)
        partial = sum(1 for v in values if v == "partial")
        return full, partial


class Evidence(BaseModel):
    """Pointers into the actual repo so the catalog can't drift from code."""

    model_config = ConfigDict(extra="forbid")

    symbols: list[str] = Field(default_factory=list)
    tests: list[str] = Field(default_factory=list)
    locales: list[str] = Field(default_factory=list)


class Pattern(BaseModel):
    """Where the design came from + one-sentence rationale."""

    model_config = ConfigDict(extra="forbid")

    source: str
    rationale: str


class Feature(BaseModel):
    """A single feature catalog entry."""

    model_config = ConfigDict(extra="forbid")

    id: KebabId
    label: str
    family: KebabId | None = None  # auto-set by loader from filename
    tier: Tier
    description: str
    evidence: Evidence
    pattern: Pattern
    sota: Sota = Field(default_factory=Sota)
    added_in: str
    status: Literal["shipped", "wip", "planned"] = "shipped"
    flags: list[str] = Field(default_factory=list)
    related: list[KebabId] = Field(default_factory=list)
    notes: str | None = None

    @field_validator("description")
    @classmethod
    def _no_marketing_fluff(cls, v: str) -> str:
        # Catch the most common offenders early. Reviewers can override by
        # rewording; this is a nudge, not a wall.
        bad = ("revolutionary", "world-class", "10x", "groundbreaking", "next-gen")
        lower = v.lower()
        for word in bad:
            if word in lower:
                raise ValueError(f"description reads as marketing copy ({word!r}); rewrite as user-facing fact")
        return v


class Family(BaseModel):
    """Metadata for one family — the unit of YAML file."""

    model_config = ConfigDict(extra="forbid")

    id: KebabId
    label: str
    order: int
    rationale: str


class Catalog(BaseModel):
    """The fully-loaded catalog — families plus every feature, validated."""

    model_config = ConfigDict(extra="forbid")

    families: list[Family]
    features: list[Feature]

    def features_in(self, family_id: str) -> list[Feature]:
        return [f for f in self.features if f.family == family_id]

    def family(self, family_id: str) -> Family | None:
        return next((fam for fam in self.families if fam.id == family_id), None)

    def by_id(self, feature_id: str) -> Feature | None:
        return next((f for f in self.features if f.id == feature_id), None)

    def by_tier(self, tier: Tier) -> list[Feature]:
        return [f for f in self.features if f.tier == tier]
