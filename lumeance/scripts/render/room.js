// Décors intérieurs communs aux visualisations 3D (scènes Aigrette, Sylve…).
// Pièce « éditoriale » : enduit à la chaux, panneau de chêne cannelé encadré de lumière indirecte,
// plafond à gorge lumineuse, fenêtre cintrée en lumière du jour, œuvre encadrée.
//   theme : "salon" (greige chaud, chêne clair, œuvre) | "salle" (anthracite, chêne fumé, arcades)
//   wallZ : position du mur du fond ; width : largeur utile de la pièce (m).
import * as THREE from "three";

function canvasTex(size, draw, rx = 1, ry = 1, color = true) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Enduit à la chaux : nuages doux + grain fin.
function limewash(rand, base, [r, g, b]) {
  return canvasTex(1024, (x, S) => {
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 160; i++) {
      // nuages clairs et sombres en proportions égales, autour de la teinte de base
      const cx = rand() * S, cy = rand() * S, rad = 40 + rand() * 160, k = (rand() - 0.5) * 0.12;
      const grd = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
      const c = k > 0 ? `rgba(${Math.min(255, r * 1.18)},${Math.min(255, g * 1.18)},${Math.min(255, b * 1.18)},${k})` : `rgba(${r * 0.75},${g * 0.75},${b * 0.75},${-k})`;
      grd.addColorStop(0, c); grd.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = grd; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 60000; i++) {
      const v = rand() < 0.5 ? 255 : 0;
      x.fillStyle = `rgba(${v},${v},${v},0.02)`; x.fillRect(rand() * S, rand() * S, 1.5, 1.5);
    }
  }, 2, 2);
}

// Chêne cannelé : lames demi-rondes verticales (couleur + relief).
function fluted(rand, [r, g, b], flutes = 24) {
  const draw = (relief) => (x, S) => {
    const w = S / flutes;
    for (let i = 0; i < flutes; i++) {
      const tone = 0.9 + rand() * 0.2;
      for (let px = 0; px < w; px++) {
        const t = px / w, shade = Math.sin(t * Math.PI);
        if (relief) { const v = Math.round(255 * shade); x.fillStyle = `rgb(${v},${v},${v})`; }
        else {
          const k = (0.62 + shade * 0.45) * tone;
          x.fillStyle = `rgb(${Math.min(255, r * k)},${Math.min(255, g * k)},${Math.min(255, b * k)})`;
        }
        x.fillRect(i * w + px, 0, 1, S);
      }
      if (!relief) for (let j = 0; j < 40; j++) {
        // veinage
        x.strokeStyle = `rgba(40,25,10,${0.05 + rand() * 0.06})`; x.lineWidth = 0.6 + rand();
        const ox = i * w + rand() * w; x.beginPath(); x.moveTo(ox, 0);
        for (let y = 0; y <= S; y += 32) x.lineTo(ox + Math.sin(y / 90 + j) * 1.5, y);
        x.stroke();
      }
    }
  };
  return { map: canvasTex(1024, draw(false), 1, 1), bump: canvasTex(1024, draw(true), 1, 1, false) };
}

// Œuvre abstraite : rayons dorés sur fond crème (écho au pissenlit) ou arcs à l'encre.
function artwork(rand, kind) {
  return canvasTex(1024, (x, S) => {
    x.fillStyle = kind === "rays" ? "#ece5d8" : "#d9d3c8"; x.fillRect(0, 0, S, S);
    if (kind === "rays") {
      for (let i = 0; i < 520; i++) {
        const a = rand() * Math.PI * 2, r0 = S * 0.04, r1 = S * (0.18 + rand() * 0.24);
        x.strokeStyle = `rgba(${150 + rand() * 50},${115 + rand() * 40},${60 + rand() * 20},${0.35 + rand() * 0.4})`;
        x.lineWidth = 0.7 + rand() * 1.4; x.beginPath();
        x.moveTo(S / 2 + Math.cos(a) * r0, S / 2 + Math.sin(a) * r0);
        x.lineTo(S / 2 + Math.cos(a) * r1, S / 2 + Math.sin(a) * r1); x.stroke();
      }
    } else {
      for (let i = 0; i < 7; i++) {
        x.strokeStyle = `rgba(30,30,32,${0.5 + rand() * 0.4})`; x.lineWidth = 6 + rand() * 18;
        x.beginPath(); x.arc(S * (0.3 + rand() * 0.4), S * (0.55 + rand() * 0.3), S * (0.15 + rand() * 0.3), Math.PI * (1 + rand() * 0.2), Math.PI * (1.8 + rand() * 0.2)); x.stroke();
      }
    }
  }, 1, 1);
}

export function buildRoom(scene, { rand, temp = "chaud", theme = "salon", wallZ = -1.8, width = 8, centerX = 0 }) {
  const warm = { chaud: 0xffd9a8, neutre: 0xfff1de, froid: 0xeef4ff }[temp] ?? 0xfff1de;
  const P = theme === "salon"
    ? { wall: "#5f5347", wallRGB: [95, 83, 71], ceil: "#a99e90", oak: [132, 100, 70], frame: 0xb08d57 }
    : { wall: "#262524", wallRGB: [38, 37, 36], ceil: "#8f8b86", oak: [70, 54, 42], frame: 0x1c1b1a };
  const H = 6, W = Math.max(width, 6);
  const grp = new THREE.Group(); scene.add(grp);
  const std = (o) => new THREE.MeshStandardMaterial(o);

  // Plafond, avec faux-plafond central et gorge lumineuse le long du mur.
  const ceilMat = std({ map: limewash(rand, P.ceil, theme === "salon" ? [169, 158, 144] : [143, 139, 134]), roughness: 0.95 });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, 12), ceilMat);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(centerX, 0, 0); grp.add(ceil);
  const soffit = new THREE.Mesh(new THREE.BoxGeometry(W * 2, 0.12, 0.35), ceilMat);
  soffit.position.set(centerX, -0.06, wallZ + 0.175); grp.add(soffit);
  const cove = new THREE.Mesh(new THREE.BoxGeometry(W * 2, 0.012, 0.02), std({ color: 0xffffff, emissive: warm, emissiveIntensity: 1.3 }));
  cove.position.set(centerX, -0.125, wallZ + 0.36); grp.add(cove);
  for (let k = -3; k <= 3; k++) {
    // spots encastrés
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.035, 24), std({ color: 0xffffff, emissive: warm, emissiveIntensity: 1.6 }));
    d.rotation.x = Math.PI / 2; d.position.set(centerX + k * 1.1, -0.001, wallZ + 1.1); grp.add(d);
  }

  // Mur du fond : enduit à la chaux, rehaussé d'un lavis de lumière depuis la gorge.
  const wallMat = std({ map: limewash(rand, P.wall, P.wallRGB), roughness: 0.97 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, H), wallMat);
  wall.position.set(centerX, -H / 2, wallZ); grp.add(wall);
  const wash = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, 1.4), new THREE.MeshBasicMaterial({
    map: canvasTex(64, (x, S) => { const g = x.createLinearGradient(0, 0, 0, S); g.addColorStop(0, "rgba(255,236,205,0.16)"); g.addColorStop(1, "rgba(255,236,205,0)"); x.fillStyle = g; x.fillRect(0, 0, S, S); }),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  wash.position.set(centerX, -0.82, wallZ + 0.005); grp.add(wash);

  // Panneau de chêne cannelé, encadré de deux rubans lumineux verticaux.
  const panelW = theme === "salon" ? 1.3 : 2.2;
  const panelX = centerX + (theme === "salon" ? -1.25 : 0);
  const oak = fluted(rand, P.oak, Math.round(panelW * 22));
  const panel = new THREE.Mesh(new THREE.BoxGeometry(panelW, H, 0.04), std({ map: oak.map, bumpMap: oak.bump, bumpScale: 2.5, roughness: 0.6 }));
  panel.position.set(panelX, -H / 2, wallZ + 0.02); grp.add(panel);
  [-1, 1].forEach((sgn) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.012, H, 0.01), std({ color: 0xffffff, emissive: warm, emissiveIntensity: 1.1 }));
    strip.position.set(panelX + sgn * (panelW / 2 + 0.02), -H / 2, wallZ + 0.03); grp.add(strip);
    const glow = new THREE.PointLight(warm, 0.1, 2.5, 2); glow.position.set(panelX + sgn * (panelW / 2 + 0.05), -1.0, wallZ + 0.15); grp.add(glow);
  });

  if (theme === "salon") {
    // Œuvre encadrée à droite.
    const art = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), std({ map: artwork(rand, "rays"), roughness: 0.9 }));
    art.position.set(centerX + 0.95, -1.15, wallZ + 0.035); grp.add(art);
    const fr = std({ color: P.frame, metalness: 0.9, roughness: 0.35 });
    [[0, 0.365, 0.75, 0.025], [0, -0.365, 0.75, 0.025], [0.365, 0, 0.025, 0.75], [-0.365, 0, 0.025, 0.75]].forEach(([dx, dy, w, h]) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), fr); b.position.set(art.position.x + dx, art.position.y + dy, wallZ + 0.04); grp.add(b);
    });
    const picLight = new THREE.SpotLight(warm, 0.5, 3, 0.5, 0.6, 2);
    picLight.position.set(art.position.x, -0.1, wallZ + 0.8); picLight.target = art; grp.add(picLight); grp.add(picLight.target);
  }

  // Fenêtres cintrées en lumière du jour (salon : mur de gauche ; salle : deux arcades au fond).
  const sky = std({ color: 0xffffff, emissive: temp === "froid" ? 0xe9f1ff : 0xfff6ea, emissiveIntensity: 0.7 });
  const mullion = std({ color: theme === "salon" ? 0xf1ece4 : 0x2a2a2a, roughness: 0.5 });
  function archWindow(w, h, place) {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0); shape.lineTo(-w / 2, h - w / 2); shape.absarc(0, h - w / 2, w / 2, Math.PI, 0, true); shape.lineTo(w / 2, 0); shape.lineTo(-w / 2, 0);
    const win = new THREE.Mesh(new THREE.ShapeGeometry(shape, 32), sky);
    const g = new THREE.Group(); g.add(win);
    const bars = [[0, h / 2 - w / 4, 0.025, h - w / 2], [0, (h - w / 2) * 0.35, w, 0.025], [0, (h - w / 2) * 0.7, w, 0.025]];
    bars.forEach(([x, y, bw, bh]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.02), mullion); m.position.set(x, y, 0.01); g.add(m); });
    place(g); grp.add(g);
  }
  if (theme === "salon") {
    archWindow(1.1, 2.6, (g) => { g.rotation.y = Math.PI / 2; g.position.set(centerX - W / 2 + 0.5, -3.1, 0.4); });
    const side = new THREE.Mesh(new THREE.PlaneGeometry(12, H), wallMat);
    side.rotation.y = Math.PI / 2; side.position.set(centerX - W / 2 + 0.49, -H / 2, 0); grp.add(side);
    const day = new THREE.DirectionalLight(temp === "froid" ? 0xeef4ff : 0xfff3e2, 0.12); day.position.set(-4, -1.5, 1); grp.add(day);
  } else {
    [-1, 1].forEach((sgn) => archWindow(1.2, 2.9, (g) => g.position.set(centerX + sgn * 2.2, -3.4, wallZ + 0.01)));
    const day = new THREE.DirectionalLight(temp === "froid" ? 0xeef4ff : 0xfff3e2, 0.1); day.position.set(0, -1.5, -3); grp.add(day);
  }
  scene.add(new THREE.HemisphereLight({ chaud: 0xffe6c6, neutre: 0xfff6ea, froid: 0xeef2ff }[temp] ?? 0xfff6ea, 0x2a2420, 0.1));
  return grp;
}
