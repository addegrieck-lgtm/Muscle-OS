import Link from "next/link";
import { KpiCard, Rise } from "@/components/admin/motion";
import { Card, Flash, PageTitle, flashFrom } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/auth/admin";
import type { Alert, Mover } from "@/lib/seo/report";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateReportNow } from "./actions";

export const metadata = { title: "Rapports SEO" };

interface ReportData {
  gsc: {
    clicks: number;
    clicksBefore: number;
    impressions: number;
    impressionsBefore: number;
    position: number | null;
    positionBefore: number | null;
  } | null;
  drops: Mover[];
  gains: Mover[];
  losses: Mover[];
  keywords: { keyword: string; now: number | null; before: number | null }[];
  audit: { score: number; errors: number; pages: number };
  products: { average: number; supplierGaps: number };
  linking: { edges: number; orphans: number };
  backlinks: { obtained: number; lost: number; rechecked: number };
  journal: { published: number; review: number; scheduledSoon: number };
  alerts: Alert[];
}
interface Report {
  id: string;
  created_at: string;
  period_start: string;
  period_end: string;
  trigger: "manuel" | "planifie";
  alerts: number;
  data: ReportData;
}

const LEVEL: Record<Alert["level"], string> = {
  critique: "border-red-800 bg-[#f2dcd6]/60",
  attention: "border-champagne bg-[#f3e6cc]/60",
  info: "border-brun/20 bg-white/60",
};
const day = (d: string) => new Date(d).toLocaleDateString("fr-FR", { dateStyle: "medium" });
const pos = (p: number | null) =>
  p === null ? "—" : p.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

function MoverList({ items, empty }: { items: Mover[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-brun/55">{empty}</p>;
  return (
    <ul className="divide-y divide-brun/10 text-sm">
      {items.map((m) => (
        <li key={m.key} className="flex justify-between gap-4 py-2">
          <span className="truncate">{m.key}</span>
          <span className="shrink-0 tabular-nums text-brun/65">
            {pos(m.before)} → {pos(m.now)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("seo_reports")
    .select("id, created_at, period_start, period_end, trigger, alerts, data")
    .order("created_at", { ascending: false })
    .limit(26);
  const reports = (data as Report[] | null) ?? [];
  const r = reports.find((x) => x.id === sp.id) ?? reports[0];
  const d = r?.data;

  return (
    <>
      <PageTitle
        title="Rapports SEO"
        subtitle="Chaque semaine : évolutions Google, santé du site et alertes, à partir de données réelles"
        actions={
          <form action={generateReportNow}>
            <SubmitButton>Générer maintenant</SubmitButton>
          </form>
        }
      />
      <Flash {...flashFrom(sp)} />
      {error && (
        <Flash error="Les rapports ne sont pas encore installés : exécutez la migration 20261113000100_seo_reports.sql dans Supabase." />
      )}
      {!r ? (
        <Card>
          <p className="text-sm text-brun/60">
            Aucun rapport pour l’instant. Cliquez sur « Générer maintenant » ; le rapport
            hebdomadaire automatique se règle dans GitHub (voir docs/SEO.md).
          </p>
        </Card>
      ) : (
        <>
          <p className="-mt-4 mb-6 text-xs text-brun/55">
            Semaine du {day(r.period_start)} au {day(r.period_end)} · généré le{" "}
            {new Date(r.created_at).toLocaleString("fr-FR", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Europe/Paris",
            })}{" "}
            ({r.trigger === "planifie" ? "automatique" : "à la demande"})
          </p>

          <Rise>
            <Card title={`Alertes (${d!.alerts.length})`}>
              {d!.alerts.length === 0 ? (
                <p className="text-sm text-brun/60">Rien à signaler cette semaine.</p>
              ) : (
                <ul className="space-y-2">
                  {d!.alerts.map((a, k) => (
                    <li key={k} className={`border-l-2 px-3 py-2 text-sm ${LEVEL[a.level]}`}>
                      <span className="mr-2 text-[0.65rem] uppercase tracking-[0.14em]">
                        {a.level}
                      </span>
                      {a.text}
                      {a.href && (
                        <Link href={a.href} className="ml-2 text-xs underline underline-offset-4">
                          Voir
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </Rise>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {d!.gsc ? (
              <>
                <KpiCard
                  label="Clics Google (7 j)"
                  value={d!.gsc.clicks}
                  previous={d!.gsc.clicksBefore}
                />
                <KpiCard
                  label="Impressions (7 j)"
                  value={d!.gsc.impressions}
                  previous={d!.gsc.impressionsBefore}
                  delay={120}
                />
              </>
            ) : (
              <Card title="Google">
                <p className="text-sm text-brun/55">Non renseigné (Search Console non connecté).</p>
              </Card>
            )}
            <KpiCard label="Score d’audit du site" value={d!.audit.score} delay={240} />
            <KpiCard label="Score moyen des fiches" value={d!.products.average} delay={360} />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Card title="Recherches en recul">
              <MoverList items={d!.drops} empty="Aucun recul notable (3 places ou plus)." />
            </Card>
            <Card title="Recherches en progrès">
              <MoverList items={d!.gains} empty="Aucun gain notable pour l’instant." />
            </Card>
            <Card title="Mots-clés suivis">
              {d!.keywords.length === 0 ? (
                <p className="text-sm text-brun/55">Non renseigné cette semaine.</p>
              ) : (
                <MoverList
                  items={d!.keywords.map((k) => ({
                    key: k.keyword,
                    before: k.before,
                    now: k.now,
                    impressions: 0,
                    clicksNow: 0,
                    clicksBefore: 0,
                  }))}
                  empty=""
                />
              )}
            </Card>
          </div>

          <Card title="Santé du site" className="mt-6">
            <ul className="grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-3">
              <li>
                Pages auditées : {d!.audit.pages} · erreurs : {d!.audit.errors}
              </li>
              <li>
                Liens internes : {d!.linking.edges} · pages orphelines : {d!.linking.orphans}
              </li>
              <li>
                Liens externes obtenus : {d!.backlinks.obtained} · perdus : {d!.backlinks.lost} (
                {d!.backlinks.rechecked} revérifié(s))
              </li>
              <li>Articles en ligne : {d!.journal.published}</li>
              <li>
                À relire : {d!.journal.review} · programmés sous 7 jours :{" "}
                {d!.journal.scheduledSoon}
              </li>
              <li>Informations produit à demander : {d!.products.supplierGaps}</li>
            </ul>
          </Card>
        </>
      )}

      {reports.length > 1 && (
        <Card title="Historique" className="mt-6">
          <ul className="divide-y divide-brun/10 text-sm">
            {reports.map((x) => (
              <li key={x.id} className="flex flex-wrap justify-between gap-3 py-2">
                <Link
                  href={`/admin/rapports?id=${x.id}`}
                  className={x.id === r?.id ? "font-medium" : "hover:underline"}
                >
                  Semaine du {day(x.period_start)} au {day(x.period_end)}
                </Link>
                <span className="text-brun/55">
                  {x.alerts} alerte(s) · score {x.data.audit.score}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
