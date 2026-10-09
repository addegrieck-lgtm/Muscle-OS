#!/usr/bin/env python3
"""
Affiche « Comment parier » à poser devant l'arène du spawn (format paysage 2:1).

Sorties :
  - affiche-paris.png       2048 × 1024, pour l'impression ou un écran
  - affiche-paris-8x4.png   1024 × 512, mur de 8 × 4 cartes (1 pixel = 1 pixel de carte)
  - affiche-paris-6x3.png    768 × 384, mur de 6 × 3 cartes
Les textes suivent le fonctionnement de VæloriaArena (docs/ARENA_BOTS.md) et les réglages
par défaut de config.yml : 30 s de paris, mise de 100 à 100 000.

    python3 affiche-paris.py [--min 100] [--max 100000] [--duree 30]
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(__file__).resolve().parent
BRAND = OUT.parent.parent / "brand"
FONTS = Path("/usr/share/fonts/opentype/inter")

BG = (7, 7, 10)
SURFACE = (16, 17, 21)
LINE = (58, 61, 69)
FG = (244, 245, 247)
MUTED = (169, 174, 184)
RUBY = (210, 31, 47)
RED = (225, 45, 55)
BLUE = (60, 110, 230)

S = 2  # on dessine en 1024 × 512 « unités », rendues ×2


def font(weight: str, size: float) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / f"Inter-{weight}.otf"), int(size * S))


def fit(d, xy, text, weight, size, right, fill, anchor="la") -> None:
    """Écrit le texte en réduisant la police s'il dépasserait le bord droit (en unités)."""
    while size > 10 and xy[0] / S + d.textlength(text, font=font(weight, size)) / S > right:
        size -= 0.5
    d.text(xy, text, font=font(weight, size), fill=fill, anchor=anchor)


def fmt(n: int) -> str:
    return f"{n:,}".replace(",", " ")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--min", type=int, default=100)
    ap.add_argument("--max", type=int, default=100000)
    ap.add_argument("--duree", type=int, default=30)
    args = ap.parse_args()

    W, H = 1024, 512
    img = Image.new("RGB", (W * S, H * S), BG)

    # Halo rouge discret derrière le titre, comme la bannière du site
    glow = Image.new("RGB", img.size, BG)
    gd = ImageDraw.Draw(glow)
    gd.ellipse([300 * S, -160 * S, 900 * S, 260 * S], fill=(48, 8, 12))
    img = Image.blend(img, glow.filter(ImageFilter.GaussianBlur(90 * S)), 1.0)
    d = ImageDraw.Draw(img)
    u = lambda *v: [x * S for x in v]

    # ---- En-tête : symbole + titre
    sym = Image.open(BRAND / "valoria-symbole-blanc.png").convert("RGBA")
    sh = 84 * S
    sym = sym.resize((int(sym.width * sh / sym.height), sh), Image.LANCZOS)
    img.paste(sym, (40 * S, 30 * S), sym)
    tx = 40 + sym.width / S + 22
    d.text(u(tx, 30), "PARIS DE L'ARÈNE", font=font("Black", 50), fill=FG)
    d.text(u(tx + 2, 90), "Mise ta monnaie sur l'équipe qui gagne le combat de bots.", font=font("SemiBold", 21), fill=MUTED)
    d.rectangle(u(40, 134, W - 40, 136), fill=RUBY)

    # ---- 3 étapes
    cards = [
        ("1", "LES PARIS S'OUVRENT",
         [("Un combat de bots est annoncé", FG), ("à tout le serveur.", FG), ("", None),
          (f"Tu as {args.duree} secondes", RED), ("pour parier.", FG), ("", None),
          ("Le temps restant s'affiche", MUTED), ("dans la barre en haut de l'écran.", MUTED)]),
        ("2", "CHOISIS TON CAMP", None),
        ("3", "TON ÉQUIPE GAGNE ?",
         [("Tu récupères ta mise", FG), ("+ ta part de la mise des perdants.", FG), ("", None),
          ("Plus tu mises, plus ta part", MUTED), ("est grosse.", MUTED), ("", None),
          ("Cote ×1,50 = 1,50 rendu", RED), ("pour 1 misé.", FG)]),
    ]
    cw, gap, top, ch = 304, 20, 150, 266
    for i, (num, title, lines) in enumerate(cards):
        x0 = 40 + i * (cw + gap)
        d.rounded_rectangle(u(x0, top, x0 + cw, top + ch), radius=14 * S, fill=SURFACE, outline=LINE, width=2 * S)
        d.ellipse(u(x0 + 18, top + 16, x0 + 62, top + 60), fill=RUBY)
        d.text(u(x0 + 40, top + 38), num, font=font("Black", 26), fill=FG, anchor="mm")
        fit(d, u(x0 + 74, top + 38), title, "ExtraBold", 19, x0 + cw - 12, FG, anchor="lm")
        if lines:
            y = top + 80
            for text, col in lines:
                if text:
                    fit(d, u(x0 + 20, y), text, "SemiBold", 17, x0 + cw - 14, col)
                y += 21 if text else 9
        else:  # étape 2 : les commandes
            y = top + 74
            for cmd, ex, col in (("/pari rouge", " 500", RED), ("/pari bleu", " 1,5k", BLUE)):
                d.rounded_rectangle(u(x0 + 18, y, x0 + cw - 18, y + 46), radius=8 * S, fill=(col[0] // 5, col[1] // 5, col[2] // 5),
                                    outline=col, width=2 * S)
                d.ellipse(u(x0 + 32, y + 15, x0 + 48, y + 31), fill=col)
                f = font("Bold", 22)
                d.text(u(x0 + 58, y + 23), cmd, font=f, fill=FG, anchor="lm")
                wcmd = d.textlength(cmd, font=f) / S
                d.text(u(x0 + 58 + wcmd, y + 23), ex, font=f, fill=col, anchor="lm")
                y += 56
            fit(d, u(x0 + 20, y), "ou clique [Parier Rouge] /", "SemiBold", 17, x0 + cw - 14, FG)
            fit(d, u(x0 + 20, y + 21), "[Parier Bleu] dans le chat.", "SemiBold", 17, x0 + cw - 14, FG)
            fit(d, u(x0 + 20, y + 48), f"Mise : {fmt(args.min)} à {fmt(args.max)}", "Bold", 18, x0 + cw - 14, RED)

    # ---- Bandeau du bas
    by = top + ch + 12
    d.rounded_rectangle(u(40, by, W - 40, H - 14), radius=12 * S, fill=(26, 10, 13), outline=(90, 20, 28), width=2 * S)
    rows = [
        [("/pari", RED), (" seul : cagnottes, cotes et ta mise.", FG), ("   Tu peux miser plus, mais pas changer de camp.", MUTED)],
        [("Remboursé", RED), (" si personne n'a parié en face, en cas d'égalité ou si le combat est annulé.", FG)],
    ]
    for j, row in enumerate(rows):
        x, y = 58, by + 11 + j * 25
        for text, col in row:
            f = font("Bold" if col == RED else "SemiBold", 17)
            d.text(u(x, y), text, font=f, fill=col)
            x += d.textlength(text, font=f) / S

    img.save(OUT / "affiche-paris.png", optimize=True)
    img.resize((1024, 512), Image.LANCZOS).save(OUT / "affiche-paris-8x4.png", optimize=True)
    img.resize((768, 384), Image.LANCZOS).save(OUT / "affiche-paris-6x3.png", optimize=True)


if __name__ == "__main__":
    main()
