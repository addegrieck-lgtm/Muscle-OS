import Link from "next/link";
import { Button, Table, buttonClass } from "@vaeloria/ui";
import { CommandForm } from "@/components/Forms";
import { ErrorBox, H1 } from "@/components/Shell";
import { retryCommand } from "@/lib/actions";
import { adminApi } from "@/lib/api";

type Cmd = { id: string; username: string | null; command: string; status: string; source: string; retryCount: number; createdAt: string; executedAt: string | null; error: string | null };
const STATUSES = ["", "PENDING", "SENT", "DELIVERED", "FAILED", "CANCELLED"];
const tone: Record<string, string> = { DELIVERED: "text-success", FAILED: "text-danger", PENDING: "text-warning", SENT: "text-accent" };

export default async function CommandsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status ?? "";
  let items: Cmd[] = [];
  try {
    items = (await adminApi<{ items: Cmd[] }>(`/commands${status ? `?status=${status}` : ""}`)).items;
  } catch (e) {
    return <><H1>Commandes Minecraft</H1><ErrorBox message={(e as Error).message} /></>;
  }
  return (
    <>
      <H1>Commandes Minecraft</H1>
      <p className="-mt-3 mb-6 max-w-2xl text-sm text-muted">File Web → Minecraft. Le plugin VæloriaBridge réserve les commandes, les exécute puis accuse réception. Une commande non confirmée est redistribuée automatiquement.</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => <Link key={s} href={s ? `?status=${s}` : "?"} className={buttonClass(s === status ? "primary" : "secondary", "sm")}>{s || "Toutes"}</Link>)}
      </div>
      <Table head={["Joueur", "Commande", "Statut", "Source", "Essais", "Créée", "Erreur", ""]}>
        {items.map((c) => (
          <tr key={c.id}>
            <td>{c.username ?? "—"}</td>
            <td className="font-mono text-xs">{c.command}</td>
            <td className={tone[c.status] ?? ""}>{c.status}</td>
            <td className="text-muted">{c.source}</td>
            <td>{c.retryCount}</td>
            <td className="text-muted">{new Date(c.createdAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" })}</td>
            <td className="max-w-48 truncate text-xs text-danger" title={c.error ?? ""}>{c.error ?? ""}</td>
            <td>{(c.status === "FAILED" || c.status === "CANCELLED") && <form action={retryCommand.bind(null, c.id)}><Button type="submit" size="sm" variant="secondary">Relancer</Button></form>}</td>
          </tr>
        ))}
      </Table>
      <h2 className="mb-3 mt-10 font-semibold">Commande manuelle</h2>
      <CommandForm />
    </>
  );
}
