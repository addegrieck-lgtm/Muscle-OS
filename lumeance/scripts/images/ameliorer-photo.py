# Améliore une photo fournisseur pour une fiche produit LUMÉANCE (procédé validé sur Aigrette) :
# super-résolution Real-ESRGAN ×2 (CPU), recadrage 4:5, 1600 × 2000, WebP qualité 88.
#
# Installation (une fois, hors du projet) :
#   python3 -m venv /tmp/srenv
#   /tmp/srenv/bin/pip install --index-url https://download.pytorch.org/whl/cpu torch
#   /tmp/srenv/bin/pip install numpy pillow
#   curl -L -o /tmp/RealESRGAN_x2.pth \
#     https://huggingface.co/ai-forever/Real-ESRGAN/resolve/main/RealESRGAN_x2.pth
# Usage :
#   /tmp/srenv/bin/python -I scripts/images/ameliorer-photo.py /tmp/RealESRGAN_x2.pth \
#     photo-fournisseur.jpg public/products/<piece>/ambiance-<nom>.webp
#
# Réglages retenus (voir docs/FICHE-PRODUIT.md) : ×2 sur l'image entière. Le ×4 et le mélange avec
# l'original ont été écartés (cristaux « peints », dédoublements). Le poids est chargé en
# weights_only (aucun code exécuté). Ne jamais effacer un filigrane ni retoucher le produit.
import sys, torch, torch.nn as nn, torch.nn.functional as F, numpy as np
from PIL import Image

class RDB(nn.Module):
    def __init__(s, f=64, g=32):
        super().__init__()
        s.conv1 = nn.Conv2d(f, g, 3, 1, 1); s.conv2 = nn.Conv2d(f + g, g, 3, 1, 1)
        s.conv3 = nn.Conv2d(f + 2 * g, g, 3, 1, 1); s.conv4 = nn.Conv2d(f + 3 * g, g, 3, 1, 1)
        s.conv5 = nn.Conv2d(f + 4 * g, f, 3, 1, 1); s.l = nn.LeakyReLU(0.2, True)
    def forward(s, x):
        x1 = s.l(s.conv1(x)); x2 = s.l(s.conv2(torch.cat((x, x1), 1)))
        x3 = s.l(s.conv3(torch.cat((x, x1, x2), 1))); x4 = s.l(s.conv4(torch.cat((x, x1, x2, x3), 1)))
        return s.conv5(torch.cat((x, x1, x2, x3, x4), 1)) * 0.2 + x
class RRDB(nn.Module):
    def __init__(s, f=64, g=32):
        super().__init__(); s.rdb1 = RDB(f, g); s.rdb2 = RDB(f, g); s.rdb3 = RDB(f, g)
    def forward(s, x): return s.rdb3(s.rdb2(s.rdb1(x))) * 0.2 + x
class RRDBNet(nn.Module):
    def __init__(s, scale=4, f=64, nb=23, g=32):
        super().__init__(); s.scale = scale
        cin = 3 * (4 if scale == 2 else 1)
        s.conv_first = nn.Conv2d(cin, f, 3, 1, 1)
        s.body = nn.Sequential(*[RRDB(f, g) for _ in range(nb)])
        s.conv_body = nn.Conv2d(f, f, 3, 1, 1)
        s.conv_up1 = nn.Conv2d(f, f, 3, 1, 1); s.conv_up2 = nn.Conv2d(f, f, 3, 1, 1)
        s.conv_hr = nn.Conv2d(f, f, 3, 1, 1); s.conv_last = nn.Conv2d(f, 3, 3, 1, 1)
        s.l = nn.LeakyReLU(0.2, True)
    def forward(s, x):
        if s.scale == 2: x = F.pixel_unshuffle(x, 2)
        feat = s.conv_first(x); feat = feat + s.conv_body(s.body(feat))
        feat = s.l(s.conv_up1(F.interpolate(feat, scale_factor=2, mode="nearest")))
        feat = s.l(s.conv_up2(F.interpolate(feat, scale_factor=2, mode="nearest")))
        return s.conv_last(s.l(s.conv_hr(feat)))

def upscale(weights, img, scale=2, tile=256, pad=12):
    sd = torch.load(weights, map_location="cpu", weights_only=True)
    sd = sd.get("params_ema", sd.get("params", sd))
    m = RRDBNet(scale=scale); m.load_state_dict(sd, strict=True); m.eval()
    x = torch.from_numpy(np.asarray(img).astype(np.float32) / 255.0).permute(2, 0, 1)[None]
    h0, w0 = x.shape[2], x.shape[3]
    # Dimensions paires exigées par le modèle ×2 (pixel_unshuffle) : bordure miroir retirée après.
    x = F.pad(x, (0, w0 % 2, 0, h0 % 2), mode="reflect")
    _, _, h, w = x.shape; out = torch.zeros(1, 3, h * scale, w * scale)
    with torch.no_grad():
        for y0 in range(0, h, tile):
            for x0 in range(0, w, tile):
                ya, yb = max(0, y0 - pad), min(h, y0 + tile + pad); xa, xb = max(0, x0 - pad), min(w, x0 + tile + pad)
                ya -= (yb - ya) % 2; xa -= (xb - xa) % 2  # tuiles de taille paire
                o = m(x[:, :, ya:yb, xa:xb])
                ty, tx = (y0 - ya) * scale, (x0 - xa) * scale
                th, tw = (min(h, y0 + tile) - y0) * scale, (min(w, x0 + tile) - x0) * scale
                out[:, :, y0 * scale:y0 * scale + th, x0 * scale:x0 * scale + tw] = o[:, :, ty:ty + th, tx:tx + tw]
    out = out[:, :, : h0 * scale, : w0 * scale]
    return Image.fromarray((out[0].clamp(0, 1).permute(1, 2, 0).numpy() * 255).round().astype(np.uint8))

def crop_4_5(img):
    w, h = img.size
    if w * 5 > h * 4:  # trop large : on rogne les côtés
        nw = h * 4 // 5; l = (w - nw) // 2; return img.crop((l, 0, l + nw, h))
    nh = w * 5 // 4; t = (h - nh) // 2; return img.crop((0, t, w, t + nh))

if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit("usage : ameliorer-photo.py <poids RealESRGAN_x2.pth> <photo source> <sortie .webp>")
    weights, src, dst = sys.argv[1:]
    img = crop_4_5(Image.open(src).convert("RGB"))
    out = upscale(weights, img).resize((1600, 2000), Image.LANCZOS)
    out.save(dst, quality=88, method=6)
    print("✔", dst, out.size)
