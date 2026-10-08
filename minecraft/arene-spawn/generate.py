#!/usr/bin/env python3
"""
Arène de bots du spawn VÆLORIA : île flottante avec une fosse de combat circulaire, des gradins tout autour
et un ponton vers le spawn, dans l'identité visuelle du spawn (mêmes blocs et mêmes outils que l'Île Marchande).

Pensée pour le plugin VæloriaArena (combats de bots P4 U3 et paris) :
  - fosse de 41 blocs de diamètre, 5 blocs sous le niveau des spectateurs : les bots ne peuvent pas en sortir ;
  - côté ouest aux couleurs de Rouge, côté est aux couleurs de Bleu, comme les lignes d'apparition du plugin ;
  - entrée à l'est, dans l'axe du ponton, avec le panneau des paris.

Génère (format Sponge v2, Minecraft 1.21.4) :
  - arene-spawn-complete.schem : île + ponton (origine = bout libre du ponton, à raccorder au spawn)
  - arene-spawn-seule.schem    : île seule (origine = bord est de l'île, là où arrive le ponton)
  - arene.json                 : centre de la fosse et rayon à donner au plugin, relatifs aux origines
ainsi que des aperçus (Pillow).

    python3 generate.py [--ponton 40] [--no-preview]
Axes : X vers l'est, Z vers le sud. Le ponton part de l'île vers l'est, c'est-à-dire vers le spawn :
l'arène se place à l'ouest du spawn, en face de l'Île Marchande.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import math
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # pas de __pycache__ dans ile-commerciale/
OUT = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("ile", OUT.parent / "ile-commerciale" / "generate.py")
ile = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ile)

World, G, h2 = ile.World, ile.G, ile.h2
BRICK, PBLACK, CHISEL, DSLATE, TILES, RED = ile.BRICK, ile.PBLACK, ile.CHISEL, ile.DSLATE, ile.TILES, ile.RED
BWALL = "polished_blackstone_brick_wall"

R_ISLAND = 40      # rayon de l'île
DEPTH = 40         # profondeur max. du rocher sous l'île
P = G - 5          # sol de la fosse (5 blocs sous les spectateurs)
R_PIT = 20         # rayon du sol de la fosse
R_RAIL = 21.5      # mur de la fosse, garde-corps au-dessus
R_WALK = 24        # promenade au niveau du spawn
TIERS = 4          # gradins de 2 blocs de profondeur, +1 bloc de hauteur chacun
R_BACK = R_WALK + 2 * TIERS  # mur du fond des gradins
R_BACK_OUT = R_BACK + 1.5
PLUGIN_RADIUS = 18  # cercle donné au plugin : les bots restent à 2 blocs du mur
AISLE = 2          # demi-largeur de l'entrée est (5 blocs, comme le ponton)

TEAM = {  # côté ouest = Rouge (x < 0), côté est = Bleu, comme les lignes d'apparition du plugin
    "rouge": {"concrete": "red_concrete", "glazed": "red_glazed_terracotta", "banner": "red_wall_banner",
              "glass": "red_stained_glass"},
    "bleu": {"concrete": "blue_concrete", "glazed": "blue_glazed_terracotta", "banner": "blue_wall_banner",
             "glass": "blue_stained_glass"},
}


def side(x: float) -> dict:
    return TEAM["rouge"] if x < 0 else TEAM["bleu"]


def outward(x: int, z: int) -> str:
    """Direction cardinale qui s'éloigne du centre (dos des sièges, face des bannières vers le centre = inverse)."""
    if abs(x) >= abs(z):
        return "east" if x > 0 else "west"
    return "south" if z > 0 else "north"


INWARD = {"east": "west", "west": "east", "north": "south", "south": "north"}


def in_aisle(x: int, z: int) -> bool:
    return x > 0 and abs(z) <= AISLE


# --------------------------------------------------------------------------- île


def build_island(w: World) -> None:
    for x in range(-R_ISLAND - 2, R_ISLAND + 3):
        for z in range(-R_ISLAND - 2, R_ISLAND + 3):
            t = math.atan2(z, x)
            r = R_ISLAND * (1 + 0.04 * math.sin(3 * t + 0.4) + 0.025 * math.sin(7 * t + 1.3))
            d = math.hypot(x, z) / r
            if d > 1.0:
                continue
            depth = 4 + int(ile.rock_depth(d) * (DEPTH - 4) * (0.9 + 0.2 * h2(x // 3, z // 3, 9)))
            ile.floating_rock(w, x, z, G - 4, depth - 4, d)
            w.fill(x, G - 3, z, x, G - 1, z, "tuff")
            w.set(x, G, z, "pale_moss_block")
            if d > 0.86 and h2(x, z, 70) < 0.35:
                w.set(x, G + 1, z, "pale_moss_carpet")
            elif d > 0.86 and h2(x, z, 71) < 0.05:
                w.set(x, G + 1, z, "red_tulip" if h2(x, z, 72) < 0.5 else "poppy")


# --------------------------------------------------------------------------- fosse de combat

# Blason en V du spawn au centre de la fosse (le même qu'au sol de la rotonde de l'Île Marchande)
def emblem(w: World, y: int) -> None:
    for i, row in enumerate(ile.EMBLEM):
        for j, c in enumerate(row):
            if c != ".":
                w.set(j - 5, y, i - 5, ile.EMBLEM_KEY[c])


def build_pit(w: World) -> None:
    for x in range(-R_PIT - 2, R_PIT + 3):
        for z in range(-R_PIT - 2, R_PIT + 3):
            d = math.hypot(x, z)
            if d > R_RAIL:
                continue
            for y in range(P + 1, G + 3):
                w.set(x, y, z, None)
            if d <= R_PIT:  # sol : tuff, anneau rouge, bordure en polished deepslate
                floor = "tuff" if d <= 15.5 else RED if d <= 16.5 else "polished_tuff" if d <= 18.5 else DSLATE
                w.set(x, P, z, floor)
                w.set(x, P - 1, z, "tuff")
            else:  # mur de la fosse : 5 blocs, bandeau aux couleurs de l'équipe du côté
                w.set(x, P, z, BRICK)
                for y in range(P + 1, G + 1):
                    w.set(x, y, z, BRICK)
                w.set(x, P + 3, z, side(x)["concrete"] if abs(x) > 3 else RED)
                w.set(x, G, z, CHISEL if (int(math.degrees(math.atan2(z, x))) % 15) == 0 else PBLACK)
    emblem(w, P)
    # Lignes d'apparition des équipes (x = ±8 dans le plugin, séparation 16) : losanges de couleur
    for sx in (-1, 1):
        for z in range(-9, 10, 3):
            w.set(sx * 8, P, z, side(sx)["glazed"])
    # Éclairage invisible au-dessus de la fosse (pas de mobs naturels, combat lisible la nuit)
    for x in range(-R_PIT + 2, R_PIT - 1, 7):
        for z in range(-R_PIT + 2, R_PIT - 1, 7):
            if math.hypot(x, z) <= R_PIT - 2:
                w.set(x, P + 6, z, "light[level=15]")


# --------------------------------------------------------------------------- tribunes


def build_stands(w: World) -> None:
    for x in range(-int(R_BACK_OUT) - 2, int(R_BACK_OUT) + 3):
        for z in range(-int(R_BACK_OUT) - 2, int(R_BACK_OUT) + 3):
            d = math.hypot(x, z)
            if d <= R_RAIL or d > R_BACK_OUT:
                continue
            if d <= R_WALK:  # promenade : cœur en deepslate tiles, bordures en polished deepslate
                w.set(x, G, z, DSLATE if d <= R_RAIL + 1 or d > R_WALK - 1 else TILES)
                w.set(x, G + 1, z, None)
                continue
            if in_aisle(x, z):  # entrée est : allée au niveau de la promenade, à travers les gradins
                w.set(x, G, z, DSLATE if abs(z) == AISLE else TILES)
                for y in range(G + 1, G + 9):
                    w.set(x, y, z, None)
                continue
            if d <= R_BACK:  # gradins : sièges en escalier pale oak sur la rangée intérieure
                k = min(TIERS, int((d - R_WALK) / 2) + 1)
                for y in range(G, G + k):
                    w.set(x, y, z, BRICK)
                front = (d - R_WALK) % 2 < 1
                w.set(x, G + k, z, ile.stairs(outward(x, z)) if front else "pale_oak_planks")
                continue
            # mur du fond, avec créneaux
            top = G + TIERS + 5
            for y in range(G, top + 1):
                w.set(x, y, z, BRICK)
            ang = math.degrees(math.atan2(z, x)) % 360
            if int(ang / 4) % 2 == 0:
                w.set(x, top + 1, z, f"{BWALL}[up=true]")
    rail_and_dressing(w)


def rail_and_dressing(w: World) -> None:
    # Garde-corps : muret continu au bord de la fosse, lanternes tous les 30°
    for x in range(-23, 24):
        for z in range(-23, 24):
            d = math.hypot(x, z)
            if R_RAIL - 1 < d <= R_RAIL:
                w.set(x, G + 1, z, f"{BWALL}[up=true]")
    for a in range(0, 360, 30):
        x, z = round(math.cos(math.radians(a)) * (R_RAIL - 0.5)), round(math.sin(math.radians(a)) * (R_RAIL - 0.5))
        if w.get(x, G + 1, z):
            w.set(x, G + 2, z, "lantern[hanging=false]")
    # Bannières des équipes face au centre, lanternes en haut du mur du fond
    for a in range(5, 360, 10):
        rad = math.radians(a)
        x, z = round(math.cos(rad) * (R_BACK + 0.6)), round(math.sin(rad) * (R_BACK + 0.6))
        inner_x, inner_z = round(math.cos(rad) * (R_BACK - 0.4)), round(math.sin(rad) * (R_BACK - 0.4))
        if in_aisle(inner_x, inner_z) or in_aisle(x, z) or base_of(w.get(x, G + TIERS + 3, z)) != BRICK:
            continue
        face = INWARD[outward(x, z)]
        if w.get(inner_x, G + TIERS + 3, inner_z) is None:
            w.set(inner_x, G + TIERS + 3, inner_z, f"{side(x)['banner']}[facing={face}]")
        if a % 30 == 5:
            w.set(x, G + TIERS + 6, z, "lantern[hanging=false]")
    connect_walls(w)


def base_of(s: str | None) -> str:
    return ile.base(s) if s else ""


def connect_walls(w: World) -> None:
    """Murets en continu (WorldEdit ne recalcule pas les connexions des murs au collage)."""
    dirs = {"north": (0, -1), "south": (0, 1), "east": (1, 0), "west": (-1, 0)}
    for (x, y, z), s in list(w.b.items()):
        if base_of(s) != BWALL:
            continue
        props = {}
        for dname, (dx, dz) in dirs.items():
            o = w.get(x + dx, y, z + dz)
            props[dname] = "low" if o and (base_of(o) == BWALL or ile.is_full(o)) else "none"
        straight = (props["north"] == props["south"] != "none" and props["east"] == props["west"] == "none") or \
                   (props["east"] == props["west"] != "none" and props["north"] == props["south"] == "none")
        above = w.get(x, y + 1, z)
        props["up"] = "false" if straight and not above else "true"
        w.b[(x, y, z)] = BWALL + "[" + ",".join(f"{k}={v}" for k, v in sorted(props.items())) + "]"


# --------------------------------------------------------------------------- entrée, panneau des paris, abords


def build_entrance(w: World, edge_x: int) -> None:
    gate = int(math.sqrt(R_BACK_OUT ** 2 - AISLE ** 2))
    # Porche : piliers, linteau ciselé, verre aux couleurs des deux équipes
    for z in (-AISLE - 1, AISLE + 1):
        for x in range(gate - 1, gate + 2):
            w.fill(x, G + 1, z, x, G + TIERS + 6, z, BRICK)
        w.set(gate, G + TIERS + 7, z, CHISEL)
        w.set(gate, G + TIERS + 8, z, "lantern[hanging=false]")
    for z in range(-AISLE, AISLE + 1):
        for x in range(gate - 1, gate + 2):
            w.set(x, G + TIERS + 6, z, BRICK)
        w.set(gate, G + TIERS + 5, z, "red_stained_glass" if z < 0 else "blue_stained_glass" if z > 0 else CHISEL)
    w.set(gate, G + TIERS + 4, 0, "lantern[hanging=true]")
    # Allée de l'entrée jusqu'au bord de l'île
    for x in range(gate + 2, edge_x + 1):
        for z in range(-AISLE - 1, AISLE + 2):
            if w.get(x, G, z) is None:
                continue
            w.set(x, G, z, DSLATE if abs(z) >= AISLE else TILES)
            w.set(x, G + 1, z, None)
    for x in (gate + 4, edge_x - 4):
        for z in (-AISLE - 2, AISLE + 2):
            ile.lamp_post(w, x, z, 3)
    # Panneau des paris : mur de briques avec blason, à gauche (nord) de l'entrée
    bx, bz = gate + 7, -AISLE - 3
    for x in range(bx - 2, bx + 3):
        w.fill(x, G + 1, bz, x, G + 4, bz, BRICK)
        w.set(x, G + 5, bz, "polished_blackstone_brick_slab[type=bottom]")
    w.set(bx, G + 4, bz, RED)
    w.sign(bx - 1, G + 3, bz + 1, "pale_oak_wall_sign[facing=south]",
           ['{"text":"VÆLORIA","color":"dark_red"}', '{"text":"ARÈNE","bold":true}',
            '{"text":"Bots P4 U3"}', '{"text":"Hache Sharpness V","color":"dark_gray"}'])
    w.sign(bx, G + 2, bz + 1, "pale_oak_wall_sign[facing=south]",
           ['{"text":"PARIS","bold":true,"color":"gold"}', '{"text":"/pari rouge <mise>","color":"dark_red"}',
            '{"text":"/pari bleu <mise>","color":"dark_blue"}', '{"text":"avant chaque combat"}'])
    w.sign(bx + 1, G + 3, bz + 1, "pale_oak_wall_sign[facing=south]",
           ['{"text":"Les gagnants"}', '{"text":"se partagent"}', '{"text":"la mise"}', '{"text":"des perdants"}'])
    # Petits pale oaks autour de l'arène, hors de l'entrée
    for a in range(20, 360, 40):
        if a in (340, 20):
            continue
        rad = math.radians(a)
        rr = (R_BACK_OUT + R_ISLAND) / 2 + 0.5
        ile.pale_tree(w, round(math.cos(rad) * rr), round(math.sin(rad) * rr))


# --------------------------------------------------------------------------- main


def render_plan(blocks: dict, path: Path, ymax: int, scale: int, caption: str) -> None:
    ile.render_plan(blocks, path, [], ymax, scale=scale, caption=caption)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ponton", type=int, default=40, help="longueur du ponton dans le vide, en blocs (défaut 40)")
    ap.add_argument("--no-preview", action="store_true")
    args = ap.parse_args()

    w = World()
    build_island(w)
    edge_x = max(x for (x, y, z) in w.b if z == 0 and y == G)  # bord est de l'île, sur l'axe
    build_pit(w)
    build_stands(w)
    build_entrance(w, edge_x)
    island = w.copy()

    # Ponton vers l'est (le spawn) : du bord de l'île jusqu'au bout libre, avec l'îlot de repos à mi-chemin
    xs, xe = edge_x + 1, edge_x + 1 + args.ponton
    ile.build_pontoon(w, xs, xe)
    for ww in (w, island):
        ile.bridge_pillars(ww, edge_x)
        ile.connect_pass(ww)
    free_end = xe - 1

    origin_full = (free_end, G, 0)  # plancher du bout libre du ponton
    origin_island = (edge_x, G, 0)  # plancher au bord est de l'île
    info_full = ile.export(w, OUT / "arene-spawn-complete.schem", origin_full)
    info_island = ile.export(island, OUT / "arene-spawn-seule.schem", origin_island)

    center = (0, P + 1, 0)  # bloc où se tient un joueur au centre de la fosse
    rel = lambda o: [center[i] - o[i] for i in range(3)]
    meta = {
        "plugin": "VaeloriaArena",
        "rayon_plugin": PLUGIN_RADIUS,
        "centre_depuis_bout_du_ponton": rel(origin_full),
        "centre_depuis_bord_de_l_ile": rel(origin_island),
        "fosse": {"rayon": R_PIT, "profondeur": G - P},
        "gradins": {"rangs": TIERS, "rayon_exterieur": R_BACK},
        "equipes": {"rouge": "ouest (x négatif)", "bleu": "est (x positif)"},
    }
    (OUT / "arene.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    if not args.no_preview:
        ile.COLORS.update({"red_concrete": (142, 33, 33), "blue_concrete": (45, 47, 143),
                           "red_glazed_terracotta": (182, 60, 53), "blue_glazed_terracotta": (47, 65, 139),
                           "red_stained_glass": (153, 51, 51), "blue_stained_glass": (51, 76, 178),
                           "red_wall_banner": (160, 39, 34), "blue_wall_banner": (53, 57, 157)})
        ile.render_iso(w.b, OUT / "apercu-isometrique.png", scale=4)
        render_plan(island.b, OUT / "plan.png", P + 3, 7,
                    "Plan de la fosse — Ø41, Rouge à l'ouest, Bleu à l'est, lignes d'apparition des bots · Nord en haut")

    for name, i in (("complète", info_full), ("île seule", info_island)):
        print(f"{name:10} {i['size'][0]}×{i['size'][1]}×{i['size'][2]}  blocs={i['blocks']}  palette={i['palette']}  offset={i['offset']}")
    print(f"centre de la fosse depuis le bout du ponton : {rel(origin_full)} ; depuis le bord de l'île : {rel(origin_island)}")


if __name__ == "__main__":
    main()
