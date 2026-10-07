import Link from "next/link";
import type { PollView } from "@vaeloria/types";
import { cn, formatNumber } from "@vaeloria/ui";

/** Résultats d'un sondage (barres), sans interaction : utilisé sur l'accueil et l'historique. */
export function PollResults({ poll, highlight }: { poll: PollView; highlight?: string | null }) {
  const max = Math.max(...poll.options.map((o) => o.votes), 0);
  return (
    <ul className="space-y-2">
      {poll.options.map((o) => (
        <li key={o.id}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className={cn("font-semibold", highlight === o.id && "text-accent")}>{o.label}{highlight === o.id && " · ton vote"}</span>
            <span className="tabular-nums text-muted">{o.percent} %</span>
          </div>
          <div className="h-2 overflow-hidden rounded-sm bg-surface-2">
            <div className={cn("h-full", o.votes === max && max > 0 ? "ruby-fill" : "bg-line-strong")} style={{ width: `${o.percent}%` }} />
          </div>
        </li>
      ))}
      <li className="pt-1 text-xs text-subtle">{formatNumber(poll.totalVotes)} vote{poll.totalVotes > 1 ? "s" : ""}{poll.status === "closed" ? " · vote terminé" : ""}</li>
    </ul>
  );
}

export function PollTeaser({ poll }: { poll: PollView }) {
  return (
    <Link href="/conseil" className="group block">
      <div className="metal-border rounded-[var(--radius-card)] p-5 transition-colors group-hover:bg-surface-2">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-accent">Vote en cours</p>
        <p className="mt-2 font-display text-xl font-bold uppercase tracking-[0.04em]">{poll.question}</p>
        <div className="mt-4"><PollResults poll={poll} /></div>
        <p className="mt-4 font-display text-xs font-semibold uppercase tracking-[0.14em] group-hover:text-accent">Voter au Conseil →</p>
      </div>
    </Link>
  );
}
