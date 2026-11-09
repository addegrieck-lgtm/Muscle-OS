"""Statue de dragon rubis, perché ailes levées : modélisé en volumes (tubes le long de courbes, membranes)."""

from __future__ import annotations

import math

from generate import h2

# Repère local : u vers l'avant (le regard), v vers la droite, y vers le haut. Unités = blocs avant l'échelle.
# (u, v, y, rayon)
SPINE = [
    (-1.5, 11, -12, 0.45), (-4, 11, -9, 0.6), (-6.5, 10, -5.5, 0.9), (-8, 8, -1.5, 1.2), (-8.5, 5, 1.5, 1.6),
    (-6.5, 2, 3.5, 2.2), (-3, 0, 5, 3.0), (0.5, 0, 6.3, 3.5), (4, 0, 7.8, 3.2), (6.3, 0, 10.5, 2.5),
    (7.6, 0, 14, 2.1), (8.6, 0, 17.3, 1.9), (10.5, 0, 19.3, 2.2), (13.5, 0, 19.2, 1.7), (16.2, 0, 18.4, 1.15),
    (17.6, 0, 18.0, 0.8),
]
JAW = [(10.8, 0, 18.0, 1.5), (13.5, 0, 17.0, 1.2), (16.3, 0, 16.3, 0.75)]
HORN = [(11.2, 1.3, 21.0, 0.75), (9.6, 2.3, 23.0, 0.55), (7.4, 2.9, 24.2, 0.4), (5.6, 2.8, 24.4, 0.3)]
FRONT_LEG = [(4.3, 2.6, 6.8, 1.6), (6.4, 3.4, 3.4, 1.3), (7.2, 3.6, 1.0, 1.2), (8.6, 3.6, 0.4, 0.8)]
HIND_LEG = [(-3.2, 2.8, 4.6, 2.3), (0.3, 4.4, 3.4, 1.8), (-2.2, 4.6, 1.2, 1.25), (-0.2, 4.6, 0.4, 1.0)]
# Aile droite (la gauche est symétrique) : épaule, coude, poignet, bouts des doigts, attache sur le flanc
SHOULDER, ELBOW, WRIST = (2.0, 2.6, 10.0), (-0.5, 10.0, 18.5), (-3.5, 17.0, 25.5)
TIPS = [(-5.0, 26.0, 22.0), (-9.0, 25.5, 14.0), (-11.0, 20.0, 7.0), (-8.5, 12.0, 5.5)]
FLANK = (-4.0, 2.6, 6.5)


def catmull(pts, steps: int = 10):
    """Courbe lisse qui passe par les points (x, y, z, r)."""
    out = []
    p = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for s in range(steps):
            t = s / steps
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
                                     + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3) for k in range(4)))
    out.append(pts[-1])
    return out


class Dragon:
    def __init__(self, w, cx: float, y0: int, cz: float, facing: tuple[float, float], scale: float = 1.4):
        self.w, self.cx, self.y0, self.cz, self.S = w, cx, y0, cz, scale
        n = math.hypot(*facing)
        self.f = (facing[0] / n, facing[1] / n)
        self.r = (-self.f[1], self.f[0])

    def to_world(self, u: float, v: float, y: float) -> tuple[float, float, float]:
        S = self.S
        return (self.cx + (u * self.f[0] + v * self.r[0]) * S, self.y0 + y * S, self.cz + (u * self.f[1] + v * self.r[1]) * S)

    def tube(self, pts, kind: str, mirror: bool = False) -> None:
        w = self.w
        for (u, v, y, r) in catmull(pts, 14):
            for sv in ((1, -1) if mirror else (1,)):
                X, Y, Z = self.to_world(u, v * sv, y)
                R = r * self.S
                ri = int(R) + 1
                for dx in range(-ri, ri + 1):
                    for dy in range(-ri, ri + 1):
                        for dz in range(-ri, ri + 1):
                            px, py, pz = round(X) + dx, round(Y) + dy, round(Z) + dz
                            if (px - X) ** 2 + (py - Y) ** 2 + (pz - Z) ** 2 > R * R:
                                continue
                            w.set(px, py, pz, self.skin(kind, px, py, pz, py - Y, R))

    def skin(self, kind: str, x: int, y: int, z: int, dy: float, R: float) -> str:
        v = h2(x, z, y + 400)
        if kind == "horn":
            return "polished_blackstone" if v < 0.7 else "blackstone"
        if kind == "claw":
            return "blackstone"
        if kind == "bone":
            return "red_nether_bricks"
        if dy < -0.4 * R and R > 1.2:  # ventre écaillé
            return "orange_terracotta" if v < 0.7 else "yellow_terracotta"
        return "red_concrete" if v < 0.72 else "red_terracotta" if v < 0.92 else "red_nether_bricks"

    def membrane(self, a, b, c) -> None:
        w = self.w
        A, B, C = (self.to_world(*p) for p in (a, b, c))
        L = max(math.dist(A, B), math.dist(B, C), math.dist(A, C))
        n = int(L / 0.35) + 2
        for i in range(n + 1):
            for j in range(n + 1 - i):
                k = n - i - j
                X = (A[0] * i + B[0] * j + C[0] * k) / n
                Y = (A[1] * i + B[1] * j + C[1] * k) / n
                Z = (A[2] * i + B[2] * j + C[2] * k) / n
                p = (round(X), round(Y), round(Z))
                if not w.get(*p):
                    w.set(*p, "purple_concrete" if h2(p[0], p[2], p[1] + 410) < 0.85 else "magenta_terracotta")

    def wing(self, sv: int) -> None:
        m = lambda p: (p[0], p[1] * sv, p[2])  # noqa: E731
        S, E, W_, F = m(SHOULDER), m(ELBOW), m(WRIST), m(FLANK)
        tips = [m(t) for t in TIPS]
        # membrane (bord festonné : chaque panneau s'arrête un peu avant la ligne entre deux doigts)
        chain = [W_] + tips
        for t1, t2 in zip(tips, tips[1:]):
            mid = tuple((t1[k] + t2[k]) / 2 * 0.86 + W_[k] * 0.14 for k in range(3))
            self.membrane(W_, t1, mid)
            self.membrane(W_, mid, t2)
        self.membrane(W_, tips[-1], E)
        self.membrane(E, tips[-1], F)
        self.membrane(E, F, S)
        # os de l'aile et doigts
        self.tube([(*S, 1.1), (*E, 0.9), (*W_, 0.7)], "bone")
        for t in tips:
            self.tube([(*W_, 0.55), (*t, 0.3)], "bone")
        self.tube([(*W_, 0.6), (W_[0] + 1.2, W_[1] + 0.6 * sv, W_[2] + 1.6, 0.35)], "claw")
        _ = chain

    def build(self) -> None:
        self.wing(1)
        self.wing(-1)
        self.tube(SPINE, "body")
        self.tube(JAW, "body")
        self.tube(FRONT_LEG, "body", mirror=True)
        self.tube(HIND_LEG, "body", mirror=True)
        self.tube(HORN, "horn", mirror=True)
        self.tube([(12.5, 1.0, 20.6, 0.5), (11.5, 1.6, 21.6, 0.35)], "horn", mirror=True)
        # griffes
        for leg in (FRONT_LEG, HIND_LEG):
            u, v, y, _ = leg[-1]
            for dv in (-0.6, 0, 0.6):
                self.tube([(u, v + dv, y, 0.4), (u + 1.3, v + dv * 1.4, y - 0.2, 0.3)], "claw", mirror=True)
        # crête dorsale
        pts = catmull(SPINE, 14)
        for i, (u, v, y, r) in enumerate(pts):
            if i % 6 or r < 0.7 or u > 12:
                continue
            for h in range(1, 3 if r > 1.5 else 2):
                X, Y, Z = self.to_world(u, v, y + r + h * 0.7)
                self.w.set(round(X), round(Y), round(Z), "blackstone")
        # yeux et naseaux
        for sv in (1, -1):
            for (u, v, y, s) in ((13.6, 1.75 * sv, 20.2, "yellow_concrete"), (17.6, 0.6 * sv, 18.6, "black_concrete")):
                X, Y, Z = self.to_world(u, v, y)
                self.w.set(round(X), round(Y), round(Z), s)
        # gueule entrouverte : intérieur sombre, crocs
        for u in (12.0, 13.5, 15.0):
            X, Y, Z = self.to_world(u, 0, 17.6)
            self.w.set(round(X), round(Y), round(Z), "black_concrete")
        for sv in (1, -1):
            for u in (13.0, 15.0):
                X, Y, Z = self.to_world(u, 0.9 * sv, 17.2)
                self.w.set(round(X), round(Y), round(Z), "white_concrete")
