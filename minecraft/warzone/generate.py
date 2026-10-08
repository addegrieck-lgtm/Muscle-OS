"""Warzone VÆLORIA « Le Repos du Dragon » (Paper 1.21.4+), au format Sponge v2 (.schem, WorldEdit/FAWE).

Usage : python3 minecraft/warzone/generate.py   (Pillow + numpy ; réutilise minecraft/spawn)
Sorties dans minecraft/warzone/ :
  vaeloria-warzone.schem              la warzone : 25 × 25 chunks (400 × 400), dragon, bâtiments, 3 avant-postes, pièges,
                                      entourée d'une bande plate de 2 chunks découpée en 52 zones d'AP de 2 × 2 chunks
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

HALF = 200  # bord : chunks -12..12 autour du chunk central → x, z de -200 à 199
AP_DEPTH = 32  # bande de zones d'AP plates derrière le muret : 2 chunks de profondeur
EXT = HALF + AP_DEPTH  # emprise totale du schematic : -232 à 231
YMIN, YMAX = -8, 108
LIFT = 44  # le dragon vole : son point le plus bas reste à plus de 44 blocs du sol, hors de portée d'une perle (~37)
PB = "minecraft:polished_blackstone_bricks"
DT = "minecraft:deepslate_tiles"

# Les trois avant-postes intérieurs : un chunk chacun, centrés sur des centres de chunk, à 120° autour du dragon.
OUTPOSTS = {
    "rubis": {"center": (0, -112), "glass": "minecraft:red_stained_glass", "line": "minecraft:red_nether_bricks"},
    "argent": {"center": (96, 64), "glass": "minecraft:white_stained_glass", "line": "minecraft:calcite"},
    "onyx": {"center": (-96, 64), "glass": "minecraft:black_stained_glass", "line": "minecraft:polished_blackstone"},
}
GATES = {"nord": (0, -1), "est": (1, 0), "sud": (0, 1), "ouest": (-1, 0)}
CAVE = (115, -112)  # grotte du KOTH (nord-est), zone de capture au centre
CITADEL = (-115, 135)  # citadelle du Totem (sud-ouest), totem au centre
OUTER_D = 400  # centre des avant-postes extérieurs : 176 blocs au-delà du bord de la warzone
ARRIVAL = (0, 34, -4)  # pieds du joueur sur la plateforme, dans le repère du dragon (avant élévation)


class Vol:
    def __init__(self, half=HALF, ymin=YMIN, ymax=YMAX):
        self.half, self.ymin, self.ymax = half, ymin, ymax
        self.pal = Palette()
        n = 2 * half
        self.v = np.zeros((ymax - ymin + 1, n, n), dtype=np.int32)
        self.block_entities = []  # (x, y, z, id, items) en coordonnées locales

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


class Lifted:
    """Vue décalée en hauteur d'un volume : le dragon se construit comme au sol, puis flotte LIFT blocs plus haut."""

    def __init__(self, w, dy):
        self.w, self.dy = w, dy

    def put(self, x, y, z, name):
        self.w.put(x, y + self.dy, z, name)

    def air(self, x, y, z):
        return self.w.air(x, y + self.dy, z)

    def get(self, x, y, z):
        return self.w.get(x, y + self.dy, z)


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
    frost = {(60, -30), (-60, 145)}  # cratères de givre : fond en neige poudreuse
    for cx, cz, r in ((-45, -60, 6), (60, -30, 7), (30, 105, 6), (-135, -15, 7), (140, -105, 6), (-60, 145, 6), (150, 140, 5),
                      (-150, -140, 5), (-170, 90, 5), (175, 5, 5)):
        for x in range(cx - r, cx + r + 1):
            for z in range(cz - r, cz + r + 1):
                d = math.hypot(x - cx, z - cz)
                if d <= r:
                    depth = 1 if d > r * 0.55 else 2
                    for y in range(-depth, 1):
                        w.put(x, y, z, "minecraft:air")
                    if (cx, cz) in frost:
                        for y in range(-depth - 1, -depth + 1):
                            w.put(x, y, z, "minecraft:powder_snow")
                        w.put(x, -depth - 2, z, "minecraft:blackstone")
                    else:
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
    breaches = {(-1, 59), (-1, -106), (1, 106), (1, -59)}  # (côté, position) : brèches à travers le muret

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
    """Dragon en plein vol, la tête au nord, construit autour de y = 0 puis élevé par Lifted. On arrive sur son dos."""
    # Corps : du bassin (sud) au poitrail (nord). Le dos culmine sous la plateforme d'arrivée.
    body = spline([(0, 15, 22, 8.5), (0, 19, 10, 10.5), (0, 22, -4, 11.5), (0, 21, -16, 10.5)], 10)
    neck = spline([(0, 21, -16, 9), (0, 27, -27, 7), (0, 36, -34, 5.5), (0, 42, -38, 5)], 10)
    tail = spline([(0, 15, 22, 8), (0, 14, 36, 6.5), (4, 13, 50, 5), (-2, 12, 64, 3.5), (3, 12, 76, 2.5), (0, 13, 86, 1.6)], 10)
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
    # Pattes repliées sous le corps, tendues vers l'arrière comme en plein vol ; griffes argent.
    for s_ in (-1, 1):
        for leg in ([(s_ * 9, 14, -10, 5), (s_ * 12, 9, -14, 3.5), (s_ * 12, 7, -20, 2.5)],
                    [(s_ * 9, 12, 14, 5.5), (s_ * 12, 7, 20, 4), (s_ * 11, 6, 28, 3)]):
            tube(w, spline(leg, 6), rng)
            px, py, pz, _ = leg[-1]
            for k in (-1, 0, 1):
                for d in range(2):
                    w.put(round(px + k), round(py) - 2, round(pz + (1 if pz > 0 else -1) * (2 + d)), "minecraft:calcite")
    # Ailes grandes ouvertes, légèrement relevées : os noirs, membrane rubis. Envergure de 116 blocs.
    for s_ in (-1, 1):
        shoulder = (s_ * 10, 30, -8)
        elbow = (s_ * 30, 37, -6)
        fingers = [(s_ * 52, 33, -16), (s_ * 58, 30, -1), (s_ * 53, 27, 13), (s_ * 41, 25, 23), (s_ * 25, 26, 22)]
        for p in [elbow] + fingers:
            for q in line_pts(shoulder if p is elbow else elbow, p, 0.4):
                X, Y, Z = (round(v) for v in q)
                for dy in (0, 1):
                    w.put(X, Y + dy, Z, "minecraft:polished_blackstone")
        triangle(w, shoulder, elbow, fingers[0], "minecraft:red_stained_glass")
        for f1, f2 in zip(fingers, fingers[1:]):
            triangle(w, elbow, f1, f2, "minecraft:red_stained_glass")
        triangle(w, elbow, fingers[-1], (s_ * 9, 24, 16), "minecraft:red_stained_glass")
        triangle(w, shoulder, elbow, (s_ * 9, 24, 16), "minecraft:red_stained_glass")
        for f in fingers[:4]:  # griffe argent au bout de chaque doigt
            w.put(round(f[0]) + s_, round(f[1]), round(f[2]), "minecraft:calcite")
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
    for y in range(0, h + 1):  # à côté de l'axe : les meurtrières sont dans l'axe des murs
        w.put(cx - 2, y, cz + 1, "minecraft:ladder[facing=east]")
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
    # Piège : toiles d'araignée derrière la porte et dans un coin. On entre, on est ralenti, on se fait cueillir.
    w.put(cx, 0, cz + dpt // 2 - 1, "minecraft:cobweb")
    w.put(cx, 1, cz + dpt // 2 - 1, "minecraft:cobweb")
    w.put(cx - wdt // 2 + 1, 0, cz - dpt // 2 + 1, "minecraft:cobweb")
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
        for sx in (-1, 1):  # piège : quatre plaques de neige poudreuse au ras du sol, couleur argent
            for sz in (-1, 1):
                for dx in (2, 3):
                    for dz in (2, 3):
                        for y in (-2, -1):
                            w.put(cx + sx * dx, y, cz + sz * dz, "minecraft:powder_snow")
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


def traps(w, rng):
    """Petits pièges répartis dans la warzone. Tout est déjà construit : rien à poser en jeu."""
    # Fosses à pics : 3 × 3, 5 de profondeur, stalagmites au fond, une échelle pour ressortir lentement.
    for px, pz in ((24, -150), (-24, -150), (140, 46), (84, 110), (-140, 46), (-84, 110), (172, -72), (-172, -72)):
        for x in range(px - 1, px + 2):
            for z in range(pz - 1, pz + 2):
                for y in range(-5, 1):
                    w.put(x, y, z, "minecraft:air")
                w.put(x, -6, z, "minecraft:tuff")
                if (x + z) % 2 == 0:
                    w.put(x, -5, z, "minecraft:pointed_dripstone[thickness=tip,vertical_direction=up]")
        for y in range(-5, 0):
            w.put(px - 1, y, pz, "minecraft:ladder[facing=east]")
    # Plaques piégées : une plaque de pierre noire sur la route, un distributeur de flèches caché dessous.
    arrows = [(slot, "minecraft:arrow", 64) for slot in range(9)]
    for x, z in ((1, -60), (-1, -170), (-1, 60), (1, 170), (60, 1), (170, -1), (-60, -1), (-170, 1), (48, 32), (-48, 32)):
        w.put(x, -1, z, "minecraft:dispenser[facing=up]")
        w.put(x, 0, z, "minecraft:polished_blackstone_pressure_plate")
        w.block_entities.append((x, -1, z, "minecraft:dispenser", arrows))
    # Ronces rubis : buissons de baies sur les approches des avant-postes. Elles ralentissent et blessent.
    for cx, cz in ((-24, -112), (24, -112), (112, 40), (80, 92), (-112, 40), (-80, 92)):
        for x in range(cx - 2, cx + 3):
            for z in range(cz - 2, cz + 3):
                if rng.random() < 0.65:
                    w.put(x, -1, z, "minecraft:coarse_dirt")
                    w.put(x, 0, z, "minecraft:sweet_berry_bush[age=3]")


GROUND = ("minecraft:pale_moss_block", "minecraft:tuff", "minecraft:cobbled_deepslate")


def free(w, x0, z0, x1, z1, margin=2):
    """Vrai si le rectangle (marge comprise) n'est que du sol nu : pas de route, de piège, d'avant-poste ni de bâtiment."""
    for x in range(x0 - margin, x1 + margin + 1):
        for z in range(z0 - margin, z1 + margin + 1):
            if w.get(x, -1, z) not in GROUND or w.get(x, 0, z) not in ("minecraft:air", "minecraft:pale_moss_carpet"):
                return False
    return True


def clear_carpet(w, x0, z0, x1, z1):
    for x in range(x0, x1 + 1):
        for z in range(z0, z1 + 1):
            if w.get(x, 0, z) == "minecraft:pale_moss_carpet":
                w.put(x, 0, z, "minecraft:air")


def forge(w, cx, cz, rng, along_x):
    """Forge en ruine 11 × 15 : contreforts, fenêtres à barreaux, mezzanine avec échelle, toit à moitié effondré."""
    hw, hd = (7, 5) if along_x else (5, 7)
    clear_carpet(w, cx - hw, cz - hd, cx + hw, cz + hd)
    for x in range(cx - hw, cx + hw + 1):
        for z in range(cz - hd, cz + hd + 1):
            w.put(x, -1, z, "minecraft:polished_deepslate" if (x + z) % 2 else DT)
            edge_x, edge_z = abs(x - cx) == hw, abs(z - cz) == hd
            if not (edge_x or edge_z):
                if rng.random() < 0.55:
                    w.put(x, 6, z, "minecraft:deepslate_tile_slab[type=bottom]")
                continue
            along = (x - cx) if edge_z else (z - cz)
            door = abs(along) <= 1 and ((edge_x and along_x) or (edge_z and not along_x))
            buttress = along % 4 == 0
            top = 6 if buttress else int(4 + 2 * (0.5 + 0.5 * noise(x * 2, z * 2, 5.0)))
            for y in range(0, top):
                if door and y < 3:
                    continue
                window = y in (2, 3) and along % 4 == 2 and not door
                bars = "minecraft:iron_bars[east=true,west=true]" if edge_z else "minecraft:iron_bars[north=true,south=true]"
                w.put(x, y, z, bars if window else DT if buttress else PB)
    # Mezzanine le long d'un grand côté, échelle pour y monter : un poste de tir à l'intérieur.
    for k in range(-hw + 1 if along_x else -hd + 1, (hw if along_x else hd)):
        for d in (1, 2):
            x, z = (cx + k, cz - hd + d) if along_x else (cx - hw + d, cz + k)
            w.put(x, 3, z, "minecraft:polished_blackstone_slab[type=top]")
    lx, lz = (cx + 1, cz - hd + 1) if along_x else (cx - hw + 1, cz + 1)  # contre le mur, à travers la mezzanine
    for y in range(0, 4):
        w.put(lx, y, lz, "minecraft:ladder[facing=south]" if along_x else "minecraft:ladder[facing=east]")
    for k in (2, -2):  # foyers éteints : décor seulement, rien d'utilisable par les joueurs
        fx, fz = (cx + k, cz) if along_x else (cx, cz + k)
        w.put(fx, 0, fz, "minecraft:chiseled_polished_blackstone")
        w.put(fx, 1, fz, "minecraft:lantern[hanging=false]")


def chapel(w, cx, cz, rng):
    """Chapelle 9 × 13 : murs hauts, vitraux rubis, autel au losange rouge, toit en pignon."""
    clear_carpet(w, cx - 4, cz - 6, cx + 4, cz + 6)
    for x in range(cx - 4, cx + 5):
        for z in range(cz - 6, cz + 7):
            w.put(x, -1, z, "minecraft:polished_blackstone" if abs(x - cx) <= 1 else "minecraft:polished_deepslate")
            if abs(x - cx) == 4 or abs(z - cz) == 6:
                door = z == cz + 6 and abs(x - cx) <= 1
                for y in range(0, 7):
                    if door and y < 4:
                        continue
                    glass = abs(x - cx) == 4 and y in (2, 3, 4) and (z - cz) % 3 == 0 and abs(z - cz) < 6
                    w.put(x, y, z, "minecraft:red_stained_glass" if glass else PB if y in (0, 6) else DT)
        for z in range(cz - 6, cz + 7):  # toit en pignon
            d = abs(x - cx)
            w.put(x, 7 + (4 - d) // 2 * 1 if d < 4 else 7, z, "minecraft:deepslate_tiles")
    for x in range(cx - 1, cx + 2):  # autel
        w.put(x, 0, cz - 4, PB)
    for y, half in ((1, 0), (2, 1), (3, 1), (4, 0)):
        for x in range(cx - half, cx + half + 1):
            w.put(x, y, cz - 6, "minecraft:redstone_block")
    w.put(cx, 1, cz - 4, "minecraft:lantern[hanging=false]")


def bunker(w, cx, cz):
    """Poste de garde 5 × 5, 3 de haut, toit plein, meurtrières sur les quatre faces."""
    clear_carpet(w, cx - 2, cz - 2, cx + 2, cz + 2)
    for x in range(cx - 2, cx + 3):
        for z in range(cz - 2, cz + 3):
            w.put(x, -1, z, "minecraft:polished_deepslate")
            w.put(x, 3, z, PB)
            if max(abs(x - cx), abs(z - cz)) == 2:
                for y in range(0, 3):
                    door = z == cz + 2 and x == cx and y < 2
                    slit = y == 1 and (x == cx or z == cz) and not door
                    w.put(x, y, z, "minecraft:air" if door or slit else DT if y == 1 else PB)


def obelisk(w, cx, cz):
    """Obélisque de 10 : socle noir, bandes argent, pointe rubis. Un repère qu'on voit de loin."""
    clear_carpet(w, cx - 1, cz - 1, cx + 1, cz + 1)
    for x in range(cx - 1, cx + 2):
        for z in range(cz - 1, cz + 2):
            w.put(x, -1, z, PB)
            w.put(x, 0, z, PB)
    for y in range(1, 9):
        w.put(cx, y, cz, "minecraft:calcite" if y % 3 == 0 else "minecraft:polished_blackstone")
    w.put(cx, 9, cz, "minecraft:redstone_block")
    w.put(cx, 10, cz, "minecraft:end_rod[facing=up]")


def more_buildings(w, rng):
    """Bâtiments supplémentaires, posés seulement sur du sol nu (jamais sur une route, un piège ou un avant-poste)."""
    placed = {"forge": 0, "chapelle": 0, "poste de garde": 0, "obélisque": 0}
    plan = [("forge", 6, 8), ("chapelle", 3, 7), ("poste de garde", 14, 3), ("obélisque", 8, 2)]
    for kind, count, half in plan:
        tries = 0
        while placed[kind] < count and tries < 4000:
            tries += 1
            x, z = int(rng.integers(-185, 186)), int(rng.integers(-185, 186))
            if math.hypot(x, z + 10) < 62:  # sous le dragon : zone d'atterrissage dégagée
                continue
            if any(math.hypot(x - o["center"][0], z - o["center"][1]) < 26 for o in OUTPOSTS.values()):
                continue
            along_x = bool(rng.integers(2))
            hw, hd = {"forge": (7, 5) if along_x else (5, 7), "chapelle": (4, 6), "poste de garde": (2, 2), "obélisque": (1, 1)}[kind]
            if not free(w, x - hw, z - hd, x + hw, z + hd, margin=3):
                continue
            if kind == "forge":
                forge(w, x, z, rng, along_x)
            elif kind == "chapelle":
                chapel(w, x, z, rng)
            elif kind == "poste de garde":
                bunker(w, x, z)
            else:
                obelisk(w, x, z)
            placed[kind] += 1
    return placed


def chunk_of(v):
    """Indice du chunk qui contient v (le chunk 0 va de -8 à 7)."""
    return (v + 8) // 16


def ap_zone(cx, cz):
    """Zone d'AP (2 × 2 chunks) d'un chunk de la bande, ou None pour le couloir dans l'axe des portes."""
    def pair(k):
        if k == 0:
            return None
        if abs(k) >= 13:
            return (13, 14) if k > 0 else (-14, -13)
        lo = ((k - 1) // 2) * 2 + 1 if k > 0 else -(((-k - 1) // 2) * 2 + 2)
        return (lo, lo + 1)
    px, pz = pair(cx), pair(cz)
    if px is None or pz is None:
        return None
    return px, pz


def ap_band(w):
    """Bande plate de 2 chunks à l'extérieur du muret, sur les 4 côtés, découpée en zones d'AP de 2 × 2 chunks."""
    zones = set()
    for x in range(-EXT, EXT):
        for z in range(-EXT, EXT):
            if -HALF <= x < HALF and -HALF <= z < HALF:
                continue
            for y in range(YMIN, -1):
                w.put(x, y, z, "minecraft:deepslate" if y < -4 else "minecraft:tuff")
            zone = ap_zone(chunk_of(x), chunk_of(z))
            if zone is None:  # couloir de la porte : la route continue jusqu'au bord
                axis = x if abs(z) >= HALF else z
                w.put(x, -1, z, "minecraft:polished_blackstone" if abs(axis) <= 1 else PB if abs(axis) == 2 else "minecraft:polished_deepslate")
                continue
            (x0c, x1c), (z0c, z1c) = zone
            zx0, zx1, zz0, zz1 = 16 * x0c - 8, 16 * x1c + 7, 16 * z0c - 8, 16 * z1c + 7
            zones.add((zx0, zz0, zx1, zz1))
            edge = x in (zx0, zx1) or z in (zz0, zz1)
            w.put(x, -1, z, PB if edge else "minecraft:pale_moss_block")
    for zx0, zz0, zx1, zz1 in zones:  # un pilier à chaque coin de zone, un repère rubis au centre
        for x, z in ((zx0, zz0), (zx1, zz0), (zx0, zz1), (zx1, zz1)):
            if -HALF <= x < HALF and -HALF <= z < HALF:
                continue
            for y in range(0, 3):
                w.put(x, y, z, DT if y < 2 else "minecraft:chiseled_polished_blackstone")
            w.put(x, 3, z, "minecraft:lantern[hanging=false]")
        w.put((zx0 + zx1) // 2, -1, (zz0 + zz1) // 2, "minecraft:red_nether_bricks")
    return sorted(zones)


def clear_site(w, x0, z0, x1, z1, top=40):
    """Rase un emplacement : sol neuf, tout ce qui était là (ruines, cratères) disparaît."""
    for x in range(x0, x1 + 1):
        for z in range(z0, z1 + 1):
            for y in range(YMIN, -1):
                w.put(x, y, z, "minecraft:deepslate" if y < -4 else "minecraft:tuff")
            w.put(x, -1, z, "minecraft:tuff")
            for y in range(0, top):
                w.put(x, y, z, "minecraft:air")


def cave_koth(w, rng):
    """Colline de roche noire creusée d'une grotte. La zone de capture du KOTH est au centre, sous un puits
    ouvert : le faisceau rubis de la balise sort par le sommet. Quatre tunnels, un puits, des stalactites."""
    cx, cz = CAVE
    R0, PEAK = 30, 26
    clear_site(w, cx - R0, cz - R0, cx + R0, cz + R0)
    rock = ["minecraft:tuff"] * 4 + ["minecraft:deepslate"] * 3 + ["minecraft:cobbled_deepslate"] * 2 + ["minecraft:blackstone"]
    for x in range(cx - R0, cx + R0 + 1):
        for z in range(cz - R0, cz + R0 + 1):
            r = math.hypot(x - cx, z - cz)
            if r > R0:
                continue
            h = int(PEAK * (1 - r / R0) ** 1.1 + 2 * noise(x * 2, z * 2, 7.7))
            for y in range(0, max(h, 0) + 1):
                n = noise(x * 1.9 + y, z * 1.9 - y, 3.1)
                name = "minecraft:deepslate_redstone_ore" if n > 0.82 else "minecraft:calcite" if n < -0.85 else rock[int(rng.integers(len(rock)))]
                w.put(x, y, z, name)
            if h >= 1 and rng.random() < 0.5:
                w.put(x, h, z, "minecraft:pale_moss_block")
    # Salle : un dôme de 17 de rayon et 12 de haut.
    for x in range(cx - 17, cx + 18):
        for z in range(cz - 17, cz + 18):
            for y in range(0, 13):
                if ((x - cx) / 17) ** 2 + ((z - cz) / 17) ** 2 + ((y - 1) / 11.5) ** 2 < 1:
                    w.put(x, y, z, "minecraft:air")
            if math.hypot(x - cx, z - cz) < 17:
                w.put(x, -1, z, "minecraft:polished_deepslate" if (x + z) % 2 else "minecraft:tuff")
    # Quatre tunnels de 4 × 4, un par côté : aucun accès n'est privilégié.
    for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        for t in range(10, R0 + 2):
            for a in range(-2, 2):
                for y in range(0, 4):
                    x, z = cx + dx * t + (a if dz else 0), cz + dz * t + (a if dx else 0)
                    w.put(x, y, z, "minecraft:air")
                    w.put(x, -1, z, "minecraft:polished_deepslate")
        for y in range(0, 5):  # encadrement des entrées
            for a in (-3, 2):
                x, z = cx + dx * (R0 - 3) + (a if dz else 0), cz + dz * (R0 - 3) + (a if dx else 0)
                w.put(x, y, z, PB)
        for a in range(-3, 3):
            x, z = cx + dx * (R0 - 3) + (a if dz else 0), cz + dz * (R0 - 3) + (a if dx else 0)
            w.put(x, 4, z, PB)
    # Puits 3 × 3 au-dessus du centre, jusqu'au sommet : on peut aussi tomber dans la grotte par là.
    for x in range(cx - 1, cx + 2):
        for z in range(cz - 1, cz + 2):
            for y in range(10, PEAK + 4):
                w.put(x, y, z, "minecraft:air")
    # Stalactites et stalagmites, cristaux rubis éclairés.
    for k in range(70):
        a, rr = rng.random() * 2 * math.pi, 4 + rng.random() * 12
        x, z = round(cx + rr * math.cos(a)), round(cz + rr * math.sin(a))
        if max(abs(x - cx), abs(z - cz)) <= 5:
            continue
        ceil = next((y for y in range(12, 0, -1) if w.get(x, y, z) == "minecraft:air" and w.get(x, y + 1, z) != "minecraft:air"), None)
        if ceil and rng.random() < 0.6:
            w.put(x, ceil, z, "minecraft:pointed_dripstone[thickness=tip,vertical_direction=down]")
        elif rng.random() < 0.5:
            w.put(x, 0, z, "minecraft:pointed_dripstone[thickness=tip,vertical_direction=up]")
        else:
            w.put(x, 0, z, "minecraft:red_stained_glass")
            w.put(x, 1, z, "minecraft:red_stained_glass")
            w.put(x, -1, z, "minecraft:shroomlight")
    # Socle et zone de capture 5 × 5 : liseré rubis, balise sous verre rouge, dans l'axe du puits.
    for x in range(cx - 4, cx + 5):
        for z in range(cz - 4, cz + 5):
            w.put(x, 0, z, PB)
    for x in range(cx - 3, cx + 4):
        for z in range(cz - 3, cz + 4):
            w.put(x, 1, z, "minecraft:red_nether_bricks" if max(abs(x - cx), abs(z - cz)) == 3 else "minecraft:polished_blackstone")
    for x in (cx - 1, cx, cx + 1):
        for z in (cz - 1, cz, cz + 1):
            w.put(x, -1, z, "minecraft:iron_block")
    w.put(cx, 0, cz, "minecraft:beacon")
    w.put(cx, 1, cz, "minecraft:red_stained_glass")
    for x, z in ((cx - 2, cz - 2), (cx + 2, cz - 2), (cx - 2, cz + 2), (cx + 2, cz + 2)):
        w.put(x, 1, z, "minecraft:redstone_block")
    for x, z in ((cx - 6, cz - 6), (cx + 6, cz - 6), (cx - 6, cz + 6), (cx + 6, cz + 6)):  # lanternes pendues à la voûte
        top = next((y for y in range(12, 0, -1) if w.get(x, y + 1, z) != "minecraft:air"), 8)
        for y in range(top - 2, top + 1):
            w.put(x, y, z, "minecraft:chain")
        w.put(x, top - 3, z, "minecraft:lantern[hanging=true]")


def citadel_totem(w, rng):
    """Citadelle du Totem : enceinte carrée à 4 portes, tours d'angle, cour, muret intérieur ouvert aux diagonales,
    autel à trois gradins au centre. Le totem apparaît au sommet de l'autel."""
    cx, cz = CITADEL
    H = 26
    clear_site(w, cx - H, cz - H, cx + H, cz + H, top=20)
    for x in range(cx - H, cx + H + 1):
        for z in range(cz - H, cz + H + 1):
            w.put(x, -1, z, "minecraft:polished_deepslate" if (x + z) % 2 else DT)
    # Enceinte de 2 d'épaisseur, 7 de haut, créneaux ; portes de 5 au milieu de chaque côté.
    for a in range(-H + 2, H - 1):
        for t in (H - 3, H - 2):
            for k in range(4):
                x, z = a, t
                for _ in range(k):
                    x, z = -z, x
                gate = abs(a) <= 2
                for y in range(0, 7):
                    if gate and y < 5:
                        continue
                    w.put(cx + x, y, cz + z, PB if y in (0, 6) else DT)
                if t == H - 2 and a % 2 == 0 and not gate:
                    w.put(cx + x, 7, cz + z, PB)
    for sx in (-1, 1):  # tours d'angle 7 × 7, 11 de haut, échelle intérieure
        for sz in (-1, 1):
            tx, tz = cx + sx * (H - 4), cz + sz * (H - 4)
            for dx in range(-3, 4):
                for dz in range(-3, 4):
                    for y in range(0, 11):
                        if max(abs(dx), abs(dz)) == 3 or y == 10:
                            w.put(tx + dx, y, tz + dz, PB if y % 5 == 0 else DT)
                    if max(abs(dx), abs(dz)) == 3 and (dx + dz) % 2 == 0:
                        w.put(tx + dx, 11, tz + dz, PB)
            for y in range(0, 11):
                w.put(tx - sx * 2, y, tz + 1, "minecraft:ladder[facing=east]" if sx > 0 else "minecraft:ladder[facing=west]")
            w.put(tx - sx * 3, 0, tz - 1, "minecraft:air")  # entrée de la tour depuis la cour, à côté de l'échelle
            w.put(tx - sx * 3, 1, tz - 1, "minecraft:air")
            w.put(tx, 12, tz, "minecraft:lantern[hanging=false]")
    # Muret intérieur (rayon 13), ouvert seulement aux diagonales : on ne fonce pas de la porte à l'autel.
    for a in np.linspace(0, 2 * math.pi, 900, endpoint=False):
        x, z = round(13 * math.cos(a)), round(13 * math.sin(a))
        if abs(abs(x) - abs(z)) <= 3:
            continue
        w.put(cx + x, 0, cz + z, PB)
        w.put(cx + x, 1, cz + z, "minecraft:polished_blackstone_brick_slab[type=bottom]")
    # Autel à trois gradins (rayons 8, 6, 4), losange rubis au sommet : le totem se dresse au centre, en y = 3.
    for y, r in enumerate((8, 6, 4)):
        for x in range(-r, r + 1):
            for z in range(-r, r + 1):
                d = math.hypot(x, z)
                if d <= r:
                    w.put(cx + x, y, cz + z, "minecraft:red_nether_bricks" if d > r - 1 else "minecraft:polished_blackstone")
    for x, z in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
        w.put(cx + x, 2, cz + z, "minecraft:redstone_block")
    for x, z in ((6, 6), (-6, 6), (6, -6), (-6, -6)):
        w.put(cx + x, 0, cz + z, "minecraft:polished_blackstone_wall[up=true]")
        w.put(cx + x, 1, cz + z, "minecraft:lantern[hanging=false]")


def build_warzone():
    rng = np.random.default_rng(21)
    w = Vol(half=EXT)
    ground(w, rng)
    # Routes : dragon → chaque avant-poste, dragon → chaque porte.
    for key, o in OUTPOSTS.items():
        road(w, (0, 0), o["center"])
    for name, (dx, dz) in GATES.items():
        road(w, (dx * 30, dz * 30), (dx * (HALF - 1), dz * (HALF - 1)))
    border(w, rng)
    w.ap_zones = ap_band(w)
    # Tours de guet aux quatre diagonales : point haut entre deux portes.
    for x, z in ((-150, -150), (150, -150), (150, 150), (-150, 150)):
        tower(w, x, z)
    # Ruines, murs brisés, piliers : couvert réparti dans chaque secteur, jamais sur les routes.
    for x, z in ((-60, -100), (60, -90), (-160, 45), (160, 30), (45, 150), (-30, 165), (-100, -60), (110, -45),
                 (-90, 125), (130, 100), (-130, -110), (130, -120), (-40, 60), (175, -160), (-175, 170)):
        ruin(w, x, z, rng)
    for a, b, h in (((-30, -80), (-15, -73), 3), ((30, -73), (41, -68), 2), ((73, 30), (76, 44), 3), ((-76, 32), (-73, 44), 2),
                    ((-22, 103), (-7, 109), 2), ((15, 88), (24, 97), 3), ((-173, -88), (-162, -88), 2), ((165, -81), (173, -71), 2),
                    ((103, 165), (118, 165), 2), ((-132, 162), (-123, 171), 3), ((60, -180), (75, -180), 2), ((-75, -182), (-60, -176), 3)):
        wall_seg(w, a, b, h, rng)
    for x, z in ((-37, -37), (37, -37), (-44, 44), (44, 44), (12, 90), (-118, 12), (118, -12), (14, -165), (90, -150), (-90, -150),
                 (150, 60), (-150, 60), (60, 180), (-60, 180)):
        pillar(w, x, z, 5)
    for key in OUTPOSTS:
        outpost(w, key, rng)
    traps(w, rng)
    cave_koth(w, rng)
    citadel_totem(w, rng)
    w.placed = more_buildings(w, rng)
    dragon(Lifted(w, LIFT), rng)
    # Cercle d'atterrissage sous le dragon en vol : on saute du dos, on atterrit ici (dégâts de chute coupés par la région).
    for a in range(0, 360, 2):
        for rr in (49, 50):
            x, z = round(rr * math.cos(math.radians(a))), round(-10 + rr * math.sin(math.radians(a)))
            if w.get(x, -1, z) in ("minecraft:pale_moss_block", "minecraft:tuff", "minecraft:cobbled_deepslate"):
                w.put(x, -1, z, "minecraft:red_nether_bricks")  # seulement sur le sol nu : routes et pièges intacts
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
             "ladder": (150, 110, 70), "lodestone": (150, 150, 155), "powder_snow": (248, 253, 253),
             "sweet_berry": (150, 30, 40), "anvil": (60, 60, 64), "blast": (90, 90, 95), "end_rod": (240, 240, 230), "iron_bars": (180, 180, 185), "cobweb": (230, 230, 230), "dripstone": (130, 100, 85), "pressure_plate": (60, 55, 64)}

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
    bes = [(x + EXT, y - YMIN, z + EXT, i, items) for x, y, z, i, items in w.block_entities]
    write_schem(HERE / "vaeloria-warzone.schem", w.v, w.pal.names, (EXT, -YMIN, EXT), bes)
    o = build_outer()
    write_schem(HERE / "vaeloria-avant-poste-exterieur.schem", o.v, o.pal.names, (24, 1, 24))
    render(w, HERE / "apercu-warzone-dessus.png", HERE / "apercu-warzone-sud.png", 2)
    # Vue rapprochée du dragon.
    d = Vol(half=66, ymin=-1, ymax=70)
    dragon(d, np.random.default_rng(21))
    render(d, HERE / "apercu-dragon-dessus.png", HERE / "apercu-dragon-sud.png", 6)
    print("bâtiments ajoutés :", w.placed, "· zones d'AP :", len(w.ap_zones))
    print("warzone :", int((w.v > 0).sum()), "blocs ·", w.v.shape[::-1], "· avant-poste extérieur :", o.v.shape[::-1])


if __name__ == "__main__":
    main()
