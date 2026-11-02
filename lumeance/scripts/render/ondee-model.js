// Lustre Ondée (LUM-LUS-007) — modèle 3D d'après les fiches à cotes du fournisseur :
// cônes d'aluminium doré (électrolyse) H 40 cm, Ø3,2 cm à la base, embout acrylique lumineux en
// bas ; pavillon rond doré H 3 cm, Ø30 à Ø100 cm ; fils de suspension fins, réglables.
// Disposition : spirale descendante comme sur les schémas du fournisseur (positions non cotées).
// La hauteur totale est réduite pour le cadrage (fils réglables).
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function buildOndee({ THREE, scene, rand, n, canopy, LIGHT, GLOW, topY = -0.4 }) {
  const group = new THREE.Group(); scene.add(group);
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4ad62, metalness: 1, roughness: 0.22 });
  const wire = new THREE.MeshStandardMaterial({ color: 0xcfcfcf, metalness: 0.8, roughness: 0.35 });
  const lensMat = new THREE.MeshBasicMaterial({ color: GLOW });

  const cm = new THREE.Mesh(new THREE.CylinderGeometry(canopy / 2, canopy / 2, 0.03, 64), gold);
  cm.position.y = -0.015; group.add(cm);

  const CONE_H = 0.4, R = 0.016;
  // Cône effilé : pointe fine en haut (attache), base Ø3,2 cm en bas.
  const coneGeo = new THREE.CylinderGeometry(R, 0.0025, CONE_H, 32, 1, true);
  const capGeo = new THREE.CylinderGeometry(R * 0.96, R * 0.96, 0.018, 32);
  // Spirale nette : une hélice (ou plusieurs hélices imbriquées pour les grandes versions) qui
  // descend régulièrement ; hauteur de cascade accrue pour bien séparer les cônes.
  const span = 0.5 + 0.16 * Math.pow(n, 0.6);
  const strands = Math.max(1, Math.ceil(n / 14));
  const perStrand = Math.ceil(n / strands);
  const turns = 1.25 + perStrand / 14;
  const cones = [], caps = [], wires = [];
  let minY = 0;
  const tips = [];
  for (let i = 0; i < n; i++) {
    const s = i % strands, k = Math.floor(i / strands);
    const t = perStrand === 1 ? 0 : k / (perStrand - 1);
    const ang = t * turns * Math.PI * 2 + (s * 2 * Math.PI) / strands + (rand() - 0.5) * 0.08;
    const r = (canopy / 2 - 0.035) * (strands === 1 ? 0.95 : 1 - 0.45 * (s / (strands - 1)));
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    const top = topY - t * span - (s / strands) * (span / perStrand) - rand() * 0.01; // haut du cône
    const yc = top - CONE_H / 2;
    cones.push(coneGeo.clone().translate(x, yc, z));
    caps.push(capGeo.clone().translate(x, top - CONE_H - 0.009, z));
    const len = -0.03 - top;
    wires.push(new THREE.CylinderGeometry(0.0007, 0.0007, len, 5).translate(x, top + len / 2, z));
    tips.push(new THREE.Vector3(x, top - CONE_H - 0.02, z));
    minY = Math.min(minY, top - CONE_H - 0.05);
  }
  group.add(new THREE.Mesh(mergeGeometries(cones), gold));
  group.add(new THREE.Mesh(mergeGeometries(caps), lensMat));
  group.add(new THREE.Mesh(mergeGeometries(wires), wire));
  // Quelques lumières réelles près des embouts : reflets sur les cônes voisins.
  const nl = Math.min(6, n);
  for (let i = 0; i < nl; i++) {
    const p = tips[Math.round((i / Math.max(1, nl - 1)) * (n - 1))];
    const l = new THREE.PointLight(LIGHT, 0.06 * (n / nl), 1.0, 2);
    l.position.copy(p); group.add(l);
  }
  const fill = new THREE.PointLight(LIGHT, 0.3 + n * 0.02, 0, 2);
  fill.position.set(0, (topY + minY) / 2, -0.5); group.add(fill);
  return { minY, width: canopy };
}
