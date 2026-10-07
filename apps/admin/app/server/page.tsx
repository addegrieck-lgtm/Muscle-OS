import { Badge, Button, Card } from "@vaeloria/ui";
import { IncidentForm } from "@/components/Forms";
import { ErrorBox, H1 } from "@/components/Shell";
import { resolveIncident, setMaintenance } from "@/lib/actions";
import { adminApi } from "@/lib/api";

type Incident = { id: string; title: string; severity: string; status: string; body: string; started_at: string; resolved_at: string | null };

export default async function ServerPage() {
  let maintenance = false;
  let incidents: Incident[] = [];
  try {
    [maintenance, incidents] = await Promise.all([
      adminApi<{ enabled: boolean }>("/settings/maintenance").then((r) => r.enabled),
      adminApi<{ items: Incident[] }>("/incidents").then((r) => r.items),
    ]);
  } catch (e) {
    return <><H1>Serveur</H1><ErrorBox message={(e as Error).message} /></>;
  }
  return (
    <>
      <H1>Serveur</H1>
      <Card className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-semibold">Mode maintenance</p>
          <p className="text-sm text-muted">Affiche « Maintenance » sur le site et l&apos;API publique.</p>
        </div>
        <form action={setMaintenance.bind(null, !maintenance)}>
          <Button type="submit" variant={maintenance ? "primary" : "secondary"}>{maintenance ? "Désactiver la maintenance" : "Activer la maintenance"}</Button>
        </form>
      </Card>
      <h2 className="mb-3 font-semibold">Nouvel incident</h2>
      <IncidentForm />
      <h2 className="mb-3 mt-10 font-semibold">Incidents</h2>
      <ul className="space-y-2">
        {incidents.map((i) => (
          <li key={i.id}>
            <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="flex gap-2"><Badge>{i.severity}</Badge><Badge tone={i.resolved_at ? "success" : "warning"}>{i.status}</Badge></div>
                <p className="mt-1 font-semibold">{i.title}</p>
              </div>
              {!i.resolved_at && (
                <form action={resolveIncident.bind(null, i.id, i.title, i.severity, i.body)}><Button type="submit" size="sm" variant="secondary">Marquer résolu</Button></form>
              )}
            </Card>
          </li>
        ))}
        {incidents.length === 0 && <li className="text-sm text-muted">Aucun incident.</li>}
      </ul>
      <p className="mt-10 text-sm text-muted">Factions, économie, KOTH et saison : données synchronisées par le plugin. Leur pilotage depuis l&apos;admin arrive avec la Phase 12 complète.</p>
    </>
  );
}
