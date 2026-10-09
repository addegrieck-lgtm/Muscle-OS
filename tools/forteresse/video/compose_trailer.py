"""Bande-annonce « Mode Faction » de VÆLORIA (60 s, 1920×1080, 30 i/s), motion design aux couleurs du site.

  python3 compose_trailer.py <dossier_de_travail> <sortie.mp4> [instants de contrôle, ex. 5,12.5]
Le dossier de travail contient : t/ (diorama.py), r/ (render_iso.py, la Forteresse), font/package/files/
(@fontsource/chakra-petch), symbole.png, wordmark.png et trailer.wav (trailer_son.py).
Toutes les valeurs affichées viennent de la configuration par défaut de VæloriaFactions.
"""
import json, math, random, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

V, OUT = sys.argv[1], sys.argv[2]
FPS, DUR, WF, HF = 30, 60.0, 1920, 1080
NF = int(FPS * DUR)

BG = (7, 7, 10)
RUBY, RUBY_DEEP, ACCENT, FILL = (210, 31, 47), (163, 18, 30), (239, 68, 80), (193, 28, 43)
SILVER, MUTED, FG, SURF, LINE = (217, 220, 226), (169, 174, 184), (244, 245, 247), (16, 17, 21), (42, 44, 51)
GOLD, BLUE, OBSI = (246, 204, 70), (76, 140, 255), (150, 90, 230)
FD = f"{V}/font/package/files/"
_F = {}
def chakra(sz, w=700):
    k = ("c", sz, w)
    if k not in _F: _F[k] = ImageFont.truetype(FD + f"chakra-petch-latin-{w}-normal.woff", sz)
    return _F[k]
def inter(sz, w="Medium"):
    k = ("i", sz, w)
    if k not in _F: _F[k] = ImageFont.truetype(f"/usr/share/fonts/opentype/inter/Inter-{w}.otf", sz)
    return _F[k]

C1, C2, C3, C4, C5, C6, C7, C8, OUTRO = 4.5, 11.0, 18.5, 25.0, 30.0, 36.0, 48.5, 54.0, 57.0
CHAPTERS = [(C1, C2, "01", "FONDE TA FACTION"), (C2, C3, "02", "PILLAGE À LA TNT"), (C3, C4, "03", "LE SURCLAIM"),
            (C4, C5, "04", "DÉFENDS-TOI"), (C5, C6, "05", "UNE SEULE ÉCONOMIE"), (C6, C7, "06", "LES ÉVÉNEMENTS"),
            (C7, C8, "07", "GUERRES & PRIMES"), (C8, OUTRO, "08", "JEU PROPRE")]
EVENTS = [36.0, 38.5, 41.0, 43.5, 46.0]
TNT_IMPACTS = [12.4, 12.9, 13.4, 13.9]

meta = json.load(open(f"{V}/t/dioramas.json"))
IM = {k: Image.open(f"{V}/t/{k}.png").convert("RGBA") for k in ("bases", "bases_raid", "warzone")}
IM["fort"] = Image.open(f"{V}/r/wide_closed.png").convert("RGBA")
FMETA = json.load(open(f"{V}/r/scene.json"))["metas"]["wide_closed"]
SYMBOL = Image.open(f"{V}/symbole.png").convert("RGBA")
WORDMARK = Image.open(f"{V}/wordmark.png").convert("RGBA")

def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def seg(t, a, b): return clamp((t - a) / (b - a)) if b > a else float(t >= a)
def ease_out(x): return 1 - (1 - x) ** 3
def ease_io(x): return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2
def ease_back(x, k=1.70158): return 1 + (k + 1) * (x - 1) ** 3 + k * (x - 1) ** 2
def lerp(a, b, x): return a + (b - a) * x
def A(c, a): return tuple(c) + (int(255 * clamp(a)),)

def proj(m, x, y, z):
    s, c = m["scale"], 0.8660254
    return ((x - z) * s * c + m["ox"], (x + z) * s * 0.5 - y * s + m["oy"])

class Cam:
    def __init__(self, key, cx, cy, w): self.key, self.cx, self.cy, self.w = key, cx, cy, w
    def h(self): return self.w * HF / WF
    def f(self, p):
        k = WF / self.w
        return ((p[0] - (self.cx - self.w / 2)) * k, (p[1] - (self.cy - self.h() / 2)) * k)

def cam_lerp(a, b, x):
    return Cam(a.key, lerp(a.cx, b.cx, x), lerp(a.cy, b.cy, x), math.exp(lerp(math.log(a.w), math.log(b.w), x)))

def cam_on(key, m, x, y, z, w, dy=0):
    px, py = proj(m, x, y, z)
    return Cam(key, px, py + dy, w)

_BG = None
def background(glow=1.0):
    global _BG
    if _BG is None:
        yy, xx = np.mgrid[0:HF, 0:WF]
        d = np.sqrt(((xx - WF * 0.5) / (WF * 0.6)) ** 2 + ((yy - HF * 0.42) / (HF * 0.7)) ** 2)
        g = np.clip(1 - d, 0, 1) ** 1.6
        base = np.array(BG, np.float32)[None, None] + g[..., None] * (np.array((42, 10, 14), np.float32) - np.array(BG, np.float32))
        _BG = Image.fromarray(base.astype(np.uint8), "RGB").convert("RGBA")
    return _BG.copy()

def place(frame, cam, key, alpha=1.0):
    img = IM[key]
    w, h = cam.w, cam.h()
    part = img.transform((WF, HF), Image.EXTENT, (cam.cx - w / 2, cam.cy - h / 2, cam.cx + w / 2, cam.cy + h / 2), Image.BILINEAR)
    if alpha < 1:
        part.putalpha(part.getchannel("A").point(lambda v: int(v * alpha)))
    frame.alpha_composite(part)

def shot(cam, key=None, mix_key=None, mix=0.0):
    fr = background()
    place(fr, cam, key or cam.key)
    if mix_key and mix > 0:
        place(fr, cam, mix_key, mix)
    return fr

def text_spaced(d, xy, txt, font, fill, spacing=0):
    x, y = xy
    for ch in txt:
        d.text((x, y), ch, font=font, fill=fill)
        x += font.getlength(ch) + spacing
    return x

def spaced_width(txt, font, spacing): return sum(font.getlength(ch) + spacing for ch in txt) - spacing

def center_text(d, y, txt, font, fill, spacing=0):
    w = spaced_width(txt, font, spacing)
    text_spaced(d, (WF / 2 - w / 2, y), txt, font, fill, spacing)

GLOW = {}
def glow(frame, x, y, r, color, a=1.0):
    k = (r, color)
    if k not in GLOW:
        im = Image.new("RGBA", (r * 4, r * 4), (0, 0, 0, 0))
        ImageDraw.Draw(im).ellipse((r, r, r * 3, r * 3), fill=color + (220,))
        GLOW[k] = im.filter(ImageFilter.GaussianBlur(r * 0.7))
    g = GLOW[k]
    if a < 1:
        g = g.copy(); g.putalpha(g.getchannel("A").point(lambda v: int(v * a)))
    frame.alpha_composite(g, (int(x - 2 * r), int(y - 2 * r)))

def pawn(frame, d, x, y, color, size=1.0, a=1.0):
    r = max(4, int(10 * size))
    glow(frame, x, y - 1.2 * r, r, color, a * 0.8)
    d.ellipse((x - r * 0.9, y - r * 0.35, x + r * 0.9, y + r * 0.35), fill=(0, 0, 0, int(110 * a)))
    d.ellipse((x - r, y - 2.2 * r, x + r, y - 0.2 * r), fill=A(color, a), outline=A((255, 255, 255), a), width=max(2, r // 4))

def burst(frame, d, x, y, t, t0, seed, cols=(ACCENT, GOLD, SILVER), n=40, spread=260, life=1.0):
    if t < t0: return
    rng = random.Random(seed)
    for _ in range(n):
        ang = rng.uniform(0, 2 * math.pi); sp = rng.uniform(0.3, 1.0) * spread
        l = (t - t0 - rng.uniform(0, 0.15)) / life
        if not 0 < l < 1: continue
        px = x + math.cos(ang) * sp * l; py = y + math.sin(ang) * sp * l * 0.7 + 200 * l * l
        s = 7 * (1 - l) + 2
        d.rectangle((px - s, py - s, px + s, py + s), fill=A(rng.choice(cols), 1 - l))

# ── Habillage ──
def chapter_card(frame, t, a, b, num, title, sub, chips, x0=110, y0=600):
    tin = ease_out(seg(t, a, a + 0.5)); tout = 1 - ease_io(seg(t, b - 0.3, b)); al = tin * tout
    if al <= 0: return
    pg = np.zeros((HF, 940, 4), np.uint8); pg[..., :3] = BG
    pg[..., 3] = (np.clip(1 - np.arange(940) / 940, 0, 1) ** 1.3 * 215 * al).astype(np.uint8)[None, :]
    frame.alpha_composite(Image.fromarray(pg, "RGBA"))
    d = ImageDraw.Draw(frame)
    x0 = x0 - 60 * (1 - tin)
    d.text((x0, y0 - 150), num, font=chakra(140), fill=A(ACCENT, al))
    d.rectangle((x0, y0 + 10, x0 + 420 * ease_out(seg(t, a + 0.1, a + 0.7)) * tout, y0 + 16), fill=A(RUBY, al))
    text_spaced(d, (x0, y0 + 34), title, chakra(62), A(FG, al), 3)
    if sub:
        d.text((x0, y0 + 118), sub, font=inter(30), fill=A(MUTED, al))
    cy = y0 + 172
    cx = x0
    for i, ch in enumerate(chips):
        ca = al * ease_out(seg(t, a + 0.5 + 0.25 * i, a + 0.8 + 0.25 * i))
        if ca <= 0: continue
        f = chakra(28, 600); tw = f.getlength(ch)
        if cx + tw + 40 > 900:
            cx = x0; cy += 62
        d.rounded_rectangle((cx, cy, cx + tw + 40, cy + 48), radius=24, fill=(30, 10, 14, int(225 * ca)), outline=A(ACCENT, ca), width=2)
        d.text((cx + 20, cy + 7), ch, font=f, fill=A(FG, ca))
        cx += tw + 56

def top_title(frame, t, a, b, num, title, sub=None):
    tin = ease_out(seg(t, a, a + 0.5)); tout = 1 - ease_io(seg(t, b - 0.3, b)); al = tin * tout
    if al <= 0: return
    d = ImageDraw.Draw(frame)
    f = chakra(64)
    w = chakra(64).getlength(num + "  ") + spaced_width(title, f, 3)
    x = WF / 2 - w / 2; y = 120 - 30 * (1 - tin)
    d.text((x, y), num, font=f, fill=A(ACCENT, al))
    text_spaced(d, (x + f.getlength(num + "  "), y), title, f, A(FG, al), 3)
    bw = 300 * ease_out(seg(t, a + 0.1, a + 0.7)) * tout
    d.rectangle((WF / 2 - bw / 2, y + 90, WF / 2 + bw / 2, y + 95), fill=A(RUBY, al))
    if sub:
        fs = inter(32); d.text((WF / 2 - fs.getlength(sub) / 2, y + 112), sub, font=fs, fill=A(MUTED, al))

def hud(frame, t):
    if t < C1 - 0.2 or t > OUTRO + 0.2: return
    al = seg(t, C1 - 0.2, C1 + 0.3) * (1 - seg(t, OUTRO - 0.3, OUTRO + 0.2))
    d = ImageDraw.Draw(frame)
    sym = SYMBOL.resize((52, 52), Image.LANCZOS)
    sym.putalpha(sym.getchannel("A").point(lambda v: int(v * al)))
    frame.alpha_composite(sym, (WF - 400, 44))
    text_spaced(d, (WF - 334, 48), "MODE FACTION", chakra(32), A(FG, al), 4)
    d.text((WF - 334, 86), "VÆLORIA · Minecraft 1.21", font=inter(19), fill=A(MUTED, al * 0.9))
    x, y = 110, HF - 64
    w = (WF - 220 - 7 * 12) / 8
    for i, (a, b, num, _t) in enumerate(CHAPTERS):
        fill = clamp((t - a) / (b - a)); xx = x + i * (w + 12)
        d.rounded_rectangle((xx, y, xx + w, y + 5), radius=3, fill=A(LINE, al))
        if fill > 0: d.rounded_rectangle((xx, y, xx + max(5, w * fill), y + 5), radius=3, fill=A(ACCENT, al))
        d.text((xx, y - 30), num, font=chakra(20, 600), fill=A(ACCENT if a <= t < b else MUTED, al))

def wipe(frame, t, a, b):
    if not a <= t <= b: return
    d = ImageDraw.Draw(frame)
    pos = lerp(-900, WF + 900, ease_io(seg(t, a, b)))
    for off, col in ((0, RUBY_DEEP), (140, RUBY), (260, BG)):
        p = pos - off
        d.polygon([(p - 600, 0), (p + 200, 0), (p - 200, HF), (p - 1000, HF)], fill=col + (255,))

def flash(frame, a, col=(255, 255, 255)):
    if a > 0: frame.alpha_composite(Image.new("RGBA", (WF, HF), col + (int(170 * clamp(a)),)))

# ── Icônes vectorielles ──
def icon(d, kind, cx, cy, s, col, a=1.0):
    c = A(col, a); w = max(3, int(s / 9))
    if kind == "shield":
        d.polygon([(cx, cy - s), (cx + s * 0.8, cy - s * 0.6), (cx + s * 0.7, cy + s * 0.3), (cx, cy + s), (cx - s * 0.7, cy + s * 0.3), (cx - s * 0.8, cy - s * 0.6)], outline=c, width=w)
        d.line([(cx, cy - s * 0.55), (cx, cy + s * 0.55)], fill=c, width=w)
    elif kind == "alert":
        d.polygon([(cx, cy - s), (cx + s, cy + s * 0.8), (cx - s, cy + s * 0.8)], outline=c, width=w)
        d.line([(cx, cy - s * 0.35), (cx, cy + s * 0.25)], fill=c, width=w + 2)
        d.ellipse((cx - w, cy + s * 0.45, cx + w, cy + s * 0.45 + 2 * w), fill=c)
    elif kind == "lock":
        d.rounded_rectangle((cx - s * 0.7, cy - s * 0.1, cx + s * 0.7, cy + s * 0.9), radius=int(s * 0.15), outline=c, width=w)
        d.arc((cx - s * 0.45, cy - s * 0.9, cx + s * 0.45, cy + s * 0.1), 180, 360, fill=c, width=w)
        d.ellipse((cx - w, cy + s * 0.3, cx + w, cy + s * 0.3 + 2 * w), fill=c)
    elif kind == "report":
        d.rounded_rectangle((cx - s * 0.65, cy - s, cx + s * 0.65, cy + s), radius=int(s * 0.12), outline=c, width=w)
        for k in range(4):
            yy = cy - s * 0.55 + k * s * 0.38
            d.line([(cx - s * 0.4, yy), (cx + s * (0.4 if k % 2 == 0 else 0.15), yy)], fill=c, width=w)
    elif kind == "coin":
        d.ellipse((cx - s, cy - s, cx + s, cy + s), outline=c, width=w)
        f = chakra(int(s * 1.1)); d.text((cx - f.getlength("$") / 2, cy - s * 0.72), "$", font=f, fill=c)
    elif kind == "skull":
        d.ellipse((cx - s * 0.8, cy - s, cx + s * 0.8, cy + s * 0.5), outline=c, width=w)
        d.rectangle((cx - s * 0.45, cy + s * 0.4, cx + s * 0.45, cy + s * 0.9), outline=c, width=w)
        d.ellipse((cx - s * 0.5, cy - s * 0.35, cx - s * 0.12, cy + s * 0.05), fill=c)
        d.ellipse((cx + s * 0.12, cy - s * 0.35, cx + s * 0.5, cy + s * 0.05), fill=c)
    elif kind == "sword":
        d.line([(cx - s * 0.8, cy + s * 0.8), (cx + s * 0.8, cy - s * 0.8)], fill=c, width=w + 2)
        d.line([(cx - s * 0.75, cy + s * 0.25), (cx - s * 0.25, cy + s * 0.75)], fill=c, width=w + 2)
    elif kind == "eye":
        d.ellipse((cx - s, cy - s * 0.55, cx + s, cy + s * 0.55), outline=c, width=w)
        d.ellipse((cx - s * 0.3, cy - s * 0.3, cx + s * 0.3, cy + s * 0.3), fill=c)
    elif kind == "discord":
        d.rounded_rectangle((cx - s, cy - s * 0.7, cx + s, cy + s * 0.7), radius=int(s * 0.5), outline=c, width=w)
        d.ellipse((cx - s * 0.5, cy - s * 0.15, cx - s * 0.15, cy + s * 0.2), fill=c)
        d.ellipse((cx + s * 0.15, cy - s * 0.15, cx + s * 0.5, cy + s * 0.2), fill=c)

def card(frame, d, x, y, w, h, kind, title, sub, a, col=ACCENT):
    if a <= 0: return
    yy = y + 40 * (1 - a)
    d.rounded_rectangle((x, yy, x + w, yy + h), radius=22, fill=(16, 17, 21, int(235 * a)), outline=A(LINE, a), width=2)
    d.rectangle((x + 30, yy, x + w - 30, yy + 4), fill=A(col, a))
    icon(d, kind, x + w / 2, yy + 110, 46, col, a)
    f = chakra(36)
    text_spaced(d, (x + w / 2 - spaced_width(title, f, 2) / 2, yy + 186), title, f, A(FG, a), 2)
    fs = inter(25)
    for i, line in enumerate(sub.split("\n")):
        d.text((x + w / 2 - fs.getlength(line) / 2, yy + 240 + i * 34), line, font=fs, fill=A(MUTED, a))

# ── Scènes ──
MB = meta["bases"]; GB = MB["G"]
MW = meta["warzone"]; GW = MW["G"]

def chunk_poly(m, cx, cz, G, cam):
    x0, z0, x1, z1 = cx * 16, cz * 16, min(cx * 16 + 16, m["size"][0]), min(cz * 16 + 16, m["size"][2])
    return [cam.f(proj(m, x, G, z)) for (x, z) in ((x0, z0), (x1, z0), (x1, z1), (x0, z1))]

LIONS_CH = [(0, 0), (0, 1), (0, 2), (1, 0), (1, 1), (1, 2)]
LOUPS_CH = [(2, 0), (3, 0), (4, 0), (2, 1), (3, 1), (4, 1), (2, 2), (3, 2), (4, 2), (2, 3), (3, 3), (4, 3)]
TARGET = (2, 1)

def draw_claims(frame, cam, t, t0, flip=None):
    lay = Image.new("RGBA", (WF, HF), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for i, ch in enumerate(LIONS_CH + LOUPS_CH):
        a = seg(t, t0 + 0.08 * i, t0 + 0.08 * i + 0.35)
        if a <= 0: continue
        col = BLUE if ch in LIONS_CH else ACCENT
        if flip is not None and ch == TARGET:
            col = tuple(int(lerp(ACCENT[k], BLUE[k], flip)) for k in range(3))
        poly = chunk_poly(MB, ch[0], ch[1], GB, cam)
        d.polygon(poly, fill=A(col, 0.22 * a), outline=A(col, 0.85 * a), width=3)
    frame.alpha_composite(lay)

def cannon_arc(m, p0, p1, u, h=10):
    x = lerp(p0[0], p1[0], u); z = lerp(p0[2], p1[2], u); y = lerp(p0[1], p1[1], u) + h * 4 * u * (1 - u)
    return (x, y, z)

IMPACTS = [(40, GB + 3, 22), (40, GB + 2, 30), (44, GB + 1, 26), (47, GB + 2, 21)]

def s_found(t):
    cam = cam_lerp(Cam("bases", MB["w"] / 2, MB["h"] / 2 + 40, MB["w"] * 1.05), Cam("bases", MB["w"] / 2 + 60, MB["h"] / 2 + 60, MB["w"] * 0.9), ease_io(seg(t, C1, C2)))
    fr = shot(cam)
    draw_claims(fr, cam, t, C1 + 1.2)
    d = ImageDraw.Draw(fr)
    for i, (x, z, col) in enumerate([(10, 30, BLUE), (16, 14, BLUE), (12, 34, BLUE), (60, 40, ACCENT), (66, 24, ACCENT), (46, 38, ACCENT)]):
        a = ease_back(seg(t, C1 + 0.6 + 0.12 * i, C1 + 1.0 + 0.12 * i))
        if a > 0:
            px, py = cam.f(proj(MB, x + 0.5 + 0.6 * math.sin(t * 1.5 + i), GB, z + 0.5))
            pawn(fr, d, px, py, col, 1.1 * a)
    # étiquettes de faction
    for (x, z, name, col) in [(10, 22, "LIONS", BLUE), (56, 28, "LOUPS", ACCENT)]:
        a = seg(t, C1 + 2.2, C1 + 2.7)
        if a > 0:
            px, py = cam.f(proj(MB, x, GB + 14, z))
            f = chakra(34); tw = spaced_width(name, f, 3)
            d.rounded_rectangle((px - tw / 2 - 18, py - 8, px + tw / 2 + 18, py + 44), radius=10, fill=(7, 7, 10, int(200 * a)), outline=A(col, a), width=2)
            text_spaced(d, (px - tw / 2, py - 2), name, f, A(col, a), 3)
    chapter_card(fr, t, C1, C2, "01", "FONDE TA FACTION", "Claims, power et rangs : le Faction à l'ancienne.",
                 ["/f creer · 10 000 $", "1 chunk par point de power", "20 membres · 4 rangs"])
    return fr

def s_tnt(t):
    m = MB
    cam = cam_lerp(cam_on("bases", m, 34, GB, 24, 1150, 30), cam_on("bases", m, 50, GB, 28, 980, 20), ease_io(seg(t, C2, C3)))
    mixv = seg(t, TNT_IMPACTS[0], TNT_IMPACTS[-1] + 0.3)
    fr = shot(cam, "bases", "bases_raid", mixv)
    draw_claims(fr, cam, t, C2 - 10)
    d = ImageDraw.Draw(fr)
    src = (29, GB + 2, 22)
    for i, ti in enumerate(TNT_IMPACTS):
        tl = ti - 0.6
        if tl <= t < ti:
            u = (t - tl) / 0.6
            p = cam.f(proj(m, *cannon_arc(m, src, IMPACTS[i], u)))
            for k in range(6):
                q = cam.f(proj(m, *cannon_arc(m, src, IMPACTS[i], max(0, u - k * 0.035))))
                d.ellipse((q[0] - 9 + k, q[1] - 9 + k, q[0] + 9 - k, q[1] + 9 - k), fill=A((255, 150, 60), 0.6 - k * 0.09))
            d.rectangle((p[0] - 10, p[1] - 10, p[0] + 10, p[1] + 10), fill=A((214, 50, 40), 1), outline=A((250, 250, 250), 1), width=3)
        if ti <= t < ti + 0.9:
            q = cam.f(proj(m, *IMPACTS[i])); e = (t - ti) / 0.9
            glow(fr, q[0], q[1], int(40 + 90 * e), (255, 170, 60), 1 - e)
            d.ellipse((q[0] - 160 * e, q[1] - 110 * e, q[0] + 160 * e, q[1] + 110 * e), outline=A((255, 230, 180), 1 - e), width=6)
            burst(fr, d, q[0], q[1], t, ti, 100 + i, cols=((255, 170, 60), (255, 230, 160), (90, 90, 90)), n=30, spread=220, life=0.9)
    if t < TNT_IMPACTS[-1] + 0.4:
        flash(fr, max((1 - seg(t, ti, ti + 0.25)) * float(t >= ti) for ti in TNT_IMPACTS) * 0.5, (255, 200, 140))
    # le coffre-fort d'obsidienne tient
    a = seg(t, 14.8, 15.4) * (1 - seg(t, C3 - 0.3, C3))
    if a > 0:
        x0, z0, x1, z1, y0, y1 = 50, 20, 61, 35, GB, GB + 6
        P = {k: cam.f(proj(m, *k)) for k in [(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]}
        pulse = 0.6 + 0.4 * math.sin(t * 6)
        for e in [((x0, y1, z0), (x1, y1, z0)), ((x1, y1, z0), (x1, y1, z1)), ((x1, y1, z1), (x0, y1, z1)), ((x0, y1, z1), (x0, y1, z0)),
                  ((x1, y0, z0), (x1, y1, z0)), ((x1, y0, z1), (x1, y1, z1)), ((x0, y0, z1), (x0, y1, z1)), ((x1, y0, z0), (x1, y0, z1)), ((x1, y0, z1), (x0, y0, z1))]:
            d.line([P[e[0]], P[e[1]]], fill=A(OBSI, a * pulse), width=5)
        q = P[(x1, y1, z1)]
        lab = "OBSIDIENNE · INDESTRUCTIBLE"; f = chakra(30); tw = spaced_width(lab, f, 2)
        d.rounded_rectangle((q[0] + 30, q[1] - 26, q[0] + 70 + tw, q[1] + 28), radius=12, fill=(20, 10, 34, int(230 * a)), outline=A(OBSI, a), width=2)
        text_spaced(d, (q[0] + 50, q[1] - 20), lab, f, A((230, 210, 255), a), 2)
    chapter_card(fr, t, C2, C3, "02", "PILLAGE À LA TNT", "Canons, creepers, TNT : le rempart tombe, pas l'obsidienne.",
                 ["Brèche : coffres ouverts 15 min", "Alerte « PILLAGE »", "Bilan de pillage"])
    return fr

def s_overclaim(t):
    m = MB
    cam = cam_lerp(cam_on("bases", m, 36, GB, 28, 1700, 60), cam_on("bases", m, 40, GB, 24, 1350, 40), ease_io(seg(t, C3, C4)))
    fr = shot(cam, "bases_raid")
    flip = ease_io(seg(t, 21.5, 21.9))
    draw_claims(fr, cam, t, C3 - 10, flip=flip)
    d = ImageDraw.Draw(fr)
    # chunk ciblé : pulsation et anneau
    poly = chunk_poly(m, *TARGET, GB, cam)
    cx = sum(p[0] for p in poly) / 4; cy = sum(p[1] for p in poly) / 4
    if 20.0 < t < 21.5:
        pu = (t * 2) % 1
        d.polygon(poly, outline=A(ACCENT, 1 - pu), width=int(3 + 8 * pu))
    if t >= 21.5:
        e = seg(t, 21.5, 22.4)
        d.ellipse((cx - 300 * e, cy - 170 * e, cx + 300 * e, cy + 170 * e), outline=A(BLUE, 1 - e), width=8)
        burst(fr, d, cx, cy, t, 21.5, 7, cols=(BLUE, SILVER, GOLD), n=40, spread=300)
        a = seg(t, 21.7, 22.1)
        lab = "/f claim · chunk pris"; f = chakra(32); tw = f.getlength(lab)
        d.rounded_rectangle((cx - tw / 2 - 22, cy - 120, cx + tw / 2 + 22, cy - 66), radius=12, fill=(7, 7, 10, int(220 * a)), outline=A(BLUE, a), width=2)
        d.text((cx - tw / 2, cy - 114), lab, font=f, fill=A(FG, a))
    # jauge power / claims des Loups
    a = ease_out(seg(t, C3 + 0.3, C3 + 0.8)) * (1 - seg(t, C4 - 0.3, C4))
    if a > 0:
        x0, y0, w = WF - 640, 200, 520
        d.rounded_rectangle((x0, y0, x0 + w, y0 + 300), radius=20, fill=(16, 17, 21, int(235 * a)), outline=A(LINE, a), width=2)
        text_spaced(d, (x0 + 30, y0 + 24), "LOUPS", chakra(40), A(ACCENT, a), 3)
        power = lerp(15, 9, ease_io(seg(t, 19.2, 20.6)))
        claims = 12
        d.text((x0 + 30, y0 + 86), f"Power {power:.0f}   ·   Claims {claims}", font=inter(30), fill=A(FG, a))
        bx, by, bw = x0 + 30, y0 + 140, w - 60
        d.rounded_rectangle((bx, by, bx + bw, by + 22), radius=11, fill=A(LINE, a))
        d.rounded_rectangle((bx, by, bx + bw * power / 20, by + 22), radius=11, fill=A(BLUE if power >= claims else ACCENT, a))
        mk = bx + bw * claims / 20
        d.line([(mk, by - 10), (mk, by + 32)], fill=A(FG, a), width=3)
        d.text((mk - 40, by + 34), "claims", font=inter(20), fill=A(MUTED, a))
        for k in range(3):
            ka = seg(t, 19.2 + 0.45 * k, 19.5 + 0.45 * k)
            if ka > 0:
                icon(d, "skull", bx + 24 + k * 56, y0 + 232, 18, ACCENT, a * ka)
        d.text((bx + 190, y0 + 218), "−4 power par mort", font=inter(24), fill=A(MUTED, a))
        if power < claims:
            sa = (0.65 + 0.35 * math.sin(t * 8)) * a
            lab = "SURCLAIMABLE"; f = chakra(36)
            d.rounded_rectangle((x0, y0 + 316, x0 + w, y0 + 376), radius=14, fill=A(FILL, sa))
            lx = x0 + w / 2 - f.getlength(lab) / 2 + 24
            icon(d, "alert", lx - 36, y0 + 346, 16, (255, 255, 255), a)
            d.text((lx, y0 + 322), lab, font=f, fill=A((255, 255, 255), a))
    chapter_card(fr, t, C3, C4, "03", "LE SURCLAIM", "Moins de power que de claims ? Tes chunks de bordure tombent.",
                 ["Il faut être ennemis", "Le chunk et tout son contenu", "Obsidienne comprise"])
    return fr

_BLUR = {}
def blurred(key, cam_args):
    k = (key, cam_args)
    if k not in _BLUR:
        fr = shot(Cam(key, *cam_args))
        fr = fr.filter(ImageFilter.GaussianBlur(14))
        fr.alpha_composite(Image.new("RGBA", (WF, HF), BG + (170,)))
        _BLUR[k] = fr
    return _BLUR[k].copy()

def s_defense(t):
    fr = blurred("bases", (MB["w"] / 2, MB["h"] / 2, MB["w"] * 0.9))
    top_title(fr, t, C4, C5, "04", "DÉFENDS-TOI", "Le pillage se prépare, la défense aussi.")
    d = ImageDraw.Draw(fr)
    items = [("shield", "BOUCLIER", "6 h par jour\nsans pillage ni surclaim"), ("alert", "ALERTES", "Titre, cor de raid,\nDiscord de la faction"),
             ("lock", "VERROU", "Ni fuite ni dissolution\npendant un raid"), ("report", "BILAN", "Blocs détruits,\nobjets volés, morts")]
    w, h, gap = 380, 340, 36
    x0 = WF / 2 - (4 * w + 3 * gap) / 2
    for i, (k, ti, sub) in enumerate(items):
        a = ease_out(seg(t, C4 + 0.5 + 0.9 * i, C4 + 0.9 + 0.9 * i)) * (1 - seg(t, C5 - 0.3, C5))
        card(fr, d, x0 + i * (w + gap), 400, w, h, k, ti, sub, a)
    return fr

UPGRADES = [("Claims", "+10 chunks", 5, "25 000 → 500 000 $"), ("Power", "+5", 5, "50 000 → 1 000 000 $"),
            ("Coffre", "+1 rangée", 3, "20 000 → 150 000 $"), ("Bouclier", "+1 h", 2, "150 000 → 400 000 $"),
            ("Warps", "+1", 3, "15 000 → 90 000 $"), ("Membres", "+5", 2, "75 000 → 200 000 $")]

def s_economy(t):
    fr = background()
    top_title(fr, t, C5, C6, "05", "UNE SEULE ÉCONOMIE", "La monnaie du marché VæloriaShop paie tout : banque, niveaux, récompenses.")
    d = ImageDraw.Draw(fr)
    al = 1 - seg(t, C6 - 0.3, C6)
    # Banque de faction
    a = ease_out(seg(t, C5 + 0.5, C5 + 1.0)) * al
    if a > 0:
        x0, y0 = 150, 360
        d.rounded_rectangle((x0, y0, x0 + 560, y0 + 470), radius=22, fill=(16, 17, 21, int(235 * a)), outline=A(LINE, a), width=2)
        icon(d, "coin", x0 + 280, y0 + 100, 54, GOLD, a)
        text_spaced(d, (x0 + 280 - spaced_width("BANQUE DE FACTION", chakra(34), 2) / 2, y0 + 180), "BANQUE DE FACTION", chakra(34), A(FG, a), 2)
        val = int(245000 * ease_out(seg(t, C5 + 1.0, C5 + 4.0)) / 500) * 500
        s = f"{val:,} $".replace(",", " ")
        f = chakra(64); d.text((x0 + 280 - f.getlength(s) / 2, y0 + 236), s, font=f, fill=A(GOLD, a))
        lines = ["KOTH, Totem, convoi, Forteresse", "Avant-postes : 1 500 $ / 10 min", "Missions du jour : 5 000 à 20 000 $"]
        for i, ln in enumerate(lines):
            la = seg(t, C5 + 1.4 + 0.5 * i, C5 + 1.8 + 0.5 * i) * a
            d.text((x0 + 40, y0 + 340 + i * 40), "› " + ln, font=inter(26), fill=A(MUTED, la))
    # Niveaux
    x0, y0 = 800, 360
    a = ease_out(seg(t, C5 + 0.8, C5 + 1.3)) * al
    if a > 0:
        d.rounded_rectangle((x0, y0, x0 + 970, y0 + 470), radius=22, fill=(16, 17, 21, int(235 * a)), outline=A(LINE, a), width=2)
        text_spaced(d, (x0 + 40, y0 + 26), "AMÉLIORATIONS · /f ameliorations", chakra(32), A(FG, a), 2)
        for i, (name, bonus, lv, cost) in enumerate(UPGRADES):
            yy = y0 + 92 + i * 60
            ra = seg(t, C5 + 1.2 + 0.35 * i, C5 + 1.6 + 0.35 * i) * a
            d.text((x0 + 40, yy), name, font=chakra(30, 600), fill=A(FG, ra))
            d.text((x0 + 210, yy + 4), bonus, font=inter(24), fill=A(ACCENT, ra))
            filled = ease_out(seg(t, C5 + 1.5 + 0.35 * i, C5 + 2.6 + 0.35 * i))
            for k in range(lv):
                bx = x0 + 380 + k * 44
                d.rounded_rectangle((bx, yy + 6, bx + 36, yy + 30), radius=6, fill=A(ACCENT if k < filled * lv else LINE, ra))
            d.text((x0 + 620, yy + 4), cost, font=inter(24), fill=A(MUTED, ra))
    return fr

EV = [("koth", 70, 24, "KOTH", ["Tiens la zone 5 min", "60 000 $", "Dimanche 18h"]),
      ("totem", 24, 24, "TOTEM", ["Épée en diamant uniquement", "7,5 s par bloc", "75 000 $"]),
      ("convoi", 26, 70, "CONVOI", ["Toutes les 25 min", "Rapporte la clé", "25 000 $"]),
      ("ap", 70, 70, "AVANT-POSTES", ["1 500 $ / 10 min", "+2 power", "Attribués aux factions"])]

def s_events(t):
    i = min(4, int((t - C6) / 2.5))
    if i == 4:
        return s_fortress(t)
    kind, x, z, title, chips = EV[i]
    t0 = EVENTS[i]
    prev = EV[i - 1] if i > 0 else None
    target = cam_on("warzone", MW, x, GW + 3, z, 900, 40)
    if prev:
        start = cam_on("warzone", MW, prev[1], GW + 3, prev[2], 900, 40)
        cam = cam_lerp(start, target, ease_io(seg(t, t0, t0 + 0.7)))
    else:
        cam = cam_lerp(Cam("warzone", MW["w"] / 2, MW["h"] / 2, MW["w"] * 0.95), target, ease_io(seg(t, t0, t0 + 0.9)))
    fr = shot(cam)
    d = ImageDraw.Draw(fr)
    if kind == "koth":
        top = GW + 5
        for k in range(3):
            pu = ((t - t0) * 0.8 + k / 3) % 1
            r = 6 * (0.6 + 0.8 * pu)
            pts = [cam.f(proj(MW, x + 0.5 + r * math.cos(a), top, z + 0.5 + r * math.sin(a))) for a in np.linspace(0, 2 * math.pi, 40)]
            d.line(pts + [pts[0]], fill=A(GOLD, 1 - pu), width=4)
        for k, (px, pz, col) in enumerate([(x - 2, z + 1, BLUE), (x + 2, z - 1, BLUE), (x + 3, z + 3, ACCENT)]):
            p = cam.f(proj(MW, px + 0.5, top, pz + 0.5)); pawn(fr, d, p[0], p[1], col, 1.3)
        prog = seg(t, t0 + 0.3, t0 + 2.3)
        p = cam.f(proj(MW, x + 0.5, top + 9, z + 0.5))
        d.rounded_rectangle((p[0] - 160, p[1] - 14, p[0] + 160, p[1] + 14), radius=14, fill=A(LINE, 1))
        d.rounded_rectangle((p[0] - 160, p[1] - 14, p[0] - 160 + 320 * prog, p[1] + 14), radius=14, fill=A(BLUE, 1))
        d.text((p[0] - 60, p[1] - 56), f"{int(5 * 60 * (1 - prog)) // 60}:{int(5 * 60 * (1 - prog)) % 60:02d}", font=chakra(36), fill=A(FG, 1))
    elif kind == "totem":
        prog = (t - t0) / 2.4
        p = cam.f(proj(MW, x + 0.5, GW + 3, z + 0.5))
        d.arc((p[0] - 110, p[1] - 150, p[0] + 110, p[1] + 70), -90, -90 + 360 * (prog * 2.5 % 1), fill=A(ACCENT, 1), width=8)
        pw = cam.f(proj(MW, x + 3.5, GW + 1, z + 2.5)); pawn(fr, d, pw[0], pw[1], ACCENT, 1.3)
        icon(d, "sword", pw[0] + 40, pw[1] - 70, 26, (120, 230, 240), 1)
        for k in range(int(prog * 2.5)):
            burst(fr, d, p[0], p[1] - 60, t, t0 + (k + 1) / 2.5 * 2.4 - 0.05, 300 + k, cols=((40, 30, 60), (150, 90, 230)), n=18, spread=140, life=0.6)
    elif kind == "convoi":
        tl = t0 + 0.4
        fall = seg(t, tl, tl + 0.8)
        y = lerp(GW + 30, GW, ease_io(fall) if fall < 1 else 1)
        if fall < 1:
            for k in range(5):
                q = cam.f(proj(MW, x + 0.5, y + 1 + k * 1.2, z + 0.5))
                d.ellipse((q[0] - 8, q[1] - 8, q[0] + 8, q[1] + 8), fill=A((255, 220, 140), 0.5 - k * 0.09))
            q = cam.f(proj(MW, x + 0.5, y + 0.5, z + 0.5)); s = 22
            d.polygon([(q[0], q[1] - s), (q[0] + s, q[1] - s / 2), (q[0], q[1]), (q[0] - s, q[1] - s / 2)], fill=A((190, 135, 60), 1))
            d.polygon([(q[0] - s, q[1] - s / 2), (q[0], q[1]), (q[0], q[1] + s), (q[0] - s, q[1] + s / 2)], fill=A((150, 100, 40), 1))
            d.polygon([(q[0] + s, q[1] - s / 2), (q[0], q[1]), (q[0], q[1] + s), (q[0] + s, q[1] + s / 2)], fill=A((120, 80, 30), 1))
        else:
            q = cam.f(proj(MW, x + 0.5, GW + 1, z + 0.5))
            burst(fr, d, q[0], q[1], t, tl + 0.8, 55, cols=((255, 220, 140), (200, 200, 200)), n=36, spread=240)
            glow(fr, q[0], q[1] - 30, 30, (255, 220, 140), 0.6 + 0.4 * math.sin(t * 8))
            ka = seg(t, tl + 1.0, tl + 1.3)
            if ka > 0:
                pw = cam.f(proj(MW, x + 2.5, GW, z + 1.5)); pawn(fr, d, pw[0], pw[1], BLUE, 1.3)
                kx, ky = pw[0] + 34, pw[1] - 62  # clé du convoi
                d.ellipse((kx - 12, ky - 12, kx + 12, ky + 12), outline=A(GOLD, ka), width=5)
                d.line([(kx + 10, ky + 8), (kx + 36, ky + 34)], fill=A(GOLD, ka), width=5)
                d.line([(kx + 26, ky + 24), (kx + 34, ky + 16)], fill=A(GOLD, ka), width=5)
    elif kind == "ap":
        for k in range(3):
            st = t0 + 0.5 + k * 0.6
            e = seg(t, st, st + 1.0)
            if 0 < e < 1:
                q = cam.f(proj(MW, x + 0.5, GW + 6 + e * 6, z + 0.5))
                f = chakra(38); s = "+1 500 $"
                d.text((q[0] - f.getlength(s) / 2, q[1]), s, font=f, fill=A(GOLD, 1 - e))
        for k, (px, pz) in enumerate([(x - 4, z + 2), (x + 3, z + 4), (x - 1, z - 5)]):
            p = cam.f(proj(MW, px + 0.5, GW, pz + 0.5)); pawn(fr, d, p[0], p[1], BLUE, 1.2)
    event_label(fr, t, t0, t0 + 2.5, title, chips)
    caption_small(fr, t)
    return fr

def event_label(fr, t, a, b, title, chips):
    tin = ease_out(seg(t, a + 0.3, a + 0.7)); tout = 1 - seg(t, b - 0.2, b); al = tin * tout
    if al <= 0: return
    d = ImageDraw.Draw(fr)
    x0, y0 = 110 - 50 * (1 - tin), 560
    pg = np.zeros((HF, 860, 4), np.uint8); pg[..., :3] = BG
    pg[..., 3] = (np.clip(1 - np.arange(860) / 860, 0, 1) ** 1.3 * 210 * al).astype(np.uint8)[None, :]
    fr.alpha_composite(Image.fromarray(pg, "RGBA"))
    d = ImageDraw.Draw(fr)
    text_spaced(d, (x0, y0), title, chakra(88), A(FG, al), 4)
    d.rectangle((x0, y0 + 110, x0 + 360 * tin * tout, y0 + 116), fill=A(RUBY, al))
    for i, ch in enumerate(chips):
        ca = al * seg(t, a + 0.5 + 0.18 * i, a + 0.8 + 0.18 * i)
        f = chakra(34, 600)
        d.text((x0, y0 + 140 + i * 52), ("› " if i < 2 else "") + ch, font=f, fill=A(GOLD if "$" in ch else FG, ca))

def caption_small(fr, t):
    a = seg(t, C6, C6 + 0.4) * (1 - seg(t, C7 - 0.3, C7))
    d = ImageDraw.Draw(fr)
    d.text((110, 120), "06", font=chakra(60), fill=A(ACCENT, a))
    text_spaced(d, (200, 124), "LES ÉVÉNEMENTS", chakra(52), A(FG, a), 3)

def s_fortress(t):
    t0 = EVENTS[4]
    tx, ty = proj(FMETA, 120.5, 30, 120.5)  # coordonnées absolues du centre de la carte dans le rendu
    cam = cam_lerp(Cam("fort", tx, ty + 180, 2000), Cam("fort", tx, ty + 60, 1150), ease_io(seg(t, t0, C7)))
    fr = shot(cam)
    flash(fr, (1 - seg(t, t0, t0 + 0.3)) * 0.7, (255, 255, 255))
    event_label(fr, t, t0, C7, "FORTERESSE", ["Seul dans la forêt, retrouve ton équipe", "Monte au sommet de la tour", "150 000 $ · Dimanche 21h"])
    caption_small(fr, t)
    return fr

def s_wars(t):
    fr = background()
    top_title(fr, t, C7, C8, "07", "GUERRES & PRIMES")
    d = ImageDraw.Draw(fr)
    al = 1 - seg(t, C8 - 0.3, C8)
    # Guerre officielle
    a = ease_out(seg(t, C7 + 0.4, C7 + 0.9)) * al
    if a > 0:
        x0, y0, w, h = 150, 330, 860, 520
        d.rounded_rectangle((x0, y0, x0 + w, y0 + h), radius=22, fill=(16, 17, 21, int(235 * a)), outline=A(LINE, a), width=2)
        text_spaced(d, (x0 + 40, y0 + 30), "GUERRE OFFICIELLE · /f guerre", chakra(32), A(FG, a), 2)
        for side, (name, col, score, xx) in enumerate([("LIONS", BLUE, 37, x0 + 70), ("LOUPS", ACCENT, 22, x0 + w - 330)]):
            icon(d, "shield", xx + 130, y0 + 170, 56, col, a)
            text_spaced(d, (xx + 130 - spaced_width(name, chakra(36), 3) / 2, y0 + 250), name, chakra(36), A(col, a), 3)
            v = int(score * ease_out(seg(t, C7 + 1.0, C7 + 3.4)))
            f = chakra(90); s = str(v)
            d.text((xx + 130 - f.getlength(s) / 2, y0 + 300), s, font=f, fill=A(FG, a))
        f = chakra(54); d.text((x0 + w / 2 - f.getlength("VS") / 2, y0 + 200), "VS", font=f, fill=A(ACCENT, a))
        d.text((x0 + 40, y0 + 430), "Kill +1 · Pillage +5 · Surclaim +10", font=inter(28), fill=A(MUTED, a))
        d.text((x0 + 40, y0 + 470), "48 h · déclaration 50 000 $", font=inter(28), fill=A(GOLD, a))
    # Primes
    a = ease_out(seg(t, 51.3, 51.8)) * al
    if a > 0:
        x0, y0, w, h = 1060, 330, 710, 520
        d.rounded_rectangle((x0, y0, x0 + w, y0 + h), radius=22, fill=(16, 17, 21, int(235 * a)), outline=A(ACCENT, a), width=2)
        text_spaced(d, (x0 + 40, y0 + 30), "PRIMES · /f primes", chakra(32), A(FG, a), 2)
        icon(d, "skull", x0 + w / 2, y0 + 160, 58, ACCENT, a)
        rows = [("5 kills d'affilée", "5 % de sa fortune"), ("15 kills d'affilée", "10 % de sa fortune")]
        for i, (l, r) in enumerate(rows):
            ra = seg(t, 52.0 + 0.4 * i, 52.4 + 0.4 * i) * a
            d.text((x0 + 50, y0 + 270 + i * 60), l, font=chakra(32, 600), fill=A(FG, ra))
            d.text((x0 + w - 50 - inter(30).getlength(r), y0 + 274 + i * 60), r, font=inter(30), fill=A(GOLD, ra))
        ra = seg(t, 52.9, 53.3) * a
        d.text((x0 + 50, y0 + 420), "Abats-le : la prime est pour toi.", font=inter(28), fill=A(MUTED, ra))
    return fr

def s_fair(t):
    fr = blurred("warzone", (MW["w"] / 2, MW["h"] / 2, MW["w"] * 0.9))
    top_title(fr, t, C8, OUTRO, "08", "JEU PROPRE", "Pas de déconnexion en combat, pas de farm.")
    d = ImageDraw.Draw(fr)
    items = [("sword", "COMBAT-LOG", "15 s en combat :\nqui déconnecte meurt"), ("eye", "ANTI-FARM", "Pas de power perdu\nentre même IP"),
             ("report", "/f logs", "Coffre, banque, membres :\ntout est tracé"), ("discord", "DISCORD", "Alertes de pillage\net de guerre")]
    w, h, gap = 380, 340, 36
    x0 = WF / 2 - (4 * w + 3 * gap) / 2
    for i, (k, ti, sub) in enumerate(items):
        a = ease_out(seg(t, C8 + 0.3 + 0.45 * i, C8 + 0.7 + 0.45 * i)) * (1 - seg(t, OUTRO - 0.3, OUTRO))
        card(fr, d, x0 + i * (w + gap), 400, w, h, k, ti, sub, a)
    return fr

def intro(t):
    fr = background(); d = ImageDraw.Draw(fr)
    sc = ease_back(seg(t, 0.2, 1.0))
    if sc > 0:
        sz = int(280 * sc); sym = SYMBOL.resize((max(1, sz), max(1, sz)), Image.LANCZOS)
        fr.alpha_composite(sym, (WF // 2 - sz // 2, int(330 - sz / 2 - 60 * seg(t, 1.7, 2.4))))
    gl = seg(t, 0.7, 1.4) * (1 - seg(t, 1.4, 2.1))
    if gl > 0:
        w = int(900 * gl); d.rectangle((WF // 2 - w // 2, 334, WF // 2 + w // 2, 337), fill=A(ACCENT, gl))
    wa = seg(t, 1.0, 1.6)
    if wa > 0:
        wm = WORDMARK.resize((480, int(480 * WORDMARK.height / WORDMARK.width)), Image.LANCZOS)
        wm.putalpha(wm.getchannel("A").point(lambda v: int(v * wa)))
        fr.alpha_composite(wm, (WF // 2 - 240, int(330 + 160 - 60 * seg(t, 1.7, 2.4))))
    ta = ease_out(seg(t, 1.9, 2.6))
    if ta > 0:
        f = chakra(130); sp = 20 - 10 * ta
        center_text(d, 600 + 40 * (1 - ta), "MODE FACTION", f, A(FG, ta), sp)
    sa = seg(t, 2.5, 3.0)
    if sa > 0:
        center_text(d, 770, "LE RETOUR DE LA VRAIE GUERRE", chakra(44, 600), A(ACCENT, sa), 6)
        fs = inter(30); s = "Minecraft 1.21 · PvP 1.8 · nostalgie et modernité"
        d.text((WF / 2 - fs.getlength(s) / 2, 840), s, font=fs, fill=A(MUTED, seg(t, 2.9, 3.4)))
    return fr

def outro(t):
    fr = background(); d = ImageDraw.Draw(fr)
    a = ease_out(seg(t, OUTRO, OUTRO + 0.6))
    sym = SYMBOL.resize((190, 190), Image.LANCZOS); sym.putalpha(sym.getchannel("A").point(lambda v: int(v * a)))
    fr.alpha_composite(sym, (WF // 2 - 95, int(140 + 30 * (1 - a))))
    center_text(d, 370 + 30 * (1 - a), "REJOINS LA GUERRE", chakra(100), A(FG, a), 8)
    b = ease_out(seg(t, OUTRO + 0.5, OUTRO + 1.1))
    pill = "/f creer ‹nom›"; fp = chakra(54, 600); pw = fp.getlength(pill) + 90; x0 = WF / 2 - pw / 2
    d.rounded_rectangle((x0, 540, x0 + pw * b, 630), radius=45, fill=A(FILL, b))
    if b > 0.6: d.text((x0 + 45, 550), pill, font=fp, fill=A((255, 255, 255), seg(b, 0.6, 1.0)))
    c = seg(t, OUTRO + 1.0, OUTRO + 1.5)
    s = "Raids · surclaims · KOTH · Totem · Convoi · Forteresse"
    fi = inter(34); d.text((WF / 2 - fi.getlength(s) / 2, 682), s, font=fi, fill=A(MUTED, c))
    wm = WORDMARK.resize((340, int(340 * WORDMARK.height / WORDMARK.width)), Image.LANCZOS)
    wm.putalpha(wm.getchannel("A").point(lambda v: int(v * c)))
    fr.alpha_composite(wm, (WF // 2 - 170, 820))
    fade = seg(t, DUR - 0.6, DUR)
    if fade > 0: fr.alpha_composite(Image.new("RGBA", (WF, HF), BG + (int(255 * fade),)))
    return fr

def render(t):
    if t < C1:
        fr = intro(t); wipe(fr, t, C1 - 0.5, C1 + 0.3); return fr
    if t >= OUTRO:
        fr = outro(t); wipe(fr, t, OUTRO - 0.4, OUTRO + 0.4); return fr
    if t < C2: fr = s_found(t)
    elif t < C3: fr = s_tnt(t)
    elif t < C4: fr = s_overclaim(t)
    elif t < C5: fr = s_defense(t)
    elif t < C6: fr = s_economy(t)
    elif t < C7: fr = s_events(t)
    elif t < C8: fr = s_wars(t)
    else: fr = s_fair(t)
    for (a, b, *_r) in CHAPTERS[1:]:  # éclair de transition entre chapitres
        if a - 0.05 <= t < a + 0.2:
            flash(fr, 0.35 * (1 - seg(t, a, a + 0.2)), RUBY)
    hud(fr, t)
    return fr

if __name__ == "__main__":
    if len(sys.argv) > 3:
        for ts in sys.argv[3].split(","):
            render(float(ts)).convert("RGB").save(f"{V}/trailer_{ts}.jpg", quality=88)
        sys.exit(0)
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{WF}x{HF}", "-r", str(FPS), "-i", "-",
                          "-i", f"{V}/trailer.wav", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
                          "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
    for i in range(NF):
        p.stdin.write(render(i / FPS).convert("RGB").tobytes())
        if i % 150 == 0: print("image", i, flush=True)
    p.stdin.close(); p.wait()
    print("vidéo :", OUT)
