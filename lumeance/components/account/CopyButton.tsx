"use client";

import { useState } from "react";

/** Copie un texte (lien de parrainage) dans le presse-papiers. */
export function CopyButton({ text, label = "Copier" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="t-eyebrow border border-brun/25 px-4 py-2 hover:border-brun"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          /* presse-papiers indisponible : le texte reste sélectionnable */
        }
      }}
    >
      {done ? "Copié" : label}
    </button>
  );
}
