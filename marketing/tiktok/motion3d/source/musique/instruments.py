"""Instruments synthétisés pour les bandes-son VÆLORIA (bataille) : tambours de guerre, cuivres, cor, cordes,
chœur, chocs d'épées, clameur, cymbales, réverbération. Utilisé par bande_son.py et trailer_son.py."""
import wave
import numpy as np
from scipy.signal import butter, lfilter, sosfilt

SR = 48000
BPM = 120
BEAT = 60 / BPM
rng = np.random.default_rng(1789)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


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



class Mix:
    """Piste stéréo : add() place un son à un instant, write() applique réverbération, mastering et écrit le WAV."""

    def __init__(self, dur):
        self.dur = dur
        self.n = int(SR * dur)
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)

    def add(self, sig, t0, pan=0.0, gain=1.0):
        i0 = int(t0 * SR)
        if i0 >= self.n or i0 + len(sig) <= 0:
            return
        s = sig[: self.n - i0] * gain
        gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.L[i0:i0 + len(s)] += s * gl * 1.414
        self.R[i0:i0 + len(s)] += s * gr * 1.414

    def battle_bar(self, t0, bars, intensity=1.0, sixteenths=False):
        """Rythme de bataille : grosse caisse, taikos en croches, caisse claire, accents."""
        add = self.add
        for b in range(bars):
            tb = t0 + b * 4 * BEAT
            for q in range(8):
                tq = tb + q * BEAT / 2
                if tq >= self.n / SR:
                    return
                add(taiko(48 if q in (0, 3, 6) else 68, (0.85 if q in (0, 3, 6) else 0.45) * intensity), tq, (-0.35, 0.35)[q % 2])
                if sixteenths:
                    add(taiko(85, 0.22 * intensity), tq + BEAT / 4, (0.4, -0.4)[q % 2])
            add(snare(0.35 * intensity), tb + 2 * BEAT, 0.1)
            add(snare(0.35 * intensity), tb + 3.5 * BEAT, -0.1)



    def write(self, path, fade_out=1.2):
        L, R = reverb(self.L), reverb(self.R)
        idx = np.arange(self.n)
        env = np.clip(idx / (0.05 * SR), 0, 1) * np.clip((self.n - idx) / (fade_out * SR), 0, 1)
        L, R = L * env, R * env
        peak = max(np.max(np.abs(L)), np.max(np.abs(R)))
        L, R = np.tanh(1.3 * L / peak) / np.tanh(1.3) * 0.9, np.tanh(1.3 * R / peak) / np.tanh(1.3) * 0.9
        pcm = (np.stack([L, R], axis=1) * 32767).astype(np.int16)
        with wave.open(path, "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())


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


