import Link from "next/link";
import { EmptyState, Table } from "@vaeloria/ui";
import { ErrorBox, H1 } from "@/components/Shell";
import { adminApi } from "@/lib/api";

type Row = { uuid: string; username: string; rank: string | null; online: boolean; lastSeenAt: string | null; discord: string | null; faction: string | null };

export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  let items: Row[] = [];
  let error: string | null = null;
  if (q.length >= 2) {
    try {
      items = (await adminApi<{ items: Row[] }>(`/players?q=${encodeURIComponent(q)}`)).items;
    } catch (e) {
      error = (e as Error).message;
    }
  }
  return (
    <>
      <H1>Joueurs</H1>
      <form className="mb-6 flex max-w-xl gap-2">
        <input name="q" defaultValue={q} placeholder="Pseudo (actuel ou ancien), UUID, Discord, faction…" className="field" aria-label="Recherche" />
        <button className="rounded-lg bg-accent px-4 text-sm font-semibold text-accent-contrast">Chercher</button>
      </form>
      {error && <ErrorBox message={error} />}
      {q.length >= 2 && !error && (items.length === 0 ? <EmptyState title="Aucun résultat" /> : (
        <Table head={["Pseudo", "UUID", "Faction", "Discord", "Rang", "Statut"]}>
          {items.map((p) => (
            <tr key={p.uuid}>
              <td><Link href={`/players/${p.uuid}`} className="font-semibold hover:text-accent">{p.username}</Link></td>
              <td className="font-mono text-xs text-muted">{p.uuid}</td>
              <td>{p.faction ?? "—"}</td>
              <td>{p.discord ?? "—"}</td>
              <td>{p.rank ?? "—"}</td>
              <td className={p.online ? "text-success" : "text-muted"}>{p.online ? "En ligne" : "Hors ligne"}</td>
            </tr>
          ))}
        </Table>
      ))}
    </>
  );
}
