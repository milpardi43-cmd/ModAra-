#!/usr/bin/env python3
"""Split each transparent look cut-out into exact, full-canvas garment layers.

The source look remains the source of truth. Watershed labels only decide which
source pixels belong to the top, trousers, or shoes; RGB values and alpha edges
are retained. No product pixels are synthesized or recolored.

Install the optional image-tool dependencies with:
  python3 -m pip install -r scripts/requirements-rack-layers.txt
Then run:
  npm run images:rack-layers
"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "public/images/rack/outfits-cleaned"
OUTPUT_DIR = ROOT / "public/images/rack/outfit-layers"
METADATA_FILE = ROOT / "src/lib/rackOutfitLayerInfo.ts"

# The floral midi dress is a one-piece garment; the remaining looks contain
# trousers on the separate clip hanger visible in the source cut-out.
ONE_PIECE_LOOKS = {"midi-dress-floral-women"}


def connected_objects(alpha: np.ndarray) -> tuple[np.ndarray, list[tuple[int, int, int, int, int]]]:
    """Return component labels and their (x, y, w, h, area) stats."""
    count, labels, stats, _ = cv2.connectedComponentsWithStats(
        (alpha > 16).astype(np.uint8), connectivity=8
    )
    return labels, [tuple(map(int, stats[index])) for index in range(1, count)]


def make_masks(rgba: np.ndarray, slug: str) -> tuple[dict[str, np.ndarray], int]:
    height, width = rgba.shape[:2]
    alpha = rgba[:, :, 3]
    labels, components = connected_objects(alpha)

    shoes = np.zeros((height, width), dtype=bool)
    floor_shadow = np.zeros((height, width), dtype=bool)
    for index, (x, y, box_width, box_height, area) in enumerate(components, start=1):
        centroid_y, _ = np.argwhere(labels == index).mean(axis=0)
        ratio = box_width / max(box_height, 1)
        if (
            area > 500
            and centroid_y > height * 0.58
            and ratio < 1.65
            and box_height > height * 0.07
        ):
            shoes |= labels == index
        elif (
            area > 300
            and centroid_y > height * 0.84
            and ratio > 1.8
            and box_width > width * 0.22
        ):
            # A detached, broad oval is a synthetic floor-shadow artifact,
            # not part of the garment or shoe cut-out.
            floor_shadow |= labels == index

    # Extend the shoe masks just enough to keep antialiased edges while not
    # pulling in the detached shadow below the pair.
    shoe_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    shoes = (
        cv2.dilate(shoes.astype(np.uint8), shoe_kernel).astype(bool)
        & (alpha > 0)
        & ~floor_shadow
    )
    shadow_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    floor_shadow = cv2.dilate(floor_shadow.astype(np.uint8), shadow_kernel).astype(bool)

    apparel = (alpha > 16) & ~shoes & ~floor_shadow
    markers = np.zeros((height, width), dtype=np.int32)
    markers[~apparel] = 1  # known transparent background / separate footwear

    def seed(label: int, box: tuple[float, float, float, float]) -> int:
        x1, y1, x2, y2 = box
        left, right = round(x1 * width), round(x2 * width)
        top, bottom = round(y1 * height), round(y2 * height)
        region = markers[top:bottom, left:right]
        valid = apparel[top:bottom, left:right]
        region[valid] = label
        return int(np.count_nonzero(valid))

    top_seed_count = seed(2, (0.08, 0.14, 0.43, 0.56))
    has_trousers = slug not in ONE_PIECE_LOOKS
    trouser_seed_count = 0
    if has_trousers:
        trouser_seed_count += seed(3, (0.76, 0.20, 0.98, 0.70))
        # Many short tops overlap the upper edge of the trousers. Add a
        # confidently visible lower-leg seed so that overlap is assigned to
        # the trousers rather than leaking into the top layer.
        if slug != "trench-coat-camel-women":
            trouser_seed_count += seed(3, (0.50, 0.67, 0.63, 0.80))

    if top_seed_count < 500 or (has_trousers and trouser_seed_count < 500):
        raise RuntimeError(f"Could not place reliable segmentation seeds for {slug}")

    if has_trousers:
        rgb = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2BGR)
        segmented = cv2.watershed(rgb, markers)
        top_core = (segmented == 2) & apparel
        trouser_core = (segmented == 3) & apparel
        if not top_core.any() or not trouser_core.any():
            raise RuntimeError(f"Watershed produced an empty garment layer for {slug}")

        # Partition antialiased and watershed-boundary pixels by the nearest
        # confidently labelled garment region; this keeps the cut-out complete.
        top_distance = cv2.distanceTransform((~top_core).astype(np.uint8), cv2.DIST_L2, 5)
        trouser_distance = cv2.distanceTransform(
            (~trouser_core).astype(np.uint8), cv2.DIST_L2, 5
        )
        all_apparel = (alpha > 0) & ~shoes & ~floor_shadow
        is_top = top_distance <= trouser_distance
        top_mask = all_apparel & is_top
        trouser_mask = all_apparel & ~is_top
    else:
        top_mask = (alpha > 0) & ~shoes & ~floor_shadow
        trouser_mask = np.zeros((height, width), dtype=bool)

    masks = {"top": top_mask, "trousers": trouser_mask, "shoes": shoes}
    coverage = sum(mask.astype(np.uint8) for mask in masks.values())
    visible_source = (alpha > 0) & ~floor_shadow
    missing = int(np.count_nonzero(visible_source & (coverage == 0)))
    overlap = int(np.count_nonzero(coverage > 1))
    if missing or overlap:
        raise RuntimeError(f"Layer masks for {slug} are not a clean partition: missing={missing}, overlap={overlap}")

    return masks, int(np.count_nonzero(floor_shadow))


def hanger_pivot_x(mask: np.ndarray, fallback: float) -> float:
    """Estimate a hanger-hook pivot from the upper 12% of its own cut-out."""
    height, width = mask.shape
    upper = mask[: max(1, round(height * 0.12)), :]
    ys, xs = np.nonzero(upper)
    if len(xs) < 8:
        return fallback
    return round(float(np.median(xs)) / width, 4)


def write_metadata(records: dict[str, dict[str, object]]) -> None:
    lines = [
        "/** Generated from the transparent outfit cut-outs by split-rack-outfits.py. */",
        "export type RackOutfitLayerInfo = {",
        "  hasTrousers: boolean;",
        "  topPivotX: number;",
        "  trousersPivotX: number | null;",
        "};",
        "",
        "export const rackOutfitLayerInfo: Record<string, RackOutfitLayerInfo> = {",
    ]
    for slug, record in sorted(records.items()):
        trousers_pivot = (
            "null" if record["trousersPivotX"] is None else str(record["trousersPivotX"])
        )
        lines.append(
            f"  '{slug}': {{ hasTrousers: {str(record['hasTrousers']).lower()}, "
            f"topPivotX: {record['topPivotX']}, trousersPivotX: {trousers_pivot} }},"
        )
    lines.extend(["};", ""])
    METADATA_FILE.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    sources = sorted(SOURCE_DIR.glob("*.webp"))
    if not sources:
        raise RuntimeError(f"No source outfit cut-outs found in {SOURCE_DIR}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    metadata: dict[str, dict[str, object]] = {}
    total_shadow_pixels = 0

    for source in sources:
        slug = source.stem
        rgba = np.array(Image.open(source).convert("RGBA"))
        masks, removed_shadow = make_masks(rgba, slug)
        total_shadow_pixels += removed_shadow

        for name, mask in masks.items():
            if name == "trousers" and not mask.any():
                continue
            layer = rgba.copy()
            layer[:, :, 3] = np.where(mask, rgba[:, :, 3], 0).astype(np.uint8)
            Image.fromarray(layer, mode="RGBA").save(
                OUTPUT_DIR / f"{slug}-{name}.webp",
                format="WEBP",
                lossless=True,
                method=6,
            )

        metadata[slug] = {
            "hasTrousers": bool(masks["trousers"].any()),
            "topPivotX": hanger_pivot_x(masks["top"], 0.32),
            "trousersPivotX": (
                hanger_pivot_x(masks["trousers"], 0.76)
                if masks["trousers"].any()
                else None
            ),
        }
        print(
            f"{slug}: top={int(masks['top'].sum())}, "
            f"trousers={int(masks['trousers'].sum())}, "
            f"shoes={int(masks['shoes'].sum())}, "
            f"detached-shadow-pixels-removed={removed_shadow}"
        )

    write_metadata(metadata)
    print(
        f"Generated {len(sources)} layered looks in {OUTPUT_DIR.relative_to(ROOT)} "
        f"({total_shadow_pixels} detached shadow pixels removed)."
    )


if __name__ == "__main__":
    main()
