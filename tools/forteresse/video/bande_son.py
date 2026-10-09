"""Bande-son « bataille » de la vidéo Forteresse War (30 s), synthétisée : tambours de guerre, cor, cuivres,
cordes graves, chocs d'épées, clameur et cymbales, calés sur les étapes de la vidéo.

  python3 bande_son.py <sortie.wav>
Puis : ffmpeg -i video.mp4 -i sortie.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest finale.mp4
"""
import sys

from instruments import *  # noqa: F401,F403 — instruments synthétisés partagés avec la bande-annonce
from instruments import NOTES, Mix, rng

DUR = 30.0
mix = Mix(DUR)
add, battle_bar = mix.add, mix.battle_bar

# Étapes de la vidéo (s)
T_IMPACT, T_FORET, T_PORTES, T_FERME, T_TOUR, T_SOMMET, T_VICTOIRE, T_FIN = 3.4, 3.4, 8.6, 13.0, 17.0, 22.4, 25.6, 27.0


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

mix.write(sys.argv[1])
print("bande-son :", sys.argv[1])
