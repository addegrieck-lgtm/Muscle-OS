import { ErrorBox, H1 } from "@/components/Shell";
import { WorldForm } from "@/components/WorldForm";
import { CrudList, WorldNav } from "@/components/WorldNav";
import { adminApi } from "@/lib/api";
import { WAR, WAR_EVENT } from "@/lib/worldFields";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const rows = (await adminApi<{ items: Record<string, unknown>[] }>("/world/wars")).items;
    return (
      <>
        <H1>Guerres</H1>
        <WorldNav active="/world/wars" />
        <p className="mb-4 text-sm text-muted">Les guerres synchronisées par le serveur (WAR_START / WAR_END) apparaissent ici automatiquement. Passer une guerre en « terminée » avec un vainqueur attribue l&apos;influence de victoire une seule fois.</p>
        <CrudList path="wars" back="/world/wars" rows={rows} pk="slug" fields={WAR} canDelete={false} addLabel="Déclarer une guerre"
          title={(r) => <><strong>{String(r.title)}</strong> · {String(r.attacker)} vs {String(r.defender)} · {String(r.status)} · source {String(r.source)}</>} />
        {rows.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 font-semibold">Ajouter un fait à la chronologie</h2>
            <div className="space-y-2">
              {rows.filter((r) => r.status === "active" || r.status === "planned").map((r) => (
                <details key={String(r.slug)} className="rounded-md border border-line bg-surface p-3">
                  <summary className="cursor-pointer text-sm">{String(r.title)}</summary>
                  <div className="mt-3"><WorldForm path={`wars/${String(r.slug)}/events`} method="POST" fields={WAR_EVENT} row={null} back="/world/wars" submit="Publier" /></div>
                </details>
              ))}
            </div>
          </div>
        )}
      </>
    );
  } catch (e) {
    return <><H1>Guerres</H1><WorldNav active="/world/wars" /><ErrorBox message={(e as Error).message} /></>;
  }
}
