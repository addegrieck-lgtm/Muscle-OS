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
  const span = 0.25 + 0.06 * Math.pow(n, 0.85);
  const perTurn = Math.min(10, 4 + n / 5);
  const cones = [], caps = [], wires = [];
  let minY = 0;
  const tips = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const ang = (i / perTurn) * Math.PI * 2 + rand() * 0.3;
    const shell = n > 16 ? 0.35 + 0.65 * Math.sqrt(((i * 7) % 5) / 4) : 0.85;
    const r = (canopy / 2 - 0.03) * shell * (0.9 + rand() * 0.15);
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    const top = topY - t * span - rand() * 0.04; // haut du cône
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
