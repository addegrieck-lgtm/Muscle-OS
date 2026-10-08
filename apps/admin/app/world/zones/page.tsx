import { ErrorBox, H1 } from "@/components/Shell";
import { CrudList, WorldNav } from "@/components/WorldNav";
import { adminApi } from "@/lib/api";
import { ZONE } from "@/lib/worldFields";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const rows = (await adminApi<{ items: Record<string, unknown>[] }>("/world/zones")).items;
    return (
      <>
        <H1>Carte</H1>
        <WorldNav active="/world/zones" />
        <p className="mb-4 text-sm text-muted">Zones fixes de /monde, en coordonnées de blocs. Les territoires des empires viennent des claims synchronisés par le serveur.</p>
        <CrudList path="zones" back="/world/zones" rows={rows} pk="id" fields={ZONE} title={(r) => <><strong>{String(r.name)}</strong> · {String(r.kind)} · ({String(r.x1)}, {String(r.z1)}) → ({String(r.x2)}, {String(r.z2)}){r.active ? "" : " (masquée)"}</>} addLabel="Ajouter une zone" />
      </>
    );
  } catch (e) {
    return <><H1>Carte</H1><WorldNav active="/world/zones" /><ErrorBox message={(e as Error).message} /></>;
  }
}
