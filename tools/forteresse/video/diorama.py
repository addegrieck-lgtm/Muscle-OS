"""Maquettes voxel de la bande-annonce Faction, rendues en isométrique :
- bases.png / bases_raid.png : la base des Loups (rempart, coffre-fort en obsidienne) face au canon à TNT des Lions,
  avant et après le pillage ;
- warzone.png : KOTH, Totem, point de chute du convoi et avant-poste.

  python3 diorama.py <dossier_de_sortie>
Écrit aussi dioramas.json (taille, échelle, décalages) pour placer des éléments animés sur les images.
"""
import json, math, random, sys
import numpy as np
from PIL import Image, ImageDraw

OUT = sys.argv[1]
rnd = random.Random(7)

BASE = [("obsidian", (28, 20, 44)), ("crying", (60, 20, 110)), ("tnt", (200, 50, 40)), ("chest", (164, 112, 48)),
        ("stone_bricks", (128, 128, 130)), ("cracked", (104, 104, 106)), ("mossy", (98, 116, 92)), ("cobble", (112, 114, 112)),
        ("oak_planks", (170, 130, 80)), ("spruce_planks", (114, 84, 52)), ("dark_oak", (70, 50, 30)), ("_log", (92, 70, 46)),
        ("leaves", (64, 118, 46)), ("grass", (98, 148, 62)), ("dirt", (118, 88, 58)), ("coarse", (100, 80, 56)), ("stone", (120, 122, 124)),
        ("gravel", (128, 124, 120)), ("sand", (214, 200, 150)), ("water", (52, 96, 196)), ("blue_wool", (50, 90, 210)),
        ("blue_concrete", (44, 72, 160)), ("red_wool", (196, 34, 44)), ("red_concrete", (150, 30, 34)), ("white_wool", (236, 236, 236)),
        ("gold", (246, 204, 70)), ("yellow", (240, 196, 40)), ("beacon", (130, 230, 230)), ("glass", (200, 230, 240)),
        ("gilded", (150, 112, 52)), ("blackstone", (44, 40, 48)), ("lantern", (255, 214, 120)), ("coal", (34, 34, 36)),
        ("netherrack", (110, 50, 50)), ("magma", (190, 80, 30)), ("dispenser", (110, 110, 112)), ("iron", (210, 210, 214)),
        ("fence", (70, 50, 34)), ("hay", (210, 180, 60)), ("path", (152, 122, 80))]
EMISSIVE = ("lantern", "beacon", "magma", "gold")


class Scene:
    def __init__(self, w, h, l):
        self.w, self.h, self.l = w, h, l
        self.v = np.zeros((h, l, w), dtype=np.uint16)
        self.pal = {"air": 0}

    def id(self, name):
        if name not in self.pal:
            self.pal[name] = len(self.pal)
        return self.pal[name]

    def set(self, x, y, z, name):
        if 0 <= x < self.w and 0 <= y < self.h and 0 <= z < self.l:
            self.v[y, z, x] = self.id(name)

    def get(self, x, y, z):
        if 0 <= x < self.w and 0 <= y < self.h and 0 <= z < self.l:
            return int(self.v[y, z, x])
        return 0

    def fill(self, x1, y1, z1, x2, y2, z2, name):
        for x in range(min(x1, x2), max(x1, x2) + 1):
            for z in range(min(z1, z2), max(z1, z2) + 1):
                for y in range(min(y1, y2), max(y1, y2) + 1):
                    self.set(x, y, z, name)

    def ground(self, top, mat="grass", noise=True):
        for z in range(self.l):
            for x in range(self.w):
                h = top + (1 if noise and rnd.random() < 0.03 else 0)
                for y in range(0, h):
                    self.set(x, y, z, "dirt" if y < h - 1 else ("coarse" if rnd.random() < 0.06 else mat))

    def tree(self, x, z, y):
        h = rnd.randint(4, 6)
        for dy in range(1, h + 1):
            self.set(x, y + dy, z, "oak_log")
        for dx in range(-2, 3):
            for dz in range(-2, 3):
                for dy in range(h - 1, h + 2):
                    if abs(dx) + abs(dz) + max(0, dy - h) * 2 <= 3 and self.get(x + dx, y + dy, z + dz) == 0:
                        self.set(x + dx, y + dy, z + dz, "leaves")


def color(name):
    for k, c in BASE:
        if k in name:
            return np.array(c, np.float32)
    return np.array((150, 150, 150), np.float32)


def render(sc, scale, path):
    names = {v: k for k, v in sc.pal.items()}
    COL = np.array([color(names[i]) for i in range(len(sc.pal))])
    emis = {i for i, n in names.items() if any(e in n for e in EMISSIVE)}
    v = sc.v
    solid = v != 0
    hh, ll, ww = v.shape
    pad = np.zeros((hh + 1, ll + 1, ww + 1), dtype=bool)
    pad[:hh, :ll, :ww] = solid
    exposed = solid & (~pad[1:, :ll, :ww] | ~pad[:hh, 1:, :ww] | ~pad[:hh, :ll, 1:])
    above = np.zeros_like(solid)
    acc = np.zeros((ll, ww), dtype=bool)
    for y in range(hh - 1, -1, -1):
        above[y] = acc
        acc |= solid[y]
    ys, zs, xs = np.nonzero(exposed)
    order = np.argsort(xs + zs + ys, kind="stable")
    ys, zs, xs = ys[order], zs[order], xs[order]
    c, s = 0.8660254, scale
    Wpx = int((ww + ll) * s * c) + 4
    Hpx = int((ww + ll) * s * 0.5 + hh * s) + 4
    ox, oy = ll * s * c + 2, hh * s + 2
    sw, sh = int(math.ceil(2 * s * c)) + 2, int(math.ceil(2 * s)) + 2
    Wpx, Hpx, ox, oy = Wpx + 2 * sw, Hpx + 2 * sh, ox + sw, oy + sh  # marge : aucun sprite ne déborde
    canvas = np.zeros((Hpx, Wpx, 3), np.float32)
    alpha = np.zeros((Hpx, Wpx), bool)

    def P(px, py, pz):
        return ((px - pz) * s * c, (px + pz) * s * 0.5 - py * s)

    bx, by = P(0, 1, 1)[0], P(0, 1, 0)[1]
    masks = []
    for poly in ([P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1)], [P(0, 1, 1), P(1, 1, 1), P(1, 0, 1), P(0, 0, 1)],
                 [P(1, 1, 0), P(1, 1, 1), P(1, 0, 1), P(1, 0, 0)]):
        im = Image.new("L", (sw, sh), 0)
        ImageDraw.Draw(im).polygon([(px - bx, py - by) for px, py in poly], fill=255)
        masks.append(np.array(im) > 127)
    for i in range(len(xs)):
        X, Y, Z = int(xs[i]), int(ys[i]), int(zs[i])
        b = int(v[Y, Z, X])
        px, py = P(X, Y, Z)
        sx, sy = int(round(px + bx + ox)), int(round(py + by + oy))
        base = COL[b] * (0.92 + 0.16 * ((X * 73856093 ^ Z * 19349663 ^ Y * 83492791) % 97) / 97.0)
        sub = canvas[sy:sy + sh, sx:sx + sw]
        sa = alpha[sy:sy + sh, sx:sx + sw]
        shadow = 0.72 if above[Y, Z, X] and b not in emis else 1.0
        for m, sd in zip(masks, (1.0, 0.80, 0.62)):
            sub[m] = base * (1.0 if b in emis else sd) * (shadow if sd == 1.0 else 1.0)
            sa[m] = True
    img = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    img.putalpha(Image.fromarray((alpha * 255).astype(np.uint8), "L"))
    img.save(path)
    return {"scale": s, "ox": ox, "oy": oy, "w": Wpx, "h": Hpx, "size": [ww, hh, ll]}


# ── Scène 1 : la base des Loups face au canon des Lions ──
def bases(raided):
    sc = Scene(80, 22, 56)
    G = 3
    sc.ground(G)
    # Base des Loups : rempart de pierre (cassable), coffre-fort d'obsidienne (indestructible)
    x0, z0, x1, z1 = 40, 10, 72, 46
    for x in range(x0, x1 + 1):
        for z in range(z0, z1 + 1):
            if x in (x0, x1) or z in (z0, z1):
                for y in range(G, G + 7):
                    sc.set(x, y, z, rnd.choice(["stone_bricks"] * 5 + ["cracked", "mossy"]))
                if (x + z) % 2 == 0:
                    sc.set(x, G + 7, z, "stone_bricks")
            elif rnd.random() < 0.15:
                sc.set(x, G - 1, z, "path")
    # Coffre-fort d'obsidienne
    vx0, vz0, vx1, vz1 = 50, 20, 60, 34
    for x in range(vx0, vx1 + 1):
        for z in range(vz0, vz1 + 1):
            for y in range(G, G + 6):
                edge = x in (vx0, vx1) or z in (vz0, vz1) or y == G + 5
                sc.set(x, y, z, ("crying_obsidian" if rnd.random() < 0.05 else "obsidian") if edge else "air")
    for (x, z) in [(52, 22), (53, 22), (55, 22), (56, 22), (52, 32), (54, 32)]:
        sc.set(x, G, z, "chest")
    # Maisonnette et bannières rouges des Loups
    sc.fill(64, G, 14, 70, G + 3, 18, "spruce_planks")
    sc.fill(64, G + 4, 14, 70, G + 4, 18, "dark_oak")
    for (x, z) in [(x0, z0), (x1, z0), (x0, z1), (x1, z1)]:
        sc.fill(x, G + 7, z, x, G + 9, z, "fence")
        sc.set(x, G + 10, z, "red_wool")
    # Camp des Lions et canon à TNT
    sc.fill(6, G, 18, 14, G + 9, 26, "stone_bricks")
    sc.fill(6, G + 10, 18, 14, G + 10, 26, "blue_concrete")
    for (x, z) in [(6, 18), (14, 18), (6, 26), (14, 26)]:
        sc.set(x, G + 11, z, "blue_wool")
    for x in range(18, 30):
        sc.set(x, G, 22, "stone_bricks")
        sc.set(x, G + 1, 22, "water" if x < 29 else "dispenser")
        sc.set(x, G, 21, "stone_bricks")
        sc.set(x, G, 23, "stone_bricks")
    for x in (20, 22, 24, 26):
        sc.set(x, G + 1, 21, "tnt")
        sc.set(x, G + 1, 23, "tnt")
    for (x, z) in [(4, 6), (10, 44), (24, 48), (30, 6), (2, 36), (76, 50), (76, 4), (34, 52)]:
        sc.tree(x, z, G - 1)
    if raided:
        # Cratères dans le rempart ouest et la cour : l'obsidienne, elle, tient.
        for (cx, cy, cz, r) in [(40, G + 3, 22, 4.2), (40, G + 2, 30, 3.6), (44, G + 1, 26, 3.4), (47, G + 2, 21, 2.8)]:
            for x in range(int(cx - r - 1), int(cx + r + 2)):
                for z in range(int(cz - r - 1), int(cz + r + 2)):
                    for y in range(max(0, int(cy - r)), int(cy + r + 1)):
                        d = math.sqrt((x - cx) ** 2 + (y - cy) ** 2 * 1.2 + (z - cz) ** 2)
                        cur = sc.get(x, y, z)
                        if cur and "obsidian" in [k for k, i in sc.pal.items() if i == cur][0]:
                            continue
                        if d < r:
                            sc.set(x, y, z, "air")
                        elif d < r + 0.9 and cur and rnd.random() < 0.6:
                            sc.set(x, y, z, "coal_block")
    return sc, G


# ── Scène 2 : la warzone et ses événements ──
def warzone():
    sc = Scene(96, 26, 96)
    G = 3
    sc.ground(G)
    for z in range(96):
        for x in range(96):
            if rnd.random() < 0.08:
                sc.set(x, G - 1, z, rnd.choice(["coarse", "gravel", "netherrack"]))
    # KOTH (en haut à droite) : colline et anneau de capture
    kx, kz = 70, 24
    for z in range(kz - 12, kz + 13):
        for x in range(kx - 12, kx + 13):
            d = math.hypot(x - kx, z - kz)
            hgt = int(max(0, 5 - d / 2.4))
            for y in range(G, G + hgt):
                sc.set(x, y, z, "grass" if y == G + hgt - 1 else "dirt")
    top = G + 5
    for z in range(kz - 7, kz + 8):
        for x in range(kx - 7, kx + 8):
            d = math.hypot(x - kx, z - kz)
            if 5.3 < d < 6.5:
                sc.set(x, top - 1, z, "yellow_concrete")
    sc.fill(kx - 1, top - 1, kz - 1, kx + 1, top - 1, kz + 1, "iron_block")
    sc.set(kx, top, kz, "beacon")
    # Totem (en haut à gauche) : pilier d'obsidienne de 5
    tx, tz = 24, 24
    sc.fill(tx - 3, G, tz - 3, tx + 3, G, tz + 3, "blackstone")
    for (x, z) in [(tx - 3, tz - 3), (tx + 3, tz - 3), (tx - 3, tz + 3), (tx + 3, tz + 3)]:
        sc.set(x, G + 1, z, "gilded_blackstone")
        sc.set(x, G + 2, z, "lantern")
    sc.fill(tx, G + 1, tz, tx, G + 5, tz, "obsidian")
    # Convoi (en bas à gauche) : cratère et caisse
    cx, cz = 26, 70
    for z in range(cz - 5, cz + 6):
        for x in range(cx - 5, cx + 6):
            d = math.hypot(x - cx, z - cz)
            if d < 4:
                sc.set(x, G - 1, z, "coal_block" if d > 2.5 else "magma_block")
    sc.set(cx, G, cz, "chest")
    # Avant-poste (en bas à droite) : palissade, drapeaux bleus
    ax, az = 70, 70
    for z in range(az - 8, az + 9):
        for x in range(ax - 8, ax + 9):
            if max(abs(x - ax), abs(z - az)) == 8 and not (abs(x - ax) <= 1 and z > az):
                sc.fill(x, G, z, x, G + 2 + ((x + z) % 2), z, "spruce_log")
    sc.fill(ax - 2, G, az - 2, ax + 2, G + 3, az + 2, "spruce_planks")
    sc.fill(ax - 2, G + 4, az - 2, ax + 2, G + 4, az + 2, "dark_oak")
    for (x, z) in [(ax - 6, az - 6), (ax + 6, az - 6)]:
        sc.fill(x, G, z, x, G + 5, z, "fence")
        sc.fill(x + 1, G + 4, z, x + 2, G + 5, z, "blue_wool")
    for (x, z) in [(48, 4), (4, 48), (90, 48), (48, 92), (46, 46), (10, 90), (92, 6), (90, 92), (6, 6)]:
        sc.tree(x, z, G - 1)
    # Sentiers en croix
    for i in range(96):
        for w in (-1, 0, 1):
            for (x, z) in [(i, 48 + w), (48 + w, i)]:
                if sc.get(x, G, z) == 0:
                    sc.set(x, G - 1, z, "path")
    return sc, G


meta = {}
sc, G = bases(False)
meta["bases"] = render(sc, 14, f"{OUT}/bases.png"); meta["bases"]["G"] = G
sc, G = bases(True)
meta["bases_raid"] = render(sc, 14, f"{OUT}/bases_raid.png"); meta["bases_raid"]["G"] = G
sc, G = warzone()
meta["warzone"] = render(sc, 11, f"{OUT}/warzone.png"); meta["warzone"]["G"] = G
json.dump(meta, open(f"{OUT}/dioramas.json", "w"))
print({k: (m["w"], m["h"]) for k, m in meta.items()})
