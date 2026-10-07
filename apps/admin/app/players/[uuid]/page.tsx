import { Card, Table, formatPrice } from "@vaeloria/ui";
import { ErrorBox, H1 } from "@/components/Shell";
import { adminApi } from "@/lib/api";

type Detail = {
  player: Record<string, unknown> & { username: string; uuid: string };
  history: { username: string; seenAt: string }[];
  orders: { publicId: string; status: string; totalCents: number; createdAt: string }[];
  commands: { id: string; command: string; status: string; source: string; createdAt: string; error: string | null }[];
  audit: { action: string; actorType: string; createdAt: string }[];
  stats: { season: string; kills: number; deaths: number; koth_captures: number; playtime_seconds: number }[];
};

const dt = (v: string) => new Date(v).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });

export default async function PlayerDetail({ params }: { params: Promise<{ uuid: string }> }) {
  let d: Detail;
  try {
    d = await adminApi<Detail>(`/players/${(await params).uuid}`);
  } catch (e) {
    return <ErrorBox message={(e as Error).message} />;
  }
  return (
    <>
      <H1>{d.player.username}</H1>
      <p className="-mt-4 mb-6 font-mono text-xs text-muted">{d.player.uuid}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold">Profil</h2>
          <dl className="grid grid-cols-2 gap-1 text-sm">
            {(["rank", "online", "first_seen_at", "last_seen_at", "last_server", "balance", "playtime_seconds"] as const).map((k) => (
              <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd>{String(d.player[k] ?? "—")}</dd></div>
            ))}
          </dl>
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold">Historique des pseudos</h2>
          <ul className="text-sm">{d.history.map((h) => <li key={h.username}>{h.username} <span className="text-muted">— {dt(h.seenAt)}</span></li>)}</ul>
        </Card>
      </div>
      <h2 className="mb-2 mt-8 font-semibold">Statistiques par saison</h2>
      <Table head={["Saison", "Kills", "Morts", "KOTH", "Temps (h)"]}>
        {d.stats.map((s) => <tr key={s.season}><td>{s.season}</td><td>{s.kills}</td><td>{s.deaths}</td><td>{s.koth_captures}</td><td>{Math.round(s.playtime_seconds / 3600)}</td></tr>)}
      </Table>
      <h2 className="mb-2 mt-8 font-semibold">Transactions</h2>
      {d.orders.length ? (
        <Table head={["Commande", "Statut", "Montant", "Date"]}>
          {d.orders.map((o) => <tr key={o.publicId}><td className="font-mono">{o.publicId}</td><td>{o.status}</td><td>{formatPrice(o.totalCents)}</td><td>{dt(o.createdAt)}</td></tr>)}
        </Table>
      ) : <p className="text-sm text-muted">Aucune.</p>}
      <h2 className="mb-2 mt-8 font-semibold">Commandes Minecraft</h2>
      {d.commands.length ? (
        <Table head={["Commande", "Statut", "Source", "Date", "Erreur"]}>
          {d.commands.map((c) => <tr key={c.id}><td className="font-mono text-xs">{c.command}</td><td>{c.status}</td><td>{c.source}</td><td>{dt(c.createdAt)}</td><td className="text-danger">{c.error ?? ""}</td></tr>)}
        </Table>
      ) : <p className="text-sm text-muted">Aucune.</p>}
      <h2 className="mb-2 mt-8 font-semibold">Sanctions & journal</h2>
      {d.audit.length ? <ul className="text-sm">{d.audit.map((a, i) => <li key={i}>{dt(a.createdAt)} — {a.action} ({a.actorType})</li>)}</ul> : <p className="text-sm text-muted">Aucune entrée. (Les sanctions seront synchronisées par le plugin — voir docs/MINECRAFT_INTEGRATION.md)</p>}
    </>
  );
}
