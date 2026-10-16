"""Rebuild screenshots/lab-outcomes.png from the unchanged evaluation CSV.

Chart contract
--------------
Question: How do the available lab runs compare in recorded triage time and
analyst steps? Takeaway: Integrated runs have lower recorded mean time and
steps than manual runs; model-only runs omit intelligence lookups.
Surface: GitHub README, explicit static PNG, Pillow renderer; 1600 x 850 px.
Form: Two horizontal bar panels, one per measure, zero-based independent axes.
Data: All 15 CSV rows (A=5, B=3, C=7), grouped by pipeline, no row substitution.
The three groups are the actual discrete comparison; no additional categories
or outcomes are inferred. Source notes document unequal scenario coverage and
recorded-duration versus clock-time differences in results/README.md.
Palette: Dark containing README illustration; cyan root for the integrated
mode, neutral fills for comparators, direct labels and semantic A/B/C order.
QA: Inspect the generated PNG at its exported size and in the README.

Requires Pillow. Run from any directory: python scripts/generate-outcome-chart.py
"""

from __future__ import annotations

import csv
from collections import defaultdict
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "results" / "evaluation-results.csv"
OUTPUT = ROOT / "screenshots" / "lab-outcomes.png"
SIZE = (1600, 850)
SCALE = 2

COLORS = {
    "background": "#06121d",
    "text": "#edf5fa",
    "muted": "#a2b4c4",
    "grid": "#263746",
    "manual": "#72899b",
    "model": "#a8bac8",
    "integrated": "#24d2de",
    "accent": "#24d2de",
}


def decimal_label(value: Decimal, places: int = 1) -> str:
    """Format only the displayed label; calculate all comparisons unrounded."""
    return str(value.quantize(Decimal(10) ** -places, rounding=ROUND_HALF_UP))


def get_metrics() -> dict[str, dict[str, Decimal | int]]:
    groups: dict[str, list[dict[str, str]]] = defaultdict(list)
    with SOURCE.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            if row["pipeline"] not in {"A", "B", "C"}:
                raise ValueError(f"Unexpected pipeline: {row['pipeline']!r}")
            groups[row["pipeline"]].append(row)
    metrics = {}
    for mode in ("A", "B", "C"):
        rows = groups[mode]
        if not rows:
            raise ValueError(f"No evaluation rows for mode {mode}")
        count = len(rows)
        times = [Decimal(row["triage_time_s"]) for row in rows]
        steps = [Decimal(row["analyst_steps"]) for row in rows]
        if min(times) < 0 or min(steps) < 0:
            raise ValueError("Time and analyst step counts must be nonnegative")
        metrics[mode] = {
            "count": count,
            "time": sum(times) / count,
            "steps": sum(steps) / count,
        }
    return metrics


def font_path(bold: bool) -> str:
    """Use the host UI font, with common cross-platform fallbacks."""
    candidates = (
        [Path("C:/Windows/Fonts/seguisb.ttf"), Path("C:/Windows/Fonts/segoeuib.ttf")]
        if bold
        else [Path("C:/Windows/Fonts/segoeui.ttf")]
    )
    candidates += [
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else
             "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else
             "/System/Library/Fonts/Supplemental/Arial.ttf"),
    ]
    for path in candidates:
        if path.is_file():
            return str(path)
    raise FileNotFoundError("Install Segoe UI, DejaVu Sans, or Arial to render the chart")


def main() -> None:
    metrics = get_metrics()
    reductions = {
        measure: (1 - metrics["C"][measure] / metrics["A"][measure]) * 100
        for measure in ("time", "steps")
    }
    image = Image.new("RGB", (SIZE[0] * SCALE, SIZE[1] * SCALE), COLORS["background"])
    draw = ImageDraw.Draw(image)
    fonts: dict[tuple[int, bool], ImageFont.FreeTypeFont] = {}

    def text(x, y, value, size=26, color="text", bold=False, anchor=None):
        key = (size, bold)
        if key not in fonts:
            fonts[key] = ImageFont.truetype(font_path(bold), size * SCALE)
        draw.text((round(x * SCALE), round(y * SCALE)), value,
                  font=fonts[key], fill=COLORS.get(color, color), anchor=anchor)

    def line(coords, color="grid", width=1):
        draw.line(tuple(round(point * SCALE) for point in coords),
                  fill=COLORS.get(color, color), width=width * SCALE)

    def rectangle(coords, color):
        draw.rectangle(tuple(round(point * SCALE) for point in coords),
                       fill=COLORS.get(color, color))

    text(70, 41, "LAB EVALUATION", 22, "accent", True)
    text(70, 77, "Recorded triage time and analyst effort", 46, bold=True)
    text(70, 142, "15 recorded runs · 5 scenarios · A: manual  /  B: model only  /  C: integrated", 26, "muted")

    # KPI comparisons use exact Decimal means before display rounding.
    for x, measure, caption in (
        (70, "time", "lower mean recorded triage time"),
        (850, "steps", "fewer mean analyst steps"),
    ):
        line((x, 205, x + 680, 205), "accent", 3)
        text(x, 219, f"{decimal_label(reductions[measure])}%", 60, "accent", True)
        text(x, 293, caption, 29, bold=True)
        text(x, 335, "Integrated (C) compared with manual (A)", 23, "muted")

    labels = {"A": "A  Manual", "B": "B  Model only", "C": "C  Integrated"}
    fills = {"A": "manual", "B": "model", "C": "integrated"}
    positions = [472, 555, 638]

    for label_x, plot_x, measure, title, maximum, ticks in (
        (70, 315, "time", "Mean triage time · seconds", 250, [0, 100, 200]),
        (850, 1095, "steps", "Mean analyst steps", 8, [0, 2, 4, 6, 8]),
    ):
        text(label_x, 401, title, 28, bold=True)
        plot_width = 390
        for tick in ticks:
            tick_x = plot_x + tick / maximum * plot_width
            line((tick_x, 460, tick_x, 687), width=1)
            text(tick_x, 697, str(tick), 21, "muted", anchor="mt")
        for mode, y in zip(("A", "B", "C"), positions):
            text(label_x, y, labels[mode], 28, bold=mode == "C")
            text(label_x, y + 35, f"n = {metrics[mode]['count']} runs", 21, "muted")
            width = float(metrics[mode][measure]) / maximum * plot_width
            rectangle((plot_x, y + 9, plot_x + width, y + 46), fills[mode])
            value = decimal_label(metrics[mode][measure])
            text(plot_x + width + 12, y + 9, value, 27, bold=True)

    line((70, 744, 1530, 744), width=1)
    text(70, 761, "Source: results/evaluation-results.csv · Recorded lab averages; unequal scenario coverage.", 23, "muted")
    text(70, 797, "Model-only omits enrichment lookups. Timing definitions and notes: results/README.md.", 23, "muted")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    image.resize(SIZE, Image.Resampling.LANCZOS).save(OUTPUT, optimize=True)
    print(f"Chart: {OUTPUT}")
    for mode in ("A", "B", "C"):
        print(f"{mode}: {metrics[mode]}")
    print(f"Integrated/manual reductions: {reductions}")


if __name__ == "__main__":
    main()
