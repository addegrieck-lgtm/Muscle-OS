export function AccordionItem({
  title,
  children,
  open = false,
}: {
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details className="group border-b border-brun/10 py-1" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
        <span className="t-eyebrow">{title}</span>
        <span aria-hidden className="relative h-3 w-3">
          <span className="absolute left-0 top-1/2 h-px w-3 bg-brun" />
          <span className="absolute left-1/2 top-0 h-3 w-px bg-brun transition-transform duration-500 group-open:scale-y-0" />
        </span>
      </summary>
      <div className="pb-6 text-brun/80">{children}</div>
    </details>
  );
}
