import { Card } from "@vaeloria/ui";
import { ErrorBox, H1 } from "@/components/Shell";
import { WorldForm } from "@/components/WorldForm";
import { CrudList, WorldNav } from "@/components/WorldNav";
import { adminApi } from "@/lib/api";
import { MILESTONE, SETTINGS } from "@/lib/worldFields";

export const dynamic = "force-dynamic";

export default async function WorldSettingsPage() {
  try {
    const [settings, milestones] = await Promise.all([
      adminApi<Record<string, unknown> & { foundersCount: number; foundersCap: number }>("/world/settings"),
      adminApi<{ items: Record<string, unknown>[] }>("/world/milestones").then((r) => r.items),
    ]);
    return (
      <>
        <H1>Le monde</H1>
        <WorldNav active="/world" />
        <Card className="mb-8 space-y-4">
          <p className="text-sm">Fondateurs attribués : <strong className="tabular-nums">{settings.foundersCount}</strong> / {settings.foundersCap}. Les numéros sont définitifs et jamais réattribués.</p>
          <WorldForm path="settings" method="PUT" fields={SETTINGS} row={settings} back="/world" />
        </Card>
        <h2 className="mb-1 font-semibold">Paliers des fondateurs</h2>
        <p className="mb-3 text-sm text-muted">La « révélation » n&apos;est publiée qu&apos;une fois le palier atteint.</p>
        <CrudList path="milestones" back="/world" rows={milestones} pk="threshold" fields={MILESTONE} title={(r) => <><strong className="tabular-nums">{String(r.threshold)}</strong> — {String(r.title)}</>} addLabel="Ajouter un palier" />
      </>
    );
  } catch (e) {
    return <><H1>Le monde</H1><WorldNav active="/world" /><ErrorBox message={(e as Error).message} /></>;
  }
}
