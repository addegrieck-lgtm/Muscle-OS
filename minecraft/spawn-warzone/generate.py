"""Petite warzone sous le spawn VÆLORIA : « La Fosse ». Arène de combat fermée sous l'Île-Cœur (Paper 1.21.4+, Sponge v2).

Quatre terrains : Tranchées au nord, Forêt de piliers à l'est, Ruines au sud, Hauteurs à l'ouest ; le Ring au centre
(fosse de duel avec trône de capture) et un chemin de ronde pour les archers le long du rempart.

Usage : python3 minecraft/spawn-warzone/generate.py   (Pillow + numpy ; réutilise minecraft/spawn et minecraft/warzone)
Sorties dans minecraft/spawn-warzone/ : vaeloria-spawn-warzone.schem, apercu-*.png.

Le spawn est collé en 0, 100, 0 (monde vide). L'arène est un disque flottant de 115 blocs de rayon, sol en y = 24,
entouré d'un rempart de 18 blocs : qui saute de l'île, par le bord ou par le vide central, atterrit ici et n'en
sort plus (pas de construction, pas de perle, rien d'assez haut pour remonter vers l'île).
Repère : x/z identiques au spawn ; y = 0 au niveau des pieds sur le sol de l'arène (monde y = 25).
Coller en volant exactement en 0, 25, 0 avec //paste -a (sans l'air : l'île au-dessus reste intacte).
"""

from __future__ import annotations

import importlib.util
import math
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_spawn = _load("vaeloria_spawn", HERE.parent / "spawn" / "generate.py")
_wz = _load("vaeloria_warzone", HERE.parent / "warzone" / "generate.py")
Vol, ruin, pillar, wall_seg, bunker, obelisk, noise = _wz.Vol, _wz.ruin, _wz.pillar, _wz.wall_seg, _wz.bunker, _wz.obelisk, _wz.noise
PB, DT = _wz.PB, _wz.DT

FLOOR_WORLD_Y = 25  # pieds des joueurs sur le sol de l'arène
SPAWN_WORLD_Y = 100  # niveau de marche de l'île (point de collage du spawn)
R_ARENA = 115  # rayon intérieur du rempart
WALL_H = 18
CLEARANCE = 10  # vide minimal entre le haut d'une construction et le dessous de l'île
HALF = 120


def island_bottom():
    """Hauteur (repère de l'arène) du point le plus bas de l'île au-dessus de chaque colonne, ou None."""
    isl = _spawn.build_island(_spawn.logo_grid(41), _spawn.logo_grid(25))
    solid = isl.vol > 0
    has = solid.any(axis=0)
    low = np.argmax(solid, axis=0) + _spawn.Y0 + SPAWN_WORLD_Y - FLOOR_WORLD_Y
    out = {}
    for iz, ix in zip(*np.nonzero(has)):
        out[(int(ix) + _spawn.X0, int(iz) + _spawn.X0)] = int(low[iz, ix])
    return out


def build():
    rng = np.random.default_rng(31)
    bottom = island_bottom()
    w = Vol(half=HALF, ymin=-14, ymax=WALL_H + 2)

    def room_ok(x0, z0, x1, z1, top):
        """Rien de construit ne doit approcher le dessous de l'île : pas de pont pour remonter."""
        for x in range(x0, x1 + 1):
            for z in range(z0, z1 + 1):
                b = bottom.get((x, z))
                if b is not None and b - top < CLEARANCE:
                    return False
        return True

    # Disque flottant : sol de bataille, dessous en cône de roche noire.
    for x in range(-HALF, HALF):
        for z in range(-HALF, HALF):
            r = math.hypot(x, z)
            if r > R_ARENA + 3:
                continue
            n = noise(x, z, 4.4)
            top = "minecraft:pale_moss_block" if n > 0.1 else "minecraft:tuff" if n > -0.4 else "minecraft:cobbled_deepslate"
            w.put(x, -1, z, top)
            depth = int(4 + 9 * (1 - r / (R_ARENA + 3)) ** 0.8)
            for y in range(-1 - depth, -1):
                w.put(x, y, z, "minecraft:deepslate_redstone_ore" if rng.random() < 0.01 else "minecraft:blackstone" if y < -4 else "minecraft:tuff")
            if top == "minecraft:pale_moss_block" and rng.random() < 0.15:
                w.put(x, 0, z, "minecraft:pale_moss_carpet")

    # Rempart : 3 d'épaisseur, 18 de haut, encorbellement intérieur en haut, créneaux et lanternes.
    for a in np.linspace(0, 2 * math.pi, 4000, endpoint=False):
        for rr in (R_ARENA, R_ARENA + 1, R_ARENA + 2):
            x, z = round(rr * math.cos(a)), round(rr * math.sin(a))
            for y in range(-1, WALL_H):
                w.put(x, y, z, PB if y % 6 == 5 or y == -1 else DT)
            if rr == R_ARENA + 2 and round(a * R_ARENA) % 2 == 0:
                w.put(x, WALL_H, z, PB)
        x, z = round((R_ARENA - 1) * math.cos(a)), round((R_ARENA - 1) * math.sin(a))
        w.put(x, WALL_H - 1, z, PB)  # encorbellement : rien pour s'agripper en haut
    for k in range(32):
        a = k * 2 * math.pi / 32
        x, z = round((R_ARENA - 1) * math.cos(a)), round((R_ARENA - 1) * math.sin(a))
        w.put(x, WALL_H - 2, z, "minecraft:lantern[hanging=true]")
        if k % 4 == 0:  # bandes rubis sur la face intérieure
            for y in range(1, WALL_H - 2):
                w.put(x, y, z, "minecraft:red_nether_bricks")

    # Cercle d'atterrissage sous le vide central de l'île : visible depuis les pontons en regardant en bas.
    for x in range(-30, 31):
        for z in range(-30, 31):
            d = math.hypot(x, z)
            if 18 <= d <= 22:
                w.put(x, -1, z, "minecraft:red_nether_bricks" if d < 19 or d > 21 else "minecraft:polished_blackstone")
                if w.get(x, 0, z) == "minecraft:pale_moss_carpet":
                    w.put(x, 0, z, "minecraft:air")
    logo = _spawn.logo_grid(25)

    def cap(x, z):
        """Hauteur maximale d'une construction sur cette colonne (dessous de l'île moins la marge)."""
        b = bottom.get((x, z))
        return 99 if b is None else b - CLEARANCE - 1

    def sector(x, z):
        ang = math.degrees(math.atan2(z, x)) % 360
        return "est" if ang < 45 or ang >= 315 else "sud" if ang < 135 else "ouest" if ang < 225 else "nord"

    placed = {}

    # Centre : le Ring. Une fosse de duel sous le vide de l'île, bords en gradins, trône de capture au milieu.
    for x in range(-19, 20):
        for z in range(-19, 20):
            d = math.hypot(x, z)
            if d > 18:
                continue
            depth = 3 if d <= 14 else 2 if d <= 16 else 1
            for y in range(-depth, 1):
                w.put(x, y, z, "minecraft:air")
            w.put(x, -depth - 1, z, "minecraft:polished_blackstone" if d <= 14 else PB)
    for gy, row in enumerate(logo):
        for gx, b in enumerate(row):
            if b and math.hypot(gx - 12, gy - len(logo) // 2) <= 14:
                w.put(gx - 12, -4, gy - len(logo) // 2, b)
    for x in range(-2, 3):
        for z in range(-2, 3):
            w.put(x, -3, z, "minecraft:red_nether_bricks" if max(abs(x), abs(z)) == 2 else "minecraft:polished_blackstone")
    w.put(0, -3, 0, "minecraft:redstone_block")
    for k in range(8):  # braseros sur le pourtour du Ring
        a = k * math.pi / 4
        x, z = round(20 * math.cos(a)), round(20 * math.sin(a))
        w.put(x, 0, z, "minecraft:polished_blackstone_wall[up=true]")
        w.put(x, 1, z, "minecraft:lantern[hanging=false]")
    placed["Ring"] = 1

    # Nord : les Tranchées. Lignes en zigzag creusées sur 2 blocs, sacs de pierre noire sur les bords.
    trenches = 0
    for r0 in (42, 66, 90):
        pts = []
        for k, ang in enumerate(range(228, 314, 6)):
            rr = r0 + (4 if k % 2 else -4)
            pts.append((rr * math.cos(math.radians(ang)), rr * math.sin(math.radians(ang))))
        for p0, p1 in zip(pts, pts[1:]):
            for x, z in _wz.line_pts(p0, p1, 0.5):
                X, Z = round(x), round(z)
                for dx in (-1, 0, 1):
                    for dz in (-1, 0, 1):
                        w.put(X + dx, 0, Z + dz, "minecraft:air")
                        w.put(X + dx, -1, Z + dz, "minecraft:air")
                        w.put(X + dx, -2, Z + dz, "minecraft:air")
                        w.put(X + dx, -3, Z + dz, "minecraft:cobbled_deepslate")
        for p0, p1 in zip(pts, pts[1:]):
            for x, z in _wz.line_pts(p0, p1, 1.0):
                for side in (-2, 2):
                    nx, nz = p1[1] - p0[1], p0[0] - p1[0]
                    ln = math.hypot(nx, nz) or 1
                    X, Z = round(x + side * nx / ln), round(z + side * nz / ln)
                    if w.get(X, -1, Z) in _wz.GROUND and (X + Z) % 3:
                        w.put(X, 0, Z, "minecraft:polished_blackstone_brick_slab[type=bottom]")
        trenches += 1
    placed["tranchées"] = trenches

    # Est : la Forêt de piliers. Corps à corps, angles morts partout.
    n = 0
    for x in range(30, 112, 6):
        for z in range(-80, 81, 6):
            X, Z = x + int(rng.integers(-1, 2)), z + int(rng.integers(-1, 2))
            r = math.hypot(X, Z)
            if not (32 < r < 102) or sector(X, Z) != "est" or not _wz.free(w, X - 1, Z - 1, X + 1, Z + 1, margin=1):
                continue
            h = min(int(rng.integers(3, 6)), cap(X, Z))
            if h < 2:
                continue
            big = rng.random() < 0.3
            for dx in ((0, 1) if big else (0,)):
                for dz in ((0, 1) if big else (0,)):
                    for y in range(0, h):
                        w.put(X + dx, y, Z + dz, DT if y < h - 1 else "minecraft:chiseled_polished_blackstone")
            if rng.random() < 0.25:
                w.put(X, h, Z, "minecraft:lantern[hanging=false]")
            n += 1
    placed["piliers"] = n

    # Ouest : les Hauteurs. Plateaux en gradins pour les archers, sommet crénelé.
    n = 0
    for r0, ang in ((52, 160), (55, 200), (78, 180), (82, 148), (84, 212), (100, 165), (100, 195)):
        cx, cz = round(r0 * math.cos(math.radians(ang))), round(r0 * math.sin(math.radians(ang)))
        R = 8 if r0 < 90 else 6
        if not _wz.free(w, cx - R, cz - R, cx + R, cz + R, margin=1):
            continue
        for x in range(cx - R, cx + R + 1):
            for z in range(cz - R, cz + R + 1):
                d = math.hypot(x - cx, z - cz)
                if d > R:
                    continue
                lvl = min(5, int((R - d) / 1.6) + 1, cap(x, z))
                for y in range(0, lvl):
                    w.put(x, y, z, PB if y == lvl - 1 and lvl >= 4 else "minecraft:tuff" if y < lvl - 1 else "minecraft:polished_deepslate")
                if lvl >= 4 and abs(d - (R - 4.5)) < 0.6 and (x + z) % 2 == 0 and lvl + 1 <= cap(x, z):
                    w.put(x, lvl, z, PB)
        n += 1
    placed["plateaux"] = n

    # Sud : les Ruines. Maisons effondrées, toiles d'araignée, postes de garde, murs brisés.
    counts = {"ruine": 0, "poste de garde": 0, "mur": 0}
    for kind, count, size, top in (("ruine", 9, (4, 5), 6), ("poste de garde", 6, (3, 3), 4), ("mur", 12, (4, 4), 3)):
        tries = 0
        while counts[kind] < count and tries < 3000:
            tries += 1
            a, r = math.radians(45 + rng.random() * 90), 30 + rng.random() * 72
            x, z = round(r * math.cos(a)), round(r * math.sin(a))
            sx, sz = size
            if not _wz.free(w, x - sx, z - sz, x + sx, z + sz, margin=3) or not room_ok(x - sx, z - sz, x + sx, z + sz, top):
                continue
            if kind == "ruine":
                ruin(w, x, z, rng)
            elif kind == "poste de garde":
                bunker(w, x, z)
            else:
                wall_seg(w, (x, z), (x + int(rng.integers(-5, 6)), z + int(rng.integers(-5, 6))), 3, rng)
            counts[kind] += 1
    placed.update(counts)

    # Chemin de ronde le long du rempart, à 6 de haut : le poste des archers, à découvert de toute l'arène.
    for a in np.linspace(0, 2 * math.pi, 3200, endpoint=False):
        for rr in (R_ARENA - 3, R_ARENA - 2, R_ARENA - 1):
            x, z = round(rr * math.cos(a)), round(rr * math.sin(a))
            w.put(x, 5, z, PB if rr == R_ARENA - 3 else "minecraft:polished_blackstone")
        x, z = round((R_ARENA - 4) * math.cos(a)), round((R_ARENA - 4) * math.sin(a))
        if round(a * R_ARENA) % 2 == 0:
            w.put(x, 6, z, "minecraft:polished_blackstone_brick_slab[type=bottom]")
    for k in range(48):  # piliers porteurs
        a = k * 2 * math.pi / 48
        x, z = round((R_ARENA - 2) * math.cos(a)), round((R_ARENA - 2) * math.sin(a))
        for y in range(0, 5):
            w.put(x, y, z, DT)
    for k in range(8):  # huit escaliers pour y monter, le long du rempart
        a0 = k * math.pi / 4 + math.pi / 8
        for step in range(6):
            a = a0 + step * 1.6 / R_ARENA
            for rr in (R_ARENA - 6, R_ARENA - 5, R_ARENA - 4):
                x, z = round(rr * math.cos(a)), round(rr * math.sin(a))
                for y in range(0, step + 1):
                    w.put(x, y, z, PB if y == step else "minecraft:tuff")
        a = a0 + 6 * 1.6 / R_ARENA  # palier qui rejoint le chemin de ronde
        for rr in (R_ARENA - 6, R_ARENA - 5, R_ARENA - 4):
            x, z = round(rr * math.cos(a)), round(rr * math.sin(a))
            w.put(x, 5, z, PB)
    placed["chemin de ronde"] = 1

    # Obélisques au bord, hors de l'aplomb de l'île : repères pour se regrouper.
    n = 0
    for k in range(6):
        a = k * math.pi / 3 + math.pi / 6
        x, z = round(98 * math.cos(a)), round(98 * math.sin(a))
        if _wz.free(w, x - 2, z - 2, x + 2, z + 2, margin=1) and room_ok(x - 1, z - 1, x + 1, z + 1, 11):
            obelisk(w, x, z)
            n += 1
    placed["obélisques"] = n
    w.placed = placed
    return w, bottom


def main():
    w, bottom = build()
    _spawn.write_schem(HERE / "vaeloria-spawn-warzone.schem", w.v, w.pal.names, (HALF, -w.ymin, HALF))
    # Contrôle : aucune construction à moins de CLEARANCE blocs du dessous de l'île.
    worst = min((b - max((y for y in range(0, w.ymax + 1) if not w.air(x, y, z)), default=-1)
                 for (x, z), b in bottom.items() if -HALF <= x < HALF and -HALF <= z < HALF), default=99)
    _wz.render(w, HERE / "apercu-dessus.png", None, 3)
    # Coupe ouest-est avec l'île au-dessus, pour voir la chute.
    isl = _spawn.build_island(_spawn.logo_grid(41), _spawn.logo_grid(25))
    W = 2 * HALF
    top_y = SPAWN_WORLD_Y + 62 - FLOOR_WORLD_Y
    img = Image.new("RGB", (W, top_y + 16), (7, 7, 10))
    for x in range(-HALF, HALF):
        for y in range(w.ymin, top_y + 1):
            px, py = x + HALF, top_y - y
            if w.ok(x, y, 0) and not w.air(x, y, 0):
                img.putpixel((px, py), (120, 120, 125) if "red" not in w.get(x, y, 0) else (150, 30, 40))
            sy = y + FLOOR_WORLD_Y - SPAWN_WORLD_Y
            if _spawn.X0 <= x <= _spawn.X1 and _spawn.Y0 <= sy <= _spawn.Y1 and isl.vol[sy - _spawn.Y0, 0 - _spawn.X0, x - _spawn.X0]:
                img.putpixel((px, py), (170, 175, 165))
    img.resize((W * 3, (top_y + 16) * 3), Image.Resampling.NEAREST).save(HERE / "apercu-coupe.png")
    print("constructions :", w.placed, "· vide minimal sous l'île :", worst, "blocs · taille :", w.v.shape[::-1])


if __name__ == "__main__":
    main()
