import { ErrorBox, H1 } from "@/components/Shell";
import { CrudList, WorldNav } from "@/components/WorldNav";
import { adminApi } from "@/lib/api";
import { EMPIRE } from "@/lib/worldFields";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const rows = (await adminApi<{ items: Record<string, unknown>[] }>("/world/empires")).items;
    return (
      <>
        <H1>Empires</H1>
        <WorldNav active="/world/empires" />
        <p className="mb-4 text-sm text-muted">{rows.length} empire(s). Renommer un nom offensant, bannir, ou lier la faction en jeu pour synchroniser territoires et guerres.</p>
        <CrudList path="empires" back="/world/empires" rows={rows} pk="slug" fields={EMPIRE} canDelete={false} addLabel={null}
          title={(r) => <><strong>{String(r.name)}</strong> [{String(r.tag)}] · {String(r.members)} membres · {String(r.influence)} influence · {String(r.status)}{r.factionName ? ` · faction ${String(r.factionName)}` : ""}</>} />
      </>
    );
  } catch (e) {
    return <><H1>Empires</H1><WorldNav active="/world/empires" /><ErrorBox message={(e as Error).message} /></>;
  }
}
