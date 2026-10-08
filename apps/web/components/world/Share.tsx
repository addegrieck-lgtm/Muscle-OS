"use client";

import { useState } from "react";
import { buttonClass } from "@vaeloria/ui";
import { track } from "@/lib/track";

/** Partage natif (mobile) ou copie du lien, avec événement analytics optionnel. */
export function ShareButton({ url, title, label = "Partager", trackId, className }: { url: string; title: string; label?: string; trackId?: string; className?: string }) {
  const [done, setDone] = useState(false);
  async function share() {
    const full = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    if (trackId) track("share_empire", { id: trackId });
    try {
      if (navigator.share) return await navigator.share({ title, url: full });
      await navigator.clipboard.writeText(full);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      /* partage annulé */
    }
  }
  return (
    <button type="button" onClick={share} className={buttonClass("secondary", "md", className)}>
      {done ? "Lien copié" : label}
    </button>
  );
}

export function CopyField({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-subtle">{label}</p>
      <div className="flex gap-2">
        <input readOnly value={value} aria-label={label} onFocus={(e) => e.currentTarget.select()} className="h-10 min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-3 font-mono text-sm text-fg" />
        <button type="button" onClick={() => navigator.clipboard.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 2000); })} className="shrink-0 rounded-md border border-line-strong px-3 text-sm font-semibold hover:border-fg">
          {done ? "Copié" : "Copier"}
        </button>
      </div>
    </div>
  );
}
