"""Bande-son de la bande-annonce « Mode Faction » (60 s), calée sur les chapitres de compose_trailer.py.

  python3 trailer_son.py <sortie.wav>
"""
import sys

import numpy as np

from instruments import (BEAT, NOTES, Mix, boom, brass, choir, clash, crash, crowd, cymbal_swell, horn, riser, rng, roll,
                         snare, strings, taiko)

# Chapitres (s) — mêmes valeurs que compose_trailer.py
C1, C2, C3, C4, C5, C6, C7, C8, OUT, END = 4.5, 11.0, 18.5, 25.0, 30.0, 36.0, 48.5, 54.0, 57.0, 60.0
EVENTS = [36.0, 38.5, 41.0, 43.5, 46.0]
TNT_IMPACTS = [12.4, 12.9, 13.4, 13.9]

mix = Mix(END)
add, bar = mix.add, mix.battle_bar
D3, F3, A3, D4 = NOTES["D3"], NOTES["F3"], NOTES["A3"], NOTES["D4"]


def bell(f=1800, amp=0.18):
    """« Ding » de pièce : deux partiels clairs."""
    n = int(0.8 * 48000)
    t = np.arange(n) / 48000
    return amp * (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t)) * np.exp(-t * 6)


# Intro : cor, tambours qui s'éveillent, montée
add(horn(3.2, 0.42), 0.1, -0.2)
for k, tt in enumerate((0.6, 1.6, 2.4, 3.0, 3.4, 3.7, 3.95, 4.15, 4.3)):
    add(taiko(58, 0.45 + 0.06 * k), tt, (-0.3, 0.3)[k % 2])
add(roll(1.4, 0.3), C1 - 1.4)
add(riser(1.8, 0.25), C1 - 1.8)
add(cymbal_swell(1.8, 0.35), C1 - 1.8)

# 01 · Fonde ta faction : marche décidée
add(boom(1.0), C1); add(crash(0.45), C1, 0.2)
bar(C1, 3, 0.62)
add(strings([NOTES["D2"], NOTES["A2"]], C2 - C1, 0.24), C1)
for k in range(3):
    t0 = C1 + k * 4 * BEAT
    add(brass([D3, A3], 0.35, 0.22), t0)
    add(brass([F3, NOTES["C4"]], 0.35, 0.22), t0 + 1.5 * BEAT)
    add(brass([NOTES["E3"], A3], 0.6, 0.24), t0 + 3 * BEAT)
add(roll(0.6, 0.28), C2 - 0.6)

# 02 · Pillage à la TNT : explosions synchronisées
add(boom(0.8), C2)
bar(C2, 3, 0.85)
add(brass([D3, F3, A3], 1.0, 0.28), C2)
for t in TNT_IMPACTS:
    add(boom(0.9), t, rng.uniform(-0.3, 0.3))
    add(crash(0.3), t + 0.02)
add(choir([D3, A3], C3 - 15.0, 0.12), 15.0)     # l'obsidienne tient
add(brass([NOTES["Bb2"], F3, NOTES["Bb3"]], 1.4, 0.3), 15.0)
add(strings([NOTES["D2"], NOTES["D3"]], C3 - C2, 0.2), C2)

# 03 · Le surclaim : tension qui monte, coup sur le chunk pris
bar(C3, 3, 0.7, sixteenths=True)
add(strings([NOTES["D2"], NOTES["A2"], D3], C4 - C3, 0.26, rise=5), C3)
for k in range(6):
    add(taiko(90, 0.25), C3 + 0.25 + k * 0.5, 0.4)
add(riser(1.0, 0.25), 20.5)
add(boom(1.0), 21.5); add(crash(0.45), 21.5); add(clash(0.5), 21.52, -0.3)
add(brass([D3, A3, D4], 0.8, 0.32), 21.5)
add(brass([F3, NOTES["C4"]], 0.8, 0.30), 22.7)

# 04 · Défends-toi : respiration, chœur, battements
add(choir([D3, F3, A3], C5 - C4, 0.14), C4)
add(strings([NOTES["D2"], NOTES["A2"]], C5 - C4, 0.18), C4)
for k in range(5):
    add(taiko(52, 0.55), C4 + 0.2 + k * 1.0, -0.1)
    add(taiko(52, 0.3), C4 + 0.38 + k * 1.0, 0.1)
for k, t in enumerate((25.5, 26.4, 27.3, 28.2)):
    add(brass([D3 * (1 + 0.06 * k), A3 * (1 + 0.06 * k)], 0.35, 0.22), t)
add(roll(0.8, 0.28), C5 - 0.8)

# 05 · Une seule économie : groove et pièces
add(boom(0.7), C5)
bar(C5, 3, 0.7)
for k in range(6):
    add(bell(1800 + 120 * k, 0.12), C5 + 1.0 + k * 0.6, (-0.4, 0.4)[k % 2])
    f = D3 * 2 ** (k * 2 / 12)
    add(brass([f, f * 1.5], 0.3, 0.2), C5 + 1.0 + k * 0.6)
add(strings([NOTES["D2"], NOTES["F2"], NOTES["A2"]], C6 - C5, 0.18), C5)
add(riser(1.0, 0.25), C6 - 1.0); add(cymbal_swell(1.0, 0.3), C6 - 1.0)

# 06 · Les événements : pleine bataille, un impact par événement
bar(C6, 6, 1.0, sixteenths=True)
add(strings([NOTES["D2"], NOTES["D3"]], C7 - C6, 0.2), C6)
add(crowd(C7 - C6, 0.1), C6)
for i, t in enumerate(EVENTS):
    add(boom(0.85), t); add(crash(0.35), t, (-0.3, 0.3)[i % 2])
    chord = [[D3, A3, D4], [NOTES["Bb2"], F3, NOTES["Bb3"]], [NOTES["C3"], NOTES["G3"], NOTES["C4"]], [F3, NOTES["C4"], NOTES["F4"]], [D3, A3, D4]][i]
    add(brass(chord, 0.6, 0.3), t)
for _ in range(10):
    add(clash(rng.uniform(0.25, 0.4)), rng.uniform(C6 + 0.3, C7 - 0.3), rng.uniform(-0.8, 0.8))
add(riser(0.9, 0.2), 41.0 - 0.3)                 # caisse du convoi qui tombe
add(choir([D3, F3, A3, D4], C7 - 46.0, 0.16), 46.0)

# 07 · Guerres et primes : lourd
add(boom(1.0), C7); add(crash(0.45), C7)
bar(C7, 3, 1.05)
add(brass([D3, F3, A3], 1.2, 0.32), C7)
add(brass([NOTES["C3"], NOTES["G3"]], 0.5, 0.28), C7 + 2.5)
add(brass([NOTES["Bb2"], F3], 1.2, 0.30), C7 + 3.2)
add(clash(0.55), 51.3, -0.3); add(clash(0.5), 51.33, 0.3); add(boom(0.8), 51.3)
for _ in range(5):
    add(clash(rng.uniform(0.25, 0.4)), rng.uniform(C7 + 0.3, C8 - 0.3), rng.uniform(-0.8, 0.8))

# 08 · Jeu propre : montée finale
for k in range(6):
    add(snare(0.3), C8 + k * 0.5, (-0.2, 0.2)[k % 2])
    add(taiko(60, 0.4), C8 + k * 0.5)
add(roll(1.4, 0.32), OUT - 1.4)
add(riser(1.6, 0.28), OUT - 1.6); add(cymbal_swell(1.6, 0.35), OUT - 1.6)

# Fin
add(boom(1.0), OUT); add(crash(0.55), OUT)
add(brass([NOTES["D2"], NOTES["A2"], D3, F3 * 2 ** (1 / 12), A3], 2.6, 0.36, attack=0.02, bright=2400), OUT)
add(choir([D3, F3 * 2 ** (1 / 12), A3], 2.8, 0.16), OUT)
for k, tt in enumerate((OUT, OUT + 0.25, OUT + 0.5)):
    add(taiko(50, 0.8), tt, (-0.3, 0.3)[k % 2])
add(horn(2.2, 0.2), OUT + 0.9, 0.3)

mix.write(sys.argv[1], fade_out=1.5)
print("bande-son :", sys.argv[1])
