"""Warzone VÆLORIA « Le Repos du Dragon » (Paper 1.21.4+), au format Sponge v2 (.schem, WorldEdit/FAWE).

Usage : python3 minecraft/warzone/generate.py   (Pillow + numpy ; réutilise minecraft/spawn)
Sorties dans minecraft/warzone/ :
  vaeloria-warzone.schem              la warzone : 17 × 17 chunks (272 × 272), dragon, bâtiments, 3 avant-postes
  vaeloria-avant-poste-exterieur.schem  délimitation d'un avant-poste extérieur de 3 × 3 chunks, à coller 4 fois
  apercu-*.png

Repère : x/z = 0 au centre de la warzone, qui est le CENTRE d'un chunk. Il faut donc coller depuis un bloc
dont X et Z valent 8 modulo 16 (ex. 8, 24, 1000, -8…) : les avant-postes tombent alors pile sur les chunks.
y = 0 au niveau des pieds sur le sol de la warzone, y = -1 = sol. Nord = -Z.
"""

from __future__ import annotations

import importlib.util
import math
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("vaeloria_spawn", HERE.parent / "spawn" / "generate.py")
_spawn = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_spawn)
LOGO_BLOCKS, Palette, write_schem, logo_grid = _spawn.LOGO_BLOCKS, _spawn.Palette, _spawn.write_schem, _spawn.logo_grid

HALF = 136  # bord : chunks -8..8 autour du chunk central → x, z de -136 à 135
YMIN, YMAX = -8, 62
PB = "minecraft:polished_blackstone_bricks"
DT = "minecraft:deepslate_tiles"

# Les trois avant-postes intérieurs : un chunk chacun, centrés sur des centres de chunk, à 120° autour du dragon.
OUTPOSTS = {
    "rubis": {"center": (0, -80), "glass": "minecraft:red_stained_glass", "line": "minecraft:red_nether_bricks"},
    "argent": {"center": (64, 48), "glass": "minecraft:white_stained_glass", "line": "minecraft:calcite"},
    "onyx": {"center": (-64, 48), "glass": "minecraft:black_stained_glass", "line": "minecraft:polished_blackstone"},
}
GATES = {"nord": (0, -1), "est": (1, 0), "sud": (0, 1), "ouest": (-1, 0)}
OUTER_D = 336  # centre des avant-postes extérieurs : 176 blocs au-delà du bord de la warzone
ARRIVAL = (0, 34, -4)  # pieds du joueur sur la plateforme, sur le dos du dragon


class Vol:
    def __init__(self, half=HALF, ymin=YMIN, ymax=YMAX):
        self.half, self.ymin, self.ymax = half, ymin, ymax
        self.pal = Palette()
        n = 2 * half
        self.v = np.zeros((ymax - ymin + 1, n, n), dtype=np.int32)

    def ok(self, x, y, z):
        return -self.half <= x < self.half and -self.half <= z < self.half and self.ymin <= y <= self.ymax

    def put(self, x, y, z, name):
        if self.ok(x, y, z):
            self.v[y - self.ymin, z + self.half, x + self.half] = self.pal(name)

    def get(self, x, y, z):
        if self.ok(x, y, z):
            return self.pal.names[self.v[y - self.ymin, z + self.half, x + self.half]]
        return "minecraft:air"

    def air(self, x, y, z):
        return self.ok(x, y, z) and self.v[y - self.ymin, z + self.half, x + self.half] == 0


def noise(x, z, s):
    return (math.sin(x * 0.043 + s) * math.cos(z * 0.051 + 1.3 * s) + 0.6 * math.sin((x + z) * 0.11 + 2.1 * s)
            + 0.3 * math.sin(x * 0.27 - z * 0.23 + s)) / 1.9


def line_pts(a, b, step=0.5):
    n = max(1, int(max(abs(b[i] - a[i]) for i in range(len(a))) / step))
    return [tuple(a[i] + (b[i] - a[i]) * k / n for i in range(len(a))) for k in range(n + 1)]


# ---------------------------------------------------------------------------------------------- sol et bordure

def ground(w, rng):
    for x in range(-HALF, HALF):
        for z in range(-HALF, HALF):
            n = noise(x, z, 1.7)
            top = "minecraft:pale_moss_block" if n > 0.15 else "minecraft:tuff" if n > -0.35 else "minecraft:cobbled_deepslate"
            if rng.random() < 0.03:
                top = "minecraft:cobbled_deepslate"
            w.put(x, -1, z, top)
            for y in range(-4, -1):
                w.put(x, y, z, "minecraft:tuff" if y > -3 else "minecraft:deepslate")
            for y in range(YMIN, -4):
                w.put(x, y, z, "minecraft:deepslate")
            if top == "minecraft:pale_moss_block" and rng.random() < 0.18:
                w.put(x, 0, z, "minecraft:pale_moss_carpet")
    # Cratères de bataille : creux peu profonds, fond en pierre noire, une veine de rubis.
    for cx, cz, r in ((-30, -40, 5), (40, -20, 6), (20, 70, 5), (-90, -10, 6), (95, -70, 5), (-40, 100, 5), (100, 95, 4), (-100, -95, 4)):
        for x in range(cx - r, cx + r + 1):
            for z in range(cz - r, cz + r + 1):
                d = math.hypot(x - cx, z - cz)
                if d <= r:
                    depth = 1 if d > r * 0.55 else 2
                    for y in range(-depth, 1):
                        w.put(x, y, z, "minecraft:air")
                    w.put(x, -depth - 1, z, "minecraft:deepslate_redstone_ore" if rng.random() < 0.08 else "minecraft:blackstone")


def road(w, a, b, width=2):
    for x, z in line_pts(a, b, 0.4):
        for dx in range(-width, width + 1):
            for dz in range(-width, width + 1):
                if abs(dx) + abs(dz) <= width + 1:
                    edge = abs(dx) == width or abs(dz) == width
                    xx, zz = round(x + dx), round(z + dz)
                    if w.get(xx, -1, zz) not in (PB, "minecraft:polished_blackstone"):
                        w.put(xx, -1, zz, PB if edge else "minecraft:polished_blackstone")
                    if w.get(xx, 0, zz) == "minecraft:pale_moss_carpet":
                        w.put(xx, 0, zz, "minecraft:air")


def border(w, rng):
    """Muret de 2 blocs sur le bord exact des chunks, pilier à chaque coin de chunk, 4 portes et des brèches."""
    breaches = {(-1, 40), (-1, -72), (1, 72), (1, -40)}  # (côté, position) : brèches à travers le muret

    def wall_at(t, c):
        return all(abs(t - p) > 2 for s, p in breaches if s == c)

    for t in range(-HALF, HALF):
        for side, coords in ((0, lambda t: (t, -HALF)), (1, lambda t: (t, HALF - 1)), (2, lambda t: (-HALF, t)), (3, lambda t: (HALF - 1, t))):
            x, z = coords(t)
            if abs(t) <= 3:
                continue  # portes au milieu de chaque côté
            c = -1 if side in (0, 2) else 1
            if not wall_at(t, c):
                if rng.random() < 0.6:
                    w.put(x, 0, z, "minecraft:cracked_polished_blackstone_bricks")
                continue
            corner = (t + 8) % 16 == 0 or t == HALF - 1
            h = 5 if corner else 2
            for y in range(0, h):
                w.put(x, y, z, PB if not corner or y in (0, h - 1) else DT)
            if corner:
                w.put(x, h, z, "minecraft:chiseled_polished_blackstone")
                w.put(x, h + 1, z, "minecraft:lantern[hanging=false]")
    for name, (dx, dz) in GATES.items():  # arches des portes
        cx, cz = dx * (HALF - 1 if dx > 0 else HALF), dz * (HALF - 1 if dz > 0 else HALF)
        tx, tz = (1, 0) if dz else (0, 1)
        for s in (-4, 4):
            for y in range(0, 9):
                w.put(cx + tx * s, y, cz + tz * s, PB if y in (0, 8) else DT)
        for s in range(-4, 5):
            w.put(cx + tx * s, 8, cz + tz * s, PB)
        for y, half in ((9, 0), (10, 1), (11, 1), (12, 0)):
            for s in range(-half, half + 1):
                w.put(cx + tx * s, y, cz + tz * s, "minecraft:redstone_block")


# ---------------------------------------------------------------------------------------------- dragon

def tube(w, pts, rng, belly=True, scale_mix=None):
    """Remplit une suite de sphères (x, y, z, r). Dos en écailles noires, ventre argent."""
    mix = scale_mix or ["minecraft:blackstone"] * 6 + [DT] * 3 + ["minecraft:polished_blackstone"] * 2 + [PB]
    for (cx, cy, cz, r) in pts:
        R = int(math.ceil(r))
        for x in range(-R, R + 1):
            for y in range(-R, R + 1):
                for z in range(-R, R + 1):
                    if x * x + y * y + z * z > r * r:
                        continue
                    X, Y, Z = round(cx + x), round(cy + y), round(cz + z)
                    if not w.air(X, Y, Z) and Y >= 0:
                        continue
                    if belly and y < -0.45 * r:
                        name = "minecraft:calcite" if (X + Z) % 3 else "minecraft:smooth_quartz"
                    else:
                        name = mix[int(rng.integers(len(mix)))]
                    if Y >= 0:
                        w.put(X, Y, Z, name)


def spline(ctrl, n):
    """Catmull-Rom sur des points (x, y, z, r)."""
    out = []
    P = [ctrl[0]] + ctrl + [ctrl[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            t = k / n
            out.append(tuple(0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t
                                    + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t ** 3) for j in range(4)))
    out.append(ctrl[-1])
    return out


def triangle(w, a, b, c, name, step=0.45):
    """Membrane : remplit le triangle abc."""
    for p in line_pts(b, c, step):
        for q in line_pts(a, p, step):
            X, Y, Z = (round(v) for v in q)
            if Y >= 0 and w.air(X, Y, Z):
                w.put(X, Y, Z, name)


def dragon(w, rng):
    """Dragon couché au centre, la tête au nord. On arrive sur son dos ; on descend par la queue ou par les ailes."""
    # Corps : du bassin (sud) au poitrail (nord). Le dos culmine sous la plateforme d'arrivée.
    body = spline([(0, 15, 22, 8.5), (0, 19, 10, 10.5), (0, 22, -4, 11.5), (0, 21, -16, 10.5)], 10)
    neck = spline([(0, 21, -16, 9), (0, 27, -27, 7), (0, 36, -34, 5.5), (0, 42, -38, 5)], 10)
    tail = spline([(0, 15, 22, 8), (12, 12, 34, 7), (30, 9, 34, 6), (42, 6, 18, 5), (44, 4, -4, 4),
                   (36, 2, -22, 3), (22, 1, -30, 2.2), (12, 1, -30, 1.6)], 10)
    for pts in (body, neck, tail):
        tube(w, pts, rng)
    # Tête : crâne, mâchoire, museau, cornes argent, yeux rubis.
    tube(w, [(0, 43, -41, 5.2), (0, 42, -46, 4.2), (0, 41, -51, 3.4), (0, 40, -55, 2.6)], rng)
    tube(w, [(0, 38, -44, 3.6), (0, 37, -50, 2.8), (0, 37, -54, 2.0)], rng)  # mâchoire
    for s in (-1, 1):
        horn = spline([(s * 3, 47, -40, 1.6), (s * 5, 50, -36, 1.3), (s * 6, 52, -31, 1.0), (s * 6, 51, -27, 0.7)], 6)
        for x, y, z, r in horn:
            tube(w, [(x, y, z, r)], rng, belly=False, scale_mix=["minecraft:calcite", "minecraft:smooth_quartz"])
        w.put(s * 4, 44, -46, "minecraft:redstone_block")  # œil
        w.put(s * 4, 44, -45, "minecraft:shroomlight")
        for z in (-52, -54):  # crocs
            w.put(s * 2, 36, z, "minecraft:calcite")
    # Pattes repliées, griffes argent.
    for s in (-1, 1):
        for a, b, paw in (((s * 9, 14, -10, 5.5), (s * 15, 6, -18, 3.5), (s * 16, 1, -24, 3)),
                          ((s * 9, 12, 14, 6), (s * 16, 5, 20, 4), (s * 17, 1, 13, 3))):
            tube(w, spline([a, b, paw], 6), rng)
            px, _, pz, _ = paw
            for k in (-2, 0, 2):  # trois griffes vers l'avant
                for d in range(3):
                    w.put(round(px + k), 0, round(pz - 3 - d), "minecraft:calcite")
    # Ailes repliées le long du corps, membrane rubis tendue entre des os noirs, extrémités posées au sol.
    for s in (-1, 1):
        shoulder = (s * 10, 30, -10)
        elbow = (s * 26, 24, -2)
        fingers = [(s * 40, 0, -18), (s * 46, 0, 2), (s * 40, 0, 22), (s * 28, 0, 32)]
        for p in [elbow] + fingers:
            for q in line_pts(shoulder if p is elbow else elbow, p, 0.4):
                for dx in (0, 1):
                    X, Y, Z = (round(v) for v in q)
                    if Y >= 0:
                        w.put(X + dx * s, Y, Z, "minecraft:polished_blackstone")
        triangle(w, shoulder, elbow, fingers[0], "minecraft:red_stained_glass")
        for a, b in zip(fingers, fingers[1:]):
            triangle(w, elbow, a, b, "minecraft:red_stained_glass")
        triangle(w, shoulder, elbow, (s * 10, 16, 16), "minecraft:red_stained_glass")
    # Épines rubis sur la nuque et la queue, en dehors du chemin de descente.
    for pts in (neck[2:-2:3],):
        for x, y, z, r in pts:
            for k in range(1, 4):
                w.put(round(x), round(y + r) + k, round(z), "minecraft:redstone_block" if k < 3 else "minecraft:red_stained_glass")
    for x, y, z, r in tail[-14::4]:
        w.put(round(x), round(y + r) + 1, round(z), "minecraft:redstone_block")

    # Plateforme d'arrivée sur le dos, entre les épaules : 9 × 9, liseré rubis, magnétite au centre.
    ax, ay, az = ARRIVAL
    for x in range(ax - 4, ax + 5):
        for z in range(az - 4, az + 5):
            for y in range(ay, ay + 8):
                w.put(x, y, z, "minecraft:air")
            edge = max(abs(x - ax), abs(z - az)) == 4
            w.put(x, ay - 1, z, "minecraft:red_nether_bricks" if edge else "minecraft:polished_blackstone")
            for y in range(ay - 4, ay - 1):
                if w.air(x, y, z):
                    w.put(x, y, z, "minecraft:blackstone")
    w.put(ax, ay - 1, az, "minecraft:lodestone")
    for x, z in ((ax - 4, az - 4), (ax + 4, az - 4), (ax - 4, az + 4), (ax + 4, az + 4)):
        w.put(x, ay, z, "minecraft:polished_blackstone_wall[up=true]")
        w.put(x, ay + 1, z, "minecraft:lantern[hanging=false]")


# ---------------------------------------------------------------------------------------------- bâtiments

def tower(w, cx, cz, h=14):
    """Tour de guet 7 × 7, échelle intérieure, plateforme crénelée."""
    for dx in range(-3, 4):
        for dz in range(-3, 4):
            x, z = cx + dx, cz + dz
            w.put(x, -1, z, "minecraft:polished_deepslate")
            if max(abs(dx), abs(dz)) == 3:
                for y in range(0, h):
                    door = dz == 3 and dx == 0 and y < 2
                    slit = y % 5 == 3 and (dx == 0 or dz == 0) and not door
                    w.put(x, y, z, "minecraft:air" if door or slit else PB if y % 4 == 0 else DT)
    for dx in range(-4, 5):
        for dz in range(-4, 5):
            w.put(cx + dx, h, cz + dz, PB)
            if max(abs(dx), abs(dz)) == 4 and (dx + dz) % 2 == 0:
                w.put(cx + dx, h + 1, cz + dz, PB)
    for y in range(0, h + 1):
        w.put(cx - 2, y, cz, "minecraft:ladder[facing=east]")
    w.put(cx, h + 1, cz, "minecraft:lantern[hanging=false]")


def ruin(w, cx, cz, rng, wdt=7, dpt=9):
    """Maison en ruine : murs à hauteur variable, fenêtres, toit effondré."""
    for dx in range(-wdt // 2, wdt // 2 + 1):
        for dz in range(-dpt // 2, dpt // 2 + 1):
            x, z = cx + dx, cz + dz
            w.put(x, -1, z, "minecraft:polished_deepslate" if (dx + dz) % 2 else "minecraft:cobbled_deepslate")
            edge = abs(dx) == wdt // 2 or abs(dz) == dpt // 2
            if not edge:
                continue
            door = dz == dpt // 2 and abs(dx) <= 0
            top = int(2 + 4 * (0.5 + 0.5 * noise(x * 3, z * 3, cx * 0.1)))
            for y in range(0, top):
                if door and y < 2:
                    continue
                window = y == 2 and (dx % 3 == 0) and abs(dz) == dpt // 2 and not door
                w.put(x, y, z, "minecraft:air" if window else ("minecraft:cracked_polished_blackstone_bricks" if rng.random() < 0.3 else PB))
    for dx in range(-wdt // 2 + 1, 1):  # reste de toit d'un côté
        for dz in range(-dpt // 2 + 1, dpt // 2):
            if rng.random() < 0.7:
                w.put(cx + dx, 5, cz + dz, "minecraft:deepslate_tile_slab[type=bottom]")


def wall_seg(w, a, b, h, rng):
    for x, z in line_pts(a, b, 0.5):
        X, Z = round(x), round(z)
        top = h - (1 if rng.random() < 0.3 else 0)
        for y in range(0, top):
            w.put(X, y, Z, PB if rng.random() < 0.7 else "minecraft:cracked_polished_blackstone_bricks")


def pillar(w, x, z, h=4):
    for y in range(0, h):
        w.put(x, y, z, DT if y < h - 1 else "minecraft:chiseled_polished_blackstone")


def outpost(w, key, rng):
    """Avant-poste d'un chunk (16 × 16) : liseré à la couleur de l'avant-poste, balise au centre, terrain propre."""
    o = OUTPOSTS[key]
    cx, cz = o["center"]
    x0, z0 = cx - 8, cz - 8  # bord du chunk
    for x in range(x0, x0 + 16):
        for z in range(z0, z0 + 16):
            for y in range(0, 12):
                w.put(x, y, z, "minecraft:air")
            edge = x in (x0, x0 + 15) or z in (z0, z0 + 15)
            w.put(x, -1, z, o["line"] if edge else ("minecraft:polished_deepslate" if (x + z) % 2 else DT))

    def beacon(y0):
        for dx in (-1, 0, 1):
            for dz in (-1, 0, 1):
                w.put(cx + dx, y0 - 1, cz + dz, "minecraft:iron_block")
        w.put(cx, y0, cz, "minecraft:beacon")
        w.put(cx, y0 + 1, cz, o["glass"])

    if key == "rubis":
        # Plateau surélevé de 4 : très défendable. Deux escaliers, vers la porte nord et vers le dragon.
        for x in range(cx - 5, cx + 6):
            for z in range(cz - 3, cz + 4):
                edge = abs(x - cx) == 5 or abs(z - cz) == 3
                for y in range(0, 4):
                    w.put(x, y, z, PB if edge else "minecraft:blackstone")
                if edge and (x + z) % 2 == 0 and not (abs(x - cx) <= 1 and abs(z - cz) == 3):
                    w.put(x, 4, z, PB)
        for side in (-1, 1):
            for k in range(3):  # marches de hauteur 1, 2, 3 contre le plateau
                z = cz + side * (6 - k)
                for x in range(cx - 1, cx + 2):
                    for y in range(0, k + 1):
                        w.put(x, y, z, PB if y == k else "minecraft:blackstone")
        beacon(4)
    elif key == "argent":
        # Ruines ouvertes : colonnade en cercle, entrées partout. Facile à prendre, dur à garder.
        for a in range(0, 360, 30):
            x, z = round(cx + 6 * math.cos(math.radians(a))), round(cz + 6 * math.sin(math.radians(a)))
            h = 3 + (a // 30) % 3
            for y in range(0, h):
                w.put(x, y, z, "minecraft:calcite" if y < h - 1 else "minecraft:chiseled_polished_blackstone")
        for a, b in (((cx - 5, cz - 2), (cx - 5, cz + 2)), ((cx + 3, cz + 5), (cx + 5, cz + 4))):
            wall_seg(w, a, b, 2, rng)
        beacon(0)
    else:
        # Cour fermée : murs de 4, deux portes face à face. Des goulots, pas de fenêtres.
        for x in range(x0 + 2, x0 + 14):
            for z in range(z0 + 2, z0 + 14):
                edge = x in (x0 + 2, x0 + 13) or z in (z0 + 2, z0 + 13)
                gate = (abs(x - cx) <= 1 and z in (z0 + 2, z0 + 13))
                if edge and not gate:
                    for y in range(0, 4):
                        w.put(x, y, z, PB if y in (0, 3) else DT)
                    if (x + z) % 2 == 0:
                        w.put(x, 4, z, PB)
        for x, z in ((cx - 3, cz - 3), (cx + 3, cz + 3), (cx - 3, cz + 3), (cx + 3, cz - 3)):
            pillar(w, x, z, 3)
        beacon(0)


def build_warzone():
    rng = np.random.default_rng(21)
    w = Vol()
    ground(w, rng)
    # Routes : dragon → chaque avant-poste, dragon → chaque porte.
    for key, o in OUTPOSTS.items():
        road(w, (0, 0), o["center"])
    for name, (dx, dz) in GATES.items():
        road(w, (dx * 30, dz * 30), (dx * (HALF - 1), dz * (HALF - 1)))
    border(w, rng)
    # Tours de guet aux quatre diagonales : point haut entre deux avant-postes.
    for x, z in ((-100, -100), (100, -100), (100, 100), (-100, 100)):
        tower(w, x, z)
    # Ruines, murs brisés, piliers : couvert réparti dans chaque secteur.
    for x, z in ((-40, -70), (40, -60), (-110, 30), (110, 20), (30, 100), (-20, 112), (-70, -40), (75, -30), (-60, 85), (90, 70)):
        ruin(w, x, z, rng)
    for a, b, h in (((-20, -55), (-10, -50), 3), ((20, -50), (28, -46), 2), ((50, 20), (52, 30), 3), ((-52, 22), (-50, 30), 2),
                    ((-15, 70), (-5, 74), 2), ((10, 60), (16, 66), 3), ((-118, -60), (-110, -60), 2), ((112, -55), (118, -48), 2),
                    ((70, 112), (80, 112), 2), ((-90, 110), (-84, 116), 3)):
        wall_seg(w, a, b, h, rng)
    for x, z in ((-25, -25), (25, -25), (-30, 30), (30, 30), (0, 60), (-80, 0), (80, 0), (0, -110), (60, -100), (-60, -100)):
        pillar(w, x, z, 5)
    for key in OUTPOSTS:
        outpost(w, key, rng)
    dragon(w, rng)
    return w


def build_outer():
    """Avant-poste extérieur 3 × 3 chunks (48 × 48) : seulement la délimitation, pour l'instant."""
    w = Vol(half=24, ymin=-1, ymax=8)
    for t in range(-24, 24):
        for x, z in ((t, -24), (t, 23), (-24, t), (23, t)):
            w.put(x, -1, z, PB if t % 4 else "minecraft:red_nether_bricks")
            corner_chunk = (t + 24) % 16 == 0 or t == 23
            if corner_chunk:
                for y in range(0, 4):
                    w.put(x, y, z, DT if y < 3 else "minecraft:chiseled_polished_blackstone")
                w.put(x, 4, z, "minecraft:lantern[hanging=false]")
    w.put(0, -1, 0, "minecraft:lodestone")  # centre
    return w


def render(w, path_top, path_side, scale):
    shade = {"pale_moss": (160, 166, 156), "tuff": (108, 109, 102), "deepslate": (72, 72, 73),
             "blackstone": (53, 48, 56), "calcite": (223, 224, 220), "quartz": (236, 230, 223), "red_stained": (190, 40, 40),
             "white_stained": (235, 235, 235), "black_stained": (30, 30, 34), "redstone": (175, 24, 5), "red_nether": (69, 7, 9),
             "lantern": (230, 180, 90), "iron": (220, 220, 220), "beacon": (120, 230, 220), "shroom": (240, 140, 70),
             "ladder": (150, 110, 70), "lodestone": (150, 150, 155)}

    def color(n):
        return next((c for k, c in shade.items() if k in n), (110, 110, 110))

    v, names = w.v, w.pal.names
    H, L, W = v.shape
    top = Image.new("RGB", (W, L), (7, 7, 10))
    hi = np.where(v > 0, np.arange(H)[:, None, None], -1).max(axis=0)
    for z in range(L):
        for x in range(W):
            yi = hi[z, x]
            if yi >= 0:
                c = color(names[v[yi, z, x]])
                lift = 0.85 + 0.012 * (yi + w.ymin)
                top.putpixel((x, z), tuple(max(0, min(255, int(ch * lift))) for ch in c))
    top.resize((W * scale, L * scale), Image.Resampling.NEAREST).save(path_top)
    if path_side:
        side = Image.new("RGB", (W, H), (7, 7, 10))
        for y in range(H):
            row = v[y]
            for x in range(W):
                col = np.nonzero(row[:, x])[0]
                if col.size:
                    zi = col[-1]
                    side.putpixel((x, H - 1 - y), tuple(int(ch * (0.45 + 0.55 * zi / L)) for ch in color(names[row[zi, x]])))
        side.resize((W * scale, H * scale), Image.Resampling.NEAREST).save(path_side)


def main():
    w = build_warzone()
    write_schem(HERE / "vaeloria-warzone.schem", w.v, w.pal.names, (HALF, -YMIN, HALF))
    o = build_outer()
    write_schem(HERE / "vaeloria-avant-poste-exterieur.schem", o.v, o.pal.names, (24, 1, 24))
    render(w, HERE / "apercu-warzone-dessus.png", HERE / "apercu-warzone-sud.png", 3)
    # Vue rapprochée du dragon.
    d = Vol(half=60, ymin=-1, ymax=YMAX)
    dragon(d, np.random.default_rng(21))
    render(d, HERE / "apercu-dragon-dessus.png", HERE / "apercu-dragon-sud.png", 6)
    print("warzone :", int((w.v > 0).sum()), "blocs ·", w.v.shape[::-1], "· avant-poste extérieur :", o.v.shape[::-1])


if __name__ == "__main__":
    main()
