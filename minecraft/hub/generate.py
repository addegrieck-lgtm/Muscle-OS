#!/usr/bin/env python3
"""
Hub de VÆLORIA : île flottante circulaire, dans l'identité visuelle du spawn et de l'Île Marchande
(pale moss, tuff, rocher deepslate/blackstone, briques de blackstone polie, pale oak, accents rubis).

- Place centrale : blason en V incrusté au sol (point d'apparition), sous un cristal rubis flottant
  entouré d'un anneau et de 4 piliers.
- 4 allées vers 4 portails en forme d'écusson : FACTION (nord), MARCHÉ (est, direction de l'Île Marchande),
  ÉVÉNEMENTS (sud), ARÈNE PVP (ouest). Devant chaque portail, 2 socles pour PNJ / hologrammes.
- Jardins de pale oaks, lampadaires, bancs, garde-corps sur tout le pourtour, îlots flottants autour.

Sortie : hub-vaeloria.schem (Sponge v2, Minecraft 1.21.4), origine = centre du blason, pieds du joueur.
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
import generate as ile  # noqa: E402  (outils communs : World, export, aperçus, rocher, arbres)

from generate import (  # noqa: E402
    BRICK, CHISEL, DSLATE, PBLACK, RED, TILES, World, base, connect_pass, export, floating_rock, h2,
    render_iso, render_plan, rock_depth,
)

G = ile.G  # 44 : niveau du sol
R = 52  # rayon de l'île
DEPTH = 46
PLAZA = 21  # rayon de la place centrale
PORTAL = 41  # distance du centre à la face avant des portails
PATH_HALF = 3  # demi-largeur des allées (7 blocs)

ile.COLORS.update({
    "crying_obsidian": (40, 10, 60), "red_nether_brick_wall": (70, 7, 9), "red_nether_brick_slab": (70, 7, 9),
    "polished_blackstone_slab": (53, 48, 56), "polished_blackstone_stairs": (53, 48, 56),
    "pale_oak_wall_sign": (227, 217, 216), "red_carpet": (160, 39, 34), "black_carpet": (20, 21, 25),
})

# Les 4 portails : (nom, direction unitaire (dx, dz), lignes du panneau)
PORTALS = [
    ("Faction", (0, -1), "north", "south", ["FACTION", "Le monde", "Saison I"]),
    ("Marché", (1, 0), "east", "west", ["MARCHÉ", "Île Marchande", "Boutiques"]),
    ("Événements", (0, 1), "south", "north", ["ÉVÉNEMENTS", "KOTH · Totem", "Avant-postes"]),
    ("Arène PvP", (-1, 0), "west", "east", ["ARÈNE", "PvP 1.8", "Duels"]),
]


def edge_r(x: float, z: float) -> float:
    t = math.atan2(z, x)
    return R * (1 + 0.035 * math.sin(3 * t + 0.4) + 0.025 * math.sin(7 * t + 1.9))


def isl_d(x: float, z: float) -> float:
    return math.hypot(x, z) / edge_r(x, z)


def to_world(axis: int, perp: int, d: tuple[int, int]) -> tuple[int, int]:
    """Coordonnées (x, z) à partir de la distance le long d'une allée et du décalage latéral."""
    dx, dz = d
    return axis * dx - perp * dz, axis * dz + perp * dx


RESERVED: set[tuple[int, int]] = set()


# --------------------------------------------------------------------------- île


def build_island(w: World) -> None:
    for x in range(-R - 6, R + 7):
        for z in range(-R - 6, R + 7):
            d = isl_d(x, z)
            if d > 1.0:
                continue
            depth = 4 + int(rock_depth(d) * (DEPTH - 4) * (0.9 + 0.2 * h2(x // 3, z // 3, 9)))
            floating_rock(w, x, z, G - 4, depth - 4, d)
            w.fill(x, G - 3, z, x, G - 1, z, "tuff")
            w.set(x, G, z, "pale_moss_block")


def islet(w: World, cx: int, cz: int, top: int, r: float, tree: bool) -> None:
    """Petit îlot flottant (même rocher en cône que le spawn), avec un pale oak."""
    for x in range(cx - int(r) - 2, cx + int(r) + 3):
        for z in range(cz - int(r) - 2, cz + int(r) + 3):
            d = math.hypot(x - cx, z - cz) / (r * (1 + 0.12 * math.sin(3 * math.atan2(z - cz, x - cx) + cx)))
            if d > 1:
                continue
            depth = 2 + int(rock_depth(d) * r * 2.2)
            for y in range(top - depth, top - 1):
                w.set(x, y, z, ile.rock(x, y + (G - top), z))
            w.set(x, top - 1, z, "tuff")
            w.set(x, top, z, "pale_moss_block")
            if d < 0.85 and h2(x, z, 77) < 0.18 and not (tree and abs(x - cx) < 3 and abs(z - cz) < 3):
                w.set(x, top + 1, z, "pale_moss_carpet" if h2(x, z, 78) < 0.7 else "red_tulip")
    if tree:
        ile.pale_tree(w, cx, cz, top + 1, 4)


# --------------------------------------------------------------------------- place centrale


def emblem(x: int, z: int) -> str | None:
    """Grand blason en V (lu depuis le sud, pointe vers le sud), losange rubis au cœur."""
    if abs(x) + abs(z + 1) <= 1:
        return "redstone_block"
    if abs(x) + abs(z + 1) <= 2:
        return "red_concrete"
    if -7 <= z <= 7:
        # deux branches : de (±6, -7) vers (0, 7)
        t = (z + 7) / 14
        cx = 6 * (1 - t)
        if abs(abs(x) - cx) <= 1.3:
            return "black_concrete"
        if abs(abs(x) - cx) <= 2.1:
            return PBLACK
    return None


def build_plaza(w: World) -> None:
    for x in range(-PLAZA - 1, PLAZA + 2):
        for z in range(-PLAZA - 1, PLAZA + 2):
            d = math.hypot(x, z)
            if d > PLAZA + 0.5:
                continue
            if d <= 10.5:
                s = emblem(x, z) or "calcite"
            elif d <= 11.5:
                s = RED
            elif d <= 12.5:
                s = BRICK
            elif d <= PLAZA - 1.5:
                sector = int((math.atan2(z, x) + math.pi) / (2 * math.pi) * 24)
                s = TILES if sector % 2 else DSLATE
                if 16.2 <= d <= 17.2:
                    s = RED
            elif d <= PLAZA - 0.5:
                s = DSLATE
            else:
                s = BRICK
            w.set(x, G, z, s)
            for y in (G + 1, G + 2):
                w.set(x, y, z, None)
            RESERVED.add((x, z))
    w.set(0, G - 1, 0, "redstone_block")  # le cœur du losange brille par-dessous aussi

    # 4 piliers en diagonale
    for sx in (-1, 1):
        for sz in (-1, 1):
            pillar(w, 14 * sx, 14 * sz, sx, sz)

    # Cristal rubis flottant (octaèdre, comme le losange du logo), cœur lumineux
    cy = G + 22
    for x in range(-5, 6):
        for z in range(-5, 6):
            for y in range(-9, 10):
                v = abs(x) / 4.6 + abs(z) / 4.6 + abs(y) / 9.2
                if v <= 1:
                    inner = abs(x) / 4.6 + abs(z) / 4.6 + abs(y) / 9.2 <= 0.62
                    w.set(x, cy + y, z, ("shroomlight" if abs(y) <= 1 and abs(x) + abs(z) <= 1 else "redstone_block")
                          if inner else "red_stained_glass")
    # Anneau suspendu autour du cristal
    for x in range(-9, 10):
        for z in range(-9, 10):
            d = math.hypot(x, z)
            if 7.5 <= d <= 8.5:
                w.set(x, cy, z, BRICK)
                ang = math.degrees(math.atan2(z, x)) % 45
                if ang < 4 or ang > 41:
                    w.set(x, cy + 1, z, "end_rod[facing=up]")
                    w.set(x, cy - 1, z, "chain[axis=y]")
                    w.set(x, cy - 2, z, "lantern[hanging=true]")
    # Pointe basse : chaîne + lanterne au-dessus du point d'apparition
    for y in range(cy - 12, cy - 9):
        w.set(0, y, 0, "chain[axis=y]")
    w.set(0, cy - 13, 0, "lantern[hanging=true]")


def pillar(w: World, px: int, pz: int, sx: int, sz: int) -> None:
    for x in range(px - 2, px + 3):
        for z in range(pz - 2, pz + 3):
            w.set(x, G + 1, z, PBLACK)
    w.fill(px - 1, G + 2, pz - 1, px + 1, G + 17, pz + 1, BRICK)
    for y in (G + 2, G + 7, G + 12, G + 17):
        w.fill(px - 1, y, pz - 1, px + 1, y, pz + 1, CHISEL)
    # filet rubis sur les faces tournées vers la place
    for y in range(G + 3, G + 17):
        if y not in (G + 7, G + 12):
            w.set(px - sx, y, pz, "red_stained_glass")
            w.set(px, y, pz - sz, "red_stained_glass")
    for x in range(px - 2, px + 3):
        for z in range(pz - 2, pz + 3):
            w.set(x, G + 18, z, "polished_blackstone_slab[type=bottom]" if max(abs(x - px), abs(z - pz)) == 2 else PBLACK)
    # petit cristal au sommet
    for y, r in ((G + 19, 1), (G + 20, 1), (G + 21, 0)):
        for x in range(px - r, px + r + 1):
            for z in range(pz - r, pz + r + 1):
                if abs(x - px) + abs(z - pz) <= r:
                    w.set(x, y, z, "red_stained_glass")
    w.set(px, G + 19, pz, "shroomlight")
    for dx, dz in ((2, 2), (2, -2), (-2, 2), (-2, -2)):
        w.set(px + dx, G + 19, pz + dz, "lantern[hanging=false]")
    for x in range(px - 2, px + 3):
        for z in range(pz - 2, pz + 3):
            RESERVED.add((x, z))


# --------------------------------------------------------------------------- allées et portails


def lamp(w: World, x: int, z: int, h: int = 3) -> None:
    for y in range(G + 1, G + 1 + h):
        w.set(x, y, z, "polished_blackstone_wall[up=true]")
    w.set(x, G + 1 + h, z, "lantern[hanging=false]")
    RESERVED.add((x, z))


def build_paths(w: World) -> None:
    for _, d, *_ in PORTALS:
        for a in range(PLAZA - 1, PORTAL + 4):
            for p in range(-PATH_HALF - 1, PATH_HALF + 2):
                x, z = to_world(a, p, d)
                if math.hypot(x, z) <= PLAZA + 0.5:
                    continue
                edge = abs(p) == PATH_HALF
                s = DSLATE if edge else (RED if p == 0 and a % 4 == 0 else TILES)
                if abs(p) == PATH_HALF + 1:
                    s = BRICK
                w.set(x, G, z, s)
                RESERVED.add((x, z))
        for a in range(PLAZA + 4, PORTAL - 2, 6):
            for p in (-PATH_HALF - 2, PATH_HALF + 2):
                lamp(w, *to_world(a, p, d))
        # bancs (marches en pale oak) entre les lampadaires, tournés vers l'allée
        for a in (PLAZA + 7, PLAZA + 13):
            for p, face_p in ((-PATH_HALF - 2, 1), (PATH_HALF + 2, -1)):
                fx, fz = to_world(0, face_p, d)
                facing = {(1, 0): "west", (-1, 0): "east", (0, 1): "north", (0, -1): "south"}[(fx, fz)]
                for k in (0, 1):
                    x, z = to_world(a + k, p, d)
                    w.set(x, G + 1, z, f"pale_oak_stairs[facing={facing}]")
                    RESERVED.add((x, z))


def build_portal(w: World, d: tuple[int, int], toward: str, lines: list[str]) -> None:
    """Portail en forme d'écusson : couronne à pointe, ouverture en ogive, liseré rubis."""
    for a in range(PORTAL, PORTAL + 3):
        for p in range(-6, 7):
            outer = G + 14 - max(0, abs(p) - 2)  # haut du cadre (écusson)
            if abs(p) == 6:
                outer = G + 9
            for y in range(G + 1, outer + 1):
                x, z = to_world(a, p, d)
                open_top = G + 8 + max(0, 3 - abs(p))  # ogive : 9 à 11 blocs
                if abs(p) <= 3 and y <= open_top:
                    w.set(x, y, z, None)
                    continue
                inner_edge = abs(p) <= 4 and y <= open_top + 1
                if a == PORTAL + 1 and inner_edge:
                    s = RED
                elif y in (G + 1, outer) or abs(p) == 6:
                    s = CHISEL
                else:
                    s = BRICK
                w.set(x, y, z, s)
            x, z = to_world(a, p, d)
            RESERVED.add((x, z))
        # couronne : pointe centrale + deux crans, comme le haut du blason
        for p, h in ((0, 3), (-3, 1), (3, 1)):
            x, z = to_world(a, p, d)
            top = G + 14 - max(0, abs(p) - 2)
            for y in range(top + 1, top + h + 1):
                w.set(x, y, z, CHISEL if a != PORTAL + 1 else RED)
    # sol du passage : obsidienne pleureuse encadrée de rubis (zone de téléportation)
    for a in range(PORTAL, PORTAL + 3):
        for p in range(-3, 4):
            x, z = to_world(a, p, d)
            w.set(x, G, z, "crying_obsidian" if abs(p) <= 2 else RED)
    # cristal au sommet de la pointe
    x, z = to_world(PORTAL + 1, 0, d)
    w.set(x, G + 18, z, "red_stained_glass")
    w.set(x, G + 19, z, "end_rod[facing=up]")
    # panneau au-dessus de l'ogive, côté place
    x, z = to_world(PORTAL - 1, 0, d)
    w.sign(x, G + 12, z, f"pale_oak_wall_sign[facing={toward}]",
           ['{"text":"◆ VÆLORIA ◆","color":"dark_red"}', '{"text":"' + lines[0] + '","bold":true}',
            '{"text":"' + lines[1] + '"}', '{"text":"' + lines[2] + '","color":"dark_gray"}'])
    # 2 socles pour PNJ / hologrammes, de part et d'autre de l'entrée
    for p in (-6, 6):
        for da in range(-1, 2):
            for dp in range(-1, 2):
                x, z = to_world(PORTAL - 3 + da, p + dp, d)
                w.set(x, G, z, BRICK)
                w.set(x, G + 1, z, CHISEL if (da, dp) == (0, 0) else "polished_blackstone_slab[type=bottom]")
                RESERVED.add((x, z))
        x, z = to_world(PORTAL - 3, p, d)
        w.set(x, G + 2, z, "red_carpet")
    # arrière : rambarde derrière le passage
    for p in range(-3, 4):
        x, z = to_world(PORTAL + 3, p, d)
        w.set(x, G, z, BRICK)
        w.set(x, G + 1, z, "polished_blackstone_brick_wall[up=true]")
        RESERVED.add((x, z))


# --------------------------------------------------------------------------- jardins, bord


def build_promenade(w: World) -> None:
    """Promenade circulaire qui relie les 4 allées, à mi-chemin entre la place et les portails."""
    for x in range(-36, 37):
        for z in range(-36, 37):
            d = math.hypot(x, z)
            if 31.5 <= d <= 35.5 and (x, z) not in RESERVED:
                w.set(x, G, z, BRICK if d < 32.3 or d > 34.7 else TILES)
                RESERVED.add((x, z))
    for k in range(16):
        a = (k + 0.5) * math.pi / 8
        if k % 2 == 0:
            x, z = round(math.cos(a) * 37), round(math.sin(a) * 37)
            lamp(w, x, z)


def build_gardens(w: World) -> None:
    trees = []
    for i in range(400):
        ang, rr = h2(i, 1, 90) * 2 * math.pi, 25 + h2(i, 2, 91) * 22
        x, z = round(math.cos(ang) * rr), round(math.sin(ang) * rr)
        if isl_d(x, z) > 0.86 or min(abs(x), abs(z)) < PATH_HALF + 6:
            continue
        if any((x - tx) ** 2 + (z - tz) ** 2 < 64 for tx, tz in trees):
            continue
        if any((x + dx, z + dz) in RESERVED for dx in range(-3, 4) for dz in range(-3, 4)):
            continue
        trees.append((x, z))
        if len(trees) >= 22:
            break
    for x, z in trees:
        ile.pale_tree(w, x, z, G + 1, 5 + int(h2(x, z, 92) * 2))
    for x in range(-R - 6, R + 7):
        for z in range(-R - 6, R + 7):
            if w.get(x, G, z) != "pale_moss_block" or (x, z) in RESERVED or w.get(x, G + 1, z):
                continue
            v = h2(x, z, 93)
            if v < 0.22:
                w.set(x, G + 1, z, "pale_moss_carpet")
            elif v < 0.232:
                w.set(x, G + 1, z, "red_tulip")
            elif v < 0.237:
                w.set(x, G + 1, z, "poppy")


def build_rim(w: World) -> None:
    """Garde-corps sur le pourtour : muret en briques, poteaux à lanterne tous les ~9 blocs."""
    edge = []
    for (x, y, z), s in list(w.b.items()):
        if y != G or isl_d(x, z) > 1:
            continue
        if any(w.get(x + dx, G, z + dz) is None for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            edge.append((x, z))
    edge.sort(key=lambda p: math.atan2(p[1], p[0]))
    for i, (x, z) in enumerate(edge):
        top = w.get(x, G + 1, z)
        if top and base(top) not in ile.PLANTS:
            continue
        if i % 9 == 0:
            w.set(x, G + 1, z, "polished_blackstone_wall[up=true]")
            w.set(x, G + 2, z, "lantern[hanging=false]")
        else:
            w.set(x, G + 1, z, "polished_blackstone_brick_wall[up=true]")
        w.set(x, G, z, BRICK)


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
        straight = (props["north"] == props["south"] != "none" and props["east"] == props["west"] == "none") or \
                   (props["east"] == props["west"] != "none" and props["north"] == props["south"] == "none")
        up = "true" if (not straight or w.get(x, y + 1, z)) else "false"
        w.b[(x, y, z)] = n + "[" + ",".join(f"{k}={v}" for k, v in sorted(props.items())) + f",up={up}]"


# --------------------------------------------------------------------------- main


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-preview", action="store_true")
    args = ap.parse_args()

    w = World()
    build_island(w)
    build_plaza(w)
    build_paths(w)
    for _, d, _, toward, lines in PORTALS:
        build_portal(w, d, toward, lines)
    build_promenade(w)
    build_gardens(w)
    build_rim(w)
    for i, (ang, rr, dy, r) in enumerate([(25, 68, 6, 6), (100, 72, -8, 7.5), (160, 66, 10, 5),
                                          (215, 74, -4, 8), (290, 69, 4, 6.5), (335, 76, -10, 5)]):
        a = math.radians(ang)
        islet(w, round(math.cos(a) * rr), round(math.sin(a) * rr), G + dy, r, tree=i % 2 == 0)
    connect_pass(w)
    connect_walls(w)

    info = export(w, HERE / "hub-vaeloria.schem", (0, G + 1, 0))
    print(f"hub {info['size'][0]}×{info['size'][1]}×{info['size'][2]}  blocs={info['blocks']}  "
          f"palette={info['palette']}  offset={info['offset']}")

    if not args.no_preview:
        render_iso(w.b, HERE / "apercu-isometrique.png", scale=4)
        centre = {p: b for p, b in w.b.items() if abs(p[0]) <= 46 and abs(p[2]) <= 46 and p[1] >= G - 2}
        render_iso(centre, HERE / "apercu-centre.png", scale=9)
        labels = [(0, -PORTAL - 8, "FACTION"), (PORTAL + 9, 0, "MARCHÉ"), (0, PORTAL + 8, "ÉVÉNEMENTS"),
                  (-PORTAL - 9, 0, "ARÈNE PVP"), (0, 0, "SPAWN")]
        render_plan(w.b, HERE / "plan.png", [], G + 3, scale=6, labels=labels,
                    caption="Hub VÆLORIA — vue de dessus, nord en haut. Origine du collage : centre du blason (spawn).")


if __name__ == "__main__":
    main()
