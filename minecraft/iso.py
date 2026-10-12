"""Rendu isométrique simple d'une zone d'un monde VÆLORIA (vue depuis le sud-est), pour juger l'architecture.

render_iso(get, x0, x1, y0, y1, z0, z1, path, scale) : get(x, y, z) -> nom de bloc ("minecraft:air" si vide).
"""

from __future__ import annotations

from PIL import Image, ImageDraw

COLORS = [
    ("red_stained_glass", (196, 44, 52)), ("white_stained_glass", (236, 236, 240)), ("black_stained_glass", (34, 34, 40)),
    ("gray_stained_glass", (96, 96, 104)), ("light_gray_stained_glass", (170, 170, 176)), ("redstone_block", (190, 28, 12)),
    ("red_nether_brick", (92, 18, 22)), ("red_nether", (92, 18, 22)), ("chiseled_quartz", (232, 228, 220)), ("quartz_pillar", (236, 232, 224)),
    ("smooth_quartz", (238, 232, 225)), ("quartz", (236, 230, 223)), ("calcite", (224, 225, 221)), ("black_concrete", (14, 15, 20)),
    ("chiseled_polished_blackstone", (62, 56, 66)), ("cracked_polished_blackstone", (52, 46, 54)), ("polished_blackstone", (58, 52, 62)),
    ("blackstone", (48, 42, 52)), ("deepslate_tile", (64, 64, 68)), ("deepslate_brick", (72, 72, 76)), ("polished_deepslate", (80, 80, 84)),
    ("deepslate", (76, 76, 80)), ("tuff", (108, 109, 102)), ("pale_moss", (158, 164, 154)), ("pale_oak_leaves", (128, 134, 126)),
    ("pale_oak", (212, 206, 200)), ("bookshelf", (122, 88, 52)), ("lectern", (150, 110, 70)), ("chest", (164, 116, 52)),
    ("lantern", (240, 186, 92)), ("chain", (90, 95, 105)), ("end_rod", (244, 244, 236)), ("iron_bars", (170, 170, 176)),
    ("sea_lantern", (214, 236, 236)), ("shroomlight", (240, 146, 72)), ("lodestone", (150, 150, 156)), ("water", (52, 92, 170)),
    ("iron_block", (220, 220, 224)), ("beacon", (130, 230, 220)), ("pressure_plate", (62, 56, 66)),
]


def color(name):
    for k, c in COLORS:
        if k in name:
            return c
    return (120, 120, 124)


def render_iso(get, x0, x1, y0, y1, z0, z1, path, scale=6, bg=(10, 10, 14)):
    s = scale
    cells = []
    for x in range(x0, x1 + 1):
        for z in range(z0, z1 + 1):
            for y in range(y0, y1 + 1):
                n = get(x, y, z)
                if n != "minecraft:air" and "air" not in n:
                    cells.append((x + z, y, x, z, n))
    if not cells:
        return
    def proj(x, y, z):
        return ((x - x0) - (z - z0)) * s, ((x - x0) + (z - z0)) * s / 2 - (y - y0) * s
    xs = [proj(c[2], c[1], c[3])[0] for c in cells]
    ys = [proj(c[2], c[1], c[3])[1] for c in cells]
    minx, maxx, miny, maxy = min(xs) - 2 * s, max(xs) + 2 * s, min(ys) - 2 * s, max(ys) + 2 * s
    img = Image.new("RGB", (int(maxx - minx), int(maxy - miny)), bg)
    d = ImageDraw.Draw(img)
    cells.sort(key=lambda c: (c[0], c[1]))
    for _, y, x, z, n in cells:
        px, py = proj(x, y, z)
        px, py = px - minx, py - miny
        c = color(n)
        thin = any(k in n for k in ("chain", "end_rod", "iron_bars", "lantern", "pressure_plate", "_wall"))
        top = [(px, py), (px + s, py + s / 2), (px, py + s), (px - s, py + s / 2)]
        left = [(px - s, py + s / 2), (px, py + s), (px, py + 2 * s), (px - s, py + 1.5 * s)]
        right = [(px, py + s), (px + s, py + s / 2), (px + s, py + 1.5 * s), (px, py + 2 * s)]
        if thin:
            d.rectangle([px - s / 4, py + s / 2, px + s / 4, py + 1.8 * s], fill=c)
            continue
        d.polygon(top, fill=tuple(min(255, int(v * 1.15)) for v in c))
        d.polygon(left, fill=tuple(int(v * 0.78) for v in c))
        d.polygon(right, fill=tuple(int(v * 0.58) for v in c))
    img.save(path)
