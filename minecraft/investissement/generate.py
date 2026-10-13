"""Bastion de Vælor : zone d'investissement médiévale du spawn VÆLORIA (Paper 1.21.4+), au format Sponge v2.

Usage : python3 minecraft/investissement/generate.py   (Pillow + numpy ; réutilise minecraft/spawn/generate.py)
Sorties dans minecraft/investissement/ : vaeloria-bastion-invest.schem (collage au centre de la zone AFK),
vaeloria-bastion-invest-spawn.schem (collage au centre de l'arbre, à la place du Trésor de Vælor), apercu-*.png.

Une petite forteresse carrée : courtine crénelée, quatre tours d'angle à toit conique, châtelet d'entrée à l'ouest
(face à la place d'arrivée) avec herse levée et blason, galeries en bois le long des murs, et au centre une halle
en charpente de chêne pâle qui couvre la zone AFK 9 × 9. Style VÆLORIA : pierre noire et deepslate pour la masse,
rubis (red nether bricks, verre et redstone) pour les liserés, quartz et calcite pour l'argent, chêne pâle pour le bois.
La zone reste ouverte de tous côtés (halle sans murs) : personne ne s'y cache, comme dans le Trésor.

Repère : centre de la zone AFK, y = 0 au niveau du sol de l'île. Nord = -Z. L'entrée est à l'ouest (-X).
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
Palette, write_schem, logo_grid = _spawn.Palette, _spawn.write_schem, _spawn.logo_grid

SPAWN_POS = (32, 45)  # centre de la zone dans le repère du spawn : la place du Trésor de Vælor
R = 14  # demi-côté du module : il couvre l'emprise réservée au Trésor (±14) et l'efface au collage
TOP = 32  # hauteur du module, comme le dégagement du Trésor
WALL = 11  # courtine : |d| = 10..11
WALL_H = 8  # haut de la courtine (chemin de ronde)
ZONE = 4  # zone AFK : |dx|, |dz| <= 4

PB = "minecraft:polished_blackstone_bricks"
CHIS = "minecraft:chiseled_polished_blackstone"
DT = "minecraft:deepslate_tiles"
RNB = "minecraft:red_nether_bricks"
OAK = "minecraft:pale_oak"
HANG = "minecraft:lantern[hanging=true]"
LANTERN = "minecraft:lantern[hanging=false]"


def st(mat, facing, half="bottom"):
    return f"minecraft:{mat}_stairs[facing={facing},half={half},shape=straight]"


class Build:
    def __init__(self):
        self.pal = Palette()
        n = 2 * R + 1
        self.v = np.zeros((TOP + 1, n, n), dtype=np.int32)
        self.rng = np.random.default_rng(1212)

    def put(self, x, y, z, name):
        if -R <= x <= R and -R <= z <= R and 0 <= y <= TOP:
            self.v[y, z + R, x + R] = 0 if name == "minecraft:air" else self.pal(name)

    def get(self, x, y, z):
        return self.pal.names[self.v[y, z + R, x + R]] if -R <= x <= R and -R <= z <= R and 0 <= y <= TOP else "minecraft:air"

    def stone(self):
        r = self.rng.random()
        return "minecraft:cracked_polished_blackstone_bricks" if r < 0.10 else "minecraft:deepslate_bricks" if r < 0.22 else PB


def outward(dx, dz):
    """Direction cardinale vers l'extérieur depuis le centre."""
    if abs(dx) >= abs(dz):
        return "east" if dx > 0 else "west"
    return "south" if dz > 0 else "north"


OPP = {"north": "south", "south": "north", "east": "west", "west": "east"}


def round_tower(b, cx, cz, r, h, slits=True):
    """Tour ronde pleine, liseré rubis, meurtrières, couronne en encorbellement et toit conique noir à faîtage rubis."""
    R2 = r + 0.5
    for dx in range(-math.ceil(R2) - 1, math.ceil(R2) + 2):
        for dz in range(-math.ceil(R2) - 1, math.ceil(R2) + 2):
            d = math.hypot(dx, dz)
            x, z = cx + dx, cz + dz
            if d <= R2:
                b.put(x, 0, z, PB)
                for y in range(1, h + 1):
                    b.put(x, y, z, RNB if y in (4, h - 1) and d > R2 - 1 else b.stone())
                if d > R2 - 1 and slits and (dx == 0 or dz == 0) and abs(dx) + abs(dz) >= r:
                    for y in (6, 7):
                        b.put(x, y, z, "minecraft:iron_bars")
            elif d <= R2 + 1:  # encorbellement sous la couronne, puis avant-toit du cône
                f = OPP[outward(dx, dz)]
                b.put(x, h, z, st("polished_blackstone_brick", f, "top"))
                b.put(x, 1, z, st("polished_blackstone_brick", f))  # glacis au pied
    # Cône : chaque niveau rétrécit, marches à l'extérieur, blocs pleins dedans.
    k = 0
    rr = R2 + 1
    while rr > 0.6:
        y = h + 1 + k
        for dx in range(-math.ceil(rr), math.ceil(rr) + 1):
            for dz in range(-math.ceil(rr), math.ceil(rr) + 1):
                d = math.hypot(dx, dz)
                if d <= rr:
                    edge = d > rr - 1
                    b.put(cx + dx, y, cz + dz, st("deepslate_tile", OPP[outward(dx, dz)]) if edge else
                          (RNB if k == 0 else DT))
        rr -= 0.75
        k += 1
    y = h + 1 + k
    b.put(cx, y, cz, CHIS)
    b.put(cx, y + 1, cz, "minecraft:polished_blackstone_brick_wall[up=true]")
    b.put(cx, y + 2, cz, "minecraft:redstone_block")
    b.put(cx, y + 3, cz, "minecraft:end_rod[facing=up]")


def build():
    b = Build()
    put = b.put

    # Parvis : dalles noires, bordure rubis, sur tout le carré réservé (le collage remplace aussi le sol).
    for x in range(-R, R + 1):
        for z in range(-R, R + 1):
            ring = max(abs(x), abs(z))
            put(x, 0, z, PB if ring == R else RNB if ring == R - 1 else
                "minecraft:polished_deepslate" if (x + z) % 2 else DT)
    # Cour : pavés de tuf, zone AFK en damier calcite/quartz cerclée de rubis, sceau au centre.
    for x in range(-WALL + 2, WALL - 1):
        for z in range(-WALL + 2, WALL - 1):
            ring = max(abs(x), abs(z))
            if ring < ZONE:
                name = "minecraft:calcite" if (x + z) % 2 else "minecraft:smooth_quartz"
            elif ring == ZONE:
                name = RNB
            elif ring == ZONE + 1:
                name = "minecraft:polished_deepslate"
            else:
                name = "minecraft:tuff_bricks" if (x * 3 + z) % 5 else "minecraft:polished_tuff"
            put(x, 0, z, name)
    put(0, 0, 0, "minecraft:redstone_block")

    # Courtine : deux blocs d'épaisseur, liseré rubis, glacis, chemin de ronde et merlons.
    for x in range(-WALL, WALL + 1):
        for z in range(-WALL, WALL + 1):
            ring = max(abs(x), abs(z))
            if ring < WALL - 1:
                continue
            for y in range(1, WALL_H + 1):
                put(x, y, z, RNB if y == 4 and ring == WALL else b.stone())
            put(x, WALL_H, z, PB)
            if ring == WALL:
                f = outward(x, z) if abs(x) != abs(z) else None
                if f:
                    put(x + (1 if f == "east" else -1 if f == "west" else 0), 1,
                        z + (1 if f == "south" else -1 if f == "north" else 0), st("polished_blackstone_brick", OPP[f]))
                    put(x + (1 if f == "east" else -1 if f == "west" else 0), WALL_H,
                        z + (1 if f == "south" else -1 if f == "north" else 0), st("polished_blackstone_brick", OPP[f], "top"))
                if (x + z) % 2 == 0:
                    put(x, WALL_H + 1, z, PB)
                    put(x, WALL_H + 2, z, "minecraft:polished_blackstone_brick_slab[type=bottom]")
            elif (x + z) % 4 == 0 and ring == WALL - 1:  # lanternes sur le chemin de ronde, côté cour
                put(x, WALL_H + 1, z, LANTERN)
    # Meurtrières dans la courtine (sauf la façade ouest, qui porte le châtelet).
    for k in (-7, -3, 3, 7):
        for y in (5, 6):
            put(WALL, y, k, "minecraft:iron_bars")
            put(k, y, -WALL, "minecraft:iron_bars")
            put(k, y, WALL, "minecraft:iron_bars")

    # Bannières rubis sur les façades nord, sud et est, entre les meurtrières.
    for k in (-5, 0, 5):
        put(WALL + 1, 7, k, "minecraft:red_wall_banner[facing=east]")
        put(k, 7, -WALL - 1, "minecraft:red_wall_banner[facing=north]")
        put(k, 7, WALL + 1, "minecraft:red_wall_banner[facing=south]")

    # Quatre tours d'angle.
    for sx in (-1, 1):
        for sz in (-1, 1):
            round_tower(b, sx * WALL, sz * WALL, 2.0, 13)  # toit compris, reste dans le carré ±14

    # Châtelet d'entrée (ouest) : bloc relevé, deux tourelles, passage en arc brisé, herse levée, blason.
    for x in range(-WALL - 1, -WALL + 2):
        for z in range(-4, 5):
            for y in range(1, 17):
                put(x, y, z, RNB if y in (4, 12) and x == -WALL - 1 else b.stone())
            if (z % 2 == 0) and x == -WALL - 1:
                put(x, 17, z, PB)
    for z in range(-4, 5):  # mâchicoulis au-dessus de la porte
        put(-WALL - 2, 16, z, st("polished_blackstone_brick", "east", "top"))
        put(-WALL - 2, 1, z, st("polished_blackstone_brick", "east"))
    for sz in (-1, 1):
        round_tower(b, -WALL, sz * 6, 2.0, 15, slits=False)
    # Passage : 3 de large, 5 de haut, arc brisé ; herse levée sous l'arc ; lanterne au milieu.
    for x in range(-WALL - 2, -WALL + 2):
        for z in (-1, 0, 1):
            for y in range(1, 6):
                put(x, y, z, "minecraft:air")
            put(x, 0, z, "minecraft:polished_deepslate")
        put(x, 6, 0, "minecraft:air")
        put(x, 5, -1, st("polished_blackstone_brick", "north", "top"))
        put(x, 5, 1, st("polished_blackstone_brick", "south", "top"))
    for z in (-1, 0, 1):
        put(-WALL, 5, z, "minecraft:iron_bars")  # herse levée : seuls les dents dépassent
    put(-WALL, 6, 0, "minecraft:iron_bars")
    put(-WALL + 1, 6, 0, HANG)
    for z in (-2, 2):  # piédroits en quartz
        for y in range(1, 6):
            put(-WALL - 2, y, z, "minecraft:quartz_pillar[axis=y]")
        put(-WALL - 2, 6, z, "minecraft:chiseled_quartz_block")
    put(-WALL - 2, 7, 0, "minecraft:redstone_block")  # clé de l'arc
    # Blason VÆLORIA en relief au-dessus de la porte (vu depuis l'ouest : gauche = sud).
    logo = logo_grid(7, relief=False)
    for gy, row in enumerate(logo):
        for gx, name in enumerate(row):
            if name:
                put(-WALL - 2, 15 - gy, gx - len(row) // 2, name)
    for z in (-3, 3):  # bannières de part et d'autre du blason
        for y in (9, 10):
            put(-WALL - 2, y, z, "minecraft:air")
        put(-WALL - 2, 10, z, "minecraft:red_wall_banner[facing=west]")
    # Seuil en chêne pâle devant la porte, encadré de deux bornes à lanterne.
    for z in (-1, 0, 1):
        put(-R, 0, z, f"{OAK}_planks")
    for z in (-2, 2):
        put(-R, 1, z, "minecraft:polished_blackstone_brick_wall[up=true]")
        put(-R, 2, z, LANTERN)

    # Galeries en bois le long des murs nord, sud et est : poteaux, auvent, bancs, tonneaux.
    for side in ("north", "south", "east"):
        for k in range(-8, 9):
            if side == "east":
                post, eave, wallc = (8, k), (8, k), (9, k)
                f_in, f_wall = "west", "east"
            else:
                s = -1 if side == "north" else 1
                post, eave, wallc = (k, s * 8), (k, s * 8), (k, s * 9)
                f_in, f_wall = OPP[side], side
            if abs(k) >= 8:
                continue
            if k % 4 == 0:
                for y in range(1, 5):
                    put(post[0], y, post[1], f"minecraft:stripped_{OAK}_log[axis=y]")
            put(eave[0], 5, eave[1], st(OAK, f_wall))
            put(wallc[0], 5, wallc[1], f"{OAK}_planks")
            put(wallc[0], 6, wallc[1], st("deepslate_tile", f_wall))
            if k % 4 == 2:
                put(wallc[0], 1, wallc[1], st(OAK, f_wall))  # banc adossé au mur, face à la cour
            elif k % 4 == 1:
                put(wallc[0], 1, wallc[1], "minecraft:barrel[facing=up]")
            elif k % 4 == 3 and k != 3:
                put(wallc[0], 4, wallc[1], HANG)

    # Halle en charpente au-dessus de la zone AFK : poteaux sur socles, sablières, toit à deux pans, ouverte partout.
    H = 6
    for x in (-5, 0, 5):
        for z in (-5, 5):
            put(x, 1, z, CHIS)
            for y in range(2, H + 1):
                put(x, y, z, f"minecraft:stripped_{OAK}_log[axis=y]")
    for x in range(-6, 7):
        for z in (-5, 5):
            put(x, H + 1, z, f"minecraft:{OAK}_log[axis=x]")
    for z in range(-5, 6):
        for x in (-5, 0, 5):
            put(x, H + 1, z, f"minecraft:{OAK}_log[axis=z]")  # entraits
    for x in (-5, 0, 5):  # liens en écharpe sous les sablières
        for z, f in ((-4, "north"), (4, "south")):
            put(x, H, z, st(OAK, f, "top"))
    for x in range(-7, 8):  # toit : pans nord et sud, faîtage rubis
        for dz in range(0, 8):
            y = H + 2 + (7 - dz)
            for s in (-1, 1):
                z = s * dz
                if dz == 0:
                    put(x, y, z, RNB)
                else:
                    put(x, y, z, st("deepslate_tile", "south" if s < 0 else "north"))
                    if abs(x) == 7:
                        pass
                    elif dz < 7:
                        put(x, y - 1, z, f"{OAK}_planks") if abs(x) == 6 else None
    for dz in range(-6, 7):  # pignons en colombage : chêne pâle et calcite, au-dessus des sablières
        top = H + 2 + (7 - abs(dz)) - 1
        for y in range(H + 2, top + 1):
            for x in (-6, 6):
                put(x, y, dz, f"minecraft:stripped_{OAK}_log[axis=y]" if dz % 3 == 0 else "minecraft:calcite")
    for x in (-7, 7):  # épis de faîtage
        put(x, H + 10, 0, "minecraft:end_rod[facing=up]")
    put(0, H + 8, 0, "minecraft:chain")
    for y in range(H + 2, H + 8):
        put(0, y, 0, "minecraft:chain")
    put(0, H + 1, 0, HANG)
    for x in (-3, 3):
        for z in (-3, 3):
            put(x, H + 1, z, "minecraft:chain")
            put(x, H, z, HANG)
    return b


def render(b):
    colors = {"red_stained": (190, 40, 40), "quartz": (236, 230, 223), "calcite": (223, 224, 220), "white_concrete": (207, 213, 214),
              "diorite": (192, 193, 194), "andesite": (132, 134, 133), "light_gray": (125, 125, 115), "black_concrete": (8, 10, 15),
              "red_concrete": (142, 33, 33), "red_nether": (95, 15, 18), "red_wall_banner": (160, 30, 30), "chain": (90, 95, 105),
              "end_rod": (240, 240, 230), "deepslate_tile": (58, 58, 64), "deepslate": (72, 72, 73), "tuff": (108, 109, 102),
              "cracked": (48, 43, 50), "blackstone": (40, 36, 44), "pale_oak": (214, 200, 196), "redstone": (175, 24, 5),
              "lantern": (230, 180, 90), "iron_bars": (150, 150, 155), "barrel": (120, 90, 60), "nether_wart": (115, 2, 2),
              "iron_block": (220, 220, 220), "gray_concrete": (54, 57, 61)}

    def color(i):
        n = b.pal.names[i]
        return next((c for k, c in colors.items() if k in n), (110, 110, 110))

    v = b.v
    H, L, W = v.shape
    top = Image.new("RGB", (W, L), (7, 7, 10))
    for z in range(L):
        for x in range(W):
            col = np.nonzero(v[:, z, x])[0]
            if col.size:
                top.putpixel((x, z), color(v[col[-1], z, x]))
    top.resize((W * 14, L * 14), Image.Resampling.NEAREST).save(HERE / "apercu-dessus.png")

    hmax = int(np.nonzero(v.any(axis=(1, 2)))[0].max()) + 1
    face = Image.new("RGB", (L, hmax), (7, 7, 10))  # façade ouest, vue depuis la place (gauche = nord... vu d'ouest : gauche = sud)
    for y in range(hmax):
        for z in range(L):
            for x in range(W):
                if v[y, z, x]:
                    shade = 1 - 0.5 * x / W
                    face.putpixel((L - 1 - z, hmax - 1 - y), tuple(int(c * shade) for c in color(v[y, z, x])))
                    break
    face.resize((L * 14, hmax * 14), Image.Resampling.NEAREST).save(HERE / "apercu-facade-ouest.png")

    # Vue 3D isométrique depuis le sud-ouest, face par face, du fond vers l'avant.
    from PIL import ImageDraw

    k = 10  # demi-largeur d'un cube à l'écran
    pad = 20
    img = Image.new("RGB", ((W + L) * k + 2 * pad, (W + L) * k // 2 + hmax * k + 2 * pad), (7, 7, 10))
    dr = ImageDraw.Draw(img)

    def solid(y, z, x):
        return 0 <= y < H and 0 <= z < L and 0 <= x < W and v[y, z, x] != 0

    for y in range(hmax):
        for depth in range(W + L - 1):  # depth = X' + z, X' = W-1-x (l'ouest vient devant)
            for z in range(L):
                xp = depth - z
                if not 0 <= xp < W:
                    continue
                x = W - 1 - xp
                bi = v[y, z, x]
                if not bi:
                    continue
                c = color(bi)
                sx = pad + (xp - z + L) * k
                sy = pad + (xp + z) * k // 2 + (hmax - y) * k
                top = [(sx, sy - k // 2), (sx + k, sy), (sx, sy + k // 2), (sx - k, sy)]
                if not solid(y + 1, z, x):
                    dr.polygon(top, fill=tuple(min(255, int(ch * 1.12)) for ch in c))
                if not solid(y, z + 1, x):  # face sud (gauche à l'écran)
                    dr.polygon([(sx - k, sy), (sx, sy + k // 2), (sx, sy + k // 2 + k), (sx - k, sy + k)],
                               fill=tuple(int(ch * 0.78) for ch in c))
                if not solid(y, z, x - 1):  # face ouest (droite à l'écran)
                    dr.polygon([(sx, sy + k // 2), (sx + k, sy), (sx + k, sy + k), (sx, sy + k // 2 + k)],
                               fill=tuple(int(ch * 0.58) for ch in c))
    img.save(HERE / "apercu-3d.png")


def main():
    b = build()
    v, names = b.v, b.pal.names
    # Collage au centre de la zone AFK, au niveau du sol.
    write_schem(HERE / "vaeloria-bastion-invest.schem", v, names, (R, 0, R))
    # Collage au centre de l'arbre du spawn : même volume, décalé à la place du Trésor de Vælor.
    write_schem(HERE / "vaeloria-bastion-invest-spawn.schem", v, names, (R - SPAWN_POS[0], 0, R - SPAWN_POS[1]))
    render(b)
    hmax = int(np.nonzero(v.any(axis=(1, 2)))[0].max())
    print("blocs :", int((v > 0).sum()), "· palette :", len(names), "· emprise :", 2 * R + 1, "×", 2 * R + 1,
          "· hauteur :", hmax + 1, "· zone AFK : (-4, 1, -4) → (4, 4, 4)")


if __name__ == "__main__":
    main()
