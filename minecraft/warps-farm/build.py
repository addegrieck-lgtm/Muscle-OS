#!/usr/bin/env python3
"""Génère les warps farm VÆLORIA : une schématique WorldEdit (.schem, Sponge v2) par grade + aperçus PNG.

    python3 minecraft/warps-farm/build.py

Un warp par grade, plus grand à chaque grade. Le mob le plus fort d'un warp est celui du grade :
Guerrier → Squelette, Seigneur → Pigman, Roi → Creeper, VÆLORIAN → Enderman. Un warp peut contenir
des mobs plus faibles, jamais plus forts. Identité visuelle du spawn (cf. minecraft/ile-commerciale) :
briques de blackstone polie, chemins en deepslate tiles bordés de polished deepslate, plateforme ronde
tuff / red nether bricks, blason V noir sur calcite cerclé de rouge, pale oak, lanternes, accents rouges.

Principe d'une cellule (vue en coupe, walkway à gauche) :

    y=10  ##########            plafond de la cellule
     5-9  #|  S     #            S = spawner (y=7, y=6 pour l'enderman), cellule noire 9×8
       5  #|~~~~~~~~#            ~ = eau qui pousse les mobs vers l'avant (pas d'eau pour l'enderman)
       4  #|########            sol de la cellule
     2-3  #|                     | = fosse : les mobs tombent de 3 blocs (aucun dégât)
     1-2   .                     . = fente de frappe : le joueur tape les jambes, le mob ne le voit pas
       0  ##########
"""
import gzip
import io
import os
import struct

OUT = os.path.dirname(os.path.abspath(__file__))
DATA_VERSION = 4189  # Minecraft 1.21.4, comme le gabarit du spawn et l'Île Marchande (panneaux en pale oak)

# ---------- NBT minimal (big-endian, gzip) ----------
BYTE, SHORT, INT, BYTE_ARRAY, STRING, LIST, COMPOUND, INT_ARRAY = 1, 2, 3, 7, 8, 9, 10, 11


def _str(b, s):
    raw = s.encode("utf-8")
    b.write(struct.pack(">H", len(raw)))
    b.write(raw)


def _payload(b, t, v):
    if t == BYTE:
        b.write(struct.pack(">b", v))
    elif t == SHORT:
        b.write(struct.pack(">h", v))
    elif t == INT:
        b.write(struct.pack(">i", v))
    elif t == BYTE_ARRAY:
        b.write(struct.pack(">i", len(v)))
        b.write(bytes(v))
    elif t == STRING:
        _str(b, v)
    elif t == LIST:
        et, items = v
        b.write(bytes([et if items else 0]))
        b.write(struct.pack(">i", len(items)))
        for it in items:
            _payload(b, et, it)
    elif t == COMPOUND:
        for name, (tt, vv) in v.items():
            b.write(bytes([tt]))
            _str(b, name)
            _payload(b, tt, vv)
        b.write(b"\0")
    elif t == INT_ARRAY:
        b.write(struct.pack(">i", len(v)))
        for i in v:
            b.write(struct.pack(">i", i))


def nbt_file(name, root):
    b = io.BytesIO()
    b.write(bytes([COMPOUND]))
    _str(b, name)
    _payload(b, COMPOUND, root)
    return gzip.compress(b.getvalue(), mtime=0)


def varint(n):
    out = bytearray()
    while True:
        byte = n & 0x7F
        n >>= 7
        if n:
            out.append(byte | 0x80)
        else:
            out.append(byte)
            return out


# ---------- monde en mémoire ----------
class Build:
    def __init__(self):
        self.blocks = {}
        self.entities = {}  # pos -> données de bloc-entité

    def set(self, x, y, z, state):
        self.blocks[(x, y, z)] = state
        self.entities.pop((x, y, z), None)

    def fill(self, x1, y1, z1, x2, y2, z2, state):
        for x in range(min(x1, x2), max(x1, x2) + 1):
            for y in range(min(y1, y2), max(y1, y2) + 1):
                for z in range(min(z1, z2), max(z1, z2) + 1):
                    self.set(x, y, z, state)

    def get(self, x, y, z):
        return self.blocks.get((x, y, z), "air")


# ---------- grades ----------
MOBS = {
    # SpawnData : une donnée en plus de l'id (IsBaby) désactive l'équipement et les bébés aléatoires,
    # qui passeraient par la fente de frappe. Squelette : id seul, sinon il n'aurait pas d'arc.
    "zombie": {"label": "Zombie", "nbt": {"IsBaby": (BYTE, 0)}, "color": (74, 140, 70)},
    "skeleton": {"label": "Squelette", "nbt": {}, "color": (200, 200, 200)},
    "zombified_piglin": {"label": "Pigman", "nbt": {"IsBaby": (BYTE, 0)}, "color": (232, 150, 150)},
    "creeper": {"label": "Creeper", "nbt": {}, "color": (80, 200, 80)},
    "enderman": {"label": "Enderman", "nbt": {}, "color": (190, 90, 230)},
}

# Listes de cellules du nord (côté abside, les plus forts) vers le sud (côté arrivée).
TIERS = [
    dict(key="guerrier", name="GUERRIER", h=2, apse=4, plaza=9, roof=12, accent="iron_block", emblem="small",
         west=["skeleton", "zombie"], east=["skeleton", "zombie"]),
    dict(key="seigneur", name="SEIGNEUR", h=3, apse=5, plaza=11, roof=13, accent="iron_block", emblem="small",
         west=["zombified_piglin", "skeleton", "zombified_piglin"], east=["zombified_piglin", "zombie", "zombified_piglin"]),
    dict(key="roi", name="ROI", h=5, apse=6, plaza=13, roof=16, accent="gold_block", emblem="big",
         west=["creeper", "zombified_piglin", "skeleton", "creeper"], east=["creeper", "skeleton", "zombified_piglin", "creeper"]),
    dict(key="vaelorian", name="VÆLORIAN", h=7, apse=7, plaza=15, roof=18, accent="redstone_block", emblem="big",
         west=["enderman", "creeper", "zombified_piglin", "creeper", "enderman"],
         east=["enderman", "creeper", "zombified_piglin", "creeper", "enderman"]),
]

# Palette VÆLORIA en blocs
NOIR = "polished_blackstone_bricks"
NOIR_BRUT = "blackstone"
NOIR_LISSE = "polished_blackstone"
ANTH = "deepslate_tiles"
ANTH_LISSE = "polished_deepslate"
RUBIS = "red_nether_bricks"
RUBIS_VIF = "redstone_block"
TUFF = "tuff"


def blason(r):
    """Blason du spawn : grand V noir sur un disque de calcite cerclé de rouge. {(dx, dy): bloc}."""
    out = {}
    for dx in range(-r, r + 1):
        for dy in range(-r, r + 1):
            d = (dx * dx + dy * dy) ** 0.5
            if d > r + 0.3:
                continue
            if d > r - 0.8:
                out[(dx, dy)] = RUBIS
                continue
            out[(dx, dy)] = "calcite"
            top, bottom = r - 2, -(r - 2)
            if bottom <= dy <= top:
                off = (r - 2.2) * (dy - bottom) / (top - bottom)  # écart des deux branches, 0 en bas
                if abs(abs(dx) - off) <= (0.75 if r >= 6 else 0.5):
                    out[(dx, dy)] = "black_concrete"
    return out


def sign_entity(lines):
    def text(t):
        return (STRING, '{"text":"%s"}' % t.replace('"', '\\"') if t else '""')

    side = lambda ls: (COMPOUND, {
        "messages": (LIST, (STRING, [text(t)[1] for t in ls])),
        "color": (STRING, "white"),
        "has_glowing_text": (BYTE, 1),
    })
    return {"Id": (STRING, "minecraft:sign"), "front_text": side(lines), "back_text": side(["", "", "", ""]),
            "is_waxed": (BYTE, 1)}


def spawner_entity(mob):
    entity = {"id": (STRING, f"minecraft:{mob}"), **MOBS[mob]["nbt"]}
    return {
        "Id": (STRING, "minecraft:mob_spawner"),
        "SpawnData": (COMPOUND, {"entity": (COMPOUND, entity)}),
        "Delay": (SHORT, 20), "MinSpawnDelay": (SHORT, 200), "MaxSpawnDelay": (SHORT, 800),
        "SpawnCount": (SHORT, 4), "MaxNearbyEntities": (SHORT, 6),
        "RequiredPlayerRange": (SHORT, 16), "SpawnRange": (SHORT, 4),
    }


def build_tier(t):
    """Repère : walkway centré sur x=0, abside au nord (z<0), arrivée au sud. y=0 = sol."""
    w = Build()
    h, n, R, acc = t["h"], len(t["west"]), t["roof"], t["accent"]
    W = h + 11                       # mur extérieur
    zN = -2 - t["apse"]              # mur nord
    zS = 10 * n + t["plaza"]         # mur sud
    zc = 10 * n + t["plaza"] // 2    # centre de l'arrivée
    lantern = "lantern[hanging=true,waterlogged=false]"
    chain = "chain[axis=y,waterlogged=false]"

    # Enveloppe : sol, murs et toit de l'abside et de l'arrivée
    w.fill(-W, 0, zN, W, 0, zS, NOIR)
    for z1, z2 in ((zN, -2), (10 * n, zS)):
        w.fill(-W, 1, z1, -W, R - 1, z2, NOIR)
        w.fill(W, 1, z1, W, R - 1, z2, NOIR)
        w.fill(-W, R, z1, W, R, z2, ANTH)
    w.fill(-W, 1, zN, W, R - 1, zN, NOIR)
    w.fill(-W, 1, zS, W, R - 1, zS, NOIR)
    # Murs hauts entre abside / arrivée et le bloc des cellules (au-dessus du toit des cellules)
    for z in (-1, 10 * n - 1):
        w.fill(-W, 11, z, -(h + 1), R - 1, z, NOIR)
        w.fill(h + 1, 11, z, W, R - 1, z, NOIR)

    spawners = []
    for s, mobs in ((-1, t["west"]), (1, t["east"])):
        X = lambda d: s * d  # noqa: E731  distance au centre → x
        face = "east" if s < 0 else "west"
        for k, mob in enumerate(mobs):
            z0 = 10 * k
            ender = mob == "enderman"
            # Bloc plein de la cellule, puis on creuse
            w.fill(X(h + 1), 0, z0 - 1, X(W), 9, z0 + 9, NOIR_BRUT)
            w.fill(X(h + 1), 10, z0 - 1, X(W), 10, z0 + 9, ANTH)
            w.fill(X(h + 3), 4, z0, X(h + 10), 4, z0 + 8, NOIR_LISSE)       # sol de cellule
            w.fill(X(h + 3), 5, z0, X(h + 10), 9, z0 + 8, "air")            # cellule
            w.fill(X(h + 2), 1, z0, X(h + 2), 1, z0 + 8, NOIR_LISSE)        # fond de fosse
            w.fill(X(h + 2), 2, z0, X(h + 2), 9, z0 + 8, "air")             # fosse
            w.fill(X(h + 1), 1, z0, X(h + 1), 2, z0 + 8, "air")             # fente de frappe
            if not ender:  # eau : source au fond, niveaux 1 → 7 vers la fosse
                for b in range(8):
                    w.fill(X(h + 3 + b), 5, z0, X(h + 3 + b), 5, z0 + 8, f"water[level={7 - b}]")
            sb, sy = (3, 6) if ender else (4, 7)
            sp = (X(h + 3 + sb), sy, z0 + 4)
            w.set(*sp, "spawner")
            w.entities[sp] = spawner_entity(mob)
            spawners.append((sp, mob))

            # Façade côté walkway : linteau, filet argent/or, mur, piliers
            w.fill(X(h + 1), 3, z0, X(h + 1), R - 1, z0 + 8, NOIR)
            w.fill(X(h + 1), 4, z0, X(h + 1), 4, z0 + 8, acc)
            for zp in (z0 - 1, z0 + 9):
                w.fill(X(h + 1), 0, zp, X(h + 1), R - 1, zp, ANTH)
                w.set(X(h + 1), 4, zp, acc)
                w.set(X(h + 1), R - 1, zp, "chiseled_deepslate")
                w.set(X(h), R - 3, zp, f"end_rod[facing={face}]")
            w.set(X(h), 8, z0 + 4, f"red_wall_banner[facing={face}]")
            sign = (X(h), 5, z0 + 4)
            w.set(*sign, f"pale_oak_wall_sign[facing={face},waterlogged=false]")
            w.entities[sign] = sign_entity(["", "SPAWNER", MOBS[mob]["label"].upper(), ""])

    # Walkway : chemin du spawn (deepslate tiles bordé de polished deepslate), losanges rouges, toit, lanternes
    w.fill(-h, 0, zN + 4, h, 0, zc, ANTH)
    w.fill(-h, 0, zN + 4, -h, 0, zc, ANTH_LISSE)
    w.fill(h, 0, zN + 4, h, 0, zc, ANTH_LISSE)
    w.fill(-(h + 1), R, -1, h + 1, R, 10 * n - 1, ANTH)
    w.fill(0, R, -1, 0, R, 10 * n - 1, acc)
    for k in range(n):
        zm = 10 * k + 4
        for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            w.set(dx, 0, zm + dz, RUBIS)
        w.set(0, 0, zm, RUBIS_VIF)
    for z in range(-1, 10 * n, 5):
        w.fill(0, R - 3, z, 0, R - 1, z, chain)
        w.set(0, R - 4, z, lantern)

    # Abside : estrade, écusson, bannières
    dw = h + 5
    w.fill(-dw, 1, zN + 1, dw, 1, zN + 2, ANTH_LISSE)
    w.fill(-dw, 1, zN + 3, dw, 1, zN + 3, "polished_blackstone_brick_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]")
    w.fill(-dw, 0, zN + 1, dw, 0, zN + 3, NOIR)
    br = 6 if t["emblem"] == "big" else 4
    for (dx, dy), st in blason(br).items():
        w.set(dx, 2 + br + dy, zN, st)
    ew = 2 * br + 1
    for bx in (-(ew // 2 + 2), ew // 2 + 2):
        w.set(bx, 6, zN + 1, "red_wall_banner[facing=south]")
        w.set(bx, R - 3, zN + 1, "end_rod[facing=south]")
    for x in range(-W + 3, W - 2, 6):
        for z in range(zN + 3, -1, 4):
            w.fill(x, R - 2, z, x, R - 1, z, chain)
            w.set(x, R - 3, z, lantern)

    # Arrivée : plateforme ronde du spawn (tuff, anneau de red nether bricks, polished deepslate) + filets
    r = t["plaza"] // 2 - 1
    for x in range(-W + 1, W):
        for z in range(10 * n, zS):
            d = (x * x + (z - zc) ** 2) ** 0.5
            if d <= r + 0.4:
                w.set(x, 0, z, ANTH_LISSE if d > r - 0.6 else RUBIS if d > r - 1.6 else TUFF)
    w.set(0, 0, zc, RUBIS_VIF)
    w.fill(-W + 1, 0, zc, -r - 1, 0, zc, acc)
    w.fill(r + 1, 0, zc, W - 1, 0, zc, acc)
    for px in (-W + 2, W - 2):
        for pz in (10 * n + 1, zS - 2):
            w.fill(px, 1, pz, px, R - 1, pz, ANTH)
            w.set(px, 4, pz, acc)
    for x in range(-W + 3, W - 2, 6):
        for z in range(10 * n + 2, zS - 1, 5):
            w.fill(x, R - 2, z, x, R - 1, z, chain)
            w.set(x, R - 3, z, lantern)
    for bx in (-4, 4):
        w.set(bx, 7, zS - 1, "red_wall_banner[facing=north]")
    species = sorted({m for m in t["west"] + t["east"]}, key=list(MOBS).index, reverse=True)
    signs = [
        ["SPAWNERS"] + [MOBS[m]["label"] for m in species] + [""] * (3 - len(species)),
        ["◆ VÆLORIA ◆", "WARP FARM", t["name"], f"/warp farm-{t['key']}"],
        ["FRAPPE LES", "MOBS PAR LES", "FENTES SOUS", "LES CELLULES"],
    ]
    for i, lines in enumerate(signs):
        pos = (i - 1, 3, zS - 1)
        w.set(*pos, "pale_oak_wall_sign[facing=north,waterlogged=false]")
        w.entities[pos] = sign_entity(lines)

    return w, (0, 1, zc), spawners


def write_schem(w, warp, path, name):
    xs, ys, zs = zip(*w.blocks)
    mn = (min(xs), min(ys), min(zs))
    size = (max(xs) - mn[0] + 1, max(ys) - mn[1] + 1, max(zs) - mn[2] + 1)
    palette = {"minecraft:air": 0}
    data = bytearray()
    for y in range(size[1]):
        for z in range(size[2]):
            for x in range(size[0]):
                st = "minecraft:" + w.get(x + mn[0], y + mn[1], z + mn[2])
                data += varint(palette.setdefault(st, len(palette)))
    bes = []
    for (x, y, z), d in w.entities.items():
        bes.append({"Pos": (INT_ARRAY, [x - mn[0], y - mn[1], z - mn[2]]), **d})
    local_warp = [warp[i] - mn[i] for i in range(3)]
    root = {
        "Version": (INT, 2),
        "DataVersion": (INT, DATA_VERSION),
        "Width": (SHORT, size[0]), "Height": (SHORT, size[1]), "Length": (SHORT, size[2]),
        "Offset": (INT_ARRAY, [0, 0, 0]),
        # Origine du presse-papiers = point du warp : //paste pose l'arrivée sous les pieds du joueur
        "Metadata": (COMPOUND, {
            "Name": (STRING, name), "Author": (STRING, "VÆLORIA"),
            "WEOffsetX": (INT, -local_warp[0]), "WEOffsetY": (INT, -local_warp[1]), "WEOffsetZ": (INT, -local_warp[2]),
        }),
        "PaletteMax": (INT, len(palette)),
        "Palette": (COMPOUND, {k: (INT, v) for k, v in palette.items()}),
        "BlockData": (BYTE_ARRAY, data),
        "BlockEntities": (LIST, (COMPOUND, bes)),
    }
    with open(path, "wb") as f:
        f.write(nbt_file("Schematic", root))
    return size


# ---------- aperçus ----------
COLORS = {
    "polished_blackstone_bricks": (48, 42, 50), "blackstone": (42, 35, 41), "polished_blackstone": (56, 50, 60),
    "deepslate_tiles": (54, 54, 56), "polished_deepslate": (72, 72, 74), "chiseled_deepslate": (60, 60, 62),
    "iron_block": (220, 222, 228), "gold_block": (226, 194, 127), "redstone_block": (210, 31, 47),
    "red_nether_bricks": (114, 18, 24), "tuff": (108, 109, 102), "calcite": (223, 224, 220),
    "black_concrete": (8, 10, 15), "water": (52, 96, 190), "spawner": (30, 40, 60), "lantern": (232, 168, 75),
    "end_rod": (240, 234, 220), "red_wall_banner": (163, 18, 30), "chain": (60, 65, 80), "pale_oak_wall_sign": (226, 214, 212),
    "polished_blackstone_brick_stairs": (48, 42, 50),
}


def color(state):
    return COLORS.get(state.split("[")[0], (255, 0, 255))


def render(w, warp, spawners, t, size_out):
    from PIL import Image, ImageDraw, ImageFont

    font = lambda s: ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", s)  # noqa: E731
    xs, ys, zs = zip(*w.blocks)
    x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
    S, cut, top = 14, 7, 70
    img = Image.new("RGB", ((x1 - x0 + 1) * S + 360, (z1 - z0 + 1) * S + top + 20), (7, 7, 10))
    d = ImageDraw.Draw(img)
    for x in range(x0, x1 + 1):
        for z in range(z0, z1 + 1):
            for y in range(cut, -1, -1):
                st = w.get(x, y, z)
                if st != "air":
                    k = 0.55 + 0.45 * y / cut
                    c = tuple(int(v * k) for v in color(st))
                    d.rectangle([(x - x0) * S, top + (z - z0) * S, (x - x0 + 1) * S - 1, top + (z - z0 + 1) * S - 1], fill=c)
                    break
    for (x, y, z), mob in spawners:
        cx, cy = (x - x0) * S + S // 2, top + (z - z0) * S + S // 2
        d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=MOBS[mob]["color"], outline=(255, 255, 255), width=2)
    wx, _, wz = warp
    cx, cy = (wx - x0) * S + S // 2, top + (wz - z0) * S + S // 2
    d.polygon([(cx, cy - 10), (cx + 8, cy + 6), (cx - 8, cy + 6)], fill=(255, 255, 255))
    d.text((12, 12), f"WARP FARM {t['name']}", font=font(26), fill=(244, 245, 247))
    d.text((12, 44), f"{size_out[0]}×{size_out[2]} blocs, hauteur {size_out[1]} — plan coupé à y={cut}, nord en haut",
           font=font(13), fill=(169, 174, 184))
    lx, ly = (x1 - x0 + 1) * S + 24, top
    count = {}
    for _, m in spawners:
        count[m] = count.get(m, 0) + 1
    d.text((lx, ly), "SPAWNERS", font=font(16), fill=(239, 68, 80))
    ly += 28
    for m in sorted(count, key=list(MOBS).index, reverse=True):
        d.ellipse([lx, ly, lx + 16, ly + 16], fill=MOBS[m]["color"], outline=(255, 255, 255))
        d.text((lx + 26, ly), f"{MOBS[m]['label']} × {count[m]}", font=font(14), fill=(244, 245, 247))
        ly += 26
    ly += 14
    for c, label in (((52, 96, 190), "eau (pousse vers la fosse)"), ((56, 50, 60), "fosse / sol"),
                     (color(t["accent"]), "filet de grade"), ((114, 18, 24), "anneau rouge (red nether bricks)")):
        d.rectangle([lx, ly, lx + 16, ly + 16], fill=c)
        d.text((lx + 26, ly), label, font=font(13), fill=(169, 174, 184))
        ly += 24
    d.polygon([(lx + 8, ly), (lx + 16, ly + 16), (lx, ly + 16)], fill=(255, 255, 255))
    d.text((lx + 26, ly), "point du warp (regard nord)", font=font(13), fill=(169, 174, 184))
    return img


def render_section(w, t):
    """Coupe est-ouest au milieu de la 2e cellule (creeper, avec eau)."""
    from PIL import Image, ImageDraw, ImageFont

    xs, ys, _ = zip(*w.blocks)
    x0, x1, y1 = min(xs), max(xs), max(ys)
    S, z = 18, 14
    img = Image.new("RGB", ((x1 - x0 + 1) * S, (y1 + 1) * S + 40), (7, 7, 10))
    d = ImageDraw.Draw(img)
    for x in range(x0, x1 + 1):
        for y in range(y1 + 1):
            st = w.get(x, y, z)
            if st != "air":
                c = (40, 60, 60) if st == "spawner" else color(st)
                d.rectangle([(x - x0) * S, 40 + (y1 - y) * S, (x - x0 + 1) * S - 1, 40 + (y1 - y + 1) * S - 1], fill=c)
    d.text((8, 8), f"Coupe d'une cellule — warp {t['name']}", font=ImageFont.truetype(
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16), fill=(244, 245, 247))
    return img


def main():
    os.makedirs(os.path.join(OUT, "schematics"), exist_ok=True)
    os.makedirs(os.path.join(OUT, "previews"), exist_ok=True)
    for t in TIERS:
        w, warp, spawners = build_tier(t)
        size = write_schem(w, warp, os.path.join(OUT, "schematics", f"farm-{t['key']}.schem"), f"Warp farm {t['name']}")
        render(w, warp, spawners, t, size).save(os.path.join(OUT, "previews", f"farm-{t['key']}.png"))
        if t["key"] == "vaelorian":
            render_section(w, t).save(os.path.join(OUT, "previews", "coupe-cellule.png"))
        print(f"farm-{t['key']}: {size[0]}×{size[2]}×{size[1]}, {len(spawners)} spawners, {len(w.entities)} blocs-entités")


if __name__ == "__main__":
    main()
