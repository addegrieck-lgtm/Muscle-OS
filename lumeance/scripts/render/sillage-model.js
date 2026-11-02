// Suspension Sillage (LUM-SUS-004) — modèle 3D d'après la fiche du fournisseur :
//   barre L 120 × l 5 × H 5 cm, teinte noyer, LED 24 W diffusée sous la barre.
// Vue de face (fiche « L 120xW 5cm ») : la barre est droite à ses deux extrémités et descend en
// S d'environ sa propre hauteur (≈ 5 cm) dans sa partie centrale (de 36 % à 64 % de la
// longueur), partie gauche plus haute. Deux câbles fins aux extrémités du S (positions relevées
// sur la fiche). Pavillon non représenté sur la fiche : les câbles sortent du cadre.
// Amplitude et positions estimées sur l'image du fournisseur (aucune cote fournie).

export function buildSillage({ THREE, scene, rand, wood, LIGHT, GLOW, barY = -0.9 }) {
  const L = 1.2, S = 0.05, STEP = 0.05;
  const X0 = -L / 2 + 0.36 * L, X1 = -L / 2 + 0.64 * L;
  const smooth = (t) => t * t * (3 - 2 * t);
  // Ligne médiane : +STEP/2 à gauche, −STEP/2 à droite.
  const yc = (x) => barY + STEP / 2 - STEP * smooth(Math.min(1, Math.max(0, (x - X0) / (X1 - X0))));
  const group = new THREE.Group();
  scene.add(group);

  // ── Texture noyer : veinage dans la longueur ──
  const c = document.createElement("canvas"); c.width = 2048; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = wood.base; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 260; i++) {
    const y0 = rand() * c.height, amp = 2 + rand() * 10, f = 0.002 + rand() * 0.006, ph = rand() * 6.3;
    const dark = rand() < 0.6;
    g.strokeStyle = dark ? `rgba(${wood.dark},${0.12 + rand() * 0.3})` : `rgba(${wood.light},${0.08 + rand() * 0.18})`;
    g.lineWidth = 0.6 + rand() * 2.6;
    g.beginPath();
    for (let x = 0; x <= c.width; x += 8) {
      const y = y0 + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.1 + ph * 2) * amp * 0.3;
      x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const woodMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0, envMapIntensity: 0.6 });
  const diffMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(GLOW).multiplyScalar(1.6) });

  // ── Barre : balayage d'une section carrée le long de la ligne médiane ──
  const N = 160;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const x = -L / 2 + (L * i) / N;
    const dy = (yc(x + 1e-3) - yc(x - 1e-3)) / 2e-3; // pente
    const n = new THREE.Vector2(-dy, 1).normalize(); // normale dans le plan vertical
    pts.push({ x, y: yc(x), nx: n.x, ny: n.y, u: i / N });
  }
  // Une face = 2 bords (décalages dans le plan (n, z)) ; diffuseur = bande inférieure en retrait.
  function face(a, b, mat, flip) {
    const pos = [], uv = [], idx = [];
    for (const p of pts) {
      for (const [h, z] of [a, b]) {
        pos.push(p.x + p.nx * h, p.y + p.ny * h, z);
        uv.push(p.u, (h + z + S) / (2 * S));
      }
    }
    for (let i = 0; i < N; i++) {
      const k = i * 2;
      flip ? idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3) : idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
    group.add(m);
  }
  const h = S / 2, w = S / 2, lip = 0.004;
  face([h, -w], [h, w], woodMat, false); // dessus
  face([h, w], [-h, w], woodMat, false); // face avant
  face([-h, -w], [h, -w], woodMat, false); // face arrière
  face([-h, w], [-h, w - lip], woodMat, false); // rebords inférieurs
  face([-h, -w + lip], [-h, -w], woodMat, false);
  face([-h + 0.002, w - lip], [-h + 0.002, -w + lip], diffMat, false); // diffuseur
  // Bouts.
  for (const p of [pts[0], pts[N]]) {
    const cap = new THREE.Mesh(new THREE.PlaneGeometry(S, S), woodMat);
    cap.position.set(p.x, p.y, 0);
    cap.rotation.y = p === pts[0] ? -Math.PI / 2 : Math.PI / 2;
    group.add(cap);
  }

  // ── Câbles ──
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x1a1918, roughness: 0.5 });
  for (const x of [X0, X1]) {
    const top = yc(x) + h, len = 3;
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, len, 8), cableMat);
    cable.position.set(x, top + len / 2, 0);
    group.add(cable);
  }

  // ── Lumière vers le bas : projecteurs répartis sous la barre ──
  for (let i = 0; i < 6; i++) {
    const x = -L / 2 + 0.1 + (i * (L - 0.2)) / 5;
    const sp = new THREE.SpotLight(LIGHT, 0.9, 0, THREE.MathUtils.degToRad(70), 1, 2);
    sp.position.set(x, yc(x) - h - 0.005, 0);
    sp.target.position.set(x, yc(x) - 2, 0.05);
    group.add(sp, sp.target);
  }
  const halo = new THREE.PointLight(LIGHT, 0.08, 0.6, 1.5);
  halo.position.set(0, barY - 0.08, 0.05);
  group.add(halo);

  return { L, yc, group };
}
