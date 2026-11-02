// Lustre Ginkgo (LUM-LUS-006) — modèle 3D d'après les fiches du fournisseur :
// L80 × W40 × H30, L100 × W45 × H40, L120 × W55 × H50, L150 × W55 × H50 cm ; feuilles de ginkgo en
// céramique blanche mate, branches en acier inoxydable doré brossé, ampoules LED E14 nichées dans le
// feuillage, suspension par câbles fins.
// Nombre de feuilles et d'ampoules non communiqués : densité relevée sur les photos du fournisseur
// (≈ 1 feuille tous les 1,1 cm de longueur, 1 ampoule tous les 15 cm), à confirmer.

// Feuille en éventail : pétiole, limbe en secteur ~120°, bord ondulé avec l'échancrure centrale.
function leafGeometry(THREE, rand, size) {
  const s = new THREE.Shape();
  const R = size, half = THREE.MathUtils.degToRad(58 + rand() * 10), notch = 0.28 + rand() * 0.12;
  const stem = 0.22 * R;
  s.moveTo(-0.004, 0); s.lineTo(0.004, 0);
  s.lineTo(0.006, stem);
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const u = i / N, a = -half + u * 2 * half; // de droite à gauche
    let r = R * (0.92 + 0.05 * Math.sin(u * 23 + rand()));
    r -= R * notch * Math.exp(-((u - 0.5) ** 2) / 0.0012); // échancrure
    r *= 1 - 0.18 * Math.abs(u - 0.5) ** 3;
    s.lineTo(Math.sin(-a) * r * 1.05, stem + Math.cos(a) * r * 0.82);
  }
  s.lineTo(-0.006, stem); s.lineTo(-0.004, 0);
  const g = new THREE.ShapeGeometry(s, 4);
  // Cambrure : la feuille se creuse et retombe légèrement vers son bord.
  const p = g.attributes.position, cup = 1.6 + rand() * 1.4, droop = (rand() - 0.3) * 1.2;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, cup * x * x + droop * y * y * 0.6);
  }
  g.computeVertexNormals();
  return g;
}

import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function buildGinkgo({ THREE, scene, rand, L, W, H, LIGHT, GLOW, topY = -0.75 }) {
  const group = new THREE.Group(); scene.add(group);
  const gold = new THREE.MeshStandardMaterial({ color: 0xc8a25e, metalness: 1, roughness: 0.38 });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: 0.8, roughness: 0.4 });
  const yc = topY - H / 2;
  // Teinte ramenée à luminance égale : le blanc froid ne sature pas plus que le chaud.
  const glowCol = new THREE.Color(LIGHT);
  glowCol.multiplyScalar(0.6 / (0.2126 * glowCol.r + 0.7152 * glowCol.g + 0.0722 * glowCol.b));

  // ── Branches : 4 tiges maîtresses sinueuses sur la longueur, puis des rameaux ──
  const twigs = [];
  const twigGeos = [];
  const mains = 4;
  for (let m = 0; m < mains; m++) {
    const pts = [];
    const seg = 7;
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, x = (t - 0.5) * L * (0.92 + rand() * 0.1);
      const env = Math.sin(Math.PI * Math.min(1, Math.max(0, t * 1.02))) ** 0.6; // plus fin aux bouts
      pts.push(new THREE.Vector3(x, yc + (rand() - 0.5) * H * 0.45 * env, (rand() - 0.5) * W * 0.7 * env));
    }
    const c = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(c, 120, 0.0032, 8, false), gold);
    group.add(tube);
    twigs.push(c);
    // Rameaux secondaires.
    for (let k = 0; k < Math.round(L * 16); k++) {
      const p0 = c.getPoint(0.05 + rand() * 0.9);
      const dir = new THREE.Vector3(rand() - 0.5, (rand() - 0.35) * 0.9, rand() - 0.5).normalize();
      const len = 0.07 + rand() * 0.17;
      const p2 = p0.clone().addScaledVector(dir, len);
      const p1 = p0.clone().lerp(p2, 0.5).add(new THREE.Vector3(0, (rand() - 0.5) * 0.03, 0));
      const tc = new THREE.QuadraticBezierCurve3(p0, p1, p2);
      twigGeos.push(new THREE.TubeGeometry(tc, 10, 0.0022, 6, false));
      twigs.push(tc);
    }
  }

  group.add(new THREE.Mesh(mergeGeometries(twigGeos), gold));

  // ── Ampoules E14 nichées dans le feuillage ──
  const nb = Math.max(4, Math.round(L / 0.15));
  const bulbs = [];
  const bulbMat = new THREE.MeshBasicMaterial({ color: GLOW });
  for (let i = 0; i < nb; i++) {
    const c = twigs[i % mains];
    const p = c.getPoint((i + 0.5) / nb * 0.9 + 0.05);
    p.y += 0.01;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.016, 20, 14), bulbMat);
    b.position.copy(p); group.add(b);
    bulbs.push(p);
  }
  // Quelques lumières réelles (éclairent feuilles et branches), réparties sur la longueur.
  const nl = Math.min(6, nb);
  for (let i = 0; i < nl; i++) {
    const p = bulbs[Math.round((i / Math.max(1, nl - 1)) * (nb - 1))];
    const l = new THREE.PointLight(glowCol, 0.035 * (nb / nl), 1.2, 2);
    l.position.copy(p); group.add(l);
  }

  // ── Feuilles : céramique blanche mate, plus claires près des ampoules (lumière diffusée) ──
  const leafCount = Math.round(L / 0.0075);
  const levels = 6;
  const mats = Array.from({ length: levels }, (_, k) => new THREE.MeshStandardMaterial({
    color: 0xe9e4dc, roughness: 0.7, metalness: 0, side: THREE.DoubleSide,
    emissive: glowCol.clone().multiplyScalar(0.4 * (k / (levels - 1)) ** 1.7),
  }));
  const geos = Array.from({ length: 12 }, () => leafGeometry(THREE, rand, 0.075 + rand() * 0.035));
  const up = new THREE.Vector3(0, 1, 0);
  // Feuilles regroupées par niveau de lumière : un seul maillage par matériau (rendu rapide).
  const buckets = Array.from({ length: levels }, () => []);
  for (let i = 0; i < leafCount; i++) {
    const c = twigs[mains + Math.floor(rand() * (twigs.length - mains))] || twigs[i % mains];
    const p = c.getPoint(0.35 + rand() * 0.65);
    const leaf = new THREE.Mesh(geos[i % geos.length], null);
    leaf.position.copy(p);
    // Orientation : pétiole sur le rameau, éventail vers l'extérieur, souvent vers le haut ou de côté.
    const out = new THREE.Vector3(rand() - 0.5, rand() * 1.2 - 0.35, rand() - 0.5).normalize();
    leaf.quaternion.setFromUnitVectors(up, out);
    leaf.rotateY(rand() * Math.PI * 2);
    let d = Infinity; for (const b of bulbs) d = Math.min(d, b.distanceTo(p));
    const k = Math.max(0, Math.min(levels - 1, Math.round((1 - d / 0.17) * (levels - 1))));
    leaf.updateMatrix();
    buckets[k].push(leaf.geometry.clone().applyMatrix4(leaf.matrix));
  }
  buckets.forEach((list, k) => {
    if (list.length) group.add(new THREE.Mesh(mergeGeometries(list), mats[k]));
  });

  // ── Suspension : câbles et petites rosaces au plafond ──
  for (const f of [-0.38, 0, 0.38]) {
    const x = f * L;
    const yTop = yc + H * 0.35;
    const len = -yTop;
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, len, 6), cableMat);
    cab.position.set(x, yTop + len / 2, 0); group.add(cab);
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 32), gold);
    rose.position.set(x, -0.01, 0); group.add(rose);
  }
  // Lumière d'ambiance renvoyée vers la pièce.
  const fill = new THREE.PointLight(LIGHT, 0.25 + L * 0.3, 0, 2);
  fill.position.set(0, yc, -0.5); group.add(fill);
  return { yc };
}
