import { EmptyState, Table } from "@vaeloria/ui";
import { dt } from "@/components/ShopNav";
import { ErrorBox, H1 } from "@/components/Shell";
import { WorldForm } from "@/components/WorldForm";
import { WorldNav } from "@/components/WorldNav";
import { adminApi } from "@/lib/api";
import { REJECT } from "@/lib/worldFields";

export const dynamic = "force-dynamic";
type R = { code: string; status: string; createdAt: string; qualifiedAt: string | null; rejectReason: string | null; referredUserId: string; referrerToday: number };

export default async function Page() {
  try {
    const rows = (await adminApi<{ items: R[] }>("/world/referrals")).items;
    return (
      <>
        <H1>Parrainages</H1>
        <WorldNav active="/world/referrals" />
        <p className="mb-4 text-sm text-muted">Un parrainage n&apos;est « validé » (et ne rapporte de l&apos;influence) que lorsque la recrue lie un compte Minecraft jamais utilisé pour un autre parrainage. Au-delà de 25 inscriptions par jour, un parrain est automatiquement refusé.</p>
        {rows.length === 0 ? <EmptyState title="Aucun parrainage" /> : (
          <Table head={["Code", "Statut", "Inscription", "Validation", "Parrain (aujourd'hui)", ""]}>
            {rows.map((r) => (
              <tr key={r.referredUserId}>
                <td className="font-mono">{r.code}</td>
                <td>{r.status}{r.rejectReason ? <span className="block text-xs text-muted">{r.rejectReason}</span> : null}</td>
                <td className="text-muted">{dt(r.createdAt)}</td>
                <td className="text-muted">{dt(r.qualifiedAt)}</td>
                <td className={r.referrerToday > 10 ? "text-warning" : "text-muted"}>{r.referrerToday}</td>
                <td className="min-w-64">{r.status === "pending" && <details><summary className="cursor-pointer text-sm text-danger">Rejeter</summary><div className="mt-2"><WorldForm path={`referrals/${r.referredUserId}/reject`} method="POST" fields={REJECT} row={null} back="/world/referrals" submit="Rejeter" /></div></details>}</td>
              </tr>
            ))}
          </Table>
        )}
      </>
    );
  } catch (e) {
    return <><H1>Parrainages</H1><WorldNav active="/world/referrals" /><ErrorBox message={(e as Error).message} /></>;
  }
}
