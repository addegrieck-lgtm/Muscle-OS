"""Mine d'obsidienne VÆLORIA dans une grotte du spawn (Paper 1.21.4+), au format Sponge v2 (.schem, WorldEdit/FAWE).

Usage : python3 minecraft/mine-obsidienne/grotte.py   (Pillow + numpy ; réutilise minecraft/spawn et generate.py)
Sorties dans minecraft/mine-obsidienne/ : vaeloria-mine-obsidienne-grotte.schem (sous terre),
vaeloria-mine-obsidienne-verriere.schem (surface), apercu-grotte-*.png.

La mine est celle de generate.py en version plafond plat (build(flat=True)) : obsidienne 21 × 15 × 8,
couloir vide d'un bloc sur toute la hauteur, mur fermé sans sortie, arrivée sur la plateforme suspendue.
Son plafond est une verrière rubis au niveau du sol du spawn, à l'ouest de la place d'arrivée :
depuis le spawn on voit la mine en dessous, depuis la mine on voit le ciel. Les murs sont pris dans
une grotte creusée dans la roche de l'île ; elle n'a pas d'ouverture, on arrive toujours par le warp.

Repère : celui du gabarit du spawn (x/z = 0 au centre de l'arbre, y = 0 au niveau de marche, nord = -Z).
Point de collage : le centre de l'arbre, au niveau de marche, comme les autres modules du spawn.
"""

from __future__ import annotations

import importlib.util
import math
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


spawn = _load("vaeloria_spawn", HERE.parent / "spawn" / "generate.py")
mine = _load("vaeloria_mine", HERE / "generate.py")

# Position de la mine dans le repère du spawn : centre de l'obsidienne en (-32, 43), à l'ouest de la place d'arrivée,
# sur la mousse libre (ni allée, ni lampadaire, ni arbre à moins de 2 blocs de la verrière) ; l'île y fait 29 blocs au moins.
CENTER = (-32, 43)
MINE_DX = CENTER[0] - mine.RIDGE_X  # x mine -> x spawn
MINE_DZ = CENTER[1] - mine.OBS_Z // 2  # z mine -> z spawn
MINE_DY = -mine.FLAT_Y  # verrière et haut des murs en y = 0, au niveau de marche ; sol de l'enceinte en y = -17
CEIL_MAX = -4  # la grotte ne monte pas au-dessus : 3 blocs de roche au moins sous la mousse
GAP = 3.0  # vide moyen entre l'enceinte et la roche
SHELL = 4  # roche ajoutée là où l'île est trop mince (bosse sous l'île)
RIM = 2  # bordure de la verrière au sol : rubis puis pierre noire
SURFACE_Y = -2  # le module « verrière » couvre y -2 → 4 sur l'emprise de la bordure ; le module « grotte » tout le reste

ROCK = "minecraft:cobbled_deepslate"
ARRIVAL = (mine.ARRIVAL[0] + MINE_DX, mine.ARRIVAL[1] + MINE_DY, mine.ARRIVAL[2] + MINE_DZ)


def enclosure_dist(x, y, z):
    """Distance d'un point (repère mine) à l'enceinte : boîte du mur coiffée de la voûte en ogive."""
    x0, x1, z0, z1 = -2, mine.OBS_X + 1, -2, mine.OBS_Z + 1
    dx = max(x0 - x, 0, x - x1)
    dz = max(z0 - z, 0, z - z1)
    dy = max(-y, 0, y - mine.FLAT_Y)
    return math.sqrt(dx * dx + dy * dy + dz * dz)


def in_enclosure(x, y, z):
    return -2 <= x <= mine.OBS_X + 1 and -2 <= z <= mine.OBS_Z + 1 and 0 <= y <= mine.FLAT_Y


def rim_box():
    """Emprise de la verrière et de sa bordure, repère du spawn : (x0, z0, x1, z1)."""
    return (-2 - RIM + MINE_DX, -2 - RIM + MINE_DZ, mine.OBS_X + 1 + RIM + MINE_DX, mine.OBS_Z + 1 + RIM + MINE_DZ)


def build(w):
    """Creuse la grotte dans le volume du spawn w et y pose la mine. Renvoie la boîte touchée (repère spawn)."""
    mv, mnames = mine.build(flat=True)
    rng = np.random.default_rng(11)
    noise = spawn.noise2

    # Boîte de travail autour de l'enceinte.
    pad = int(GAP + 3 + SHELL)
    bx0, bx1 = -2 - pad + MINE_DX, mine.OBS_X + 1 + pad + MINE_DX
    bz0, bz1 = -2 - pad + MINE_DZ, mine.OBS_Z + 1 + pad + MINE_DZ
    by0, by1 = MINE_DY - SHELL - 2, CEIL_MAX

    cave = set()
    for x in range(bx0, bx1 + 1):
        for z in range(bz0, bz1 + 1):
            for y in range(by0, by1 + 1):
                lx, ly, lz = x - MINE_DX, y - MINE_DY, z - MINE_DZ
                if in_enclosure(lx, ly, lz):
                    continue
                d = enclosure_dist(lx, ly, lz)
                n = noise(x * 0.9, z * 0.9 + y * 1.3, 2.4)
                gap = GAP + 1.6 * n
                if ly >= 1 and d <= gap and y <= CEIL_MAX:
                    cave.add((x, y, z))
                elif d <= gap + SHELL and w.is_air(x, y, z):
                    # Roche ajoutée où l'île est trop mince : grès noir dehors, veines comme le reste de l'île.
                    r = noise(x * 1.8, z * 1.8 + y * 2.2, 3.3)
                    name = "minecraft:deepslate_redstone_ore" if r > 0.78 else "minecraft:calcite" if r < -0.8 else ROCK
                    outer = d > gap + SHELL - 1.2
                    w.put(x, y, z, "minecraft:blackstone" if outer else name)
                    if outer and rng.random() < 0.05 and w.is_air(x, y - 1, z):
                        w.put(x, y - 1, z, "minecraft:pointed_dripstone[thickness=tip,vertical_direction=down]")

    def clear(x, y, z):
        w.vol[y - spawn.Y0, z - spawn.X0, x - spawn.X0] = 0

    for c in cave:
        clear(*c)

    # Parois de la grotte : tuff au sol, roche noire et veines rubis/argent, shroomlights pour l'éclairage.
    def is_cave(x, y, z):
        return (x, y, z) in cave

    for x, y, z in sorted(cave):
        if not is_cave(x, y - 1, z) and not w.is_air(x, y - 1, z):  # sol
            lx, lz = x - MINE_DX, z - MINE_DZ
            if not in_enclosure(lx, y - 1 - MINE_DY, lz):
                w.put(x, y - 1, z, "minecraft:tuff" if (x * 3 + z) % 4 else "minecraft:polished_tuff")
        if not is_cave(x, y + 1, z) and not w.is_air(x, y + 1, z) and not in_enclosure(x - MINE_DX, y + 1 - MINE_DY, z - MINE_DZ):
            p = rng.random()
            if p < 0.08:
                w.put(x, y + 1, z, "minecraft:shroomlight")
            elif p < 0.22 and is_cave(x, y - 1, z) and is_cave(x, y - 2, z):  # stalactites
                w.put(x, y, z, "minecraft:pointed_dripstone[thickness=tip,vertical_direction=down]")
                if is_cave(x, y - 3, z) and p < 0.15:
                    w.put(x, y, z, "minecraft:pointed_dripstone[thickness=frustum,vertical_direction=down]")
                    w.put(x, y - 1, z, "minecraft:pointed_dripstone[thickness=tip,vertical_direction=down]")
            elif p < 0.40:
                w.put(x, y + 1, z, "minecraft:deepslate_redstone_ore" if p < 0.30 else "minecraft:blackstone")
    for x, y, z in sorted(cave):  # appliques dans les murs de la grotte
        for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, nz = x + dx, z + dz
            if (nx, y, nz) not in cave and not w.is_air(nx, y, nz) and not in_enclosure(nx - MINE_DX, y - MINE_DY, nz - MINE_DZ):
                if (x * 7 + y * 5 + z * 3) % 23 == 0:
                    w.put(nx, y, nz, "minecraft:shroomlight")

    # La mine, à l'identique (air compris à l'intérieur de l'enceinte : le couloir reste vide).
    H, L, W = mv.shape
    for yi in range(H):
        for zi in range(L):
            for xi in range(W):
                lx, ly, lz = xi + mine.X0, yi + mine.Y0, zi + mine.Z0
                b = mv[yi, zi, xi]
                if in_enclosure(lx, ly, lz) or b:
                    x, y, z = lx + MINE_DX, ly + MINE_DY, lz + MINE_DZ
                    if b:
                        w.put(x, y, z, mnames[b])
                    else:
                        clear(x, y, z)

    # Bordure de la verrière au niveau du sol, comme les anneaux de la place : rubis, puis pierre noire ; lampadaires aux angles.
    rx0, rz0, rx1, rz1 = rim_box()
    for x in range(rx0, rx1 + 1):
        for z in range(rz0, rz1 + 1):
            if in_enclosure(x - MINE_DX, 0 - MINE_DY, z - MINE_DZ):
                continue
            ring = min(x - rx0, rx1 - x, z - rz0, rz1 - z)
            w.put(x, 0, z, "minecraft:polished_blackstone_bricks" if ring == 0 else "minecraft:red_nether_bricks")
            for y in range(1, 6):
                clear(x, y, z)
    for x in range(rx0, rx1 + 1):  # rien ne pousse sur la verrière
        for z in range(rz0, rz1 + 1):
            for y in range(1, 6):
                clear(x, y, z)
    for x in (rx0, rx1):
        for z in (rz0, rz1):
            spawn.lamp(w, x, z)
    return (bx0, by0, bz0, bx1, by1, bz1), cave


def check(w, cave):
    """Contrôles : grotte fermée (aucune case de la grotte ne touche le dehors), éclairée partout, mine intacte."""
    ok = True
    # 1. Fermée : remplissage depuis la grotte à travers l'air ; on ne doit pas sortir de la boîte de la grotte.
    xs = [c[0] for c in cave]
    seen = set()
    start = next(iter(cave))
    q = deque([start])
    seen.add(start)
    leak = None
    while q:
        x, y, z = q.popleft()
        if (x, y, z) not in cave and not in_enclosure(x - MINE_DX, y - MINE_DY, z - MINE_DZ):
            leak = (x, y, z)
            break
        for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)):
            n = (x + d[0], y + d[1], z + d[2])
            if n not in seen and w.is_air(*n):
                seen.add(n)
                q.append(n)
    if leak:
        print("FUITE : la grotte touche le dehors en", leak)
        ok = False
    # 2. Lumière de bloc > 0 partout dans la grotte (propagation simple à travers l'air).
    lights = {"shroomlight": 15, "lantern": 15, "end_rod": 14}
    level = {}
    q = deque()
    for c in cave:
        for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)):
            n = (c[0] + d[0], c[1] + d[1], c[2] + d[2])
            name = w.name_at(*n)
            for k, lv in lights.items():
                if k in name and level.get(c, 0) < lv - 1:
                    level[c] = lv - 1
                    q.append(c)
    while q:
        c = q.popleft()
        for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)):
            n = (c[0] + d[0], c[1] + d[1], c[2] + d[2])
            if n in cave and level.get(n, 0) < level[c] - 1:
                level[n] = level[c] - 1
                q.append(n)
    dark = [c for c in cave if w.is_air(*c) and level.get(c, 0) == 0]
    if dark:
        print("sombre :", len(dark), "cases de la grotte sans lumière, ex.", dark[:3])
        ok = False
    # 3. Surface du spawn intacte au-dessus de la grotte.
    assert max(c[1] for c in cave) <= CEIL_MAX
    print("grotte :", len(cave), "cases d'air · fermée :", leak is None, "· éclairée :", not dark,
          "· x", min(xs), "..", max(xs))
    return ok


def main():
    w = spawn.build_island(spawn.logo_grid(41), spawn.logo_grid(25))
    before = w.vol.copy()
    (bx0, by0, bz0, bx1, by1, bz1), cave = build(w)
    ok = check(w, cave)

    # Deux modules, air compris (l'air creuse la grotte au collage), point de collage = centre de l'arbre :
    # « grotte » = tout ce qui change sous y -2 ; « verrière » = l'emprise de la bordure, de y -2 à y 5.
    # Ainsi aucun module ne touche la surface du spawn hors de la bordure de la verrière.
    def export(fname, x0, y0, z0, x1, y1, z1):
        sub = w.vol[y0 - spawn.Y0:y1 - spawn.Y0 + 1, z0 - spawn.X0:z1 - spawn.X0 + 1, x0 - spawn.X0:x1 - spawn.X0 + 1]
        used = sorted(set(np.unique(sub).tolist()) | {0})
        remap = np.zeros(len(w.pal.names), dtype=np.int32)
        for i, u in enumerate(used):
            remap[u] = i
        spawn.write_schem(HERE / fname, remap[sub], [w.pal.names[u] for u in used], (-x0, -y0, -z0))
        print(fname, ": x", x0, "..", x1, "· y", y0, "..", y1, "· z", z0, "..", z1)

    ys, zs, xs_ = np.nonzero(w.vol != before)
    ys = ys + spawn.Y0
    under = ys < SURFACE_Y
    gx, gz = xs_[under] + spawn.X0, zs[under] + spawn.X0
    export("vaeloria-mine-obsidienne-grotte.schem", gx.min(), ys[under].min(), gz.min(), gx.max(), SURFACE_Y - 1, gz.max())
    rx0, rz0, rx1, rz1 = rim_box()
    above = ~under
    sx, sz = xs_[above] + spawn.X0, zs[above] + spawn.X0
    assert sx.min() >= rx0 and sx.max() <= rx1 and sz.min() >= rz0 and sz.max() <= rz1, "la surface change hors de la bordure"
    export("vaeloria-mine-obsidienne-verriere.schem", rx0, SURFACE_Y, rz0, rx1, 5, rz1)
    print("arrivée (repère du spawn, pieds du joueur) :", ARRIVAL)

    # Aperçus : coupes nord-sud (x = 0) et est-ouest (z = centre de la mine) de l'île, cadrées sur la grotte.
    colors = {"red_stained": (190, 40, 40), "quartz": (236, 230, 223), "calcite": (223, 224, 220), "obsidian": (40, 22, 60),
              "deepslate_tiles": (60, 60, 64), "blackstone_bricks": (45, 40, 48), "redstone": (175, 24, 5), "shroom": (240, 140, 70),
              "tuff": (108, 109, 102), "cobbled_deepslate": (77, 77, 80), "deepslate": (72, 72, 73), "blackstone": (53, 48, 56),
              "pale_moss": (160, 166, 156), "red_nether": (69, 7, 9), "chain": (90, 95, 105), "lantern": (230, 180, 90),
              "dripstone": (130, 100, 85), "lodestone": (150, 150, 155), "end_rod": (240, 240, 230), "concrete": (20, 20, 25)}

    def color(i):
        n = w.pal.names[i]
        return next((c for k, c in colors.items() if k in n), (110, 110, 110))

    vol = w.vol
    xc, zc = CENTER
    for fname, axis, at, lo, hi in (("apercu-grotte-coupe-nord-sud.png", "x", xc, 0, 92),
                                    ("apercu-grotte-coupe-est-ouest.png", "z", zc, -80, 20)):
        ylo, yhi = -45, 12
        img = Image.new("RGB", (hi - lo + 1, yhi - ylo + 1), (7, 7, 10))
        for y in range(ylo, yhi + 1):
            for u in range(lo, hi + 1):
                x, z = (at, u) if axis == "x" else (u, at)
                b = vol[y - spawn.Y0, z - spawn.X0, x - spawn.X0]
                if b:
                    img.putpixel((u - lo, yhi - y), color(b))
        img.resize((img.width * 8, img.height * 8), Image.Resampling.NEAREST).save(HERE / fname)
    # Vue de dessus du sud de l'île : la verrière à côté de la place d'arrivée.
    xlo, xhi, zlo, zhi = -80, 40, 0, 92
    img = Image.new("RGB", (xhi - xlo + 1, zhi - zlo + 1), (7, 7, 10))
    for z in range(zlo, zhi + 1):
        for x in range(xlo, xhi + 1):
            col = np.nonzero(vol[:, z - spawn.X0, x - spawn.X0])[0]
            col = [c for c in col if "chain" not in w.pal.names[vol[c, z - spawn.X0, x - spawn.X0]]]
            if col:
                img.putpixel((x - xlo, z - zlo), color(vol[col[-1], z - spawn.X0, x - spawn.X0]))
    img.resize((img.width * 6, img.height * 6), Image.Resampling.NEAREST).save(HERE / "apercu-grotte-dessus.png")
    if not ok:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
