import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("metal-border rounded-[var(--radius-card)] p-5", className)} {...props} />;
}

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-surface-2 text-muted border-line",
    accent: "bg-accent/10 text-accent border-accent/30",
    success: "bg-success/10 text-success border-success/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    danger: "bg-danger/10 text-danger border-danger/30",
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-display text-xs font-semibold uppercase tracking-[0.12em]", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)} {...props} />;
}

export function Section({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("py-14 sm:py-20", className)} {...props} />;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Tag className={cn("font-display font-bold uppercase tracking-[0.04em] text-fg", Tag === "h1" ? "text-3xl sm:text-5xl" : "text-2xl sm:text-3xl")}>{title}</Tag>
        {description && <p className="mt-3 text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Losange rubis — motif repris du logo complet. */
export function Diamond({ className }: { className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 rotate-45 bg-gradient-to-b from-ruby to-ruby-deep", className)} />;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("mb-2 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.25em] text-accent", className)}>
      <Diamond className="size-1.5" />
      {children}
    </p>
  );
}

/** Filet argent — losange — filet argent (séparateur du logo complet). */
export function Ornament({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex items-center gap-3", className)}>
      <span className="h-px w-16 bg-subtle/60" />
      <Diamond />
      <span className="h-px w-16 bg-subtle/60" />
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong px-5 py-10 text-center">
      <p className="font-semibold text-fg">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-surface-2", className)} />;
}
