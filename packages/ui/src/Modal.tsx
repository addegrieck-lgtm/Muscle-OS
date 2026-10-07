"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Modal basée sur <dialog> natif : focus trap, Échap et accessibilité fournis par le navigateur. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={title}
      className="m-auto w-[min(92vw,32rem)] rounded-[var(--radius-card)] border border-line bg-surface p-0 text-fg backdrop:bg-black/70"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="rounded p-1 text-muted hover:text-fg" aria-label="Fermer">
          ✕
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
