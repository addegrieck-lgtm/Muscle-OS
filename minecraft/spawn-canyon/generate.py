#!/usr/bin/env python3
"""
Spawn « Canyon des Arches » de VÆLORIA : cour-jardin au fond d'un canyon, dominée par deux façades monumentales
en grès (colonnades, toit de tuiles orange, galerie d'arcades ajourée, médaillon, pinacles) percées chacune d'une
grande arche qui sert de portail.

- Arche ouest : FACTION (médaillon « F »). Arche est : ARÈNE (médaillon « A »).
- Terrasse devant les façades, grands escaliers, balustrades, braseros.
- Cour en grès à motifs, foyer central, jardinières avec arbres taillés, bancs, lampadaires, terrasses latérales.
- Canyon en strates de terracotta tout autour, pics orange et violets, île flottante (dessous en cône).

Sortie : spawn-canyon.schem (Sponge v2, Minecraft 1.21.4). Origine = point d'apparition (pieds du joueur),
au sud du foyer, face au nord (aux arches).
    python3 generate.py [--no-preview]
Axes : X vers l'est, Z vers le sud.
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "ile-commerciale"))
import generate as ile  # noqa: E402

from generate import World, base, connect_pass, export, h2, render_iso  # noqa: E402

G = 60  # sol de la cour
B = G + 4  # sol de la terrasse et base des façades
FRONT = -36  # plan avant des façades
BACK = -48
CX = 46  # demi-largeur de la cour
CZ_S = 44  # bord sud de la cour
SPAWN = (0, 12)

SS, CUT, CHIS, SMOOTH = "sandstone", "cut_sandstone", "chiseled_sandstone", "smooth_sandstone"
RSS, RCUT, RCHIS, RSMOOTH = "red_sandstone", "cut_red_sandstone", "chiseled_red_sandstone", "smooth_red_sandstone"
PANEL = "light_gray_terracotta"

ile.COLORS.update({
    "sandstone": (216, 203, 155), "cut_sandstone": (218, 206, 160), "chiseled_sandstone": (212, 198, 148),
    "smooth_sandstone": (223, 214, 170), "sandstone_stairs": (216, 203, 155), "sandstone_wall": (216, 203, 155),
    "sandstone_slab": (216, 203, 155), "cut_sandstone_slab": (218, 206, 160), "smooth_sandstone_stairs": (223, 214, 170),
    "red_sandstone": (186, 99, 29), "cut_red_sandstone": (189, 101, 31), "chiseled_red_sandstone": (183, 96, 27),
    "smooth_red_sandstone": (181, 97, 31), "red_sandstone_stairs": (186, 99, 29), "red_sandstone_wall": (186, 99, 29),
    "red_sandstone_slab": (186, 99, 29), "light_gray_terracotta": (135, 107, 98), "terracotta": (152, 94, 67),
    "brown_terracotta": (77, 51, 35), "white_terracotta": (209, 178, 161), "orange_terracotta": (161, 83, 37),
    "purple_terracotta": (118, 70, 86), "magenta_terracotta": (149, 88, 108), "spruce_planks": (114, 84, 48),
    "stripped_spruce_log": (115, 89, 52), "dark_oak_log": (60, 46, 26), "dark_oak_leaves": (40, 75, 30),
    "spruce_leaves": (45, 70, 45), "grass_block": (93, 140, 52), "coarse_dirt": (119, 85, 59), "campfire": (230, 140, 50),
    "netherrack": (97, 38, 38), "fire": (240, 140, 40), "orange_stained_glass": (216, 127, 51), "shroomlight": (240, 146, 70),
    "orange_tulip": (230, 120, 40), "dead_bush": (107, 79, 40), "fern": (80, 125, 45), "short_grass": (90, 140, 50),
    "rose_bush": (160, 40, 40), "lantern": (230, 170, 80), "packed_mud": (142, 106, 79), "mud_bricks": (137, 103, 79),
    "smooth_quartz": (235, 229, 222), "vine": (60, 110, 40), "granite": (149, 103, 85), "polished_granite": (154, 106, 89),
})

LETTERS = {
    "F": ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
    "A": [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
}

# (centre x, lettre, lignes du panneau)
FACADES = [(-28, "F", ["FACTION", "Le monde", "Saison I"]), (28, "A", ["ARÈNE", "PvP 1.8", "Duels"])]


def vnoise(x: float, z: float, cell: float, salt: int) -> float:
    gx, gz = x / cell, z / cell
    x0, z0 = math.floor(gx), math.floor(gz)
    fx, fz = gx - x0, gz - z0
    fx, fz = fx * fx * (3 - 2 * fx), fz * fz * (3 - 2 * fz)
    a, b, c, d = h2(x0, z0, salt), h2(x0 + 1, z0, salt), h2(x0, z0 + 1, salt), h2(x0 + 1, z0 + 1, salt)
    return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz


def in_court(x: float, z: float, margin: float = 0) -> bool:
    """Cour : rectangle aux coins sud arrondis, de la façade (nord) au bord sud."""
    if z < BACK - 4 - margin or z > CZ_S + margin or abs(x) > CX + margin:
        return False
    rc = 14
    if z > CZ_S - rc and abs(x) > CX - rc:
        return math.hypot(abs(x) - (CX - rc), z - (CZ_S - rc)) <= rc + margin
    return True


class Spawn:
    def __init__(self) -> None:
        self.w = World()
        self.ground: dict[tuple[int, int], int] = {}
        self.free: set[tuple[int, int]] = set()

    # ------------------------------------------------------------------ terrain
    def canyon(self) -> None:
        w = self.w
        for x in range(-74, 75):
            for z in range(-56, 72):
                # bord extérieur de l'île : ellipse irrégulière
                a = math.atan2(z - 6, x)
                rr = math.hypot(x / 74, (z - 6) / 66) / (1 + 0.06 * math.sin(5 * a) + 0.04 * math.sin(9 * a + 1))
                if rr > 1:
                    continue
                if z < BACK - 4:  # derrière les façades : simple corniche au niveau de la terrasse
                    top = B
                elif in_court(x, z):
                    top = G
                else:
                    # distance à la cour → falaises qui montent en gradins irréguliers
                    d = next((k for k in range(1, 30) if in_court(x, z, k)), 30)
                    jag = h2(x // 3, z // 3, 5) * 6 + vnoise(x, z, 9, 6) * 10
                    top = G + int(min(48, 8 + d * 2.1 + jag))
                    if rr > 0.86:  # retombée vers le bord de l'île
                        top = int(top - (rr - 0.86) / 0.14 * (top - G + 6))
                bottom = G - 8 - int((1 - rr) ** 0.6 * 34 * (0.8 + 0.4 * h2(x // 4, z // 4, 7)))
                for y in range(bottom, top + 1):
                    w.set(x, y, z, self.rock(x, y, z))
                self.ground[(x, z)] = top
                if top > G + 3 and h2(x, z, 8) < 0.05:
                    w.set(x, top + 1, z, "dead_bush")
                if not in_court(x, z) and z >= BACK - 4 and h2(x, z, 9) < 0.06:
                    w.set(x, bottom - 1, z, "pointed_dripstone[thickness=tip,vertical_direction=down]")

    @staticmethod
    def rock(x: int, y: int, z: int) -> str:
        bands = ["terracotta", "light_gray_terracotta", "terracotta", "brown_terracotta", "white_terracotta",
                 "terracotta", "light_gray_terracotta", "packed_mud"]
        k = (y + int(vnoise(x, z, 7, 10) * 3)) // 2
        if vnoise(x, z, 6, 11) > 0.72 and h2(x // 2, z // 2, y // 3) < 0.8:
            return "orange_terracotta" if (y // 2) % 3 else RSMOOTH
        return bands[k % len(bands)]

    def spire(self, x0: int, z0: int, h: int, r: float, purple: bool) -> None:
        """Pic rocheux en gradins, orange ou violet."""
        w = self.w
        mats = ["purple_terracotta", "magenta_terracotta", "purple_terracotta"] if purple else \
            ["orange_terracotta", RSMOOTH, "orange_terracotta", RCUT]
        y0 = self.ground.get((x0, z0), G)
        for k in range(h):
            t = k / h
            rr = r * (1 - t) ** 0.7 + 0.5
            ox = round(math.sin(k * 0.6 + x0) * 0.8)
            oz = round(math.cos(k * 0.5 + z0) * 0.8)
            ri = int(rr) + 1
            for dx in range(-ri, ri + 1):
                for dz in range(-ri, ri + 1):
                    if abs(dx) + abs(dz) <= rr * 1.2 and max(abs(dx), abs(dz)) <= rr:
                        w.set(x0 + dx + ox, y0 + 1 + k, z0 + dz + oz, mats[(k // 2 + dx) % len(mats)])
        for dx in range(-int(r) - 2, int(r) + 3):
            for dz in range(-int(r) - 2, int(r) + 3):
                self.free.discard((x0 + dx, z0 + dz))

    # ------------------------------------------------------------------ cour
    def court(self) -> None:
        w = self.w
        for x in range(-CX, CX + 1):
            for z in range(BACK - 4, CZ_S + 1):
                if not in_court(x, z):
                    continue
                for y in range(G + 1, G + 60):
                    if w.get(x, y, z) and z >= -30:
                        w.set(x, y, z, None)
                if z >= -26:
                    w.set(x, G, z, self.floor(x, z))
                    self.free.add((x, z))
        # terrasse devant les façades
        for x in range(-CX, CX + 1):
            for z in range(BACK - 4, -26):
                if not in_court(x, z):
                    continue
                for y in range(G, B + 1):
                    w.set(x, y, z, SMOOTH if y == B else CUT)
                for y in range(B + 1, B + 50):
                    w.set(x, y, z, None)
                if z >= FRONT and (x + z) % 2 == 0 and z > FRONT + 1:
                    w.set(x, B, z, CUT)
        # balustrade et grands escaliers
        for x in range(-CX, CX + 1):
            stair = any(abs(x - fx) <= 6 for fx, *_ in FACADES) or abs(x) <= 2
            if stair:
                for k in range(4):
                    z = -26 + k
                    w.set(x, B - k, z, "sandstone_stairs[facing=north]")
                    for y in range(G, B - k):
                        w.set(x, y, z, CUT)
                    self.free.discard((x, z))
            else:
                w.set(x, B + 1, -27, "sandstone_wall[up=true]" if x % 4 else CHIS)
                if x % 4 == 0:
                    w.set(x, B + 2, -27, "lantern[hanging=false]")
        for fx, *_ in FACADES:
            for s in (-7, 7):
                for k in range(4):
                    w.set(fx + s, B - k + 1, -26 + k, CHIS)
                w.set(fx + s, B + 2, -27, "campfire[lit=true]")
        # foyer central
        for x in range(-6, 7):
            for z in range(-6, 7):
                d = math.hypot(x, z)
                if d <= 2.6:
                    w.set(x, G, z, "netherrack")
                    w.set(x, G + 1, z, "fire")
                elif d <= 3.6:
                    w.set(x, G, z, RCHIS)
                    w.set(x, G + 1, z, "red_sandstone_slab[type=bottom]")
                elif d <= 5.6:
                    w.set(x, G, z, RCUT if int(math.degrees(math.atan2(z, x)) // 30) % 2 else RSMOOTH)
                self.free.discard((x, z))
        # marque du point d'apparition
        sx, sz = SPAWN
        for dx in range(-1, 2):
            for dz in range(-1, 2):
                w.set(sx + dx, G, sz + dz, CHIS if (dx, dz) != (0, 0) else RCHIS)
                self.free.discard((sx + dx, sz + dz))

    @staticmethod
    def floor(x: int, z: int) -> str:
        d = math.hypot(x, z)
        if 9.5 <= d <= 10.5 or 17.5 <= d <= 18.4:
            return CUT
        a = math.degrees(math.atan2(z, x)) % 45
        if 10.5 < d < 17.5 and (a < 2.2 or a > 42.8):
            return CUT
        if abs(x) in (24, 25) and z > -20 or z in (30, 31):
            return SS
        # dalles en losange
        if (x + z) % 8 == 0 or (x - z) % 8 == 0:
            return SS if d > 18.4 else SMOOTH
        return SMOOTH

    def planter(self, x0: int, z0: int, rx: int, rz: int) -> None:
        w = self.w
        for x in range(x0 - rx, x0 + rx + 1):
            for z in range(z0 - rz, z0 + rz + 1):
                e = ((x - x0) / (rx + 0.5)) ** 2 + ((z - z0) / (rz + 0.5)) ** 2
                if e > 1:
                    continue
                edge = ((x - x0) / (rx - 0.5)) ** 2 + ((z - z0) / (rz - 0.5)) ** 2 > 1
                w.set(x, G, z, CUT if edge else "grass_block")
                if edge:
                    w.set(x, G + 1, z, "sandstone_slab[type=bottom]")
                else:
                    v = h2(x, z, 30)
                    w.set(x, G + 1, z, "short_grass" if v < 0.35 else "fern" if v < 0.5 else "orange_tulip" if v < 0.6
                          else "dead_bush" if v < 0.66 else None)
                self.free.discard((x, z))
        self.bonsai(x0, G + 1, z0, 3 + int(h2(x0, z0, 31) * 2))

    def bonsai(self, x: int, y: int, z: int, h: int) -> None:
        """Arbre taillé : tronc tordu en chêne noir, plateaux de feuillage plats."""
        w = self.w
        cx, cz = x, z
        leaf = "dark_oak_leaves[persistent=true]" if h2(x, z, 40) < 0.6 else "spruce_leaves[persistent=true]"
        for k in range(h + 2):
            if k and h2(x, z, 41 + k) < 0.4:
                cx += 1 if h2(x, z, 42 + k) < 0.5 else -1
            if k and h2(x, z, 43 + k) < 0.3:
                cz += 1 if h2(x, z, 44 + k) < 0.5 else -1
            w.set(cx, y + k, cz, "dark_oak_log[axis=y]")
        pads = [(cx, y + h + 2, cz, 3.2)]
        for j in range(2):
            a = h2(x, z, 50 + j) * 2 * math.pi
            px, pz = cx + round(math.cos(a) * 3), cz + round(math.sin(a) * 3)
            py = y + h - 1 + j
            for t in range(1, 4):  # branche
                w.set(cx + round(math.cos(a) * t), py - 1 + (t > 2), cz + round(math.sin(a) * t), "dark_oak_log[axis=x]")
            pads.append((px, py, pz, 2.3))
        for px, py, pz, r in pads:
            ri = int(r) + 1
            for dx in range(-ri, ri + 1):
                for dz in range(-ri, ri + 1):
                    if dx * dx + dz * dz <= r * r + h2(px + dx, pz + dz, 52):
                        if not w.get(px + dx, py, pz + dz):
                            w.set(px + dx, py, pz + dz, leaf)
                        if dx * dx + dz * dz <= (r - 1.2) ** 2 and not w.get(px + dx, py + 1, pz + dz):
                            w.set(px + dx, py + 1, pz + dz, leaf)

    def lamp(self, x: int, z: int) -> None:
        for y in range(G + 1, G + 4):
            self.w.set(x, y, z, "sandstone_wall[up=true]")
        self.w.set(x, G + 4, z, "lantern[hanging=false]")
        self.free.discard((x, z))

    def side_terrace(self, sgn: int) -> None:
        """Terrasse surélevée contre le canyon, à l'est ou à l'ouest, avec escalier et balustrade."""
        w = self.w
        x_in = sgn * (CX - 7)
        for x in range(min(x_in, sgn * CX), max(x_in, sgn * CX) + 1):
            for z in range(-22, 26):
                if not in_court(x, z):
                    continue
                for y in range(G, G + 4):
                    w.set(x, y, z, CUT if y < G + 3 else SMOOTH)
                self.free.discard((x, z))
        for z in range(-22, 26):
            if 0 <= z <= 6:
                for k in range(3):
                    w.set(x_in - sgn * k, G + 3 - k, z, f"sandstone_stairs[facing={'west' if sgn < 0 else 'east'}]")
                    self.free.discard((x_in - sgn * k, z))
            else:
                w.set(x_in, G + 4, z, "sandstone_wall[up=true]" if z % 5 else CHIS)
                if z % 5 == 0:
                    w.set(x_in, G + 5, z, "lantern[hanging=false]")
        # bancs et jardinière sur la terrasse
        for z in (-14, 16):
            self.bonsai(sgn * (CX - 3), G + 4, z, 3)

    # ------------------------------------------------------------------ façades
    def facade(self, cx: int, letter: str, lines: list[str]) -> None:
        w = self.w
        HW = 27  # demi-largeur

        def put(u: int, y: int, z: int, s: str | None) -> None:
            w.set(cx + u, y, z, s)

        # corps plein
        for u in range(-HW, HW + 1):
            for z in range(BACK, FRONT - 1):
                for y in range(B + 1, B + 23):
                    put(u, y, z, SMOOTH)
        # niveau 1 : colonnade
        for u in range(-HW, HW + 1):
            m = (u + HW) % 4
            for y in range(B + 1, B + 14):
                if m == 0:  # colonne
                    s = CHIS if y in (B + 1, B + 11) else CUT
                    put(u, y, FRONT, s)
                    put(u, y, FRONT - 1, CUT)
                else:
                    put(u, y, FRONT - 1, None)
                    win = 1 <= m <= 3 and B + 3 <= y <= B + 9 + (1 if m == 2 else 0)
                    put(u, y, FRONT - 2, PANEL if win else SMOOTH)
                    if y >= B + 12:
                        put(u, y, FRONT, CUT)
                        put(u, y, FRONT - 1, CUT)
            put(u, B + 12, FRONT, CUT)
            put(u, B + 13, FRONT, CHIS if m == 0 else CUT)
            # corniche saillante
            put(u, B + 14, FRONT + 1, "sandstone_stairs[facing=north,half=top]")
            put(u, B + 14, FRONT, CUT)
            # toit de tuiles
            for k in range(8):
                put(u, B + 15 + k, FRONT - k, "red_sandstone_stairs[facing=north]")
                for y in range(B + 14, B + 15 + k):
                    put(u, y, FRONT - k - 1, SMOOTH)
            # galerie d'arcades ajourée au-dessus du toit
            m3 = (u + HW) % 3
            for z in (BACK + 1, BACK + 2):
                for y in range(B + 23, B + 38):
                    if m3 == 0:
                        s = CHIS if y in (B + 23, B + 34) else CUT
                    elif y <= B + 32:
                        s = None
                    elif y == B + 33:
                        s = "sandstone_stairs[facing=" + ("east" if m3 == 1 else "west") + ",half=top]"
                    else:
                        s = CUT
                    put(u, y, z, s)
            for z in range(BACK, BACK + 3):
                put(u, B + 22, z, CUT)
            put(u, B + 36, BACK + 3, "sandstone_stairs[facing=north,half=top]")
            put(u, B + 37, BACK + 3, "sandstone_slab[type=bottom]")
            put(u, B + 38, BACK + 1, CHIS if m3 == 0 else "sandstone_wall[up=true]")
            put(u, B + 38, BACK + 2, None)
            if (u + HW) % 6 == 0:  # pinacles
                for y in range(B + 39, B + 42):
                    put(u, y, BACK + 1, "sandstone_wall[up=true]")
                put(u, B + 42, BACK + 1, "red_sandstone_wall[up=true]")
            # lierre sur certaines colonnes
            if m == 0 and h2(cx + u, 0, 77) < 0.4:
                for y in range(B + 11, B + 11 - int(3 + h2(cx + u, 1, 78) * 8), -1):
                    put(u, y, FRONT + 1, "vine[north=true]")
        # grands pilastres d'angle
        for u in (-HW, HW):
            for z in range(BACK, FRONT + 2):
                for y in range(B + 1, B + 30):
                    put(u, y, z, CUT if y % 4 else CHIS)
            for y in range(B + 30, B + 37):
                put(u, y, FRONT, RCUT)
                put(u, y, FRONT - 1, RCUT)
            put(u, B + 37, FRONT, "red_sandstone_wall[up=true]")
        # pinacles orange sur le toit
        for u in (-21, -13, 13, 21):
            for k in range(14):
                r = 1.4 * (1 - k / 14)
                for du in (-1, 0, 1):
                    for dz in (-1, 0, 1):
                        if abs(du) + abs(dz) <= r:
                            put(u + du, B + 17 + k, FRONT - 3 + dz, RSMOOTH if k % 3 else RCHIS)
            put(u, B + 31, FRONT - 3, "red_sandstone_wall[up=true]")
        # grande arche : on évide à travers toute la façade
        R = 9.5
        spring = B + 14
        for u in range(-12, 13):
            for y in range(B + 1, B + 27):
                inside = abs(u) <= 9 and (y <= spring or u * u + (y - spring) ** 2 <= R * R)
                ring = not inside and (u * u + (y - spring) ** 2 <= (R + 2.2) ** 2) and (y > spring - 1 or abs(u) <= 11)
                for z in range(BACK, FRONT + 2):
                    if inside:
                        put(u, y, z, None)
                    elif ring and z >= FRONT - 1:
                        ang = math.degrees(math.atan2(y - spring, u)) if y >= spring else 0
                        put(u, y, z, RCHIS if int(ang // 15) % 2 else RCUT)
            # sol du passage : seuil lumineux
            for z in range(BACK, FRONT + 1):
                if abs(u) <= 9:
                    put(u, B, z, "orange_stained_glass" if z in (BACK + 3, BACK + 4) else SMOOTH)
                    if z in (BACK + 3, BACK + 4):
                        put(u, B - 1, z, "shroomlight")
        put(0, spring + 10, FRONT + 1, CHIS)  # clé de voûte
        put(0, spring + 9, FRONT + 1, CHIS)
        # médaillon au-dessus de l'arche, devant la galerie
        my, mz = B + 34, BACK + 4
        for u in range(-7, 8):
            for y in range(my - 7, my + 8):
                d = math.hypot(u, y - my)
                if d <= 6.6:
                    s = "spruce_planks" if d > 5.4 else "stripped_spruce_log[axis=z]" if d > 4.6 else "brown_terracotta"
                    put(u, y, mz, s)
                    put(u, y, mz - 1, CUT)
        bmp = LETTERS[letter]
        for r, row in enumerate(bmp):
            for c, ch in enumerate(row):
                if ch == "#":
                    put(c - 2, my + 3 - r, mz + 1, SMOOTH)
        # couronne du médaillon : volutes et flèche
        for u in range(-9, 10):
            top = my + 7 + max(0, 3 - abs(u) // 2)
            for y in range(my + 6, top + 1):
                if abs(u) > 4 or y > my + 6:
                    put(u, y, mz, CHIS if (u + y) % 3 == 0 else CUT)
        for y in range(my + 11, my + 16):
            put(0, y, mz, "sandstone_wall[up=true]" if y < my + 15 else "red_sandstone_wall[up=true]")
        for su in (-1, 1):
            put(su * 9, my + 7, mz + 1, "sandstone_stairs[facing=" + ("east" if su < 0 else "west") + ",half=top]")
        # panneau au-dessus de l'arche
        w.sign(cx, spring + 11, FRONT + 2, "spruce_wall_sign[facing=south]",
               ['{"text":"◆ VÆLORIA ◆","color":"dark_red"}', '{"text":"' + lines[0] + '","bold":true}',
                '{"text":"' + lines[1] + '"}', '{"text":"' + lines[2] + '","color":"dark_gray"}'])
        # braseros et lumière au pied des colonnes
        for u in range(-HW + 2, HW - 1, 4):
            if abs(u) <= 12:
                continue
            put(u, B, FRONT + 1, "orange_stained_glass")
            put(u, B - 1, FRONT + 1, "shroomlight")
        for su in (-13, 13):
            for y in (B + 1, B + 2):
                put(su, y, FRONT + 2, CUT)
            put(su, B + 3, FRONT + 2, "campfire[lit=true]")


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


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-preview", action="store_true")
    args = ap.parse_args()

    s = Spawn()
    s.canyon()
    s.court()
    for cx, letter, lines in FACADES:
        s.facade(cx, letter, lines)
    s.side_terrace(-1)
    s.side_terrace(1)
    # jardinières autour du foyer
    for x, z, rx, rz in [(-14, 0, 3, 5), (14, 0, 3, 5), (-9, 22, 5, 3), (9, 22, 5, 3), (-30, -10, 4, 4),
                         (30, -10, 4, 4), (-30, 18, 4, 5), (30, 18, 4, 5), (-18, 36, 4, 3), (18, 36, 4, 3), (0, -18, 5, 2)]:
        s.planter(x, z, rx, rz)
    for x, z in [(-22, 8), (22, 8), (-7, -13), (7, -13), (-22, 28), (22, 28), (0, 32)]:
        s.lamp(x, z)
    # bancs face au foyer
    for x, z, f in [(-5, 8, "south"), (5, 8, "south"), (-5, -8, "north"), (5, -8, "north")]:
        for k in (0, 1):
            s.w.set(x + (k if x > 0 else -k), G + 1, z, f"sandstone_stairs[facing={f}]")
    # pics rocheux au bord de la cour
    for i, (x, z, h, r, p) in enumerate([(-40, 34, 24, 3.2, False), (39, 36, 20, 2.8, True), (-44, -24, 18, 2.6, True),
                                         (44, -22, 26, 3.4, False), (-12, 44, 16, 2.6, True), (14, 46, 22, 3.0, False),
                                         (-58, 10, 30, 3.6, False), (58, 4, 28, 3.4, True)]):
        s.spire(x, z, h, r, p)
    connect_pass(s.w)
    connect_walls(s.w)

    info = export(s.w, HERE / "spawn-canyon.schem", (SPAWN[0], G + 1, SPAWN[1]))
    print(f"spawn-canyon {info['size'][0]}×{info['size'][1]}×{info['size'][2]}  blocs={info['blocks']}  "
          f"palette={info['palette']}  offset={info['offset']}")
    if not args.no_preview:
        # vue depuis le sud-est, au-dessus de la cour, façades au fond
        view = {(x, y, z): b for (x, y, z), b in s.w.b.items() if y >= G - 6}
        render_iso(view, HERE / "apercu.png", scale=5, bg=(170, 200, 225))
        court = {(x, y, z): b for (x, y, z), b in s.w.b.items() if y >= G - 2 and -50 <= z <= 46 and abs(x) <= 60
                 and not (z > 0 and y > G + 12 and not in_court(x, z, 2))}
        render_iso(court, HERE / "apercu-cour.png", scale=7, bg=(170, 200, 225))


if __name__ == "__main__":
    main()
