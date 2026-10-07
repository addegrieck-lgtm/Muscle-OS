import { ErrorBox, H1 } from "@/components/Shell";
import { CrudList, WorldNav } from "@/components/WorldNav";
import { adminApi } from "@/lib/api";
import { ROADMAP } from "@/lib/worldFields";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const rows = (await adminApi<{ items: Record<string, unknown>[] }>("/world/roadmap")).items;
    return (
      <>
        <H1>Roadmap</H1>
        <WorldNav active="/world/roadmap" />
        <p className="mb-4 text-sm text-muted">Une seule étape devrait être « en cours ». L&apos;ordre définit la frise de /roadmap.</p>
        <CrudList path="roadmap" back="/world/roadmap" rows={rows} pk="key" fields={ROADMAP} title={(r) => <>{String(r.position)}. <strong>{String(r.title)}</strong> · {({ done: "terminé", current: "en cours", upcoming: "à venir" } as Record<string, string>)[String(r.status)]}</>} addLabel="Ajouter une étape" />
      </>
    );
  } catch (e) {
    return <><H1>Roadmap</H1><WorldNav active="/world/roadmap" /><ErrorBox message={(e as Error).message} /></>;
  }
}
