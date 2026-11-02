// Lustre Rosée (LUM-LUS-008) — modèle 3D d'après les schémas cotés du fournisseur :
// gouttes de 30 cm (cône d'aluminium en haut, larme de cristal à bulles en bas, LED 3 W par
// goutte), pavillon rond (Ø10 à Ø100 cm) ou rectangulaire (L 60 ou 100 × l 12 cm), fils
// réglables. Dispositions des schémas : « libre » (couronnes, hauteurs variées), « spirale »
// (hauteur décroissante du bord vers le centre), « anneaux » (49 : quatre couronnes, le centre
// le plus bas), « ligne » (même hauteur). Positions estimées sur les schémas (non cotées) ; la
// hauteur totale est réduite pour le cadrage, comme pour Ondée (fils réglables).
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function buildRosee({ THREE, scene, rand, layout, n, canopy, rect, METAL, LIGHT, GLOW, topY = -0.35 }) {
  const group = new THREE.Group(); scene.add(group);
  const metal = new THREE.MeshStandardMaterial(METAL);
  const wire = new THREE.MeshStandardMaterial({ color: 0xcfcfcf, metalness: 0.8, roughness: 0.35 });
  const crystal = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.16,
    clearcoat: 1, envMapIntensity: 3, emissive: GLOW, emissiveIntensity: 0.03, depthWrite: false,
  });
  const glowMat = new THREE.MeshBasicMaterial({ color: GLOW, transparent: true, opacity: 0.35 });
  const bubbleMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(LIGHT).multiplyScalar(1.3) });

  // ── Pavillon (plus mat que les cônes : sinon saturé en blanc vu d'en dessous) ──
  const canopyMat = new THREE.MeshStandardMaterial({ ...METAL, roughness: Math.max(0.5, METAL.roughness), envMapIntensity: 0.5 });
  const cm = rect
    ? new THREE.Mesh(new THREE.BoxGeometry(rect[0], 0.03, rect[1]), canopyMat)
    : new THREE.Mesh(new THREE.CylinderGeometry(canopy / 2, canopy / 2, 0.03, 64), canopyMat);
  cm.position.y = -0.015; group.add(cm);

  // ── Une goutte : cône 8 cm + larme 22 cm (profil de révolution) ──
  const CONE = 0.08, DROP = 0.22;
  const coneGeo = new THREE.CylinderGeometry(0.0022, 0.0105, CONE, 32);
  const prof = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, y = -t * DROP;
    // Col étroit puis renflement arrondi en bas (Ø4,6 cm au plus large).
    const bulb = Math.sin(Math.min(1, Math.max(0, (t - 0.45) / 0.55)) * Math.PI * 0.62);
    let r = 0.0102 + 0.004 * t + 0.0095 * bulb;
    if (t > 0.86) r *= Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.86) / 0.14, 2)));
    prof.push(new THREE.Vector2(Math.max(r, 0.0003), y));
  }
  const dropGeo = new THREE.LatheGeometry(prof, 40);
  const coreGeo = new THREE.CylinderGeometry(0.0016, 0.0028, DROP * 0.75, 10);
  const bubbleGeo = new THREE.SphereGeometry(0.0011, 6, 4);

  // ── Positions (x, z) et hauteur relative (0 = le plus haut, 1 = le plus bas) ──
  const pts = [];
  const ring = (k, r, a0 = 0) => { for (let i = 0; i < k; i++) { const a = a0 + (i / k) * Math.PI * 2; pts.push([Math.cos(a) * r, Math.sin(a) * r]); } };
  let depth = 0, level = () => 0;
  if (layout === "single") { pts.push([0, 0]); }
  else if (layout === "line") { for (let i = 0; i < n; i++) pts.push([-rect[0] / 2 + (rect[0] * (i + 0.5)) / n, 0]); }
  else if (layout === "round" && n === 2) { pts.push([-0.045, 0], [0.045, 0]); depth = 0.16; level = (i) => i; }
  else if (layout === "round") { ring(n, canopy / 2 - 0.03); depth = 0.5; level = () => rand(); }
  else if (layout === "free") {
    if (n === 18) { ring(12, 0.21); ring(6, 0.1, 0.3); }
    else { ring(14, 0.26); ring(8, 0.17, 0.2); ring(6, 0.08, 0.5); }
    depth = n === 18 ? 0.9 : 1.05; level = () => rand();
  } else if (layout === "spiral") {
    const turns = n <= 18 ? 2.2 : 3, rOut = canopy / 2 - 0.04, rIn = 0.05;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), a = t * turns * Math.PI * 2, r = rOut - (rOut - rIn) * t;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    depth = n <= 18 ? 0.75 : n <= 28 ? 1.0 : 1.2; level = (i) => i / (n - 1);
  } else if (layout === "rings") {
    pts.push([0, 0]); ring(8, 0.12, 0.2); ring(16, 0.25); ring(24, 0.42, 0.13);
    depth = 1.3;
    level = (i) => (i === 0 ? 1 : i <= 8 ? 0.72 : i <= 24 ? 0.42 : 0.1) + (rand() - 0.5) * 0.12;
  }

  const metals = [], drops = [], cores = [], bubbles = [], wires = [], tips = [];
  let minY = -0.05;
  const single = layout === "single";
  pts.forEach(([x, z], i) => {
    const top = (single ? topY - 0.25 : topY) - Math.min(1, Math.max(0, level(i))) * depth;
    metals.push(coneGeo.clone().translate(x, top - CONE / 2, z));
    const dTop = top - CONE + 0.002;
    drops.push(dropGeo.clone().translate(x, dTop, z));
    cores.push(coreGeo.clone().translate(x, dTop - DROP * 0.45, z));
    for (let b = 0; b < 34; b++) {
      const t = 0.08 + rand() * 0.8, a = rand() * Math.PI * 2, rr = rand() * 0.009 * (0.5 + t);
      bubbles.push(bubbleGeo.clone().scale(1 + rand(), 1 + rand(), 1 + rand()).translate(x + Math.cos(a) * rr, dTop - t * DROP, z + Math.sin(a) * rr));
    }
    const len = -0.03 - top;
    wires.push(new THREE.CylinderGeometry(0.0007, 0.0007, len, 5).translate(x, top + len / 2, z));
    tips.push(new THREE.Vector3(x, dTop - DROP * 0.6, z));
    minY = Math.min(minY, dTop - DROP - 0.03);
  });
  group.add(new THREE.Mesh(mergeGeometries(metals), metal));
  group.add(new THREE.Mesh(mergeGeometries(cores), glowMat));
  group.add(new THREE.Mesh(mergeGeometries(bubbles), bubbleMat));
  const dm = new THREE.Mesh(mergeGeometries(drops), crystal); dm.renderOrder = 2; group.add(dm);
  group.add(new THREE.Mesh(mergeGeometries(wires), wire));

  // Lumières réelles près de quelques gouttes : reflets sur les cônes et le pavillon.
  const nl = Math.min(6, tips.length);
  for (let i = 0; i < nl; i++) {
    const p = tips[Math.round((i / Math.max(1, nl - 1)) * (tips.length - 1))];
    const l = new THREE.PointLight(LIGHT, 0.05 * Math.max(1, tips.length / nl), 1.0, 2);
    l.position.copy(p); group.add(l);
  }
  const fill = new THREE.PointLight(LIGHT, 0.25 + tips.length * 0.015, 0, 2);
  fill.position.set(0, (topY + minY) / 2, -0.5); group.add(fill);
  return { minY, width: rect ? rect[0] : canopy };
}
