"""Musique d'ambiance de la vidéo TikTok « plans 3D » (28 s), calée sur les plans de montage.

  python3 tiktok_son.py <sortie.wav>
Instruments : instruments.py (les mêmes que la bande-annonce Faction).
"""
import sys

import numpy as np

from instruments import BEAT, NOTES, SR, Mix, boom, brass, choir, crash, cymbal_swell, horn, lp, riser, rng, roll, snare, strings, taiko

# Plans (s) : logo, spawn, île marchande, La Fosse, KOTH, Totem, fin
INTRO, SPAWN, ILE, FOSSE, KOTH, TOTEM, OUT, END = 0.0, 2.5, 7.0, 11.0, 15.0, 20.0, 24.0, 28.0
N = NOTES
D2, A2, D3, F3, A3, D4 = N["D2"], N["A2"], N["D3"], N["F3"], N["A3"], N["D4"]

mix = Mix(END)
add, bar = mix.add, mix.battle_bar


def drone(dur, f=36.71, amp=0.22):
    """Nappe grave qui respire : fondamentale + quinte, lentement modulées."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t + 0.3) + 0.35 * np.sin(2 * np.pi * f * 2 * t)
    s *= 0.8 + 0.2 * np.sin(2 * np.pi * 0.21 * t)
    e = np.minimum(1, t / 1.5) * np.minimum(1, (dur - t) / 1.5)
    return amp * s * e


def wind(dur, amp=0.05):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = lp(rng.standard_normal(n), 700) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * t + 1))
    return amp * s * np.minimum(1, t / 2) * np.minimum(1, (dur - t) / 2)


def bell(f, amp=0.16, dur=2.5):
    """Cloche lointaine : partiels inharmoniques."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * d) for k, a, d in ((1, 1, 1.6), (2.76, 0.5, 2.6), (5.4, 0.25, 4), (8.9, 0.12, 6)))
    return amp * s


# Nappe continue sous toute la vidéo
add(drone(END), 0.0)
add(wind(END), 0.0)

# Logo : cor de guerre, deux battements, montée
add(horn(2.4, 0.4), 0.05, -0.15)
add(taiko(52, 0.5), 1.5, -0.2); add(taiko(52, 0.65), 2.0, 0.2)
add(cymbal_swell(1.2, 0.3), SPAWN - 1.2)

# Spawn, L'Île-Cœur : chœur et cloches, battement de cœur
add(boom(0.75), SPAWN)
add(choir([D3, A3, D4], ILE - SPAWN, 0.2), SPAWN)
add(strings([D2, A2], ILE - SPAWN, 0.16), SPAWN)
for k, f in enumerate((D4 * 2, A3 * 2, F3 * 2 * 2)):
    add(bell(f, 0.13), SPAWN + 0.5 + k * 1.25, (-0.4, 0.4, 0.0)[k])
for k in range(4):
    add(taiko(50, 0.4), SPAWN + 0.5 + k, -0.1); add(taiko(50, 0.22), SPAWN + 0.72 + k, 0.1)

# Île marchande : le thème entre, plus chaud (Fa majeur)
add(strings([N["F2"], N["C3"], F3], FOSSE - ILE, 0.2), ILE)
add(choir([F3, A3, N["C4"]], FOSSE - ILE, 0.14), ILE)
for k, (f, d) in enumerate(((A3, 1.0), (N["C4"], 1.0), (D4, 0.5), (N["C4"], 0.5), (A3, 1.0))):
    t0 = ILE + sum(x[1] for x in ((A3, 1.0), (N["C4"], 1.0), (D4, 0.5), (N["C4"], 0.5), (A3, 1.0))[:k])
    add(brass([f], d * 0.95, 0.16, attack=0.08, bright=1400), t0, 0.2)
for k in range(8):
    add(taiko(64, 0.28 + 0.03 * k), ILE + k * BEAT, (-0.3, 0.3)[k % 2])
add(roll(0.8, 0.22), FOSSE - 0.8)

# La Fosse : la tension monte, tambours de guerre
add(boom(0.9), FOSSE); add(crash(0.3), FOSSE, 0.2)
bar(FOSSE, 2, 0.6)
add(strings([D2, A2, D3], KOTH - FOSSE, 0.24, rise=3), FOSSE)
add(brass([D3, A3], 0.5, 0.2), FOSSE + 1.0); add(brass([F3, N["C4"]], 0.5, 0.2), FOSSE + 2.0)
add(brass([N["E3"], A3], 0.8, 0.22), FOSSE + 3.0)
add(riser(1.5, 0.26), KOTH - 1.5); add(cymbal_swell(1.5, 0.35), KOTH - 1.5)

# KOTH, Gouffre de Vælor : pleine puissance
add(boom(1.0), KOTH); add(crash(0.5), KOTH)
bar(KOTH, 3, 1.0, sixteenths=True)
add(strings([D2, D3], TOTEM - KOTH, 0.2), KOTH)
add(choir([D3, F3, A3, D4], TOTEM - KOTH, 0.16), KOTH)
for t0, ch in ((0.0, [D3, F3, A3]), (2.0, [N["Bb2"], F3, N["Bb3"]]), (3.0, [N["C3"], N["G3"], N["C4"]]), (4.0, [D3, A3, D4])):
    add(brass(ch, 0.9, 0.3), KOTH + t0)
    if t0:
        add(boom(0.7), KOTH + t0)

# Totem, Le Sanctuaire : on retient, puis roulement final
add(boom(0.85), TOTEM); add(crash(0.35), TOTEM, -0.2)
add(choir([D3, A3, D4], OUT - TOTEM, 0.18), TOTEM)
add(strings([D2, A2], OUT - TOTEM, 0.2), TOTEM)
for k in range(8):
    add(taiko(56, 0.45 + 0.05 * k), TOTEM + k * BEAT, (-0.3, 0.3)[k % 2])
    if k >= 4:
        add(snare(0.25), TOTEM + k * BEAT + BEAT / 2, 0.0)
add(roll(1.2, 0.3), OUT - 1.2); add(riser(1.4, 0.26), OUT - 1.4); add(cymbal_swell(1.4, 0.35), OUT - 1.4)

# Fin : accord final en Ré majeur, cor qui s'éloigne
FS3 = F3 * 2 ** (1 / 12)
add(boom(1.0), OUT); add(crash(0.55), OUT)
add(brass([D2, A2, D3, FS3, A3], 2.8, 0.36, attack=0.02, bright=2400), OUT)
add(choir([D3, FS3, A3], 3.2, 0.18), OUT)
for k, tt in enumerate((OUT, OUT + 0.25, OUT + 0.5)):
    add(taiko(50, 0.8), tt, (-0.3, 0.3)[k % 2])
add(bell(D4 * 2, 0.14, 3.0), OUT + 0.6)
add(horn(2.4, 0.2), OUT + 1.0, 0.3)

mix.write(sys.argv[1], fade_out=1.6)
print("musique :", sys.argv[1])
