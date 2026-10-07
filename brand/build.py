"""Generate the VÆLORIA logo system as SVG files."""
import os

OUT = os.path.dirname(os.path.abspath(__file__))

# ---------- palette ----------
BLACK = "#07070A"
ANTH = "#1B1C21"
ANTH2 = "#2A2C33"
RUBY = "#A3121E"
RUBY_HI = "#D21F2F"
RUBY_LO = "#5E0710"

DEFS = f"""
<defs>
  <linearGradient id="silver" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFFFFF"/>
    <stop offset="0.45" stop-color="#D9DCE2"/>
    <stop offset="0.55" stop-color="#A9AEB8"/>
    <stop offset="1" stop-color="#E6E8EC"/>
  </linearGradient>
  <linearGradient id="silverText" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="100">
    <stop offset="0" stop-color="#FFFFFF"/>
    <stop offset="0.48" stop-color="#E2E4E9"/>
    <stop offset="0.52" stop-color="#AEB3BC"/>
    <stop offset="1" stop-color="#D6D9DF"/>
  </linearGradient>
  <linearGradient id="rubyText" gradientUnits="userSpaceOnUse" x1="0" y1="62" x2="0" y2="86">
    <stop offset="0" stop-color="{RUBY_HI}"/>
    <stop offset="1" stop-color="{RUBY_LO}"/>
  </linearGradient>
  <linearGradient id="silverDark" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#B9BDC6"/>
    <stop offset="1" stop-color="#6E737E"/>
  </linearGradient>
  <linearGradient id="core" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{ANTH2}"/>
    <stop offset="1" stop-color="{BLACK}"/>
  </linearGradient>
  <linearGradient id="ruby" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{RUBY_HI}"/>
    <stop offset="1" stop-color="{RUBY_LO}"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.45" r="0.6">
    <stop offset="0" stop-color="#2A0A0E" stop-opacity="0.9"/>
    <stop offset="1" stop-color="{BLACK}" stop-opacity="0"/>
  </radialGradient>
</defs>"""

# ---------- emblem (512 x 512 space) ----------
SHIELD = ("M256 40 L300 100 L360 72 L432 104 L432 264 "
          "C432 360 360 420 256 472 C152 420 80 360 80 264 "
          "L80 104 L152 72 L212 100 Z")
INSET = 'transform="translate(256 262) scale(0.875) translate(-256 -262)"'


def emblem(mode="color"):
    """mode: color | white | black"""
    if mode == "color":
        return f"""
<g>
  <path d="{SHIELD}" fill="url(#silver)"/>
  <path d="{SHIELD}" {INSET} fill="url(#core)"/>
  <polygon points="160,150 187,150 256,350 256,400" fill="#F4F5F7"/>
  <polygon points="187,150 214,150 256,300 256,350" fill="url(#silverDark)"/>
  <polygon points="352,150 325,150 256,350 256,400" fill="#A9AEB8"/>
  <polygon points="325,150 298,150 256,300 256,350" fill="#E1E3E8"/>
  <polygon points="256,150 276,188 256,272 236,188" fill="url(#ruby)"/>
  <polygon points="256,150 276,188 256,188" fill="{RUBY_HI}" opacity="0.55"/>
</g>"""
    fg = "#FFFFFF" if mode == "white" else BLACK
    # one-colour: shield rim + knocked-out core, solid V, gem
    return f"""
<g>
  <path d="{SHIELD}" fill="{fg}"/>
  <path d="{SHIELD}" {INSET} fill="{'#000' if mode == 'white' else '#fff'}"/>
  <polygon points="160,150 214,150 256,300 298,150 352,150 256,400" fill="{fg}"/>
  <polygon points="256,150 276,188 256,272 236,188" fill="{fg}"/>
</g>"""


def emblem_mono_mask(fg):
    """True transparent one-colour emblem using evenodd cut-out."""
    # outer shield minus inset is done with a mask so the background shows through
    return f"""
<mask id="cut">
  <path d="{SHIELD}" fill="#fff"/>
  <path d="{SHIELD}" {INSET} fill="#000"/>
  <polygon points="160,150 214,150 256,300 298,150 352,150 256,400" fill="#fff"/>
  <polygon points="256,150 276,188 256,272 236,188" fill="#fff"/>
</mask>
<rect width="512" height="512" fill="{fg}" mask="url(#cut)"/>"""


# ---------- custom wordmark (cap height 100) ----------
def poly(pts, fill):
    return f'<polygon points="{" ".join(f"{x},{y}" for x, y in pts)}" fill="{fill}"/>'


def path_evenodd(rings, fill):
    d = " ".join("M" + " L".join(f"{x} {y}" for x, y in r) + " Z" for r in rings)
    return f'<path d="{d}" fill="{fill}" fill-rule="evenodd"/>'


def glyphs(fill, accent):
    """Return list of (width, svg) for V Æ L O R I A."""
    g = []
    # V — sharp, echoing the emblem
    g.append((84, poly([(0, 0), (21, 0), (42, 72), (63, 0), (84, 0), (52, 100), (32, 100)], fill)))
    # Æ — the signature letter: A-leg fused to E, ruby blade as crossbar
    ae = "".join([
        # A-leg, shared top bar and E as one contour: the A counter opens into the E stem
        poly([(44, 0), (122, 0), (114, 17), (76, 17), (76, 42), (112, 42), (105, 58),
              (76, 58), (76, 83), (122, 83), (114, 100), (58, 100), (58, 18),
              (22, 100), (0, 100)], fill),
        # ruby crossbar: the signature of the brand
        poly([(36.9, 66), (58, 66), (58, 80), (30.8, 80)], accent),
    ])
    g.append((122, ae))
    # L
    g.append((64, poly([(0, 0), (18, 0), (18, 83), (64, 83), (57, 100), (0, 100)], fill)))
    # O — faceted octagon
    g.append((82, path_evenodd([
        [(18, 0), (64, 0), (82, 18), (82, 82), (64, 100), (18, 100), (0, 82), (0, 18)],
        [(25, 17), (57, 17), (64, 24), (64, 76), (57, 83), (25, 83), (18, 76), (18, 24)],
    ], fill)))
    # R
    g.append((80, path_evenodd([
        [(0, 0), (62, 0), (78, 16), (78, 42), (64, 56), (80, 100), (60, 100), (46, 58),
         (18, 58), (18, 100), (0, 100)],
        [(18, 17), (55, 17), (60, 22), (60, 36), (55, 41), (18, 41)],
    ], fill)))
    # I
    g.append((18, poly([(0, 0), (18, 0), (18, 100), (0, 100)], fill)))
    # A — no fuss, sharp apex
    g.append((84, path_evenodd([
        [(32, 0), (52, 0), (84, 100), (64, 100), (58, 81), (26, 81), (20, 100), (0, 100)],
        [(42, 24), (53, 64), (31, 64)],
    ], fill)))
    return g


TRACK = 16


def wordmark(fill="url(#silverText)", accent="url(#rubyText)"):
    x = 0
    parts = []
    for w, s in glyphs(fill, accent):
        parts.append(f'<g transform="translate({x} 0)">{s}</g>')
        x += w + TRACK
    return "".join(parts), x - TRACK  # svg, total width


WM, WM_W = wordmark()


def svg(w, h, body, bg=None):
    bgr = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'width="{w}" height="{h}">{DEFS}{bgr}{body}</svg>')


def place(inner, x, y, s):
    return f'<g transform="translate({x} {y}) scale({s})">{inner}</g>'


def write(name, content):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(content)


# 1. Symbol alone (transparent)
write("valoria-symbole.svg", svg(512, 512, emblem()))

# 2. Emblem + VÆLORIA, stacked (black)
W, H = 1200, 1200
es = 1.15
ex = (W - 512 * es) / 2
ws = 1.45
wx = (W - WM_W * ws) / 2
body = (f'<ellipse cx="600" cy="420" rx="460" ry="380" fill="url(#glow)"/>'
        + place(emblem(), ex, 90, es)
        + place(WM, wx, 770, ws)
        + f'<rect x="{W/2-150}" y="960" width="120" height="3" fill="#6E737E"/>'
        + f'<rect x="{W/2+30}" y="960" width="120" height="3" fill="#6E737E"/>'
        + f'<polygon points="600,948 612,961.5 600,975 588,961.5" fill="url(#ruby)"/>')
write("valoria-logo-complet.svg", svg(W, H, body, BLACK))

# 2b. same, transparent
write("valoria-logo-complet-transparent.svg", svg(W, H, place(emblem(), ex, 90, es) + place(WM, wx, 770, ws)))

# 3. Horizontal lockup
eh = 0.72  # emblem scale -> ~369px
ws_h = 1.6
gap = 40
W = int(512 * eh + gap + WM_W * ws_h + 120)
H = 480
body = (place(emblem(), 60, (H - 512 * eh) / 2 + 6, eh)
        + f'<rect x="{60 + 512*eh + gap/2 - 1}" y="150" width="2" height="180" fill="#3A3D45"/>'
        + place(WM, 60 + 512 * eh + gap + 10, (H - 100 * ws_h) / 2, ws_h))
write("valoria-logo-horizontal.svg", svg(W, H, body, BLACK))
write("valoria-logo-horizontal-transparent.svg",
      svg(W, H, body.replace('fill="#3A3D45"', 'fill="#6E737E"')))

# 4. Compact icon (Discord / Minecraft server-icon)
icon = (f'<rect width="512" height="512" fill="{BLACK}"/>'
        f'<ellipse cx="256" cy="250" rx="250" ry="240" fill="url(#glow)"/>'
        + place(emblem(), 28, 28, 456 / 512))
write("valoria-icone.svg", svg(512, 512, icon))

# 5. One-colour versions (merch, embroidery, stamps)
write("valoria-symbole-blanc.svg", svg(512, 512, emblem_mono_mask("#FFFFFF")))
write("valoria-symbole-noir.svg", svg(512, 512, emblem_mono_mask(BLACK)))
WM_WHITE, _ = wordmark("#FFFFFF", RUBY)
WM_BLACK, _ = wordmark(BLACK, RUBY)
write("valoria-wordmark-blanc.svg", svg(int(WM_W) + 40, 140, place(WM_WHITE, 20, 20, 1)))
write("valoria-wordmark-noir.svg", svg(int(WM_W) + 40, 140, place(WM_BLACK, 20, 20, 1)))

# 6. Banner with slogan (YouTube / Twitter / Discord banner) 2560x1440 safe-area centred
W, H = 2560, 1440
s_e = 0.9
s_w = 1.9
group_w = 512 * s_e + 60 + WM_W * s_w
gx = (W - group_w) / 2
cy = H / 2
body = (f'<ellipse cx="{W/2}" cy="{cy}" rx="1100" ry="520" fill="url(#glow)"/>'
        + place(emblem(), gx, cy - 512 * s_e / 2 - 20, s_e)
        + place(WM, gx + 512 * s_e + 60, cy - 100 * s_w / 2 - 40, s_w)
        + f'<text x="{gx + 512*s_e + 60 + 4}" y="{cy + 100*s_w/2 + 40}" '
          f'font-family="Montserrat, Helvetica, Arial, sans-serif" font-weight="700" '
          f'font-size="40" letter-spacing="14" fill="#A9AEB8">LE RETOUR DE LA '
          f'<tspan fill="{RUBY_HI}">VRAIE GUERRE.</tspan></text>')
write("valoria-banniere.svg", svg(W, H, body, BLACK))

# 7. Logotype argenté seul, fond transparent (site web : navbar, hero)
write("valoria-wordmark-argent.svg", svg(int(WM_W) + 4, 104, place(WM, 2, 2, 1)))

print("wordmark width", WM_W)
