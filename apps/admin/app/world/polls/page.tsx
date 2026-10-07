import { ErrorBox, H1 } from "@/components/Shell";
import { CrudList, WorldNav } from "@/components/WorldNav";
import { adminApi } from "@/lib/api";
import { POLL } from "@/lib/worldFields";

export const dynamic = "force-dynamic";
type Opt = { label: string; votes: number };

export default async function Page() {
  try {
    const rows = (await adminApi<{ items: (Record<string, unknown> & { options: Opt[] })[] }>("/world/polls")).items;
    return (
      <>
        <H1>Conseil</H1>
        <WorldNav active="/world/polls" />
        <p className="mb-4 text-sm text-muted">Un vote par compte. Les choix sont verrouillés dès le premier vote pour ne pas fausser les résultats.</p>
        <CrudList path="polls" back="/world/polls" rows={rows} pk="id" fields={POLL} canDelete={false} addLabel="Nouveau vote"
          title={(r) => {
            const opts = r.options as Opt[];
            return <><strong>{String(r.question)}</strong> · {String(r.status)} · {opts.reduce((n, o) => n + Number(o.votes), 0)} vote(s) — {opts.map((o) => `${o.label} ${o.votes}`).join(" / ")}</>;
          }} />
      </>
    );
  } catch (e) {
    return <><H1>Conseil</H1><WorldNav active="/world/polls" /><ErrorBox message={(e as Error).message} /></>;
  }
}
