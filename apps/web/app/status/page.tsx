import { Badge, Card, Container, EmptyState, Section, StatusIndicator, formatDateTime, serverTone, serviceTone } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { api, orNull } from "@/lib/api";
import { pageMeta } from "@/lib/seo";

export const revalidate = 30;
export const metadata = pageMeta({ title: "Statut des services", description: "État en temps réel du site, de l'API, du serveur Minecraft, de la base de données et du bot Discord VÆLORIA.", path: "/status" });

const SEVERITY = { minor: "warning", major: "danger", critical: "danger", maintenance: "neutral" } as const;
const INCIDENT_STATUS = { investigating: "Analyse en cours", identified: "Cause identifiée", monitoring: "Surveillance", resolved: "Résolu" };

export default async function StatusPage() {
  const [data, server] = await Promise.all([orNull(api.services()), orNull(api.serverStatus())]);
  const overall = serverTone(server);
  return (
    <>
      <PageHeader eyebrow="Statut" title="État des services" crumbs={[{ name: "Statut", path: "/status" }]}>
        <StatusIndicator tone={overall.tone} label={overall.label} className="text-base" />
      </PageHeader>
      <Section>
        <Container className="max-w-3xl space-y-10">
          {!data ? (
            <Card>
              <StatusIndicator tone="down" label="API injoignable" />
              <p className="mt-2 text-sm text-muted">Le site fonctionne mais ne parvient pas à joindre l&apos;API. Les données affichées peuvent être incomplètes. Suivez les annonces sur Discord.</p>
            </Card>
          ) : (
            <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line">
              {data.services.map((s) => {
                const t = serviceTone(s.state);
                return (
                  <li key={s.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div>
                      <p className="font-semibold">{s.label}</p>
                      {(s.detail || s.latencyMs !== null) && <p className="text-xs text-subtle">{[s.detail, s.latencyMs !== null ? `${s.latencyMs} ms` : null].filter(Boolean).join(" · ")}</p>}
                    </div>
                    <StatusIndicator tone={t.tone} label={t.label} />
                  </li>
                );
              })}
            </ul>
          )}
          <div>
            <h2 className="mb-3 font-display text-xl font-bold">Incidents des 30 derniers jours</h2>
            {data?.incidents.length ? (
              <ul className="space-y-3">
                {data.incidents.map((i) => (
                  <li key={i.id}>
                    <Card>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={SEVERITY[i.severity]}>{i.severity === "maintenance" ? "Maintenance" : i.severity}</Badge>
                        <Badge tone={i.status === "resolved" ? "success" : "warning"}>{INCIDENT_STATUS[i.status]}</Badge>
                      </div>
                      <p className="mt-2 font-semibold">{i.title}</p>
                      {i.body && <p className="mt-1 text-sm text-muted">{i.body}</p>}
                      <p className="mt-2 text-xs text-subtle">Début : {formatDateTime(i.startedAt)}{i.resolvedAt ? ` · Résolu : ${formatDateTime(i.resolvedAt)}` : ""}</p>
                    </Card>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Aucun incident signalé" />
            )}
          </div>
        </Container>
      </Section>
    </>
  );
}
