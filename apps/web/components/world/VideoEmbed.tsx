"use client";

import { useState } from "react";

const youtubeId = (url: string) => url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/)?.[1] ?? null;

/** Vidéo chargée seulement au clic (aucun tiers contacté avant : performance et vie privée). */
export function VideoEmbed({ url, title, thumbnail }: { url: string; title: string; thumbnail: string | null }) {
  const [on, setOn] = useState(false);
  const id = youtubeId(url);
  if (!id)
    return <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent">Regarder la vidéo →</a>;
  if (on)
    return (
      <div className="aspect-video overflow-hidden rounded-[var(--radius-card)] border border-line">
        <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="size-full" />
      </div>
    );
  return (
    <button type="button" onClick={() => setOn(true)} className="group relative block aspect-video w-full overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface-2">
      {thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnail} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-70 transition-opacity group-hover:opacity-90" />
      )}
      <span className="ruby-fill absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-2xl">▶</span>
      <span className="sr-only">Lire la vidéo : {title}</span>
    </button>
  );
}
