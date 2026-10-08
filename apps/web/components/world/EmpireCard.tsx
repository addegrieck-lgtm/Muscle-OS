import Link from "next/link";
import type { EmpireCard as Empire } from "@vaeloria/types";
import { Badge, formatNumber } from "@vaeloria/ui";
import { Crest } from "./Crest";

export function EmpireCard({ empire }: { empire: Empire }) {
  return (
    <Link href={`/empire/${empire.slug}`} className="group block h-full">
      <article className="metal-border flex h-full flex-col rounded-[var(--radius-card)] p-4 transition-colors group-hover:bg-surface-2">
        <div className="flex items-start gap-3">
          <Crest crest={empire.crest} color={empire.color} className="size-14" />
          <div className="min-w-0">
            <p className="font-display text-xl font-bold uppercase leading-tight tracking-[0.04em] group-hover:text-accent">{empire.name}</p>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-subtle">[{empire.tag}] · Empire</p>
          </div>
          <span className="ml-auto font-display text-lg font-bold text-accent">#{empire.rank}</span>
        </div>
        {empire.motto && <p className="mt-3 line-clamp-2 text-sm italic text-muted">« {empire.motto} »</p>}
        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
          <div><dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">Membres</dt><dd className="font-display text-lg font-bold tabular-nums">{formatNumber(empire.members)}</dd></div>
          <div><dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">Territoires</dt><dd className="font-display text-lg font-bold tabular-nums">{formatNumber(empire.territories)}</dd></div>
          <div><dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">Influence</dt><dd className="font-display text-lg font-bold tabular-nums">{formatNumber(empire.influence)}</dd></div>
        </dl>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {empire.wars.active > 0 && <Badge tone="danger">En guerre</Badge>}
          {empire.recruiting && <Badge tone="success">Recrute</Badge>}
          {empire.wars.won > 0 && <Badge>{empire.wars.won} victoire{empire.wars.won > 1 ? "s" : ""}</Badge>}
        </div>
        <span className="mt-4 font-display text-xs font-semibold uppercase tracking-[0.14em] text-fg group-hover:text-accent">Voir l&apos;empire →</span>
      </article>
    </Link>
  );
}
