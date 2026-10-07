/** Accordéon FAQ en <details> natif : accessible au clavier, zéro JavaScript. */
export function FaqList({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line">
      {items.map((q) => (
        <details key={q.question} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
            {q.question}
            <span aria-hidden className="text-accent transition-transform group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted">{q.answer}</p>
        </details>
      ))}
    </div>
  );
}
