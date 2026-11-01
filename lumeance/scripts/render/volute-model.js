// Applique Volute (LUM-APP-002) — modèle 3D d'après les fiches du fournisseur :
//   grand : hauteur 28 cm, largeur 10 cm ; petit : hauteur 23 cm, largeur 8 cm.
// Un ruban d'aluminium enroulé en hélice sur un tour autour d'un axe vertical, bouts verticaux
// (voir le détail plus bas, d'après la photo du fournisseur). Extérieur noir ou blanc, intérieur
// de même teinte ou doré. Fixation : platine rectangulaire contre le mur.
// Éclairage haut et bas (« up & down ») : deux projecteurs LED dans l'axe, ombres portées par la
// feuille sur le mur. Angles de la spirale estimés d'après les photos (aucun schéma coté fourni).

export function buildVolute({ THREE, scene, size = "grand", outer, inner, LIGHT, GLOW, wallZ = 0 }) {
  const H = size === "grand" ? 0.28 : 0.23;
  const R = (size === "grand" ? 0.1 : 0.08) / 2;
  const zc = wallZ + R + 0.014; // axe de la spirale, à 1,4 cm du mur (platine)
  const group = new THREE.Group();
  scene.add(group);

  // Ruban : bande de hauteur HS enroulée en hélice sur un tour, d'un bout vertical en haut à
  // l'arrière gauche (PHI_TOP) à un bout vertical en bas à l'arrière gauche (PHI_BOTTOM).
  // φ = 0 : face au spectateur, φ > 0 : vers la droite. Le ruban descend en tournant vers la
  // gauche : en haut il couvre l'arrière et la droite, en bas la gauche et l'avant-gauche ; il
  // croise la face au milieu, bord supérieur montant vers la droite (photo du fournisseur).
  const HS = H * 0.56;
  const PHI_TOP = THREE.MathUtils.degToRad(225);
  const PHI_BOTTOM = THREE.MathUtils.degToRad(-135);
  const NU = 160, NV = 24;
  // Point du ruban : u ∈ [0, 1] le long de l'hélice (0 = bas), w ∈ [0, 1] sur la hauteur du ruban.
  const at = (u, w, r) => {
    const t = PHI_BOTTOM + (PHI_TOP - PHI_BOTTOM) * u;
    const y = -H / 2 + (H - HS) * u + HS * w;
    return [r * Math.sin(t), y, zc + r * Math.cos(t), Math.sin(t), Math.cos(t)];
  };

  function band(radius) {
    const pos = [], nor = [], idx = [];
    for (let j = 0; j <= NV; j++)
      for (let i = 0; i <= NU; i++) {
        const [px, py, pz, nx, nz] = at(i / NU, j / NV, radius);
        pos.push(px, py, pz);
        nor.push(nx, 0, nz);
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
  for (const m of [shell, lining]) { m.castShadow = true; m.receiveShadow = true; group.add(m); }
  // Tranche de la feuille (1,2 mm) le long des quatre bords : deux hélices et deux bouts verticaux.
  const edgeMat = new THREE.MeshStandardMaterial({ ...inner, side: THREE.DoubleSide });
  const edges = [
    (k) => [k, 0], (k) => [k, 1], // bords hélicoïdaux bas et haut
    (k) => [0, k], (k) => [1, k], // bouts verticaux
  ];
  for (const edge of edges) {
    const pos = [], idx = [], N = 160;
    for (let j = 0; j <= N; j++) {
      const [u, w] = edge(j / N);
      for (const r of [R, R - 0.0012]) pos.push(...at(u, w, r).slice(0, 3));
    }
    for (let j = 0; j < N; j++) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    group.add(new THREE.Mesh(g, edgeMat));
  }

  // Platine murale (même teinte que l'extérieur), derrière la feuille : elle dépasse sur la gauche,
  // sous le milieu de la pièce.
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(R * 1.5, H * 0.55, 0.016),
    new THREE.MeshStandardMaterial({ ...outer }),
  );
  plate.position.set(-R * 0.5, -H * 0.1, wallZ + 0.008);
  plate.castShadow = true; plate.receiveShadow = true;
  group.add(plate);

  // Modules LED haut et bas (lentilles dans l'axe, contre la platine).
  for (const s of [1, -1]) {
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(R * 0.2, 24),
      new THREE.MeshBasicMaterial({ color: GLOW }),
    );
    lens.rotation.x = -s * Math.PI / 2;
    lens.position.set(0, s * (H / 2 - 0.012) + s * 0.0005, zc - R * 0.6);
    group.add(lens);

    // Faisceau haut / bas : légèrement incliné vers le mur, ombres portées par la feuille.
    const spot = new THREE.SpotLight(LIGHT, 0.5, 0, THREE.MathUtils.degToRad(50), 1, 2);
    spot.position.set(0, s * (H / 2 - 0.012), zc - R * 0.6);
    spot.target.position.set(0, s * 2, wallZ - 0.12);
    spot.castShadow = true;
    spot.shadow.mapSize.set(2048, 2048);
    spot.shadow.camera.near = 0.005;
    spot.shadow.bias = -0.0002;
    spot.shadow.radius = 6;
    group.add(spot, spot.target);
  }
  // Lumière renvoyée à l'intérieur de la feuille (éclaire la doublure dorée).
  const glow = new THREE.PointLight(LIGHT, 0.35, R * 4, 1.2);
  glow.position.set(0, 0, zc + R * 0.1);
  group.add(glow);

  return { H, R, zc, group };
}
