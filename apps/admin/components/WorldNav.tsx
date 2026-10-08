import Link from "next/link";
import { Button } from "@vaeloria/ui";
import type { Field } from "@/lib/resources";
import { deleteWorld } from "@/lib/worldActions";
import { WorldForm } from "./WorldForm";

const LINKS = [
  ["/world", "Fondateurs & réglages"], ["/world/empires", "Empires"], ["/world/wars", "Guerres"], ["/world/polls", "Conseil"], ["/world/votes", "Votes"],
  ["/world/journal", "Journal"], ["/world/roadmap", "Roadmap"], ["/world/zones", "Carte"], ["/world/influence", "Influence"], ["/world/referrals", "Parrainages"],
] as const;

export function WorldNav({ active }: { active: string }) {
  return (
    <nav className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-line pb-2" aria-label="Monde">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={active === href ? "page" : undefined} className={`shrink-0 rounded-md px-3 py-1.5 text-sm ${active === href ? "bg-surface-2 text-fg" : "text-muted hover:text-fg"}`}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Liste éditable : chaque ligne se déplie en formulaire ; un bloc « Ajouter » en bas. */
export function CrudList({ path, back, rows, pk, title, fields, canDelete = true, addLabel = "Ajouter" }: {
  path: string; back: string; rows: Record<string, unknown>[]; pk: string; title: (r: Record<string, unknown>) => React.ReactNode; fields: Field[]; canDelete?: boolean; addLabel?: string | null;
}) {
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const id = encodeURIComponent(String(r[pk]));
        return (
          <details key={id} className="rounded-md border border-line bg-surface p-3">
            <summary className="cursor-pointer text-sm">{title(r)}</summary>
            <div className="mt-3 space-y-3">
              <WorldForm path={`${path}/${id}`} method="PUT" fields={fields} row={r} back={back} />
              {canDelete && (
                <form action={deleteWorld.bind(null, `${path}/${id}`, back)}>
                  <Button type="submit" variant="ghost" size="sm" className="text-danger">Supprimer</Button>
                </form>
              )}
            </div>
          </details>
        );
      })}
      {addLabel && (
        <details className="rounded-md border border-dashed border-line p-3">
          <summary className="cursor-pointer text-sm font-semibold">{addLabel}</summary>
          <div className="mt-3"><WorldForm path={path} method="POST" fields={fields} row={null} back={back} submit="Créer" /></div>
        </details>
      )}
    </div>
  );
}
