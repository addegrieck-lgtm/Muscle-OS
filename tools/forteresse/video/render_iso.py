"""Rendu isométrique de la vraie carte (voxels du générateur) : vue large et gros plan, portes fermées / ouvertes."""
import json, math, pickle, runpy, sys
import numpy as np
from PIL import Image, ImageDraw

GEN = "/home/user/Muscle-OS/tools/forteresse/generer_forteresse.py"
OUT = sys.argv[1]
g = runpy.run_path(GEN, run_name="lib")
vox, palette, C, G, H, W, L = g["vox"], g["palette"], g["C"], g["G"], g["H"], g["W"], g["L"]
inv = {v: k for k, v in palette.items()}
names = {v: k.split("[")[0].replace("minecraft:", "") for k, v in palette.items()}
GATES = g["GATES"]

SKIP = {"air", "short_grass", "fern", "large_fern", "brown_mushroom", "red_mushroom", "poppy", "lily_of_the_valley", "blue_orchid"}
BASE = [("birch_leaves", (118, 160, 72)), ("spruce_leaves", (44, 82, 56)), ("dark_oak_leaves", (42, 86, 34)), ("azalea", (86, 132, 52)),
        ("leaves", (64, 118, 46)), ("birch_log", (215, 210, 200)), ("_log", (92, 70, 46)), ("podzol", (104, 76, 42)),
        ("moss", (88, 122, 46)), ("grass_block", (98, 148, 62)), ("gold_block", (246, 204, 70)), ("gilded", (150, 112, 52)),
        ("red_nether", (128, 22, 28)), ("red_stained", (214, 36, 50)), ("red_wool", (206, 32, 44)), ("red_carpet", (180, 30, 40)),
        ("banner", (190, 30, 42)), ("shroomlight", (250, 160, 70)), ("deepslate", (64, 64, 74)), ("basalt", (84, 84, 92)),
        ("blackstone", (44, 40, 48)), ("dirt_path", (152, 122, 80)), ("gravel", (128, 124, 120)), ("coarse_dirt", (112, 86, 58)),
        ("dirt", (118, 88, 58)), ("iron_bars", (190, 192, 204)), ("mossy", (96, 116, 92)), ("cobble", (112, 114, 112)),
        ("andesite", (132, 132, 134)), ("stone", (120, 122, 124)), ("lantern", (255, 214, 120)), ("campfire", (255, 140, 50)),
        ("chain", (60, 60, 70)), ("fence", (66, 48, 34)), ("wall", (58, 54, 62))]


def color_of(n):
    for k, c in BASE:
        if k in n:
            return c
    return (150, 150, 150)


COL = np.zeros((len(palette), 3), dtype=np.float32)
for v, n in names.items():
    COL[v] = color_of(n)
EMISSIVE = {v for v, n in names.items() if any(k in n for k in ("lantern", "shroomlight", "campfire", "gold_block", "red_stained"))}
skip_ids = np.array([names[v] in SKIP for v in range(len(palette))])


def render(scale, x0, x1, z0, z1, open_gates, path):
    v = vox[:, z0:z1, x0:x1].copy()
    if open_gates:
        for gt in GATES:
            for x in range(gt["min"][0], gt["max"][0] + 1):
                for z in range(gt["min"][2], gt["max"][2] + 1):
                    for y in range(gt["min"][1], gt["max"][1] + 1):
                        X, Y, Z = x + C - x0, y + G + 1, z + C - z0
                        if 0 <= X < v.shape[2] and 0 <= Z < v.shape[1]:
                            v[Y, Z, X] = 0
    solid = ~skip_ids[v]
    hh, ll, ww = v.shape
    # Exposé si une face visible (+x, +z, +y) donne sur du vide
    pad = np.zeros((hh + 1, ll + 1, ww + 1), dtype=bool)
    pad[:hh, :ll, :ww] = solid
    exposed = solid & (~pad[1:, :ll, :ww] | ~pad[:hh, 1:, :ww] | ~pad[:hh, :ll, 1:])
    # Ombre douce : quelque chose au-dessus dans les 14 blocs
    above = np.zeros_like(solid)
    acc = np.zeros((ll, ww), dtype=bool)
    for y in range(hh - 1, -1, -1):
        above[y] = acc
        acc = acc | solid[y]
    ys, zs, xs = np.nonzero(exposed)
    order = np.argsort(xs + zs + ys, kind="stable")
    ys, zs, xs = ys[order], zs[order], xs[order]
    c, s = 0.8660254, scale
    Wpx = int((ww + ll) * s * c) + 4
    Hpx = int((ww + ll) * s * 0.5 + hh * s) + 4
    ox = ll * s * c + 2
    oy = hh * s + 2
    canvas = np.zeros((Hpx, Wpx, 3), dtype=np.float32)
    alpha = np.zeros((Hpx, Wpx), dtype=bool)

    # Gabarits des trois faces (coordonnées locales du sprite)
    def P(px, py, pz):
        return ((px - pz) * s * c, (px + pz) * s * 0.5 - py * s)

    sw = int(math.ceil(2 * s * c)) + 2
    sh = int(math.ceil(2 * s)) + 2
    bx, by = P(0, 1, 1)[0], P(0, 1, 0)[1]  # coin haut-gauche du sprite
    masks = []
    for poly in ([P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1)],          # dessus
                 [P(0, 1, 1), P(1, 1, 1), P(1, 0, 1), P(0, 0, 1)],          # face sud (+z), à gauche
                 [P(1, 1, 0), P(1, 1, 1), P(1, 0, 1), P(1, 0, 0)]):         # face est (+x), à droite
        im = Image.new("L", (sw, sh), 0)
        ImageDraw.Draw(im).polygon([(px - bx, py - by) for px, py in poly], fill=255)
        masks.append(np.array(im) > 127)
    shades = (1.0, 0.80, 0.62)
    bars_id = {v for v, n in names.items() if n == "iron_bars"}
    step = max(2, s // 3)
    stripe = (np.arange(sw)[None, :] // step) % 2 == 0
    rng = np.random.default_rng(3)
    for i in range(len(xs)):
        X, Y, Z = int(xs[i]), int(ys[i]), int(zs[i])
        b = int(v[Y, Z, X])
        px, py = P(X, Y, Z)
        sx = int(round(px + bx + ox)); sy = int(round(py + by + oy))
        if sx < 0 or sy < 0 or sx + sw > Wpx or sy + sh > Hpx:
            continue
        base = COL[b] * (0.92 + 0.16 * ((X * 73856093 ^ Z * 19349663 ^ Y * 83492791) % 97) / 97.0)
        sub = canvas[sy:sy + sh, sx:sx + sw]
        sa = alpha[sy:sy + sh, sx:sx + sw]
        shadow = 0.68 if above[Y, Z, X] and b not in EMISSIVE else 1.0
        for m, sd in zip(masks, shades):
            if b in bars_id:
                m = m & stripe
            k = 1.0 if b in EMISSIVE else sd
            sub[m] = base * k * (shadow if sd == 1.0 else 1.0)
            sa[m] = True
    img = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    a = Image.fromarray((alpha * 255).astype(np.uint8), "L")
    img.putalpha(a)
    img.save(path)
    meta = {"scale": s, "ox": ox + 0.0, "oy": oy + 0.0, "x0": x0, "z0": z0, "w": Wpx, "h": Hpx}
    return meta


metas = {}
metas["wide_closed"] = render(5, 0, W, 0, L, False, f"{OUT}/wide_closed.png")
metas["wide_open"] = render(5, 0, W, 0, L, True, f"{OUT}/wide_open.png")
metas["close_closed"] = render(12, C - 36, C + 37, C - 36, C + 37, False, f"{OUT}/close_closed.png")
metas["close_open"] = render(12, C - 36, C + 37, C - 36, C + 37, True, f"{OUT}/close_open.png")
data = {"metas": metas, "C": C, "G": G, "H": H, "TOP_Y": g["TOP_Y"], "FLOOR": g["FLOOR"], "N": g["N"], "STEP": g["STEP"],
        "spawns": g["spawn_points"](), "gates": GATES}
json.dump(data, open(f"{OUT}/scene.json", "w"))
print("ok", {k: (m["w"], m["h"]) for k, m in metas.items()})
