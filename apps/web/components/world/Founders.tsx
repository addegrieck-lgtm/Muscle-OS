import type { FounderStats } from "@vaeloria/types";
import { cn, formatNumber } from "@vaeloria/ui";

/** Compteur des fondateurs — chiffre réel issu de l'API, jamais simulé. */
export function FounderCounter({ stats, className }: { stats: FounderStats; className?: string }) {
  const pct = Math.min(100, (stats.count / stats.cap) * 100);
  return (
    <div className={className}>
      <p className="font-display text-5xl font-bold tabular-nums sm:text-7xl">
        <span className="metal-text">{formatNumber(stats.count)}</span>
        <span className="text-subtle"> / {formatNumber(stats.cap)}</span>
      </p>
      <p className="mt-1 font-display text-xs font-semibold uppercase tracking-[0.3em] text-muted">Fondateurs</p>
      <div className="mt-5 h-3 overflow-hidden rounded-sm border border-line bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={stats.cap} aria-valuenow={stats.count} aria-label="Places de fondateur attribuées">
        <div className="ruby-fill h-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function MilestoneTrack({ stats }: { stats: FounderStats }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.milestones.map((m) => (
        <li key={m.threshold} className={cn("rounded-[var(--radius-card)] border p-4", m.reached ? "border-ruby/50 bg-ruby/10" : "border-line")}>
          <p className="flex items-center gap-2 font-display text-2xl font-bold tabular-nums">
            <span aria-hidden className={cn("size-2.5 rotate-45", m.reached ? "bg-ruby" : "border border-line-strong")} />
            {formatNumber(m.threshold)}
          </p>
          <p className="mt-1 font-display text-sm font-semibold uppercase tracking-[0.08em]">{m.title}</p>
          <p className="mt-1 text-sm text-muted">{m.description}</p>
          {m.reached && m.reveal && <p className="mt-2 text-sm text-fg">{m.reveal}</p>}
          <p className="mt-2 text-xs text-subtle">{m.reached ? "Palier atteint" : `Encore ${formatNumber(Math.max(0, m.threshold - stats.count))} fondateurs`}</p>
        </li>
      ))}
    </ol>
  );
}
