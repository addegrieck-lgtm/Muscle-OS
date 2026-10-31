"use client";

export default function StoreError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-luxe flex min-h-[70svh] flex-col items-center justify-center pt-24 text-center">
      <p className="t-eyebrow text-champagne">Incident</p>
      <h1 className="t-h2 mt-4">Un instant, la lumière revient.</h1>
      <p className="mt-4 max-w-md text-brun/70">
        Une erreur inattendue est survenue. Merci de réessayer.
      </p>
      <button
        type="button"
        onClick={reset}
        className="t-eyebrow mt-10 border border-brun/30 px-8 py-4 hover:border-brun"
      >
        Réessayer
      </button>
    </div>
  );
}
