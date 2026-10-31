import * as THREE from "three";

/** Texture de halo radial générée à la volée (aucun fichier image à charger). */
export function makeGlowTexture(inner = "rgba(255,238,205,1)", mid = "rgba(233,196,140,0.35)") {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.22, mid);
  g.addColorStop(1, "rgba(233,196,140,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Échantillonne des points le long de tracés SVG (repère 0..200), centrés et normalisés. */
export function samplePaths(paths: string[], count: number): Float32Array {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  const els = paths.map((d) => {
    const p = document.createElementNS(svgNS, "path");
    p.setAttribute("d", d);
    svg.appendChild(p);
    return p;
  });
  document.body.appendChild(svg);
  const lengths = els.map((p) => p.getTotalLength());
  const total = lengths.reduce((a, b) => a + b, 0);
  const out = new Float32Array(count * 3);
  const rand = seeded(7);
  for (let i = 0; i < count; i++) {
    let t = rand() * total;
    let k = 0;
    while (k < lengths.length - 1 && t > lengths[k]!) t -= lengths[k++]!;
    const pt = els[k]!.getPointAtLength(t);
    out[i * 3] = (pt.x - 100) / 50 + (rand() - 0.5) * 0.05;
    out[i * 3 + 1] = -(pt.y - 100) / 50 + (rand() - 0.5) * 0.05;
    out[i * 3 + 2] = (rand() - 0.5) * 0.08;
  }
  svg.remove();
  return out;
}
