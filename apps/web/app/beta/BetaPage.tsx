import { BRAND } from "@vaeloria/config";
import { Card, Container, Section, formatDate, formatNumber } from "@vaeloria/ui";
import { Countdown } from "@/components/Countdown";
import { PageHeader } from "@/components/PageHeader";
import { api, orNull } from "@/lib/api";
import { pageMeta } from "@/lib/seo";
import type { ReactNode } from "react";

export const betaMeta = pageMeta({ title: "Saison I — lancement & inscription bêta", description: "Inscris-toi à la bêta de VÆLORIA et sois prévenu de l'ouverture de la Saison I.", path: "/beta" });

const FEATURES = ["Factions, claims et Power", "PvP inspiré du 1.8 en 1.21", "KOTH programmés", "Classements en direct sur le site", "Économie et spawners", "Saison classée avec récompenses"];

export async function BetaPage({ form }: { form: ReactNode }) {
  const [seasons, stats] = await Promise.all([orNull(api.season()), orNull(api.stats())]);
  const upcoming = seasons?.upcoming ?? null;
  return (
    <>
      <PageHeader eyebrow="Saison I — Lancement" title={BRAND.tagline} description="Inscris-toi pour être prévenu de l'ouverture et participer aux tests." crumbs={[{ name: "Bêta", path: "/beta" }]}>
        {upcoming && (
          <div className="space-y-3">
            <p className="text-sm text-muted">Ouverture prévue le <strong className="text-fg">{formatDate(upcoming.startsAt)}</strong></p>
            <Countdown target={upcoming.startsAt} label="Avant l'ouverture" />
          </div>
        )}
      </PageHeader>
      <Section>
        <Container className="grid gap-8 md:grid-cols-[1.2fr_1fr]">
          <Card className="p-6">
            <h2 className="mb-4 font-display text-xl font-bold">Inscription</h2>
            {form}
            {stats && stats.betaSignups >= 50 && <p className="mt-4 text-sm text-muted">Déjà <strong className="text-fg">{formatNumber(stats.betaSignups)}</strong> inscrits.</p>}
          </Card>
          <div>
            <h2 className="mb-3 font-semibold">Au programme</h2>
            <ul className="space-y-2 text-muted">
              {FEATURES.map((f) => <li key={f} className="flex gap-2"><span aria-hidden className="text-accent">◆</span>{f}</li>)}
            </ul>
          </div>
        </Container>
      </Section>
    </>
  );
}
