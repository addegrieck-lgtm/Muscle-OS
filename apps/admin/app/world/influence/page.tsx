import { Button } from "@vaeloria/ui";
import { ErrorBox, H1 } from "@/components/Shell";
import { CrudList, WorldNav } from "@/components/WorldNav";
import { adminApi } from "@/lib/api";
import { INFLUENCE } from "@/lib/worldFields";
import { rebuildInfluence } from "@/lib/worldActions";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const rows = (await adminApi<{ items: Record<string, unknown>[] }>("/world/influence")).items;
    return (
      <>
        <H1>Influence</H1>
        <WorldNav active="/world/influence" />
        <p className="mb-4 text-sm text-muted">Chaque gain est journalisé avec une clé d&apos;idempotence : impossible d&apos;en obtenir deux fois pour la même action. Les modifications s&apos;appliquent aux gains futurs.</p>
        <CrudList path="influence" back="/world/influence" rows={rows} pk="kind" fields={INFLUENCE} canDelete={false} addLabel={null}
          title={(r) => <><strong>{String(r.label)}</strong> · {String(r.points)} pts{r.dailyCap ? ` · max ${String(r.dailyCap)}/jour` : ""}{r.oncePerUser ? " · une fois" : ""}{r.active ? "" : " · désactivée"}</>} />
        <form action={rebuildInfluence} className="mt-6">
          <Button type="submit" variant="secondary" size="sm">Recalculer les totaux (joueurs et empires) depuis le journal</Button>
        </form>
      </>
    );
  } catch (e) {
    return <><H1>Influence</H1><WorldNav active="/world/influence" /><ErrorBox message={(e as Error).message} /></>;
  }
}
