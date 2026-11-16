#!/usr/bin/env python3
"""Prepare the hero's try-on artwork.

The stage paints each look with `mix-blend-mode: multiply` on page paper (#f3efe8),
so a plate does not need a cut-out mask — it needs its **backdrop to be exactly the
page colour**. A mask was tried first and is the wrong tool: any alpha edge over a
cream knit reads as a halo, and a cast shadow that touches the frame cannot be
segmented away at all.

Instead the studio's own backdrop light is measured from the photograph and divided
out. The backdrop is not flat (the key light leaves a soft gradient), and a surface
fitted only to the frame border cannot see the interior, which leaves a faint
rectangle exactly where the plate is. So the surface is fitted over the whole frame
with iterative re-weighting: the figure is dark or patterned and has a large
residual, so its weight falls to zero, while the backdrop — most of the pixels —
holds the fit.

    python3 scripts/tryon_plates.py split  <pair.png> <out-dir> <base>
    python3 scripts/tryon_plates.py finish <panel.png> <out.webp>
    python3 scripts/tryon_plates.py check  <plate.webp>

`split` cuts a two-panel generation at the emptiest gap of paper near its middle,
`finish` normalises the backdrop and re-seats the figure, `check` reports how far the
backdrop of a finished plate sits from the page colour. Requires numpy + pillow.
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

PAPER = np.array([0xF3, 0xEF, 0xE8], dtype=np.float32)
# The stage multiplies the plate onto the page, and a WHITE plate multiplied onto paper
# returns the paper untouched. So the plate's backdrop is driven to pure white, not to
# the page colour: white needs no feather, cannot leave a rectangle, and a cast shadow
# that runs off the canvas simply stops mattering.
WHITE = np.array([255.0, 255.0, 255.0], dtype=np.float32)
OUT_W, OUT_H = 896, 1200
FLOOR_GAP = 18          # px of paper under the soles; shipped art measures 15–22
FIGURE_TOL = 14         # channel distance from the page at which a pixel is "figure"
BACKDROP_FLOOR = 196   # min channel above which a pixel is still lit studio, not cloth
GARMENT_STEP = 24      # how much darker than its surroundings a garment edge is
PAD = 44                # px of studio kept around the figure, so the shadow is not cut
MAX_SCALE = 1.6         # a 3:4 generation is 768px tall; the stage shows it at ~507
TARGET_HEIGHT = 0.87    # fraction of the frame the figure should occupy
TARGET_WIDTH = 0.62     # ...and its widest case, so a coat cannot overflow the stage
PAD_FRACTION = 0.45     # ...widened on narrow panels: a cast shadow runs sideways


def backdrop_surface(a, block=32, floor=196):
    """The studio wall's brightness, measured locally, across the whole frame.

    A global polynomial is the wrong model: this studio's wall has a real step in it (a
    lit panel ends, or a cyc sweep turns away) of about 30 levels, which no smooth global
    surface follows - it either smears the step or, worse, extrapolates past white at the
    frame edge and leaves pale grey columns on the page.

    Instead the frame is tiled, each tile takes its MEDIAN (the wall dominates most
    tiles), and tiles the figure has taken over are rejected outright - a tile still
    shows wall in its darkest quarter if it is usable. The survivors are interpolated
    into a smooth field, and any tile left with no usable neighbour borrows the nearest
    real measurement, so nothing is ever invented beyond what was seen.
    """
    h, w, _ = a.shape
    ny, nx = -(-h // block), -(-w // block)
    padded = np.pad(a, ((0, ny * block - h), (0, nx * block - w), (0, 0)), mode='edge')
    tiles = padded.reshape(ny, block, nx, block, 3).transpose(0, 2, 1, 3, 4)
    grain = tiles.reshape(ny, nx, block * block, 3)
    median = np.median(grain, axis=2)                                  # ny, nx, 3
    usable = np.percentile(grain.min(axis=3), 15, axis=2) > floor

    if not usable.any():
        return np.full_like(a, 235.0)
    # fill unusable tiles from the nearest usable one
    nearest = ndimage.distance_transform_edt(~usable, return_distances=False, return_indices=True)
    field = median[nearest[0], nearest[1]]

    # smooth, local upsample: order 1 keeps the step sharp, order 3 would ring across it
    coords = np.meshgrid(
        np.linspace(0, ny - 1, h), np.linspace(0, nx - 1, w), indexing='ij')
    return np.stack([
        ndimage.map_coordinates(field[..., c], coords, order=1, mode='nearest')
        for c in range(3)], axis=-1)


def normalise(a):
    """Divide the backdrop out so the studio becomes pure white.

    Whatever the studio's light was doing across the frame, dividing it out makes every
    backdrop pixel 255; multiplied onto the page those pixels are a no-op, so the plate
    has no visible edge anywhere and needs no mask, feather or crop.
    """
    b = np.clip(a * (WHITE[None, None, :] / np.clip(backdrop_surface(a), 1, None)), 0, 255)

    # What is left on the wall is soft gradient and the model's own shadow. Far from the
    # model nothing but wall can be casting anything, so that ground is flattened to
    # white outright; close to the model the shading is kept, because there it is a real
    # contact shadow and it is what stops the figure from looking pasted on.
    # The studio's paper has hairline seams, and a straight 1px line is the one artefact
    # the eye finds instantly on a flat page. A 5px median removes anything that thin
    # while leaving real shading alone, and it is applied to the backdrop only.
    tone = b.min(axis=2)
    subject = tone < 200
    smoothed = np.stack([ndimage.median_filter(b[..., c], size=5) for c in range(3)], axis=-1)
    b = np.where(subject[..., None], b, smoothed)

    floor_gap = 10
    near = ndimage.distance_transform_edt(~subject) <= floor_gap
    blend = ndimage.gaussian_filter(near.astype(np.float32), 4)[..., None]
    b = b * blend + WHITE * (1 - blend)

    # Graders clip highlights; a bare 255 is the studio blowing out, never a garment
    # detail, so it is safe to flatten anything within a couple of units of white.
    return np.where(b.min(axis=2, keepdims=True) >= 252, WHITE, b)


def figure_box(rgb, tol=FIGURE_TOL):
    """Bounding box of the model.

    Measured from DARK deviation only. The studio's wall is a touch brighter than the
    page and the key light leaves a bright pool behind the head, so a plain distance
    test counts the backdrop as subject and crops to the wall's edge instead of the
    figure's — which is what put a hot vertical band at the left of a plate.
    """
    dark = np.clip(PAPER[None, None, :] - rgb, 0, None).max(axis=2)
    rows = np.where((dark > tol).sum(axis=1) > 2)[0]
    cols = np.where((dark > tol).sum(axis=0) > 2)[0]
    if len(rows) == 0 or len(cols) == 0:
        return None
    return int(cols.min()), int(rows.min()), int(cols.max()), int(rows.max())


def smoothstep_outside(axis, lo, hi, reach):
    """1 inside [lo, hi], easing to 0 over `reach` px outside it on either side."""
    before = np.clip((axis - (lo - reach)) / max(reach, 1.0), 0, 1)
    after = np.clip(((hi + reach) - axis) / max(reach, 1.0), 0, 1)
    t = np.minimum(before, after)
    return t * t * (3 - 2 * t)


def split(src, outdir, base):
    a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    h, w, _ = a.shape
    # normalise first: the split then measures distance from the page, not from a
    # corner sample that the studio's own gradient would bias
    b = normalise(a)
    delta = np.abs(b - PAPER[None, None, :]).max(axis=2)

    lo, hi = int(w * 0.34), int(w * 0.66)
    hits = (delta > FIGURE_TOL).sum(axis=0)
    seam = lo + int(np.argmin(hits[lo:hi]))
    left = right = seam
    while left > lo and hits[left - 1] == 0:
        left -= 1
    while right < hi and hits[right + 1] == 0:
        right += 1
    cut = (left + right) // 2 if right - left >= 6 else seam

    for name, (x0, x1) in (('male', (0, cut)), ('female', (cut, w))):
        panel = b[:, x0:x1]
        box = figure_box(panel)
        if box is None:
            raise SystemExit('empty %s panel in %s' % (name, src))
        c0, r0, c1, r1 = box
        panel = panel[max(0, r0 - 20):min(panel.shape[0], r1 + 21),
                      max(0, c0 - 24):min(panel.shape[1], c1 + 25)]
        Image.fromarray(np.clip(panel, 0, 255).astype(np.uint8)).save(
            '%s/%s-%s.png' % (outdir, base, name))
        print('%s panel %dx%d (seam %d)' % (name, panel.shape[1], panel.shape[0], cut))


def finish(src, dst):
    """Normalise the backdrop to white and seat the figure on the stage's floor."""
    raw = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    box = figure_box(raw)
    b = normalise(raw)
    if box is None:
        raise SystemExit('no figure detected in ' + src)
    c0, r0, c1, r1 = box
    fig_w, fig_h = c1 - c0 + 1, r1 - r0 + 1

    # Keep the studio around the figure so a cast shadow is never sliced off.
    pad_x = max(PAD, int(fig_w * PAD_FRACTION))
    pad_y = PAD
    p0, q0 = max(0, c0 - pad_x), max(0, r0 - pad_y)
    p1, q1 = min(b.shape[1], c1 + pad_x + 1), min(b.shape[0], r1 + pad_y + 1)

    # re-seat: the stage anchors the composite to its floor, so every look's soles must
    # land the same distance above the bottom of the frame
    scale = min(OUT_W * TARGET_WIDTH / fig_w, (OUT_H - FLOOR_GAP) * TARGET_HEIGHT / fig_h, MAX_SCALE)
    crop = Image.fromarray(np.clip(b, 0, 255).astype(np.uint8)).crop((p0, q0, p1, q1))
    size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
    patch = np.asarray(crop.resize(size, Image.LANCZOS)).astype(np.float32)
    patch = np.where(patch.min(axis=2, keepdims=True) >= 252, WHITE, patch)

    plate = Image.new('RGB', (OUT_W, OUT_H), (255, 255, 255))
    plate.paste(Image.fromarray(np.clip(patch, 0, 255).astype(np.uint8)),
                ((OUT_W - size[0]) // 2, OUT_H - FLOOR_GAP - size[1]))
    plate.save(dst, lossless=True, method=6)
    print('figure=%dx%d pad=%dx%d scale=%.2f floor_gap=%d'
          % (fig_w, fig_h, pad_x, pad_y, scale, FLOOR_GAP))
    check(dst)


def check(src):
    """Assert a plate's outer ring is white, i.e. invisible under `multiply`."""
    a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    side, top, bottom = 40, 40, FLOOR_GAP - 4   # the soles legitimately reach the floor
    ring = np.concatenate([
        a[:top].reshape(-1, 3), a[-bottom:].reshape(-1, 3),
        a[:, :side].reshape(-1, 3), a[:, -side:].reshape(-1, 3)])
    delta = 255.0 - ring.min(axis=1)
    worst = float(delta.max())
    status = 'ok' if worst <= 2.0 else 'FAIL'
    print('ring deviation from white: max=%.1f p99=%.1f %s'
          % (worst, float(np.percentile(delta, 99)), status))
    return 0 if status == 'ok' else 1


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    command = sys.argv[1]
    if command == 'split':
        split(*sys.argv[2:5])
    elif command == 'finish':
        finish(*sys.argv[2:4])
    elif command == 'check':
        sys.exit(check(sys.argv[2]))
    else:
        raise SystemExit(__doc__)
