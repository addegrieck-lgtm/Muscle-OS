import Link from "next/link";
import type { WarView } from "@vaeloria/types";
import { Badge, cn, formatDate, formatNumber } from "@vaeloria/ui";
import { Clock } from "./Clock";
import { Crest } from "./Crest";

const STATUS = { active: { label: "Guerre active", tone: "danger" }, planned: { label: "Déclarée", tone: "warning" }, ended: { label: "Terminée", tone: "neutral" }, cancelled: { label: "Annulée", tone: "neutral" } } as const;

function Side({ side, align, winner }: { side: WarView["attacker"]; align: "left" | "right"; winner: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col items-center gap-2 text-center sm:flex-row sm:gap-3", align === "right" ? "sm:flex-row-reverse sm:text-right" : "sm:text-left")}>
      <Crest crest={side.crest} color={side.color} className="size-14 sm:size-16" />
      <div className="min-w-0">
        <p className={cn("truncate font-display text-lg font-bold uppercase tracking-[0.04em] sm:text-2xl", winner && "text-accent")}>{side.name}</p>
        <p className="text-xs text-subtle tabular-nums">{formatNumber(side.territories)} territoires</p>
      </div>
    </div>
  );
}

/** Carte de guerre : deux empires face à face, score, territoires, participants, horloge. */
export function WarCard({ war, large }: { war: WarView; large?: boolean }) {
  const total = war.attacker.territories + war.defender.territories;
  const share = total ? Math.round((war.attacker.territories / total) * 100) : 50;
  return (
    <Link href={`/guerre/${war.slug}`} className="group block">
      <article className={cn("metal-border rounded-[var(--radius-card)] p-4 transition-colors group-hover:bg-surface-2 sm:p-5", large && "sm:p-7")}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <Badge tone={STATUS[war.status].tone}>{STATUS[war.status].label}</Badge>
          <span className="font-display text-sm font-semibold text-muted">
            {war.status === "active" ? <Clock until={war.endsAt} since={war.startsAt} /> : formatDate(war.startsAt)}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Side side={war.attacker} align="left" winner={war.winner === war.attacker.slug} />
          <div className="flex shrink-0 flex-col items-center">
            <span className="font-display text-xs font-bold tracking-[0.3em] text-subtle">VS</span>
            <span className="mt-1 font-display text-sm font-bold tabular-nums text-fg sm:text-base">{formatNumber(war.attacker.score)} – {formatNumber(war.defender.score)}</span>
          </div>
          <Side side={war.defender} align="right" winner={war.winner === war.defender.slug} />
        </div>
        {total > 0 && (
          <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-surface-2" aria-label={`Territoires : ${war.attacker.territories} contre ${war.defender.territories}`}>
            <span style={{ width: `${share}%`, background: war.attacker.color }} />
            <span style={{ width: `${100 - share}%`, background: war.defender.color }} />
          </div>
        )}
        <p className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-subtle">
          <span>{war.participants > 0 ? `${formatNumber(war.participants)} participants` : war.title}</span>
          <span className="font-display font-semibold uppercase tracking-[0.12em] text-fg group-hover:text-accent">Suivre la guerre →</span>
        </p>
      </article>
    </Link>
  );
}
