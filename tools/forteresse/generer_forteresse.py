#!/usr/bin/env python3
"""
Générateur de la Forteresse de VÆLORIA et de sa map (schematic Sponge v2, lisible par WorldEdit et par VæloriaFactions).

  python3 generer_forteresse.py <dossier_de_sortie>

Produit : forteresse.schem, layout.json (positions des portes, du sommet, des camps…, relatives à l'origine)
et apercu.png (vue du dessus).

Repère : l'origine du schematic est le centre de la forteresse, au niveau du sol (là où l'on se tient).
x vers l'est, z vers le sud, y vers le haut. Les portes sont FERMÉES dans le schematic (herses en fer).
"""
import gzip, io, json, math, os, random, struct, sys

import numpy as np

W = L = 241          # largeur / longueur (x / z)
H = 72               # hauteur
C = 120              # centre (x = z = C)
G = 8                # bloc d'herbe de surface au centre ; on se tient en G + 1
DATA_VERSION = 4189  # Minecraft 1.21.4
SEED = 1789

rnd = random.Random(SEED)
palette = {"minecraft:air": 0}
vox = np.zeros((H, L, W), dtype=np.uint16)  # [y][z][x]


def bid(state):
    if state not in palette:
        palette[state] = len(palette)
    return palette[state]


def setb(x, y, z, state):
    """Coordonnées relatives au centre : x, z dans [-120, 120], y absolu dans le schematic."""
    X, Z = x + C, z + C
    if 0 <= X < W and 0 <= Z < L and 0 <= y < H:
        vox[y, Z, X] = bid(state)


def getb(x, y, z):
    X, Z = x + C, z + C
    if 0 <= X < W and 0 <= Z < L and 0 <= y < H:
        return int(vox[y, Z, X])
    return 0


def fill(x1, y1, z1, x2, y2, z2, state):
    for x in range(min(x1, x2), max(x1, x2) + 1):
        for z in range(min(z1, z2), max(z1, z2) + 1):
            for y in range(min(y1, y2), max(y1, y2) + 1):
                setb(x, y, z, state)


AIR = "minecraft:air"
STONE_MIX = ["minecraft:stone_bricks"] * 7 + ["minecraft:mossy_stone_bricks", "minecraft:cracked_stone_bricks", "minecraft:andesite"]
KEEP_MIX = ["minecraft:deepslate_bricks"] * 6 + ["minecraft:cracked_deepslate_bricks", "minecraft:deepslate_tiles", "minecraft:polished_deepslate"]


def stone():
    return rnd.choice(STONE_MIX)


def keepstone():
    return rnd.choice(KEEP_MIX)


def stairs(mat, facing):
    return f"minecraft:{mat}_stairs[facing={facing},half=bottom,shape=straight,waterlogged=false]"


# ───────────────────────────── Terrain ─────────────────────────────

def value_noise(size, cell, seed):
    r = np.random.default_rng(seed)
    g = r.random((size // cell + 3, size // cell + 3))
    xs = np.arange(size) / cell
    i = xs.astype(int)
    f = xs - i
    f = f * f * (3 - 2 * f)
    a = g[np.ix_(i, i)]; b = g[np.ix_(i, i + 1)]; c = g[np.ix_(i + 1, i)]; d = g[np.ix_(i + 1, i + 1)]
    fx = f[None, :]; fz = f[:, None]
    return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz


n1 = value_noise(W, 24, SEED)
n2 = value_noise(W, 9, SEED + 1)
xs = np.arange(W) - C
DX, DZ = np.meshgrid(xs, xs)            # DX[z][x]
box = np.maximum(np.abs(DX), np.abs(DZ))
rad = np.sqrt(DX ** 2 + DZ ** 2)

height = G + (n1 * 3 + n2 * 1.5 - 2).round()                        # plaine légèrement vallonnée
edge = np.clip((box - 98) / 20.0, 0, 1)                              # montagnes de bordure
height = height + (edge ** 1.6 * (26 + n1 * 14)).round()
flat = np.clip(1 - (box - 44) / 10.0, 0, 1)                          # aplanir autour de la forteresse
height = (height * (1 - flat) + G * flat).round()
height = np.clip(height, 3, H - 8).astype(int)

CAMPS = [("red", 0, -88, "north"), ("blue", 88, 0, "east"), ("green", 0, 88, "south"), ("yellow", -88, 0, "west")]
for _, cx, cz, _ in CAMPS:                                           # aplanir les camps
    d = np.sqrt((DX - cx) ** 2 + (DZ - cz) ** 2)
    k = np.clip(1 - (d - 12) / 8.0, 0, 1)
    height = (height * (1 - k) + G * k).round().astype(int)

for Z in range(L):
    for X in range(W):
        h = height[Z, X]
        top = "minecraft:grass_block[snowy=false]"
        if h >= G + 18:
            top = "minecraft:snow_block" if n2[Z, X] > 0.55 else "minecraft:stone"
        elif h >= G + 12:
            top = rnd.choice(["minecraft:stone", "minecraft:andesite", "minecraft:grass_block[snowy=false]", "minecraft:coarse_dirt"])
        vox[0:max(0, h - 3), Z, X] = bid("minecraft:stone")
        vox[max(0, h - 3):h, Z, X] = bid("minecraft:dirt")
        vox[h, Z, X] = bid(top)


def surface(x, z):
    return int(height[z + C, x + C])


# Chemins des camps vers les ponts
def path(x1, z1, x2, z2, w=1):
    steps = max(abs(x2 - x1), abs(z2 - z1))
    for i in range(steps + 1):
        x = round(x1 + (x2 - x1) * i / steps); z = round(z1 + (z2 - z1) * i / steps)
        for a in range(-w, w + 1):
            for b in range(-w, w + 1):
                y = surface(x + a, z + b)
                if y <= G + 2:
                    setb(x + a, y, z + b, rnd.choice(["minecraft:gravel", "minecraft:coarse_dirt", "minecraft:dirt_path", "minecraft:dirt_path"]))


for _, cx, cz, _ in CAMPS:
    path(cx, cz, round(cx * 0.48), round(cz * 0.48))

# ───────────────────────────── Douves et ponts ─────────────────────────────
for z in range(-42, 43):
    for x in range(-42, 43):
        b = max(abs(x), abs(z))
        if 37 <= b <= 41:
            for y in range(G - 4, G + 1):
                setb(x, y, z, "minecraft:water[level=0]")
            setb(x, G - 5, z, "minecraft:gravel")
        elif b in (36, 42):
            setb(x, G, z, "minecraft:stone_bricks")
        elif 31 <= b <= 35:
            setb(x, G, z, rnd.choice(["minecraft:stone_bricks", "minecraft:stone_bricks", "minecraft:polished_andesite", "minecraft:cobblestone"]))

GATE_SIDES = {"north": (0, -1), "south": (0, 1), "west": (-1, 0), "east": (1, 0)}


def side_xyz(side, along, out):
    """Point d'un côté : 'along' le long du mur, 'out' la distance au centre."""
    sx, sz = GATE_SIDES[side]
    return (out * sx + along * (1 if sz != 0 else 0), out * sz + along * (1 if sx != 0 else 0))


for side in GATE_SIDES:
    for out in range(34, 45):
        for a in range(-3, 4):
            x, z = side_xyz(side, a, out)
            setb(x, G, z, "minecraft:spruce_planks")
            if abs(a) == 3:
                setb(x, G + 1, z, "minecraft:spruce_fence")
        x, z = side_xyz(side, -3, out)
        if out % 3 == 0:
            setb(x, G + 2, z, "minecraft:lantern[hanging=false,waterlogged=false]")

# ───────────────────────────── Rempart ─────────────────────────────
WALL_TOP = G + 18
for z in range(-30, 31):
    for x in range(-30, 31):
        b = max(abs(x), abs(z))
        if 28 <= b <= 30:
            for y in range(G + 1, WALL_TOP + 1):
                setb(x, y, z, stone())
            if b == 30 and (x + z) % 2 == 0:                         # merlons extérieurs
                setb(x, WALL_TOP + 1, z, stone())
                setb(x, WALL_TOP + 2, z, "minecraft:stone_brick_slab[type=bottom,waterlogged=false]")
            if b == 28 and (x * 3 + z) % 9 == 0:
                setb(x, WALL_TOP + 1, z, "minecraft:lantern[hanging=false,waterlogged=false]")
        elif b < 28:
            setb(x, G, z, rnd.choice(["minecraft:cobblestone", "minecraft:stone_bricks", "minecraft:gravel", "minecraft:mossy_cobblestone"]))

# Meurtrières (1×1, infranchissables)
for y in (G + 6, G + 12):
    for i in range(-24, 25, 4):
        for side in GATE_SIDES:
            if abs(i) <= 6:
                continue
            x, z = side_xyz(side, i, 30)
            setb(x, y, z, AIR)

# ───────────────────────────── Portes (châtelets) ─────────────────────────────
GATES = []
for side, (sx, sz) in GATE_SIDES.items():
    axis_x = sz != 0  # porte nord/sud : le mur court le long de x
    for out in range(27, 34):
        for a in range(-6, 7):
            x, z = side_xyz(side, a, out)
            top = G + 23 if abs(a) >= 4 else G + 21
            for y in range(G + 1, top + 1):
                setb(x, y, z, stone())
            if out in (27, 33) or abs(a) == 6:
                if (a + out) % 2 == 0:
                    setb(x, top + 1, z, stone())
    # Passage 5 × 7
    for out in range(27, 34):
        for a in range(-2, 3):
            x, z = side_xyz(side, a, out)
            for y in range(G + 1, G + 8):
                setb(x, y, z, AIR)
            setb(x, G, z, "minecraft:polished_andesite")
    # Herse (fermée dans le schematic)
    bars = "minecraft:iron_bars[east=true,north=false,south=false,waterlogged=false,west=true]" if axis_x \
        else "minecraft:iron_bars[east=false,north=true,south=true,waterlogged=false,west=false]"
    cells = []
    for a in range(-2, 3):
        x, z = side_xyz(side, a, 31)
        for y in range(G + 1, G + 8):
            setb(x, y, z, bars)
            cells.append((x, y, z))
    xs_ = [c[0] for c in cells]; ys_ = [c[1] for c in cells]; zs_ = [c[2] for c in cells]
    GATES.append({"name": side, "min": [min(xs_), min(ys_) - (G + 1), min(zs_)], "max": [max(xs_), max(ys_) - (G + 1), max(zs_)],
                  "block": bars})
    # Lanternes de part et d'autre
    for a in (-4, 4):
        x, z = side_xyz(side, a, 34)
        setb(x, G + 1, z, "minecraft:stone_bricks")
        setb(x, G + 2, z, "minecraft:lantern[hanging=false,waterlogged=false]")

# ───────────────────────────── Tours d'angle ─────────────────────────────
TOWER_TOP = G + 28
for tx in (-29, 29):
    for tz in (-29, 29):
        for z in range(tz - 6, tz + 7):
            for x in range(tx - 6, tx + 7):
                d = math.hypot(x - tx, z - tz)
                if d <= 6.3:
                    for y in range(G + 1, TOWER_TOP + 1):
                        setb(x, y, z, stone() if d > 4.3 else AIR)
                    setb(x, TOWER_TOP, z, "minecraft:spruce_planks" if d <= 4.3 else stone())
                    if 5.4 < d <= 6.3 and (x + z) % 2 == 0:
                        setb(x, TOWER_TOP + 1, z, stone())
        # Accès : porte côté cour, ouvertures sur le chemin de ronde, échelle centrale
        ix, iz = (1 if tx < 0 else -1), (1 if tz < 0 else -1)
        for k in range(4, 7):
            for y in (G + 1, G + 2, G + 3):
                setb(tx + ix * k, y, tz + iz * k, AIR)
            for y in (WALL_TOP + 1, WALL_TOP + 2):
                setb(tx + ix * k, y, tz, AIR)
                setb(tx, y, tz + iz * k, AIR)
        # Échelle collée à un pilier central
        for y in range(G + 1, TOWER_TOP + 1):
            setb(tx, y, tz, "minecraft:stone_bricks")
            setb(tx + ix, y, tz, f"minecraft:ladder[facing={'east' if ix > 0 else 'west'},waterlogged=false]")
        setb(tx + ix, TOWER_TOP, tz, AIR)
        setb(tx, TOWER_TOP + 1, tz, "minecraft:lantern[hanging=false,waterlogged=false]")

# ───────────────────────────── Cour ─────────────────────────────
# Puits
for x in range(-17, -12):
    for z in range(13, 18):
        edge_ = x in (-17, -13) or z in (13, 17)
        setb(x, G + 1, z, "minecraft:cobblestone" if edge_ else "minecraft:water[level=0]")
# Barils, foin, chariot
for (x, z) in [(14, 15), (15, 15), (14, 16), (16, 14), (-15, -15), (-16, -15), (15, -16)]:
    setb(x, G + 1, z, "minecraft:barrel[facing=up,open=false]")
for (x, z) in [(18, 18), (19, 18), (18, 19), (-19, 19), (-19, 18), (19, -19)]:
    setb(x, G + 1, z, "minecraft:hay_block[axis=y]")
    if (x + z) % 2 == 0:
        setb(x, G + 2, z, "minecraft:hay_block[axis=y]")
# Lanternes de cour sur poteaux
for (x, z) in [(-20, 0), (20, 0), (0, -20), (0, 20), (-20, -20), (20, 20), (20, -20), (-20, 20)]:
    for y in range(G + 1, G + 4):
        setb(x, y, z, "minecraft:spruce_fence")
    setb(x, G + 4, z, "minecraft:lantern[hanging=false,waterlogged=false]")

# ───────────────────────────── Donjon ─────────────────────────────
KR = 12                 # demi-côté extérieur
ROOF = G + 46           # dalle du sommet (on s'y tient en ROOF + 1)
for z in range(-KR, KR + 1):
    for x in range(-KR, KR + 1):
        b = max(abs(x), abs(z))
        if b >= 11:
            for y in range(G + 1, ROOF + 1):
                setb(x, y, z, keepstone())
        else:
            setb(x, G, z, "minecraft:polished_andesite" if (x + z) % 2 else "minecraft:polished_diorite")
        setb(x, ROOF, z, "minecraft:polished_deepslate" if b < 11 else keepstone())
# Portes du donjon (3 × 4), une par côté
for side in GATE_SIDES:
    for out in (11, 12):
        for a in range(-1, 2):
            x, z = side_xyz(side, a, out)
            for y in range(G + 1, G + 5):
                setb(x, y, z, AIR)
# Fenêtres étroites (1 × 1)
for y in range(G + 8, ROOF - 2, 6):
    for i in range(-8, 9, 4):
        for side in GATE_SIDES:
            x, z = side_xyz(side, i, 12)
            setb(x, y, z, AIR)
            x, z = side_xyz(side, i, 11)
            setb(x, y, z, AIR)

# Grand escalier intérieur, le long des murs : ouest (vers le nord), nord (vers l'est), est (vers le sud).
ramp = []  # (x, z, h, facing) pour la ligne centrale
h = 0
segments = [("west", "north", [(-9, z) for z in range(8, -9, -1)]),
            ("north", "east", [(x, -9) for x in range(-8, 9)]),
            ("east", "south", [(9, z) for z in range(-8, 9)])]
for name, facing, cells in segments:
    for (x, z) in cells:
        h += 1
        if h > 45:
            break
        ramp.append((x, z, h, facing))
    if h > 45:
        break
    # palier d'angle : même hauteur
STEP_BLOCK = {"north": (0, -1), "east": (1, 0), "south": (0, 1)}
for (x, z, hh, facing) in ramp:
    across = [(x + d, z) for d in (-1, 0, 1)] if facing in ("north", "south") else [(x, z + d) for d in (-1, 0, 1)]
    for (ax, az) in across:
        setb(ax, G + hh, az, stairs("stone_brick", facing))
        setb(ax, G + hh - 1, az, "minecraft:stone_bricks")
        if hh >= 40:                       # trappe de sortie dans le toit
            for y in range(G + hh + 1, ROOF + 1):
                setb(ax, y, az, AIR)
    # garde-corps côté vide
    if facing == "north":
        setb(x + 2, G + hh + 1, z, "minecraft:stone_brick_wall")
    elif facing == "east":
        setb(x, G + hh + 1, z + 2, "minecraft:stone_brick_wall")
    else:
        setb(x - 2, G + hh + 1, z, "minecraft:stone_brick_wall")
    if hh % 5 == 0:  # lanternes sur la rambarde
        rx, rz = (x + 2, z) if facing == "north" else (x, z + 2) if facing == "east" else (x - 2, z)
        setb(rx, G + hh + 2, rz, "minecraft:lantern[hanging=false,waterlogged=false]")
# Paliers d'angle (nord-ouest, nord-est)
corner_h = {}
for i in range(1, len(ramp)):
    if ramp[i][3] != ramp[i - 1][3]:
        corner_h[ramp[i - 1][3]] = ramp[i - 1][2]
# Le palier prolonge la dernière marche à la même hauteur (dessus = haut de cette marche) : aucun saut à faire.
h1 = corner_h.get("north", 17)
fill(-10, G + h1 - 1, -10, -8, G + h1, -9, "minecraft:stone_bricks")
h2 = corner_h.get("east", 34)
fill(9, G + h2 - 1, -10, 10, G + h2, -9, "minecraft:stone_bricks")
# Sortie sur le toit : une dernière marche au niveau du toit
lx, lz, lh, lf = ramp[-1]
for d in (-1, 0, 1):
    setb(lx + d, ROOF, lz + 1, stairs("stone_brick", "south"))
# Éclairage du rez-de-chaussée du donjon
for (x, z) in [(-5, 5), (5, 5), (-5, -5), (5, -5)]:
    setb(x, G + 1, z, "minecraft:stone_bricks")
    setb(x, G + 2, z, "minecraft:lantern[hanging=false,waterlogged=false]")
# Lustre central
for y in range(G + 30, ROOF):
    setb(0, y, 0, "minecraft:chain[axis=y,waterlogged=false]")
setb(0, G + 29, 0, "minecraft:lantern[hanging=true,waterlogged=false]")

# Sommet : créneaux, tourelles d'angle, abris et mât central
for z in range(-KR, KR + 1):
    for x in range(-KR, KR + 1):
        b = max(abs(x), abs(z))
        if b == KR and (x + z) % 2 == 0:
            setb(x, ROOF + 1, z, keepstone())
        if b == KR:
            setb(x, ROOF + 1, z, getb(x, ROOF + 1, z) and keepstone() or "minecraft:deepslate_brick_slab[type=bottom,waterlogged=false]")
for (tx, tz) in [(-10, -10), (10, -10), (-10, 10), (10, 10)]:
    fill(tx - 1, ROOF + 1, tz - 1, tx + 1, ROOF + 4, tz + 1, "minecraft:deepslate_tiles")
    setb(tx, ROOF + 5, tz, "minecraft:lantern[hanging=false,waterlogged=false]")
for (x1, z1, x2, z2) in [(-5, -3, -5, 3), (5, -3, 5, 3), (-2, -6, 2, -6), (-2, 6, 2, 6)]:
    fill(x1, ROOF + 1, z1, x2, ROOF + 1, z2, "minecraft:cobbled_deepslate_wall")
for y in range(ROOF + 1, ROOF + 9):
    setb(0, y, 0, "minecraft:dark_oak_fence")
fill(-1, ROOF + 1, -1, 1, ROOF + 1, 1, "minecraft:gold_block")
setb(0, ROOF + 1, 0, "minecraft:gold_block")
for y in range(ROOF + 6, ROOF + 9):
    setb(1, y, 0, "minecraft:red_wool")
    setb(2, y, 0, "minecraft:red_wool" if y != ROOF + 7 else "minecraft:white_wool")
setb(0, ROOF + 9, 0, "minecraft:lantern[hanging=false,waterlogged=false]")

# ───────────────────────────── Camps d'équipe ─────────────────────────────
for color, cx, cz, facing_out in CAMPS:
    y0 = G
    for z in range(cz - 11, cz + 12):
        for x in range(cx - 11, cx + 12):
            d = math.hypot(x - cx, z - cz)
            if d <= 11.4:
                setb(x, y0, z, "minecraft:grass_block[snowy=false]" if d > 4 else "minecraft:coarse_dirt")
                for y in range(y0 + 1, y0 + 8):
                    if getb(x, y, z) != 0:
                        setb(x, y, z, AIR)
            if 10.4 <= d <= 11.4:
                # palissade, ouverte vers la forteresse
                toward = math.atan2(-cz, -cx)
                ang = math.atan2(z - cz, x - cx)
                diff = abs((ang - toward + math.pi) % (2 * math.pi) - math.pi)
                if diff > 0.45:
                    for y in range(y0 + 1, y0 + 4 + ((x + z) % 2)):
                        setb(x, y, z, "minecraft:spruce_log[axis=y]")
    # Plateforme d'apparition 3 × 3 aux couleurs de l'équipe
    fill(cx - 1, y0, cz - 1, cx + 1, y0, cz + 1, f"minecraft:{color}_concrete")
    # Feu de camp et tentes
    setb(cx + 4, y0 + 1, cz + 4, "minecraft:campfire[facing=north,lit=true,signal_fire=false,waterlogged=false]")
    for (tx, tz) in [(cx - 6, cz - 3), (cx - 6, cz + 3), (cx + 6, cz - 3)]:
        for i, w_ in enumerate((2, 1, 0)):
            for dx in range(-w_, w_ + 1):
                for dz in range(-2, 3):
                    setb(tx + dx, y0 + 1 + i, tz + dz, f"minecraft:{color}_wool")
        for dz in range(-2, 3):
            setb(tx, y0 + 1, tz + dz, AIR)
    # Mâts aux couleurs
    for (px, pz) in [(cx - 3, cz - 8), (cx + 3, cz - 8), (cx - 3, cz + 8), (cx + 3, cz + 8)]:
        for y in range(y0 + 1, y0 + 6):
            setb(px, y, pz, "minecraft:spruce_fence")
        setb(px, y0 + 6, pz, f"minecraft:{color}_wool")
        setb(px, y0 + 7, pz, "minecraft:lantern[hanging=false,waterlogged=false]")
    # Coffres de ravitaillement vides et établi
    setb(cx + 6, y0 + 1, cz + 3, "minecraft:crafting_table")
    setb(cx + 7, y0 + 1, cz + 3, "minecraft:barrel[facing=up,open=false]")

# ───────────────────────────── Couverts : ruines, rochers, arbres ─────────────────────────────
def free_spot(x, z):
    b = max(abs(x), abs(z))
    if b < 46 or b > 104:
        return False
    for _, cx, cz, _ in CAMPS:
        if math.hypot(x - cx, z - cz) < 16:
            return False
    for _, cx, cz, _ in CAMPS:  # pas sur les chemins
        t = max(0.0, min(1.0, ((x - cx) * (-cx) + (z - cz) * (-cz)) / (cx * cx + cz * cz)))
        px, pz = cx + (-cx) * t, cz + (-cz) * t
        if math.hypot(x - px, z - pz) < 4 and t < 0.55:
            return False
    return True


def tree(x, z):
    y = surface(x, z)
    hgt = rnd.randint(5, 7)
    for dy in range(1, hgt + 1):
        setb(x, y + dy, z, "minecraft:oak_log[axis=y]")
    for dx in range(-2, 3):
        for dz in range(-2, 3):
            for dy in range(hgt - 2, hgt + 2):
                if abs(dx) + abs(dz) + max(0, dy - hgt) * 2 <= 3 and getb(x + dx, y + dy, z + dz) == 0:
                    setb(x + dx, y + dy, z + dz, "minecraft:oak_leaves[distance=1,persistent=true,waterlogged=false]")


def ruin(x, z):
    y = surface(x, z)
    horizontal = rnd.random() < 0.5
    length = rnd.randint(5, 9)
    for i in range(length):
        px, pz = (x + i, z) if horizontal else (x, z + i)
        top = rnd.randint(1, 4)
        for dy in range(1, top + 1):
            setb(px, surface(px, pz) + dy, pz, rnd.choice(["minecraft:cobblestone", "minecraft:mossy_cobblestone", "minecraft:stone_bricks", "minecraft:cracked_stone_bricks"]))


def boulder(x, z):
    y = surface(x, z)
    r = rnd.uniform(1.5, 2.6)
    for dx in range(-3, 4):
        for dz in range(-3, 4):
            for dy in range(0, 4):
                if dx * dx + dz * dz + (dy * 1.4) ** 2 <= r * r:
                    setb(x + dx, y + dy, z + dz, rnd.choice(["minecraft:stone", "minecraft:andesite", "minecraft:cobblestone"]))


placed = 0
tries = 0
while placed < 150 and tries < 5000:
    tries += 1
    x, z = rnd.randint(-104, 104), rnd.randint(-104, 104)
    if not free_spot(x, z) or surface(x, z) > G + 6:
        continue
    k = rnd.random()
    (tree if k < 0.5 else ruin if k < 0.8 else boulder)(x, z)
    placed += 1
for _ in range(40):
    x, z = rnd.randint(-100, 100), rnd.randint(-100, 100)
    if free_spot(x, z):
        y = surface(x, z)
        setb(x, y + 1, z, "minecraft:hay_block[axis=y]")

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
        data = b"".join(varint(int(v)) for v in flat_)
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


def preview(path):
    from PIL import Image
    colors = {}
    def col(state):
        s = state.split("[")[0]
        table = [("water", (52, 95, 190)), ("grass_block", (95, 150, 60)), ("leaves", (50, 105, 40)), ("oak_log", (100, 80, 50)),
                 ("snow", (240, 240, 240)), ("deepslate", (60, 60, 70)), ("gold", (240, 200, 60)), ("red_", (190, 40, 40)),
                 ("blue_", (50, 80, 190)), ("green_", (60, 150, 60)), ("yellow_", (230, 200, 50)), ("spruce", (110, 80, 50)),
                 ("path", (150, 120, 80)), ("gravel", (130, 125, 120)), ("dirt", (120, 90, 60)), ("hay", (210, 180, 60)),
                 ("iron_bars", (200, 200, 210)), ("stone_brick", (125, 125, 125)), ("cobble", (110, 110, 110)), ("andesite", (135, 135, 135)),
                 ("stone", (120, 120, 120)), ("diorite", (190, 190, 190)), ("lantern", (250, 220, 120)), ("campfire", (240, 120, 40))]
        for k, c in table:
            if k in s:
                return c
        return (150, 150, 150)
    inv = {v: k for k, v in palette.items()}
    img = Image.new("RGB", (W, L))
    px = img.load()
    nz = vox != 0
    top = H - 1 - np.argmax(nz[::-1, :, :], axis=0)
    for Z in range(L):
        for X in range(W):
            y = top[Z, X]
            c = col(inv[int(vox[y, Z, X])])
            shade = 0.65 + 0.35 * (y / H)
            px[X, Z] = tuple(min(255, int(v * shade + 25)) for v in c)
    img = img.resize((W * 4, L * 4), Image.NEAREST)
    img.save(path)
    # Vue de face (depuis le sud) de la forteresse : premier bloc rencontré en regardant vers le nord.
    x0, x1 = C - 48, C + 48
    face = Image.new("RGB", (x1 - x0, H))
    fp = face.load()
    sky = (150, 190, 235)
    for X in range(x0, x1):
        for y in range(H):
            col_ = vox[y, :, X]
            hit = np.nonzero(col_[C - 48:C + 49][::-1])[0]
            if hit.size == 0:
                fp[X - x0, H - 1 - y] = sky
                continue
            Z = C + 48 - hit[0]
            c = col(inv[int(vox[y, Z, X])])
            depth = (C + 48 - Z) / 96.0
            fp[X - x0, H - 1 - y] = tuple(int(v * (1 - 0.45 * depth) + sky[i] * 0.45 * depth) for i, v in enumerate(c))
    face.resize(((x1 - x0) * 8, H * 8), Image.NEAREST).save(path.replace(".png", "-face.png"))


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    write_schem(os.path.join(out, "forteresse.schem"))
    camps = [{"team": color, "x": cx, "y": int(surface(cx, cz)) + 1 - (G + 1), "z": cz,
              "yaw": round(math.degrees(math.atan2(cx, -cz))) % 360} for color, cx, cz, _ in CAMPS]
    layout = {
        "name": "Forteresse de VÆLORIA",
        "size": [W, H, L],
        "origin": "centre de la forteresse, au niveau du sol (on s'y tient)",
        "gates": GATES,
        "summit": {"min": [-KR, ROOF - (G + 1), -KR], "max": [KR, ROOF + 10 - (G + 1), KR]},
        "fortress": {"min": [-34, -2, -34], "max": [34, 64, 34]},
        "camps": camps,
        "arena": {"min": [-C, -(G + 1), -C], "max": [C, H - 1 - (G + 1), C]},
        "lobby": {"x": 0, "y": int(surface(0, -48)) + 1 - (G + 1), "z": -48},
        "warzone_radius_chunks": 7,
    }
    with open(os.path.join(out, "layout.json"), "w", encoding="utf-8") as f:
        json.dump(layout, f, ensure_ascii=False, indent=2)
    preview(os.path.join(out, "apercu.png"))
    used = int(np.count_nonzero(vox))
    print(f"forteresse.schem : {W}×{H}×{L}, {len(palette)} états de bloc, {used} blocs posés")
    print(f"escalier : {len(ramp)} marches, sommet à y relatif {ROOF - (G + 1)}")


if __name__ == "__main__":
    main()
