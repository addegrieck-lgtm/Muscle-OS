"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { SYMBOL_PATHS } from "@/lib/brand/paths.generated";
import { makeGlowTexture, samplePaths, seeded } from "./three-utils";

const DURATION = 2.6; // secondes de convergence

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Particules champagne qui convergent pour dessiner le symbole LUMÉANCE. */
function Particles({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const glow = useMemo(() => makeGlowTexture(), []);
  const { from, to, geo, delays } = useMemo(() => {
    const to = samplePaths(
      [
        SYMBOL_PATHS.flame,
        SYMBOL_PATHS.ribbon,
        SYMBOL_PATHS.swoosh,
        SYMBOL_PATHS.arc,
        SYMBOL_PATHS.star,
        SYMBOL_PATHS.flame,
      ],
      count,
    );
    const rand = seeded(3);
    const from = new Float32Array(count * 3);
    const delays = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = 3 + rand() * 4;
      from[i * 3] = Math.cos(a) * r;
      from[i * 3 + 1] = Math.sin(a) * r * 0.6 - 0.5;
      from[i * 3 + 2] = -2 + rand() * 4;
      delays[i] = rand() * 0.6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(from.slice(), 3));
    return { from, to, geo, delays };
  }, [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const k = easeOutExpo(Math.max(0, Math.min(1, (t - delays[i]!) / DURATION)));
      const swirl = (1 - k) * 1.2;
      const wobble = [Math.sin(t * 2 + i) * 0.04 * swirl, Math.cos(t * 1.7 + i) * 0.04 * swirl, 0];
      for (let j = 0; j < 3; j++) {
        const idx = i * 3 + j;
        arr[idx] = from[idx]! + (to[idx]! - from[idx]!) * k + wobble[j]!;
      }
    }
    pos.needsUpdate = true;
    if (ref.current) ref.current.rotation.y = (1 - easeOutExpo(Math.min(1, t / DURATION))) * 0.6;
  });

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        size={0.07}
        map={glow}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color="#f0d3a3"
      />
    </points>
  );
}

/** Filaments lumineux qui se dessinent dans l'espace. */
function Filaments() {
  const lines = useMemo(() => {
    const rand = seeded(11);
    return Array.from({ length: 5 }, (_, i) => {
      const pts = Array.from({ length: 6 }, (_, k) => {
        const t = k / 5;
        return new THREE.Vector3(
          -4.5 + t * 9,
          Math.sin(t * Math.PI * (1.2 + i * 0.2) + i) * (0.6 + rand() * 0.8) - 0.2,
          -1.5 + rand() * 2,
        );
      });
      const geo = new THREE.BufferGeometry().setFromPoints(
        new THREE.CatmullRomCurve3(pts).getPoints(200),
      );
      geo.setDrawRange(0, 0);
      const mat = new THREE.LineBasicMaterial({
        color: "#c6a372",
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
      });
      return { geo, mat, line: new THREE.Line(geo, mat), delay: i * 0.18 };
    });
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    lines.forEach((l) => {
      const k = Math.max(0, Math.min(1, (t - l.delay) / 1.8));
      l.geo.setDrawRange(0, Math.floor(easeOutExpo(k) * 200));
      l.mat.opacity = 0.35 * (1 - Math.min(1, Math.max(0, (t - 2.2) / 1.2)));
    });
  });

  return (
    <>
      {lines.map((l, i) => (
        <primitive key={i} object={l.line} />
      ))}
    </>
  );
}

export default function IntroScene({ mobile }: { mobile: boolean }) {
  return (
    <Canvas
      dpr={mobile ? [1, 1.5] : [1, 2]}
      camera={{ position: [0, 0, 6], fov: 40 }}
      gl={{ alpha: true }}
      aria-hidden
    >
      <group position={[0, 0.35, 0]}>
        <Particles count={mobile ? 900 : 1800} />
      </group>
      <Filaments />
    </Canvas>
  );
}
