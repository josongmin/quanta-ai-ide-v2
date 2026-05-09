"""YAML loader + cross-reference validator.

Loading semantics
-----------------
* `_families.yaml`  → list[Family]
* `families/<id>.yaml` → list[Feature]; each feature's `family` field is
  *auto-filled* from the filename. If the YAML carries a `family` key it
  must match the filename — mismatch is a hard error.
* All features merge into one flat `Catalog.features`.

Cross-reference rules (run on every load):
* Every feature.family resolves to a known family id.
* Every feature.related resolves to another feature id.
* Feature ids are globally unique across families.
"""

from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import ValidationError

from feature_catalog.models import Catalog, Family, Feature


class CatalogLoadError(Exception):
    """Raised when the catalog can't be loaded or fails cross-ref validation."""


def _read_yaml(path: Path) -> object:
    with path.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def load_catalog(catalog_root: Path) -> Catalog:
    """Load the full catalog from `<root>/_families.yaml` + `<root>/families/*.yaml`.

    Returns a validated `Catalog`. Raises `CatalogLoadError` on any
    problem with a message that points at the offending file.
    """
    families_path = catalog_root / "_families.yaml"
    if not families_path.exists():
        raise CatalogLoadError(f"missing {families_path}")

    raw_families = _read_yaml(families_path)
    if not isinstance(raw_families, dict) or "families" not in raw_families:
        raise CatalogLoadError(f"{families_path} must be a mapping with a 'families' list")

    try:
        families = [Family.model_validate(f) for f in raw_families["families"]]
    except ValidationError as e:
        raise CatalogLoadError(f"family schema error in {families_path}:\n{e}") from e

    family_ids = {fam.id for fam in families}
    families_dir = catalog_root / "families"
    if not families_dir.exists():
        raise CatalogLoadError(f"missing {families_dir}")

    seen_ids: set[str] = set()
    features: list[Feature] = []
    for yaml_path in sorted(families_dir.glob("*.yaml")):
        family_id = yaml_path.stem
        if family_id not in family_ids:
            raise CatalogLoadError(
                f"{yaml_path} has no matching entry in _families.yaml — "
                f"add {family_id!r} there or rename the file"
            )
        raw = _read_yaml(yaml_path)
        if raw is None:
            continue  # empty file is allowed
        if not isinstance(raw, list):
            raise CatalogLoadError(f"{yaml_path} must be a top-level list of features")

        for idx, item in enumerate(raw):
            if not isinstance(item, dict):
                raise CatalogLoadError(f"{yaml_path}[{idx}] is not a mapping")
            declared_family = item.get("family")
            if declared_family is not None and declared_family != family_id:
                raise CatalogLoadError(
                    f"{yaml_path}[{idx}] declares family={declared_family!r} "
                    f"but lives in {family_id!r}.yaml"
                )
            item["family"] = family_id  # auto-fill so downstream sees a consistent value
            try:
                feature = Feature.model_validate(item)
            except ValidationError as e:
                raise CatalogLoadError(
                    f"feature schema error in {yaml_path}[{idx}] (id={item.get('id')!r}):\n{e}"
                ) from e

            if feature.id in seen_ids:
                raise CatalogLoadError(
                    f"duplicate feature id {feature.id!r} (second occurrence in {yaml_path})"
                )
            seen_ids.add(feature.id)
            features.append(feature)

    # Cross-reference: every `related` id must resolve.
    for feature in features:
        for ref in feature.related:
            if ref not in seen_ids:
                raise CatalogLoadError(
                    f"feature {feature.id!r} relates to {ref!r}, which doesn't exist"
                )

    return Catalog(families=families, features=features)


def default_catalog_root() -> Path:
    """Default location of `catalog/` relative to this package.

    Walks up from the package dir until it finds `catalog/_families.yaml`.
    Lets the CLI work whether you run `fcat` from the repo root or from
    `tools/feature-catalog/`.
    """
    here = Path(__file__).resolve()
    for parent in [here, *here.parents]:
        candidate = parent / "catalog" / "_families.yaml"
        if candidate.exists():
            return candidate.parent
    raise CatalogLoadError(
        "could not locate catalog/ — pass --root explicitly or run from "
        "inside tools/feature-catalog/"
    )
