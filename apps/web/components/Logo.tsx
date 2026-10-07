/** Emblème VÆLORIA : écu + lame, en SVG inline (zéro requête). */
export function Emblem({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className} fill="none">
      <defs>
        <linearGradient id="vae-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#8a8a93" />
        </linearGradient>
      </defs>
      <path d="M16 2 4 6v9c0 7.2 5 12.6 12 15 7-2.4 12-7.8 12-15V6L16 2Z" stroke="url(#vae-metal)" strokeWidth="1.6" />
      <path d="M16 7v16m-4-4 4 4 4-4M12.5 11h7" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <Emblem />
      <span className="metal-text font-display text-lg font-bold tracking-[0.18em]">VÆLORIA</span>
    </span>
  );
}
