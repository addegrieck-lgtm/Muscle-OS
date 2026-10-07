import Link from "next/link";
import type { ReactNode } from "react";
import type { FactionProfile, GameEvent, NewsArticle, PlayerProfile } from "@vaeloria/types";
import { Badge, Card } from "./Card";
import { cn } from "./cn";
import { formatDate, formatDateTime, formatNumber } from "./format";

export function StatCard({ label, value, hint, className }: { label: string; value: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <Card className={cn("p-4", className)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-subtle">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-fg">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

/** Tête de skin via un rendu public (aucune donnée sensible) — remplaçable par un proxy interne. */
export function skinHead(uuidOrName: string, size = 64) {
  return `https://mc-heads.net/avatar/${encodeURIComponent(uuidOrName)}/${size}`;
}

export function PlayerCard({ player }: { player: Pick<PlayerProfile, "uuid" | "username" | "rank" | "faction"> }) {
  return (
    <Link href={`/joueur/${player.username}`} className="block">
      <Card className="flex items-center gap-4 p-4 transition-colors hover:bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={skinHead(player.uuid, 48)} alt="" width={48} height={48} loading="lazy" className="size-12 rounded-md [image-rendering:pixelated]" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{player.username}</p>
          <p className="truncate text-sm text-muted">
            {player.rank ?? "Joueur"}
            {player.faction ? ` · ${player.faction.name}` : ""}
          </p>
        </div>
      </Card>
    </Link>
  );
}

export function FactionCard({ faction }: { faction: Pick<FactionProfile, "name" | "description" | "power" | "maxPower" | "members" | "rank"> }) {
  return (
    <Link href={`/faction/${faction.name}`} className="block">
      <Card className="p-4 transition-colors hover:bg-surface-2">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-lg font-bold">{faction.name}</p>
          {faction.rank && <Badge tone="accent">#{faction.rank}</Badge>}
        </div>
        {faction.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{faction.description}</p>}
        <p className="mt-3 text-sm text-muted">
          <span className="text-fg tabular-nums">{formatNumber(faction.power)}</span>/{formatNumber(faction.maxPower)} power ·{" "}
          {faction.members.length} membres
        </p>
      </Card>
    </Link>
  );
}

const EVENT_LABEL: Record<GameEvent["type"], string> = {
  koth: "KOTH",
  boss: "Boss",
  tournament: "Tournoi",
  supply_drop: "Supply drop",
  war: "Guerre",
  seasonal: "Saisonnier",
  gold_rush: "Ruée vers l'or",
  siege: "Siège",
  other: "Événement",
};

export const eventTypeLabel = (t: GameEvent["type"]) => EVENT_LABEL[t];

export function EventCard({ event }: { event: GameEvent }) {
  return (
    <Link href={`/evenement/${event.slug}`} className="group block h-full">
      <Card className="flex h-full flex-col gap-2 p-4 transition-colors group-hover:bg-surface-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            {event.live && <Badge tone="danger">En direct</Badge>}
            <Badge tone="accent">{EVENT_LABEL[event.type]}</Badge>
          </span>
          <time dateTime={event.startsAt} className="text-xs text-muted">
            {formatDateTime(event.startsAt)}
          </time>
        </div>
        <p className="font-semibold group-hover:text-accent">{event.title}</p>
        {event.description && <p className="line-clamp-3 text-sm text-muted">{event.description}</p>}
        {(event.participants !== null || event.rewards) && (
          <p className="mt-auto text-xs text-subtle">
            {event.participants !== null && `${event.participants} joueurs${event.empiresCount ? ` · ${event.empiresCount} empires` : ""}`}
            {event.participants !== null && event.rewards ? " · " : ""}
            {event.rewards && `Récompenses : ${event.rewards}`}
          </p>
        )}
      </Card>
    </Link>
  );
}

export function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <Link href={`/news/${article.slug}`} className="group block h-full">
      <Card className="flex h-full flex-col gap-2 p-4 transition-colors group-hover:bg-surface-2">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Badge>{article.category}</Badge>
          <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
        </div>
        <p className="font-semibold group-hover:text-accent">{article.title}</p>
        <p className="line-clamp-3 text-sm text-muted">{article.excerpt}</p>
      </Card>
    </Link>
  );
}
