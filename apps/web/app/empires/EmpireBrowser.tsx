"use client";

import { useEffect, useMemo, useState } from "react";
import type { EmpireCard as Empire } from "@vaeloria/types";
import { EmptyState, cn } from "@vaeloria/ui";
import { EmpireCard } from "@/components/world/EmpireCard";

const SORTS = { influence: "Influence", members: "Membres", territories: "Territoires", recent: "Plus récents" } as const;
type Sort = keyof typeof SORTS;

/** Recherche, filtres et tri des empires, sur la liste mise en cache côté serveur. */
export function EmpireBrowser({ empires }: { empires: Empire[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("influence");
  const [recruiting, setRecruiting] = useState(false);
  const [atWar, setAtWar] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("recrute") === "1") setRecruiting(true);
  }, []);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = empires.filter((e) => (!needle || e.name.toLowerCase().includes(needle) || e.tag.toLowerCase().includes(needle)) && (!recruiting || e.recruiting) && (!atWar || e.wars.active > 0));
    const key: Record<Sort, (e: Empire) => number> = { influence: (e) => e.influence, members: (e) => e.members, territories: (e) => e.territories, recent: (e) => Date.parse(e.createdAt) };
    return [...out].sort((a, b) => key[sort](b) - key[sort](a) || a.rank - b.rank);
  }, [empires, q, sort, recruiting, atWar]);

  const chip = (on: boolean) => cn("h-9 shrink-0 rounded-md border px-3 text-sm font-semibold", on ? "border-ruby bg-ruby/15 text-fg" : "border-line text-muted hover:text-fg");
  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un empire ou un tag" aria-label="Rechercher un empire" className="h-10 w-full rounded-md border border-line bg-surface-2 px-3 text-fg lg:max-w-xs" />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <button type="button" aria-pressed={recruiting} onClick={() => setRecruiting(!recruiting)} className={chip(recruiting)}>Recrute</button>
          <button type="button" aria-pressed={atWar} onClick={() => setAtWar(!atWar)} className={chip(atWar)}>En guerre</button>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted lg:ml-auto">
          Trier par
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 rounded-md border border-line bg-surface-2 px-2 text-fg">
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      {list.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{list.map((e) => <EmpireCard key={e.slug} empire={e} />)}</div>
      ) : (
        <EmptyState title={empires.length ? "Aucun empire ne correspond" : "Aucun empire n'a encore été fondé"}>{empires.length ? "Essaie une autre recherche." : "Sois le premier à graver ton nom."}</EmptyState>
      )}
    </div>
  );
}
