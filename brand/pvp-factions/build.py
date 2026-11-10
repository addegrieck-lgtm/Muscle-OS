"""Logo VÆLORIA PvP Factions : l'emblème du pack logo, deux épées croisées derrière le bouclier.

    python3 build.py      # écrit les SVG ; render.js en fait des PNG
Reprend la palette, le bouclier et le wordmark de ../build.py (sans réécrire les fichiers du pack).
"""
import base64
import os

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, "..", "build.py"), encoding="utf-8").read()
src = src[: src.index('write("valoria-symbole.svg"')]
src = src.replace("OUT = os.path.dirname(os.path.abspath(__file__))", f"OUT = {HERE!r}")
exec(src)  # DEFS, emblem(), wordmark(), svg(), place(), BLACK, RUBY_HI…

font = base64.b64encode(open(os.path.join(HERE, "fonts", "chakra-petch-latin-700-normal.woff2"), "rb").read()).decode()
FONT_CSS = ("<style>@font-face{font-family:'Chakra Petch';font-weight:700;"
            f"src:url(data:font/woff2;base64,{font}) format('woff2');}}</style>")

SWORD_DEFS = """
<defs>
  <linearGradient id="bladeL" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E1E3E8"/>
  </linearGradient>
  <linearGradient id="bladeR" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#B9BDC6"/><stop offset="1" stop-color="#7C818C"/>
  </linearGradient>
  <linearGradient id="grip" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#2A2C33"/><stop offset="0.5" stop-color="#3A3D46"/><stop offset="1" stop-color="#121318"/>
  </linearGradient>
</defs>"""


def sword():
    """Épée pointe en haut, garde en (0,0). Lame de 440, poignée et pommeau sous la garde."""
    L = 420
    wraps = "".join(f'<rect x="-10" y="{y}" width="20" height="4" fill="#6E737E"/>' for y in range(22, 84, 13))
    return f"""
<g>
  <polygon points="0,{-L - 34} -17,{-L} -17,0 0,0" fill="url(#bladeL)"/>
  <polygon points="0,{-L - 34} 17,{-L} 17,0 0,0" fill="url(#bladeR)"/>
  <polygon points="-3,-30 0,-34 3,-30 3,{-L + 40} 0,{-L + 20} -3,{-L + 40}" fill="#6E737E" opacity="0.55"/>
  <rect x="-10" y="10" width="20" height="82" fill="url(#grip)"/>
  {wraps}
  <polygon points="-82,-2 -66,-18 -20,-12 0,-20 20,-12 66,-18 82,-2 66,10 20,6 0,14 -20,6 -66,10" fill="url(#silver)"/>
  <polygon points="-82,-2 -66,-18 -66,10" fill="url(#ruby)"/>
  <polygon points="82,-2 66,-18 66,10" fill="url(#ruby)"/>
  <polygon points="0,-12 9,-3 0,6 -9,-3" fill="url(#ruby)"/>
  <polygon points="0,90 20,110 0,130 -20,110" fill="url(#silver)"/>
  <polygon points="0,98 12,110 0,122 -12,110" fill="url(#ruby)"/>
</g>"""


def crossed():
    """Deux épées croisées derrière le bouclier, dans l'espace 512 × 512 de l'emblème."""
    out = ""
    for a in (-40, 40):
        out += f'<g transform="translate(256 300) rotate({a}) scale(1.3) translate(0 190)">{sword()}</g>'
    return out


def emblem_swords():
    return crossed() + emblem()


def pvp_factions(cx, y, size, spacing):
    return (f'<text x="{cx}" y="{y}" text-anchor="middle" font-family="Chakra Petch" font-weight="700" '
            f'font-size="{size}" letter-spacing="{spacing}" fill="url(#silverSub)">PVP FACTIONS</text>')


SUB_DEFS = """
<defs>
  <linearGradient id="silverSub" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.5" stop-color="#D9DCE2"/>
    <stop offset="0.52" stop-color="#A9AEB8"/><stop offset="1" stop-color="#D6D9DF"/>
  </linearGradient>
</defs>"""


def doc(w, h, body, bg=True):
    back = f'<rect width="{w}" height="{h}" fill="{BLACK}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
            f"{FONT_CSS}{DEFS}{SWORD_DEFS}{SUB_DEFS}{back}{body}</svg>")


def out(name, content):
    with open(os.path.join(HERE, name), "w", encoding="utf-8") as f:
        f.write(content)
    print(name)


WM, WM_W = wordmark()
W = H = 1200
es, ws = 0.95, 1.4
ex = (W - 512 * es) / 2
wx = (W - WM_W * ws) / 2
glow = '<ellipse cx="600" cy="380" rx="480" ry="400" fill="url(#glow)"/>'
sub_y = 995
rule = (f'<rect x="170" y="{sub_y - 20}" width="100" height="3" fill="#6E737E"/>'
        f'<polygon points="284,{sub_y - 30} 294,{sub_y - 18.5} 284,{sub_y - 7} 274,{sub_y - 18.5}" fill="url(#ruby)"/>'
        f'<rect x="930" y="{sub_y - 20}" width="100" height="3" fill="#6E737E"/>'
        f'<polygon points="916,{sub_y - 30} 926,{sub_y - 18.5} 916,{sub_y - 7} 906,{sub_y - 18.5}" fill="url(#ruby)"/>')
main = place(emblem_swords(), ex, 50, es) + place(WM, wx, 745, ws) + rule + pvp_factions(600, sub_y, 58, 14)
out("vaeloria-pvp-factions-logo.svg", doc(W, H, glow + main))
out("vaeloria-pvp-factions-logo-transparent.svg", doc(W, H, main, bg=False))

# Photo de profil (recadrage rond) : emblème + épées seuls
P = 1080
ps = 1.3
icon = (f'<ellipse cx="540" cy="520" rx="470" ry="440" fill="url(#glow)"/>'
        + place(emblem_swords(), 540 - 256 * ps, 540 - 318 * ps, ps))
out("vaeloria-pvp-factions-profil.svg", doc(P, P, icon))


# --------------------------------------------------------------------------- variante pixel (style Minecraft)
# Épée originale en pixel art 16 × 16, diagonale (pommeau en bas à gauche, pointe en haut à droite),
# aux couleurs de la marque. Dessin propre à VÆLORIA : aucune texture Mojang n'est reprise.
PIX = {
    "K": "#2E3038",  # contour
    "W": "#FFFFFF",  # arête de la lame
    "L": "#D9DCE2",  # lame, face éclairée
    "D": "#8A8F9A",  # lame, face dans l'ombre
    "R": "#D21F2F",  # rubis clair
    "r": "#7A0A14",  # rubis sombre
    "G": "#6E737E",  # poignée
    "g": "#4A4E58",  # poignée, ombre
}


def pixel_sword_grid():
    cells = {}
    tip = 18
    for x in range(6, tip + 1):  # lame le long de x + y = 15
        y = 15 - x
        cells[(x, y)] = "W"
        if x < tip:
            cells[(x, y - 1)] = "L"
            cells[(x + 1, y)] = "D"
    cells[(tip + 1, 15 - tip - 1)] = "L"
    for i, (x, y) in enumerate([(3, 8), (4, 9), (5, 10), (6, 11), (7, 12)]):  # garde
        cells[(x, y)] = "R" if i in (0, 4) else "r"
    cells[(5, 10)] = "R"
    for x, y, c in [(4, 11, "G"), (3, 12, "g"), (2, 13, "G")]:  # poignée
        cells[(x, y)] = c
    for x, y, c in [(1, 14, "R"), (0, 15, "r"), (1, 15, "r"), (0, 14, "r")]:  # pommeau
        cells[(x, y)] = c
    out = dict(cells)
    for (x, y) in cells:  # contour d'un pixel
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                n = (x + dx, y + dy)
                if n not in cells and abs(dx) + abs(dy) == 1:
                    out[n] = "K"
    return out


def pixel_sword(cell, mirror=False):
    rects = []
    for (x, y), c in pixel_sword_grid().items():
        px = (15 - x) if mirror else x
        rects.append(f'<rect x="{px * cell}" y="{y * cell}" width="{cell}" height="{cell}" fill="{PIX[c]}"/>')
    return f'<g shape-rendering="crispEdges">{"".join(rects)}</g>'


def emblem_pixel():
    cell = 30
    half = 8 * cell
    swords = "".join(
        f'<g transform="translate({256 - half + (3 * cell if m else -3 * cell)} {360 - half})">{pixel_sword(cell, m)}</g>'
        for m in (False, True))
    return swords + emblem()


main_px = place(emblem_pixel(), ex, 50, es) + place(WM, wx, 745, ws) + rule + pvp_factions(600, sub_y, 58, 14)
out("vaeloria-pvp-factions-pixel-logo.svg", doc(W, H, glow + main_px))
out("vaeloria-pvp-factions-pixel-logo-transparent.svg", doc(W, H, main_px, bg=False))
icon_px = (f'<ellipse cx="540" cy="520" rx="470" ry="440" fill="url(#glow)"/>'
           + place(emblem_pixel(), 540 - 256 * 1.02, 540 - 300 * 1.02, 1.02))
out("vaeloria-pvp-factions-pixel-profil.svg", doc(P, P, icon_px))
