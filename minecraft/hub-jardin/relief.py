"""Relief du hub : îles rondes en disques empilés (strates horizontales), pétales, tours, gros cristaux sombres."""

from __future__ import annotations

import math

from generate import h2  # noqa: F401  (outils de l'Île Marchande, déjà dans sys.path)

# Strates horizontales, du haut vers le bas : sable clair, puis orange et terracotta, plus sombre en profondeur
TOP_BANDS = ["smooth_sandstone", "sandstone", "smooth_sandstone"]
MID_BANDS = ["orange_terracotta", "orange_terracotta", "terracotta", "yellow_terracotta", "orange_terracotta",
             "smooth_red_sandstone", "orange_terracotta", "terracotta"]
LOW_BANDS = ["terracotta", "brown_terracotta", "orange_terracotta", "brown_terracotta"]


class Body:
    """Île ronde : dessus plat en herbe, dessous en bol arrondi fait de disques empilés qui rentrent par paliers."""

    def __init__(self, cx: float, cz: float, r: float, top: int, depth: float, salt: int, crystal: bool = False):
        self.cx, self.cz, self.r, self.top, self.depth, self.salt, self.crystal = cx, cz, r, top, depth, salt, crystal

    def radius(self, a: float) -> float:
        s = self.salt
        return self.r * (1 + 0.09 * math.sin(3 * a + s) + 0.05 * math.sin(5 * a + 2 * s) + 0.025 * math.sin(9 * a + s))

    def interval(self, x: int, z: int, top_override: int | None = None) -> tuple[int, int] | None:
        dx, dz = x - self.cx, z - self.cz
        a = math.atan2(dz, dx)
        dd = math.hypot(dx, dz) / self.radius(a)
        if dd > 1:
            return None
        top = self.top if top_override is None else top_override
        # profondeur atteinte à cette distance : bol arrondi, découpé en disques de 3 à 4 blocs
        lo = top
        for k in range(int(self.depth) + 1):
            t = k / self.depth
            p = math.sqrt(max(0.0, 1 - t ** 1.7))
            band = k % 4
            p *= 1 - 0.09 * band / 3  # chaque disque rentre un peu vers le bas, puis le suivant ressort
            if dd <= p:
                lo = top - k
            else:
                break
        return lo, top


def material(x: int, y: int, z: int, top: int, base_g: int) -> str:
    if y == top:
        return "grass_block"
    if y >= top - 2:
        return "dirt"
    off = int(h2(x // 5, z // 5, 300) * 2)
    k = (y + off) // 3
    depth = base_g - y
    if depth > 42 and h2(x, z, y + 301) < min(0.85, (depth - 42) / 14):
        v = h2(x, y, z + 302)
        return "amethyst_block" if v < 0.2 else "crying_obsidian" if v < 0.4 else "obsidian"
    if top - y <= 5:
        return TOP_BANDS[k % len(TOP_BANDS)]
    if depth > 30:
        return LOW_BANDS[k % len(LOW_BANDS)]
    return MID_BANDS[k % len(MID_BANDS)]


def dark_crystal(w, x: int, y: int, z: int, length: float, r0: float, salt: int) -> None:
    """Gros cristal sombre pointé vers le bas (obsidienne, obsidienne pleureuse, améthyste), avec éclats."""
    for k in range(int(length) + 1):
        t = k / length
        r = r0 * (1 - t) ** 0.8
        ox = math.sin(t * 2 + salt) * 1.2
        oz = math.cos(t * 2.3 + salt) * 1.2
        ri = int(r) + 1
        for dx in range(-ri, ri + 1):
            for dz in range(-ri, ri + 1):
                # section en losange (facettes)
                if abs(dx - ox) + abs(dz - oz) <= r * 1.25:
                    edge = abs(dx - ox) + abs(dz - oz) > r * 1.25 - 1.2
                    v = h2(x + dx, z + dz, y - k + salt)
                    s = ("amethyst_block" if v < 0.45 else "crying_obsidian") if edge else ("obsidian" if v < 0.7 else "crying_obsidian")
                    w.set(x + dx, y - k, z + dz, s)
    w.set(x + round(math.sin(2 + salt) * 1.2), y - int(length) - 1, z + round(math.cos(2.3 + salt) * 1.2),
          "amethyst_cluster[facing=down]")
    # éclats latéraux
    for j in range(3):
        a = h2(x, z, salt + 310 + j) * 2 * math.pi
        sy = y - int(length * (0.25 + 0.4 * h2(x, z, salt + 320 + j)))
        L = 3 + int(length * 0.25)
        for k in range(L):
            px, py, pz = x + round(math.cos(a) * (k * 0.8 + r0 * 0.6)), sy - k, z + round(math.sin(a) * (k * 0.8 + r0 * 0.6))
            w.set(px, py, pz, "amethyst_block" if k < L - 1 else "crying_obsidian")
        w.set(x + round(math.cos(a) * ((L) * 0.8 + r0 * 0.6)), sy - L, z + round(math.sin(a) * ((L) * 0.8 + r0 * 0.6)),
              "amethyst_cluster[facing=down]")
