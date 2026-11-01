// Modèle 3D d'Aigrette (LUM-SUS-002), partagé par scene-aigrette.html (visualisations des versions)
// et scene-aigrette-ambiance.html (images de présentation). Version ronde : inchangée.
// Version linéaire : reprise d'après les fiches techniques du fabricant (voir commentaire plus bas).
// Le tirage aléatoire (rand) est consommé dans le même ordre qu'avant pour la version ronde :
// ses rendus restent identiques.
export function buildAigrette({ THREE, scene, rand, form, W, BULBS, METAL, LIGHT, GLOW, barY }) {
  const metal = new THREE.MeshStandardMaterial(METAL);
  const cableMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, metalness: 0.8, roughness: 0.3 });
  const crystalMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.72, envMapIntensity: 3.2, emissive: GLOW, emissiveIntensity: 0.035, clearcoat: 1, side: THREE.DoubleSide });
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: GLOW, emissiveIntensity: Math.min(1, 9 / BULBS), roughness: 0.4 });
  const Y0 = form === "round" ? -0.55 - W / 2 : barY; // centre du luminaire sous le plafond
  const group = new THREE.Group(); scene.add(group);

  // Tiges et cristaux en instances (des milliers d'éléments).
  const rods = [], gems = [];
  const UP = new THREE.Vector3(0, 1, 0);
  function rodTo(a, b, r) { rods.push([a.clone(), b.clone(), r]); }
  function rod(a, b, r, mat) {
    const d = new THREE.Vector3().subVectors(b, a); const len = d.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
    m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); group.add(m); return m;
  }
  const randDir = () => { const u = rand() * 2 - 1, a = rand() * Math.PI * 2, r = Math.sqrt(1 - u * u); return new THREE.Vector3(r * Math.cos(a), u, r * Math.sin(a)); };
  // Ramure terminale : 3 à 4 brindilles courtes, chacune avec 1 à 2 perles de cristal.
  function sprig(at, dir, size) {
    const n = 3 + Math.floor(rand() * 2);
    for (let i = 0; i < n; i++) {
      const d = dir.clone().add(randDir().multiplyScalar(0.9)).normalize();
      const e = at.clone().addScaledVector(d, size * (0.5 + rand() * 0.6));
      rodTo(at, e, 0.0007);
      gems.push([e, 0.0038 + rand() * 0.0025]);
      if (rand() < 0.35) gems.push([at.clone().lerp(e, 0.55), 0.003 + rand() * 0.0015]);
    }
  }

  let bulbAnchors = [];
  if (form === "round") {
    const R = W / 2;
    const center = new THREE.Vector3(0, Y0, 0);
    const core = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.035, R * 0.12), 32, 24), metal);
    core.position.copy(center); group.add(core);
    // Tige de suspension, manchon, câble vers le pavillon.
    const top = center.clone().add(new THREE.Vector3(0, R * 0.12 + 0.05, 0));
    rod(center, top, 0.006, metal);
    rod(top, new THREE.Vector3(0, -0.04, 0), 0.0012, cableMat);
    const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.035, 48), metal);
    canopy.position.y = -0.0175; group.add(canopy);
    const n = Math.round(150 * R / 0.25);
    for (let i = 0; i < n; i++) {
      // Distribution de Fibonacci (couverture régulière) avec un léger aléa.
      const k = (i + 0.5) / n, phi = Math.acos(1 - 2 * k), th = Math.PI * (1 + Math.sqrt(5)) * i;
      const d = new THREE.Vector3(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)).add(randDir().multiplyScalar(0.12)).normalize();
      if (d.y > 0.9) continue; // la tige de suspension
      const len = R * (0.78 + rand() * 0.18);
      const end = center.clone().addScaledVector(d, len);
      rodTo(center.clone().addScaledVector(d, R * 0.1), end, 0.0011);
      sprig(end, d, R * 0.12);
    }
    for (let i = 0; i < BULBS; i++) {
      const k = (i + 0.5) / BULBS, phi = Math.acos(1 - 2 * k), th = Math.PI * (1 + Math.sqrt(5)) * i + 0.3;
      bulbAnchors.push([center, new THREE.Vector3(Math.sin(phi) * Math.cos(th), Math.cos(phi) * 0.85, Math.sin(phi) * Math.sin(th)).normalize(), R * 0.28]);
    }
  } else {
    // Linéaire, d'après les fiches du fabricant (L72 / L92 cm, H40 cm, pavillon L50 cm) :
    // tube doré épais sur ~80 % de la longueur, 83 faisceaux de fils (L92) portant des cristaux
    // répartis le long du fil, ampoules G9 « à épi » sur douilles tubulaires (un tiers dressées,
    // les autres inclinées vers le bas), deux câbles verticaux et un cordon d'alimentation libre.
    const L = W, H = 0.4, D = 0.34, barLen = L * 0.8, RB = 0.015;
    // Métal satiné (galvanoplastie) pour la barre et le pavillon : moins de reflets que les tiges,
    // pour que le tube reste lisible au milieu du halo. Cristaux plus clairs, moins lumineux.
    const chrome = METAL.roughness < 0.1;
    const satin = new THREE.MeshStandardMaterial({ ...METAL, color: chrome ? METAL.color : 0xa8823f, roughness: chrome ? 0.18 : 0.3, envMapIntensity: chrome ? 0.6 : 0.16 });
    crystalMat.emissiveIntensity = 0.018;
    const a = new THREE.Vector3(-barLen / 2, Y0, 0), b = new THREE.Vector3(barLen / 2, Y0, 0);
    rod(a, b, RB, satin);
    [a, b].forEach((p) => { const cap = new THREE.Mesh(new THREE.SphereGeometry(RB, 24, 12), satin); cap.scale.set(0.45, 1, 1); cap.position.copy(p); group.add(cap); });
    // Pavillon : boîtier rectangulaire 50 × 7 cm, vis décoratives aux extrémités, câbles verticaux.
    // Pavillon brossé : plus mat que la barre, sinon la lumière principale, venue d'en bas,
    // se reflète en plein dans sa face inférieure (vue en contre-plongée) et la fait saturer.
    const brushed = chrome ? satin : new THREE.MeshStandardMaterial({ color: 0xb08d4f, metalness: 0.9, roughness: 0.58, envMapIntensity: 0.35 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.035, 0.07), brushed);
    plate.position.y = -0.0175; group.add(plate);
    [-0.22, 0.22].forEach((x) => {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.012, 16), metal); screw.position.set(x, -0.041, 0); group.add(screw);
      rod(new THREE.Vector3(x, Y0 + RB, 0), new THREE.Vector3(x, -0.047, 0), 0.0009, cableMat);
    });
    const cord = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.035, 0), new THREE.Vector3(0.035, Y0 * 0.3, 0.01),
      new THREE.Vector3(-0.03, Y0 * 0.62, -0.01), new THREE.Vector3(0.01, Y0 * 0.88, 0), new THREE.Vector3(0, Y0 + RB, 0),
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(cord, 120, 0.0016, 8), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.45 })));
    // Faisceaux de fils : extrémités dans l'ellipsoïde L × H × D centré sur la barre.
    const ea = L / 2, eb = H / 2, ec = D / 2;
    const pieces = Math.round(83 * L / 0.92);
    for (let i = 0; i < pieces; i++) {
      const x = (rand() - 0.5) * barLen * 0.96;
      const origin = new THREE.Vector3(x, Y0, 0);
      const base = randDir(); base.x = base.x * 0.4 + (x / (barLen / 2)) * 0.6; base.normalize();
      for (let k = 0; k < 4; k++) {
        const d = base.clone().add(randDir().multiplyScalar(0.3)).normalize();
        const A = (d.x / ea) ** 2 + (d.y / eb) ** 2 + (d.z / ec) ** 2, B = (2 * x * d.x) / ea ** 2, C = (x / ea) ** 2 - 1;
        const tMax = (-B + Math.sqrt(B * B - 4 * A * C)) / (2 * A);
        const end = origin.clone().addScaledVector(d, tMax * (0.7 + rand() * 0.3));
        rodTo(origin.clone().addScaledVector(d, RB), end, 0.0007);
        for (const f of [0.42, 0.62, 0.8]) if (rand() < 0.8) gems.push([origin.clone().lerp(end, f + (rand() - 0.5) * 0.06), 0.0032 + rand() * 0.0018]);
        for (let t = 0; t < 2; t++) { // petite fourche terminale
          const e = end.clone().addScaledVector(d.clone().add(randDir().multiplyScalar(0.8)).normalize(), 0.018 + rand() * 0.012);
          rodTo(end, e, 0.0006); gems.push([e, 0.0035 + rand() * 0.002]);
        }
      }
    }
    // Ampoules G9 « à épi » : corps blanc semé de petites LED, sur douille dorée tubulaire.
    const ledTex = (() => { const c = document.createElement("canvas"); c.width = 64; c.height = 128; const x = c.getContext("2d"); x.fillStyle = "#f4f1ea"; x.fillRect(0, 0, 64, 128); for (let r = 0; r < 12; r++) for (let q = 0; q < 6; q++) { x.fillStyle = "#ffd98a"; x.fillRect(q * 11 + (r % 2) * 5 + 2, r * 10 + 4, 6, 4); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const cornMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: ledTex, emissive: GLOW, emissiveMap: ledTex, emissiveIntensity: 0.7, roughness: 0.5 });
    const ups = Math.round(BULBS / 3);
    for (let i = 0; i < BULBS; i++) {
      const x = -barLen * 0.44 + (i / Math.max(1, BULBS - 1)) * barLen * 0.88;
      const up = i % 3 === 1 && ups > 0;
      const dir = up ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3((rand() - 0.5) * 0.3, -0.72, i % 2 ? 0.7 : -0.7).normalize();
      const p0 = new THREE.Vector3(x, Y0, 0).addScaledVector(dir, RB * 0.8);
      const p1 = p0.clone().addScaledVector(dir, 0.045);
      rod(p0, p1, 0.0085, satin);
      const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.04, 20), cornMat);
      bulb.position.copy(p1).addScaledVector(dir, 0.02); bulb.quaternion.setFromUnitVectors(UP, dir); group.add(bulb);
      const pl = new THREE.PointLight(LIGHT, 0.09, 4, 2); pl.position.copy(bulb.position); scene.add(pl);
    }
  }
  // Ampoules G9 LED en capsule, au bout d'une courte douille.
  for (const [c, d, r] of form === "round" ? bulbAnchors : []) {
    const base = c.clone().addScaledVector(d, r);
    rod(c, base, 0.004, metal);
    const sock = base.clone().addScaledVector(d, 0.012);
    rod(base, sock, 0.007, metal);
    const g = new THREE.Mesh(new THREE.CapsuleGeometry(0.0085, 0.03, 6, 16), bulbMat);
    g.position.copy(sock).addScaledVector(d, 0.024); g.quaternion.setFromUnitVectors(UP, d); group.add(g);
    const pl = new THREE.PointLight(LIGHT, 0.09, 4, 2); pl.position.copy(g.position); scene.add(pl);
  }
  // Instanciation des tiges et des cristaux.
  const rodGeo = new THREE.CylinderGeometry(1, 1, 1, 5);
  const rodsMesh = new THREE.InstancedMesh(rodGeo, metal, rods.length);
  const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  rods.forEach(([a, b, r], i) => {
    const d = new THREE.Vector3().subVectors(b, a); const len = d.length();
    qt.setFromUnitVectors(UP, d.normalize()); v.copy(a).lerp(b, 0.5); sc.set(r, len, r);
    rodsMesh.setMatrixAt(i, m4.compose(v, qt, sc));
  });
  group.add(rodsMesh);
  const gemGeo = new THREE.OctahedronGeometry(1, 0);
  const gemsMesh = new THREE.InstancedMesh(gemGeo, crystalMat, gems.length);
  gems.forEach(([p, r], i) => {
    qt.setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, rand() * 3)); sc.set(r, r * 1.5, r);
    gemsMesh.setMatrixAt(i, m4.compose(p, qt, sc));
  });
  group.add(gemsMesh);
  group.rotation.y = (rand() - 0.5) * 0.4;


  return { Y0, group };
}
