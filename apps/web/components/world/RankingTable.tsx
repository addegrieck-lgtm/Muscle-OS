import Link from "next/link";
import type { RankingEntry } from "@vaeloria/types";
import { EmptyState, Table, formatNumber } from "@vaeloria/ui";

export function RankingTable({ entries, unit, limit }: { entries: RankingEntry[] | null; unit: string; limit?: number }) {
  if (!entries) return <EmptyState title="Classement momentanément indisponible" />;
  if (!entries.length) return <EmptyState title="Classement vide pour l'instant">Il se remplira dès les premières données réelles.</EmptyState>;
  return (
    <Table head={["#", "Nom", unit]}>
      {entries.slice(0, limit).map((e) => (
        <tr key={`${e.rank}-${e.name}`}>
          <td className="w-12 font-bold tabular-nums text-accent">{e.rank}</td>
          <td>
            <span className="flex items-center gap-2">
              {e.color && <span aria-hidden className="size-2.5 shrink-0 rotate-45" style={{ background: e.color }} />}
              {e.href ? <Link href={e.href} className="font-semibold hover:text-accent">{e.name}</Link> : <span className="font-semibold">{e.name}</span>}
            </span>
            {e.secondary && <span className="block text-xs text-subtle">{e.secondary}</span>}
          </td>
          <td className="text-right font-semibold tabular-nums">{formatNumber(e.value)}</td>
        </tr>
      ))}
    </Table>
  );
}
