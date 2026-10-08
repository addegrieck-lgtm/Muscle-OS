#!/usr/bin/env python3
"""
Île commerciale de VÆLORIA + ponton qui la relie au spawn.

Génère des schematics WorldEdit / FAWE (format Sponge v2, Minecraft 1.21) :
  - ile-commerciale-complete.schem : ponton + île (origine = début du ponton côté spawn)
  - ile-commerciale-seule.schem    : l'île sans le ponton (origine = point d'arrivée du ponton)
  - ponton-module-8.schem          : tronçon de ponton de 8 blocs, à répéter avec //stack
ainsi que des aperçus (vue isométrique, plan des boutiques) et shops.json (coordonnées des 16 boutiques).

Aucune dépendance : python3 generate.py [--ponton 48]
Axes : X vers l'est, Z vers le sud. Le ponton part vers l'est depuis le spawn ; //rotate pour l'orienter.
"""

from __future__ import annotations

import argparse
import gzip
import io
import json
import math
import random
import struct
from pathlib import Path

OUT = Path(__file__).resolve().parent
DATA_VERSION = 3953  # Minecraft 1.21

SEA = 20  # y local de la surface de l'eau (= y 62 en monde : le bas du schematic est à y 42)
F = SEA + 2  # niveau du sol de l'île
DECK = SEA + 1  # plancher du ponton
A, B = 60, 44  # demi-axes de l'île

# --------------------------------------------------------------------------- monde


class World:
    def __init__(self) -> None:
        self.b: dict[tuple[int, int, int], str] = {}
        self.signs: dict[tuple[int, int, int], list[str]] = {}

    def set(self, x: int, y: int, z: int, s: str | None) -> None:
        if s is None:
            self.b.pop((x, y, z), None)
            self.signs.pop((x, y, z), None)
        else:
            self.b[(x, y, z)] = s

    def get(self, x: int, y: int, z: int) -> str | None:
        return self.b.get((x, y, z))

    def fill(self, x0, y0, z0, x1, y1, z1, s) -> None:
        for x in range(min(x0, x1), max(x0, x1) + 1):
            for y in range(min(y0, y1), max(y0, y1) + 1):
                for z in range(min(z0, z1), max(z0, z1) + 1):
                    self.set(x, y, z, s)

    def sign(self, x, y, z, state, lines) -> None:
        self.set(x, y, z, state)
        self.signs[(x, y, z)] = (lines + ["", "", "", ""])[:4]


def base(s: str) -> str:
    return s.split("[", 1)[0]


PLANTS = {"short_grass", "poppy", "dandelion", "cornflower", "oxeye_daisy", "allium", "azure_bluet", "lily_of_the_valley",
          "flowering_azalea", "azalea", "fern", "white_tulip", "pink_tulip", "blue_orchid"}
NOT_FULL = ("slab", "stairs", "fence", "pane", "iron_bars", "lantern", "chain", "sign", "carpet", "trapdoor", "door",
            "torch", "leaves", "lightning_rod", "water", "ladder", "button", "potted")


def is_full(s: str | None) -> bool:
    if s is None:
        return False
    n = base(s)
    return n not in PLANTS and not any(k in n for k in NOT_FULL)


def connect_pass(w: World) -> None:
    """Calcule les connexions des barrières et vitres (WorldEdit ne les met pas à jour au collage)."""
    dirs = {"north": (0, -1), "south": (0, 1), "east": (1, 0), "west": (-1, 0)}
    for (x, y, z), s in list(w.b.items()):
        n = base(s)
        fence, pane = n.endswith("_fence"), n.endswith("glass_pane") or n == "iron_bars"
        if not (fence or pane):
            continue
        props = {}
        for d, (dx, dz) in dirs.items():
            o = w.get(x + dx, y, z + dz)
            on = base(o) if o else ""
            if fence:
                ok = is_full(o) or on.endswith("_fence") or on.endswith("_fence_gate")
            else:
                ok = is_full(o) or on.endswith("glass_pane") or on == "iron_bars"
            props[d] = "true" if ok else "false"
        w.b[(x, y, z)] = n + "[" + ",".join(f"{k}={v}" for k, v in sorted(props.items())) + "]"


# --------------------------------------------------------------------------- outils

rng = random.Random(1789)


def h2(x: int, z: int, salt: int = 0) -> float:
    """Bruit déterministe 0..1 par colonne."""
    v = (x * 73856093) ^ (z * 19349663) ^ (salt * 83492791)
    v = (v ^ (v >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((v ^ (v >> 16)) & 0xFFFF) / 0xFFFF


def island_d(x: float, z: float) -> float:
    """Distance normalisée au centre de l'île (1 = rivage)."""
    nx, nz = x / A, z / B
    t = math.atan2(nz, nx)
    r = 1 + 0.05 * math.sin(3 * t + 0.7) + 0.035 * math.sin(5 * t + 2.1) + 0.02 * math.sin(9 * t + 4)
    return math.hypot(nx, nz) / r


def pave(x: int, z: int) -> str:
    v = h2(x, z, 7)
    return "stone_bricks" if v < 0.55 else "polished_andesite" if v < 0.85 else "andesite"


PAVED: set[tuple[int, int]] = set()
RESERVED: set[tuple[int, int]] = set()


def pave_cell(w: World, x: int, z: int, block: str | None = None) -> None:
    w.set(x, F, z, block or pave(x, z))
    for y in range(F + 1, F + 3):
        if w.get(x, y, z) and base(w.get(x, y, z)) in PLANTS:
            w.set(x, y, z, None)
    PAVED.add((x, z))


def lamp_post(w: World, x: int, z: int, wood: str = "dark_oak", h: int = 3) -> None:
    for y in range(F + 1, F + 1 + h):
        w.set(x, y, z, f"{wood}_fence")
    w.set(x, F + 1 + h, z, "lantern")
    RESERVED.add((x, z))


def tree(w: World, x: int, z: int, kind: str) -> None:
    log, leaves = {
        "oak": ("oak_log", "oak_leaves"),
        "birch": ("birch_log", "birch_leaves"),
        "cherry": ("cherry_log", "cherry_leaves"),
        "azalea": ("oak_log", "flowering_azalea_leaves"),
    }[kind]
    hgt = 4 + int(h2(x, z, 3) * 3)
    r = 2.6 if kind != "birch" else 2.1
    cy = F + hgt
    for dx in range(-3, 4):
        for dz in range(-3, 4):
            for dy in range(-2, 3):
                if dx * dx + dz * dz + (dy * 1.4) ** 2 <= r * r + h2(x + dx, z + dz, dy + 9) * 1.5:
                    if not w.get(x + dx, cy + dy, z + dz):
                        w.set(x + dx, cy + dy, z + dz, f"{leaves}[persistent=true]")
    for y in range(F + 1, cy + 1):
        w.set(x, y, z, f"{log}[axis=y]")


# --------------------------------------------------------------------------- île


def build_terrain(w: World) -> None:
    for x in range(-int(A * 1.4), int(A * 1.4) + 1):
        for z in range(-int(B * 1.4), int(B * 1.4) + 1):
            d = island_d(x, z)
            if d > 1.22:
                continue
            if d <= 0.88:
                top = F
                w.set(x, F, z, "grass_block")
                w.fill(x, F - 3, z, x, F - 1, z, "dirt")
                w.fill(x, 0, z, x, F - 4, z, "stone")
            elif d <= 1.0:
                top = F - 1 if d <= 0.94 else SEA
                w.fill(x, top - 2, z, x, top, z, "sand")
                w.fill(x, 0, z, x, top - 3, z, "sandstone")
            else:
                top = SEA - 1 - int((d - 1) / 0.22 * (SEA - 4))
                w.fill(x, max(top - 2, 0), z, x, top, z, "sand")
                if top - 3 >= 0:
                    w.fill(x, 0, z, x, top - 3, z, "stone")


SHOP_COLORS = ["red", "blue", "lime", "orange", "cyan", "purple", "yellow", "light_blue", "magenta", "green",
               "pink", "brown", "black", "white", "gray", "light_gray"]
SHOP_WOODS = ["spruce", "oak", "birch", "dark_oak", "cherry", "mangrove", "jungle", "acacia"]
SIZE_NAME = {5: "Échoppe", 7: "Boutique", 9: "Grande boutique", 11: "Enseigne"}
# Largeurs intérieures des boutiques par demi-rangée (somme 26 + 3 murs = 29 blocs).
ROWS = {
    ("nord", "ouest"): [9, 5, 7, 5],
    ("nord", "est"): [5, 7, 5, 9],
    ("sud", "ouest"): [11, 5, 5, 5],
    ("sud", "est"): [7, 7, 7, 5],
}
HX, HZ = 37, 14  # demi-dimensions du hall (murs compris)
RX = 7  # demi-largeur de la rotonde (murs compris)
D = 8  # profondeur intérieure d'une boutique
ROOF = {5: 11, 4: 12, 3: 12, 2: 13, 1: 13, 0: 14}  # verrière de la galerie : hauteur au-dessus du sol selon |z|
WALL, TRIM, BAND = "smooth_quartz", "polished_deepslate", "deepslate_tiles"


def build_hall(w: World) -> list[dict]:
    shops: list[dict] = []
    SEPS = {-1: set(), 1: set()}
    # Emprise : sol, réservation
    for x in range(-HX, HX + 1):
        for z in range(-HZ, HZ + 1):
            RESERVED.add((x, z))
            PAVED.add((x, z))
            w.set(x, F, z, "polished_andesite")

    # ---- Allée centrale (galerie)
    for x in range(-HX + 1, HX):
        for z in range(-4, 5):
            if abs(x) < RX:
                continue
            if abs(z) == 4:
                w.set(x, F, z, BAND)
            else:
                w.set(x, F, z, "polished_diorite" if (x + z) % 2 == 0 else "polished_andesite")

    # ---- Boutiques
    n = 0
    for (row, half), widths in ROWS.items():
        sgn = -1 if row == "nord" else 1  # côté de l'allée
        zf = 5 * sgn  # mur de façade
        zb = HZ * sgn  # mur arrière
        zin = range(min(zf, zb) + 1, max(zf, zb))  # intérieur
        x = -HX + 1 if half == "ouest" else RX + 1
        for wd in widths:
            n += 1
            x0, x1 = x, x + wd - 1
            color = SHOP_COLORS[n - 1]
            wood = SHOP_WOODS[n % len(SHOP_WOODS)]
            facing_aisle = "south" if row == "nord" else "north"
            facing_back = "north" if row == "nord" else "south"
            zback_in = zb - sgn  # rangée contre le mur arrière
            zfront_in = zf + sgn  # rangée contre la vitrine
            for xx in range(x0, x1 + 1):
                for zz in zin:
                    w.set(xx, F, zz, f"{wood}_planks")
                    w.fill(xx, F + 1, zz, xx, F + 5, zz, None)
                    w.set(xx, F + 6, zz, "smooth_stone")  # plafond / toit
            # Mur arrière avec fenêtre
            for xx in range(x0 - 1, x1 + 2):
                w.set(xx, F + 1, zb, BAND)
                w.fill(xx, F + 2, zb, xx, F + 5, zb, WALL)
                w.set(xx, F + 6, zb, TRIM)
                w.set(xx, F + 7, zb, TRIM)
            cx = (x0 + x1) // 2
            w.fill(cx - (1 if wd >= 7 else 0), F + 2, zb, cx + (1 if wd >= 7 else 0), F + 3, zb, "glass_pane")
            # Murs mitoyens
            for xx in (x0 - 1, x1 + 1):
                for zz in zin:
                    w.fill(xx, F + 1, zz, xx, F + 5, zz, WALL)
                    w.set(xx, F + 6, zz, TRIM)
            # Vitrine
            door = 1 if wd == 5 else 3
            for xx in range(x0, x1 + 1):
                w.set(xx, F + 1, zf, TRIM)
                w.fill(xx, F + 2, zf, xx, F + 4, zf, "glass_pane")
                w.set(xx, F + 5, zf, f"{color}_concrete")
                w.set(xx, F + 6, zf, BAND)
                if abs(xx - cx) <= door // 2:
                    w.fill(xx, F + 1, zf, xx, F + 3, zf, None)
                # Store (auvent) au-dessus de la vitrine
                w.set(xx, F + 6, zf - sgn, f"{color}_wool" if (xx - x0) % 2 == 0 else "white_wool")
            num = f"{n:02d}"
            w.sign(cx, F + 5, zf - sgn, f"dark_oak_wall_sign[facing={facing_aisle}]",
                   ['{"text":"VÆLORIA","color":"gray"}', '{"text":"Boutique ' + num + '","bold":true}',
                    '{"text":"' + SIZE_NAME[wd] + '"}', '{"text":"À louer","color":"dark_green"}'])
            # Mobilier : étagères (tonneaux) au fond, comptoir, éclairage
            for xx in range(x0, x1 + 1):
                if (xx - x0) % 2 == 0:
                    w.set(xx, F + 1, zback_in, f"barrel[facing={facing_aisle}]")
                    w.set(xx, F + 2, zback_in, f"{wood}_slab[type=bottom]")
                else:
                    w.set(xx, F + 1, zback_in, f"{wood}_planks")
                    w.set(xx, F + 2, zback_in, "barrel[facing=up]")
            if wd >= 7:
                zc = zback_in - 3 * sgn
                for xx in range(x0 + 1, x1):
                    w.set(xx, F + 1, zc, f"stripped_{wood}_log[axis=x]" if wood not in ("bamboo",) else "bamboo_block")
                    w.set(xx, F + 2, zc, None)
                w.set(x0 + 1, F + 1, zc, None)  # passage
                w.set(x1 - 1, F + 2, zc, "lantern")
            else:
                w.set(x1, F + 1, zfront_in + 2 * sgn, "smithing_table" if n % 2 else "crafting_table")
            w.set(cx, F + 5, zfront_in + 3 * sgn, "lantern[hanging=true]")
            if wd >= 9:
                w.set(x0, F + 5, zfront_in + 3 * sgn, "lantern[hanging=true]")
                w.set(x1, F + 5, zfront_in + 3 * sgn, "lantern[hanging=true]")
            w.set(x0, F + 1, zfront_in, f"potted_{['azure_bluet', 'red_tulip', 'fern', 'cornflower'][n % 4]}")
            zmin, zmax = min(zin), max(zin)
            shops.append({"id": n, "nom": f"Boutique {num}", "type": SIZE_NAME[wd], "rangee": row, "aile": half,
                          "largeur": wd, "profondeur": D, "hauteur": 5,
                          "_min": (x0, F + 1, zmin), "_max": (x1, F + 5, zmax), "_porte": (cx, F + 1, zf)})
            SEPS[sgn].update((x0 - 1, x1 + 1))
            x = x1 + 2

    # ---- Façades de la galerie (au-dessus des vitrines) et piliers
    for sgn in (-1, 1):
        zf = 5 * sgn
        for x in range(-HX, HX + 1):
            if abs(x) < RX:
                continue
            w.fill(x, F + 7, zf, x, F + 10, zf, WALL)
            w.set(x, F + 7, zf, BAND)
            if x % 4 == 0 and abs(x) not in (HX, RX):
                w.fill(x, F + 8, zf, x, F + 9, zf, "glass_pane")
        for x in SEPS[sgn]:  # piliers au droit des murs mitoyens
            w.fill(x, F + 1, zf, x, F + 10, zf, TRIM)
    for x in (-HX, -RX, RX, HX):
        for sgn in (-1, 1):
            w.fill(x, F + 1, 5 * sgn, x, F + 10, 5 * sgn, TRIM)

    # ---- Verrière de la galerie (avec fermes en pierre noire tous les 6 blocs)
    for x in range(-HX + 1, HX):
        if abs(x) < RX:
            continue
        prev = F + 10
        for az in range(5, -1, -1):
            top = F + ROOF[az]
            mat = TRIM if x % 6 == 0 else "glass"
            for zz in {az, -az}:
                w.fill(x, max(prev, F + 11), zz, x, top, zz, mat)
            prev = top
        if x % 6 == 0:
            w.fill(x, F + 11, 0, x, F + 13, 0, "chain")
            w.set(x, F + 10, 0, "lantern[hanging=true]")

    # ---- Pignons est / ouest avec grande arche
    for x in (-HX, HX):
        for z in range(-4, 5):
            top = F + ROOF[abs(z)]
            w.fill(x, F + 1, z, x, top, z, WALL)
            for y in range(F + 1, top + 1):
                dy = y - F
                if (abs(z) <= 3 and dy <= 4) or (abs(z) <= 2 and dy == 5) or (abs(z) <= 1 and dy == 6):
                    w.set(x, y, z, None)
                elif (abs(z) <= 1 and 9 <= dy <= 11) or (abs(z) == 2 and dy == 10):
                    w.set(x, y, z, "white_stained_glass")
            w.set(x, F + 7, z, TRIM if abs(z) > 1 else w.get(x, F + 7, z))
        w.set(x, F + 14, 0, TRIM)

    # ---- Murs latéraux des extrémités (côté boutiques) jusqu'au parapet
    for x in (-HX, HX):
        for z in list(range(-HZ, -4)) + list(range(5, HZ + 1)):
            w.set(x, F + 1, z, BAND)
            w.fill(x, F + 2, z, x, F + 5, z, WALL)
            w.set(x, F + 6, z, TRIM)
            w.set(x, F + 7, z, TRIM)
    # Parapet arrière complet
    for x in range(-HX, HX + 1):
        for z in (-HZ, HZ):
            if abs(x) > RX:
                w.set(x, F + 7, z, TRIM)

    # ---- Rotonde centrale
    for x in range(-RX + 1, RX):
        for z in range(-HZ + 1, HZ):
            w.fill(x, F + 1, z, x, F + 14, z, None)
            r = math.hypot(x, z)
            if r <= 3.5:
                mat = "polished_deepslate" if 2.5 < r else "smooth_quartz"
            elif abs(z) >= 5 and abs(x) <= 1:
                mat = "deepslate_tiles"
            else:
                mat = "polished_diorite" if (x + z) % 2 == 0 else "polished_andesite"
            w.set(x, F, z, mat)
    # murs nord/sud de la rotonde
    for z in (-HZ, HZ):
        for x in range(-RX, RX + 1):
            w.set(x, F + 1, z, BAND)
            w.fill(x, F + 2, z, x, F + 14, z, WALL)
            if abs(x) in (RX, 3):
                w.fill(x, F + 1, z, x, F + 14, z, TRIM)
            for y in range(F + 1, F + 15):
                dy = y - F
                if (abs(x) <= 2 and dy <= 5) or (abs(x) <= 1 and dy == 6):
                    w.set(x, y, z, None)
                elif abs(x) <= 1 and 9 <= dy <= 12:
                    w.set(x, y, z, "white_stained_glass")
        w.set(0, F + 6, z, TRIM)
    # murs est/ouest de la rotonde (au-dessus des boutiques et de la galerie)
    for x in (-RX, RX):
        for z in range(-HZ, HZ + 1):
            lo = F + 7 if abs(z) >= 5 else F + 11
            w.fill(x, lo, z, x, F + 14, z, WALL)
            if abs(z) >= 5:
                w.fill(x, F + 1, z, x, F + 6, z, WALL)
        for z in (-HZ, -5, 5, HZ):
            w.fill(x, F + 1, z, x, F + 14, z, TRIM)
    # toit + coupole
    for x in range(-RX, RX + 1):
        for z in range(-HZ, HZ + 1):
            if math.hypot(x, z) >= 6.5:
                w.set(x, F + 15, z, BAND if abs(x) == RX or abs(z) == HZ else "smooth_stone")
            if abs(x) == RX or abs(z) == HZ:
                w.set(x, F + 16, z, TRIM)
    cy = F + 15
    for x in range(-8, 9):
        for z in range(-8, 9):
            for y in range(cy + 1, cy + 9):
                dd = math.sqrt(x * x + z * z + (y - cy) ** 2)
                if 6.5 <= dd < 7.5:
                    w.set(x, y, z, TRIM if (x == 0 or z == 0) else "white_stained_glass")
    w.set(0, cy + 8, 0, TRIM)
    w.set(0, cy + 9, 0, "lightning_rod")
    w.fill(0, F + 12, 0, 0, cy + 6, 0, "chain")
    w.set(0, F + 11, 0, "lantern[hanging=true]")
    # fontaine
    for x in range(-3, 4):
        for z in range(-3, 4):
            r = math.hypot(x, z)
            if 2.5 < r <= 3.5:
                w.set(x, F + 1, z, "polished_deepslate_slab[type=bottom]" if r > 3 else "polished_deepslate")
            elif r <= 2.5:
                w.set(x, F, z, "water")
                w.set(x, F - 1, z, "polished_deepslate")
    w.fill(0, F, 0, 0, F + 3, 0, "quartz_pillar[axis=y]")
    w.set(0, F + 4, 0, "sea_lantern")
    # bacs à fleurs et bancs dans la rotonde
    for sx in (-4, 4):
        for sz in (-9, 9):
            w.set(sx, F, sz, "moss_block")
            w.set(sx, F + 1, sz, "flowering_azalea")
            for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                w.set(sx + dx, F + 1, sz + dz, "polished_deepslate_slab[type=bottom]")
    for sz in (-6, 6):
        for sx in (-5, 5):
            w.set(sx, F + 1, sz, f"dark_oak_stairs[facing={'west' if sx < 0 else 'east'}]")
            w.set(sx, F + 1, sz + (1 if sz > 0 else -1), f"dark_oak_stairs[facing={'west' if sx < 0 else 'east'}]")

    # ---- Mobilier de la galerie : bacs, bancs
    for x in (-30, -18, 18, 30):
        w.set(x, F, 0, "moss_block")
        w.set(x, F + 1, 0, "flowering_azalea")
        for dx in (-1, 0, 1):
            for dz in (-1, 0, 1):
                if dx or dz:
                    w.set(x + dx, F + 1, dz, "polished_deepslate_slab[type=bottom]")
        w.set(x - 3, F + 1, 0, "dark_oak_stairs[facing=west]")
        w.set(x + 3, F + 1, 0, "dark_oak_stairs[facing=east]")
    # ---- Parapets du toit plat des boutiques : dalles décoratives
    for x in range(-HX + 1, HX):
        for z in list(range(-HZ + 1, -5)) + list(range(6, HZ)):
            if abs(x) > RX and h2(x, z, 11) < 0.08:
                w.set(x, F + 7, z, "smooth_stone_slab[type=bottom]")
    return shops


def build_surroundings(w: World, xp: int) -> None:
    """Esplanades, chemins, lampadaires, phare, belvédère, kiosques, jardins."""
    # Couronne pavée autour du hall
    for x in range(-HX - 4, HX + 5):
        for z in range(-HZ - 4, HZ + 5):
            if (x, z) not in RESERVED:
                pave_cell(w, x, z)
                RESERVED.add((x, z))
    # Esplanade d'arrivée (ouest)
    for x in range(xp, -HX - 4):
        for z in range(-10, 11):
            if abs(z) <= 10 - max(0, (xp + 3 - x)) * 2 or x >= xp + 3:
                pave_cell(w, x, z, "deepslate_tiles" if abs(z) <= 2 else None)
                RESERVED.add((x, z))
    # Allée d'honneur en dalles noires jusqu'au hall
    for x in range(-HX - 4, -HX):
        for z in range(-2, 3):
            pave_cell(w, x, z, "deepslate_tiles")
    # Arche d'accueil
    ax = xp + 2
    for z in (-4, 4):
        w.fill(ax, F + 1, z, ax, F + 6, z, TRIM)
        w.set(ax, F + 7, z, "polished_deepslate_slab[type=bottom]")
    w.fill(ax, F + 6, -3, ax, F + 6, 3, BAND)
    w.set(ax, F + 5, 0, "lantern[hanging=true]")
    w.sign(ax - 1, F + 6, 0, "dark_oak_wall_sign[facing=west]",
           ['""', '{"text":"Île Marchande","bold":true}', '{"text":"16 boutiques"}', '""'])
    w.sign(ax + 1, F + 6, 0, "dark_oak_wall_sign[facing=east]",
           ['""', '{"text":"← Ponton","bold":true}', '{"text":"Spawn"}', '""'])
    # Arbres en bac et bancs de l'esplanade
    for tx in (xp + 6,):
        for tz in (-7, 7):
            for dx in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    w.set(tx + dx, F + 1, tz + dz, "polished_deepslate_slab[type=bottom]" if dx or dz else None)
            w.set(tx, F, tz, "grass_block")
            tree(w, tx, tz, "cherry")
    for bx in (xp + 9, xp + 10):
        for bz, f in ((-8, "north"), (8, "south")):
            w.set(bx, F + 1, bz, f"dark_oak_stairs[facing={f}]")
    for z in (-6, 6):
        lamp_post(w, xp + 3, z)
        lamp_post(w, -HX - 3, z)
    # Lampadaires autour du hall
    for x in range(-HX - 3, HX + 4, 8):
        for z in (-HZ - 4, HZ + 4):
            if abs(x) > 4:
                lamp_post(w, x, z)
    for z in (-HZ - 4, -8, 8, HZ + 4):
        lamp_post(w, HX + 4, z)

    # Belvédère au nord
    bz = -32
    for z in range(-HZ - 4, bz + 6, -1):
        for x in range(-2, 3):
            pave_cell(w, x, z)
            RESERVED.add((x, z))
    for x in range(-7, 8):
        for z in range(bz - 7, bz + 8):
            if math.hypot(x, z - bz) <= 6.5:
                pave_cell(w, x, z, "polished_deepslate" if math.hypot(x, z - bz) > 5.6 else None)
                RESERVED.add((x, z))
    for dx in (-3, 3):
        for dz in (-3, 3):
            w.fill(dx, F + 1, bz + dz, dx, F + 4, bz + dz, "stripped_dark_oak_log[axis=y]")
    w.fill(-4, F + 5, bz - 4, 4, F + 5, bz + 4, "dark_oak_slab[type=bottom]")
    w.fill(-3, F + 5, bz - 3, 3, F + 5, bz + 3, "dark_oak_planks")
    w.fill(-2, F + 6, bz - 2, 2, F + 6, bz + 2, "dark_oak_slab[type=bottom]")
    w.set(0, F + 6, bz, "dark_oak_planks")
    w.set(0, F + 4, bz, "lantern[hanging=true]")
    for x in range(-2, 3):
        w.set(x, F + 1, bz - 2, "dark_oak_stairs[facing=north]")
    for z in range(bz - 1, bz + 2):
        w.set(-2, F + 1, z, "dark_oak_stairs[facing=west]")
        w.set(2, F + 1, z, "dark_oak_stairs[facing=east]")
    for x in range(-7, 8):
        for z in range(bz - 7, bz + 1):
            if 5.6 < math.hypot(x, z - bz) <= 6.5 and z < bz:
                w.set(x, F + 1, z, "dark_oak_fence")

    # Marché couvert au sud : 3 kiosques de restauration
    for z in range(HZ + 5, 22):
        for x in range(-2, 3):
            pave_cell(w, x, z)
            RESERVED.add((x, z))
    for x in range(-24, 25):
        for z in range(22, 33):
            if abs(x) <= 24 - max(0, z - 30) * 2:
                pave_cell(w, x, z)
                RESERVED.add((x, z))
    for i, kx in enumerate((-15, 0, 15)):
        col = ["red", "yellow", "light_blue"][i]
        for dx in (-3, 3):
            for dz in (24, 28):
                w.fill(kx + dx, F + 1, dz, kx + dx, F + 3, dz, "spruce_fence")
        for dx in range(-2, 3):
            w.set(kx + dx, F + 1, 24, "barrel[facing=north]" if dx % 2 == 0 else "spruce_planks")
            w.set(kx + dx, F + 2, 24, "spruce_slab[type=bottom]" if dx % 2 else None)
        w.set(kx - 2, F + 1, 27, "smoker[facing=north]")
        w.set(kx + 2, F + 1, 27, "campfire[lit=false]")
        for dx in range(-3, 4):
            for dz in range(23, 30):
                w.set(kx + dx, F + 4, dz, f"{col}_wool" if (dx + 3) % 2 == 0 else "white_wool")
        w.set(kx, F + 3, 26, "lantern[hanging=true]")
        for dx in (-2, 2):
            w.set(kx + dx, F + 1, 21, f"spruce_stairs[facing=south]")
    for tx in (-20, 20):
        w.set(tx, F + 1, 26, "spruce_fence")
        w.set(tx, F + 2, 26, "spruce_fence")
        w.fill(tx - 1, F + 3, 25, tx + 1, F + 3, 27, "white_wool")
        w.set(tx, F + 4, 26, "white_carpet")
        for dx in (-1, 1):
            w.set(tx + dx, F + 1, 26, f"spruce_stairs[facing={'west' if dx < 0 else 'east'}]")

    # Phare à l'est
    lx = 49
    for x in range(HX + 5, lx - 3):
        for z in range(-1, 2):
            pave_cell(w, x, z)
            RESERVED.add((x, z))
    for x in range(lx - 6, lx + 7):
        for z in range(-6, 7):
            r = math.hypot(x - lx, z)
            if r <= 5.5:
                pave_cell(w, x, z, "polished_deepslate" if r > 4.6 else None)
                RESERVED.add((x, z))
    for x in range(lx - 5, lx + 6):
        for z in range(-5, 6):
            r = math.hypot(x - lx, z)
            for y in range(F + 1, F + 19):
                if r <= 3.4:
                    if r > 2.4:
                        w.set(x, y, z, "white_concrete" if ((y - F - 1) // 3) % 2 == 0 else "red_concrete")
                    else:
                        w.set(x, y, z, None)
            if r <= 4.6:
                w.set(x, F + 19, z, TRIM)
            if 3.6 < r <= 4.6:
                w.set(x, F + 20, z, "iron_bars")
            if 1.5 < r <= 2.5:
                w.fill(x, F + 20, z, x, F + 22, z, "glass")
            if r <= 2.5:
                w.set(x, F + 23, z, TRIM)
            if r <= 1.5:
                w.set(x, F + 24, z, "polished_deepslate_slab[type=bottom]")
    w.fill(lx, F + 20, 0, lx, F + 21, 0, "sea_lantern")
    w.set(lx, F + 24, 0, TRIM)
    w.set(lx, F + 25, 0, "lightning_rod")
    w.fill(lx - 3, F + 1, 0, lx - 3, F + 2, 0, None)
    w.fill(lx, F + 1, -2, lx, F + 19, -2, "ladder[facing=south]")
    w.fill(lx - 3, F + 9, 0, lx - 3, F + 10, 0, "glass_pane")
    w.fill(lx + 3, F + 13, 0, lx + 3, F + 14, 0, "glass_pane")
    w.fill(lx, F + 19, 0, lx, F + 19, 0, TRIM)
    w.fill(lx, F + 20, -2, lx, F + 21, -2, None)  # sortie sur la galerie

    # Jardins : arbres, herbes, fleurs
    flowers = ["poppy", "dandelion", "cornflower", "oxeye_daisy", "allium", "azure_bluet", "lily_of_the_valley"]
    cands = [(x, z) for x in range(-A, A + 1) for z in range(-B, B + 1) if island_d(x, z) < 0.8]
    rng.shuffle(cands)
    placed: list[tuple[int, int]] = []
    for x, z in cands:
        if len(placed) >= 46:
            break
        if any((x + dx, z + dz) in RESERVED for dx in range(-3, 4) for dz in range(-3, 4)):
            continue
        if any((x - px) ** 2 + (z - pz) ** 2 < 49 for px, pz in placed):
            continue
        v = h2(x, z, 5)
        tree(w, x, z, "oak" if v < 0.45 else "birch" if v < 0.7 else "cherry" if v < 0.9 else "azalea")
        placed.append((x, z))
        RESERVED.add((x, z))
    for x in range(-A - 6, A + 7):
        for z in range(-B - 6, B + 7):
            if w.get(x, F, z) == "grass_block" and not w.get(x, F + 1, z) and island_d(x, z) < 0.86:
                v = h2(x, z, 21)
                if v < 0.16:
                    w.set(x, F + 1, z, "short_grass")
                elif v < 0.2:
                    w.set(x, F + 1, z, flowers[int(h2(x, z, 22) * len(flowers))])
                elif v < 0.205:
                    w.set(x, F + 1, z, "oak_leaves[persistent=true]")  # buisson


# --------------------------------------------------------------------------- ponton


def pontoon_segment(w: World, x: int, x_start: int, posts_to: int = 0) -> None:
    """Une tranche (en X) du ponton : plancher, poutres de rive, garde-corps, pieux."""
    k = (x - x_start) % 8
    for z in range(-2, 3):
        w.set(x, DECK, z, "spruce_planks")
    for z in (-3, 3):
        w.set(x, DECK, z, "stripped_spruce_log[axis=x]")
        w.set(x, DECK + 1, z, "spruce_fence")
    if k % 4 == 0:
        for z in (-3, 3):
            w.fill(x, posts_to, z, x, DECK + 1, z, "spruce_log[axis=y]")
        w.fill(x, SEA, -2, x, SEA, 2, "stripped_spruce_log[axis=z]")
    if k == 0:
        for z in (-3, 3):
            w.set(x, DECK + 2, z, "spruce_fence")
            w.set(x, DECK + 3, z, "lantern")


def build_pontoon(w: World, xs: int, xe: int, posts_to: int = 0) -> None:
    """Ponton de xs (côté spawn) à xe (côté île, exclu), avec arche d'entrée et belvédère à mi-chemin."""
    for x in range(xs, xe):
        pontoon_segment(w, x, xs, posts_to)
    # Arche d'entrée côté spawn
    for z in (-3, 3):
        w.fill(xs, DECK + 1, z, xs, DECK + 5, z, TRIM)
        w.set(xs, DECK + 6, z, "polished_deepslate_slab[type=bottom]")
    w.fill(xs, DECK + 5, -2, xs, DECK + 5, 2, BAND)
    w.set(xs, DECK + 4, 0, "lantern[hanging=true]")
    w.sign(xs - 1, DECK + 5, 0, "dark_oak_wall_sign[facing=west]",
           ['""', '{"text":"Île Marchande","bold":true}', '{"text":"→ 16 boutiques"}', '""'])
    # Plateforme de repos à mi-chemin
    length = xe - xs
    if length >= 32:
        mx = xs + (length // 16) * 8
        for x in range(mx - 4, mx + 5):
            for z in range(-7, 8):
                if abs(z) <= 2:
                    continue
                w.set(x, DECK, z, "spruce_planks")
                w.set(x, DECK + 1, z, None)
                if abs(z) == 7 or abs(x - mx) == 4:
                    w.set(x, DECK, z, "stripped_spruce_log[axis=x]" if abs(z) == 7 else "stripped_spruce_log[axis=z]")
                    w.set(x, DECK + 1, z, "spruce_fence")
                if (abs(z) == 7 or abs(z) == 3) and abs(x - mx) in (0, 4):
                    w.fill(x, posts_to, z, x, DECK + 1, z, "spruce_log[axis=y]")
        for x in range(mx - 3, mx + 4):  # ouvre le garde-corps vers les plateformes
            for z in (-3, 3):
                w.set(x, DECK, z, "spruce_planks")
                w.set(x, DECK + 1, z, None)
        for sz in (-7, 7):
            for sx in (mx - 4, mx + 4):
                w.set(sx, DECK + 2, sz, "spruce_fence")
                w.set(sx, DECK + 3, sz, "lantern")
            for x in range(mx - 2, mx + 3):
                w.set(x, DECK + 1, sz - (1 if sz > 0 else -1), f"spruce_stairs[facing={'south' if sz > 0 else 'north'}]")
        for sz in (-5, 5):
            w.set(mx, DECK + 1, sz, "barrel[facing=up]")
            w.set(mx, DECK + 2, sz, "lantern")


# --------------------------------------------------------------------------- export


def nbt(tag_type: int, value) -> bytes:
    if tag_type == 1:
        return struct.pack(">b", value)
    if tag_type == 2:
        return struct.pack(">h", value)
    if tag_type == 3:
        return struct.pack(">i", value)
    if tag_type == 7:
        return struct.pack(">i", len(value)) + bytes(value)
    if tag_type == 8:
        e = value.encode("utf-8")
        return struct.pack(">H", len(e)) + e
    if tag_type == 9:
        et, items = value
        return struct.pack(">bi", et if items else 0, len(items)) + b"".join(nbt(et, i) for i in items)
    if tag_type == 10:
        out = b""
        for k, (t, v) in value.items():
            out += struct.pack(">b", t) + nbt(8, k) + nbt(t, v)
        return out + b"\x00"
    if tag_type == 11:
        return struct.pack(">i", len(value)) + b"".join(struct.pack(">i", i) for i in value)
    raise ValueError(tag_type)


def text_side(lines: list[str]) -> dict:
    return {"has_glowing_text": (1, 0), "color": (8, "black"), "messages": (9, (8, lines))}


def export(w: World, path: Path, origin: tuple[int, int, int]) -> dict:
    xs = [p[0] for p in w.b]
    ys = [p[1] for p in w.b]
    zs = [p[2] for p in w.b]
    mn = (min(xs), min(ys), min(zs))
    W, H, L = max(xs) - mn[0] + 1, max(ys) - mn[1] + 1, max(zs) - mn[2] + 1
    palette: dict[str, int] = {"minecraft:air": 0}
    data = bytearray()
    for y in range(H):
        for z in range(L):
            for x in range(W):
                s = w.b.get((x + mn[0], y + mn[1], z + mn[2]))
                key = "minecraft:" + s if s else "minecraft:air"
                i = palette.setdefault(key, len(palette))
                while True:
                    if i & ~0x7F:
                        data.append((i & 0x7F) | 0x80)
                        i >>= 7
                    else:
                        data.append(i)
                        break
    bes = []
    for (x, y, z), lines in w.signs.items():
        bes.append({"Pos": (11, [x - mn[0], y - mn[1], z - mn[2]]), "Id": (8, "minecraft:sign"),
                    "front_text": (10, text_side(lines)), "back_text": (10, text_side(['""'] * 4)),
                    "is_waxed": (1, 1)})
    off = [mn[i] - origin[i] for i in range(3)]
    root = {
        "Version": (3, 2), "DataVersion": (3, DATA_VERSION),
        "Width": (2, W), "Height": (2, H), "Length": (2, L),
        "Offset": (11, [0, 0, 0]),
        "Metadata": (10, {"WEOffsetX": (3, off[0]), "WEOffsetY": (3, off[1]), "WEOffsetZ": (3, off[2]),
                          "Name": (8, path.stem), "Author": (8, "VÆLORIA")}),
        "PaletteMax": (3, len(palette)),
        "Palette": (10, {k: (3, v) for k, v in palette.items()}),
        "BlockData": (7, data),
        "BlockEntities": (9, (10, bes)),
    }
    raw = struct.pack(">b", 10) + nbt(8, "Schematic") + nbt(10, root)
    path.write_bytes(gzip.compress(raw, mtime=0))
    return {"min": mn, "size": (W, H, L), "offset": off, "blocks": len(w.b), "palette": len(palette)}


# --------------------------------------------------------------------------- aperçus

COLORS = {
    "grass_block": (98, 150, 66), "dirt": (134, 96, 67), "stone": (125, 125, 125), "sand": (219, 207, 163),
    "sandstone": (216, 203, 155), "stone_bricks": (122, 121, 122), "polished_andesite": (132, 135, 134),
    "andesite": (136, 136, 137), "polished_diorite": (192, 193, 194), "smooth_quartz": (235, 229, 222),
    "polished_deepslate": (72, 72, 73), "deepslate_tiles": (54, 54, 55), "smooth_stone": (158, 158, 158),
    "glass": (190, 225, 240), "white_stained_glass": (240, 245, 250), "glass_pane": (190, 225, 240),
    "water": (60, 110, 200), "spruce_planks": (115, 85, 49), "spruce_log": (58, 37, 16),
    "stripped_spruce_log": (116, 90, 52), "spruce_fence": (115, 85, 49), "dark_oak_fence": (66, 43, 20),
    "lantern": (230, 170, 80), "sea_lantern": (172, 199, 190), "oak_log": (109, 85, 50), "birch_log": (216, 215, 210),
    "cherry_log": (54, 33, 44), "oak_leaves": (60, 120, 40), "birch_leaves": (110, 150, 70),
    "cherry_leaves": (240, 170, 200), "flowering_azalea_leaves": (100, 130, 60), "moss_block": (89, 109, 45),
    "white_concrete": (207, 213, 214), "red_concrete": (142, 32, 32), "white_wool": (233, 236, 236),
    "dark_oak_planks": (66, 43, 20), "dark_oak_slab": (66, 43, 20), "stripped_dark_oak_log": (96, 76, 49),
    "iron_bars": (150, 150, 150), "barrel": (140, 105, 60), "chain": (60, 60, 70),
}
WOOL = {"red": (160, 39, 34), "blue": (53, 57, 157), "lime": (112, 185, 25), "orange": (240, 118, 19),
        "cyan": (21, 137, 145), "purple": (121, 42, 172), "yellow": (248, 197, 39), "light_blue": (58, 175, 217),
        "magenta": (189, 68, 179), "green": (84, 109, 27), "pink": (237, 141, 172), "brown": (114, 71, 40),
        "black": (20, 21, 25), "white": (233, 236, 236), "gray": (62, 68, 71), "light_gray": (142, 142, 134)}
WOOD = {"spruce": (115, 85, 49), "oak": (162, 130, 78), "birch": (192, 175, 121), "dark_oak": (66, 43, 20),
        "cherry": (226, 178, 172), "mangrove": (117, 54, 48), "jungle": (160, 115, 80), "acacia": (168, 90, 50)}


def color_of(s: str) -> tuple[int, int, int] | None:
    n = base(s)
    if n in PLANTS or "sign" in n or n == "short_grass":
        return None
    if n in COLORS:
        return COLORS[n]
    for c, v in WOOL.items():
        if n in (f"{c}_wool", f"{c}_concrete", f"{c}_carpet"):
            return v
    for wd, v in WOOD.items():
        if n.startswith(wd) or n.startswith("stripped_" + wd):
            return v
    if "deepslate" in n:
        return (70, 70, 72)
    if "quartz" in n:
        return (235, 229, 222)
    if "smooth_stone" in n:
        return (158, 158, 158)
    return (150, 150, 150)


def shape_of(s: str) -> tuple[float, float, float, float]:
    """(retrait horizontal, y bas, y haut) simplifiés pour le rendu."""
    n = base(s)
    if "slab" in n and "type=top" not in s:
        return (0, 0, 0.5, 0)
    if "carpet" in n:
        return (0, 0, 0.1, 0)
    if n.endswith("_fence") or n in ("iron_bars", "chain", "lightning_rod"):
        return (0.38, 0, 1, 0)
    if "pane" in n:
        return (0.3, 0, 1, 0)
    if "lantern" in n and n != "sea_lantern":
        return (0.3, 0.1, 0.65, 0)
    if "ladder" in n or n == "water":
        return (0, 0, 0.88, 0)
    return (0, 0, 1, 0)


def render_iso(w: World, path: Path, scale: int = 4) -> None:
    from PIL import Image, ImageDraw

    keys = [p for p in w.b if p[1] >= SEA]
    xs = [p[0] for p in keys]
    zs = [p[2] for p in keys]
    ys = [p[1] for p in keys]
    mnx, mxx, mnz, mxz, mxy = min(xs) - 6, max(xs) + 6, min(zs) - 6, max(zs) + 6, max(ys)

    def proj(X, Y, Z):
        return ((X - Z - (mnx - mxz)) * scale, ((X + Z - mnx - mnz) / 2 - Y + mxy + 2) * scale)

    Wd = int((mxx - mnx + mxz - mnz + 2) * scale)
    Ht = int(((mxx - mnx + mxz - mnz) / 2 + mxy - SEA + 6) * scale)
    img = Image.new("RGB", (Wd, Ht), (16, 18, 22))
    dr = ImageDraw.Draw(img)
    sea = [proj(mnx, SEA + 0.9, mnz), proj(mxx, SEA + 0.9, mnz), proj(mxx, SEA + 0.9, mxz), proj(mnx, SEA + 0.9, mxz)]
    dr.polygon(sea, fill=(38, 74, 120))

    def opaque(p):
        s = w.b.get(p)
        return s is not None and shape_of(s) == (0, 0, 1, 0) and "glass" not in s and "leaves" not in s

    for (x, y, z) in sorted(keys, key=lambda p: (p[0] + p[2], p[1], p[0])):
        s = w.b[(x, y, z)]
        c = color_of(s)
        if c is None:
            continue
        if opaque((x, y + 1, z)) and opaque((x + 1, y, z)) and opaque((x, y, z + 1)):
            continue
        ins, y0, y1, _ = shape_of(s)
        x0, x1, z0, z1 = x + ins, x + 1 - ins, z + ins, z + 1 - ins
        Y0, Y1 = y + y0, y + y1
        top = [proj(x0, Y1, z0), proj(x1, Y1, z0), proj(x1, Y1, z1), proj(x0, Y1, z1)]
        east = [proj(x1, Y1, z0), proj(x1, Y1, z1), proj(x1, Y0, z1), proj(x1, Y0, z0)]
        south = [proj(x0, Y1, z1), proj(x1, Y1, z1), proj(x1, Y0, z1), proj(x0, Y0, z1)]
        sh = lambda k: tuple(int(v * k) for v in c)
        dr.polygon(east, fill=sh(0.78))
        dr.polygon(south, fill=sh(0.62))
        dr.polygon(top, fill=c)
    img.save(path, optimize=True)


def render_plan(w: World, path: Path, shops: list[dict], scale: int = 7) -> None:
    """Plan au niveau du sol (coupe à F+2) avec les numéros de boutiques."""
    from PIL import Image, ImageDraw, ImageFont

    xs = [p[0] for p in w.b]
    zs = [p[2] for p in w.b]
    mnx, mxx, mnz, mxz = min(xs), max(xs), min(zs), max(zs)
    cols: dict[tuple[int, int], tuple[int, str]] = {}
    for (x, y, z), s in w.b.items():
        if y <= F + 2 and color_of(s) is not None:
            if (x, z) not in cols or y > cols[(x, z)][0]:
                cols[(x, z)] = (y, s)
    img = Image.new("RGB", ((mxx - mnx + 1) * scale, (mxz - mnz + 1) * scale + 40), (38, 74, 120))
    dr = ImageDraw.Draw(img)
    for (x, z), (y, s) in cols.items():
        c = color_of(s)
        if y < SEA:
            c = tuple(int(0.35 * a + 0.65 * b) for a, b in zip(c, (38, 74, 120)))
        k = 1.0 if y >= F + 1 else 0.85
        dr.rectangle([(x - mnx) * scale, (z - mnz) * scale, (x - mnx + 1) * scale - 1, (z - mnz + 1) * scale - 1],
                     fill=tuple(int(v * k) for v in c))
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 14)
        small = ImageFont.truetype("DejaVuSans.ttf", 14)
    except OSError:
        font = small = ImageFont.load_default()
    for s in shops:
        (x0, _, z0), (x1, _, z1) = s["_min"], s["_max"]
        cx, cz = ((x0 + x1 + 1) / 2 - mnx) * scale, ((z0 + z1 + 1) / 2 - mnz) * scale
        t = f"{s['id']:02d}"
        dr.rectangle([cx - 13, cz - 10, cx + 13, cz + 10], fill=(16, 18, 22))
        dr.text((cx, cz), t, fill=(255, 255, 255), font=font, anchor="mm")
    dr.text((10, (mxz - mnz + 1) * scale + 12),
            "Plan au sol — Échoppe 5×8 · Boutique 7×8 · Grande boutique 9×8 · Enseigne 11×8 · Nord en haut",
            fill=(230, 230, 230), font=small)
    img.save(path, optimize=True)


# --------------------------------------------------------------------------- main


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ponton", type=int, default=48, help="longueur du ponton sur l'eau, en blocs (défaut 48)")
    ap.add_argument("--no-preview", action="store_true")
    args = ap.parse_args()

    w = World()
    build_terrain(w)
    west = min(x for x in range(-A - 10, 0) if island_d(x, 0) <= 1.0)  # rivage ouest
    xp = min(x for x in range(-A - 10, 0) if island_d(x, 0) <= 0.88)  # début de l'herbe
    shops = build_hall(w)
    build_surroundings(w, xp)
    # Le ponton traverse la plage jusqu'à l'esplanade ; marche en dalle pour monter sur le pavé.
    for x in range(west, xp):
        for z in range(-3, 4):
            w.fill(x, DECK + 1, z, x, F + 3, z, None)
    island = World()
    island.b, island.signs = dict(w.b), dict(w.signs)

    xs = west - args.ponton
    build_pontoon(w, xs, xp)
    for z in range(-2, 3):
        w.set(xp - 1, F, z, "spruce_slab[type=bottom]")
        w.set(xp - 1, DECK, z, "spruce_planks")
    # même raccord pour l'île seule (le ponton est collé séparément)
    for x in range(west, xp):
        pontoon_segment(island, x, west)
    for z in range(-2, 3):
        island.set(xp - 1, F, z, "spruce_slab[type=bottom]")
    connect_pass(w)
    connect_pass(island)

    origin = (xs, DECK + 1, 0)  # pieds du joueur sur le premier bloc du ponton
    info_full = export(w, OUT / "ile-commerciale-complete.schem", origin)
    info_island = export(island, OUT / "ile-commerciale-seule.schem", (west, DECK + 1, 0))

    mod = World()
    for x in range(0, 8):
        pontoon_segment(mod, x, 0)
    connect_pass(mod)
    # les garde-corps aux extrémités doivent se raccorder au module suivant
    for z in (-3, 3):
        for x in (0, 7):
            s = mod.get(x, DECK + 1, z)
            if s and s.startswith("spruce_fence"):
                mod.set(x, DECK + 1, z, s.replace("east=false", "east=true").replace("west=false", "west=true"))
    info_mod = export(mod, OUT / "ponton-module-8.schem", (0, DECK + 1, 0))

    # Boutiques : coordonnées relatives au point de collage du schematic complet et de l'île seule
    out = []
    for s in shops:
        rel = lambda p, o: [p[i] - o[i] for i in range(3)]
        o2 = (west, DECK + 1, 0)
        out.append({k: v for k, v in s.items() if not k.startswith("_")} | {
            "depuis_debut_ponton": {"min": rel(s["_min"], origin), "max": rel(s["_max"], origin), "porte": rel(s["_porte"], origin)},
            "depuis_arrivee_ile": {"min": rel(s["_min"], o2), "max": rel(s["_max"], o2), "porte": rel(s["_porte"], o2)},
        })
    (OUT / "shops.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    if not args.no_preview:
        render_iso(w, OUT / "apercu-isometrique.png")
        render_plan(island, OUT / "plan-boutiques.png", shops)

    for name, i in (("complete", info_full), ("île seule", info_island), ("module ponton", info_mod)):
        print(f"{name:14} {i['size'][0]}×{i['size'][1]}×{i['size'][2]}  blocs={i['blocks']}  palette={i['palette']}  offset={i['offset']}")
    print(f"ponton : {xp - xs} blocs (dont {args.ponton} sur l'eau), île : rivage ouest x={west}")


if __name__ == "__main__":
    main()
