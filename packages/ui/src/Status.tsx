import type { ServerStatus, ServiceStatus } from "@vaeloria/types";
import { cn } from "./cn";
import { formatNumber } from "./format";

type Tone = "up" | "warn" | "down" | "unknown";

const dot: Record<Tone, string> = {
  up: "bg-success shadow-[0_0_0_4px_rgb(74_222_128/0.15)]",
  warn: "bg-warning",
  down: "bg-danger",
  unknown: "bg-subtle",
};

export function StatusIndicator({ tone, label, className }: { tone: Tone; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm font-semibold", className)}>
      <span aria-hidden className={cn("size-2.5 rounded-full", dot[tone])} />
      {label}
    </span>
  );
}

export function serverTone(status: ServerStatus | null): { tone: Tone; label: string } {
  switch (status?.state) {
    case "online":
      return { tone: "up", label: "Serveur en ligne" };
    case "maintenance":
      return { tone: "warn", label: "Maintenance" };
    case "offline":
      return { tone: "down", label: "Serveur hors ligne" };
    default:
      return { tone: "unknown", label: "Statut indisponible" };
  }
}

export function serviceTone(state: ServiceStatus["state"]): { tone: Tone; label: string } {
  return {
    operational: { tone: "up" as const, label: "Opérationnel" },
    degraded: { tone: "warn" as const, label: "Dégradé" },
    down: { tone: "down" as const, label: "Hors service" },
    unknown: { tone: "unknown" as const, label: "Inconnu" },
  }[state];
}

/** Bandeau « serveur en ligne · N joueurs ». N'affiche jamais de chiffre inventé. */
export function ServerStatusLine({ status, className }: { status: ServerStatus | null; className?: string }) {
  const { tone, label } = serverTone(status);
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", className)}>
      <StatusIndicator tone={tone} label={label} />
      {status?.state === "online" && status.online !== null && (
        <span className="text-sm text-muted">
          <strong className="text-fg tabular-nums">{formatNumber(status.online)}</strong> joueur{status.online > 1 ? "s" : ""} en ligne
        </span>
      )}
    </div>
  );
}
