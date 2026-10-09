"""Bande-son « bataille » de la vidéo Forteresse War (30 s), synthétisée : tambours de guerre, cor, cuivres,
cordes graves, chocs d'épées, clameur et cymbales, calés sur les étapes de la vidéo.

  python3 bande_son.py <sortie.wav>
Puis : ffmpeg -i video.mp4 -i sortie.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest finale.mp4
"""
import sys, wave
import numpy as np
from scipy.signal import butter, lfilter, sosfilt

SR = 48000
DUR = 30.0
N = int(SR * DUR)
BPM = 120
BEAT = 60 / BPM
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(1789)

# Étapes de la vidéo (s)
T_IMPACT, T_FORET, T_PORTES, T_FERME, T_TOUR, T_SOMMET, T_VICTOIRE, T_FIN = 3.4, 3.4, 8.6, 13.0, 17.0, 22.4, 25.6, 27.0


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def add(sig, t0, pan=0.0, gain=1.0):
    i0 = int(t0 * SR)
    if i0 >= N or i0 + len(sig) <= 0:
        return
    s = sig[: N - i0] * gain
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[i0:i0 + len(s)] += s * gl * 1.414
    R[i0:i0 + len(s)] += s * gr * 1.414


def env_ad(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)


def saw(f, n, detune=0.0):
    t = np.arange(n) / SR
    ph = (np.cumsum(np.broadcast_to(f, (n,))) / SR) if np.ndim(f) else f * t
    return 2 * ((ph * (1 + detune)) % 1) - 1


# ── Percussions ──
def taiko(pitch=70, amp=1.0, dur=0.9):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = pitch * (1 + 1.4 * np.exp(-t * 30))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5.5)
    skin = lp(rng.standard_normal(n), 1800) * np.exp(-t * 28) * 0.6
    return amp * np.tanh(1.6 * (body + skin))


def boom(amp=1.0):
    n = int(2.6 * SR)
    t = np.arange(n) / SR
    f = 38 + 70 * np.exp(-t * 9)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    s += lp(rng.standard_normal(n), 400) * np.exp(-t * 4) * 0.8
    return amp * np.tanh(1.8 * s)


def snare(amp=0.5):
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    s = bp(rng.standard_normal(n), 900, 7000) * np.exp(-t * 22) + 0.4 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    return amp * s


def roll(dur, amp=0.35):
    """Roulement de caisse claire militaire, en crescendo."""
    n = int(dur * SR)
    out = np.zeros(n)
    k = 0
    while True:
        tt = k * 0.0625
        if tt >= dur:
            break
        s = snare(amp * (0.3 + 0.7 * tt / dur))
        i = int(tt * SR)
        out[i:i + len(s)] += s[: n - i]
        k += 1
    return out


def clash(amp=0.5):
    """Choc d'épées : partiels métalliques inharmoniques + clic."""
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for f, d in ((2140, 7), (3390, 9), (4710, 11), (6020, 14), (8150, 18)):
        s += np.sin(2 * np.pi * f * rng.uniform(0.97, 1.03) * t) * np.exp(-t * d)
    s += hp(rng.standard_normal(n), 3000) * np.exp(-t * 60) * 1.5
    return amp * s / 3


def cymbal_swell(dur, amp=0.4):
    amp *= 0.65
    n = int(dur * SR)
    t = np.arange(n) / SR
    return amp * hp(rng.standard_normal(n), 5000) * (t / dur) ** 2.5


def crash(amp=0.5):
    amp *= 0.6
    n = int(2.4 * SR)
    t = np.arange(n) / SR
    return amp * hp(rng.standard_normal(n), 3500) * np.exp(-t * 1.8)


# ── Mélodiques ──
NOTES = {"D1": 36.71, "A1": 55.0, "D2": 73.42, "F2": 87.31, "G2": 98.0, "A2": 110.0, "Bb2": 116.54, "C3": 130.81, "D3": 146.83,
         "E3": 164.81, "F3": 174.61, "G3": 196.0, "A3": 220.0, "Bb3": 233.08, "C4": 261.63, "D4": 293.66, "F4": 349.23, "A4": 440.0}


def brass(freqs, dur, amp=0.25, attack=0.04, bright=2200):
    """Cuivres : dents de scie désaccordées, filtrées, attaque mordante."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for f in freqs:
        for dt in (-0.004, 0.0, 0.005):
            s += saw(f * (1 + dt) * (1 + 0.003 * np.sin(2 * np.pi * 5.2 * t)), n)
    s = lp(s, bright, 2) / (3 * len(freqs))
    e = np.minimum(1, t / attack) * np.minimum(1, (dur - t) / 0.12)
    e *= 1 + 0.6 * np.exp(-t * 9)  # mordant de l'attaque
    return amp * np.tanh(2.2 * s * e)


def horn(dur=2.6, amp=0.35):
    """Cor de guerre : glissando grave, vibrato, souffle."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = NOTES["D2"] * (0.92 + 0.08 * np.minimum(1, t / 0.35)) * (1 + 0.006 * np.sin(2 * np.pi * 4.5 * t))
    s = saw(f, n) + 0.5 * saw(f * 1.5, n) + 0.25 * saw(f * 2, n)
    s = lp(s, 900, 2)
    s += lp(rng.standard_normal(n), 1200) * 0.08
    e = np.minimum(1, t / 0.25) * np.minimum(1, (dur - t) / 0.6)
    return amp * np.tanh(1.5 * s * e)


def strings(freqs, dur, amp=0.18, rise=0.0):
    """Cordes graves en tremolo ; rise = montée de hauteur (en demi-tons) sur la durée."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    bend = 2 ** (rise * (t / dur) / 12)
    for f in freqs:
        for dt in (-0.006, 0.0, 0.007):
            s += saw(f * (1 + dt) * bend, n)
    s = lp(s, 1600, 2) / (3 * len(freqs))
    trem = 0.65 + 0.35 * np.sin(2 * np.pi * 12 * t)
    e = np.minimum(1, t / 0.3) * np.minimum(1, (dur - t) / 0.3)
    return amp * s * trem * e


def choir(freqs, dur, amp=0.12):
    """Chœur « aah » : formants autour de 700 / 1100 Hz sur des dents de scie douces."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for f in freqs:
        for dt in (-0.008, 0.0, 0.009):
            s += saw(f * (1 + dt) * (1 + 0.004 * np.sin(2 * np.pi * 5 * t + dt * 900)), n)
    s = bp(s, 500, 1300, 2) + 0.4 * bp(s, 2300, 3000, 2)
    e = np.minimum(1, t / 0.5) * np.minimum(1, (dur - t) / 0.5)
    return amp * s * e / len(freqs)


def crowd(dur, amp=0.12):
    """Clameur de bataille : bruit filtré modulé, cris diffus."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = bp(rng.standard_normal(n), 250, 1800, 2)
    mod = lp(np.abs(rng.standard_normal(n)), 3) * 6
    e = np.minimum(1, t / 0.8) * np.minimum(1, (dur - t) / 0.8)
    return amp * s * (0.5 + mod) * e


def riser(dur, amp=0.3):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 80 * 2 ** (4 * t / dur)
    s = saw(f, n) * 0.4 + hp(rng.standard_normal(n), 2000) * 0.6
    return amp * lp(s, 6000) * (t / dur) ** 2


# ── Arrangement ──
# Intro : cor de guerre, tambours qui s'éveillent, montée vers l'impact.
add(horn(2.8, 0.42), 0.15, -0.2)
for k, tt in enumerate((0.5, 1.5, 2.0, 2.5, 2.75, 3.0, 3.125, 3.25)):
    add(taiko(60, 0.5 + 0.06 * k), tt, (-0.3, 0.3)[k % 2])
add(roll(1.1, 0.3), 2.3)
add(riser(1.4, 0.25), 2.0)
add(cymbal_swell(1.4, 0.35), 2.0)
add(boom(1.0), T_IMPACT)
add(crash(0.45), T_IMPACT, 0.2)

# 01 · Seul dans la forêt : battement de cœur de guerre, cordes graves inquiètes.
add(strings([NOTES["D2"], NOTES["A2"]], T_PORTES - T_FORET + 0.3, 0.32), T_FORET)
add(choir([NOTES["D3"], NOTES["A3"]], T_PORTES - T_FORET + 0.3, 0.10), T_FORET)
add(brass([NOTES["D1"] * 2, NOTES["A1"] * 2], T_PORTES - T_FORET + 0.2, 0.12, attack=1.2, bright=500), T_FORET)
t = T_FORET + BEAT
while t < T_PORTES - 0.6:
    add(taiko(55, 0.6), t, -0.15)
    add(taiko(55, 0.35), t + 0.18, 0.15)
    add(taiko(80, 0.25), t + BEAT, 0.3)
    t += 2 * BEAT
add(roll(1.0, 0.32), T_PORTES - 1.0)
add(cymbal_swell(1.0, 0.3), T_PORTES - 1.0)


def battle_bar(t0, bars, intensity=1.0, sixteenths=False):
    """Rythme de bataille : grosse caisse, taikos en croches, caisse claire, accents."""
    for b in range(bars):
        tb = t0 + b * 4 * BEAT
        for q in range(8):
            tq = tb + q * BEAT / 2
            if tq >= N / SR:
                return
            add(taiko(48 if q in (0, 3, 6) else 68, (0.85 if q in (0, 3, 6) else 0.45) * intensity), tq, (-0.35, 0.35)[q % 2])
            if sixteenths:
                add(taiko(85, 0.22 * intensity), tq + BEAT / 4, (0.4, -0.4)[q % 2])
        add(snare(0.35 * intensity), tb + 2 * BEAT, 0.1)
        add(snare(0.35 * intensity), tb + 3.5 * BEAT, -0.1)


# 02 · Les portes s'ouvrent : le combat éclate.
add(boom(0.9), T_PORTES)
add(clash(0.55), T_PORTES + 0.05, 0.4)
battle_bar(T_PORTES, 2, 0.9)
add(brass([NOTES["D3"], NOTES["A3"], NOTES["D4"]], 0.45, 0.30), T_PORTES)
add(brass([NOTES["D3"], NOTES["A3"], NOTES["D4"]], 0.3, 0.26), T_PORTES + 1.5 * BEAT)
add(brass([NOTES["F3"], NOTES["C4"]], 0.3, 0.26), T_PORTES + 3 * BEAT)
add(brass([NOTES["E3"], NOTES["A3"]], 0.9, 0.28), T_PORTES + 3.5 * BEAT)
add(brass([NOTES["D3"], NOTES["A3"], NOTES["D4"]], 0.45, 0.30), T_PORTES + 8 * BEAT)
add(brass([NOTES["Bb2"], NOTES["F3"], NOTES["Bb3"]], 0.9, 0.30), T_PORTES + 9.5 * BEAT)
add(strings([NOTES["D2"], NOTES["D3"]], T_FERME - T_PORTES, 0.18), T_PORTES)
add(crowd(T_FERME - T_PORTES + 0.5, 0.10), T_PORTES)
for _ in range(7):
    add(clash(rng.uniform(0.25, 0.45)), rng.uniform(T_PORTES + 0.6, T_FERME - 0.3), rng.uniform(-0.8, 0.8))

# 03 · Les portes se ferment : la herse s'abat.
add(boom(1.0), T_FERME + 0.2)
add(clash(0.6), T_FERME + 0.2, -0.3)
add(clash(0.5), T_FERME + 0.24, 0.3)
add(crash(0.4), T_FERME + 0.2)
battle_bar(T_FERME + 0.2, 2, 1.0)
add(brass([NOTES["D3"], NOTES["F3"], NOTES["A3"]], 1.4, 0.32), T_FERME + 0.2)
add(brass([NOTES["C3"], NOTES["G3"]], 0.6, 0.28), T_FERME + 0.2 + 4 * BEAT)
add(brass([NOTES["Bb2"], NOTES["F3"]], 1.2, 0.30), T_FERME + 0.2 + 5.5 * BEAT)
add(crowd(T_TOUR - T_FERME, 0.12), T_FERME)
for _ in range(6):
    add(clash(rng.uniform(0.25, 0.45)), rng.uniform(T_FERME + 0.8, T_TOUR - 0.3), rng.uniform(-0.8, 0.8))
add(roll(1.0, 0.3), T_TOUR - 1.0)

# 04 · Monte en colimaçon : ostinato qui accélère, cordes qui montent.
battle_bar(T_TOUR, 3, 0.85, sixteenths=True)
add(strings([NOTES["D2"], NOTES["A2"], NOTES["D3"]], T_SOMMET - T_TOUR, 0.24, rise=7), T_TOUR)
for k in range(10):
    f = NOTES["D3"] * 2 ** (k * 0.7 / 12)
    add(brass([f, f * 1.5], 0.25, 0.18 + 0.01 * k, bright=1800 + 150 * k), T_TOUR + k * BEAT)
add(riser(1.6, 0.28), T_SOMMET - 1.6)
add(cymbal_swell(1.6, 0.35), T_SOMMET - 1.6)

# 05 · Dernière équipe au sommet : pleine bataille, chœur, puis fanfare de victoire.
add(boom(1.0), T_SOMMET)
add(crash(0.5), T_SOMMET, -0.2)
battle_bar(T_SOMMET, 2, 1.05, sixteenths=True)
add(choir([NOTES["D3"], NOTES["F3"], NOTES["A3"]], T_VICTOIRE - T_SOMMET + 0.2, 0.16), T_SOMMET)
add(brass([NOTES["D3"], NOTES["A3"], NOTES["D4"]], 0.5, 0.32), T_SOMMET)
add(brass([NOTES["F3"], NOTES["C4"]], 0.5, 0.30), T_SOMMET + 2 * BEAT)
add(brass([NOTES["G3"], NOTES["D4"]], 0.5, 0.30), T_SOMMET + 4 * BEAT)
add(crowd(T_VICTOIRE - T_SOMMET + 1.0, 0.14), T_SOMMET)
for tt in np.sort(rng.uniform(T_SOMMET + 0.2, T_VICTOIRE - 0.1, 10)):
    add(clash(rng.uniform(0.3, 0.5)), tt, rng.uniform(-0.8, 0.8))
add(clash(0.6), 23.6, -0.4)
add(clash(0.6), 24.9, 0.4)
# Victoire : accord majeur triomphant
add(boom(0.9), T_VICTOIRE)
add(crash(0.5), T_VICTOIRE)
add(brass([NOTES["D3"], NOTES["F3"] * 2 ** (1 / 12), NOTES["A3"], NOTES["D4"]], 1.1, 0.36, bright=3000), T_VICTOIRE)
add(brass([NOTES["G3"], NOTES["D4"]], 0.4, 0.3, bright=3000), T_VICTOIRE + 1.1)
add(brass([NOTES["D3"], NOTES["F3"] * 2 ** (1 / 12), NOTES["A3"], NOTES["D4"]], 1.6, 0.38, bright=3200), T_VICTOIRE + 1.5)
add(choir([NOTES["D3"], NOTES["F3"] * 2 ** (1 / 12), NOTES["A3"], NOTES["D4"]], 2.6, 0.18), T_VICTOIRE)
for k, tt in enumerate((T_VICTOIRE, T_VICTOIRE + 0.25, T_VICTOIRE + 0.5, T_VICTOIRE + 1.1, T_VICTOIRE + 1.5)):
    add(taiko(52, 0.8), tt, (-0.3, 0.3)[k % 2])

# Fin : coup final, cor lointain, extinction.
add(riser(0.9, 0.25), T_FIN - 0.9)
add(boom(1.0), T_FIN)
add(crash(0.55), T_FIN)
add(brass([NOTES["D2"], NOTES["A2"], NOTES["D3"]], 2.2, 0.30, attack=0.02, bright=1500), T_FIN)
add(horn(2.4, 0.22), T_FIN + 0.8, 0.3)

# ── Réverbération (Schroeder) et mastering ──
def reverb(x, mix=0.22):
    out = np.zeros_like(x)
    for d, g in ((1557, 0.80), (1617, 0.79), (1491, 0.81), (1422, 0.82)):  # peignes en parallèle
        d = int(d * SR / 44100)
        a = np.zeros(d + 1); a[0], a[d] = 1.0, -g
        out += lfilter([1.0], a, x)
    out /= 4
    for d, g in ((225, 0.7), (556, 0.7)):                                 # passe-tout en série
        d = int(d * SR / 44100)
        bb = np.zeros(d + 1); bb[0], bb[d] = -g, 1.0
        a = np.zeros(d + 1); a[0], a[d] = 1.0, -g
        out = lfilter(bb, a, out)
    return (1 - mix) * x + mix * lp(out, 5000)


L, R = reverb(L), reverb(R)
for ch in (L, R):
    ch *= np.clip(np.arange(N) / (0.05 * SR), 0, 1) * np.clip((N - np.arange(N)) / (1.2 * SR), 0, 1)
peak = max(np.max(np.abs(L)), np.max(np.abs(R)))
L, R = np.tanh(1.3 * L / peak) / np.tanh(1.3), np.tanh(1.3 * R / peak) / np.tanh(1.3)
L, R = L * 0.9, R * 0.9
pcm = (np.stack([L, R], axis=1) * 32767).astype(np.int16)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("bande-son :", sys.argv[1])
