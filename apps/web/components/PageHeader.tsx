import type { ReactNode } from "react";
import Link from "next/link";
import { Container } from "@vaeloria/ui";
import { JsonLd, breadcrumbLd } from "@/lib/seo";

/** En-tête de page standard avec fil d'Ariane (visible + JSON-LD). */
export function PageHeader({ title, eyebrow, description, crumbs, children }: { title: string; eyebrow?: string; description?: ReactNode; crumbs: { name: string; path: string }[]; children?: ReactNode }) {
  const all = [{ name: "Accueil", path: "/" }, ...crumbs];
  return (
    <div className="hero-backdrop border-b border-line/60">
      <Container className="py-10 sm:py-16">
        <JsonLd data={breadcrumbLd(all)} />
        <nav aria-label="Fil d'Ariane" className="mb-4 text-xs text-subtle">
          <ol className="flex flex-wrap items-center gap-1.5">
            {all.map((c, i) => (
              <li key={c.path} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden>/</span>}
                {i < all.length - 1 ? <Link href={c.path} className="hover:text-fg">{c.name}</Link> : <span aria-current="page" className="text-muted">{c.name}</span>}
              </li>
            ))}
          </ol>
        </nav>
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-bold tracking-wide sm:text-5xl">{title}</h1>
        {description && <p className="mt-4 max-w-2xl text-base text-muted sm:text-lg">{description}</p>}
        {children && <div className="mt-6">{children}</div>}
      </Container>
    </div>
  );
}
