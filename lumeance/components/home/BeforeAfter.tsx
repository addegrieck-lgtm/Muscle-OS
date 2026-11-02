"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Éteint / allumé : la même pièce, curseur à faire glisser. La partie « éteinte » est une
 * simulation (même image assombrie), signalée comme telle.
 */
export function BeforeAfter({ image, name }: { image: string; name: string }) {
  const [x, setX] = useState(50);
  return (
    <section className="bg-noir py-24 text-ivoire md:py-36" aria-labelledby="ba-title">
      <div className="container-luxe grid items-center gap-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="t-eyebrow text-champagne">Éteint, allumé</p>
          <h2 id="ba-title" className="t-h2 mt-6">
            Un luminaire se juge aussi allumé.
          </h2>
          <p className="mt-6 text-ivoire/70">
            Faites glisser le curseur : éteinte, la pièce dessine la silhouette ; allumée, elle
            transforme l’atmosphère. Ici, {name}.
          </p>
          <p className="t-small mt-4 text-ivoire/40">Simulation à partir d’une visualisation 3D.</p>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden md:col-span-7 md:col-start-6 md:aspect-[5/4]">
          <Image
            src={image}
            alt={`${name}, allumé`}
            fill
            sizes="(min-width: 768px) 55vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - x}% 0 0)` }}>
            <Image
              src={image}
              alt=""
              fill
              sizes="(min-width: 768px) 55vw, 100vw"
              className="object-cover brightness-[0.2] saturate-[0.3]"
            />
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-champagne"
            style={{ left: `${x}%` }}
          />
          <span className="t-eyebrow absolute left-4 top-4 text-ivoire/60">Éteint</span>
          <span className="t-eyebrow absolute right-4 top-4 text-champagne-clair">Allumé</span>
          <input
            type="range"
            min={0}
            max={100}
            value={x}
            onChange={(e) => setX(Number(e.target.value))}
            aria-label="Comparer éteint et allumé"
            className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
          />
        </div>
      </div>
    </section>
  );
}
