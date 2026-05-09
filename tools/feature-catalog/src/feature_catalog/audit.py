"""Catalog ↔ source audit.

Walks every feature.evidence.symbols and:
* Confirms the file path exists, relative to the repo root.
* If the symbol is `path.tsx::Name`, greps the file for `Name` to
  ensure we didn't rename the symbol without updating the catalog.

The repo root is found by walking up from the catalog root until we
see a `package.json` — same convention as `loader.default_catalog_root`.
Returns a list of human-readable problem strings; empty means clean.
"""

from __future__ import annotations

import re
from pathlib import Path

from feature_catalog.models import Catalog


def find_repo_root(catalog_root: Path) -> Path:
    for parent in [catalog_root, *catalog_root.parents]:
        if (parent / "package.json").exists():
            return parent
    raise RuntimeError(
        f"could not find package.json above {catalog_root} — "
        "audit needs the repo root to resolve evidence paths"
    )


def audit_catalog(catalog: Catalog, repo_root: Path) -> list[str]:
    """Returns a list of audit problems. Empty list = no issues.

    Skips features with `status != "shipped"` — `planned` and `wip` are
    explicit promises about *future* code, so missing symbols are
    expected, not bugs.
    """
    problems: list[str] = []
    for feature in catalog.features:
        if feature.status != "shipped":
            continue
        for symbol in feature.evidence.symbols:
            problems.extend(_check_symbol(feature.id, symbol, repo_root))
        for test in feature.evidence.tests:
            if not (repo_root / test).exists():
                problems.append(f"{feature.id}: test path {test!r} does not exist")
    return problems


def _check_symbol(feature_id: str, symbol: str, repo_root: Path) -> list[str]:
    """A symbol is either `path` or `path::Name`. Both forms must resolve."""
    if "::" in symbol:
        path_str, name = symbol.split("::", 1)
    else:
        path_str, name = symbol, None
    file_path = repo_root / path_str
    if not file_path.exists():
        return [f"{feature_id}: symbol path {path_str!r} does not exist"]
    if name is None:
        return []
    try:
        text = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return [f"{feature_id}: cannot decode {path_str!r} as utf-8"]
    # Match `function Name`, `const Name`, `class Name`, `export type Name`,
    # or just the bare identifier as a fallback. We don't AST-parse; the
    # regex catches the typical TS/JS shapes the catalog references.
    if re.search(rf"\b{re.escape(name)}\b", text) is None:
        return [f"{feature_id}: symbol {name!r} not found in {path_str}"]
    return []
