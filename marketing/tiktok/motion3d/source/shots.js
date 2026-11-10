// Un plan = une schématique, une trajectoire d'orbite (angle en radians, 0 = est, π/2 = sud), un titre.
window.SHOTS = {
  spawn: { bin: "spawn.bin", kicker: "LE SPAWN", title: "L'ÎLE-CŒUR", c: [92, 72, 92],
    ang: [2.3, 1.2], r: [200, 98], h: [190, 104], look: [70, 82], hPow: 0.6,
    bg: 0x0b0a10, fog: [160, 520], hemi: [0xdfe6ff, 0x1a1420], sun: 2.2 },
  ile: { bin: "ile.bin", kicker: "LE COMMERCE", title: "L'ÎLE MARCHANDE", c: [90, 44, 46],
    ang: [0.5, 1.9], r: [150, 75], h: [120, 62], look: [44, 48], hPow: 0.8,
    bg: 0x0b0a10, fog: [140, 460], hemi: [0xdfe6ff, 0x1a1420], sun: 2.2 },
  fosse: { bin: "fosse.bin", kicker: "LA WARZONE", title: "LA FOSSE", c: [104, 14, 104],
    ang: [4.4, 5.6], r: [190, 80], h: [130, 45], look: [10, 16], hPow: 0.7,
    bg: 0x0d0808, fog: [150, 480], hemi: [0xffe0d0, 0x200c0c], sun: 2.0 },
  koth: { bin: "koth.bin", kicker: "◆ KOTH ◆", title: "GOUFFRE<br>DE VÆLOR", c: [100, 68, 100],
    ang: [1.25, 0.55], r: [240, 50], h: [244, 84], look: [40, 70], hPow: 0.35,
    bg: 0x140709, fog: [140, 420], hemi: [0xffd9c8, 0x2a0a08], sun: 2.2, lava: [100, 40, 100], beam: [100.5, 68, 100.5] },
  totem: { bin: "totem.bin", kicker: "L'ÉVÉNEMENT TOTEM", title: "LE SANCTUAIRE", c: [79, 3, 79],
    ang: [0.8, 2.4], r: [150, 72], h: [110, 36], look: [0, 6], hPow: 0.7,
    bg: 0x0b0a10, fog: [130, 420], hemi: [0xe8e0ff, 0x151020], sun: 2.2 },
};
