// Lustre Organza (LUM-LUS-004) — modèle 3D d'après les fiches à cotes du fournisseur.
// Chaque « plaque » : feuille d'acrylique 18 × 28 cm (W18*H28cm) ondulée comme un tissu, striée de
// fines ondes, éclairée par la tranche depuis une réglette LED métallique (5 W) posée sur son bord
// supérieur, suspendue par deux câbles fins. Bord inférieur découpé, irrégulier.
// Pavillons : rond Ø40 (6), Ø50 (8), Ø60 (12), Ø70 (18), Ø80 cm (28) ; rectangulaire 20 × 5 (1),
// 55 × 12 (2), 70 × 10 (3), 76 × 24 cm (6).
// Disposition : les schémas du fournisseur montrent des cascades en spirale (pavillon rond) et des
// plaques alignées et décalées en hauteur (pavillon rectangulaire). Les positions exactes ne sont
// pas cotées : disposition reconstituée d'après les schémas, à confirmer.

const SLICE_W = 0.18, SLICE_H = 0.28;

// Contour, stries et lumière d'une plaque (texture partagée par plusieurs plaques).
function sliceTexture(THREE, rand) {
  const W = 360, H = 560;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  // Bord inférieur découpé : profil irrégulier avec une pointe (pan de tissu qui retombe).
  const tip = rand() < 0.5 ? 0.12 + rand() * 0.2 : 0.68 + rand() * 0.2;
  const pts = [], ph0 = rand() * 6;
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    let y = 0.84 + 0.05 * Math.sin(u * 5.5 + ph0);
    y += 0.13 * Math.exp(-((u - tip) ** 2) / 0.012);
    y -= 0.08 * Math.exp(-((u - (1 - tip)) ** 2) / 0.035);
    pts.push([u * W, Math.min(0.995, y) * H]);
  }
  const outline = () => {
    x.beginPath(); x.moveTo(0, 0); x.lineTo(W, 0);
    for (let i = pts.length - 1; i >= 0; i--) x.lineTo(pts[i][0], pts[i][1]);
    x.closePath();
  };
  x.save(); outline(); x.clip();
  // Corps : acrylique clair, plus lumineux près de la réglette (éclairage par la tranche).
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(255,255,255,0.42)"); g.addColorStop(0.12, "rgba(255,255,255,0.14)");
  g.addColorStop(0.6, "rgba(255,255,255,0.04)"); g.addColorStop(1, "rgba(255,255,255,0.09)");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // Stries ondulées gravées : elles accrochent la lumière.
  const f = 0.02 + rand() * 0.015, ph = rand() * 6;
  for (let y0 = -40; y0 < H + 40; y0 += 5) {
    x.beginPath();
    for (let px = 0; px <= W; px += 6) {
      const py = y0 + Math.sin(px * f + ph + y0 * 0.012) * 9 + px * 0.06;
      px === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
    }
    const k = 0.07 + 0.16 * Math.max(0, 1 - y0 / H) + (rand() < 0.1 ? 0.12 : 0);
    x.strokeStyle = `rgba(255,255,255,${k})`; x.lineWidth = 0.9; x.stroke();
  }
  // Reflets laiteux en traînées (épaisseur variable de la feuille).
  for (let i = 0; i < 5; i++) {
    const cx = rand() * W, cy = H * (0.2 + rand() * 0.6), r = 60 + rand() * 90;
    const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, "rgba(255,255,255,0.08)"); rg.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = rg; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  x.restore();
  // Tranches lumineuses : la lumière ressort par les bords découpés.
  x.lineJoin = "round";
  x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
  x.strokeStyle = "rgba(255,255,255,0.22)"; x.lineWidth = 12; x.stroke();
  x.strokeStyle = "rgba(255,255,255,0.95)"; x.lineWidth = 3.5; x.stroke();
  x.beginPath(); x.moveTo(2, 0); x.lineTo(pts[0][0] + 2, pts[0][1]);
  x.moveTo(W - 2, 0); x.lineTo(pts[pts.length - 1][0] - 2, pts[pts.length - 1][1]);
  x.strokeStyle = "rgba(255,255,255,0.55)"; x.lineWidth = 3; x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// Feuille ondulée : bord supérieur droit (sous la réglette), ondulation et torsion croissantes vers
// le bas, comme un voile de tissu.
function sliceGeometry(THREE, rand) {
  const g = new THREE.PlaneGeometry(SLICE_W, SLICE_H, 30, 44);
  const p = g.attributes.position;
  const A = 0.045 + rand() * 0.035, k = 1.3 + rand() * 0.9, ph = rand() * Math.PI * 2;
  const twist = (rand() - 0.5) * 1.4, flare = (rand() - 0.5) * 0.1, curl = (rand() - 0.5) * 0.12;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) / (SLICE_W / 2); // -1 → 1
    const v = 0.5 - p.getY(i) / SLICE_H; // 0 (haut) → 1 (bas)
    const s = v * v * (3 - 2 * v);
    let X = p.getX(i) + flare * v * v * v;
    let Z = A * s * Math.sin(Math.PI * u * k * 0.5 + ph) + curl * v * v * u;
    const a = twist * s, ca = Math.cos(a), sa = Math.sin(a);
    p.setXYZ(i, X * ca - Z * sa, -v * SLICE_H, X * sa + Z * ca);
  }
  g.computeVertexNormals();
  return g;
}

export function buildOrganza({ THREE, scene, rand, code, METAL, LIGHT, GLOW, topY = -0.9 }) {
  const group = new THREE.Group(); scene.add(group);
  const n = Number(code.slice(1));
  const round = code[0] === "r";
  const metal = new THREE.MeshStandardMaterial({ ...METAL });
  // Pavillon brossé, plus mat que les réglettes (vu d'en dessous, il ne doit pas saturer).
  const canopyMat = new THREE.MeshStandardMaterial({ ...METAL, roughness: METAL.metalness === 1 ? 0.42 : 0.5, envMapIntensity: 0.6 });
  const cable = new THREE.MeshStandardMaterial({ color: 0xbfbfbf, metalness: 0.8, roughness: 0.35 });
  const ledMat = new THREE.MeshBasicMaterial({ color: GLOW });
  const textures = Array.from({ length: 7 }, () => sliceTexture(THREE, rand));
  // Voile lumineux (addition) + feuille brillante très légère pour les reflets.
  // Teinte du voile ramenée à une luminance égale : le blanc froid ne sature pas plus que le chaud.
  const tint = new THREE.Color(LIGHT);
  tint.multiplyScalar(0.72 / (0.2126 * tint.r + 0.7152 * tint.g + 0.0722 * tint.b));
  const glowMats = textures.map((map) => new THREE.MeshBasicMaterial({
    map, color: tint, transparent: true, side: THREE.DoubleSide, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: 0.8,
  }));
  const sheenMats = textures.map((map) => new THREE.MeshStandardMaterial({
    color: 0xffffff, alphaMap: map, transparent: true, opacity: 0.16, side: THREE.DoubleSide,
    depthWrite: false, roughness: 0.08, metalness: 0, envMapIntensity: 1.2,
  }));

  // ── Pavillon ──
  const canopy = round
    ? { 6: 0.4, 8: 0.5, 12: 0.6, 18: 0.7, 28: 0.8 }[n]
    : { 1: [0.2, 0.05], 2: [0.55, 0.12], 3: [0.7, 0.1], 6: [0.76, 0.24] }[n];
  const cm = round
    ? new THREE.Mesh(new THREE.CylinderGeometry(canopy / 2, canopy / 2, 0.035, 64), canopyMat)
    : new THREE.Mesh(new THREE.BoxGeometry(canopy[0], n === 2 ? 0.035 : 0.03, canopy[1]), canopyMat);
  cm.position.y = -0.0175; group.add(cm);

  // ── Disposition des plaques : [x, y (haut de la plaque), z, rotation] ──
  const slots = [];
  if (round) {
    const R = canopy / 2;
    const span = { 6: 0.45, 8: 0.58, 12: 0.78, 18: 0.92, 28: 1.08 }[n];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      const ang = i * 2.399963 + rand() * 0.3; // angle d'or : spirale régulière
      const r = R * (0.95 - 0.55 * t) * (0.8 + rand() * 0.3);
      const y = topY - t * span - rand() * 0.06;
      slots.push([Math.cos(ang) * r, y, Math.sin(ang) * r, -ang + Math.PI / 2 + (rand() - 0.5) * 0.7]);
    }
  } else {
    const L = canopy[0], D = canopy[1];
    const layouts = {
      1: [[0, 0, 0]],
      2: [[-0.12, 0, 0], [0.13, -0.32, 0]],
      3: [[-0.22, -0.02, 0], [0, 0, 0], [0.22, -0.03, 0]],
      6: [[-0.27, -0.04, 0.06], [-0.13, -0.3, -0.06], [0.0, 0.0, 0.07], [0.1, -0.24, -0.05], [0.24, -0.08, 0.06], [0.3, -0.33, -0.07]],
    }[n];
    for (const [x, dy, z] of layouts) slots.push([x * (L / Math.max(L, 0.55)), topY + dy, z * (D / 0.24), (rand() - 0.5) * 0.6]);
  }

  let minY = 0;
  slots.forEach(([x, y, z, rot], i) => {
    const s = new THREE.Group();
    s.position.set(x, y, z); s.rotation.y = rot; group.add(s);
    const geo = sliceGeometry(THREE, rand);
    const ti = i % textures.length;
    s.add(new THREE.Mesh(geo, sheenMats[ti]));
    s.add(new THREE.Mesh(geo, glowMats[ti]));
    // Réglette LED métallique sur le bord supérieur, lumière vers le bas.
    const bar = new THREE.Mesh(new THREE.BoxGeometry(SLICE_W + 0.006, 0.014, 0.018), metal);
    bar.position.y = 0.007; s.add(bar);
    const led = new THREE.Mesh(new THREE.BoxGeometry(SLICE_W - 0.004, 0.002, 0.004), ledMat);
    led.position.y = -0.0005; s.add(led);
    // Deux câbles jusqu'au pavillon.
    for (const sx of [-0.07, 0.07]) {
      const top = new THREE.Vector3(sx, 0.014, 0).applyEuler(s.rotation).add(s.position);
      const len = -0.035 - top.y;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, len, 6), cable);
      c.position.set(top.x, top.y + len / 2, top.z); group.add(c);
    }
    minY = Math.min(minY, y - SLICE_H - 0.05);
  });

  // Lumière diffusée dans la pièce (5 W par plaque).
  const glow = new THREE.PointLight(LIGHT, 0.5 + n * 0.09, 0, 2);
  // Placée derrière la cascade : elle éclaire mur et plafond sans brûler les plaques proches.
  glow.position.set(0, (topY + minY) / 2, -0.55); group.add(glow);
  const width = round ? canopy : canopy[0];
  return { minY, width, group };
}
