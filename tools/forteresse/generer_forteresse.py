#!/usr/bin/env python3
"""
Générateur de la Forteresse de VÆLORIA : un temple géant surmonté d'une tour en colimaçon, au cœur d'une forêt.
Produit un schematic Sponge v2 (lisible par WorldEdit et par VæloriaFactions).

  python3 generer_forteresse.py <dossier_de_sortie>

Fichiers produits :
- forteresse.schem ;
- layout.json : portes, sommet, enceinte, carte, points d'apparition dans la forêt et sortie, relatifs à l'origine ;
- apercu.png (vue du dessus) et apercu-face.png (vue de face) ;
- chemin.json : un chemin praticable de la porte sud jusqu'au sommet, calculé et vérifié par le générateur.

Repère : l'origine est le centre de la tour, au niveau du sol de la forêt (là où l'on se tiendrait). x vers l'est, z vers le sud, y vers le haut. Les portes sont FERMÉES (herses en fer).

Identité VÆLORIA : pierre noire (blackstone, deepslate), cramoisi (briques du Nether rouges, verre rouge,
bannières rouges) et or.
"""
import gzip, json, math, os, random, struct, sys
from collections import deque

import numpy as np

W = L = 241          # largeur / longueur (x / z)
C = 120              # centre
G = 8                # bloc d'herbe de surface au centre ; on se tient en G + 1
FLOOR = G + 6        # dalle du temple (on s'y tient en FLOOR + 1)
HALL_TOP = G + 22    # dernier bloc des murs de la grande salle
ROOF = HALL_TOP + 1  # toit de la grande salle
TOP_Y = G + 82       # dalle du sommet de la tour (on s'y tient en TOP_Y + 1)
H = TOP_Y + 20       # hauteur du schéma
DATA_VERSION = 4189  # Minecraft 1.21.4
SEED = 1789

rnd = random.Random(SEED)
palette = {"minecraft:air": 0}
vox = np.zeros((H, L, W), dtype=np.uint16)  # [y][z][x]
occ = np.zeros((L, W), dtype=bool)          # sol occupé (troncs, rochers, ruines) : pas d'apparition ici


def bid(state):
    if state not in palette:
        palette[state] = len(palette)
    return palette[state]


AIR = "minecraft:air"


def setb(x, y, z, state):
    X, Z = x + C, z + C
    if 0 <= X < W and 0 <= Z < L and 0 <= y < H:
        vox[y, Z, X] = bid(state)


def getb(x, y, z):
    X, Z = x + C, z + C
    if 0 <= X < W and 0 <= Z < L and 0 <= y < H:
        return int(vox[y, Z, X])
    return 0


def is_air(x, y, z):
    return getb(x, y, z) == 0


def fill(x1, y1, z1, x2, y2, z2, state):
    for x in range(min(x1, x2), max(x1, x2) + 1):
        for z in range(min(z1, z2), max(z1, z2) + 1):
            for y in range(min(y1, y2), max(y1, y2) + 1):
                setb(x, y, z, state)


def mix(*weighted):
    pool = []
    for state, w in weighted:
        pool += [state] * w
    return lambda: rnd.choice(pool)


# Matériaux de l'identité VÆLORIA
BLACK = mix(("minecraft:polished_blackstone_bricks", 8), ("minecraft:cracked_polished_blackstone_bricks", 1), ("minecraft:blackstone", 1))
DEEP = mix(("minecraft:deepslate_bricks", 6), ("minecraft:deepslate_tiles", 3), ("minecraft:cracked_deepslate_bricks", 1))
RED = "minecraft:red_nether_bricks"
GOLD = "minecraft:gold_block"
GILDED = "minecraft:gilded_blackstone"
CHISELED = "minecraft:chiseled_polished_blackstone"
LANTERN = "minecraft:lantern[hanging=false,waterlogged=false]"
HLANTERN = "minecraft:lantern[hanging=true,waterlogged=false]"


def stairs(mat, facing, half="bottom"):
    return f"minecraft:{mat}_stairs[facing={facing},half={half},shape=straight,waterlogged=false]"


def slab(mat):
    return f"minecraft:{mat}_slab[type=bottom,waterlogged=false]"


SIDES = {"north": (0, -1), "south": (0, 1), "west": (-1, 0), "east": (1, 0)}
INWARD = {"north": "south", "south": "north", "west": "east", "east": "west"}


def side_xyz(side, along, out):
    sx, sz = SIDES[side]
    return (out * sx + along * (1 if sz != 0 else 0), out * sz + along * (1 if sx != 0 else 0))


# ───────────────────────────── Terrain ─────────────────────────────

def value_noise(size, cell, seed):
    r = np.random.default_rng(seed)
    g = r.random((size // cell + 3, size // cell + 3))
    xs_ = np.arange(size) / cell
    i = xs_.astype(int)
    f = xs_ - i
    f = f * f * (3 - 2 * f)
    a = g[np.ix_(i, i)]; b = g[np.ix_(i, i + 1)]; c = g[np.ix_(i + 1, i)]; d = g[np.ix_(i + 1, i + 1)]
    fx = f[None, :]; fz = f[:, None]
    return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz


n1 = value_noise(W, 22, SEED)
n2 = value_noise(W, 7, SEED + 1)
n3 = value_noise(W, 13, SEED + 2)
xs = np.arange(W) - C
DX, DZ = np.meshgrid(xs, xs)            # DX[z][x]
box = np.maximum(np.abs(DX), np.abs(DZ))
rad = np.sqrt(DX ** 2 + DZ ** 2)

height = G + (n1 * 4 + n2 * 1.5 - 2.5)                           # sous-bois vallonné
edge = np.clip((box - 104) / 16.0, 0, 1)                          # collines boisées en bordure
height = height + edge ** 1.5 * (18 + n1 * 10)
flat = np.clip(1 - (rad - 40) / 10.0, 0, 1)                       # clairière plate autour du temple
height = np.round(height * (1 - flat) + G * flat)
height = np.clip(height, 3, G + 34).astype(int)

for Z in range(L):
    for X in range(W):
        h = height[Z, X]
        r = rad[Z, X]
        if h >= G + 16:
            top = "minecraft:stone" if n2[Z, X] > 0.5 else "minecraft:mossy_cobblestone" if n3[Z, X] > 0.6 else "minecraft:grass_block[snowy=false]"
        elif r > 44 and n3[Z, X] > 0.68:
            top = "minecraft:podzol[snowy=false]"
        elif r > 44 and n2[Z, X] > 0.78:
            top = "minecraft:moss_block"
        elif r > 44 and n2[Z, X] < 0.08:
            top = "minecraft:coarse_dirt"
        else:
            top = "minecraft:grass_block[snowy=false]"
        vox[0:max(0, h - 3), Z, X] = bid("minecraft:stone")
        vox[max(0, h - 3):h, Z, X] = bid("minecraft:dirt")
        vox[h, Z, X] = bid(top)


def surface(x, z):
    return int(height[z + C, x + C])


# Sentiers sinueux depuis les bords jusqu'au pied des escaliers du temple
path_mask = np.zeros((L, W), dtype=bool)
for side in SIDES:
    phase = rnd.uniform(0, 6.28)
    for out in range(38, 118):
        wiggle = round(7 * math.sin(out / 11.0 + phase) * min(1.0, (out - 38) / 20.0))
        for w_ in range(-1, 2):
            x, z = side_xyz(side, wiggle + w_, out)
            X, Z = x + C, z + C
            if 0 <= X < W and 0 <= Z < L:
                path_mask[Z, X] = True
                y = surface(x, z)
                setb(x, y, z, rnd.choice(["minecraft:dirt_path", "minecraft:dirt_path", "minecraft:coarse_dirt", "minecraft:gravel"]))
# Zone tampon autour des sentiers : pas d'arbre dessus
path_buffer = np.zeros_like(path_mask)
for dz in range(-2, 3):
    for dx in range(-2, 3):
        path_buffer |= np.roll(np.roll(path_mask, dz, axis=0), dx, axis=1)

# ───────────────────────────── Le temple : podium et grands escaliers ─────────────────────────────
PODIUM = 28
for z in range(-PODIUM, PODIUM + 1):
    for x in range(-PODIUM, PODIUM + 1):
        b = max(abs(x), abs(z))
        top = G + 2 if b == 28 else G + 4 if b == 27 else FLOOR
        for y in range(G + 1, top + 1):
            setb(x, y, z, BLACK())
        if b in (27, 28):
            setb(x, top, z, RED)
        if b == 26:
            setb(x, FLOOR, z, RED if (x + z) % 2 else GILDED)
        occ[z + C, x + C] = True

for side in SIDES:
    face = INWARD[side]
    for out in range(27, 33):
        lvl = G + 1 + (32 - out)          # out 32 → G+1 … out 27 → G+6 (= dalle)
        for a in range(-4, 5):
            x, z = side_xyz(side, a, out)
            for y in range(G + 1, lvl):
                setb(x, y, z, BLACK())
            setb(x, lvl, z, stairs("polished_blackstone_brick", face))
            for y in range(lvl + 1, FLOOR + 2):
                setb(x, y, z, AIR)
        # rampes latérales
        for a in (-5, 5):
            x, z = side_xyz(side, a, out)
            for y in range(G + 1, lvl + 1):
                setb(x, y, z, BLACK())
            setb(x, lvl + 1, z, "minecraft:polished_blackstone_wall")
    # Braseros et statues au pied des marches
    for a in (-7, 7):
        x, z = side_xyz(side, a, 34)
        fill(x, G + 1, z, x, G + 3, z, CHISELED)
        setb(x, G + 4, z, GILDED)
        setb(x, G + 5, z, "minecraft:campfire[facing=north,lit=true,signal_fire=false,waterlogged=false]")
        occ[z + C, x + C] = True
    # Dalle d'accueil devant l'escalier
    for out in range(33, 37):
        for a in range(-5, 6):
            x, z = side_xyz(side, a, out)
            setb(x, G, z, rnd.choice(["minecraft:polished_blackstone_bricks", "minecraft:polished_blackstone_bricks", "minecraft:cracked_polished_blackstone_bricks"]))

# ───────────────────────────── Colonnade et grande salle ─────────────────────────────
WALL_IN, WALL_OUT = 21, 22
for z in range(-26, 27):
    for x in range(-26, 27):
        b = max(abs(x), abs(z))
        along = x if abs(z) >= abs(x) else z
        if b == 25 and along % 4 == 1 and abs(along) <= 24 and abs(along) > 6:
            setb(x, FLOOR + 1, z, GILDED)
            for y in range(FLOOR + 2, HALL_TOP - 1):
                setb(x, y, z, "minecraft:polished_basalt[axis=y]")
            setb(x, HALL_TOP - 1, z, CHISELED)
        if 23 <= b <= 26:                                   # architrave
            setb(x, HALL_TOP, z, RED if b in (23, 26) else BLACK())
            setb(x, ROOF, z, BLACK())
        if WALL_IN <= b <= WALL_OUT:                          # murs de la grande salle
            for y in range(FLOOR + 1, HALL_TOP + 1):
                setb(x, y, z, BLACK())
            setb(x, FLOOR + 8, z, RED)
            setb(x, HALL_TOP, z, RED)
            if abs(along) % 6 == 3 and abs(along) < 19:      # vitraux rouges
                for y in range(FLOOR + 4, FLOOR + 7):
                    setb(x, y, z, "minecraft:red_stained_glass")
        if b < WALL_IN:                                       # dallage
            setb(x, FLOOR, z, "minecraft:polished_deepslate" if (x // 2 + z // 2) % 2 else "minecraft:polished_blackstone")
        if b <= 26:
            setb(x, ROOF, z, BLACK())
        if b == 26 and (x + z) % 2 == 0:
            setb(x, ROOF + 1, z, BLACK())
            setb(x, ROOF + 2, z, slab("polished_blackstone_brick"))
# Pinacles aux quatre coins du toit
for (px, pz) in [(-25, -25), (25, -25), (-25, 25), (25, 25)]:
    fill(px - 1, ROOF + 1, pz - 1, px + 1, ROOF + 5, pz + 1, DEEP())
    fill(px, ROOF + 6, pz, px, ROOF + 9, pz, RED)
    setb(px, ROOF + 10, pz, GOLD)
    setb(px, ROOF + 11, pz, LANTERN)

# Portes de la grande salle : 7 de large, 9 de haut, herse au nu extérieur du mur
GATES = []
for side, (sx, sz) in SIDES.items():
    axis_x = sz != 0
    for out in (WALL_IN, WALL_OUT, 23):
        for a in range(-3, 4):
            x, z = side_xyz(side, a, out)
            for y in range(FLOOR + 1, FLOOR + 10):
                setb(x, y, z, AIR)
    for a in range(-4, 5):                                   # arc doré
        x, z = side_xyz(side, a, WALL_OUT)
        setb(x, FLOOR + 10, z, GOLD if abs(a) < 4 else GILDED)
        x, z = side_xyz(side, a, WALL_IN)
        setb(x, FLOOR + 10, z, GILDED)
    bars = "minecraft:iron_bars[east=true,north=false,south=false,waterlogged=false,west=true]" if axis_x \
        else "minecraft:iron_bars[east=false,north=true,south=true,waterlogged=false,west=false]"
    cells = []
    for a in range(-3, 4):
        x, z = side_xyz(side, a, WALL_OUT)
        for y in range(FLOOR + 1, FLOOR + 10):
            setb(x, y, z, bars)
            cells.append((x, y, z))
    GATES.append({"name": side, "min": [min(c[0] for c in cells), min(c[1] for c in cells) - (G + 1), min(c[2] for c in cells)],
                  "max": [max(c[0] for c in cells), max(c[1] for c in cells) - (G + 1), max(c[2] for c in cells)], "block": bars})
    # Bannières rouges de part et d'autre de la porte, sur la façade
    for a in (-5, 5):
        x, z = side_xyz(side, a, WALL_OUT + 1)
        for y in range(FLOOR + 4, FLOOR + 8):
            setb(x, y, z, f"minecraft:red_wall_banner[facing={side}]" if y == FLOOR + 7 else AIR)

# Intérieur de la grande salle : tapis, colonnes, lustres
for side in SIDES:
    for out in range(12, WALL_IN):
        for a in (-1, 0, 1):
            x, z = side_xyz(side, a, out)
            setb(x, FLOOR + 1, z, "minecraft:red_carpet")
for (cx, cz) in [(-16, -16), (16, -16), (-16, 16), (16, 16), (-16, -7), (16, -7), (-16, 7), (16, 7), (-7, -16), (7, -16), (-7, 16), (7, 16)]:
    fill(cx, FLOOR + 1, cz, cx + 1, HALL_TOP, cz + 1, DEEP())
    setb(cx, FLOOR + 1, cz, GILDED)
for (cx, cz) in [(-12, -12), (12, -12), (-12, 12), (12, 12), (-18, 0), (18, 0), (0, -18), (0, 18)]:
    if abs(cx) == 18 or abs(cz) == 18:
        continue
    for y in range(HALL_TOP - 4, HALL_TOP + 1):
        setb(cx, y, cz, "minecraft:chain[axis=y,waterlogged=false]")
    setb(cx, HALL_TOP - 5, cz, HLANTERN)
for (cx, cz) in [(-19, -11), (19, 11), (-11, 19), (11, -19), (-19, 11), (19, -11), (11, 19), (-11, -19)]:
    setb(cx, FLOOR + 1, cz, CHISELED)
    setb(cx, FLOOR + 2, cz, LANTERN)

# ───────────────────────────── La tour en colimaçon ─────────────────────────────
R_OUT, R_WALL, R_RAIL, R_CORE = 11.4, 9.5, 5.5, 4.5
N = 30                       # marches par tour (une demi-dalle de montée chacune)
STEP = 0.5
ramp_cells = {}              # (x, z) -> indice de marche dans le tour
for z in range(-12, 13):
    for x in range(-12, 13):
        r = math.hypot(x, z)
        if r > R_OUT:
            continue
        if r > R_WALL:                                        # mur extérieur
            for y in range(FLOOR + 1, TOP_Y):
                setb(x, y, z, BLACK())
        elif r < R_CORE:                                      # noyau central plein
            for y in range(FLOOR + 1, TOP_Y):
                setb(x, y, z, DEEP())
        else:
            for y in range(FLOOR + 1, TOP_Y):
                setb(x, y, z, AIR)
            setb(x, FLOOR, z, "minecraft:polished_blackstone")
            if r >= R_RAIL:
                ang = math.atan2(z, x) % (2 * math.pi)
                ramp_cells[(x, z)] = int(ang / (2 * math.pi / N))
            else:
                ramp_cells[(x, z)] = -1                       # garde-corps
# Lumière : bandes de shroomlight dans le noyau, vitraux et lampes dans le mur
for y in range(FLOOR + 6, TOP_Y - 2, 6):
    for z in range(-12, 13):
        for x in range(-12, 13):
            r = math.hypot(x, z)
            if 3.5 < r < R_CORE:
                setb(x, y, z, "minecraft:shroomlight" if (x + z + y) % 3 == 0 else RED)
            if R_WALL < r <= 10.5 and (x * 7 + z * 3 + y) % 11 == 0:
                setb(x, y, z, "minecraft:shroomlight")
for k in range(8):
    ang = k * math.pi / 4 + math.pi / 8
    for y in range(FLOOR + 10, TOP_Y - 4, 9):
        for rr in (10, 11):
            x, z = round(rr * math.cos(ang)), round(rr * math.sin(ang))
            setb(x, y, z, "minecraft:red_stained_glass")
            setb(x, y + 1, z, "minecraft:red_stained_glass")

total_rise = (TOP_Y + 1) - (FLOOR + 1)
revs = int(math.ceil(total_rise / (N * STEP))) + 1
for (x, z), i in ramp_cells.items():
    for n in range(revs):
        if i < 0:
            # garde-corps : suit la marche du rayon voisin
            ang = math.atan2(z, x) % (2 * math.pi)
            j = int(ang / (2 * math.pi / N))
            s = FLOOR + 1 + STEP * (n * N + j + 1)
            if s > TOP_Y + 0.5:
                continue
            base = int(math.floor(s))
            setb(x, base - 1, z, DEEP())
            setb(x, base, z, "minecraft:polished_blackstone_wall")
            continue
        s = FLOOR + 1 + STEP * (n * N + i + 1)   # hauteur où l'on se tient
        if s > TOP_Y + 1:
            continue
        base = int(math.floor(s))
        setb(x, base - 2, z, BLACK())
        if s == base:
            setb(x, base - 1, z, BLACK() if (n * N + i) % 10 else GILDED)
        else:
            setb(x, base - 1, z, BLACK())
            setb(x, base, z, slab("polished_blackstone_brick"))

# Portes de la tour (une par côté)
for side in SIDES:
    for out in (9, 10, 11):
        for a in range(-1, 2):
            x, z = side_xyz(side, a, out)
            for y in range(FLOOR + 1, FLOOR + 5):
                setb(x, y, z, AIR)
    for a in range(-2, 3):
        x, z = side_xyz(side, a, 11)
        setb(x, FLOOR + 5, z, GOLD if a == 0 else GILDED)

# Décor extérieur de la tour : contreforts, bandeaux rouges, couronne à mâchicoulis
for z in range(-14, 15):
    for x in range(-14, 15):
        r = math.hypot(x, z)
        ang = math.degrees(math.atan2(z, x)) % 360
        if R_OUT < r <= 12.5 and min(ang % 45, 45 - ang % 45) < 4:
            for y in range(ROOF + 1, TOP_Y - 2):
                setb(x, y, z, DEEP())
        if 9.5 < r <= R_OUT:
            for y in range(ROOF + 4, TOP_Y - 2, 10):
                setb(x, y, z, RED)
                setb(x, y + 1, z, GILDED if (x + z) % 3 == 0 else RED)
        if R_OUT < r <= 13.4:                              # couronne en encorbellement
            setb(x, TOP_Y - 2, z, stairs("polished_blackstone_brick", "north", "top") if r > 12.5 else BLACK())
            setb(x, TOP_Y - 1, z, RED)
            setb(x, TOP_Y, z, BLACK())

# ───────────────────────────── Le sommet ─────────────────────────────
SUMMIT_R = 13.4
for z in range(-14, 15):
    for x in range(-14, 15):
        r = math.hypot(x, z)
        if r > SUMMIT_R:
            continue
        if (x, z) in ramp_cells and ramp_cells[(x, z)] >= 0:
            # trémie de l'escalier : ouverte au-dessus des dernières marches
            i = ramp_cells[(x, z)]
            last = max(FLOOR + 1 + STEP * (n * N + i + 1) for n in range(revs) if FLOOR + 1 + STEP * (n * N + i + 1) <= TOP_Y + 1)
            if last > TOP_Y - 2.5:
                continue
        if r < 3.5:
            setb(x, TOP_Y, z, GOLD)
        elif r < 5.5:
            setb(x, TOP_Y, z, GILDED if (x + z) % 2 else "minecraft:polished_blackstone")
        else:
            ring = int(r) % 3
            setb(x, TOP_Y, z, RED if ring == 0 else "minecraft:polished_blackstone_bricks")
        if 12.5 < r <= SUMMIT_R:
            setb(x, TOP_Y + 1, z, BLACK())
            if (x + z) % 2 == 0:
                setb(x, TOP_Y + 2, z, BLACK())
# Obélisques aux huit vents
for k in range(8):
    ang = k * math.pi / 4
    ox, oz = round(11.5 * math.cos(ang)), round(11.5 * math.sin(ang))
    fill(ox, TOP_Y + 1, oz, ox, TOP_Y + 6 + (2 if k % 2 == 0 else 0), oz, RED)
    top = TOP_Y + 7 + (2 if k % 2 == 0 else 0)
    setb(ox, top, oz, GOLD)
    setb(ox, top + 1, oz, LANTERN)
# Autel central et étendard
setb(0, TOP_Y + 1, 0, GILDED)
for y in range(TOP_Y + 2, TOP_Y + 15):
    setb(0, y, 0, "minecraft:dark_oak_fence")
for y in range(TOP_Y + 10, TOP_Y + 15):
    for dx in range(1, 5):
        setb(dx, y, 0, "minecraft:red_wool" if not (y == TOP_Y + 12 and dx in (2, 3)) else "minecraft:gold_block")
setb(0, TOP_Y + 15, 0, GOLD)
for (x, z) in [(3, 3), (-3, 3), (3, -3), (-3, -3)]:
    setb(x, TOP_Y + 1, z, CHISELED)
    setb(x, TOP_Y + 2, z, LANTERN)

# ───────────────────────────── Clairière : ruines, colonnes brisées, menhirs ─────────────────────────────
for k in range(16):
    ang = k * math.pi / 8 + 0.2
    r = 38 + (k % 2) * 3
    x, z = round(r * math.cos(ang)), round(r * math.sin(ang))
    if path_buffer[z + C, x + C]:
        continue
    y = surface(x, z)
    hgt = rnd.randint(2, 6)
    for dy in range(1, hgt + 1):
        setb(x, y + dy, z, rnd.choice(["minecraft:polished_blackstone_bricks", "minecraft:cracked_polished_blackstone_bricks", "minecraft:blackstone"]))
    if hgt >= 5:
        setb(x, y + hgt + 1, z, GILDED)
    occ[z + C, x + C] = True

# ───────────────────────────── La forêt ─────────────────────────────
def leaves(kind):
    return f"minecraft:{kind}_leaves[distance=1,persistent=true,waterlogged=false]"


def put_leaf(x, y, z, kind):
    x, y, z = int(math.floor(x)), int(math.floor(y)), int(math.floor(z))
    if is_air(x, y, z):
        setb(x, y, z, leaves(kind))


def trunk(x, z, y0, h, log, size=1):
    for dx in range(size):
        for dz in range(size):
            for dy in range(1, h + 1):
                setb(x + dx, y0 + dy, z + dz, f"minecraft:{log}[axis=y]")
            X, Z = x + dx + C, z + dz + C
            if 0 <= X < W and 0 <= Z < L:
                occ[Z, X] = True


def blob(cx, cy, cz, rx, ry, kind, density=1.0):
    for dx in range(-int(rx) - 1, int(rx) + 2):
        for dz in range(-int(rx) - 1, int(rx) + 2):
            for dy in range(-int(ry) - 1, int(ry) + 2):
                d = (dx / rx) ** 2 + (dz / rx) ** 2 + (dy / ry) ** 2
                if d <= 1 and (d < 0.6 or rnd.random() < density):
                    put_leaf(cx + dx, cy + dy, cz + dz, kind)


def oak(x, z):
    y = surface(x, z); h = rnd.randint(5, 7)
    trunk(x, z, y, h, "oak_log")
    blob(x, y + h, z, 2.8, 2.2, "oak", 0.7)


def birch(x, z):
    y = surface(x, z); h = rnd.randint(6, 9)
    trunk(x, z, y, h, "birch_log")
    blob(x, y + h, z, 2.0, 2.6, "birch", 0.75)


def spruce(x, z):
    y = surface(x, z); h = rnd.randint(9, 13)
    trunk(x, z, y, h, "spruce_log")
    for i, dy in enumerate(range(h, 2, -1)):
        r = 0.6 + (i % 3) * 0.5 + i * 0.12
        for dx in range(-3, 4):
            for dz in range(-3, 4):
                if dx * dx + dz * dz <= r * r:
                    put_leaf(x + dx, y + dy, z + dz, "spruce")
    put_leaf(x, y + h + 1, z, "spruce")


def dark_oak(x, z):
    y = surface(x, z); h = rnd.randint(7, 10)
    trunk(x, z, y, h, "dark_oak_log", 2)
    blob(x + 0.5, y + h, z + 0.5, 4.5, 2.4, "dark_oak", 0.8)


def giant(x, z):
    """Un vieux chêne géant : tronc 2×2, branches, grand houppier."""
    y = surface(x, z); h = rnd.randint(15, 19)
    trunk(x, z, y, h, "oak_log", 2)
    for k in range(5):
        ang = rnd.uniform(0, 6.28)
        by = y + rnd.randint(h - 7, h - 2)
        for s in range(1, 6):
            bx, bz = round(x + 0.5 + math.cos(ang) * s), round(z + 0.5 + math.sin(ang) * s)
            setb(bx, by + s // 3, bz, "minecraft:oak_log[axis=y]")
        blob(round(x + 0.5 + math.cos(ang) * 6), by + 2, round(z + 0.5 + math.sin(ang) * 6), 3.2, 2.2, "oak", 0.7)
    blob(x + 0.5, y + h + 1, z + 0.5, 5.5, 3.2, "oak", 0.75)


def bush(x, z):
    y = surface(x, z)
    kind = rnd.choice(["oak", "azalea", "dark_oak"])
    blob(x, y + 1, z, 1.4, 1.0, kind, 0.8)
    occ[z + C, x + C] = True


def fallen_log(x, z):
    y = surface(x, z)
    horiz = rnd.random() < 0.5
    for i in range(rnd.randint(4, 7)):
        px, pz = (x + i, z) if horiz else (x, z + i)
        if abs(surface(px, pz) - y) > 1:
            break
        setb(px, surface(px, pz) + 1, pz, f"minecraft:oak_log[axis={'x' if horiz else 'z'}]")
        if rnd.random() < 0.3:
            setb(px, surface(px, pz) + 2, pz, "minecraft:moss_carpet")
        occ[pz + C, px + C] = True


def rock(x, z):
    y = surface(x, z)
    r = rnd.uniform(1.4, 2.6)
    for dx in range(-3, 4):
        for dz in range(-3, 4):
            for dy in range(0, 4):
                if dx * dx + dz * dz + (dy * 1.5) ** 2 <= r * r:
                    setb(x + dx, y + dy, z + dz, rnd.choice(["minecraft:mossy_cobblestone", "minecraft:stone", "minecraft:andesite", "minecraft:mossy_stone_bricks"]))
                    if 0 <= x + dx + C < W and 0 <= z + dz + C < L:
                        occ[z + dz + C, x + dx + C] = True


def free(x, z, r=2):
    X, Z = x + C, z + C
    if not (r <= X < W - r and r <= Z < L - r):
        return False
    return not occ[Z - r:Z + r + 1, X - r:X + r + 1].any() and not path_buffer[Z, X]


# Placement en grille irrégulière : une forêt dense, plus clairsemée près de la clairière
for gz in range(-117, 118, 6):
    for gx in range(-117, 118, 6):
        x, z = gx + rnd.randint(-2, 2), gz + rnd.randint(-2, 2)
        r = math.hypot(x, z)
        if r < 47 or not free(x, z, 2):
            continue
        if r < 56 and rnd.random() < 0.45:
            continue
        k = rnd.random()
        if k < 0.04 and free(x, z, 4):
            giant(x, z)
        elif k < 0.22:
            dark_oak(x, z)
        elif k < 0.48:
            oak(x, z)
        elif k < 0.68:
            birch(x, z)
        elif k < 0.86:
            spruce(x, z)
        elif k < 0.93:
            fallen_log(x, z)
        else:
            rock(x, z)
# Sous-bois : buissons, fougères, herbes, champignons
for _ in range(4200):
    x, z = rnd.randint(-118, 118), rnd.randint(-118, 118)
    r = math.hypot(x, z)
    if r < 44 or occ[z + C, x + C] or path_mask[z + C, x + C]:
        continue
    y = surface(x, z)
    if not is_air(x, y + 1, z) or vox[y, z + C, x + C] in (bid("minecraft:stone"), bid("minecraft:mossy_cobblestone")):
        continue
    k = rnd.random()
    if k < 0.06 and free(x, z, 1):
        bush(x, z)
    elif k < 0.40:
        setb(x, y + 1, z, "minecraft:short_grass")
    elif k < 0.70:
        setb(x, y + 1, z, "minecraft:fern")
    elif k < 0.78 and is_air(x, y + 2, z):
        setb(x, y + 1, z, "minecraft:large_fern[half=lower]")
        setb(x, y + 2, z, "minecraft:large_fern[half=upper]")
    elif k < 0.84:
        setb(x, y + 1, z, rnd.choice(["minecraft:brown_mushroom", "minecraft:red_mushroom"]))
    elif k < 0.92:
        setb(x, y + 1, z, "minecraft:moss_carpet")
    else:
        setb(x, y + 1, z, rnd.choice(["minecraft:poppy", "minecraft:lily_of_the_valley", "minecraft:blue_orchid"]))

# ───────────────────────────── Points d'apparition dans la forêt ─────────────────────────────
NON_SOLID = None


def build_non_solid():
    names = {}
    for k, v in palette.items():
        n = k.split("[")[0]
        passable = n in ("minecraft:air", "minecraft:short_grass", "minecraft:fern", "minecraft:large_fern", "minecraft:moss_carpet",
                         "minecraft:red_carpet", "minecraft:brown_mushroom", "minecraft:red_mushroom", "minecraft:poppy",
                         "minecraft:lily_of_the_valley", "minecraft:blue_orchid")
        names[v] = passable
    return names


def spawn_points(count=260, min_dist=6):
    pts = []
    tries = 0
    passable = build_non_solid()
    while len(pts) < count and tries < 60000:
        tries += 1
        x, z = rnd.randint(-108, 108), rnd.randint(-108, 108)
        r = math.hypot(x, z)
        if r < 52 or occ[z + C, x + C]:
            continue
        y = surface(x, z)
        if y > G + 8:
            continue
        ground = palette_name(int(vox[y, z + C, x + C]))
        if "leaves" in ground or "log" in ground:
            continue
        if not (passable[getb(x, y + 1, z)] and passable[getb(x, y + 2, z)] and passable[getb(x, y + 3, z)]):
            continue
        if any((x - px) ** 2 + (z - pz) ** 2 < min_dist ** 2 for px, _, pz in pts):
            continue
        pts.append((x, y + 1 - (G + 1), z))
    return pts


_inv = None


def palette_name(i):
    global _inv
    if _inv is None or len(_inv) != len(palette):
        _inv = {v: k for k, v in palette.items()}
    return _inv[i]


# ───────────────────────────── Vérification : un chemin praticable jusqu'au sommet ─────────────────────────────
def walk_check():
    """Parcours en largeur sur les positions où l'on tient debout (demi-blocs), portes ouvertes.
    Pas : montée d'un bloc au plus (saut), descente de 3 au plus. Renvoie le chemin de la porte sud au sommet."""
    inv = {v: k for k, v in palette.items()}
    kind = {}
    for v, k in inv.items():
        n = k.split("[")[0]
        if n in ("minecraft:air", "minecraft:red_carpet", "minecraft:moss_carpet", "minecraft:short_grass", "minecraft:fern",
                 "minecraft:iron_bars"):  # herses ouvertes pendant l'assaut
            kind[v] = 0.0                 # traversable
        elif "_slab" in n and "type=bottom" in k:
            kind[v] = 0.5
        elif "_wall" in n or "fence" in n:
            kind[v] = 1.5
        else:
            kind[v] = 1.0

    def top_at(x, yb, z):
        """Hauteur du dessus du bloc (x, yb, z), ou None s'il ne porte pas."""
        k = kind[getb(x, yb, z)]
        return None if k == 0.0 else yb + k

    def clear(x, s, z):
        # 1,8 bloc libre au-dessus de s
        y0 = int(math.floor(s))
        for y in range(y0, int(math.floor(s + 1.8)) + 1):
            k = kind[getb(x, y, z)]
            if k == 0.0:
                continue
            if y == y0 and y + k <= s + 1e-6:
                continue
            return False
        return True

    def stands(x, z, lo, hi):
        out = []
        for yb in range(max(0, int(lo) - 1), min(H - 2, int(hi) + 1)):
            t = top_at(x, yb, z)
            if t is not None and lo - 1e-6 <= t <= hi + 1e-6 and kind[getb(x, yb, z)] != 1.5 and clear(x, t, z):
                out.append(t)
        return out

    start = None
    for s in stands(0, 30, FLOOR - 4, FLOOR + 2):
        start = (0, s, 30)
    assert start, "pas de départ"
    goal_y = TOP_Y + 1
    prev = {start: None}
    q = deque([start])
    found = None
    while q:
        x, s, z = q.popleft()
        if s >= goal_y - 1e-6 and math.hypot(x, z) <= 12:
            found = (x, s, z)
            break
        for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, nz = x + dx, z + dz
            if max(abs(nx), abs(nz)) > 34:
                continue
            for t in stands(nx, nz, s - 3, s + 1.0):
                n = (nx, t, nz)
                if n not in prev:
                    prev[n] = (x, s, z)
                    q.append(n)
    assert found, "le sommet n'est pas accessible à pied !"
    path = []
    n = found
    while n:
        path.append(n)
        n = prev[n]
    path.reverse()
    return path


# ───────────────────────────── Export ─────────────────────────────
def varint(n):
    out = bytearray()
    while True:
        b = n & 0x7F
        n >>= 7
        if n:
            out.append(b | 0x80)
        else:
            out.append(b)
            return bytes(out)


def nbt_string(s):
    b = s.encode("utf-8")
    return struct.pack(">H", len(b)) + b


def tag(t, name, payload):
    return bytes([t]) + nbt_string(name) + payload


def write_schem(path):
    flat_ = vox.reshape(-1)  # ordre y, z, x → index = x + z*W + y*W*L
    if len(palette) <= 128:
        data = flat_.astype(np.uint8).tobytes()
    else:
        lut = [varint(i) for i in range(len(palette))]
        data = b"".join(lut[int(v)] for v in flat_)
    pal = b"".join(tag(3, k, struct.pack(">i", v)) for k, v in palette.items()) + b"\x00"
    meta = tag(3, "WEOffsetX", struct.pack(">i", -C)) + tag(3, "WEOffsetY", struct.pack(">i", -(G + 1))) \
        + tag(3, "WEOffsetZ", struct.pack(">i", -C)) + tag(8, "Name", nbt_string("Forteresse de VÆLORIA")) \
        + tag(8, "Author", nbt_string("VÆLORIA")) + b"\x00"
    body = (tag(3, "Version", struct.pack(">i", 2)) + tag(3, "DataVersion", struct.pack(">i", DATA_VERSION))
            + tag(2, "Width", struct.pack(">h", W)) + tag(2, "Height", struct.pack(">h", H)) + tag(2, "Length", struct.pack(">h", L))
            + tag(11, "Offset", struct.pack(">i", 3) + struct.pack(">iii", 0, 0, 0))
            + tag(3, "PaletteMax", struct.pack(">i", len(palette)))
            + tag(10, "Palette", pal)
            + tag(7, "BlockData", struct.pack(">i", len(data)) + data)
            + tag(10, "Metadata", meta) + b"\x00")
    raw = tag(10, "Schematic", body)
    with open(path, "wb") as out, gzip.GzipFile(filename="", mode="wb", compresslevel=9, fileobj=out, mtime=0) as f:
        f.write(raw)  # gzip sans date : le même code produit toujours le même fichier


COLORS = [("water", (52, 95, 190)), ("birch_leaves", (110, 160, 70)), ("spruce_leaves", (45, 85, 55)), ("dark_oak_leaves", (40, 80, 30)),
          ("azalea", (80, 130, 50)), ("leaves", (60, 115, 45)), ("_log", (95, 75, 50)), ("podzol", (110, 80, 45)), ("moss", (85, 120, 45)),
          ("grass_block", (95, 150, 60)), ("fern", (70, 130, 50)), ("short_grass", (90, 145, 60)), ("snow", (240, 240, 240)),
          ("gold", (240, 200, 60)), ("gilded", (150, 110, 50)), ("red_nether", (120, 20, 25)), ("red_stained", (180, 30, 40)),
          ("red_wool", (190, 30, 40)), ("red_carpet", (170, 30, 40)), ("banner", (170, 30, 40)), ("shroomlight", (240, 150, 70)),
          ("deepslate", (70, 70, 80)), ("basalt", (85, 85, 90)), ("blackstone", (45, 40, 48)), ("path", (150, 120, 80)),
          ("gravel", (130, 125, 120)), ("dirt", (120, 90, 60)), ("iron_bars", (200, 200, 210)), ("cobble", (110, 115, 110)),
          ("andesite", (135, 135, 135)), ("stone", (120, 120, 120)), ("lantern", (250, 220, 120)), ("campfire", (240, 120, 40)),
          ("mushroom", (180, 60, 50)), ("poppy", (200, 40, 40)), ("orchid", (60, 140, 220)), ("lily", (240, 240, 240)),
          ("chain", (60, 60, 70)), ("fence", (70, 50, 35)), ("wall", (60, 55, 62))]


def col(state):
    s = state.split("[")[0]
    for k, c in COLORS:
        if k in s:
            return c
    return (150, 150, 150)


def previews(path):
    from PIL import Image
    inv = {v: k for k, v in palette.items()}
    img = Image.new("RGB", (W, L))
    px = img.load()
    nz = vox != 0
    top = H - 1 - np.argmax(nz[::-1, :, :], axis=0)
    for Z in range(L):
        for X in range(W):
            y = top[Z, X]
            c = col(inv[int(vox[y, Z, X])])
            shade = 0.6 + 0.4 * min(1.0, y / (G + 40))
            px[X, Z] = tuple(min(255, int(v * shade + 20)) for v in c)
    img.resize((W * 4, L * 4), Image.NEAREST).save(path)
    # Vue de face (depuis le sud), coupée au centre pour montrer le temple et la tour
    x0, x1 = C - 40, C + 41
    face = Image.new("RGB", (x1 - x0, H))
    fp = face.load()
    sky = (150, 190, 235)
    for X in range(x0, x1):
        for y in range(H):
            hit = np.nonzero(vox[y, C - 40:C + 41, X][::-1])[0]
            if hit.size == 0:
                fp[X - x0, H - 1 - y] = sky
                continue
            Z = C + 40 - hit[0]
            c = col(inv[int(vox[y, Z, X])])
            depth = (C + 40 - Z) / 80.0
            fp[X - x0, H - 1 - y] = tuple(int(v * (1 - 0.5 * depth) + sky[i] * 0.5 * depth) for i, v in enumerate(c))
    face.resize(((x1 - x0) * 6, H * 6), Image.NEAREST).save(path.replace(".png", "-face.png"))


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    path = walk_check()
    spawns = spawn_points()
    write_schem(os.path.join(out, "forteresse.schem"))
    o = G + 1
    layout = {
        "name": "Forteresse de VÆLORIA — le Temple-Tour",
        "size": [W, H, L],
        "origin": "centre de la tour, au niveau du sol de la forêt (on s'y tient)",
        "gates": GATES,
        "summit": {"min": [-13, TOP_Y - o, -13], "max": [13, TOP_Y + 16 - o, 13]},
        "fortress": {"min": [-22, FLOOR - o, -22], "max": [22, H - 1 - o, 22]},
        "arena": {"min": [-C, -o, -C], "max": [C, H - 1 - o, C]},
        "spawns": [{"x": x, "y": y, "z": z} for x, y, z in spawns],
        "lobby": {"x": 0, "y": surface(0, 40) + 1 - o, "z": 40},
    }
    with open(os.path.join(out, "layout.json"), "w", encoding="utf-8") as f:
        json.dump(layout, f, ensure_ascii=False, indent=1)
    # Chemin réduit aux virages (pour les essais avec des bots)
    pts = [(p[0], p[1] - o, p[2]) for p in path]
    keep = [pts[0]]
    for i in range(1, len(pts) - 1):
        a, b, c = pts[i - 1], pts[i], pts[i + 1]
        if (b[0] - a[0], b[2] - a[2]) != (c[0] - b[0], c[2] - b[2]):
            keep.append(b)
    keep.append(pts[-1])
    with open(os.path.join(out, "chemin.json"), "w", encoding="utf-8") as f:
        json.dump(keep, f)
    if "--sans-apercu" not in sys.argv:
        previews(os.path.join(out, "apercu.png"))
    print(f"forteresse.schem : {W}×{H}×{L}, {len(palette)} états de bloc, {int(np.count_nonzero(vox))} blocs posés")
    print(f"sommet à {TOP_Y + 1 - o} blocs au-dessus du sol ; chemin de la porte sud au sommet : {len(path)} pas ; {len(spawns)} points d'apparition")


if __name__ == "__main__":
    main()
