"use client";

import { useEffect, useState } from "react";
import { isChunkLoadError, reloadOnChunkError } from "@/lib/chunk-reload";

export default function StoreError({ error, reset }: { error: Error; reset: () => void }) {
  // Nouvelle version du site publiée pendant la visite : rechargement automatique.
  const [reloading, setReloading] = useState(() => isChunkLoadError(error));
  useEffect(() => {
    if (!reloadOnChunkError(error)) setReloading(false);
  }, [error]);

  return (
    <div className="container-luxe flex min-h-[70svh] flex-col items-center justify-center pt-24 text-center">
      {reloading ? (
        <p className="t-small text-brun/60">Mise à jour du site…</p>
      ) : (
        <>
          <p className="t-eyebrow text-champagne">Incident</p>
          <h1 className="t-h2 mt-4">Un instant, la lumière revient.</h1>
          <p className="mt-4 max-w-md text-brun/70">
            Une erreur inattendue est survenue. Merci de réessayer.
          </p>
          <button
            type="button"
            onClick={() => (isChunkLoadError(error) ? window.location.reload() : reset())}
            className="t-eyebrow mt-10 border border-brun/30 px-8 py-4 hover:border-brun"
          >
            Réessayer
          </button>
        </>
      )}
    </div>
  );
}
