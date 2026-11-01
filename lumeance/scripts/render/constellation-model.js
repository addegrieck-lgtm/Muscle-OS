// Modèle 3D de Constellation (LUM-SUS-003), d'après la fiche à cotes du fournisseur :
// pavillon 50 × 8 × 3,5 cm, deux câbles (hauteur réglable jusqu'à 120 cm), barre plate en arc
// (flèche ≈ 7 cm sur 100 cm) ou droite, boule décorative dorée au centre, globes de verre clair
// Ø10 / Ø12 / Ø15 cm garnis de micro-LED sur fils cuivrés (« ciel étoilé »).
// 8 têtes (100 cm) : positions relevées sur le schéma du fournisseur.
// 6 têtes (75 cm) : AUCUN schéma fournisseur — disposition estimée (symétrique), à confirmer.
// Accents (boule centrale, manchons des câbles) toujours dorés, comme sur les photos.

// [position le long de la barre (0 → 1), diamètre (m), décalage vertical du centre / barre (m)]
const LAYOUT = {
  8: [
    [0.13, 0.12, -0.01], [0.2, 0.1, 0.06], [0.31, 0.15, -0.065], [0.4, 0.12, 0.015],
    [0.6, 0.12, 0.02], [0.69, 0.15, -0.07], [0.8, 0.1, 0.055], [0.89, 0.12, 0.0],
  ],
  6: [
    [0.15, 0.12, -0.005], [0.27, 0.1, 0.06], [0.37, 0.15, -0.065],
    [0.63, 0.15, -0.065], [0.73, 0.1, 0.06], [0.85, 0.12, -0.005],
  ],
};

export function buildConstellation({ THREE, scene, rand, heads, shape, METAL, LIGHT, GLOW, barY }) {
  const group = new THREE.Group(); scene.add(group);
  const L = heads === 8 ? 1.0 : 0.75;
  const SAG = shape === "arc" ? 0.07 * L : 0; // flèche de l'arc (centre plus haut que les bouts)
  const GOLD = { color: 0xc9a05a, metalness: 1, roughness: 0.3 };
  const metal = new THREE.MeshStandardMaterial({ ...METAL });
  const gold = new THREE.MeshStandardMaterial({ ...GOLD });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, metalness: 0.8, roughness: 0.3 });
  const UP = new THREE.Vector3(0, 1, 0);
  const rod = (a, b, r, mat) => {
    const d = new THREE.Vector3().subVectors(b, a); const len = d.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat);
    m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); group.add(m); return m;
  };
  // Point de la barre à l'abscisse t ∈ [0, 1] (parabole : centre à barY, bouts à barY − SAG).
  const barPoint = (t) => { const x = (t - 0.5) * L; const u = 2 * t - 1; return new THREE.Vector3(x, barY - SAG * u * u, 0); };

  // Pavillon rectangulaire 50 × 8 × 3,5 cm, deux aérations sombres en façade.
  // Pavillon brossé, plus mat que la barre : vu d'en dessous, il ne doit pas saturer (cf. Aigrette).
  const brushed = new THREE.MeshStandardMaterial({ ...METAL, color: METAL.metalness === 1 ? 0xb08d4f : METAL.color, roughness: 0.6, envMapIntensity: 0.35 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.035, 0.08), brushed);
  plate.position.y = -0.0175; group.add(plate);
  const vent = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  [-0.13, 0.13].forEach((x) => { const v = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.008, 0.002), vent); v.position.set(x, -0.012, 0.041); group.add(v); });

  // Barre plate (≈ 1,6 × 0,8 cm) extrudée le long de l'arc.
  const pts = []; for (let i = 0; i <= 64; i++) pts.push(barPoint(i / 64));
  const path = new THREE.CatmullRomCurve3(pts);
  const prof = new THREE.Shape(); prof.moveTo(-0.008, -0.004); prof.lineTo(0.008, -0.004); prof.lineTo(0.008, 0.004); prof.lineTo(-0.008, 0.004); prof.closePath();
  const bar = new THREE.Mesh(new THREE.ExtrudeGeometry(prof, { steps: 128, extrudePath: path, bevelEnabled: false }), metal);
  group.add(bar);
  // Boule décorative au centre.
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.026, 32, 24), gold);
  ball.position.copy(barPoint(0.5)); group.add(ball);
  // Câbles : manchon doré sur la barre, câble vertical jusqu'au pavillon.
  const cableT = [0.5 - 0.19 / L, 0.5 + 0.19 / L];
  cableT.forEach((t) => {
    const p = barPoint(t);
    rod(p.clone().add(new THREE.Vector3(0, 0.006, 0)), p.clone().add(new THREE.Vector3(0, 0.03, 0)), 0.0045, gold);
    rod(p.clone().add(new THREE.Vector3(0, 0.03, 0)), new THREE.Vector3(p.x, -0.035, 0), 0.0008, cableMat);
  });

  // Globes : verre clair, micro-LED sur fils cuivrés, attache courte depuis la barre.
  // Verre clair : face extérieure seulement (la lumière intérieure ne « remplit » pas le globe).
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xfff3e2, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.1, clearcoat: 1, envMapIntensity: 1.2, side: THREE.FrontSide, depthWrite: false });
  const wire = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.9, roughness: 0.35 });
  // LED en HDR (×2,6) : elles franchissent le seuil du halo (bloom) et scintillent comme sur la photo.
  const led = new THREE.MeshBasicMaterial({ color: new THREE.Color(GLOW).multiplyScalar(2.6) });
  // Lueur diffuse dans le globe (fils et LED vus à travers le verre).
  const haze = new THREE.MeshBasicMaterial({ color: GLOW, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false });
  const ledGeo = new THREE.SphereGeometry(1, 8, 6);
  const leds = [];
  const randIn = (r) => { for (;;) { const v = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1); if (v.lengthSq() < 1) return v.multiplyScalar(r); } };
  for (const [t, D, dy] of LAYOUT[heads]) {
    const R = D / 2;
    const anchor = barPoint(t);
    // Les globes posés « sur » la barre sont légèrement en avant, ceux du dessus/dessous en retrait.
    const z = Math.abs(dy) < 0.03 ? R * 0.55 : (rand() - 0.5) * 0.03;
    const c = anchor.clone().add(new THREE.Vector3(0, dy, z));
    // Douille dorée courte entre la barre et le globe.
    const dir = new THREE.Vector3().subVectors(c, anchor); const dl = dir.length();
    if (dl > R * 0.9) rod(anchor, anchor.clone().addScaledVector(dir.normalize(), dl - R * 0.92), 0.006, gold);
    else rod(anchor, anchor.clone().add(new THREE.Vector3(0, 0, z - R * 0.9)), 0.006, gold);
    const g = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), glass); g.position.copy(c); g.renderOrder = 2; group.add(g);
    const h = new THREE.Mesh(new THREE.SphereGeometry(R * 0.9, 32, 24), haze); h.position.copy(c); h.renderOrder = 1; group.add(h);
    // 3 à 4 fils cuivrés en boucles dans le globe, LED réparties le long des fils.
    const nWires = 3 + Math.floor(rand() * 2);
    for (let w = 0; w < nWires; w++) {
      const ctrl = []; for (let k = 0; k < 5; k++) ctrl.push(c.clone().add(randIn(R * 0.82)));
      const curve = new THREE.CatmullRomCurve3(ctrl);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.0005, 5), wire));
      const n = Math.round(18 * D / 0.12);
      for (let k = 0; k < n; k++) leds.push(curve.getPoint((k + rand() * 0.6) / n));
    }
    const pl = new THREE.PointLight(LIGHT, 0.05 * (D / 0.12), 3, 2); pl.position.copy(c); scene.add(pl);
  }
  const ledMesh = new THREE.InstancedMesh(ledGeo, led, leds.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  leds.forEach((p, i) => { const r = 0.0022 + rand() * 0.0016; sc.set(r, r, r); ledMesh.setMatrixAt(i, m4.compose(p, q, sc)); });
  group.add(ledMesh);
  return { group, Y0: barY, L };
}
