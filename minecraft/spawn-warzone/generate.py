"""Petite warzone sous le spawn VÆLORIA : « La Fosse ». Arène fermée sous l'Île-Cœur (Paper 1.21.4+, Sponge v2).

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
    for gy, row in enumerate(logo):
        for gx, b in enumerate(row):
            if b:
                w.put(gx - 12, -1, gy - len(logo) // 2, b)
                w.put(gx - 12, 0, gy - len(logo) // 2, "minecraft:air")

    # Couvert : ruines, postes de garde, piliers, murs brisés. Tout reste bas sous l'île.
    placed = {"ruine": 0, "poste de garde": 0, "pilier": 0, "mur": 0, "obélisque": 0}
    for kind, count, size, top in (("ruine", 10, (4, 5), 6), ("poste de garde", 8, (3, 3), 4), ("pilier", 18, (1, 1), 4),
                                   ("mur", 14, (4, 4), 3), ("obélisque", 6, (2, 2), 11)):
        tries = 0
        while placed[kind] < count and tries < 3000:
            tries += 1
            a, r = rng.random() * 2 * math.pi, 30 + rng.random() * (R_ARENA - 42)
            if kind == "obélisque":
                r = 96 + rng.random() * 10  # hors de l'aplomb de l'île : seuls les obélisques montent plus haut
            x, z = round(r * math.cos(a)), round(r * math.sin(a))
            sx, sz = size
            if not _wz.free(w, x - sx, z - sz, x + sx, z + sz, margin=3) or not room_ok(x - sx, z - sz, x + sx, z + sz, top):
                continue
            if kind == "ruine":
                ruin(w, x, z, rng)
            elif kind == "poste de garde":
                bunker(w, x, z)
            elif kind == "pilier":
                pillar(w, x, z, 4)
            elif kind == "mur":
                b = (x + int(rng.integers(-4, 5)), z + int(rng.integers(-4, 5)))
                wall_seg(w, (x, z), b, 3, rng)
            else:
                obelisk(w, x, z)
            placed[kind] += 1
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
