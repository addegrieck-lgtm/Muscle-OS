import Link from "next/link";
import { AreaChart, BarList, Donut, KpiCard, Rise } from "@/components/admin/motion";
import { Card, Flash, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { siteUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Statistiques" };

interface Traffic {
  views: number;
  visitors: number;
  prev_views: number;
  prev_visitors: number;
  daily: { day: string; views: number; visitors: number }[];
  pages: { path: string; views: number; visitors: number }[];
  sources: { source: string; views: number }[];
  referrers: { referrer_host: string; views: number }[];
  devices: { device: string; views: number }[];
  countries: { country: string; views: number }[];
}

const PERIODS = [7, 30, 90, 365];
const SOURCE_LABELS: Record<string, string> = {
  direct: "Accès direct",
  search: "Moteurs de recherche",
  social: "Réseaux sociaux",
  site: "Autres sites",
  other: "Autres",
};
const DEVICE_LABELS: Record<string, string> = {
  desktop: "Ordinateur",
  mobile: "Mobile",
  tablet: "Tablette",
};
const countryName = (c: string) => {
  try {
    return new Intl.DisplayNames(["fr"], { type: "region" }).of(c) ?? c;
  } catch {
    return c;
  }
};
const dayLabel = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const days = PERIODS.includes(Number(sp.jours)) ? Number(sp.jours) : 30;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_traffic_stats", { p_days: days });
  const t = (data ?? null) as Traffic | null;

  return (
    <>
      <PageTitle
        title="Statistiques"
        subtitle="Mesure d’audience interne, sans cookie ni donnée personnelle"
        actions={
          <div className="flex gap-1">
            {PERIODS.map((d) => (
              <Link
                key={d}
                href={`/admin/stats?jours=${d}`}
                className={`px-3 py-1.5 text-xs uppercase tracking-[0.12em] ${d === days ? "bg-brun text-ivoire" : "border border-brun/15"}`}
              >
                {d === 365 ? "1 an" : `${d} j`}
              </Link>
            ))}
          </div>
        }
      />
      <Flash
        error={
          error
            ? "Statistiques indisponibles : collez la migration supabase/migrations/20261105000100_page_views.sql dans Supabase → SQL Editor."
            : undefined
        }
      />
      {t && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Pages vues" value={t.views} previous={t.prev_views} />
            <KpiCard label="Visiteurs" value={t.visitors} previous={t.prev_visitors} delay={120} />
            <KpiCard
              label="Pages par visite"
              value={t.visitors ? Math.round((t.views / t.visitors) * 10) / 10 : 0}
              format="decimal"
              delay={240}
            />
            <KpiCard
              label="Venus de Google & co"
              value={
                t.views
                  ? Math.round(
                      ((t.sources.find((s) => s.source === "search")?.views ?? 0) / t.views) * 100,
                    )
                  : 0
              }
              format="percent"
              delay={360}
            />
          </div>

          <Rise>
            <Card
              title="Fréquentation"
              actions={<span className="text-xs text-brun/50">— pages vues · - - visiteurs</span>}
            >
              <AreaChart
                points={t.daily.map((d) => ({
                  label: dayLabel(d.day),
                  value: d.views,
                  secondary: d.visitors,
                }))}
              />
            </Card>
          </Rise>

          <div className="grid gap-6 xl:grid-cols-2">
            <Rise delay={100}>
              <Card title="Pages les plus vues">
                <BarList
                  items={t.pages.map((p) => ({
                    label: p.path,
                    value: p.views,
                    href: `${siteUrl}${p.path}`,
                  }))}
                />
              </Card>
            </Rise>
            <Rise delay={200}>
              <Card title="D’où viennent les visiteurs">
                <Donut
                  items={t.sources.map((s) => ({
                    label: SOURCE_LABELS[s.source] ?? s.source,
                    value: s.views,
                  }))}
                />
                <div className="mt-6">
                  <BarList
                    items={t.referrers.map((r) => ({ label: r.referrer_host, value: r.views }))}
                  />
                </div>
              </Card>
            </Rise>
            <Rise delay={100}>
              <Card title="Appareils">
                <Donut
                  items={t.devices.map((d) => ({
                    label: DEVICE_LABELS[d.device] ?? d.device,
                    value: d.views,
                  }))}
                />
              </Card>
            </Rise>
            <Rise delay={200}>
              <Card title="Pays">
                <BarList
                  items={t.countries.map((c) => ({
                    label: countryName(c.country),
                    value: c.views,
                  }))}
                />
              </Card>
            </Rise>
          </div>
          <p className="text-xs text-brun/45">
            Les robots, les pages d’administration et les navigateurs qui demandent à ne pas être
            suivis ne sont pas comptés. Un visiteur est compté une fois par jour ; aucune adresse IP
            n’est conservée ; les données sont effacées après 13 mois.
          </p>
        </div>
      )}
    </>
  );
}
