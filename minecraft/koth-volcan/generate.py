#!/usr/bin/env python3
"""
KOTH « Gouffre de Vælor » : vallée volcanique (~200 × 200) cernée de montagnes, coupée d'est en ouest par un gouffre
de lave. La zone de capture est une plateforme ronde au milieu du pont qui franchit le gouffre, posée sur un pilier
qui monte de la lave.

Gameplay :
- 4 cols (nord-ouest, nord-est, sud-ouest, sud-est) qui descendent dans la vallée, chacun avec une plateforme d'arrivée.
- Le gouffre coupe la vallée en deux : on ne passe que par le pont (zone KOTH) ou par 2 tunnels de contournement
  creusés dans les montagnes, à l'est et à l'ouest.
- Couverts : rochers de basalte, murs en ruine, éclats d'obsidienne ; hauteurs : 2 tours en ruine aux têtes de pont,
  6 corniches aménagées sur les flancs avec rampe d'accès et muret.
- Décor : volcan au nord avec cratère de lave, fumerolles, filons de magma, lave au fond du gouffre.

Sortie : koth-volcan.schem (Sponge v2, Minecraft 1.21.4). Origine = centre de la zone de capture (pieds du joueur).
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

from generate import World, base, connect_pass, export, h2, render_iso, render_plan  # noqa: E402

G = 70  # fond de la vallée
DECK = G + 3  # tablier du pont et sol de la zone de capture
N = 100  # demi-taille de la map
VALLEY = 50  # rayon du fond de vallée
PASSES = [45, 135, 225, 315]  # angles des cols (degrés, 0 = est, 90 = sud)
BRICK, PBLACK, CHISEL, CRACKED = ("polished_blackstone_bricks", "polished_blackstone",
                                  "chiseled_polished_blackstone", "cracked_polished_blackstone_bricks")
RUBY = "red_nether_bricks"
BWALL = "polished_blackstone_brick_wall[up=true]"

ile.COLORS.update({
    "basalt": (80, 80, 85), "smooth_basalt": (72, 72, 78), "blackstone": (42, 36, 41), "tuff": (108, 109, 102),
    "deepslate": (80, 80, 82), "gravel": (131, 127, 126), "coarse_dirt": (119, 85, 59), "magma_block": (142, 63, 31),
    "lava": (220, 100, 20), "obsidian": (15, 10, 24), "crying_obsidian": (40, 10, 70), "gilded_blackstone": (70, 50, 35),
    "cracked_polished_blackstone_bricks": (44, 38, 44), "red_nether_bricks": (70, 7, 9), "beacon": (120, 220, 215),
    "iron_block": (220, 220, 220), "red_stained_glass": (153, 51, 51), "ladder": (125, 95, 55), "hay_block": (166, 136, 38),
    "campfire": (230, 140, 50), "dead_bush": (107, 79, 40), "dark_oak_log": (60, 46, 26), "netherrack": (97, 38, 38),
    "calcite": (223, 224, 220), "crimson_planks": (101, 49, 71), "crimson_wall_sign": (101, 49, 71),
    "polished_basalt": (90, 90, 95), "chain": (60, 60, 70), "soul_lantern": (90, 200, 210),
})


# --------------------------------------------------------------------------- bruit


def vnoise(x: float, z: float, cell: float, salt: int) -> float:
    gx, gz = x / cell, z / cell
    x0, z0 = math.floor(gx), math.floor(gz)
    fx, fz = gx - x0, gz - z0
    fx, fz = fx * fx * (3 - 2 * fx), fz * fz * (3 - 2 * fz)
    a, b, c, d = h2(x0, z0, salt), h2(x0 + 1, z0, salt), h2(x0, z0 + 1, salt), h2(x0 + 1, z0 + 1, salt)
    return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz


def ridged(x: float, z: float) -> float:
    """Bruit « en crêtes » pour des sommets découpés."""
    v = 0.0
    amp, cell, tot = 1.0, 34.0, 0.0
    for o in range(4):
        n = 1 - abs(vnoise(x, z, cell, 20 + o) * 2 - 1)
        v += n * n * amp
        tot += amp
        amp *= 0.5
        cell /= 2
    return v / tot


def smooth(e0: float, e1: float, x: float) -> float:
    t = min(1.0, max(0.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


# --------------------------------------------------------------------------- gouffre


def chasm_c(x: float) -> float:
    return 4.5 * math.sin(x / 23)


def chasm_w(x: float) -> float:
    """Demi-largeur du gouffre (0 au-delà des extrémités)."""
    taper = 1 - smooth(60, 76, abs(x))
    return (7.5 + 2.5 * math.sin(x / 17 + 1) + 1.2 * math.sin(x / 7)) * taper


def chasm_floor(x: float) -> int:
    return int(G - 14 - 26 * (1 - (min(abs(x), 78) / 78) ** 2))


def pass_floor(along: float) -> float:
    """Sol d'un col : monte de la vallée jusqu'au point haut, puis redescend vers la plateforme d'arrivée."""
    return G + 1 + 7 * math.sin(math.pi * min(1.0, max(0.0, (along - 45) / 62)))


def in_chasm(x: float, z: float) -> bool:
    w = chasm_w(x)
    return w > 0.6 and abs(z - chasm_c(x)) + (vnoise(x, z, 4, 30) - 0.5) * 2 <= w


# --------------------------------------------------------------------------- carte


class Koth:
    def __init__(self) -> None:
        self.w = World()
        self.top: dict[tuple[int, int], int] = {}
        self.bot: dict[tuple[int, int], int] = {}
        self.locked: set[tuple[int, int]] = set()  # colonnes dont la hauteur est imposée (pont, cols, corniches)
        self.cover_ok: set[tuple[int, int]] = set()

    # ----------------------------------------------------------- relief
    def heightmap(self) -> None:
        for x in range(-N, N + 1):
            for z in range(-N, N + 1):
                a = math.atan2(z, x)
                r = math.hypot(x, z)
                re = r * (1 + 0.07 * math.sin(3 * a + 0.5) + 0.05 * math.sin(7 * a + 2))
                edge = max(abs(x), abs(z)) * 0.55 + r * 0.45  # bord carré arrondi
                if edge > N - 1 + (h2(x // 3, z // 3, 1) - 0.5) * 4:
                    continue
                mound = vnoise(x, z, 11, 2) * 3
                m = smooth(VALLEY, VALLEY + 26, re)
                peak = 30 + 42 * ridged(x, z)
                h = G + mound * (1 - m) + m * peak
                # volcan au nord
                vd = math.hypot(x, z + 80)
                h += 26 * math.exp(-(vd / 16) ** 2)
                if vd < 7:
                    h = min(h, G + 60)
                # retombée vers le bord de l'île
                h -= smooth(N - 14, N, edge) * (h - G + 8)
                self.top[(x, z)] = int(h)
        self.carve_passes()
        self.carve_chasm()
        self.ledges()

    def carve_passes(self) -> None:
        for ang in PASSES:
            a = math.radians(ang)
            dx, dz = math.cos(a), math.sin(a)
            for (x, z), h in list(self.top.items()):
                along = x * dx + z * dz
                if along < VALLEY - 8:
                    continue
                perp = abs(-x * dz + z * dx + math.sin(along / 9) * 3)  # col qui serpente
                floor = pass_floor(along)
                lim = floor + max(0.0, perp - 4.5) * 2.2
                if perp <= 4.5:
                    self.top[(x, z)] = int(floor)
                    self.locked.add((x, z))
                elif lim < h:
                    self.top[(x, z)] = int(lim)
            # plateforme d'arrivée au bout du col
            ex, ez = round(dx * (N - 7)), round(dz * (N - 7))
            fl = int(pass_floor(N - 7))
            for x in range(ex - 4, ex + 5):
                for z in range(ez - 4, ez + 5):
                    if (x, z) not in self.top:
                        self.top[(x, z)] = fl
                    self.top[(x, z)] = fl
                    self.locked.add((x, z))

    def carve_chasm(self) -> None:
        for (x, z) in list(self.top):
            if in_chasm(x, z):
                self.top[(x, z)] = chasm_floor(x)
                self.locked.add((x, z))
        # têtes de pont : berges aplanies
        for x in range(-16, 17):
            for z in range(-30, 31):
                if (x, z) in self.top and not in_chasm(x, z):
                    self.top[(x, z)] = G
                    self.locked.add((x, z))

    def ledges(self) -> None:
        """6 corniches pour archers, sur les flancs, avec une rampe depuis le fond de vallée."""
        self.ledge_spots = []
        for i, ang in enumerate((70, 110, 250, 290)):
            a = math.radians(ang)
            dx, dz = math.cos(a), math.sin(a)
            H = G + 9 + (i % 2) * 4
            cx, cz = dx * 61, dz * 61
            for (x, z), h in list(self.top.items()):
                d = math.hypot(x - cx, z - cz)
                along = x * dx + z * dz
                perp = abs(-x * dz + z * dx)
                if d <= 5.5 and not in_chasm(x, z):
                    self.top[(x, z)] = H
                    self.locked.add((x, z))
                elif 44 <= along <= 56 and perp <= 1.6 and not in_chasm(x, z):
                    self.top[(x, z)] = int(G + (along - 44) / 12 * (H - G))
                    self.locked.add((x, z))
            self.ledge_spots.append((round(cx), H, round(cz), dx, dz))

    def bottoms(self) -> None:
        for (x, z), t in self.top.items():
            r = math.hypot(x, z)
            b = G - 10 - int((1 - min(1.0, r / 105)) ** 0.6 * 48 * (0.85 + 0.3 * h2(x // 4, z // 4, 3)))
            self.bot[(x, z)] = b
        for (x, z), t in self.top.items():  # le dessous reste sous le fond du gouffre
            if in_chasm(x, z) or any(in_chasm(x + dx, z + dz) for dx in (-3, 0, 3) for dz in (-3, 0, 3)):
                self.bot[(x, z)] = min(self.bot[(x, z)], chasm_floor(x) - 7)

    # ----------------------------------------------------------- matières
    @staticmethod
    def rock(x: int, y: int, z: int, t: int) -> str:
        if t <= G + 3 and y == t:  # fond de vallée : plaques de cendre, de basalte et de gravier
            v = vnoise(x, z, 6, 40) * 0.8 + h2(x, z, 39) * 0.2
            return ("blackstone" if v < 0.36 else "basalt[axis=y]" if v < 0.48 else "tuff" if v < 0.58
                    else "smooth_basalt" if v < 0.66 else "gravel" if v < 0.74 else "blackstone")
        vein = abs(vnoise(x * 0.7 + y * 0.5, z * 0.7 - y * 0.3, 6, 41) - 0.5) < 0.018
        if vein and y < G + 55 and y > G - 30:
            return "magma_block"
        if y > G + 52:
            return "tuff" if h2(x, y, z) < 0.5 else "smooth_basalt"
        bands = ["basalt[axis=y]", "blackstone", "smooth_basalt", "basalt[axis=y]", "deepslate", "blackstone", "tuff"]
        k = (y + int(vnoise(x, z, 8, 42) * 4)) // 3
        s = bands[k % len(bands)]
        if s == "blackstone" and h2(x, y, z + 43) < 0.03:
            return "gilded_blackstone"
        return s

    def build_terrain(self) -> None:
        w = self.w
        INF = 10 ** 6
        for (x, z), t in self.top.items():
            b = self.bot[(x, z)]
            nt = [self.top.get((x + dx, z + dz), -INF) for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1))]
            nb = [self.bot.get((x + dx, z + dz), INF) for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1))]
            upper_lo = max(b, min(nt) - 3)
            lower_hi = min(t, max(nb) + 3)
            ys = set(range(upper_lo, t + 1)) | set(range(b, lower_hi + 1))
            for y in ys:
                w.set(x, y, z, self.rock(x, y, z, t))
            # dessous : stalactites de basalte et de dripstone
            v = h2(x, z, 44)
            if v < 0.04:
                for k in range(1, 2 + int(h2(x, z, 45) * 4)):
                    w.set(x, b - k, z, "basalt[axis=y]")
            elif v < 0.08:
                w.set(x, b - 1, z, "pointed_dripstone[thickness=tip,vertical_direction=down]")
            if in_chasm(x, z):
                w.set(x, t + 1, z, "lava")
            elif t <= G + 3 and (x, z) not in self.locked and math.hypot(x, z) < VALLEY:
                self.cover_ok.add((x, z))
            if t > G + 8 and v > 0.97:
                w.set(x, t + 1, z, "dead_bush")

    # ----------------------------------------------------------- pont et zone KOTH
    def bridge(self) -> None:
        w = self.w
        floor0 = chasm_floor(0)
        # pilier central qui monte de la lave, évasé sous la plateforme
        for y in range(floor0 - 2, DECK):
            t = (y - floor0) / (DECK - floor0)
            r = 4.2 + 3.6 * smooth(0.72, 1.0, t)
            for x in range(-9, 10):
                for z in range(-9, 10):
                    d = math.hypot(x, z)
                    if d <= r:
                        edge = d > r - 1.2
                        s = BRICK if edge else PBLACK
                        if edge and h2(x, z, y + 50) < 0.15:
                            s = CRACKED
                        if edge and (y - floor0) % 7 == 3:
                            s = RUBY
                        if edge and abs(math.atan2(z, x) * 4 / math.pi % 1 - 0.5) < 0.06 and y < G - 6:
                            s = "magma_block"
                        w.set(x, y, z, s)
        # tablier : de berge à berge, avec rampes
        for z in range(-30, 31):
            ramp = max(0, abs(z) - 23)
            deck = DECK - ramp // 2
            for x in range(-4, 5):
                if abs(z) > 30:
                    continue
                inner = abs(x) <= 3
                y_top = deck if inner else deck
                if abs(x) == 4:
                    # garde-corps bas, avec des trous
                    if (abs(z) % 6) not in (0, 1) and abs(z) < 24:
                        w.set(x, deck + 1, z, BWALL)
                    w.set(x, deck, z, BRICK)
                    continue
                s = RUBY if x == 0 and abs(z) % 4 == 0 else BRICK if abs(x) == 3 else PBLACK
                if ramp % 2 == 1 and ramp:
                    s = "polished_blackstone_brick_stairs[facing=" + ("south" if z < 0 else "north") + "]"
                w.set(x, y_top, z, s)
                for y in range(deck - 2, deck):
                    w.set(x, y, z, BRICK)
                if not in_chasm(x, z):
                    for y in range(G - 3, deck - 2):
                        w.set(x, y, z, BRICK)
            # dessous du tablier en encorbellement au-dessus du gouffre
            if in_chasm(0, z):
                for x in range(-4, 5):
                    w.set(x, DECK - 3, z, "polished_blackstone_brick_slab[type=top]")
                    if abs(x) == 4 and z % 3 == 0:
                        w.set(x, DECK - 4, z, "chain[axis=y]")
                        w.set(x, DECK - 5, z, "lantern[hanging=true]")
        # plateforme ronde de capture
        for x in range(-9, 10):
            for z in range(-9, 10):
                d = math.hypot(x, z)
                if d > 8.4:
                    continue
                for y in range(DECK - 2, DECK):
                    w.set(x, y, z, BRICK)
                if d <= 1.5:
                    s = PBLACK
                elif d <= 4.5:
                    s = CHISEL if (x + z) % 2 == 0 else PBLACK
                elif d <= 5.5:
                    s = RUBY
                elif d <= 7.6:
                    s = BRICK if int((math.atan2(z, x) + math.pi) / (2 * math.pi) * 16) % 2 else PBLACK
                else:
                    s = BRICK
                    sector = int((math.atan2(z, x) + math.pi) / (2 * math.pi) * 24)
                    if sector % 4 not in (0, 1) and not (abs(x) <= 3):
                        w.set(x, DECK + 1, z, BWALL)
                w.set(x, DECK, z, s)
        # balise : faisceau rubis visible de toute la vallée
        for x in range(-1, 2):
            for z in range(-1, 2):
                w.set(x, DECK - 1, z, "iron_block")
        w.set(0, DECK, 0, "beacon")
        w.set(0, DECK + 1, 0, "red_stained_glass")
        # couverts sur la plateforme : 4 piliers brisés + 4 murets
        for k in range(4):
            a = math.pi / 4 + k * math.pi / 2
            px, pz = round(math.cos(a) * 6.3), round(math.sin(a) * 6.3)
            hgt = 3 + k % 2
            for y in range(DECK + 1, DECK + 1 + hgt):
                w.set(px, y, pz, BRICK if y < DECK + hgt else CRACKED)
            w.set(px, DECK + 1 + hgt, pz, "lantern[hanging=false]")
            a2 = k * math.pi / 2 + 0.35
            for j in range(-1, 2):
                qx = round(math.cos(a2) * 3.4 - math.sin(a2) * j)
                qz = round(math.sin(a2) * 3.4 + math.cos(a2) * j)
                if (qx, qz) != (0, 0):
                    w.set(qx, DECK + 1, qz, BWALL if j else "polished_blackstone_slab[type=bottom]")

    def gate(self, z: int) -> None:
        """Arche en ruine à chaque tête de pont."""
        w = self.w
        for x in (-5, 5):
            for y in range(DECK, DECK + 8 - (2 if x > 0 and z > 0 else 0)):
                w.set(x, y, z, BRICK if y % 3 else CHISEL)
        for x in range(-5, 2 if z > 0 else 6):
            w.set(x, DECK + 8, z, BRICK)
            if abs(x) <= 1:
                w.set(x, DECK + 9, z, RUBY)
        w.set(0, DECK + 7, z, "lantern[hanging=true]")

    def tower(self, cx: int, cz: int, door: tuple[int, int]) -> None:
        """Tour en ruine pour archers : échelle intérieure, plancher et créneaux en haut."""
        w = self.w
        top = G + 16
        for x in range(cx - 5, cx + 6):
            for z in range(cz - 5, cz + 6):
                d = math.hypot(x - cx, z - cz)
                if d > 4.6:
                    continue
                for y in range(G - 2, G + 1):
                    w.set(x, y, z, BRICK)
                broken = top - int(h2(x, z, 60) * 4)
                for y in range(G + 1, broken + 1):
                    if d > 3.5:
                        w.set(x, y, z, CRACKED if h2(x, y, z) < 0.25 else BRICK)
                    elif y in (G + 8, top - 1):
                        w.set(x, y, z, "polished_blackstone_slab[type=top]")
                    else:
                        w.set(x, y, z, None)
                if d > 3.5 and broken >= top - 1:
                    ang = int((math.atan2(z - cz, x - cx) + math.pi) / (2 * math.pi) * 12)
                    if ang % 2 == 0:
                        w.set(x, top + 1, z, BRICK)
                # meurtrières
                if 3.5 < d and (G + 10 <= broken):
                    ang = int((math.atan2(z - cz, x - cx) + math.pi) / (2 * math.pi) * 8)
                    if ang % 2 == 0:
                        w.set(x, G + 11, z, None)
        # porte
        ddx, ddz = door
        for k in range(3, 6):
            for y in (G + 1, G + 2, G + 3):
                w.set(cx + ddx * k, y, cz + ddz * k, None)
        # échelle contre le mur opposé à la porte, trous dans les planchers
        lx, lz = cx - ddx * 3, cz - ddz * 3
        facing = {(1, 0): "east", (-1, 0): "west", (0, 1): "south", (0, -1): "north"}[(ddx, ddz)]
        for y in range(G + 1, top):
            w.set(lx, y, lz, f"ladder[facing={facing}]")
        w.set(cx, G + 9, cz, "lantern[hanging=true]")
        self.forbid(cx, cz, 7)

    def forbid(self, cx: int, cz: int, r: int) -> None:
        for x in range(cx - r, cx + r + 1):
            for z in range(cz - r, cz + r + 1):
                self.cover_ok.discard((x, z))

    # ----------------------------------------------------------- tunnels
    def tunnel(self, pts: list[tuple[float, float]]) -> None:
        """Tunnel de contournement : on remplit une gaine de roche, puis on creuse (4 de large, 4 de haut)."""
        w = self.w
        samples = []
        for (ax, az), (bx, bz) in zip(pts, pts[1:]):
            n = int(math.hypot(bx - ax, bz - az) * 2) + 1
            for i in range(n):
                t = i / n
                samples.append((ax + (bx - ax) * t, az + (bz - az) * t))
        samples.append(pts[-1])
        fy = G + 1
        for sx, sz in samples:  # gaine
            for dx in range(-5, 6):
                for dz in range(-5, 6):
                    x, z = round(sx) + dx, round(sz) + dz
                    t = self.top.get((x, z))
                    if t is None or t < fy + 5:
                        continue
                    for y in range(fy - 3, fy + 8):
                        if not w.get(x, y, z):
                            w.set(x, y, z, self.rock(x, y, z, t))
        for i, (sx, sz) in enumerate(samples):  # creusement
            for dx in range(-3, 4):
                for dz in range(-3, 4):
                    for dy in range(0, 5):
                        x, z, y = round(sx) + dx, round(sz) + dz, fy + dy
                        e = (dx * dx + dz * dz) / 6.5 + ((dy - 1.2) ** 2) / 10
                        if e <= 1:
                            w.set(x, y, z, None)
                    x, z = round(sx) + dx, round(sz) + dz
                    if dx * dx + dz * dz <= 5:
                        w.set(x, fy - 1, z, "blackstone" if h2(x, z, 70) < 0.6 else "basalt[axis=y]")
            if i % 10 == 5:
                w.set(round(sx), fy + 4, round(sz), "lantern[hanging=true]")
                w.set(round(sx), fy + 5, round(sz), "chain[axis=y]") if not w.get(round(sx), fy + 5, round(sz)) else None

    # ----------------------------------------------------------- couverts et décor
    def boulder(self, cx: int, cz: int, r: float) -> None:
        w = self.w
        t = self.top.get((cx, cz), G)
        ri = int(r) + 1
        for dx in range(-ri, ri + 1):
            for dz in range(-ri, ri + 1):
                for dy in range(0, ri + 2):
                    e = (dx * dx + dz * dz) / (r * r) + (dy * dy) / ((r * 1.1) ** 2)
                    if e <= 1 + (h2(cx + dx, cz + dz, dy + 80) - 0.5) * 0.5:
                        w.set(cx + dx, t + 1 + dy, cz + dz, "basalt[axis=y]" if dy % 2 else "smooth_basalt")
        self.forbid(cx, cz, ri + 3)

    def ruin_wall(self, cx: int, cz: int, length: int, ang: float) -> None:
        w = self.w
        dx, dz = math.cos(ang), math.sin(ang)
        t = self.top.get((cx, cz), G)
        for k in range(-length // 2, length // 2 + 1):
            x, z = round(cx + dx * k), round(cz + dz * k)
            h = 2 + int(h2(x, z, 90) * 3) - (1 if abs(k) == length // 2 else 0)
            for y in range(t + 1, t + 1 + h):
                w.set(x, y, z, CRACKED if h2(x, y, z) < 0.3 else BRICK)
            if h2(x, z, 91) < 0.3:
                w.set(round(x - dz * 1.4), t + 1, round(z + dx * 1.4), "polished_blackstone_slab[type=bottom]")
        self.forbid(cx, cz, length // 2 + 3)

    def shard(self, cx: int, cz: int, h: int) -> None:
        w = self.w
        t = self.top.get((cx, cz), G)
        lean = (h2(cx, cz, 95) - 0.5, h2(cx, cz, 96) - 0.5)
        for k in range(h):
            r = 1.3 * (1 - k / h)
            x0, z0 = cx + lean[0] * k * 0.6, cz + lean[1] * k * 0.6
            for dx in range(-1, 2):
                for dz in range(-1, 2):
                    if abs(dx) + abs(dz) <= r + 0.4:
                        w.set(round(x0) + dx, t + 1 + k, round(z0) + dz, "crying_obsidian" if (k + dx) % 4 == 0 else "obsidian")
        self.forbid(cx, cz, 4)

    def fumarole(self, x: int, z: int) -> None:
        t = self.top.get((x, z))
        if t is None:
            return
        self.w.set(x, t, z, "hay_block[axis=y]")
        self.w.set(x, t + 1, z, "campfire[lit=true,signal_fire=true,facing=north]")

    def volcano(self) -> None:
        """Cratère du volcan nord : lac de lave entouré de magma."""
        w = self.w
        for x in range(-8, 9):
            for z in range(-88, -71):
                d = math.hypot(x, z + 80)
                t = self.top.get((x, z))
                if t is None or d > 7.5:
                    continue
                if d <= 5:
                    w.set(x, t, z, "magma_block")
                    w.set(x, t + 1, z, "lava")
                    for y in range(t + 2, t + 12):
                        w.set(x, y, z, None)
                else:
                    w.set(x, t, z, "magma_block" if h2(x, z, 97) < 0.6 else "blackstone")

    def arrival(self, ang: float, label: str) -> None:
        w = self.w
        a = math.radians(ang)
        ex, ez = round(math.cos(a) * (N - 7)), round(math.sin(a) * (N - 7))
        fl = int(pass_floor(N - 7))
        for x in range(ex - 4, ex + 5):
            for z in range(ez - 4, ez + 5):
                edge = max(abs(x - ex), abs(z - ez)) == 4
                w.set(x, fl, z, BRICK if edge else (RUBY if (x - ex, z - ez) == (0, 0) else PBLACK))
                for y in range(fl + 1, fl + 6):
                    w.set(x, y, z, None)
        for sx in (-4, 4):
            for sz in (-4, 4):
                for y in range(fl + 1, fl + 4):
                    w.set(ex + sx, y, ez + sz, BWALL)
                w.set(ex + sx, fl + 4, ez + sz, "lantern[hanging=false]")
        # panneau sur un poteau, tourné vers la vallée
        inward = (-math.cos(a), -math.sin(a))
        facing = ("east" if inward[0] > 0 else "west") if abs(inward[0]) > abs(inward[1]) else ("south" if inward[1] > 0 else "north")
        fx, fz = {"east": (1, 0), "west": (-1, 0), "south": (0, 1), "north": (0, -1)}[facing]
        px, pz = ex - fx * 2, ez - fz * 2
        for y in range(fl + 1, fl + 3):
            w.set(px, y, pz, CHISEL)
        w.sign(px + fx, fl + 2, pz + fz, f"crimson_wall_sign[facing={facing}]",
               ['{"text":"◆ VÆLORIA ◆","color":"dark_red"}', '{"text":"KOTH","bold":true}',
                '{"text":"Entrée ' + label + '"}', '{"text":"Le pont → centre","color":"dark_gray"}'])


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

    k = Koth()
    k.heightmap()
    k.bottoms()
    k.build_terrain()
    k.volcano()
    k.bridge()
    for z in (-21, 21):
        k.gate(z)
    k.tower(-13, -18, (1, 0))
    k.tower(13, 18, (-1, 0))
    for cx, H, cz, dx, dz in k.ledge_spots:  # muret de couvert côté vallée
        for j in range(-4, 5):
            x, z = round(cx - dx * 4 - dz * j), round(cz - dz * 4 + dx * j)
            if abs(j) != 0:
                k.w.set(x, H + 1, z, BWALL)
        k.w.set(cx, H + 1, cz, "lantern[hanging=false]")
    # tunnels de contournement est et ouest (passent derrière les extrémités du gouffre)
    for s in (-1, 1):
        k.tunnel([(s * 54, -24), (s * 70, -22), (s * 84, -10), (s * 86, 4), (s * 72, 22), (s * 55, 26)])
    for ang, label in zip(PASSES, ("SUD-EST", "SUD-OUEST", "NORD-OUEST", "NORD-EST")):
        k.arrival(ang, label)
    # couverts dans la vallée
    spots = sorted(k.cover_ok)
    n_b = n_w = n_s = 0
    for i, (x, z) in enumerate(spots):
        v = h2(x, z, 100)
        if (x, z) not in k.cover_ok or abs(x) < 20 and abs(z) < 32:
            continue
        if v < 0.004 and n_b < 26:
            k.boulder(x, z, 1.6 + h2(x, z, 101) * 1.6)
            n_b += 1
        elif v < 0.007 and n_w < 16:
            k.ruin_wall(x, z, 5 + int(h2(x, z, 102) * 5), h2(x, z, 103) * math.pi)
            n_w += 1
        elif v < 0.011 and n_s < 12:
            k.shard(x, z, 5 + int(h2(x, z, 104) * 6))
            n_s += 1
    for i in range(14):
        a, r = h2(i, 1, 110) * 2 * math.pi, 64 + h2(i, 2, 111) * 22
        k.fumarole(round(math.cos(a) * r), round(math.sin(a) * r))
    connect_pass(k.w)
    connect_walls(k.w)

    info = export(k.w, HERE / "koth-volcan.schem", (0, DECK + 1, 0))
    print(f"koth-volcan {info['size'][0]}×{info['size'][1]}×{info['size'][2]}  blocs={info['blocks']}  "
          f"palette={info['palette']}  offset={info['offset']}  couverts: {n_b} rochers, {n_w} murs, {n_s} éclats")
    if not args.no_preview:
        sw = {(-x, y, -z): s for (x, y, z), s in k.w.b.items() if y >= G - 50}
        render_iso(sw, HERE / "apercu.png", scale=3, bg=(60, 50, 55))
        # coupe nord-sud au droit du pont (on garde x <= 0) : on voit le gouffre, la lave et le pilier
        centre = {(x, y, z): s for (x, y, z), s in k.w.b.items() if -45 <= x <= 0 and abs(z) <= 40 and y >= G - 45}
        render_iso(centre, HERE / "apercu-pont.png", scale=8, bg=(60, 50, 55))
        labels = [(0, 0, "KOTH"), (0, -80, "VOLCAN")] + [
            (round(math.cos(math.radians(a)) * 92), round(math.sin(math.radians(a)) * 92), "ENTRÉE") for a in PASSES] + [
            (-80, 0, "TUNNEL"), (80, 0, "TUNNEL")]
        render_plan(k.w.b, HERE / "plan.png", [], G + 25, scale=4, labels=labels,
                    caption="KOTH « Gouffre de Vælor » — vue de dessus, nord en haut. Couleurs : sombre = montagnes, orange = lave.")


if __name__ == "__main__":
    main()
