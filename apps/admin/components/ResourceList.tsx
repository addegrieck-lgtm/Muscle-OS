import Link from "next/link";
import { Button, EmptyState, Table, buttonClass } from "@vaeloria/ui";
import { adminApi } from "@/lib/api";
import { deleteResource } from "@/lib/actions";
import type { Resource } from "@/lib/resources";
import { ErrorBox, H1 } from "./Shell";

function cell(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });
  return String(v);
}

export async function ResourceList({ resource }: { resource: Resource }) {
  let items: (Record<string, unknown> & { id: string })[] = [];
  let error: string | null = null;
  try {
    items = (await adminApi<{ items: typeof items }>(`/${resource.key}`)).items;
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <>
      <H1 action={<Link href={`/${resource.route}/new`} className={buttonClass("primary", "sm")}>Créer</Link>}>{resource.title}</H1>
      {error ? <ErrorBox message={error} /> : items.length === 0 ? <EmptyState title="Aucun élément" /> : (
        <Table head={[...resource.listColumns.map(([, l]) => l), ""]}>
          {items.map((row) => (
            <tr key={row.id}>
              {resource.listColumns.map(([k], i) => (
                <td key={k}>{i === 0 ? <Link href={`/${resource.route}/${row.id}`} className="font-semibold hover:text-accent">{cell(row[k])}</Link> : <span className="text-muted">{cell(row[k])}</span>}</td>
              ))}
              <td className="text-right">
                <form action={deleteResource.bind(null, resource.key, row.id)}>
                  <Button type="submit" variant="ghost" size="sm" className="text-danger">Supprimer</Button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
