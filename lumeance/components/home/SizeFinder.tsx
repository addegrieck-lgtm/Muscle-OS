"use client";

import { Price } from "@/components/account/AccountProvider";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { SizeSuggestion } from "@/lib/content/home";

/**
 * « Quelle taille pour ma pièce ? » : à partir de la surface, les versions dont la surface
 * conseillée par le fabricant correspond (une version par pièce, la plus proche).
 */
export function SizeFinder({ items }: { items: SizeSuggestion[] }) {
  const [m2, setM2] = useState(15);
  const matches = useMemo(() => {
    const best = new Map<string, SizeSuggestion>();
    for (const it of items) {
      if (m2 < it.min || m2 > it.max) continue;
      const prev = best.get(it.slug);
      const mid = (x: SizeSuggestion) => Math.abs((x.min + x.max) / 2 - m2);
      if (!prev || mid(it) < mid(prev)) best.set(it.slug, it);
    }
    return [...best.values()].sort((a, b) => a.price - b.price).slice(0, 4);
  }, [items, m2]);
  if (!items.length) return null;
  return (
    <section className="bg-creme py-24 md:py-36" aria-labelledby="size-title">
      <div className="container-luxe grid gap-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="t-eyebrow text-champagne">Guide</p>
          <h2 id="size-title" className="t-h2 mt-6">
            Quelle taille pour ma pièce ?
          </h2>
          <p className="mt-6 text-brun/75">
            Indiquez la surface à éclairer : nous vous proposons les versions conseillées par nos
            fabricants.
          </p>
          <label className="mt-10 block">
            <span className="t-eyebrow text-brun/60">Surface de la pièce</span>
            <span className="mt-3 block font-serif text-5xl">{m2} m²</span>
            <input
              type="range"
              min={4}
              max={45}
              value={m2}
              onChange={(e) => setM2(Number(e.target.value))}
              className="mt-4 w-full accent-[var(--color-champagne)]"
              aria-valuetext={`${m2} mètres carrés`}
            />
          </label>
        </div>
        <ul className="grid gap-6 sm:grid-cols-2 md:col-span-7 md:col-start-6" aria-live="polite">
          {matches.length === 0 && (
            <li className="text-brun/70">
              Aucune version n’est indiquée pour cette surface par nos fabricants.{" "}
              <Link href="/contact" className="underline underline-offset-4">
                Demandez-nous conseil
              </Link>
              .
            </li>
          )}
          {matches.map((m) => (
            <li key={m.slug}>
              <Link href={`/produit/${m.slug}`} className="group flex gap-5">
                <div className="relative aspect-[4/5] w-28 shrink-0 overflow-hidden bg-noir">
                  {m.image && (
                    <Image src={m.image} alt="" fill sizes="112px" className="object-cover" />
                  )}
                </div>
                <div>
                  <h3 className="font-serif text-2xl group-hover:text-champagne">{m.name}</h3>
                  <p className="t-small mt-1 text-brun/65">{m.version}</p>
                  <p className="t-small text-brun/50">
                    Conseillée de {m.min} à {m.max} m²
                  </p>
                  <p className="mt-3 font-serif text-xl">
                    <Price cents={m.price} />
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
