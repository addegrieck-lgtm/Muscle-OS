#!/usr/bin/env python3
"""
Grotte de la Forge de VÆLORIA : petite île flottante creusée d'une grotte, avec une forge et une salle
d'enchantement, reliée au spawn par un ponton. Même identité visuelle que le spawn et que l'Île Marchande
(les briques de base sont partagées avec ../ile-commerciale/generate.py).

Enchantement : 4 tables pour choisir son niveau
  - 15 bibliothèques -> emplacement du haut toujours au niveau 30
  -  8 bibliothèques -> niveaux 16 à 20
  -  3 bibliothèques -> niveaux 6 à 12
  -  0 bibliothèque  -> niveaux 1 à 8
(formule Java : base = 1..8 + n/2 + 0..n ; emplacement du haut = max(base, 2n))

Sorties : grotte-forge.schem (origine = bout libre du ponton, côté spawn), aperçus, README.
    python3 generate.py [--ponton 30] [--spawn vaeloria-spawn-gabarit.schem]
Orientation : la grotte est au nord du spawn, le ponton part vers le sud.
"""

from __future__ import annotations

import argparse
import importlib.util
import math
from collections import deque
from pathlib import Path

OUT = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("ile", OUT.parent / "ile-commerciale" / "generate.py")
ile = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ile)

World, h2 = ile.World, ile.h2
ile.COLORS.update({
    "lava": (207, 92, 15), "bookshelf": (117, 94, 60), "enchanting_table": (90, 20, 30), "anvil": (68, 68, 68),
    "furnace": (110, 110, 110), "blast_furnace": (80, 80, 85), "smithing_table": (57, 58, 70),
    "crafting_table": (120, 90, 50), "stonecutter": (120, 120, 120), "grindstone": (140, 140, 140),
    "water_cauldron": (60, 90, 200), "red_candle": (160, 39, 34), "polished_blackstone_brick_stairs": (48, 42, 50),
    "pale_oak_sign": None,
})
ile.INVISIBLE.add("pale_oak_sign")
G = ile.G  # niveau du sol (plancher du ponton)
FL = G - 3  # sol de la grotte, 3 marches sous le sol de l'île
A, B = 28, 23  # demi-axes de l'île
MA, MB, MH = 19, 14, 10  # demi-axes et hauteur de la butte qui abrite la grotte
CA, CB = 15, 10  # demi-axes de la grotte
DEPTH = 22  # épaisseur max. du rocher sous l'île

# Raccord au gabarit du spawn : bord nord du spawn à +30 en X (coin nord-est, libre),
# 73 blocs au nord du point de collage. Le bout libre du ponton se colle sur ce bord.
SPAWN_ATTACH = (30, 0, -73)

BRICK, PBLACK, CHISEL = ile.BRICK, ile.PBLACK, ile.CHISEL
DSLATE, TILES, RED, SLAB = ile.DSLATE, ile.TILES, ile.RED, ile.SLAB

# Tables d'enchantement : (x, z, nb de bibliothèques, libellé)
TABLES = [(0, 5, 15, "Niveau 30"), (-12, 5, 8, "Niveaux 16 à 20"), (-6, 7, 0, "Niveaux 1 à 8"), (11, 4, 3, "Niveaux 6 à 12")]


def island_d(x: float, z: float) -> float:
    nx, nz = x / A, z / B
    t = math.atan2(nz, nx)
    r = 1 + 0.06 * math.sin(3 * t + 1.3) + 0.04 * math.sin(5 * t + 0.4)
    return math.hypot(nx, nz) / r


def mound_h(x: int, z: int) -> int:
    """Hauteur de la butte au-dessus du sol (0 = pas de butte)."""
    e = (x / MA) ** 2 + (z / MB) ** 2
    if e >= 1:
        return 0
    return int(MH * (1 - e) ** 0.6 + h2(x // 2, z // 2, 71) * 1.5)


def in_cave(x: int, y: int, z: int) -> bool:
    e = (x / CA) ** 2 + (z / CB) ** 2 + (h2(x, z, 72) - 0.5) * 0.08
    if e > 1:
        return False
    return FL < y <= FL + 3 + int(6 * math.sqrt(max(0.0, 1 - e)))


# --------------------------------------------------------------------------- île + butte + grotte


def build_island(w: World) -> None:
    for x in range(-int(A * 1.2), int(A * 1.2) + 1):
        for z in range(-int(B * 1.2), int(B * 1.2) + 1):
            d = island_d(x, z)
            if d > 1:
                continue
            depth = 4 + int(ile.rock_depth(d) * (DEPTH - 4) * (0.9 + 0.2 * h2(x // 3, z // 3, 9)))
            ile.floating_rock(w, x, z, G - 4, depth - 4, d)
            w.fill(x, G - 3, z, x, G - 1, z, "tuff")
            mh = mound_h(x, z)
            if mh <= 0:
                w.set(x, G, z, "pale_moss_block")
                continue
            for y in range(G, G + mh):
                w.set(x, y, z, ile.rock(x, y + 12, z) if h2(x, y, 73) > 0.25 else "tuff")
            w.set(x, G + mh, z, "pale_moss_block")
    # Grotte
    for x in range(-CA - 1, CA + 2):
        for z in range(-CB - 1, CB + 2):
            if in_cave(x, FL + 1, z):
                w.set(x, FL, z, TILES if (x + z) % 3 else DSLATE)
                for y in range(FL + 1, FL + 10):
                    if in_cave(x, y, z):
                        w.set(x, y, z, None)
    # Stalactites au plafond
    for x in range(-CA, CA + 1):
        for z in range(-CB, CB + 1):
            if in_cave(x, FL + 1, z) and h2(x, z, 74) < 0.06:
                top = max(y for y in range(FL + 1, FL + 10) if in_cave(x, y, z))
                if top >= FL + 6:
                    w.set(x, top, z, "pointed_dripstone[thickness=tip,vertical_direction=down]")


def build_entrance(w: World) -> int:
    """Galerie d'entrée côté ouest : escalier de 3 marches, portail à piliers comme les ponts du spawn."""
    x_out = -next(r for r in range(MA + 3, 0, -1) if mound_h(-r, 0) > 0) - 1  # pied de la butte
    for x in range(x_out, -CA + 2):
        k = x - x_out
        for z in range(-2, 3):
            if k == 0:
                w.set(x, G, z, DSLATE if abs(z) == 2 else TILES)
                w.fill(x, G + 1, z, x, G + 3, z, None)
            elif k <= 3:
                y = G - k + 1
                w.set(x, y, z, "polished_blackstone_brick_stairs[facing=west]")
                w.fill(x, FL, z, x, y - 1, z, DSLATE)
                w.fill(x, y + 1, z, x, G + 3, z, None)
            else:
                w.set(x, FL, z, DSLATE if abs(z) == 2 else TILES)
                w.fill(x, FL + 1, z, x, G + 3, z, None)
        for z in (-3, 3):
            w.fill(x, FL + 1, z, x, G + 3, z, BRICK)
        w.fill(x, G + 4, -3, x, G + 4, 3, PBLACK)
        if (x - x_out) % 4 == 2:
            w.fill(x, G + 3, 0, x, G + 3, 0, "chain")
            w.set(x, G + 2, 0, "lantern[hanging=true]")
    # Portail
    for z in (-3, 3):
        w.fill(x_out, G + 1, z, x_out, G + 5, z, BRICK)
        w.set(x_out, G + 6, z, CHISEL)
        w.set(x_out, G + 7, z, "lantern[hanging=false]")
    w.fill(x_out, G + 4, -2, x_out, G + 5, 2, PBLACK)
    w.fill(x_out, G + 1, -2, x_out, G + 3, 2, None)
    w.set(x_out, G + 5, 0, RED)
    w.sign(x_out - 1, G + 5, 0, "pale_oak_wall_sign[facing=west]",
           ['{"text":"VÆLORIA","color":"dark_red"}', '{"text":"Forge","bold":true}', '{"text":"&"}',
            '{"text":"Enchantement","bold":true}'])
    return x_out


def shelves(w: World, tx: int, tz: int, n: int) -> None:
    """Table d'enchantement + n bibliothèques comptées par le jeu (anneau à 2 blocs, 3×3 d'air autour)."""
    y = FL + 1
    for dx in range(-2, 3):
        for dz in range(-2, 3):
            w.set(tx + dx, FL, tz + dz, RED if max(abs(dx), abs(dz)) == 1 else DSLATE)
            for dy in (0, 1):
                w.set(tx + dx, y + dy, tz + dz, None)
    w.set(tx, y, tz, "enchanting_table")
    w.set(tx, FL, tz, CHISEL)
    if n >= 15:  # anneau complet sur 2 hauteurs, ouvert au nord (capé à 15 par le jeu)
        spots = [(dx, dz, dy) for dy in (0, 1) for dx in range(-2, 3) for dz in range(-2, 3)
                 if max(abs(dx), abs(dz)) == 2 and (dx, dz) != (0, -2)]
    elif n == 8:  # mur du fond : 5 en bas + 3 au-dessus
        spots = [(dx, 2, 0) for dx in range(-2, 3)] + [(dx, 2, 1) for dx in (-1, 0, 1)]
    elif n == 3:
        spots = [(dx, 2, 0) for dx in (-1, 0, 1)]
    else:
        spots = []
    for dx, dz, dy in spots:
        w.set(tx + dx, y + dy, tz + dz, "bookshelf")
    tops = {(dx, dz) for dx, dz, dy in spots}
    for dx, dz in tops:
        h = max(dy for ddx, ddz, dy in spots if (ddx, ddz) == (dx, dz))
        w.set(tx + dx, y + h + 1, tz + dz, "red_candle[candles=3,lit=true]" if (dx + dz) % 2 == 0 else SLAB)


def build_interior(w: World) -> None:
    # ---- Forge (moitié nord)
    for x in range(-11, 12):
        for z in range(-CB, -2):
            if w.get(x, FL, z):
                w.set(x, FL, z, BRICK if (x + z) % 2 else PBLACK)
    # Bassin de lave derrière des barreaux, sous une hotte
    for x in range(-3, 4):
        for z in (-9, -8):
            w.set(x, FL - 1, z, "blackstone")
            w.set(x, FL, z, "lava" if abs(x) <= 2 else BRICK)
            w.fill(x, FL + 1, z, x, FL + 3, z, None)
        w.set(x, FL, -10, BRICK)
        w.set(x, FL + 1, -7, "iron_bars" if abs(x) <= 2 else BRICK)
        w.fill(x, FL + 4, -10, x, FL + 5, -7, PBLACK)
    for x in (-3, 3):
        w.fill(x, FL + 1, -10, x, FL + 3, -7, BRICK)
        w.set(x, FL + 4, -7, CHISEL)
    w.fill(0, FL + 6, -8, 0, FL + 8, -8, "chain")
    # Fourneaux et hauts fourneaux
    for x in (-8, -7, -6, -5):
        w.set(x, FL + 1, -7, "blast_furnace[facing=south,lit=false]")
        w.set(x, FL + 2, -7, SLAB)
    for x in (5, 6, 7, 8):
        w.set(x, FL + 1, -7, "furnace[facing=south,lit=false]")
        w.set(x, FL + 2, -7, SLAB)
    w.set(-10, FL + 1, -5, "smithing_table")
    w.set(-10, FL + 1, -4, "crafting_table")
    w.set(-10, FL + 1, -6, "stonecutter[facing=east]")
    w.set(10, FL + 1, -5, "anvil[facing=west]")
    w.set(10, FL + 1, -3, "anvil[facing=west]")
    w.set(10, FL + 1, -6, "grindstone[face=floor,facing=west]")
    w.set(5, FL + 1, -4, "water_cauldron[level=3]")
    for x in (-8, -6):
        w.set(x, FL + 1, -9, "barrel[facing=south]")
        w.set(x, FL + 2, -9, "barrel[facing=up]")
    # ---- Enchantement (moitié sud)
    for tx, tz, n, _ in TABLES:
        shelves(w, tx, tz, n)
    # Enclume pour combiner les livres, près des tables
    w.set(5, FL + 1, 1, "anvil[facing=south]")
    # ---- Panneaux
    for tx, tz, n, label in TABLES:
        w.sign(tx + 2, FL + 1, tz - 3, "pale_oak_sign[rotation=8]",
               ['{"text":"Enchantement","color":"dark_red"}', '{"text":"' + label + '","bold":true}',
                '{"text":"' + (f"{n} bibliothèques" if n else "sans bibliothèque") + '"}', '""'])
    # ---- Éclairage : lanternes suspendues sous le plafond
    for lx, lz in ((-11, -3), (-4, -4), (4, -4), (11, -3), (-12, 1), (0, 1), (8, 1), (-8, 1), (12, 8), (0, 9)):
        if not in_cave(lx, FL + 1, lz):
            continue
        top = max(y for y in range(FL + 1, FL + 10) if in_cave(lx, y, lz))
        for y in range(FL + 4, top + 1):
            w.set(lx, y, lz, "chain")
        w.set(lx, FL + 3, lz, "lantern[hanging=true]")


def build_outside(w: World, x_out: int, pad_x: int) -> None:
    ile.ring_pad(w, pad_x, 0, 6.5)
    for x in range(pad_x + 6, x_out):
        for z in range(-2, 3):
            ile.pave(x, z, DSLATE if abs(z) == 2 else TILES)
    ile.finish_paving(w)
    for x, z in ((-4, -20), (6, 19), (-22, 13), (20, -15), (0, 0)):
        y0 = G + mound_h(x, z) + 1
        if w.get(x, y0 - 1, z) == "pale_moss_block":
            ile.pale_tree(w, x, z, y0, 4 if (x, z) == (0, 0) else 5)
    for x in range(-A - 2, A + 3):
        for z in range(-B - 2, B + 3):
            y = G + mound_h(x, z)
            if w.get(x, y, z) == "pale_moss_block" and not w.get(x, y + 1, z):
                v = h2(x, z, 21)
                w.set(x, y + 1, z, "pale_moss_carpet" if v < 0.3 else "red_tulip" if v < 0.33 else "poppy" if v < 0.35 else None)


# --------------------------------------------------------------------------- rotation (ponton vers le sud)

TURN = {"north": "west", "west": "south", "south": "east", "east": "north"}


def rotate(w: World) -> World:
    """Rotation de 90° : l'ouest devient le sud. (x, z) -> (z, -x)."""
    out = World()
    for (x, y, z), s in w.b.items():
        name, _, props = s.partition("[")
        if props:
            kv = dict(p.split("=") for p in props.rstrip("]").split(","))
            if kv.get("facing") in TURN:
                kv["facing"] = TURN[kv["facing"]]
            if kv.get("axis") in ("x", "z"):
                kv["axis"] = "z" if kv["axis"] == "x" else "x"
            if "rotation" in kv:
                kv["rotation"] = str((int(kv["rotation"]) - 4) % 16)
            s = name + "[" + ",".join(f"{k}={v}" for k, v in kv.items()) + "]"
        out.b[(z, y, -x)] = s
    out.signs = {(z, y, -x): v for (x, y, z), v in w.signs.items()}
    return out


# --------------------------------------------------------------------------- vérifications


LIGHT = {"lantern": 15, "lava": 15, "shroomlight": 15, "red_candle": 9, "enchanting_table": 7}


def dark_floor(w: World) -> list[tuple[int, int, int]]:
    """Cases de sol de la grotte où la lumière de blocs vaut 0 (apparition de monstres possible)."""
    light: dict[tuple[int, int, int], int] = {}
    q = deque()
    for p, s in w.b.items():
        lv = LIGHT.get(ile.base(s))
        if lv:
            light[p] = lv
            q.append(p)
    while q:
        x, y, z = q.popleft()
        lv = light[(x, y, z)] - 1
        if lv <= 0:
            continue
        for dx, dy, dz in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)):
            n = (x + dx, y + dy, z + dz)
            s = w.b.get(n)
            if s and ile.is_full(s) and "glass" not in s:
                continue
            if light.get(n, 0) < lv:
                light[n] = lv
                q.append(n)
    return [(x, FL + 1, z) for x in range(-CA, CA + 1) for z in range(-CB, CB + 1)
            if in_cave(x, FL + 1, z) and not ile.is_full(w.get(x, FL + 1, z)) and ile.is_full(w.get(x, FL, z))
            and light.get((x, FL + 1, z), 0) == 0]


def check_tables(w: World) -> list[str]:
    """Recompte les bibliothèques comme le jeu (Java 1.21)."""
    out = []
    for tx, tz, n, label in TABLES:
        c = 0
        for dx in range(-2, 3):
            for dz in range(-2, 3):
                if max(abs(dx), abs(dz)) != 2:
                    continue
                for dy in (0, 1):
                    if w.get(tx + dx, FL + 1 + dy, tz + dz) == "bookshelf":
                        mid = w.get(tx + int(dx / 2), FL + 1 + dy, tz + int(dz / 2))
                        if mid is None:
                            c += 1
        b = min(c, 15)
        lo, hi = max(1 + b // 2, 2 * b), max(8 + b // 2 + b, 2 * b)
        out.append(f"table {label:16} : {c:2d} bibliothèques comptées -> emplacement du haut {lo} à {hi}")
    return out


# --------------------------------------------------------------------------- main


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ponton", type=int, default=30, help="longueur du ponton dans le vide (défaut 30)")
    ap.add_argument("--spawn", type=Path, help="gabarit du spawn (.schem) pour l'aperçu d'assemblage")
    ap.add_argument("--no-preview", action="store_true")
    args = ap.parse_args()

    w = World()
    build_island(w)
    x_out = build_entrance(w)
    build_interior(w)
    print("\n".join(check_tables(w)))
    dark = dark_floor(w)
    print(f"cases de sol sans lumière dans la grotte : {len(dark)} {dark[:8]}")
    west = min(x for x in range(-A - 6, 0) if island_d(x, 0) <= 1.0)
    pad_x = west + 7
    build_outside(w, x_out, pad_x)
    xe, xs = pad_x - 6, west - args.ponton
    for x in range(xs, xe):
        ile.pontoon_slice(w, x, x - xs)
    ile.bridge_pillars(w, xe - 1)
    origin = (xs, G, 0)
    interior = w.copy()

    w = rotate(w)
    ile.connect_pass(w)
    o = (origin[2], origin[1], -origin[0])
    info = ile.export(w, OUT / "grotte-forge.schem", o)
    print(f"grotte-forge   {info['size'][0]}×{info['size'][1]}×{info['size'][2]}  blocs={info['blocks']}  "
          f"palette={info['palette']}  offset={info['offset']}  ponton={xe - xs} blocs")

    if args.no_preview:
        return
    ile.render_iso(w.b, OUT / "apercu-isometrique.png", scale=6)
    # Coupe : on retire la butte au-dessus de la grotte pour voir l'intérieur (après rotation, x = -Z, z = X)
    cutaway = {k: v for k, v in w.b.items()
               if not (k[1] > FL + 3 and (k[2] / CA) ** 2 + (k[0] / CB) ** 2 <= 1.9)}
    ile.render_iso(cutaway, OUT / "apercu-interieur.png", scale=9)
    labels = [(tx, tz, label.replace("Niveaux ", "niv. ").replace("Niveau ", "niv. ")) for tx, tz, _, label in TABLES]
    labels += [(-8, -4, "FORGE"), (0, -9, "lave"), (x_out + 2, -5, "entrée")]
    ile.render_plan(w.b, OUT / "plan-grotte.png", [], FL + 2, scale=9,
                    labels=[(z, -x, t) for x, z, t in labels],
                    caption="Plan de la grotte (coupe au sol) — nord en haut, le ponton part vers le sud")
    if args.spawn:
        meta, sp = ile.read_schem(args.spawn)
        so = (-meta["WEOffsetX"], -meta["WEOffsetY"], -meta["WEOffsetZ"])
        both = dict(sp)
        com = OUT.parent / "ile-commerciale" / "ile-commerciale-complete.schem"
        if com.exists():
            cm, cb = ile.read_schem(com)
            ox = so[0] + ile.SPAWN_EAST_EDGE + 1 + cm["WEOffsetX"]
            oy, oz = so[1] + cm["WEOffsetY"], so[2] + cm["WEOffsetZ"]
            both.update({(x + ox, y + oy, z + oz): s for (x, y, z), s in cb.items()})
        dx, dy, dz = (so[i] + SPAWN_ATTACH[i] - o[i] for i in range(3))
        both.update({(x + dx, y + dy, z + dz): s for (x, y, z), s in w.b.items()})
        ile.render_iso(both, OUT / "apercu-avec-spawn.png", scale=2)
        ile.render_plan(both, OUT / "plan-avec-spawn.png", [], so[1] + 12, scale=2,
                        caption=f"Assemblage : bout libre du ponton à X+{SPAWN_ATTACH[0]}, Z{SPAWN_ATTACH[2]} "
                                f"du point de collage du spawn, même hauteur")


if __name__ == "__main__":
    main()
