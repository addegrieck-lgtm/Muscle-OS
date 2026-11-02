// Lustre Cristalline (LUM-LUS-009) — modèle 3D d'après les fiches à cotes et les photos du fournisseur :
// pavillon rond en acier inoxydable poli miroir doré (Ø50/60/80/100 cm) garni de spots LED (6 W ×
// 7/10/15/20) ; fils fins portant des boules de cristal K9 taillées à facettes (grosses et
// moyennes) et de petites perles en losange ; cascade en spirale qui s'affine vers le bas
// (hauteur totale 160/210/280/350 cm). Répartition des perles relevée sur les photos (non cotée).
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function buildCristalline({ THREE, scene, rand, D, H, spots, LIGHT, GLOW, topY = 0 }) {
  const group = new THREE.Group();
  scene.add(group);
  const R = D / 2;
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8b26a, metalness: 1, roughness: 0.12 });
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0xe9e4da,
    transparent: true,
    opacity: 0.35,
  });
  // Cristal K9 : très clair, facettes nettes (ombrage plat), reflets intenses de la pièce.
  const crystal = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: 0.07,
    flatShading: true,
    transparent: true,
    opacity: 0.88,
    envMapIntensity: 3.2,
    emissive: new THREE.Color(GLOW).multiplyScalar(0.12),
  });
  const glint = new THREE.MeshBasicMaterial({
    color: GLOW,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // ── Pavillon : disque doré poli, face inférieure garnie de spots ──
  const cm = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.98, 0.07, 96), gold);
  cm.position.y = topY - 0.035;
  group.add(cm);
  const under = topY - 0.071;
  const spotGeo = [];
  for (let i = 0; i < spots; i++) {
    const a = (i / spots) * Math.PI * 2 * 2.618,
      r = R * Math.sqrt((i + 0.5) / spots) * 0.82;
    spotGeo.push(
      new THREE.CircleGeometry(0.012, 20)
        .rotateX(Math.PI / 2)
        .translate(Math.cos(a) * r, under, Math.sin(a) * r),
    );
    const s = new THREE.SpotLight(LIGHT, 0.45, 0, THREE.MathUtils.degToRad(28), 0.8, 2);
    s.position.set(Math.cos(a) * r, under - 0.01, Math.sin(a) * r);
    s.target.position.set(Math.cos(a) * r * 1.3, under - 3, Math.sin(a) * r * 1.3);
    group.add(s, s.target);
  }
  group.add(new THREE.Mesh(mergeGeometries(spotGeo), new THREE.MeshBasicMaterial({ color: GLOW })));

  // ── Fils : spirale qui descend et s'affine ──
  const strands = Math.round(D * 110);
  const ball = new THREE.IcosahedronGeometry(1, 1);
  const bead = new THREE.OctahedronGeometry(1, 0).scale(1, 1.6, 1);
  const balls = [],
    beads = [],
    wires = [],
    glints = [];
  for (let i = 0; i < strands; i++) {
    const u = i / strands;
    const a = u * Math.PI * 2 * 3.0 + rand() * 0.6;
    const rr = R * 0.92 * Math.sqrt(rand() * 0.85 + 0.15);
    const x = Math.cos(a) * rr,
      z = Math.sin(a) * rr;
    // Longueur : les fils du centre et ceux qui suivent la spirale descendent le plus bas.
    const spiral = (a / (Math.PI * 2 * 3)) % 1;
    // Cône en spirale : les fils extérieurs s'arrêtent haut, le cœur et la spirale descendent bas.
    const f =
      0.22 + 0.78 * Math.min(1, Math.pow(1 - rr / R, 0.9) * 0.85 + spiral * 0.35 + rand() * 0.08);
    const len = (H - 0.07) * f;
    const bottom = under - len;
    wires.push(new THREE.CylinderGeometry(0.0006, 0.0006, len, 4).translate(x, under - len / 2, z));
    // Perles et boules réparties sur la moitié basse du fil (le haut reste nu, comme sur les photos).
    const start = under - Math.min(len * 0.6, 0.12 + rand() * 0.12);
    let y = start;
    while (y > bottom + 0.02) {
      // Spirale : le cristal se concentre le long d'une hélice qui s'enroule autour de la colonne.
      const t = (under - y) / H;
      const band = (1 + Math.cos(a - t * Math.PI * 2 * 1.6)) / 2;
      if (rand() > 0.25 + 0.75 * band * band) {
        y -= 0.04 + rand() * 0.04;
        continue;
      }
      if (rand() < 0.4) {
        const s = 0.016 + rand() * 0.016; // boule Ø3 à 6 cm
        balls.push(
          ball
            .clone()
            .scale(s, s, s)
            .rotateY(rand() * 3)
            .translate(x, y, z),
        );
        if (rand() < 0.12)
          glints.push(
            new THREE.PlaneGeometry(s * 0.9, s * 0.9).translate(x + s * 0.3, y + s * 0.3, z + s),
          );
        y -= s * 2 + 0.03 + rand() * 0.05;
      } else {
        const s = 0.006 + rand() * 0.004;
        beads.push(
          bead
            .clone()
            .scale(s, s, s)
            .rotateY(rand() * 3)
            .translate(x, y, z),
        );
        y -= 0.05 + rand() * 0.05;
      }
    }
    const s = 0.018 + rand() * 0.01; // boule finale
    balls.push(
      ball
        .clone()
        .scale(s, s * 1.15, s)
        .translate(x, bottom, z),
    );
  }
  group.add(new THREE.Mesh(mergeGeometries(wires), wireMat));
  group.add(new THREE.Mesh(mergeGeometries(balls), crystal));
  group.add(new THREE.Mesh(mergeGeometries(beads), crystal));
  // Étincelles : reflets ponctuels des spots dans le cristal.
  const sparkTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.2, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  glint.map = sparkTex;
  // Étincelles dessinées retirées après essai (taches floues) : seuls les reflets réels des facettes.
  void glints;

  // Lumière diffusée par l'ensemble, derrière la cascade.
  const fill = new THREE.PointLight(LIGHT, 0.6 + D, 0, 2);
  fill.position.set(0, under - H * 0.4, -0.6);
  group.add(fill);
  return { bottom: under - H + 0.07, sparkTex };
}

// Reflets projetés par le cristal sur le mur et le plafond (taches lumineuses irrégulières).
export function addCaustics({
  THREE,
  scene,
  rand,
  sparkTex,
  LIGHT,
  wallZ,
  ceilY,
  count = 160,
  spanX = 3.2,
  spanY = 2.4,
  y0 = -1,
}) {
  const mat = new THREE.MeshBasicMaterial({
    map: sparkTex,
    color: LIGHT,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const geos = [];
  for (let i = 0; i < count; i++) {
    const s = 0.012 + rand() * 0.035;
    geos.push(
      new THREE.PlaneGeometry(s * (1 + rand()), s)
        .rotateZ(rand() * 3)
        .translate((rand() - 0.5) * spanX, y0 - rand() * spanY, wallZ + 0.01),
    );
  }
  for (let i = 0; i < count / 2; i++) {
    const s = 0.012 + rand() * 0.03;
    geos.push(
      new THREE.PlaneGeometry(s * (1 + rand()), s)
        .rotateX(Math.PI / 2)
        .translate((rand() - 0.5) * spanX, ceilY - 0.002, wallZ + 0.3 + rand() * 1.6),
    );
  }
  scene.add(new THREE.Mesh(mergeGeometries(geos), mat));
}
