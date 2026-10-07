import Link from "next/link";
import type { ReactNode } from "react";
import type { Leaderboard as LeaderboardData } from "@vaeloria/types";
import { cn } from "./cn";
import { EmptyState } from "./Card";
import { formatNumber } from "./format";

export function Table({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={cn("-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <table className="w-full min-w-[420px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="border-b border-line px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-subtle">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:border-b [&_td]:border-line/60 [&_td]:px-3 [&_td]:py-2.5">{children}</tbody>
      </table>
    </div>
  );
}

const podium = ["text-accent", "text-zinc-300", "text-amber-700"];

export function LeaderboardTable({
  board,
  unit,
  hrefFor,
}: {
  board: LeaderboardData | null;
  unit: string;
  hrefFor: (id: string, name: string) => string;
}) {
  if (!board || board.entries.length === 0) {
    return <EmptyState title="Classement vide pour l'instant">Il se remplira dès les premières parties de la saison.</EmptyState>;
  }
  return (
    <Table head={["#", "Nom", unit]}>
      {board.entries.map((e) => (
        <tr key={e.id}>
          <td className={cn("w-12 font-bold tabular-nums", podium[e.rank - 1] ?? "text-muted")}>{e.rank}</td>
          <td>
            <Link href={hrefFor(e.id, e.name)} className="font-semibold hover:text-accent">
              {e.name}
            </Link>
            {e.secondary && <span className="ml-2 text-xs text-subtle">{e.secondary}</span>}
          </td>
          <td className="text-right font-semibold tabular-nums">{formatNumber(e.value)}</td>
        </tr>
      ))}
    </Table>
  );
}
