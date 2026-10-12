"""Bâtiments architecturaux du spawn VÆLORIA : la Galerie des Portes, la Rotonde du Savoir, la Chambre forte.

Style commun « gothique noir » : pierre noire et deepslate pour la masse, quartz et calcite pour l'argent,
verre et briques rouges pour le rubis. Techniques : socle, pilastres, contreforts, arcs brisés, corniches en
escaliers renversés, toits en escaliers avec débord, tours à flèche, coupole à nervures, colonnade.

Chaque fonction reçoit le monde du spawn (put / name_at) et le centre (cx, cz) ; y = 0 est le sol de l'île.
"""

from __future__ import annotations

import math

import numpy as np

PBB = "polished_blackstone_brick"
DTL = "deepslate_tile"
DBR = "deepslate_brick"
SQZ = "smooth_quartz"
RNB = "red_nether_brick"
PB = "minecraft:polished_blackstone_bricks"
CHIS = "minecraft:chiseled_polished_blackstone"
PILLAR = "minecraft:quartz_pillar[axis=y]"
CHQ = "minecraft:chiseled_quartz_block"
GLASS = "minecraft:red_stained_glass"
LANTERN = "minecraft:lantern[hanging=false]"
HANG = "minecraft:lantern[hanging=true]"

OPP = {"north": "south", "south": "north", "east": "west", "west": "east"}


def st(mat, facing, half="bottom"):
    return f"minecraft:{mat}_stairs[facing={facing},half={half},shape=straight]"


def sl(mat, t="bottom"):
    return f"minecraft:{mat}_slab[type={t}]"


class Mason:
    """Petit outil de maçonnerie : textures mélangées et pose relative au centre du bâtiment."""

    def __init__(self, w, cx, cz, seed):
        self.w, self.cx, self.cz = w, cx, cz
        self.rng = np.random.default_rng(seed)

    def put(self, dx, y, dz, name):
        self.w.put(self.cx + dx, y, self.cz + dz, name)

    def get(self, dx, y, dz):
        return self.w.name_at(self.cx + dx, y, self.cz + dz)

    def stone(self):
        """Mur noir texturé : briques, quelques fissures, un peu de deepslate."""
        r = self.rng.random()
        return ("minecraft:cracked_polished_blackstone_bricks" if r < 0.10 else
                "minecraft:deepslate_bricks" if r < 0.20 else PB)

    def clear(self, hx, hz, top):
        for dx in range(-hx, hx + 1):
            for dz in range(-hz, hz + 1):
                for y in range(1, top):
                    self.put(dx, y, dz, "minecraft:air")
                if self.get(dx, 0, dz) in ("minecraft:pale_moss_block", "minecraft:tuff", "minecraft:calcite",
                                            "minecraft:deepslate_redstone_ore", "minecraft:pale_moss_carpet"):
                    self.put(dx, 0, dz, "minecraft:polished_deepslate")
                for y in (-1, -2):  # rochers décoratifs enfouis : on aplanit
                    if self.get(dx, y, dz) == "minecraft:air":
                        self.put(dx, y, dz, "minecraft:tuff")


# ---------------------------------------------------------------------------------------------------------------
# 1. La Galerie des Portes : une cathédrale noire. Façade à deux tours et flèches, grand portail à voussures,
#    rosace rubis, nef à arcades de quartz, contreforts, toit à forte pente. Cinq portails au fond et sur les côtés.
# ---------------------------------------------------------------------------------------------------------------

def galerie(w, cx, cz, destinations):
    m = Mason(w, cx, cz, 101)
    HX, FRONT, BACK = 8, 10, -12  # nef : |dx| <= 8, de dz = -12 (fond) à +10 (façade)
    WALL_TOP, RIDGE = 13, 22
    m.clear(19, 13, 34)

    # Socle et sol : bordure, allée rubis, dallage en damier dans les bas-côtés.
    for dx in range(-HX - 4, HX + 5):
        for dz in range(BACK - 2, FRONT + 4):
            if abs(dx) <= HX + 3 and BACK - 1 <= dz <= FRONT + 3:
                m.put(dx, 0, dz, PB)
            if abs(dx) <= HX and BACK <= dz <= FRONT:
                inner = "minecraft:red_nether_bricks" if abs(dx) <= 1 else (
                    "minecraft:polished_deepslate" if (dx + dz) % 2 else "minecraft:deepslate_tiles")
                m.put(dx, 1, dz, inner)
    for dx in range(-3, 4):  # perron devant le portail
        m.put(dx, 1, FRONT + 3, st(PBB, "north"))
        for dz in (FRONT + 1, FRONT + 2):
            m.put(dx, 1, dz, PB)

    # Murs de la nef avec pilastres, fenêtres hautes en arc brisé, corniche.
    bays = [-9, -3, 3]
    for dz in range(BACK, FRONT + 1):
        for sx in (-1, 1):
            for y in range(2, WALL_TOP + 1):
                m.put(sx * HX, y, dz, m.stone())
    for dx in range(-HX, HX + 1):
        for y in range(2, WALL_TOP + 1):
            m.put(dx, y, BACK, m.stone())
    for c in bays:
        for sx in (-1, 1):
            if c == -9:
                continue  # dernière travée : portails latéraux
            arch_window(m, sx * HX, c, 4, 10, axis="z", outward=sx)
    for dz in range(BACK - 1, FRONT + 2):  # corniche en escaliers renversés
        for sx in (-1, 1):
            m.put(sx * (HX + 1), WALL_TOP, dz, st(PBB, "west" if sx > 0 else "east", "top"))

    # Contreforts : piles extérieures à ressauts, reliées au mur par un arc-boutant.
    for dz in (-12, -6, 0, 6):
        for sx in (-1, 1):
            for y in range(1, 10):
                m.put(sx * (HX + 3), y, dz, PB if y % 3 else "minecraft:deepslate_tiles")
                if y <= 5:
                    m.put(sx * (HX + 2), y, dz, PB)
            m.put(sx * (HX + 2), 6, dz, st(PBB, "west" if sx > 0 else "east"))
            m.put(sx * (HX + 3), 10, dz, CHIS)
            m.put(sx * (HX + 3), 11, dz, "minecraft:polished_blackstone_brick_wall[up=true]")
            m.put(sx * (HX + 3), 12, dz, "minecraft:end_rod[facing=up]")
            m.put(sx * (HX + 2), 10, dz, st(PBB, "west" if sx > 0 else "east"))  # arc-boutant
            m.put(sx * (HX + 1), 11, dz, st(PBB, "west" if sx > 0 else "east", "top"))

    # Toit à forte pente (escaliers de deepslate), débord d'un bloc, faîtage crénelé avec épis rubis.
    for dz in range(BACK - 1, FRONT + 2):
        for dx in range(-HX - 1, HX + 2):
            y = WALL_TOP + 1 + (HX + 1 - abs(dx))
            if dx == 0:
                m.put(dx, y, dz, PB)
                m.put(dx, y + 1, dz, "minecraft:polished_blackstone_brick_wall[up=true]" if dz % 3 else CHIS)
                if dz % 6 == 0:
                    m.put(dx, y + 2, dz, "minecraft:redstone_block")
            else:
                m.put(dx, y, dz, st(DTL, "east" if dx < 0 else "west"))
                m.put(dx, y - 1, dz, "minecraft:deepslate_tiles" if abs(dx) < HX + 1 else st(DTL, "east" if dx < 0 else "west", "top"))
    # Pignons : fond plein ; façade avec rosace rubis.
    for gz in (BACK, FRONT):
        for dx in range(-HX, HX + 1):
            for y in range(WALL_TOP + 1, WALL_TOP + 1 + (HX + 1 - abs(dx))):
                m.put(dx, y, gz, m.stone())
    rosace(m, 0, WALL_TOP + 4, FRONT, 3)

    # Façade : grand portail à trois voussures en arc brisé, statues-colonnes de quartz.
    portal(m, 0, FRONT, width=5, height=7)
    for sx in (-1, 1):  # deux niches à lanterne de part et d'autre du portail
        for y in range(2, 6):
            m.put(sx * 6, y, FRONT + 1, PILLAR if y < 5 else CHQ)
        m.put(sx * 6, 6, FRONT + 1, LANTERN)

    # Tours de façade : 7 × 7, ouvertures de beffroi, corniche, flèche octogonale.
    for sx in (-1, 1):
        tower(m, sx * 11, FRONT - 1, 3, 20, spire=11)

    # Intérieur : deux arcades de piliers de quartz, arcs entre eux, lustres.
    for dz in (-9, -3, 3, 9):
        for sx in (-1, 1):
            x = sx * 5
            m.put(x, 2, dz, CHQ)
            for y in range(3, 10):
                m.put(x, y, dz, PILLAR)
            m.put(x, 10, dz, CHQ)
    for sx in (-1, 1):  # arcs entre les piliers
        for dz in range(-9, 10):
            if dz in (-9, -3, 3, 9):
                continue
            k = min((dz - p) for p in (-9, -3, 3, 9) if dz > p)
            m.put(sx * 5, 11, dz, sl(SQZ, "top"))
            if k in (1, 5):
                m.put(sx * 5, 10, dz, st(SQZ, "north" if k == 1 else "south", "top"))
    for dz in (-8, -2, 4):
        for y in range(RIDGE - 7, RIDGE):
            m.put(0, y, dz, "minecraft:chain")
        m.put(0, RIDGE - 8, dz, HANG)
        for sx in (-1, 1):
            m.put(sx, RIDGE - 8, dz, HANG)

    # Cinq portails : trois au fond, un sur chaque côté de la dernière travée.
    spots = [(-5, BACK, "south"), (0, BACK, "south"), (5, BACK, "south"), (-HX, -9, "east"), (HX, -9, "west")]
    order = [3, 0, 1, 2, 4]  # d'ouest en est en entrant : côté gauche, fond gauche, fond centre, fond droit, côté droit
    plates = []
    for (px, pz, face), (name, glass) in zip([spots[i] for i in order], destinations):
        plates.append((name, gate(m, px, pz, face, glass)))
    return plates


def arch_window(m, x, z, y0, y1, axis, outward):
    """Fenêtre en arc brisé de 3 de large dans un mur, avec appui et linteau. axis : sens du mur."""
    for k in (-1, 0, 1):
        for y in range(y0, y1 + 1):
            px, pz = (x, z + k) if axis == "z" else (x + k, z)
            m.put(px, y, pz, GLASS)
    pa, pb = ((x, z - 1), (x, z + 1)) if axis == "z" else ((x - 1, z), (x + 1, z))
    fa, fb = ("north", "south") if axis == "z" else ("west", "east")
    m.put(pa[0], y1 + 1, pa[1], st(PBB, fa, "top"))
    m.put(pb[0], y1 + 1, pb[1], st(PBB, fb, "top"))
    m.put(x, y1 + 1, z, GLASS)
    m.put(x, y1 + 2, z, CHIS)
    ox, oz = (x + outward, z) if axis == "z" else (x, z + outward)  # appui extérieur
    for k in (-1, 0, 1):
        px, pz = (ox, oz + k) if axis == "z" else (ox + k, oz)
        m.put(px, y0 - 1, pz, sl(PBB, "top"))


def rosace(m, x, y, z, r):
    """Rosace rubis : disque de verre, rayons et anneau de calcite, cœur de quartz sculpté."""
    for dx in range(-r - 1, r + 2):
        for dy in range(-r - 1, r + 2):
            d = math.hypot(dx, dy)
            if d <= r + 0.5:
                ring = d > r - 0.5
                spoke = dx == 0 or dy == 0 or abs(dx) == abs(dy)
                name = "minecraft:calcite" if ring else CHQ if d < 0.5 else "minecraft:calcite" if spoke and d > 1.2 else GLASS
                m.put(x + dx, y + dy, z, name)


def portal(m, x, z, width, height):
    """Grand portail : ouverture en arc brisé, trois voussures en retrait (pierre, quartz, pierre)."""
    half = width // 2
    for dx in range(-half, half + 1):
        for y in range(2, 2 + height):
            m.put(x + dx, y, z, "minecraft:air")
    for k in range(1, half + 1):  # arc brisé de l'ouverture
        for dx in (-half + k - 1, half - k + 1):
            m.put(x + dx, 2 + height + k - 1, z, "minecraft:air" if abs(dx) < half - k + 1 else st(PBB, "west" if dx < 0 else "east", "top"))
    for layer, (mat, matst) in enumerate(((PILLAR, SQZ), (PB, PBB), (CHQ, SQZ)), start=1):
        w = half + layer
        zz = z + layer
        if layer == 3:
            zz = z + 1
            w = half + 3
        for sx in (-1, 1):
            for y in range(2, 2 + height + layer - 1):
                m.put(x + sx * w, y, zz, mat)
        for k in range(0, w + 1):  # archivolte en escaliers renversés montant vers la clé
            y = 2 + height + layer - 1 + min(k, w - k) // 1 * 0 + (w - abs(k - w // 2)) // 3
        for dx in range(-w, w + 1):
            y = 2 + height + layer - 1 + (w - abs(dx)) // 2
            m.put(x + dx, y, zz, st(matst, "east" if dx < 0 else "west", "top") if dx else CHIS)
    m.put(x, 2 + height + 4, z + 1, "minecraft:redstone_block")  # clé de voûte rubis


def tower(m, x, z, h, top, spire):
    """Tour carrée 7 × 7 à contreforts d'angle, ouvertures de beffroi, corniche et flèche en escaliers."""
    for dx in range(-h, h + 1):
        for dz in range(-h, h + 1):
            edge = max(abs(dx), abs(dz)) == h
            corner = abs(dx) == h and abs(dz) == h
            m.put(x + dx, 0, z + dz, PB)
            m.put(x + dx, 1, z + dz, PB if edge else "minecraft:polished_deepslate")
            if not edge:
                for y in range(2, top):
                    m.put(x + dx, y, z + dz, "minecraft:air")
                continue
            for y in range(2, top + 1):
                belfry = top - 6 <= y <= top - 2 and (dx == 0 or dz == 0) and not corner
                slit = y in (6, 10) and (dx == 0 or dz == 0) and not corner
                quoin = "minecraft:calcite" if (y // 2) % 2 == 0 else "minecraft:deepslate_tiles"  # chaînage d'angle argent
                m.put(x + dx, y, z + dz, "minecraft:air" if belfry else GLASS if slit else quoin if corner else m.stone())
    for k, (dx, dz, f) in enumerate(((0, -h - 1, "south"), (0, h + 1, "north"), (-h - 1, 0, "east"), (h + 1, 0, "west"))):
        pass
    for dx in range(-h - 1, h + 2):  # corniche
        for dz in range(-h - 1, h + 2):
            if max(abs(dx), abs(dz)) == h + 1:
                f = "south" if dz == -h - 1 else "north" if dz == h + 1 else "east" if dx == -h - 1 else "west"
                m.put(x + dx, top, z + dz, st(PBB, f, "top"))
            elif max(abs(dx), abs(dz)) <= h:
                m.put(x + dx, top + 1, z + dz, PB if max(abs(dx), abs(dz)) == h else "minecraft:deepslate_tiles")
    for dx in (-h, h):  # pinacles d'angle
        for dz in (-h, h):
            m.put(x + dx, top + 2, z + dz, "minecraft:polished_blackstone_brick_wall[up=true]")
            m.put(x + dx, top + 3, z + dz, "minecraft:end_rod[facing=up]")
    # Flèche élancée : à chaque retrait, une rangée d'escaliers puis deux rangées pleines ; mât et épi rubis.
    y = top + 2
    for dx in range(-h + 1, h):  # plateforme sous la flèche, derrière le parapet
        for dz in range(-h + 1, h):
            m.put(x + dx, y, z + dz, "minecraft:deepslate_tiles")
    y += 1
    for r in range(h - 1, 0, -1):
        for dx in range(-r, r + 1):
            for dz in range(-r, r + 1):
                if max(abs(dx), abs(dz)) != r:
                    continue
                f = "south" if dz == -r and abs(dx) < r else "north" if dz == r and abs(dx) < r else "east" if dx == -r else "west"
                for k in range(4):
                    m.put(x + dx, y + k, z + dz, st(DTL, f) if k == 0 else "minecraft:deepslate_tiles")
        y += 4
    for k in range(4):
        m.put(x, y + k, z, "minecraft:deepslate_tiles" if k == 0 else "minecraft:deepslate_tile_wall[up=true]")
    m.put(x, y + 4, z, "minecraft:redstone_block")
    m.put(x, y + 5, z, "minecraft:end_rod[facing=up]")


def gate(m, x, z, face, glass):
    """Portail de destination : panneau noir dans le mur, cadre en arc brisé, vitrail, plaque devant."""
    inward = {"south": (0, 1), "north": (0, -1), "east": (1, 0), "west": (-1, 0)}[face]
    along = (1, 0) if face in ("south", "north") else (0, 1)

    def p(a, y, d):
        return x + along[0] * a + inward[0] * d, y, z + along[1] * a + inward[1] * d

    for a in (-1, 0, 1):
        for y in range(2, 8):
            m.put(*p(a, y, 0), "minecraft:black_concrete")
        m.put(*p(a, 8, 0), glass)
        m.put(*p(a, 9, 0), glass)
    for a in (-2, 2):
        for y in range(2, 8):
            m.put(*p(a, y, 1), PILLAR if y < 7 else CHQ)
    left = "west" if along == (1, 0) else "north"
    right = OPP[left]
    m.put(*p(-1, 8, 1), st(SQZ, left, "top"))
    m.put(*p(1, 8, 1), st(SQZ, right, "top"))
    m.put(*p(0, 8, 1), sl(SQZ, "top"))
    m.put(*p(0, 9, 1), "minecraft:redstone_block")
    for a in (-1, 0, 1):
        m.put(*p(a, 1, 1), "minecraft:red_nether_bricks")
        m.put(*p(a, 1, 2), "minecraft:red_nether_bricks")
    plate = p(0, 2, 1)
    m.put(*plate, "minecraft:polished_blackstone_pressure_plate")
    return (m.cx + plate[0], plate[1], m.cz + plate[2])  # coordonnées sur l'île (monde : y + 100)


# ---------------------------------------------------------------------------------------------------------------
# 2. La Rotonde du Savoir (l'Archive) : tambour circulaire, péristyle de douze colonnes de quartz, coupole à
#    nervures noires et panneaux de calcite, lanternon à flèche, portique à fronton.
# ---------------------------------------------------------------------------------------------------------------

def rotonde(w, cx, cz):
    m = Mason(w, cx, cz, 202)
    m.clear(15, 15, 34)
    R_DRUM, R_COL, H = 8, 11, 11
    for dx in range(-14, 15):  # socle circulaire à deux degrés
        for dz in range(-14, 15):
            d = math.hypot(dx, dz)
            if d <= 13.5:
                m.put(dx, 0, dz, PB)
            if d <= 12.5:
                ring = abs(d - 2.5) < 0.5 or abs(d - 5.5) < 0.5
                m.put(dx, 1, dz, "minecraft:red_nether_bricks" if ring else "minecraft:calcite" if int(d) % 2 else "minecraft:smooth_quartz")
            elif d <= 13.5:
                m.put(dx, 1, dz, sl(PBB))
    # Tambour : mur circulaire, fenêtres hautes en arc, porte au sud.
    for dx in range(-R_DRUM - 1, R_DRUM + 2):
        for dz in range(-R_DRUM - 1, R_DRUM + 2):
            d = math.hypot(dx, dz)
            if not (R_DRUM - 0.5 < d <= R_DRUM + 0.5):
                continue
            ang = math.degrees(math.atan2(dz, dx)) % 360
            window = min(abs((ang - a + 180) % 360 - 180) for a in range(0, 360, 45)) < 7
            door = dz > 0 and abs(dx) <= 1
            for y in range(2, H + 1):
                if door and y <= 5:
                    continue
                if window and 5 <= y <= 9 and not door:
                    m.put(dx, y, dz, GLASS)
                else:
                    m.put(dx, y, dz, "minecraft:red_nether_bricks" if y == 4 else m.stone())
    # Péristyle : douze colonnes (base sculptée, fût de quartz, chapiteau), entablement noir et corniche.
    for k in range(12):
        a = math.radians(k * 30 + 15)
        x, z = round(R_COL * math.cos(a)), round(R_COL * math.sin(a))
        m.put(x, 2, z, CHQ)
        for y in range(3, 9):
            m.put(x, y, z, PILLAR)
        m.put(x, 9, z, CHQ)
    for dx in range(-R_COL - 2, R_COL + 3):
        for dz in range(-R_COL - 2, R_COL + 3):
            d = math.hypot(dx, dz)
            if R_DRUM + 0.5 < d <= R_COL + 1.2:
                m.put(dx, 10, dz, PB)
            elif R_COL + 1.2 < d <= R_COL + 2.0:
                m.put(dx, 10, dz, sl(PBB, "top"))
                m.put(dx, 11, dz, "minecraft:polished_blackstone_brick_wall[up=true]" if (dx + dz) % 3 == 0 else "minecraft:air")
    # Coupole : demi-sphère, huit nervures noires, panneaux de calcite, couronne d'oculi rubis.
    R_DOME = R_DRUM + 0.5
    for dx in range(-R_DRUM - 1, R_DRUM + 2):
        for dz in range(-R_DRUM - 1, R_DRUM + 2):
            for y in range(H + 1, H + 11):
                d = math.sqrt(dx * dx + dz * dz + (y - H) ** 2)
                if R_DOME - 1.1 < d <= R_DOME:
                    ang = math.degrees(math.atan2(dz, dx)) % 360
                    rib = min(abs((ang - a + 180) % 360 - 180) for a in range(0, 360, 45)) < 5
                    oculus = y == H + 3 and not rib and min(abs((ang - a + 180) % 360 - 180) for a in range(22, 360, 45)) < 6
                    m.put(dx, y, dz, PB if rib else GLASS if oculus else "minecraft:calcite")
    # Lanternon : petit tambour de verre rubis, chapeau et flèche.
    top = H + 9
    for dx in range(-2, 3):
        for dz in range(-2, 3):
            d = math.hypot(dx, dz)
            if d <= 2.3:
                m.put(dx, top, dz, PB)
                for y in range(top + 1, top + 4):
                    m.put(dx, y, dz, (GLASS if (dx == 0 or dz == 0) else PILLAR) if d > 1.2 else "minecraft:air")
                m.put(dx, top + 4, dz, PB if d > 1.2 else "minecraft:deepslate_tiles")
    m.put(0, top + 1, 0, "minecraft:sea_lantern")
    for y, mat in ((top + 5, "minecraft:deepslate_tiles"), (top + 6, "minecraft:deepslate_tile_wall[up=true]"),
                   (top + 7, "minecraft:redstone_block"), (top + 8, "minecraft:end_rod[facing=up]")):
        m.put(0, y, 0, mat)
    for dx, dz, f in ((0, -1, "south"), (0, 1, "north"), (-1, 0, "east"), (1, 0, "west")):
        m.put(dx, top + 5, dz, st(DTL, f))
    # Portique au sud : quatre colonnes, entablement, fronton en escaliers avec losange rubis.
    for dx in (-4, -2, 2, 4):
        m.put(dx, 2, 13, CHQ)
        for y in range(3, 9):
            m.put(dx, y, 13, PILLAR)
        m.put(dx, 9, 13, CHQ)
    for dx in range(-5, 6):
        for dz in range(9, 14):
            m.put(dx, 10, dz, PB)
        m.put(dx, 10, 14, st(PBB, "north", "top"))
        m.put(dx, 1, 14, st(PBB, "north"))  # marches
        m.put(dx, 1, 13, PB)
    for dx in range(-6, 7):
        y = 11 + (6 - abs(dx)) // 2
        for yy in range(11, y):
            m.put(dx, yy, 13, PB)
        m.put(dx, y, 13, st(PBB, "east" if dx < 0 else "west") if dx else CHIS)
    for y, half in ((12, 0), (13, 1), (14, 0)):
        for dx in range(-half, half + 1):
            m.put(dx, y, 14, "minecraft:redstone_block")
    # Intérieur : bibliothèques en cercle, pupitres, PNJ guide au centre, lustre sous la coupole.
    for dx in range(-R_DRUM, R_DRUM + 1):
        for dz in range(-R_DRUM, R_DRUM + 1):
            d = math.hypot(dx, dz)
            if R_DRUM - 1.5 < d <= R_DRUM - 0.5 and not (dz > 0 and abs(dx) <= 1):
                for y in (2, 3, 4):
                    m.put(dx, y, dz, "minecraft:bookshelf")
    for dx, dz, f in ((-3, 0, "east"), (3, 0, "west"), (0, -3, "south")):
        m.put(dx, 2, dz, f"minecraft:lectern[facing={f}]")
    m.put(0, 1, 0, "minecraft:lodestone")
    for y in range(H + 3, H + 9):
        m.put(0, y, 0, "minecraft:chain")
    for dx, dz in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
        m.put(dx, H + 2, dz, HANG if (dx, dz) != (0, 0) else "minecraft:chain")
    m.put(0, H + 1, 0, HANG)
    return {"pnj": (cx, 2, cz)}


# ---------------------------------------------------------------------------------------------------------------
# 3. La Chambre forte (Coffre-Royal) : donjon carré à base talutée, quatre tourelles rondes à toit conique,
#    mâchicoulis, chemin de ronde crénelé, porte à herse sous blason rubis, lanternon central.
# ---------------------------------------------------------------------------------------------------------------

def chambre_forte(w, cx, cz):
    m = Mason(w, cx, cz, 303)
    m.clear(13, 13, 30)
    H = 7  # demi-côté du donjon
    TOP = 11
    for dx in range(-H - 3, H + 4):  # socle
        for dz in range(-H - 3, H + 4):
            m.put(dx, 0, dz, PB)
            if max(abs(dx), abs(dz)) < H:
                m.put(dx, 1, dz, "minecraft:red_nether_bricks" if dz == 0 and dx >= 0 else
                      "minecraft:calcite" if (dx + dz) % 2 else "minecraft:smooth_quartz")
    for dx in range(-H, H + 1):
        for dz in range(-H, H + 1):
            if max(abs(dx), abs(dz)) != H:
                continue
            door = dx == H and abs(dz) <= 2
            for y in range(1, TOP + 1):
                if door and y <= 6 and abs(dz) <= (2 if y <= 5 else 1):
                    continue
                m.put(dx, y, dz, "minecraft:red_nether_bricks" if y == 8 else "minecraft:deepslate_tiles" if y <= 2 else m.stone())
            # base talutée : un escalier contre le pied du mur
            ox, oz = (dx + (1 if dx == H else -1 if dx == -H else 0), dz + (1 if dz == H else -1 if dz == -H else 0))
            f = "west" if dx == H else "east" if dx == -H else "north" if dz == H else "south"
            if not (dx == H and abs(dz) <= 2):
                m.put(ox, 1, oz, st(DBR, f))
            # mâchicoulis : consoles en escaliers renversés, parapet crénelé au-dessus
            m.put(ox, TOP, oz, st(PBB, f, "top"))
            m.put(ox, TOP + 1, oz, PB)
            if (dx + dz) % 2 == 0:
                m.put(ox, TOP + 2, oz, PB)
    for dx in range(-H + 1, H):  # chemin de ronde
        for dz in range(-H + 1, H):
            m.put(dx, TOP, dz, PB if max(abs(dx), abs(dz)) > 2 else GLASS)
    # Tourelles d'angle rondes, plus hautes, toit conique et épi.
    for sx in (-1, 1):
        for sz in (-1, 1):
            tx, tz = sx * H, sz * H
            for dx in range(-3, 4):
                for dz in range(-3, 4):
                    d = math.hypot(dx, dz)
                    if d <= 2.7:
                        for y in range(1, TOP + 5):
                            m.put(tx + dx, y, tz + dz, ("minecraft:deepslate_tiles" if y <= 2 else
                                  GLASS if y in (7, 12) and (dx == 0 or dz == 0) and d > 1.5 else m.stone()) if d > 1.5 else "minecraft:air" if y > 1 else PB)
            for k, r in enumerate((3.2, 2.6, 2.1, 1.6, 1.1, 0.6)):
                for dx in range(-4, 5):
                    for dz in range(-4, 5):
                        if math.hypot(dx, dz) <= r:
                            m.put(tx + dx, TOP + 5 + k, tz + dz, "minecraft:deepslate_tiles" if math.hypot(dx, dz) > r - 0.8 or k == 5 else "minecraft:air")
            m.put(tx, TOP + 11, tz, "minecraft:redstone_block")
            m.put(tx, TOP + 12, tz, "minecraft:end_rod[facing=up]")
    # Porte à l'est : arc brisé à voussures, herse levée, colonnes de quartz, blason rubis.
    for dz in range(-2, 3):
        m.put(H, 7, dz, "minecraft:air" if abs(dz) <= 1 else st(PBB, "north" if dz < 0 else "south", "top"))
    for dz in (-1, 0, 1):
        m.put(H, 6, dz, "minecraft:iron_bars[north=true,south=true]")
    for sz in (-1, 1):
        for y in range(1, 8):
            m.put(H + 1, y, sz * 3, PILLAR if y < 7 else CHQ)
        m.put(H + 1, 8, sz * 3, LANTERN)
    for dz in range(-3, 4):
        m.put(H + 1, 9, dz, st(SQZ, "west", "top") if abs(dz) < 3 else CHQ)
    for y, half in ((10, 0), (11, 1), (12, 0)):  # blason rubis au-dessus de la porte, cadre de calcite
        for dz in range(-half - 1, half + 2):
            m.put(H + 1, y, dz, "minecraft:redstone_block" if abs(dz) <= half else "minecraft:calcite")
    for dz in range(-3, 4):  # parvis et marches
        m.put(H + 2, 1, dz, PB)
        m.put(H + 3, 1, dz, st(PBB, "west"))
    for sz in (-1, 1):  # braseros du parvis
        m.put(H + 4, 1, sz * 5, CHIS)
        m.put(H + 4, 2, sz * 5, "minecraft:polished_blackstone_brick_wall[up=true]")
        m.put(H + 4, 3, sz * 5, LANTERN)
    # Lanternon central sur le toit : verre rubis, toit pyramidal.
    for dx in range(-2, 3):
        for dz in range(-2, 3):
            edge = max(abs(dx), abs(dz)) == 2
            for y in range(TOP + 1, TOP + 4):
                m.put(dx, y, dz, (PILLAR if abs(dx) == 2 and abs(dz) == 2 else GLASS) if edge else "minecraft:air")
            m.put(dx, TOP + 4, dz, st(DTL, "south" if dz < 0 else "north" if dz > 0 else "east" if dx < 0 else "west") if edge else "minecraft:deepslate_tiles")
    m.put(0, TOP + 5, 0, "minecraft:redstone_block")
    m.put(0, TOP + 6, 0, "minecraft:end_rod[facing=up]")
    # Intérieur : quatre coffres de caisses sur socles sculptés, cristal rubis, lanternes.
    chests = []
    for sx in (-1, 1):
        for sz in (-1, 1):
            x, z = sx * 3, sz * 3
            m.put(x, 2, z, CHQ)
            m.put(x, 3, z, "minecraft:chest[facing=north]" if sz > 0 else "minecraft:chest[facing=south]")
            m.put(x, TOP - 1, z, HANG)
            chests.append((cx + x, 3, cz + z))
    m.put(0, 1, 0, "minecraft:shroomlight")
    for y in (2, 3, 4):
        m.put(0, y, 0, GLASS)
    m.put(-1, 2, 0, GLASS)
    m.put(0, 2, 1, GLASS)
    m.put(0, 2, -1, GLASS)
    return {"coffres": chests}


# ---------------------------------------------------------------------------------------------------------------
# 4. Le Trésor de Vælor (zone d'investissement) : plan carré aux angles coupés, chaque angle ouvert par une arche
#    (aucun coin mort : qui s'y cache reste visible), portique face à la place, coupole à nervures au-dessus de la
#    zone AFK. En miroir de la Chambre forte de l'autre côté de la place.
# ---------------------------------------------------------------------------------------------------------------

def tresor(w, cx, cz):
    m = Mason(w, cx, cz, 404)
    m.clear(14, 14, 32)
    S, CUT, TOP = 9, 14, 10  # demi-côté, coupe des angles (|dx| + |dz|), haut des murs

    def inside(dx, dz, s=S, cut=CUT):
        return abs(dx) <= s and abs(dz) <= s and abs(dx) + abs(dz) <= cut

    for dx in range(-12, 13):  # socle et sol
        for dz in range(-12, 13):
            if inside(dx, dz, 11, 18):
                m.put(dx, 0, dz, PB)
            if inside(dx, dz, 10, 16):
                m.put(dx, 1, dz, PB)
            if inside(dx, dz):
                zone = max(abs(dx), abs(dz))
                m.put(dx, 1, dz, "minecraft:red_nether_bricks" if zone == 4 else
                      ("minecraft:calcite" if (dx + dz) % 2 else "minecraft:smooth_quartz") if zone < 4 else
                      "minecraft:polished_deepslate" if (dx + dz) % 2 else "minecraft:deepslate_tiles")
    m.put(0, 1, 0, "minecraft:redstone_block")  # sceau rubis au centre de la zone

    # Murs droits (ouest = entrée, trois autres côtés = deux fenêtres en arc brisé), faces d'angle = arches ouvertes.
    for dx in range(-S, S + 1):
        for dz in range(-S, S + 1):
            if not inside(dx, dz) or inside(dx, dz, S - 1, CUT - 1):
                continue
            corner_face = abs(dx) + abs(dz) >= CUT - 0 and abs(dx) > 4 and abs(dz) > 4
            for y in range(2, TOP + 1):
                m.put(dx, y, dz, "minecraft:red_nether_bricks" if y == 5 else m.stone())
            if corner_face:
                # arche d'angle : ouverture de 3 de large au milieu de la face, 5 de haut, arc brisé
                mid = abs(abs(dx) - abs(dz)) <= 2
                if mid:
                    for y in range(2, 7 if abs(abs(dx) - abs(dz)) == 0 else 6):
                        m.put(dx, y, dz, "minecraft:air")
                    if abs(abs(dx) - abs(dz)) == 2:
                        m.put(dx, 6, dz, CHIS)
    for sx in (-1, 1):  # pilastres de quartz encadrant chaque arche d'angle
        for sz in (-1, 1):
            for a, b in ((7, 7), (5, 9), (9, 5)):
                x, z = sx * a, sz * b
                if (a, b) == (7, 7):
                    m.put(x, 7, z, "minecraft:redstone_block")  # clé de voûte rubis
                    continue
                for y in range(2, TOP):
                    m.put(x, y, z, PILLAR if y < TOP - 1 else CHQ)
    # Côtés droits : entrée à l'ouest, fenêtres ailleurs.
    for dz in (-2, 2):
        for side, (axis, out) in {"est": ("z", 1), "nord": ("x", -1), "sud": ("x", 1)}.items():
            if axis == "z":
                arch_window(m, S, dz * 1, 4, 8, axis="z", outward=1) if dz == -2 else arch_window(m, S, 2, 4, 8, axis="z", outward=1)
            else:
                arch_window(m, dz, out * S, 4, 8, axis="x", outward=out)
    for dz in range(-1, 2):  # porte ouest
        for y in range(2, 8):
            m.put(-S, y, dz, "minecraft:air")
    m.put(-S, 8, -1, st(PBB, "north", "top"))
    m.put(-S, 8, 1, st(PBB, "south", "top"))
    m.put(-S, 9, 0, "minecraft:redstone_block")
    # Corniche tout autour et pinacles aux huit angles.
    for dx in range(-S - 1, S + 2):
        for dz in range(-S - 1, S + 2):
            if inside(dx, dz, S + 1, CUT + 1) and not inside(dx, dz):
                f = "east" if dx < -S + 1 else "west" if dx > S - 1 else "south" if dz < 0 else "north"
                m.put(dx, TOP + 1, dz, st(PBB, f, "top"))
            if inside(dx, dz):
                m.put(dx, TOP + 1, dz, PB if not inside(dx, dz, 4, 8) else "minecraft:air")
                if not inside(dx, dz, S - 1, CUT - 1) and (dx + dz) % 2 == 0:
                    m.put(dx, TOP + 2, dz, PB)
    for x, z in ((-S, -5), (-S, 5), (S, -5), (S, 5), (-5, -S), (5, -S), (-5, S), (5, S)):
        m.put(x, TOP + 2, z, CHIS)
        m.put(x, TOP + 3, z, "minecraft:polished_blackstone_brick_wall[up=true]")
        m.put(x, TOP + 4, z, "minecraft:end_rod[facing=up]")
    # Portique ouest : quatre colonnes, entablement, fronton, marches vers la place.
    for dz in (-4, -2, 2, 4):
        m.put(-12, 2, dz, CHQ)
        for y in range(3, 9):
            m.put(-12, y, dz, PILLAR)
        m.put(-12, 9, dz, CHQ)
    for dz in range(-5, 6):
        for dx in range(-12, -S):
            m.put(dx, 10, dz, PB)
            m.put(dx, 1, dz, PB)
        m.put(-13, 10, dz, st(PBB, "east", "top"))
        m.put(-13, 1, dz, st(PBB, "east"))
    for dz in range(-6, 7):
        y = 11 + (6 - abs(dz)) // 2
        for yy in range(11, y):
            m.put(-12, yy, dz, PB)
        m.put(-12, y, dz, st(PBB, "north" if dz < 0 else "south") if dz else CHIS)
    for y, half in ((12, 0), (13, 1), (14, 0)):
        for dz in range(-half, half + 1):
            m.put(-13, y, dz, "minecraft:redstone_block")
    # Coupole au-dessus de la zone AFK : tambour à oculi, nervures noires, calcite, lanternon.
    for dx in range(-6, 7):
        for dz in range(-6, 7):
            d = math.hypot(dx, dz)
            if 4.5 < d <= 5.5:
                for y in range(TOP + 1, TOP + 4):
                    m.put(dx, y, dz, GLASS if y == TOP + 2 and (dx == 0 or dz == 0 or abs(dx) == abs(dz)) else m.stone())
            for y in range(TOP + 4, TOP + 10):
                dd = math.sqrt(dx * dx + dz * dz + (y - TOP - 4) ** 2)
                if 4.6 < dd <= 5.6:
                    ang = math.degrees(math.atan2(dz, dx)) % 360
                    rib = min(abs((ang - a + 180) % 360 - 180) for a in range(0, 360, 45)) < 7
                    m.put(dx, y, dz, PB if rib else "minecraft:calcite")
    for y, mat in ((TOP + 10, CHQ), (TOP + 11, "minecraft:polished_blackstone_brick_wall[up=true]"),
                   (TOP + 12, "minecraft:redstone_block"), (TOP + 13, "minecraft:end_rod[facing=up]")):
        m.put(0, y, 0, mat)
    for y in range(TOP + 2, TOP + 9):  # lustre
        m.put(0, y, 0, "minecraft:chain")
    m.put(0, TOP + 1, 0, HANG)
    for dx, dz in ((3, 3), (-3, 3), (3, -3), (-3, -3)):
        m.put(dx, TOP, dz, HANG)
    # Bancs le long des murs droits, tournés vers la zone.
    for k in (-3, -2, 2, 3):
        m.put(k, 2, -S + 1, st("pale_oak", "north"))
        m.put(k, 2, S - 1, st("pale_oak", "south"))
        m.put(S - 1, 2, k, st("pale_oak", "east"))
    return {"zone": ((cx - 4, 2, cz - 4), (cx + 4, 5, cz + 4))}
