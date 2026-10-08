import Link from "next/link";
import type { RankProgress, RankThreshold } from "@vaeloria/types";
import { Badge, ButtonLink, cn } from "@vaeloria/ui";

/** Barre de progression des grades — seuils et noms lus depuis l'API, rien n'est codé en dur. */
export function ProgressBar({ percent, label, className }: { percent: number; label: string; className?: string }) {
  return (
    <div className={cn("h-3 overflow-hidden rounded-sm border border-line bg-surface-2", className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={label}>
      <div className="ruby-fill h-full transition-[width] duration-700" style={{ width: `${percent}%` }} />
    </div>
  );
}

/** Échelle des grades avec repères (affichée aussi aux visiteurs non connectés). */
export function RankLadder({ ranks, points }: { ranks: RankThreshold[]; points: number | null }) {
  const max = Math.max(1, ...ranks.map((r) => r.minPoints));
  return (
    <ol className="relative mt-5 flex justify-between" aria-label="Paliers des grades">
      {ranks.map((r) => {
        const reached = points !== null && points >= r.minPoints;
        return (
          <li key={r.key} className="flex flex-col items-center text-center" style={{ width: `${100 / ranks.length}%` }}>
            <span aria-hidden className={cn("size-2.5 rotate-45", reached ? "bg-ruby" : "border border-line-strong bg-surface")} />
            <span className={cn("mt-2 max-w-full break-words px-0.5 font-display text-[9.5px] font-semibold uppercase leading-tight sm:text-[11px] sm:tracking-[0.1em]", reached ? "text-fg" : "text-subtle")}>{r.name}</span>
            <span className="text-[11px] tabular-nums text-subtle">{r.minPoints} pts</span>
          </li>
        );
      })}
      <span className="sr-only">Seuil maximal : {max} points</span>
    </ol>
  );
}

export function RankProgressCard({ progress, ranks, username, loginHref }: { progress: RankProgress | null; ranks: RankThreshold[]; username?: string | null; loginHref?: string }) {
  const top = progress?.top.rank ?? [...ranks].sort((a, b) => b.minPoints - a.minPoints)[0];
  if (!top) return null;
  return (
    <section aria-labelledby="progression" className="metal-border rounded-[var(--radius-card)] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p id="progression" className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-subtle">
            {username ? `Progression de ${username}` : "Ta progression"}
          </p>
          <p className="mt-1 font-display text-2xl font-bold uppercase tracking-[0.04em] sm:text-3xl">
            {progress?.top.unlocked ? <>{top.name} débloqué</> : top.name}
          </p>
        </div>
        {progress && (
          <p className="font-display text-xl font-bold tabular-nums sm:text-2xl">
            {progress.points} <span className="text-subtle">/ {top.minPoints} points</span>
          </p>
        )}
      </div>

      {progress ? (
        <>
          <ProgressBar percent={progress.top.percent} label={`Progression vers ${top.name}`} className="mt-4" />
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="Grade actuel" value={progress.current.name} />
            <Stat label="Points" value={String(progress.points)} />
            <Stat label="Prochain grade" value={progress.next?.name ?? "—"} />
            <Stat label={progress.next ? "Encore" : "Statut"} value={progress.next ? `${progress.missing} pts (${progress.percent} %)` : "Grade maximal"} />
          </div>
          {progress.next && (
            <p className="mt-4 text-sm text-muted">
              Encore <strong className="text-fg">{progress.missing} point{progress.missing > 1 ? "s" : ""}</strong> pour atteindre <strong className="text-accent">{progress.next.name}</strong>.
            </p>
          )}
        </>
      ) : (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">Chaque euro dépensé rapporte un point. Les grades se débloquent automatiquement aux paliers ci-dessous.</p>
          {loginHref && <ButtonLink href={loginHref} variant="secondary" size="sm">Voir mes points</ButtonLink>}
        </div>
      )}
      <RankLadder ranks={ranks} points={progress?.points ?? null} />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-surface-2/60 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">{label}</p>
      <p className="mt-0.5 font-display font-semibold uppercase tracking-[0.04em] text-fg">{value}</p>
    </div>
  );
}

export function RankBadge({ name }: { name: string }) {
  return <Badge tone="accent">{name}</Badge>;
}

export function LinkMinecraftHint() {
  return (
    <p className="text-sm text-muted">
      Lie ton compte Minecraft depuis <Link href="/compte" className="text-accent underline">ton compte</Link> pour suivre tes points.
    </p>
  );
}
