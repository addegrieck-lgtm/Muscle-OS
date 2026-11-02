// Applique Aiguille (LUM-APP-003) — modèle 3D d'après la fiche à cotes du fournisseur :
// corps vertical H 21 cm, câble de 30 cm (réglable), rosace murale Ø5,6 cm, LED 5 W.
// Proportions du disque lumineux et de la tige relevées sur la photo du fournisseur (non cotées) :
// tige ≈ 2,2 × 1,6 cm, disque ≈ Ø6,5 × 1,3 cm fixé en façade près du haut, face éclairante
// dessous. Le disque est montré incliné comme sur la photo d'ambiance (pivot dans le plan du mur).

export function buildAiguille({ THREE, scene, METAL, LIGHT, GLOW, tilt = -0.32, wallZ = 0 }) {
  const g = new THREE.Group(); scene.add(g);
  const metal = new THREE.MeshStandardMaterial({ ...METAL });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.55, metalness: 0.1 });
  const H = 0.21, BW = 0.022, BD = 0.016;
  const top = 0.15; // haut du corps (repère : centre de l'image vers y = 0)

  // Corps : tige plate contre le mur, embout cylindrique en bas.
  const body = new THREE.Mesh(new THREE.BoxGeometry(BW, H, BD), metal);
  body.position.set(0, top - H / 2, wallZ + BD / 2); body.castShadow = true; g.add(body);
  const tipH = 0.03;
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, tipH, 24), metal);
  tip.position.set(0, top - H - tipH / 2, wallZ + BD / 2); tip.castShadow = true; g.add(tip);

  // Câble souple : légère courbe jusqu'à la rosace (30 cm).
  const c0 = new THREE.Vector3(0, top - H - tipH, wallZ + BD / 2);
  const c1 = new THREE.Vector3(0, c0.y - 0.3, wallZ + 0.012);
  const curve = new THREE.CatmullRomCurve3([c0, new THREE.Vector3(0.002, c0.y - 0.15, wallZ + 0.012), c1]);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.0028, 12, false), cableMat);
  cable.castShadow = true; g.add(cable);
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.012, 48), metal);
  rose.rotation.x = Math.PI / 2; rose.position.set(0, c1.y - 0.018, wallZ + 0.006); rose.castShadow = true; g.add(rose);

  // Tête : disque Ø6,5 cm sur pivot, en façade de la tige, incliné dans le plan du mur.
  const head = new THREE.Group();
  head.position.set(0, top - 0.035, wallZ + BD + 0.012);
  head.rotation.z = tilt; g.add(head);
  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.012, 16), metal);
  pivot.rotation.x = Math.PI / 2; pivot.position.z = -0.006; head.add(pivot);
  const R = 0.0325, T = 0.013;
  // Le disque est vu par la tranche : on le couche (axe horizontal, face éclairante dessous).
  const discGroup = new THREE.Group(); discGroup.position.z = 0.03; head.add(discGroup);
  const d = new THREE.Mesh(new THREE.CylinderGeometry(R, R, T, 64), metal); d.castShadow = true; discGroup.add(d);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(R * 0.86, 64), new THREE.MeshBasicMaterial({ color: GLOW }));
  lens.rotation.x = Math.PI / 2; lens.position.y = -T / 2 - 0.0004; discGroup.add(lens);
  const ring = new THREE.Mesh(new THREE.RingGeometry(R * 0.86, R * 0.93, 64), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, side: THREE.DoubleSide }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -T / 2 - 0.0003; discGroup.add(ring);
  // Bras qui relie le disque au pivot.
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.008, 0.03), metal);
  arm.position.set(0, 0, 0.015); head.add(arm);

  // Faisceau : sous le disque, perpendiculaire à sa face, ombres portées sur le mur.
  const spot = new THREE.SpotLight(LIGHT, 0.5, 0, THREE.MathUtils.degToRad(38), 1, 2);
  g.updateMatrixWorld(true);
  const wp = new THREE.Vector3(0, -T / 2 - 0.002, 0); discGroup.localToWorld(wp);
  const wt = new THREE.Vector3(0, -1, -0.13); discGroup.localToWorld(wt);
  spot.position.copy(wp); spot.target.position.copy(wt);
  spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.camera.near = 0.005;
  spot.shadow.bias = -0.0003; spot.shadow.radius = 5;
  scene.add(spot, spot.target);
  const halo = new THREE.PointLight(LIGHT, 0.04, 0.25, 1.5); halo.position.copy(wp); scene.add(halo);
  return { top, bottom: c1.y - 0.05 };
}
