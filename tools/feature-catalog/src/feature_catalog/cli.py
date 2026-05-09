"""`fcat` CLI — list, show, validate, audit, render, coverage."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Annotated

import typer
from rich.console import Console
from rich.table import Table

from feature_catalog.audit import audit_catalog, find_repo_root
from feature_catalog.loader import CatalogLoadError, default_catalog_root, load_catalog
from feature_catalog.models import Catalog, Tier
from feature_catalog.render import (
    render_coverage,
    render_json,
    render_markdown,
    render_mermaid,
)

app = typer.Typer(
    add_completion=False,
    no_args_is_help=True,
    help="Feature catalog for the /coding workspace.",
)
console = Console()
err_console = Console(stderr=True, style="red")

# Argument types — annotate once, re-use across commands.
RootOpt = Annotated[
    Path | None,
    typer.Option("--root", help="Catalog root (folder containing _families.yaml). "
                                "Auto-detected if omitted."),
]


def _load(root: Path | None) -> Catalog:
    try:
        catalog_root = root or default_catalog_root()
        return load_catalog(catalog_root)
    except CatalogLoadError as e:
        err_console.print(str(e))
        raise typer.Exit(code=1) from e


_TIER_DISPLAY: dict[Tier, str] = {
    Tier.LEADING: "[blue]🔵 leading[/]",
    Tier.PARITY: "[green]🟢 parity[/]",
    Tier.PROGRESSIVE: "[yellow]🟡 progressive[/]",
    Tier.TABLE_STAKES: "[white]⚪ table-stakes[/]",
}


# ─── validate ────────────────────────────────────────────────────────────


@app.command()
def validate(root: RootOpt = None) -> None:
    """Schema + cross-reference check. Non-zero exit on failure."""
    catalog = _load(root)
    console.print(
        f"[green]✓[/] {len(catalog.features)} features across "
        f"{len(catalog.families)} families validated cleanly."
    )


# ─── list ────────────────────────────────────────────────────────────────


@app.command(name="list")
def list_features(
    root: RootOpt = None,
    family: Annotated[
        str | None, typer.Option("--family", "-f", help="Filter by family id")
    ] = None,
    tier: Annotated[
        Tier | None, typer.Option("--tier", "-t", help="Filter by tier")
    ] = None,
) -> None:
    """One row per feature, grouped by family."""
    catalog = _load(root)
    if family is not None and catalog.family(family) is None:
        err_console.print(
            f"unknown family {family!r}. Known: {', '.join(f.id for f in catalog.families)}"
        )
        raise typer.Exit(code=1)

    table = Table(show_header=True, header_style="bold", expand=True)
    table.add_column("ID", style="cyan", no_wrap=True)
    table.add_column("Family", style="magenta", no_wrap=True)
    table.add_column("Tier", no_wrap=True)
    table.add_column("Label")
    table.add_column("Pattern", style="dim")

    families_in_order = sorted(catalog.families, key=lambda f: (f.order, f.id))
    for fam in families_in_order:
        if family is not None and fam.id != family:
            continue
        feats = catalog.features_in(fam.id)
        feats.sort(key=lambda f: f.id)
        for feat in feats:
            if tier is not None and feat.tier != tier:
                continue
            table.add_row(
                feat.id,
                fam.id,
                _TIER_DISPLAY[feat.tier],
                feat.label,
                feat.pattern.source,
            )
    console.print(table)


# ─── show ────────────────────────────────────────────────────────────────


@app.command()
def show(
    feature_id: Annotated[str, typer.Argument(help="Feature id (e.g. voice-interim)")],
    root: RootOpt = None,
) -> None:
    """Full detail for one feature."""
    catalog = _load(root)
    feature = catalog.by_id(feature_id)
    if feature is None:
        err_console.print(f"unknown feature id {feature_id!r}")
        raise typer.Exit(code=1)

    console.print(f"[bold cyan]{feature.id}[/]")
    console.print(f"  [bold]{feature.label}[/]")
    console.print(f"  family   : {feature.family}")
    console.print(f"  tier     : {_TIER_DISPLAY[feature.tier]}")
    console.print(f"  status   : {feature.status}")
    console.print(f"  added in : {feature.added_in}")
    if feature.flags:
        console.print(f"  flags    : {', '.join(feature.flags)}")
    console.print()
    console.print(feature.description)
    console.print()
    console.print(f"  [bold]Pattern[/]   : {feature.pattern.source}")
    console.print(f"  [dim]rationale: {feature.pattern.rationale}[/]")

    if feature.evidence.symbols:
        console.print()
        console.print("  [bold]Evidence[/]")
        for sym in feature.evidence.symbols:
            console.print(f"    · {sym}")
    if feature.evidence.tests:
        for test in feature.evidence.tests:
            console.print(f"    · test: {test}")
    if feature.evidence.locales:
        for key in feature.evidence.locales:
            console.print(f"    · locale: {key}")

    if feature.sota.has_any():
        full, partial = feature.sota.count()
        console.print()
        console.print(
            f"  [bold]SOTA presence[/] : {full} full, {partial} partial "
            f"out of 8 surveyed"
        )
        for k, v in feature.sota.model_dump().items():
            if v is True:
                console.print(f"    · [green]✓[/] {k}")
            elif v == "partial":
                console.print(f"    · [yellow]◐[/] {k}")

    if feature.related:
        console.print()
        console.print("  [bold]Related[/]: " + ", ".join(feature.related))

    if feature.notes:
        console.print()
        console.print(f"  [italic]{feature.notes}[/]")


# ─── audit ───────────────────────────────────────────────────────────────


@app.command()
def audit(root: RootOpt = None) -> None:
    """Confirm every evidence path/symbol still exists in source."""
    catalog = _load(root)
    catalog_root = root or default_catalog_root()
    repo_root = find_repo_root(catalog_root)
    problems = audit_catalog(catalog, repo_root)
    if not problems:
        console.print(
            f"[green]✓[/] {len(catalog.features)} features audited; "
            "all evidence resolves."
        )
        return
    err_console.print(f"{len(problems)} audit problems:")
    for p in problems:
        err_console.print(f"  · {p}")
    raise typer.Exit(code=1)


# ─── coverage ────────────────────────────────────────────────────────────


@app.command()
def coverage(root: RootOpt = None) -> None:
    """Print SOTA coverage matrix as markdown to stdout."""
    catalog = _load(root)
    sys.stdout.write(render_coverage(catalog))


# ─── render ──────────────────────────────────────────────────────────────


@app.command()
def render(
    root: RootOpt = None,
    fmt: Annotated[
        str, typer.Option("--format", "-F", help="md | json | mermaid | coverage")
    ] = "md",
) -> None:
    """Emit the full catalog in the chosen format to stdout."""
    catalog = _load(root)
    if fmt == "md":
        sys.stdout.write(render_markdown(catalog))
    elif fmt == "json":
        sys.stdout.write(render_json(catalog))
    elif fmt == "mermaid":
        sys.stdout.write(render_mermaid(catalog))
    elif fmt == "coverage":
        sys.stdout.write(render_coverage(catalog))
    else:
        err_console.print(f"unknown format {fmt!r}; use md / json / mermaid / coverage")
        raise typer.Exit(code=1)


def main() -> None:  # pragma: no cover
    app()


if __name__ == "__main__":  # pragma: no cover
    main()
