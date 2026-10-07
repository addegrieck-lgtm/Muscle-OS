import { ErrorBox, H1 } from "@/components/Shell";
import { CrudList, WorldNav } from "@/components/WorldNav";
import { adminApi } from "@/lib/api";
import { JOURNAL } from "@/lib/worldFields";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const rows = (await adminApi<{ items: Record<string, unknown>[] }>("/world/journal")).items;
    return (
      <>
        <H1>Journal</H1>
        <WorldNav active="/world/journal" />
        <p className="mb-4 text-sm text-muted">Sans date de sortie, un épisode s&apos;affiche « à venir » sur /journal.</p>
        <CrudList path="journal" back="/world/journal" rows={rows} pk="id" fields={JOURNAL} title={(r) => <>{r.episode != null ? `Ép. ${String(r.episode)} — ` : ""}<strong>{String(r.title)}</strong>{r.published ? "" : " (masqué)"}{r.published_at ? "" : " · à venir"}</>} addLabel="Ajouter une entrée" />
      </>
    );
  } catch (e) {
    return <><H1>Journal</H1><WorldNav active="/world/journal" /><ErrorBox message={(e as Error).message} /></>;
  }
}
