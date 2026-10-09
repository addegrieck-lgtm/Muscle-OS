"""Vidéo de présentation « Forteresse War » (30 s, 1920×1080, 30 i/s) en motion design, identité VÆLORIA.
Usage : python3 compose.py <dossier_de_travail> <sortie.mp4> — le dossier contient r/ (sortie de render_iso.py),
font/package/files/ (@fontsource/chakra-petch), symbole.png et wordmark.png (logos du site convertis).
Images : rendu isométrique de la vraie carte (render_iso.py). Bots : déplacements mis en scène selon les règles du mode."""
import json, math, random, runpy, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

V = sys.argv[1]
OUT = sys.argv[2]
FPS, DUR, WF, HF = 30, 30.0, 1920, 1080
NF = int(FPS * DUR)

# ── Identité ──
BG = (7, 7, 10)
RUBY, RUBY_DEEP, ACCENT = (210, 31, 47), (163, 18, 30), (239, 68, 80)
SILVER, MUTED, FG = (217, 220, 226), (169, 174, 184), (244, 245, 247)
TEAMS = [("Rubis", ACCENT), ("Argent", (222, 226, 232)), ("Or", (232, 182, 76)), ("Azur", (76, 155, 255))]
FD = f"{V}/font/package/files/"
def chakra(sz, w=700): return ImageFont.truetype(FD + f"chakra-petch-latin-{w}-normal.woff", sz)
def inter(sz, w="Medium"): return ImageFont.truetype(f"/usr/share/fonts/opentype/inter/Inter-{w}.otf", sz)

scene = json.load(open(f"{V}/r/scene.json"))
C, G = scene["C"], scene["G"]
TOP_Y, FLOOR, N, STEP = scene["TOP_Y"], scene["FLOOR"], scene["N"], scene["STEP"]
IM = {k: Image.open(f"{V}/r/{k}.png").convert("RGBA") for k in scene["metas"]}
META = scene["metas"]
gen = runpy.run_path("/home/user/Muscle-OS/tools/forteresse/generer_forteresse.py", run_name="lib")
surface = gen["surface"]
SYMBOL = Image.open(f"{V}/symbole.png").convert("RGBA")
WORDMARK = Image.open(f"{V}/wordmark.png").convert("RGBA")

# ── Outils ──
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def seg(t, a, b): return clamp((t - a) / (b - a)) if b > a else float(t >= a)
def ease_out(x): return 1 - (1 - x) ** 3
def ease_io(x): return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2
def ease_back(x, k=1.70158): return 1 + (k + 1) * (x - 1) ** 3 + k * (x - 1) ** 2
def lerp(a, b, x): return a + (b - a) * x
def lerp2(p, q, x): return tuple(lerp(a, b, x) for a, b in zip(p, q))

def world_to_img(meta, x, y, z):
    """Coordonnées relatives (x, z ; y = hauteur où l'on se tient, relative au sol) → pixel de l'image."""
    s, c = meta["scale"], 0.8660254
    X, Z, Y = x + C - meta["x0"] + 0.5, z + C - meta["z0"] + 0.5, y + G + 1
    return ((X - Z) * s * c + meta["ox"], (X + Z) * s * 0.5 - Y * s + meta["oy"])

class Cam:
    def __init__(self, key, cx, cy, w):
        self.key, self.cx, self.cy, self.w = key, cx, cy, w
    def h(self): return self.w * HF / WF
    def to_frame(self, px, py):
        k = WF / self.w
        return ((px - (self.cx - self.w / 2)) * k, (py - (self.cy - self.h() / 2)) * k)

def cam_lerp(a, b, x):
    return Cam(a.key, lerp(a.cx, b.cx, x), lerp(a.cy, b.cy, x), math.exp(lerp(math.log(a.w), math.log(b.w), x)))

BG_IMG = None
def background():
    global BG_IMG
    if BG_IMG is None:
        yy, xx = np.mgrid[0:HF, 0:WF]
        d = np.sqrt(((xx - WF * 0.5) / (WF * 0.6)) ** 2 + ((yy - HF * 0.42) / (HF * 0.7)) ** 2)
        glow = np.clip(1 - d, 0, 1) ** 1.6
        base = np.array(BG, np.float32)[None, None] + glow[..., None] * (np.array((42, 10, 14), np.float32) - np.array(BG, np.float32))
        BG_IMG = Image.fromarray(base.astype(np.uint8), "RGB").convert("RGBA")
    return BG_IMG.copy()

def shot(cam, key=None, mix_key=None, mix=0.0):
    frame = background()
    def place(k, alpha=1.0):
        img = IM[k]
        w, h = cam.w, cam.h()
        box = (cam.cx - w / 2, cam.cy - h / 2, cam.cx + w / 2, cam.cy + h / 2)
        part = img.transform((WF, HF), Image.EXTENT, box, Image.BILINEAR)
        if alpha < 1:
            a = part.getchannel("A").point(lambda v: int(v * alpha))
            part.putalpha(a)
        frame.alpha_composite(part)
    place(key or cam.key)
    if mix_key and mix > 0:
        place(mix_key, mix)
    return frame

GLOW = {}
def glow_sprite(r, color):
    k = (r, color)
    if k not in GLOW:
        im = Image.new("RGBA", (r * 4, r * 4), (0, 0, 0, 0))
        ImageDraw.Draw(im).ellipse((r, r, r * 3, r * 3), fill=color + (200,))
        GLOW[k] = im.filter(ImageFilter.GaussianBlur(r * 0.7))
    return GLOW[k]

def bot(frame, d, fx, fy, color, size=1.0, alpha=1.0, ring=0.0):
    """Un combattant : ombre, halo, pastille aux couleurs de l'équipe, liseré blanc."""
    if alpha <= 0.01: return
    r = max(4, int(9 * size))
    g = glow_sprite(r, color)
    if alpha < 1:
        g = g.copy(); g.putalpha(g.getchannel("A").point(lambda v: int(v * alpha)))
    frame.alpha_composite(g, (int(fx - 2 * r), int(fy - 2 * r - r)))
    a = int(255 * alpha)
    d.ellipse((fx - r * 0.9, fy - r * 0.35, fx + r * 0.9, fy + r * 0.35), fill=(0, 0, 0, int(110 * alpha)))
    d.ellipse((fx - r, fy - 2.2 * r, fx + r, fy - 0.2 * r), fill=color + (a,), outline=(255, 255, 255, a), width=max(2, r // 4))
    if ring > 0:
        rr = r * (1 + 3 * ring)
        d.ellipse((fx - rr, fy - 1.2 * r - rr, fx + rr, fy - 1.2 * r + rr), outline=color + (int(255 * (1 - ring) * alpha),), width=3)

def text_spaced(d, xy, txt, font, fill, spacing=0):
    x, y = xy
    for ch in txt:
        d.text((x, y), ch, font=font, fill=fill)
        x += font.getlength(ch) + spacing
    return x

def spaced_width(txt, font, spacing):
    return sum(font.getlength(ch) + spacing for ch in txt) - spacing

# ── Combattants ──
rnd = random.Random(21)
spawns = [tuple(p) for p in scene["spawns"]]
rnd.shuffle(spawns)
RALLY = [(-62, -58), (66, -52), (60, 64), (-66, 60)]
SIDE_OF = ["north", "east", "south", "west"]
def side_pt(side, a, out):
    sx, sz = {"north": (0, -1), "south": (0, 1), "west": (-1, 0), "east": (1, 0)}[side]
    return (out * sx + a * (1 if sz != 0 else 0), out * sz + a * (1 if sx != 0 else 0))

def ground(x, z):
    return surface(int(round(x)), int(round(z))) - G

bots = []
for t in range(4):
    # Points d'apparition réels, choisis loin du point de ralliement de l'équipe : il faut se retrouver.
    mine = [p for p in spawns if math.hypot(p[0] - RALLY[t][0], p[2] - RALLY[t][1]) > 45][:6]
    for p in mine:
        spawns.remove(p)
    # Les Rubis et les Or montent par l'escalier sud, visible ; les Azur arrivent trop tard.
    side = ["south", "east", "south", "east"][t]
    for k, p in enumerate(mine):
        bots.append({"team": t, "spawn": (p[0], p[1], p[2]), "k": k, "side": side,
                     "rally": (RALLY[t][0] + rnd.uniform(-3, 3), RALLY[t][1] + rnd.uniform(-3, 3))})

def path_pos(b, t):
    """Position (x, y, z) d'un combattant au temps t, plus son opacité."""
    sx, sy, sz = b["spawn"]
    rx, rz = b["rally"]
    late = b["team"] == 3
    # 01 · 3.6 → 8.0 : se retrouver
    u = ease_io(seg(t, 5.2 + 0.08 * b["k"], 8.2))
    x, z = lerp(sx, rx, u), lerp(sz, rz, u)
    if t < 8.6:
        return (x, ground(x, z), z), 1.0
    # 02 · 8.6 → 12.6 : courir aux escaliers, monter, entrer
    a = (b["k"] - 2.5) * 1.1
    foot = side_pt(b["side"], a, 37)
    top = side_pt(b["side"], a * 0.6, 26)
    gate = side_pt(b["side"], a * 0.4, 20)
    speed = 0.8 if late else 1.0
    u = ease_io(seg(t, 8.6 + 0.05 * b["k"], 11.4 + (2.6 if late else 0)) * speed)
    if u < 1 or late:
        x, z = lerp(rx, foot[0], u), lerp(rz, foot[1], u)
        return (x, ground(x, z), z), 1.0
    u2 = ease_io(seg(t, 11.4 + 0.05 * b["k"], 12.6))
    if u2 < 0.6:
        w = u2 / 0.6
        x, z = lerp(foot[0], top[0], w), lerp(foot[1], top[1], w)
        return (x, lerp(0, 6, w), z), 1.0
    w = (u2 - 0.6) / 0.4
    x, z = lerp(top[0], gate[0], w), lerp(top[1], gate[1], w)
    return (x, 6, z), 1 - w

def spiral_xyz(prog, r=7.4):
    """Position sur l'escalier en colimaçon : prog de 0 (pied) à 1 (sommet)."""
    total = ((TOP_Y + 1) - (FLOOR + 1)) / STEP
    k = prog * total
    ang = (k % N) / N * 2 * math.pi
    y = FLOOR + 1 + STEP * (k + 1) - (G + 1)
    return (r * math.cos(ang), y, r * math.sin(ang)), ang

# ── Légendes ──
STEPS = [
    (3.6, 8.6, "01", "SEUL DANS LA FORÊT", "Chacun apparaît au hasard. Retrouve ton équipe.", "45 s · sans PvP"),
    (8.6, 13.0, "02", "LES PORTES S'OUVRENT", "Forêt, marches, herses : tout le monde à l'assaut.", "Assaut · 5 min"),
    (13.0, 17.0, "03", "LES PORTES SE FERMENT", "Resté dehors ? Éliminé.", "Herses baissées"),
    (17.0, 22.4, "04", "MONTE EN COLIMAÇON", "82 blocs d'escalier jusqu'au sommet de la tour.", "90 s pour y arriver"),
    (22.4, 26.6, "05", "DERNIÈRE ÉQUIPE AU SOMMET", "Une mort = éliminé. Les derniers debout gagnent.", "150 000 $ en banque"),
]

def caption(frame, t):
    d = ImageDraw.Draw(frame)
    for (a, b, num, title, sub, chip) in STEPS:
        if not (a <= t < b):
            continue
        tin = ease_out(seg(t, a, a + 0.55))
        tout = 1 - ease_io(seg(t, b - 0.35, b))
        al = tin * tout
        # Bandeau sombre à gauche pour la lisibilité
        panel = Image.new("RGBA", (900, HF), (0, 0, 0, 0))
        pg = np.zeros((HF, 900, 4), np.uint8)
        pg[..., :3] = BG
        pg[..., 3] = (np.clip(1 - np.arange(900) / 900, 0, 1) ** 1.4 * 200 * al).astype(np.uint8)[None, :]
        frame.alpha_composite(Image.fromarray(pg, "RGBA"))
        x0 = 110 - 60 * (1 - tin)
        y0 = 640
        fnum = chakra(150)
        d.text((x0, y0 - 150), num, font=fnum, fill=ACCENT + (int(255 * al),))
        # barre rubis qui se déploie
        bw = 420 * ease_out(seg(t, a + 0.1, a + 0.7)) * tout
        d.rectangle((x0, y0 + 14, x0 + bw, y0 + 20), fill=RUBY + (int(255 * al),))
        text_spaced(d, (x0, y0 + 40), title, chakra(66), FG + (int(255 * al),), 3)
        d.text((x0, y0 + 128), sub, font=inter(32), fill=MUTED + (int(255 * al),))
        # pastille
        f = chakra(30, 600)
        tw = f.getlength(chip)
        cy = y0 + 190
        d.rounded_rectangle((x0, cy, x0 + tw + 44, cy + 52), radius=26, fill=(30, 10, 14, int(220 * al)), outline=ACCENT + (int(255 * al),), width=2)
        d.text((x0 + 22, cy + 8), chip, font=f, fill=FG + (int(255 * al),))

def hud(frame, t):
    """Marque en haut à droite et progression des cinq étapes en bas."""
    if t < 3.4 or t > 26.8:
        return
    al = seg(t, 3.4, 3.9) * (1 - seg(t, 26.4, 26.8))
    d = ImageDraw.Draw(frame)
    sym = SYMBOL.resize((56, 56), Image.LANCZOS)
    if al < 1:
        sym.putalpha(sym.getchannel("A").point(lambda v: int(v * al)))
    frame.alpha_composite(sym, (WF - 500, 46))
    text_spaced(d, (WF - 430, 52), "FORTERESSE WAR", chakra(34), FG + (int(255 * al),), 4)
    d.text((WF - 430, 92), "VÆLORIA · mode de guerre", font=inter(20), fill=MUTED + (int(230 * al),))
    # progression
    x, y, w = 110, HF - 70, (WF - 220 - 4 * 16) / 5
    for i, (a, b, num, *_r) in enumerate(STEPS):
        fill = clamp((t - a) / (b - a))
        xx = x + i * (w + 16)
        d.rounded_rectangle((xx, y, xx + w, y + 6), radius=3, fill=(42, 44, 51, int(255 * al)))
        if fill > 0:
            d.rounded_rectangle((xx, y, xx + max(6, w * fill), y + 6), radius=3, fill=ACCENT + (int(255 * al),))
        d.text((xx, y - 34), num, font=chakra(22, 600), fill=(ACCENT if a <= t < b else MUTED) + (int(255 * al),))

def wipe(frame, t, a, b):
    """Volet rubis en diagonale."""
    if not (a <= t <= b):
        return
    x = seg(t, a, b)
    d = ImageDraw.Draw(frame)
    pos = lerp(-900, WF + 900, ease_io(x))
    for off, col in ((0, RUBY_DEEP), (140, RUBY), (260, BG)):
        p = pos - off
        d.polygon([(p - 600, 0), (p + 200, 0), (p - 200, HF), (p - 1000, HF)], fill=col + (255,))

# ── Scènes ──
WIDE = META["wide_closed"]
CLOSE = META["close_closed"]
cx_t, cy_t = world_to_img(WIDE, 0, 30, 0)
cam_full = Cam("wide_closed", WIDE["w"] / 2, WIDE["h"] / 2 + 20, WIDE["w"] * 1.02)
cam_forest = Cam("wide_closed", WIDE["w"] / 2, WIDE["h"] / 2 - 60, WIDE["w"] * 0.86)
cam_temple = Cam("wide_closed", cx_t, cy_t + 120, 1150)
cam_temple2 = Cam("wide_closed", cx_t, cy_t + 150, 980)
ct_base = world_to_img(CLOSE, 0, 12, 0)
ct_top = world_to_img(CLOSE, 0, 76, 0)
cam_c0 = Cam("close_closed", ct_base[0], ct_base[1], 1500)
cam_c1 = Cam("close_closed", ct_top[0], ct_top[1] + 220, 1250)
cam_sum = Cam("close_closed", ct_top[0], ct_top[1] + 40, 760)

summit_y = TOP_Y + 1 - (G + 1)
climbers = [b for b in bots if b["team"] != 3]
elim_summit = {2: 23.6, 1: 24.9}  # Or puis Argent tombent

def draw_wide_bots(frame, cam, meta, t):
    d = ImageDraw.Draw(frame)
    items = []
    for b in bots:
        (x, y, z), al = path_pos(b, t)
        appear = ease_back(seg(t, 3.7 + 0.04 * (b["team"] * 6 + b["k"]), 4.2 + 0.04 * (b["team"] * 6 + b["k"])))
        if appear <= 0:
            continue
        dead = 0.0
        if b["team"] == 3 and t >= 13.6:
            dead = seg(t, 13.6 + 0.1 * b["k"], 14.6 + 0.1 * b["k"])
        px, py = world_to_img(meta, x, y + 1.2, z)
        fx, fy = cam.to_frame(px, py)
        items.append((x + z, b, fx, fy, al * (1 - dead), appear, dead))
    # liens entre coéquipiers pendant qu'ils se cherchent
    if 4.6 < t < 8.8:
        la = seg(t, 4.6, 5.2) * (1 - seg(t, 8.2, 8.8))
        for tm in range(4):
            pts = [(fx, fy) for _, b, fx, fy, *_ in items if b["team"] == tm]
            if not pts:
                continue
            gx = sum(p[0] for p in pts) / len(pts); gy = sum(p[1] for p in pts) / len(pts)
            for p in pts:  # chacun « cherche » le cœur de son équipe
                n = 14
                for i in range(n):
                    if i % 2 == 0:
                        d.line([lerp2(p, (gx, gy), i / n), lerp2(p, (gx, gy), (i + 1) / n)], fill=TEAMS[tm][1] + (int(110 * la),), width=2)
            pulse = (t * 1.3 + tm * 0.25) % 1
            rr = 10 + 26 * pulse
            d.ellipse((gx - rr, gy - rr, gx + rr, gy + rr), outline=TEAMS[tm][1] + (int(200 * la * (1 - pulse)),), width=3)
    items.sort(key=lambda it: it[0])
    for _, b, fx, fy, al, appear, dead in items:
        ring = (t - 3.7 - 0.04 * (b["team"] * 6 + b["k"])) / 0.8
        bot(frame, d, fx, fy, TEAMS[b["team"]][1], size=0.9 * max(0.01, appear), alpha=al, ring=ring if 0 < ring < 1 else 0)
        if dead > 0 and dead < 1:
            r = 8 + 14 * dead
            d.line((fx - r, fy - r - 20, fx + r, fy + r - 20), fill=ACCENT + (int(255 * (1 - dead)),), width=4)
            d.line((fx - r, fy + r - 20, fx + r, fy - r - 20), fill=ACCENT + (int(255 * (1 - dead)),), width=4)

def draw_spiral(frame, cam, t, a, b):
    d = ImageDraw.Draw(frame)
    prog_draw = ease_io(seg(t, a, a + 2.2))
    pts = []
    for i in range(0, 600):
        p = i / 599
        if p > prog_draw:
            break
        (x, y, z), ang = spiral_xyz(p)
        px, py = world_to_img(CLOSE, x, y, z)
        pts.append((cam.to_frame(px, py), x + z > -2))
    for i in range(1, len(pts)):
        (p0, f0), (p1, f1) = pts[i - 1], pts[i]
        front = f0 and f1
        if (i // 4) % 2 == 0 or front:
            d.line([p0, p1], fill=(ACCENT if front else RUBY_DEEP) + (230 if front else 120,), width=5 if front else 3)

def draw_climbers(frame, cam, t):
    d = ImageDraw.Draw(frame)
    items = []
    for b in climbers:
        idx = b["team"] * 6 + b["k"]
        p = ease_io(seg(t, 17.6 + 0.12 * idx, 22.2 + 0.03 * idx))
        (x, y, z), ang = spiral_xyz(p)
        if t >= 22.4:
            # au sommet : positions dispersées et petits déplacements
            rr = 4 + (idx * 37 % 6)
            aa = idx * 2.39 + 0.4 * math.sin(t * 2 + idx)
            x, y, z = rr * math.cos(aa), summit_y, rr * math.sin(aa)
        px, py = world_to_img(CLOSE, x, y + 1.2, z)
        fx, fy = cam.to_frame(px, py)
        front = (x + z) > -2 or t >= 22.4
        dead = 0.0
        if b["team"] in elim_summit:
            dead = seg(t, elim_summit[b["team"]] + 0.12 * b["k"], elim_summit[b["team"]] + 0.12 * b["k"] + 0.5)
        items.append((x + z, b, fx, fy, front, dead))
    items.sort(key=lambda it: it[0])
    for _, b, fx, fy, front, dead in items:
        if dead >= 1:
            continue
        bot(frame, d, fx, fy, TEAMS[b["team"]][1], size=1.15 if t >= 22.4 else 0.95, alpha=(1 if front else 0.45) * (1 - dead))
        if dead > 0:
            r = 18 + 40 * dead
            d.ellipse((fx - r, fy - 24 - r, fx + r, fy - 24 + r), outline=ACCENT + (int(255 * (1 - dead)),), width=5)

def particles(frame, cam, t, t0):
    if t < t0:
        return
    d = ImageDraw.Draw(frame)
    rng = random.Random(5)
    px, py = cam.to_frame(*world_to_img(CLOSE, 0, summit_y + 4, 0))
    for i in range(140):
        ang = rng.uniform(0, 2 * math.pi)
        sp = rng.uniform(150, 520)
        life = (t - t0 - rng.uniform(0, 0.6)) / 1.8
        if not (0 < life < 1):
            continue
        x = px + math.cos(ang) * sp * life
        y = py + math.sin(ang) * sp * life * 0.7 + 260 * life * life
        col = rng.choice([ACCENT, (246, 204, 70), SILVER])
        s = 6 * (1 - life) + 2
        d.rectangle((x - s, y - s, x + s, y + s), fill=col + (int(255 * (1 - life)),))

def intro(t):
    frame = background()
    d = ImageDraw.Draw(frame)
    # symbole
    sc = ease_back(seg(t, 0.15, 0.9))
    if sc > 0:
        sz = int(300 * sc)
        sym = SYMBOL.resize((max(1, sz), max(1, sz)), Image.LANCZOS)
        frame.alpha_composite(sym, (WF // 2 - sz // 2, int(HF * 0.36 - sz / 2 - 60 * seg(t, 1.5, 2.2))))
    # éclat rubis
    gl = seg(t, 0.6, 1.3) * (1 - seg(t, 1.3, 2.0))
    if gl > 0:
        w = int(900 * gl)
        d.rectangle((WF // 2 - w // 2, int(HF * 0.36) + 4, WF // 2 + w // 2, int(HF * 0.36) + 7), fill=ACCENT + (int(255 * gl),))
    # wordmark
    wa = seg(t, 0.9, 1.5)
    if wa > 0:
        wm = WORDMARK.resize((520, int(520 * WORDMARK.height / WORDMARK.width)), Image.LANCZOS)
        wm.putalpha(wm.getchannel("A").point(lambda v: int(v * wa)))
        frame.alpha_composite(wm, (WF // 2 - 260, int(HF * 0.36 + 185 - 60 * seg(t, 1.5, 2.2))))
    # titre
    ta = ease_out(seg(t, 1.7, 2.4))
    if ta > 0:
        f = chakra(120)
        title = "FORTERESSE WAR"
        sp = 18 - 10 * ta
        tw = spaced_width(title, f, sp)
        y = HF * 0.64 + 40 * (1 - ta)
        text_spaced(d, (WF / 2 - tw / 2, y), title, f, FG + (int(255 * ta),), sp)
        sub = "Le nouveau mode de guerre de faction"
        fs = inter(38)
        d.text((WF / 2 - fs.getlength(sub) / 2, y + 150), sub, font=fs, fill=ACCENT + (int(255 * seg(t, 2.1, 2.6)),))
    return frame

def outro(t):
    frame = background()
    d = ImageDraw.Draw(frame)
    a = ease_out(seg(t, 26.9, 27.5))
    sym = SYMBOL.resize((200, 200), Image.LANCZOS)
    sym.putalpha(sym.getchannel("A").point(lambda v: int(v * a)))
    frame.alpha_composite(sym, (WF // 2 - 100, int(150 + 30 * (1 - a))))
    f = chakra(110)
    tw = spaced_width("FORTERESSE WAR", f, 8)
    text_spaced(d, (WF / 2 - tw / 2, 390 + 30 * (1 - a)), "FORTERESSE WAR", f, FG + (int(255 * a),), 8)
    b = ease_out(seg(t, 27.4, 28.0))
    pill = "/f war rejoindre"
    fp = chakra(54, 600)
    pw = fp.getlength(pill) + 90
    x0 = WF / 2 - pw / 2
    d.rounded_rectangle((x0, 570, x0 + pw * b, 660), radius=45, fill=(193, 28, 43, int(255 * b)))
    if b > 0.6:
        d.text((x0 + 45, 580), pill, font=fp, fill=(255, 255, 255, int(255 * seg(b, 0.6, 1.0))))
    c = seg(t, 28.0, 28.5)
    l1 = "Chaque dimanche · 21h · inscriptions en jeu"
    fi = inter(36)
    d.text((WF / 2 - fi.getlength(l1) / 2, 712), l1, font=fi, fill=MUTED + (int(255 * c),))
    wm = WORDMARK.resize((340, int(340 * WORDMARK.height / WORDMARK.width)), Image.LANCZOS)
    wm.putalpha(wm.getchannel("A").point(lambda v: int(v * c)))
    frame.alpha_composite(wm, (WF // 2 - 170, 860))
    fade = seg(t, 29.4, 30.0)
    if fade > 0:
        frame.alpha_composite(Image.new("RGBA", (WF, HF), BG + (int(255 * fade),)))
    return frame

def flash(frame, a, col=(255, 255, 255)):
    if a > 0:
        frame.alpha_composite(Image.new("RGBA", (WF, HF), col + (int(160 * a),)))

def render(t):
    if t < 3.4:
        fr = intro(t)
        wipe(fr, t, 2.9, 3.7)
        return fr
    if t >= 26.6:
        fr = outro(t)
        wipe(fr, t, 26.2, 27.0)
        return fr
    if t < 17.0:
        if t < 8.6:
            cam = cam_lerp(cam_full, cam_forest, ease_io(seg(t, 3.4, 8.6)))
            fr = shot(cam)
        elif t < 13.0:
            cam = cam_lerp(cam_forest, cam_temple, ease_io(seg(t, 8.6, 10.6)))
            op = ease_io(seg(t, 10.2, 10.9))
            fr = shot(cam, "wide_closed", "wide_open", op)
            flash(fr, (1 - seg(t, 10.2, 10.6)) * float(t >= 10.2) * 0.6, (246, 204, 70))
        else:
            cam = cam_lerp(cam_temple, cam_temple2, ease_io(seg(t, 13.0, 17.0)))
            cl = ease_io(seg(t, 13.2, 13.6))
            fr = shot(cam, "wide_open", "wide_closed", cl)
            flash(fr, (1 - seg(t, 13.2, 13.7)) * float(t >= 13.2) * 0.7, RUBY)
        draw_wide_bots(fr, cam, WIDE, t)
        if t > 16.6:  # fondu vers le gros plan
            nxt = shot(cam_c0, "close_closed")
            fr = Image.blend(fr, nxt, seg(t, 16.6, 17.0))
    else:
        if t < 22.4:
            cam = cam_lerp(cam_c0, cam_c1, ease_io(seg(t, 17.0, 22.4)))
        else:
            cam = cam_lerp(cam_c1, cam_sum, ease_io(seg(t, 22.4, 23.4)))
        fr = shot(cam, "close_closed")
        if t < 23.0:
            draw_spiral(fr, cam, t, 17.3, 22.6)
        draw_climbers(fr, cam, t)
        particles(fr, cam, t, 25.6)
        if t > 25.6:
            d = ImageDraw.Draw(fr)
            a = ease_back(seg(t, 25.6, 26.1))
            al = int(255 * seg(t, 25.6, 25.9))
            f = chakra(int(70 * max(0.2, a)))
            txt = "VICTOIRE · RUBIS"
            tw = spaced_width(txt, f, 4)
            x0, y0 = WF * 0.74 - tw / 2, 560
            d.rounded_rectangle((x0 - 36, y0 - 18, x0 + tw + 36, y0 + 96), radius=18, fill=(7, 7, 10, int(al * 0.85)), outline=(246, 204, 70, al), width=3)
            text_spaced(d, (x0, y0), txt, f, (246, 204, 70, al), 4)
    caption(fr, t)
    hud(fr, t)
    return fr

def audio(path):
    sr = 44100
    n = int(sr * DUR)
    tt = np.arange(n) / sr
    out = np.zeros(n)
    # nappe grave
    swell = 0.5 + 0.5 * np.sin(2 * np.pi * tt / 15 - 1.2)
    out += 0.10 * (np.sin(2 * np.pi * 55 * tt) + 0.6 * np.sin(2 * np.pi * 82.4 * tt) + 0.3 * np.sin(2 * np.pi * 110.2 * tt)) * swell
    out *= np.clip(tt / 1.5, 0, 1) * np.clip((DUR - tt) / 1.0, 0, 1)
    def hit(t0, f0=120, f1=38, dur=0.6, amp=0.55):
        i0 = int(t0 * sr); m = int(dur * sr)
        if i0 + m > n: m = n - i0
        x = np.arange(m) / sr
        f = f1 + (f0 - f1) * np.exp(-x * 18)
        out[i0:i0 + m] += amp * np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-x * 7)
    def whoosh(t0, dur=0.7, amp=0.18):
        i0 = int(t0 * sr); m = int(dur * sr)
        noise = np.random.default_rng(int(t0 * 100)).standard_normal(m)
        k = np.ones(40) / 40
        noise = np.convolve(noise, k, mode="same")
        env = np.sin(np.linspace(0, np.pi, m)) ** 2
        out[i0:i0 + m] += amp * 6 * noise * env
    def clank(t0, amp=0.25):
        i0 = int(t0 * sr); m = int(0.9 * sr)
        x = np.arange(m) / sr
        s = sum(np.sin(2 * np.pi * f * x) for f in (410, 623, 905, 1290)) / 4
        out[i0:i0 + m] += amp * s * np.exp(-x * 6)
    def chord(t0, amp=0.12):
        i0 = int(t0 * sr); m = int(3.2 * sr)
        x = np.arange(m) / sr
        s = np.zeros(m)
        for j, f in enumerate((220, 277.2, 329.6, 440, 554.4)):
            st = int(j * 0.07 * sr)
            s[st:] += np.sin(2 * np.pi * f * x[:m - st]) * np.exp(-x[:m - st] * 1.1)
        out[i0:i0 + m] += amp * s
    whoosh(2.85); hit(3.45)
    for (a, *_r) in STEPS[1:]:
        hit(a, amp=0.45)
    clank(10.2); clank(13.2, 0.3); hit(13.2, 90, 30, 0.9, 0.6)
    for k in range(4):
        hit(17.6 + k * 1.2, 70, 40, 0.3, 0.18)
    hit(23.6, 100, 40, 0.4, 0.3); hit(24.9, 100, 40, 0.4, 0.3)
    chord(25.6)
    whoosh(26.15); hit(27.0, 110, 35, 0.9, 0.5)
    out = out / max(1e-6, np.max(np.abs(out))) * 0.85
    pcm = (out * 32767).astype(np.int16)
    st = np.stack([pcm, pcm], axis=1).reshape(-1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(st.tobytes())

if __name__ == "__main__":
    if len(sys.argv) > 3:  # images de contrôle
        for ts in sys.argv[3].split(","):
            render(float(ts)).convert("RGB").save(f"{V}/still_{ts}.jpg", quality=90)
        sys.exit(0)
    audio(f"{V}/audio.wav")
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{WF}x{HF}", "-r", str(FPS), "-i", "-",
                          "-i", f"{V}/audio.wav", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
                          "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
    for i in range(NF):
        p.stdin.write(render(i / FPS).convert("RGB").tobytes())
        if i % 90 == 0:
            print("image", i, flush=True)
    p.stdin.close()
    p.wait()
    print("vidéo :", OUT)
