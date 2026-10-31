"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { makeGlowTexture, seeded } from "./three-utils";

interface Globe {
  x: number;
  z: number;
  y: number;
  r: number;
  phase: number;
}

/** Lustre en cascade : sphères de verre lumineuses suspendues à des fils, poussière dorée. */
function Chandelier({ count }: { count: number }) {
  const group = useRef<THREE.Group>(null);
  const glow = useMemo(() => makeGlowTexture(), []);
  const globes = useMemo<Globe[]>(() => {
    const rand = seeded(42);
    return Array.from({ length: count }, () => {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * 1.25;
      return {
        x: Math.cos(a) * rr,
        z: Math.sin(a) * rr,
        y: 1.4 - rand() * 3.2 - (1.25 - rr) * 0.5,
        r: 0.07 + rand() * 0.09,
        phase: rand() * Math.PI * 2,
      };
    });
  }, [count]);

  const wires = useMemo(() => {
    const pts: number[] = [];
    globes.forEach((g) => pts.push(g.x, 2.6, g.z, g.x, g.y + g.r, g.z));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [globes]);

  const glass = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f3e3c6",
        emissive: "#ffcf8a",
        emissiveIntensity: 0.55,
        roughness: 0.15,
        metalness: 0.1,
        transparent: true,
        opacity: 0.55,
      }),
    [],
  );
  const core = useMemo(() => new THREE.MeshBasicMaterial({ color: "#fff4df" }), []);
  const sphere = useMemo(() => new THREE.SphereGeometry(1, 32, 24), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = t * 0.06;
      group.current.children.forEach((child, i) => {
        const g = globes[i - 2];
        if (g && child.userData.globe) child.position.y = g.y + Math.sin(t * 0.6 + g.phase) * 0.025;
      });
    }
  });

  return (
    <group ref={group} position={[0, 0.2, 0]}>
      <mesh position={[0, 2.62, 0]}>
        <cylinderGeometry args={[1.32, 1.32, 0.04, 64, 1, true]} />
        <meshStandardMaterial
          color="#a88a62"
          metalness={0.9}
          roughness={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments geometry={wires}>
        <lineBasicMaterial color="#c6b49a" transparent opacity={0.28} />
      </lineSegments>
      {globes.map((g, i) => (
        <group key={i} position={[g.x, g.y, g.z]} userData={{ globe: true }}>
          <mesh geometry={sphere} material={glass} scale={g.r} />
          <mesh geometry={sphere} material={core} scale={g.r * 0.22} />
          <sprite scale={g.r * 9}>
            <spriteMaterial
              map={glow}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              opacity={0.55}
            />
          </sprite>
        </group>
      ))}
    </group>
  );
}

function Dust({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const glow = useMemo(() => makeGlowTexture("rgba(255,240,215,1)", "rgba(220,190,140,0.4)"), []);
  const geo = useMemo(() => {
    const rand = seeded(9);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rand() - 0.5) * 9;
      arr[i * 3 + 1] = (rand() - 0.5) * 6;
      arr[i * 3 + 2] = (rand() - 0.5) * 4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, [count]);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.015;
      ref.current.position.y = Math.sin(clock.getElapsedTime() * 0.2) * 0.1;
    }
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        size={0.06}
        map={glow}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.7}
        color="#e9c48c"
      />
    </points>
  );
}

function Rig() {
  const { camera, pointer } = useThree();
  useFrame(() => {
    camera.position.x += (pointer.x * 0.5 - camera.position.x) * 0.03;
    camera.position.y += (pointer.y * 0.25 + 0.2 - camera.position.y) * 0.03;
    camera.lookAt(0, -0.1, 0);
  });
  return null;
}

export default function HeroScene({
  mobile,
  active,
  onReady,
}: {
  mobile: boolean;
  active: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      dpr={mobile ? [1, 1.5] : [1, 2]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0.2, 6.2], fov: 38 }}
      gl={{ antialias: !mobile, alpha: true, powerPreference: "high-performance" }}
      onCreated={() => onReady?.()}
      aria-hidden
    >
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 0.5, 2]} intensity={6} color="#ffd9a0" distance={10} />
      <Chandelier count={mobile ? 22 : 38} />
      <Dust count={mobile ? 120 : 260} />
      <Rig />
    </Canvas>
  );
}
