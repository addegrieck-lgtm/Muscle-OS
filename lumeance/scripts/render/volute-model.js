// Applique Volute (LUM-APP-002) — modèle 3D d'après les fiches du fournisseur :
//   grand : hauteur 28 cm, largeur 10 cm ; petit : hauteur 23 cm, largeur 8 cm.
// Une feuille d'aluminium enroulée en spirale autour d'un axe vertical : la fenêtre angulaire
// couverte par la feuille tourne avec la hauteur (bord supérieur ouvert à droite, bord inférieur
// ouvert à gauche, bande pleine qui croise la face au milieu). Extérieur noir ou blanc, intérieur
// de même teinte ou doré. Fixation : platine rectangulaire contre le mur.
// Éclairage haut et bas (« up & down ») : deux projecteurs LED dans l'axe, ombres portées par la
// feuille sur le mur. Angles de la spirale estimés d'après les photos (aucun schéma coté fourni).

export function buildVolute({ THREE, scene, size = "grand", outer, inner, LIGHT, GLOW, wallZ = 0 }) {
  const H = size === "grand" ? 0.28 : 0.23;
  const R = (size === "grand" ? 0.1 : 0.08) / 2;
  const zc = wallZ + R + 0.014; // axe de la spirale, à 1,4 cm du mur (platine)
  const group = new THREE.Group();
  scene.add(group);

  // Fenêtre couverte : largeur W, centre qui tourne de C_BOTTOM (bas) à C_TOP (haut).
  // θ = 0 : face au spectateur, θ > 0 : vers la droite.
  const W = THREE.MathUtils.degToRad(190);
  const C_TOP = THREE.MathUtils.degToRad(-140);
  const C_BOTTOM = THREE.MathUtils.degToRad(140);
  const NU = 96, NV = 96;

  function band(radius) {
    const pos = [], nor = [], idx = [];
    for (let j = 0; j <= NV; j++) {
      const v = j / NV;
      // Bords supérieur et inférieur en biseau (feuille découpée en biais).
      const c = C_BOTTOM + (C_TOP - C_BOTTOM) * v;
      for (let i = 0; i <= NU; i++) {
        const u = i / NU;
        const t = c - W / 2 + u * W;
        const y = (v - 0.5) * H;
        pos.push(radius * Math.sin(t), y, zc + radius * Math.cos(t));
        nor.push(Math.sin(t), 0, Math.cos(t));
      }
    }
    for (let j = 0; j < NV; j++)
      for (let i = 0; i < NU; i++) {
        const a = j * (NU + 1) + i, b = a + 1, d = a + NU + 1, e = d + 1;
        idx.push(a, b, d, b, e, d);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    g.setIndex(idx);
    return g;
  }

  const outerMat = new THREE.MeshStandardMaterial({ ...outer, side: THREE.FrontSide });
  const innerMat = new THREE.MeshStandardMaterial({ ...inner, side: THREE.BackSide });
  const shell = new THREE.Mesh(band(R), outerMat);
  const lining = new THREE.Mesh(band(R - 0.0012), innerMat);
  // Tranche de la feuille (1,2 mm) : visible sur les bords en biseau.
  const edgeMat = new THREE.MeshStandardMaterial({ ...inner, side: THREE.DoubleSide });
  for (const m of [shell, lining]) { m.castShadow = true; m.receiveShadow = true; group.add(m); }
  // Bords : bandes étroites reliant extérieur et intérieur le long des deux bords de la fenêtre.
  for (const side of [0, 1]) {
    const pos = [], idx = [];
    for (let j = 0; j <= NV; j++) {
      const v = j / NV, c = C_BOTTOM + (C_TOP - C_BOTTOM) * v, t = c - W / 2 + side * W, y = (v - 0.5) * H;
      for (const r of [R, R - 0.0012]) pos.push(r * Math.sin(t), y, zc + r * Math.cos(t));
    }
    for (let j = 0; j < NV; j++) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    group.add(new THREE.Mesh(g, edgeMat));
  }

  // Platine murale (même teinte que l'extérieur), derrière la feuille.
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(R * 0.9, H * 0.42, 0.012),
    new THREE.MeshStandardMaterial({ ...outer }),
  );
  plate.position.set(-R * 0.35, 0, wallZ + 0.006);
  plate.castShadow = true; plate.receiveShadow = true;
  group.add(plate);

  // Module LED (petit cylindre dans l'axe) et lueur interne.
  const led = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.22, R * 0.22, H * 0.5, 24),
    new THREE.MeshStandardMaterial({ ...inner }),
  );
  led.position.set(0, 0, zc - R * 0.6);
  group.add(led);
  for (const s of [1, -1]) {
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(R * 0.2, 24),
      new THREE.MeshBasicMaterial({ color: GLOW }),
    );
    lens.rotation.x = -s * Math.PI / 2;
    lens.position.set(0, s * (H / 2 - 0.012) + s * 0.0005, zc - R * 0.6);
    group.add(lens);

    // Faisceau haut / bas : légèrement incliné vers le mur, ombres portées par la feuille.
    const spot = new THREE.SpotLight(LIGHT, 0.55, 0, THREE.MathUtils.degToRad(30), 1, 2);
    spot.position.set(0, s * (H / 2 - 0.012), zc - R * 0.6);
    spot.target.position.set(0, s * 2, wallZ - 0.35);
    spot.castShadow = true;
    spot.shadow.mapSize.set(2048, 2048);
    spot.shadow.camera.near = 0.005;
    spot.shadow.bias = -0.0002;
    spot.shadow.radius = 6;
    group.add(spot, spot.target);
  }
  // Lumière renvoyée à l'intérieur de la feuille (éclaire la doublure dorée).
  const glow = new THREE.PointLight(LIGHT, 0.05, R * 2.6, 1.2);
  glow.position.set(0, 0, zc + R * 0.1);
  group.add(glow);

  return { H, R, zc, group };
}
