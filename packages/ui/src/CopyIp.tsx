"use client";

import { useState } from "react";
import { cn } from "./cn";

/**
 * Bouton « Copier l'IP » avec retour visuel et annonce lecteur d'écran.
 * `onCopied` permet de tracer la conversion (analytics) sans coupler le composant.
 */
export function CopyIpButton({
  ip,
  className,
  compact = false,
  onCopied,
}: {
  ip: string;
  className?: string;
  compact?: boolean;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(ip);
    } catch {
      // Repli pour navigateurs sans API Clipboard (anciens WebViews TikTok/Instagram).
      const ta = document.createElement("textarea");
      ta.value = ip;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    onCopied?.();
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "group inline-flex items-center gap-3 rounded-lg metal-border text-left transition-colors hover:bg-surface-2",
        compact ? "h-11 px-4" : "h-12 px-4",
        className,
      )}
      aria-label={`Copier l'adresse IP ${ip}`}
    >
      <span className="font-mono text-sm font-semibold text-fg">{ip}</span>
      <span className={cn("text-xs font-bold uppercase tracking-wider", copied ? "text-success" : "text-accent")}>
        {copied ? "IP copiée !" : "Copier l'IP"}
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? "Adresse IP copiée dans le presse-papiers" : ""}
      </span>
    </button>
  );
}
