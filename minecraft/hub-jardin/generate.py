#!/usr/bin/env python3
"""
Hub « Jardin suspendu » de VÆLORIA : grande île flottante organique, très végétale.

- Falaises en strates de terracotta (orange, beige, brun) qui virent à l'obsidienne et à l'améthyste en profondeur.
- Couronne de colonnes rocheuses autour de l'île, reliées par des guirlandes de feuillage et de lanternes.
- Place d'arrivée au centre (point d'apparition), chemins de terre sinueux vers 5 pavillons à toits rubis
  retroussés, chacun ouvrant un mode : FACTION (grand temple, nord), MARCHÉ, ARÈNE, ÉVÉNEMENTS, BOUTIQUE.
- Arbres touffus, azalées, fleurs, cristaux d'améthyste, lianes lumineuses sous l'île, îlots flottants.

Sortie : hub-jardin.schem (Sponge v2, Minecraft 1.21.4), origine = centre de la place, pieds du joueur.
    python3 generate.py [--no-preview]
Axes : X vers l'est, Z vers le sud.
"""

from __future__ import annotations

import argparse
import math
import sys
from collections import deque
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "ile-commerciale"))
import generate as ile  # noqa: E402

from generate import World, base, connect_pass, export, h2, render_iso, render_plan  # noqa: E402

G = 50  # niveau du sol
R = 50  # rayon moyen de l'île
B = 70  # demi-taille de la zone de travail

DIRS = {"east": (1, 0), "west": (-1, 0), "south": (0, 1), "north": (0, -1)}
OPP = {"east": "west", "west": "east", "south": "north", "north": "south"}

ROOF = "crimson"  # toits rubis (planches carmin) ...
TRIM = "red_nether_brick"  # ... bordés de briques du Nether rouges
LEAVES = ["oak_leaves", "oak_leaves", "jungle_leaves", "azalea_leaves", "flowering_azalea_leaves"]
FLOWERS = ["poppy", "dandelion", "allium", "cornflower", "azure_bluet", "oxeye_daisy", "red_tulip", "allium"]
BANDS = ["orange_terracotta", "orange_terracotta", "terracotta", "orange_terracotta", "yellow_terracotta",
         "orange_terracotta", "smooth_red_sandstone", "terracotta", "brown_terracotta"]

ile.COLORS.update({
    "grass_block": (93, 140, 52), "dirt": (134, 96, 67), "coarse_dirt": (119, 85, 59), "dirt_path": (148, 122, 65),
    "packed_mud": (142, 106, 79), "mud_bricks": (137, 103, 79), "rooted_dirt": (144, 103, 76), "gravel": (131, 127, 126),
    "orange_terracotta": (161, 83, 37), "terracotta": (152, 94, 67), "yellow_terracotta": (186, 133, 35),
    "brown_terracotta": (77, 51, 35), "smooth_red_sandstone": (181, 97, 31), "white_terracotta": (209, 178, 161),
    "obsidian": (15, 10, 24), "crying_obsidian": (40, 10, 70), "amethyst_block": (133, 97, 191),
    "amethyst_cluster": (163, 126, 207), "purple_terracotta": (118, 70, 86),
    "oak_leaves": (60, 120, 40), "jungle_leaves": (48, 110, 30), "azalea_leaves": (90, 125, 45),
    "flowering_azalea_leaves": (110, 120, 70), "oak_log": (109, 85, 50), "dark_oak_log": (60, 46, 26),
    "stripped_dark_oak_log": (96, 76, 49), "dark_oak_planks": (66, 43, 20), "dark_oak_slab": (66, 43, 20),
    "dark_oak_fence": (66, 43, 20), "spruce_planks": (114, 84, 48), "red_terracotta": (143, 61, 46),
    "stone_bricks": (122, 121, 122), "mossy_stone_bricks": (115, 121, 105), "chiseled_stone_bricks": (119, 118, 119),
    "stone_brick_stairs": (122, 121, 122), "red_nether_brick_stairs": (70, 7, 9), "red_nether_brick_wall": (70, 7, 9),
    "red_nether_brick_slab": (70, 7, 9), "short_grass": (90, 140, 50), "fern": (80, 125, 45), "dandelion": (230, 210, 40),
    "allium": (180, 110, 220), "cornflower": (70, 100, 200), "azure_bluet": (220, 225, 230), "oxeye_daisy": (230, 230, 220),
    "azalea": (100, 130, 50), "flowering_azalea": (150, 110, 140), "cave_vines": (90, 110, 40),
    "cave_vines_plant": (90, 110, 40), "red_carpet": (160, 39, 34), "water": (60, 90, 200),
    "polished_andesite": (132, 135, 134), "sandstone": (216, 203, 155), "smooth_sandstone": (223, 214, 170),
    "red_concrete": (142, 32, 32), "purple_concrete": (100, 32, 156), "magenta_terracotta": (149, 88, 108),
    "yellow_concrete": (240, 175, 21), "blackstone": (42, 36, 41), "black_concrete": (8, 10, 15), "crimson_planks": (101, 49, 71), "crimson_stairs": (101, 49, 71),
    "red_nether_bricks": (90, 14, 18), "moss_block": (89, 109, 45), "moss_carpet": (89, 109, 45),
})


# --------------------------------------------------------------------------- bruit


def vnoise(x: float, z: float, cell: float, salt: int) -> float:
    """Bruit de valeur lissé 0..1."""
    gx, gz = x / cell, z / cell
    x0, z0 = math.floor(gx), math.floor(gz)
    fx, fz = gx - x0, gz - z0
    fx, fz = fx * fx * (3 - 2 * fx), fz * fz * (3 - 2 * fz)
    a, b = h2(x0, z0, salt), h2(x0 + 1, z0, salt)
    c, d = h2(x0, z0 + 1, salt), h2(x0 + 1, z0 + 1, salt)
    return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz


def edge_r(x: float, z: float) -> float:
    t = math.atan2(z, x)
    return R * (1 + 0.08 * math.sin(3 * t + 0.4) + 0.06 * math.sin(5 * t + 2.2) + 0.035 * math.sin(11 * t + 1.1))


def isl_d(x: float, z: float) -> float:
    return math.hypot(x, z) / edge_r(x, z)


def cliff(x: int, y: int, z: int, depth_frac: float) -> str:
    """Strates de terracotta, qui virent à l'obsidienne et à l'améthyste vers la pointe."""
    if depth_frac > 0.72 and h2(x // 2, z // 2, y // 3 + 61) < (depth_frac - 0.72) * 3:
        v = h2(x, z, y + 62)
        return "amethyst_block" if v < 0.25 else "crying_obsidian" if v < 0.45 else "obsidian"
    k = (y + int(vnoise(x, z, 6, 63) * 4)) // 2
    return BANDS[k % len(BANDS)]


# --------------------------------------------------------------------------- éléments


class Hub:
    def __init__(self) -> None:
        self.w = World()
        self.flat: dict[tuple[int, int], int] = {}  # (x, z) -> hauteur imposée
        self.reserved: set[tuple[int, int]] = set()
        self.top: dict[tuple[int, int], int] = {}  # hauteur du sol par colonne

    # ----------------------------------------------------------- terrain
    def plan_terrain(self) -> None:
        """Hauteur du sol : légères collines (0 à 3 blocs) qui s'aplanissent près des chemins et bâtiments."""
        dist: dict[tuple[int, int], int] = {p: 0 for p in self.flat}
        q = deque(self.flat)
        while q:
            p = q.popleft()
            if dist[p] >= 8:
                continue
            for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (p[0] + dx, p[1] + dz)
                if n not in dist:
                    dist[n] = dist[p] + 1
                    q.append(n)
        for x in range(-B, B + 1):
            for z in range(-B, B + 1):
                d = isl_d(x, z)
                if d > 1:
                    continue
                if (x, z) in self.flat:
                    self.top[(x, z)] = self.flat[(x, z)]
                    continue
                k = min(1.0, max(0.0, (dist.get((x, z), 9) - 2) / 5))
                hill = vnoise(x, z, 13, 70) * 3.6 * k * min(1.0, (1 - d) * 6)
                self.top[(x, z)] = G + int(hill)

    def build_island(self) -> None:
        w = self.w
        for (x, z), top in self.top.items():
            d = isl_d(x, z)
            prof = (1 - d) ** 0.45 if d < 1 else 0
            chunk = 0.7 + 0.6 * h2(x // 3, z // 3, 71)  # colonnes irrégulières, façon falaise
            depth = int(5 + prof * 52 * chunk)
            bottom = G - depth
            for y in range(bottom, top + 1):
                if y == top:
                    s = "grass_block"
                elif y >= top - 2:
                    s = "dirt"
                else:
                    s = cliff(x, y, z, (G - y) / 48)
                w.set(x, y, z, s)
            self.hang(x, bottom - 1, z, d, (G - bottom) / 48)

    def hang(self, x: int, y: int, z: int, d: float, frac: float) -> None:
        """Sous la roche : lianes à baies lumineuses, racines, cristaux d'améthyste."""
        w = self.w
        v = h2(x, z, 80)
        if frac > 0.7 and v < 0.07:
            w.set(x, y, z, "amethyst_cluster[facing=down]")
        elif d > 0.55 and v < 0.16:
            n = 1 + int(h2(x, z, 81) * (7 if d > 0.85 else 4))
            for k in range(n):
                last = k == n - 1
                berries = "true" if h2(x, z, 82 + k) < 0.3 else "false"
                w.set(x, y - k, z, f"cave_vines[age=25,berries={berries}]" if last else f"cave_vines_plant[berries={berries}]")
        elif v < 0.2:
            w.set(x, y, z, "hanging_roots")

    # ----------------------------------------------------------- colonnes et îlots
    def pillar(self, cx: int, cz: int, r: float, top: int, bottom: int) -> tuple[int, int, int]:
        w = self.w
        for x in range(cx - int(r) - 2, cx + int(r) + 3):
            for z in range(cz - int(r) - 2, cz + int(r) + 3):
                a = math.atan2(z - cz, x - cx)
                rr = r * (1 + 0.12 * math.sin(4 * a + cx) + 0.07 * math.sin(7 * a + cz))
                dd = math.hypot(x - cx, z - cz) / rr
                if dd > 1:
                    continue
                b = bottom + int((dd ** 2) * (top - bottom) * 0.45 + h2(x, z, 83) * 3)  # pointe vers le bas
                t = top - (1 if dd > 0.8 and h2(x, z, 84) < 0.5 else 0)
                for y in range(b, t + 1):
                    s = "grass_block" if y == t else "dirt" if y >= t - 1 else cliff(x, y, z, (top - y) / 40)
                    w.set(x, y, z, s)
                self.top[(x, z)] = max(self.top.get((x, z), -99), t)
                self.hang(x, b - 1, z, 0.9, (top - b) / 40)
        return cx, top, cz

    def islet(self, cx: int, cz: int, top: int, r: float) -> None:
        w = self.w
        for x in range(cx - int(r) - 2, cx + int(r) + 3):
            for z in range(cz - int(r) - 2, cz + int(r) + 3):
                a = math.atan2(z - cz, x - cx)
                dd = math.hypot(x - cx, z - cz) / (r * (1 + 0.15 * math.sin(3 * a + cx)))
                if dd > 1:
                    continue
                depth = 2 + int((1 - dd) ** 0.6 * r * 2.4 * (0.8 + 0.4 * h2(x // 2, z // 2, 85)))
                for y in range(top - depth, top + 1):
                    w.set(x, y, z, "grass_block" if y == top else "dirt" if y == top - 1 else cliff(x, y, z, (top - y) / (r * 2.4)))
                self.top[(x, z)] = top
                self.hang(x, top - depth - 1, z, 0.9, 0.8)

    # ----------------------------------------------------------- végétation
    def tree(self, x: int, z: int, size: int, salt: int = 0) -> None:
        w = self.w
        y0 = self.top.get((x, z), G) + 1
        th = 3 + size + int(h2(x, z, 90 + salt) * 2)
        log = "dark_oak_log[axis=y]" if size >= 3 else "oak_log[axis=y]"
        trunk = [(0, 0)] + ([(1, 0), (0, 1), (1, 1)] if size >= 4 else [])
        for dx, dz in trunk:
            for y in range(y0 - 1, y0 + th):
                w.set(x + dx, y, z + dz, log)
        leaf_main = LEAVES[int(h2(x, z, 91) * len(LEAVES))]
        blobs = [(0, th, 0, 2.2 + size * 0.7)]
        for k in range(2 + size):
            a = h2(x, z, 92 + k) * 2 * math.pi
            off = 1.5 + size * 0.6
            blobs.append((math.cos(a) * off, th - 1 + h2(x, z, 96 + k) * 2.5, math.sin(a) * off, 1.6 + size * 0.45))
        for bx, by, bz, br in blobs:
            # branche vers la touffe
            if abs(bx) + abs(bz) > 2:
                for t in range(1, 4):
                    w.set(x + round(bx * t / 4), y0 + th - 2 + t // 2, z + round(bz * t / 4), log.replace("axis=y", "axis=y"))
            rr = int(br) + 1
            for dx in range(-rr, rr + 1):
                for dz in range(-rr, rr + 1):
                    for dy in range(-rr, rr + 1):
                        px, py, pz = x + round(bx) + dx, y0 + round(by) + dy, z + round(bz) + dz
                        e = (dx * dx + dz * dz) / (br * br) + (dy * dy) / ((br * 0.8) ** 2)
                        if e <= 1 + (h2(px, pz, py) - 0.5) * 0.35 and not w.get(px, py, pz):
                            lt = leaf_main if h2(px, py, pz + 7) < 0.75 else LEAVES[int(h2(px, pz, py + 3) * len(LEAVES))]
                            w.set(px, py, pz, lt + "[persistent=true]")
        # lianes sous le feuillage
        for dx in range(-5, 6):
            for dz in range(-5, 6):
                if h2(x + dx, z + dz, 97) > 0.12:
                    continue
                for y in range(y0 + th + 4, y0 + 1, -1):
                    s = w.get(x + dx, y, z + dz)
                    if s and "leaves" in s and not w.get(x + dx, y - 1, z + dz):
                        n = 1 + int(h2(x + dx, z + dz, 98) * 3)
                        for k in range(n):
                            yy = y - 1 - k
                            if w.get(x + dx, yy, z + dz) or yy <= self.top.get((x + dx, z + dz), G) + 2:
                                break
                            w.set(x + dx, yy, z + dz, "cave_vines[age=25,berries=false]" if k == n - 1 else "cave_vines_plant[berries=false]")
                        break
        for dx in range(-1, 3):
            for dz in range(-1, 3):
                self.reserved.add((x + dx, z + dz))

    def crystal(self, x: int, y: int, z: int, size: float, down: bool = False) -> None:
        w = self.w
        sgn = -1 if down else 1
        for k in range(3 + int(size)):
            a = h2(x, z, 100 + k) * 2 * math.pi
            tilt = 0.15 + h2(x, z, 110 + k) * 0.45 if k else 0.05
            L = size * (0.55 + 0.6 * h2(x, z, 120 + k)) * (1.3 if k == 0 else 1)
            dx, dz = math.cos(a) * tilt, math.sin(a) * tilt
            n = int(L) + 1
            for t in range(n):
                px, py, pz = x + round(dx * t), y + sgn * t, z + round(dz * t)
                w.set(px, py, pz, "amethyst_block")
                if t < n * 0.5 and size >= 4:
                    for ox, oz in ((1, 0), (0, 1)):
                        w.set(px + ox, py, pz + oz, "amethyst_block")
            w.set(x + round(dx * n), y + sgn * n, z + round(dz * n), f"amethyst_cluster[facing={'down' if down else 'up'}]")
        for dx in range(-2, 3):
            for dz in range(-2, 3):
                self.reserved.add((x + dx, z + dz))

    def lamp(self, x: int, z: int, h: int = 2) -> None:
        y0 = self.top.get((x, z), G) + 1
        for y in range(y0, y0 + h):
            self.w.set(x, y, z, "dark_oak_fence")
        self.w.set(x, y0 + h, z, "lantern[hanging=false]")
        self.reserved.add((x, z))

    # ----------------------------------------------------------- place et chemins
    def plan_plaza(self) -> None:
        for x in range(-12, 13):
            for z in range(-12, 13):
                if math.hypot(x, z) <= 11.5:
                    self.flat[(x, z)] = G
                    self.reserved.add((x, z))

    def build_plaza(self) -> None:
        w = self.w
        for x in range(-12, 13):
            for z in range(-12, 13):
                d = math.hypot(x, z)
                if d > 11.5:
                    continue
                m = abs(x) + abs(z)
                if m <= 1:
                    s = "redstone_block"
                elif m <= 3:
                    s = "red_nether_bricks"
                elif m <= 4:
                    s = "chiseled_stone_bricks"
                elif d >= 10.5:
                    s = "mossy_stone_bricks" if h2(x, z, 130) < 0.35 else "stone_bricks"
                elif d >= 9.5:
                    s = "red_nether_bricks"
                else:
                    a = int((math.atan2(z, x) + math.pi) / (2 * math.pi) * 16)
                    s = "mud_bricks" if a % 2 else "packed_mud"
                    if abs(x) == abs(z) or x == 0 or z == 0:
                        s = "polished_andesite"
                w.set(x, G, z, s)
                for y in range(G + 1, G + 4):
                    w.set(x, y, z, None)
        for sx in (-1, 1):
            for sz in (-1, 1):
                self.lamp(8 * sx, 8 * sz, 3)
        # bancs
        for sx in (-1, 1):
            for sz in (-1, 1):
                fx, fz = (6 * sx, 9 * sz)
                face = "south" if sz < 0 else "north"
                for k in (0, 1):
                    w.set(fx + k * -sx, G + 1, fz, f"spruce_stairs[facing={OPP[face]}]")

    def path(self, a: tuple[float, float], b: tuple[float, float], salt: int) -> list[tuple[int, int]]:
        """Chemin de terre sinueux (courbe de Bézier + bruit), 3 à 4 blocs de large."""
        (ax, az), (bx, bz) = a, b
        mx, mz = (ax + bx) / 2, (az + bz) / 2
        nx, nz = -(bz - az), (bx - ax)
        ln = math.hypot(nx, nz) or 1
        bend = (h2(salt, 1, 140) - 0.5) * 0.5 * math.hypot(bx - ax, bz - az)
        cx, cz = mx + nx / ln * bend, mz + nz / ln * bend
        pts = []
        for i in range(0, 201):
            t = i / 200
            x = (1 - t) ** 2 * ax + 2 * (1 - t) * t * cx + t * t * bx
            z = (1 - t) ** 2 * az + 2 * (1 - t) * t * cz + t * t * bz
            pts.append((x, z))
            wdt = 1.6 + vnoise(x, z, 5, 141 + salt) * 0.9
            for dx in range(-3, 4):
                for dz in range(-3, 4):
                    if dx * dx + dz * dz <= wdt * wdt:
                        p = (round(x) + dx, round(z) + dz)
                        self.flat[p] = G
                        self.paths.add(p)
        return pts

    # ----------------------------------------------------------- pavillons
    def plan_pagoda(self, cx: int, cz: int, h: int) -> None:
        for x in range(cx - h - 4, cx + h + 5):
            for z in range(cz - h - 4, cz + h + 5):
                self.flat[(x, z)] = G
                self.reserved.add((x, z))

    def pagoda(self, cx: int, cz: int, h: int, tiers: int, door: str, lines: list[str], plat: int = 1) -> None:
        w = self.w
        ddx, ddz = DIRS[door]
        # socle en pierre
        for x in range(cx - h - 3, cx + h + 4):
            for z in range(cz - h - 3, cz + h + 4):
                m = max(abs(x - cx), abs(z - cz))
                for y in range(G, G + plat + 1):
                    if m <= h + 3 - (y - G) // 2:
                        w.set(x, y, z, "mossy_stone_bricks" if h2(x, z, y + 150) < 0.3 else "stone_bricks")
                if m == h + 3 and (x + z) % 4 == 0:
                    w.set(x, G + plat + 1, z, "lantern[hanging=false]")
        # escalier d'accès
        for k in range(plat + 1):
            for s in range(-2, 3):
                x = cx + ddx * (h + 4 + k) + (s if ddz else 0)
                z = cz + ddz * (h + 4 + k) + (s if ddx else 0)
                w.set(x, G + plat - k, z, f"stone_brick_stairs[facing={OPP[door]}]")
                for y in range(G + plat - k + 1, G + plat + 3):
                    w.set(x, y, z, None)
        y = G + plat + 1
        hs = h
        for t in range(tiers):
            wall_h = 5 if t == 0 else 4
            last = t == tiers - 1
            for x in range(cx - hs, cx + hs + 1):
                for z in range(cz - hs, cz + hs + 1):
                    ex, ez = abs(x - cx), abs(z - cz)
                    on_edge = max(ex, ez) == hs
                    for yy in range(y, y + wall_h):
                        if not on_edge:
                            w.set(x, yy, z, "spruce_planks" if (yy == y and t == 0) else None)
                            continue
                        along = ez if ex == hs else ex
                        corner = ex == hs and ez == hs
                        if corner or along % 4 == 0:
                            s = "stripped_dark_oak_log[axis=y]" if not corner else "dark_oak_log[axis=y]"
                        elif yy == y or yy == y + wall_h - 1:
                            s = "dark_oak_planks"
                        elif along % 4 == 2 and yy in (y + 1, y + 2):
                            s = "dark_oak_fence"
                        else:
                            s = "red_terracotta" if t == 0 else "white_terracotta"
                        w.set(x, yy, z, s)
            if t == 0:  # porte
                for s_ in range(-1, 2):
                    for yy in range(y, y + 4):
                        w.set(cx + ddx * hs + (s_ if ddz else 0), yy, cz + ddz * hs + (s_ if ddx else 0), None)
                sx, sz = cx + ddx * (hs + 1), cz + ddz * (hs + 1)
                w.sign(sx, y + 4, sz, f"dark_oak_wall_sign[facing={door}]",
                       ['{"text":"◆ VÆLORIA ◆","color":"dark_red"}', '{"text":"' + lines[0] + '","bold":true}',
                        '{"text":"' + lines[1] + '"}', '{"text":"' + lines[2] + '","color":"dark_gray"}'])
            ytop = y + wall_h
            # plafond
            for x in range(cx - hs + 1, cx + hs):
                for z in range(cz - hs + 1, cz + hs):
                    w.set(x, ytop - 1, z, "dark_oak_planks")
            o = 3 if t == 0 else 2
            hn = max(2, hs - 2) if not last else -1
            # avant-toit (sous-face)
            for x in range(cx - hs - o, cx + hs + o + 1):
                for z in range(cz - hs - o, cz + hs + o + 1):
                    m = max(abs(x - cx), abs(z - cz))
                    if hs < m < hs + o:
                        w.set(x, ytop - 1, z, "dark_oak_slab[type=top]")
            # toit concave : avant-toit presque plat, puis pente qui se redresse vers le faîte
            n_rings = hs + o - max(hn, -1)
            steep = int(n_rings * 0.55)
            rise = [0]
            for kk in range(1, n_rings + 1):
                rise.append(rise[-1] + (0 if kk == 1 else 2 if kk > steep else 1))
            k = 0
            r = hs + o
            while r > hn:
                yy = ytop + rise[k]
                mat = TRIM if k == 0 else ROOF
                full = TRIM + "s" if k == 0 else ROOF + "_planks"
                if k and rise[k] - rise[k - 1] == 2:  # marche haute : planches sous les escaliers
                    for x in range(cx - r, cx + r + 1):
                        for z in range(cz - r, cz + r + 1):
                            if max(abs(x - cx), abs(z - cz)) == r:
                                w.set(x, yy - 1, z, ROOF + "_planks")
                if r <= 0:
                    w.set(cx, yy, cz, full)
                    break
                for x in range(cx - r, cx + r + 1):
                    for z in range(cz - r, cz + r + 1):
                        ex, ez = x - cx, z - cz
                        if max(abs(ex), abs(ez)) != r:
                            continue
                        if abs(ex) == abs(ez):
                            s = full
                        elif abs(ex) > abs(ez):
                            s = f"{mat}_stairs[facing={'west' if ex > 0 else 'east'}]"
                        else:
                            s = f"{mat}_stairs[facing={'north' if ez > 0 else 'south'}]"
                        w.set(x, yy, z, s)
                if k == 0:  # coins retroussés + lanternes
                    for sx in (-1, 1):
                        for sz in (-1, 1):
                            px, pz = cx + sx * (r + 1), cz + sz * (r + 1)
                            w.set(px, yy + 1, pz, f"{TRIM}_wall[up=true]")
                            w.set(cx + sx * r, yy + 1, cz + sz * r, TRIM + "_slab[type=bottom]")
                            w.set(px, yy, pz, "lantern[hanging=true]")
                k += 1
                r -= 1
            if last:
                top_y = ytop + rise[min(k, len(rise) - 1)] + 1
                for yy in range(top_y, top_y + 2):
                    w.set(cx, yy, cz, f"{TRIM}_wall[up=true]")
                w.set(cx, top_y + 2, cz, "amethyst_block")
                w.set(cx, top_y + 3, cz, "amethyst_cluster[facing=up]")
            else:
                y = ytop + rise[hs + o - hn]
                for x in range(cx - hn + 1, cx + hn):
                    for z in range(cz - hn + 1, cz + hn):
                        w.set(x, y - 1, z, "dark_oak_planks")
                hs = hn
        # socle PNJ à côté de l'entrée
        side = (ddz, -ddx) if ddx == 0 else (ddz, ddx)
        px = cx + ddx * (h + 6) + 4 * (1 if ddz else 0)
        pz = cz + ddz * (h + 6) + 4 * (1 if ddx else 0)
        w.set(px, G + 1, pz, "chiseled_stone_bricks")
        w.set(px, G + 2, pz, "red_carpet")
        self.reserved.add((px, pz))
        _ = side

    # ----------------------------------------------------------- finitions
    def garland(self, a: tuple[int, int, int], b: tuple[int, int, int]) -> None:
        w = self.w
        (ax, ay, az), (bx, by, bz) = a, b
        n = int(math.hypot(bx - ax, bz - az) * 1.3) + 1
        sag = 2 + n * 0.12
        for i in range(n + 1):
            t = i / n
            x, z = round(ax + (bx - ax) * t), round(az + (bz - az) * t)
            y = round(ay + (by - ay) * t - sag * 4 * t * (1 - t))
            if not w.get(x, y, z):
                w.set(x, y, z, LEAVES[int(h2(x, z, 160) * 4)] + "[persistent=true]")
            if i % 6 == 3 and not w.get(x, y - 1, z):
                w.set(x, y - 1, z, "lantern[hanging=true]")
            elif h2(x, z, 161) < 0.3 and not w.get(x, y - 1, z):
                w.set(x, y - 1, z, "cave_vines[age=25,berries=true]")

    def ground_cover(self) -> None:
        w = self.w
        for (x, z), t in self.top.items():
            if w.get(x, t, z) != "grass_block" or w.get(x, t + 1, z) or (x, z) in self.reserved:
                continue
            v = h2(x, z, 170)
            if v < 0.26:
                w.set(x, t + 1, z, "short_grass")
            elif v < 0.30:
                w.set(x, t + 1, z, "fern")
            elif v < 0.335:
                w.set(x, t + 1, z, FLOWERS[int(h2(x, z, 171) * len(FLOWERS))])
            elif v < 0.35:
                w.set(x, t + 1, z, "azalea" if h2(x, z, 172) < 0.6 else "flowering_azalea")
            elif v < 0.362:
                w.set(x, t + 1, z, "oak_leaves[persistent=true]")
            elif v < 0.37:
                w.set(x, t, z, "moss_block")
                w.set(x, t + 1, z, "moss_carpet")

    def finish_paths(self) -> None:
        w = self.w
        for (x, z) in self.paths:
            if (x, z) in self.reserved and w.get(x, G, z) != "grass_block":
                continue
            if w.get(x, G, z) is None:
                continue
            v = h2(x, z, 180)
            s = "dirt_path" if v < 0.5 else "coarse_dirt" if v < 0.72 else "packed_mud" if v < 0.88 else "rooted_dirt" if v < 0.95 else "gravel"
            w.set(x, G, z, s)
            if w.get(x, G + 1, z) and base(w.get(x, G + 1, z)) in ("short_grass", "fern"):
                w.set(x, G + 1, z, None)


def connect_walls(w: World) -> None:
    dirs = {"north": (0, -1), "south": (0, 1), "east": (1, 0), "west": (-1, 0)}
    for (x, y, z), s in list(w.b.items()):
        n = base(s)
        if not n.endswith("_wall"):
            continue
        props = {}
        for k, (dx, dz) in dirs.items():
            o = w.get(x + dx, y, z + dz)
            props[k] = "low" if o and (base(o).endswith("_wall") or ile.is_full(o)) else "none"
        w.b[(x, y, z)] = n + "[" + ",".join(f"{k}={v}" for k, v in sorted(props.items())) + ",up=true]"


# --------------------------------------------------------------------------- main

# (nom, x, z, demi-taille, étages, porte, lignes du panneau, hauteur du socle)
PAVILIONS = [
    ("faction", 0, -33, 8, 3, "south", ["FACTION", "Le monde", "Saison I"], 2),
    ("marche", 33, -6, 5, 2, "west", ["MARCHÉ", "Île Marchande", "Boutiques"], 1),
    ("arene", -33, -6, 5, 2, "east", ["ARÈNE", "PvP 1.8", "Duels"], 1),
    ("evenements", -22, 28, 5, 2, "north", ["ÉVÉNEMENTS", "KOTH · Totem", "Avant-postes"], 1),
    ("boutique", 22, 28, 5, 2, "north", ["BOUTIQUE", "Grades · Votes", "vaeloria.fr"], 1),
]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-preview", action="store_true")
    args = ap.parse_args()

    hub = Hub()
    hub.paths = set()
    hub.plan_plaza()
    doors = []
    for _, cx, cz, h, _, door, _, plat in PAVILIONS:
        hub.plan_pagoda(cx, cz, h)
        dx, dz = DIRS[door]
        doors.append((cx + dx * (h + 5 + plat), cz + dz * (h + 5 + plat)))
    for i, (bx, bz) in enumerate(doors):
        ln = math.hypot(bx, bz)
        hub.path((bx / ln * 10, bz / ln * 10), (bx, bz), i)
    hub.path((0, 10), (0, 47), 9)  # belvédère sud
    hub.plan_terrain()

    # ---------------- relief : île principale + pétales + tours + îlots, en disques empilés
    from relief import Body, dark_crystal, material
    from dragon import Dragon

    main_body = Body(0, 0, R, G, 58, 1)
    main_body.radius = lambda a: edge_r(math.cos(a), math.sin(a))
    bodies: list[tuple[Body, bool]] = [(main_body, True)]
    petals, towers = [], []
    DRAGON_A = -math.pi / 4  # nord-est
    for i in range(17):
        a = (i + 0.35 * h2(i, 0, 230)) / 17 * 2 * math.pi
        if abs(math.atan2(math.sin(a - DRAGON_A), math.cos(a - DRAGON_A))) < 0.32:
            continue
        r = 7 + h2(i, 1, 231) * 5
        er = edge_r(math.cos(a), math.sin(a))
        cx, cz = math.cos(a) * (er + r * 0.2), math.sin(a) * (er + r * 0.2)
        top = G - 3 + int(h2(i, 2, 232) * 9)
        b = Body(cx, cz, r, top, r * 2.4, 10 + i, crystal=i % 3 == 0)
        bodies.append((b, False))
        petals.append(b)
    for i, ang in enumerate((150, 205, 250, 20, 95)):
        a = math.radians(ang)
        er = edge_r(math.cos(a), math.sin(a))
        cx, cz = math.cos(a) * (er + 9), math.sin(a) * (er + 9)
        bodies.append((Body(cx, cz, 6, G - 1, 30, 40 + i), False))
        nd = 2 + i % 3
        for j in range(nd):
            bodies.append((Body(cx, cz, 4.6 - j * 0.3, G + 5 + j * 6, 7, 50 + i * 5 + j), False))
        towers.append((round(cx), G + 5 + (nd - 1) * 6, round(cz)))
    dr = edge_r(math.cos(DRAGON_A), math.sin(DRAGON_A)) + 8
    dx_, dz_ = round(math.cos(DRAGON_A) * dr), round(math.sin(DRAGON_A) * dr)
    bodies += [(Body(dx_, dz_, 12, G + 1, 40, 70), False), (Body(dx_, dz_, 9.5, G + 8, 8, 71), False),
               (Body(dx_, dz_, 10.5, G + 15, 8, 72), False)]
    islets = []
    for i, (ang, rr, dy, r) in enumerate([(20, 76, 6, 5), (70, 82, -10, 7), (125, 74, 12, 4.5), (165, 84, -4, 6),
                                          (215, 78, 9, 5.5), (260, 86, -12, 7), (330, 80, -6, 6)]):
        a = math.radians(ang)
        b = Body(math.cos(a) * rr, math.sin(a) * rr, r, G + dy, r * 2.5, 80 + i, crystal=i % 2 == 0)
        bodies.append((b, False))
        islets.append(b)

    cols: dict[tuple[int, int], list[list[int]]] = {}
    for b, is_main in bodies:
        rr = int(b.r * 1.25) + 2
        for x in range(int(b.cx) - rr, int(b.cx) + rr + 1):
            for z in range(int(b.cz) - rr, int(b.cz) + rr + 1):
                iv = b.interval(x, z, hub.top.get((x, z)) if is_main else None)
                if not iv:
                    continue
                lo, top = iv
                if not is_main and (x, z) in hub.flat:
                    top = min(top, G)
                    lo = min(lo, top)
                cols.setdefault((x, z), []).append([lo, top])
    w = hub.w
    for (x, z), ivs in cols.items():
        ivs.sort()
        merged = [ivs[0][:]]
        for lo, top in ivs[1:]:
            if lo <= merged[-1][1] + 1:
                merged[-1][1] = max(merged[-1][1], top)
            else:
                merged.append([lo, top])
        for lo, top in merged:
            for y in range(lo, top + 1):
                w.set(x, y, z, material(x, y, z, top, G))
            d = isl_d(x, z)
            hub.hang(x, lo - 1, z, d if d < 1 else 0.9, (G - lo) / 48)
        hub.top[(x, z)] = merged[-1][1]

    hub.build_plaza()
    for _, cx, cz, h, tiers, door, lines, plat in PAVILIONS:
        hub.pagoda(cx, cz, h, tiers, door, lines, plat)
    hub.finish_paths()

    # dragon rubis sur sa tour, tourné vers la place
    Dragon(w, dx_ - 2, G + 16, dz_ + 2, (-dx_, -dz_), scale=1.45).build()
    for x in range(dx_ - 12, dx_ + 13):
        for z in range(dz_ - 12, dz_ + 13):
            hub.reserved.add((x, z))

    def lowest(x: int, z: int) -> int | None:
        for y in range(G - 80, G + 30):
            if w.get(x, y, z) and base(w.get(x, y, z)) in ("obsidian", "crying_obsidian", "amethyst_block") or (
                    w.get(x, y, z) and "terracotta" in w.get(x, y, z) or w.get(x, y, z) in ("sandstone", "smooth_sandstone", "smooth_red_sandstone")):
                return y
        return None

    # gros cristaux sombres sous les pétales, les îlots et l'île principale
    for b in petals + islets:
        x, z = round(b.cx), round(b.cz)
        lo = lowest(x, z)
        if b.crystal and lo is not None:
            dark_crystal(w, x, lo, z, b.r * 1.6, b.r * 0.42, b.salt)
    for i in range(6):
        a, rr = h2(i, 6, 240) * 2 * math.pi, 6 + h2(i, 7, 241) * 24
        x, z = round(math.cos(a) * rr), round(math.sin(a) * rr)
        lo = lowest(x, z)
        if lo is not None:
            dark_crystal(w, x, lo, z, 14 + h2(i, 8, 242) * 12, 3 + h2(i, 9, 243) * 2, i * 7)

    # décor des pétales, tours et îlots
    for i, b in enumerate(petals):
        x, z = round(b.cx), round(b.cz)
        t = hub.top.get((x, z), b.top)
        if (x, z) in hub.flat:
            continue
        if i % 3 == 0:
            hub.crystal(x, t + 1, z, 4 + b.r * 0.35)
        elif i % 3 == 1:
            hub.tree(x, z, 3, 300 + i)
        else:
            hub.tree(x, z, 2, 300 + i)
            hub.lamp(x + 3, z, 2)
    for i, (x, t, z) in enumerate(towers):
        hub.tree(x, z, 2 + i % 2, 320 + i)
    for i, b in enumerate(islets):
        x, z = round(b.cx), round(b.cz)
        if i % 2:
            hub.tree(x, z, 2, 340 + i)
        else:
            hub.crystal(x, b.top + 1, z, 3 + b.r * 0.5)
    # guirlandes entre pétales voisins
    for a_, b_ in zip(petals, petals[1:] + petals[:1]):
        pa, pb = (round(a_.cx), a_.top + 4, round(a_.cz)), (round(b_.cx), b_.top + 4, round(b_.cz))
        if math.dist(pa, pb) < 30:
            hub.garland(pa, pb)

    # arbres et cristaux sur l'île
    placed: list[tuple[int, int]] = []
    for i in range(900):
        a, rr = h2(i, 1, 200) * 2 * math.pi, 13 + h2(i, 2, 201) * 36
        x, z = round(math.cos(a) * rr), round(math.sin(a) * rr)
        if isl_d(x, z) > 0.9 or (x, z) in hub.flat:
            continue
        size = 1 + int(h2(i, 3, 202) * 4)
        sp = 4 + size * 2
        if any((x - px) ** 2 + (z - pz) ** 2 < sp * sp for px, pz in placed):
            continue
        if any((x + dx, z + dz) in hub.flat or (x + dx, z + dz) in hub.reserved for dx in range(-2, 3) for dz in range(-2, 3)):
            continue
        placed.append((x, z))
        if len(placed) % 7 == 3:
            hub.crystal(x, hub.top[(x, z)] + 1, z, 4 + size)
        else:
            hub.tree(x, z, size, i)
        if len(placed) >= 46:
            break
    # lampadaires le long des chemins
    for (x, z) in sorted(hub.paths):
        if h2(x, z, 220) < 0.025 and (x, z) not in hub.reserved:
            for dx, dz in ((2, 0), (-2, 0), (0, 2), (0, -2)):
                p = (x + dx, z + dz)
                if p not in hub.paths and p not in hub.reserved and p in hub.top and hub.w.get(p[0], hub.top[p] + 1, p[1]) is None:
                    hub.lamp(*p)
                    break

    hub.ground_cover()
    connect_pass(hub.w)
    connect_walls(hub.w)

    info = export(hub.w, HERE / "hub-jardin.schem", (0, G + 1, 0))
    print(f"hub-jardin {info['size'][0]}×{info['size'][1]}×{info['size'][2]}  blocs={info['blocks']}  "
          f"palette={info['palette']}  offset={info['offset']}")
    if not args.no_preview:
        # vue depuis le sud-ouest (côté spawn) : le dragon fait face au spectateur
        sw = {(-x, y, -z): s for (x, y, z), s in hub.w.b.items()}
        render_iso(sw, HERE / "apercu-isometrique.png", scale=4, bg=(150, 190, 225))
        centre = {p: b for p, b in sw.items() if abs(p[0]) <= 64 and abs(p[2]) <= 64 and p[1] >= G - 12}
        render_iso(centre, HERE / "apercu-centre.png", scale=8, bg=(150, 190, 225))
        labels = [(cx, cz, n_[0]) for _, cx, cz, h, _, _, n_, _ in PAVILIONS] + [(0, 0, "SPAWN")]
        render_plan(hub.w.b, HERE / "plan.png", [], G + 30, scale=5, labels=labels,
                    caption="Hub « Jardin suspendu » — vue de dessus, nord en haut. Origine : centre de la place (spawn).")


if __name__ == "__main__":
    main()
