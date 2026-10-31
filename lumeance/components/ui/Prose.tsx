/** Mise en forme des contenus éditoriaux et juridiques. */
export function Prose({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`max-w-3xl space-y-5 text-brun/85 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:t-h3 [&_h2]:pt-10 [&_h2]:text-brun [&_h3]:pt-4 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:text-brun [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:font-semibold [&_ul]:space-y-2 ${className}`}
    >
      {children}
    </div>
  );
}

/** Marqueur visible des informations à compléter avant la mise en ligne commerciale. */
export function Todo({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-champagne/15 px-1.5 py-0.5 text-champagne">[À compléter : {children}]</span>
  );
}

export function LegalNotice() {
  return (
    <p className="t-small border-l border-champagne bg-creme/60 px-4 py-3">
      Document de travail : ce contenu doit être complété et validé par un professionnel du droit
      avant l’ouverture de la boutique.
    </p>
  );
}
