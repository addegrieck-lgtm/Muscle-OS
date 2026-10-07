import { StatCard, Table, formatNumber, formatPrice } from "@vaeloria/ui";
import { ErrorBox, H1 } from "@/components/Shell";
import { adminApi } from "@/lib/api";

type Dashboard = {
  kpi: Record<string, number>;
  servers: { server: string; online: number; maxPlayers: number; tps: number | null; mspt: number | null; version: string; updatedAt: string; fresh: boolean }[];
  events: { id: string; title: string; type: string; startsAt: string }[];
};

export default async function DashboardPage() {
  let d: Dashboard;
  try {
    d = await adminApi<Dashboard>("/dashboard");
  } catch (e) {
    return <><H1>Tableau de bord</H1><ErrorBox message={(e as Error).message} /></>;
  }
  const k = d.kpi;
  return (
    <>
      <H1>Tableau de bord</H1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Joueurs en ligne" value={formatNumber(k.onlinePlayers!)} />
        <StatCard label="Nouveaux (24 h)" value={formatNumber(k.newPlayers24h!)} hint={`${formatNumber(k.newPlayers7d!)} sur 7 jours`} />
        <StatCard label="Actifs (7 j)" value={formatNumber(k.activePlayers7d!)} />
        <StatCard label="Inscrits bêta" value={formatNumber(k.betaSignups!)} />
        <StatCard label="Revenus (30 j)" value={formatPrice(k.revenue30dCents!)} hint={`${k.orders30d} commandes`} />
        <StatCard label="Commandes MC en attente" value={k.pendingCommands} />
        <StatCard label="Commandes MC en échec" value={<span className={k.failedCommands ? "text-danger" : ""}>{k.failedCommands}</span>} />
        <StatCard label="Erreurs bridge (24 h)" value={<span className={k.bridgeErrors24h ? "text-danger" : ""}>{k.bridgeErrors24h}</span>} hint={`${k.openIncidents} incident(s) ouvert(s)`} />
      </div>
      <h2 className="mb-3 mt-10 font-semibold">Serveurs</h2>
      {d.servers.length === 0 ? <p className="text-sm text-muted">Aucun heartbeat reçu du plugin VæloriaBridge.</p> : (
        <Table head={["Serveur", "État", "Joueurs", "TPS", "MSPT", "Version", "Dernier signal"]}>
          {d.servers.map((s) => (
            <tr key={s.server}>
              <td className="font-semibold">{s.server}</td>
              <td className={s.fresh ? "text-success" : "text-danger"}>{s.fresh ? "En ligne" : "Silencieux"}</td>
              <td>{s.online}/{s.maxPlayers}</td>
              <td className={s.tps !== null && s.tps < 18 ? "text-warning" : ""}>{s.tps ?? "—"}</td>
              <td>{s.mspt ?? "—"}</td>
              <td className="text-muted">{s.version}</td>
              <td className="text-muted">{new Date(s.updatedAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</td>
            </tr>
          ))}
        </Table>
      )}
      <h2 className="mb-3 mt-10 font-semibold">Prochains événements</h2>
      <ul className="space-y-1 text-sm">
        {d.events.length ? d.events.map((e) => <li key={e.id}><span className="text-muted">{new Date(e.startsAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</span> — {e.title} ({e.type})</li>) : <li className="text-muted">Aucun.</li>}
      </ul>
    </>
  );
}
