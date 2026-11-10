"""Exporte les blocs visibles d'un .schem en binaire pour le rendu three.js : int16 x,y,z + uint8 r,g,b,flags."""
import sys, struct, json
from pathlib import Path
sys.path.insert(0, sys.argv[3])  # dossier koth-volcan (pour les couleurs volcan) ; il importe ile-commerciale
sys.argv_saved = sys.argv
import kv  # copie de generate.py du KOTH (met à jour ile.COLORS)
ile = kv.ile
src, out = Path(sys.argv[1]), Path(sys.argv[2])
meta, blocks = ile.read_schem(src)
EXTRA = {"deepslate_tile_stairs": (54, 54, 55), "quartz_pillar": (235, 230, 224), "polished_blackstone_brick_stairs": (48, 42, 50),
         "deepslate_bricks": (70, 70, 71), "bookshelf": (140, 105, 60), "chiseled_quartz_block": (231, 226, 218),
         "smooth_quartz_stairs": (235, 229, 222), "smooth_quartz_slab": (235, 229, 222), "deepslate_brick_stairs": (70, 70, 71),
         "deepslate_tile_wall": (54, 54, 55), "white_stained_glass": (230, 230, 235), "black_stained_glass": (25, 25, 30),
         "gray_stained_glass": (76, 76, 80), "light_gray_stained_glass": (150, 150, 152), "chest": (150, 105, 40),
         "lectern": (160, 120, 70), "powder_snow": (240, 245, 248), "polished_blackstone_slab": (53, 48, 56),
         "sweet_berry_bush": (50, 90, 55), "cobweb": (220, 225, 230), "dispenser": (110, 110, 110),"water": (40, 70, 160), "magma_block": (160, 70, 30), "campfire": (230, 140, 50), "lava": (255, 120, 20),
         "soul_lantern": (90, 200, 210), "beacon": (120, 220, 215), "torch": (250, 200, 90), "sea_lantern": (200, 230, 225),
         "glowstone": (250, 210, 130), "grass_block": (95, 140, 60), "dirt": (120, 85, 60), "stone": (125, 125, 125),
         "oak_leaves": (70, 110, 50), "spruce_leaves": (50, 80, 50), "cherry_leaves": (230, 170, 200)}
GLOW = {"lava", "magma_block", "lantern", "soul_lantern", "shroomlight", "campfire", "beacon", "torch", "sea_lantern",
        "glowstone", "end_rod", "redstone_block"}
solid = set(k for k, v in blocks.items() if ile.is_full(v))
rec = bytearray()
n = 0
for (x, y, z), s in blocks.items():
    b = ile.base(s)
    if b in ile.INVISIBLE or b in ("air", "light", "barrier", "structure_void"):
        continue
    if (x, y, z) in solid and all(((x + dx, y + dy, z + dz) in solid) for dx, dy, dz in
                                  ((1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1))):
        continue
    c = EXTRA.get(b) or ile.COLORS.get(b) or (150, 150, 150)
    flags = (1 if b in GLOW else 0) | (2 if (x, y, z) not in solid else 0)
    rec += struct.pack("<hhhBBBB", x, y, z, c[0], c[1], c[2], flags)
    n += 1
out.write_bytes(bytes(rec))
xs = [k[0] for k in blocks]; ys = [k[1] for k in blocks]; zs = [k[2] for k in blocks]
print(json.dumps({"n": n, "size": [max(xs)+1, max(ys)+1, max(zs)+1], "offset": meta.get("WEOffsetX"), "meta": {k: v for k, v in meta.items() if isinstance(v, int)}}))
