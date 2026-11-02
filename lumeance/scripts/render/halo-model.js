// Lustre Halo (LUM-LUS-005) — modèle 3D d'après les fiches à cotes du fournisseur :
// anneaux Ø17 cm en acrylique fumé (« pearl black ») et aluminium, éclairés par un croissant de LED
// sur la tranche extérieure, boule dorée d'attache, câbles dorés, pavillon rond noir (Ø30 à Ø80 cm).
// Largeur de la bande et épaisseur relevées sur la photo du fournisseur (≈ 2,3 × 1,5 cm).
// Disposition : spirale descendante, comme sur les schémas du fournisseur (positions non cotées).
// La longueur de la cascade est réduite pour le cadrage (câbles réglables).

const RO = 0.085, RI = 0.062, DEPTH = 0.015;

function ringGeometry(THREE) {
  const s = new THREE.Shape(); s.absarc(0, 0, RO, 0, Math.PI * 2, false);
  const h = new THREE.Path(); h.absarc(0, 0, RI, 0, Math.PI * 2, true); s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 3, curveSegments: 96 });
  g.translate(0, 0, -DEPTH / 2);
  return g;
}

export function buildHalo({ THREE, scene, rand, n, canopy, LIGHT, GLOW, topY = -0.45 }) {
  const group = new THREE.Group(); scene.add(group);
  const black = new THREE.MeshStandardMaterial({ color: 0x1a1918, metalness: 0.5, roughness: 0.42 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a05a, metalness: 1, roughness: 0.25 });
  const wire = new THREE.MeshStandardMaterial({ color: 0xb8954f, metalness: 1, roughness: 0.35 });
  // Acrylique fumé : translucide, brillant, reflets de la pièce.
  const smoke = new THREE.MeshStandardMaterial({
    color: 0x524d49, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.78, envMapIntensity: 1.4,
  });
  const led = new THREE.MeshBasicMaterial({ color: GLOW });
  const haloMat = new THREE.MeshBasicMaterial({ color: LIGHT, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
  const ringGeo = ringGeometry(THREE);

  // Pavillon rond noir.
  const cm = new THREE.Mesh(new THREE.CylinderGeometry(canopy / 2, canopy / 2, 0.04, 64), black);
  cm.position.y = -0.02; group.add(cm);

  const span = 0.3 + 0.065 * Math.pow(n, 0.88);
  const perTurn = Math.min(9, 4 + n / 6);
  let minY = 0;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const ang = (i / perTurn) * Math.PI * 2 + rand() * 0.25;
    // Grandes versions : plusieurs spirales imbriquées pour remplir le volume du pavillon.
    const shell = n > 12 ? 0.35 + 0.65 * Math.sqrt(((i * 7) % 5) / 4) : 0.85;
    const r = (canopy / 2 - 0.06) * shell * (0.9 + rand() * 0.15);
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    const yc = topY - t * span - rand() * 0.05; // centre de l'anneau
    const ring = new THREE.Group();
    ring.position.set(x, yc, z);
    // Anneaux tournés vers la pièce, avec des angles variés (comme sur les photos du fournisseur).
    ring.rotation.y = (rand() - 0.5) * 1.3;
    group.add(ring);
    ring.add(new THREE.Mesh(ringGeo, smoke));
    // Croissant de LED sur la tranche extérieure (environ la moitié du tour, côté droit).
    const a0 = -Math.PI * 0.55 + (rand() - 0.5) * 0.3, arc = Math.PI * 1.05;
    const strip = new THREE.Mesh(new THREE.TorusGeometry(RO + 0.0005, 0.0032, 8, 80, arc), led);
    strip.rotation.z = a0; ring.add(strip);
    const glow = new THREE.Mesh(new THREE.TorusGeometry(RO - 0.004, 0.009, 8, 80, arc), haloMat);
    glow.rotation.z = a0; ring.add(glow);
    // Boule dorée d'attache et câble jusqu'au pavillon.
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.013, 32, 16), gold);
    ball.position.y = RO + 0.008; ring.add(ball);
    const top = yc + RO + 0.02;
    const len = -0.04 - top;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, len, 6), wire);
    c.position.set(x, top + len / 2, z); group.add(c);
    minY = Math.min(minY, yc - RO - 0.03);
  }
  // Lumière diffusée dans la pièce, placée derrière la cascade.
  const fill = new THREE.PointLight(LIGHT, 0.4 + n * 0.05, 0, 2);
  fill.position.set(0, (topY + minY) / 2, -0.5); group.add(fill);
  return { minY, width: canopy };
}
