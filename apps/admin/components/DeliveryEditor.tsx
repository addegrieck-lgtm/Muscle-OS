"use client";

import { useState } from "react";
import { Button } from "@vaeloria/ui";

type Row = { action: string; command: string | null; requireOnline: boolean };
const ACTIONS: [string, string][] = [
  ["GRANT_RANK", "Donner un grade"], ["GIVE_KIT", "Donner un kit"], ["GIVE_ITEM", "Donner un item"], ["GIVE_SPAWNER", "Donner un spawner"],
  ["COMMAND", "Commande libre"], ["ADD_POINTS", "Notifier les points (plugin)"], ["SYNC_PLAYER", "Synchroniser le joueur (plugin)"],
];
const NO_COMMAND = new Set(["ADD_POINTS", "SYNC_PLAYER"]);

/** Éditeur des actions de livraison d'un produit (sérialisées en JSON dans le formulaire). */
export function DeliveryEditor({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const update = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div>
      <input type="hidden" name="deliveries" value={JSON.stringify(rows.map((r) => ({ ...r, command: NO_COMMAND.has(r.action) ? null : r.command })))} />
      <p className="mb-2 text-xs text-muted">Variables : <code>{"{username}"}</code> <code>{"{uuid}"}</code> <code>{"{quantity}"}</code>. Exécutées par la console du serveur, dans l&apos;ordre. Les modifications ne s&apos;appliquent qu&apos;aux achats futurs.</p>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="grid gap-2 rounded-md border border-line p-2 sm:grid-cols-[180px_1fr_auto_auto] sm:items-center">
            <select value={r.action} onChange={(e) => update(i, { action: e.target.value })} className="field" aria-label="Action">
              {ACTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input value={NO_COMMAND.has(r.action) ? "" : r.command ?? ""} disabled={NO_COMMAND.has(r.action)} onChange={(e) => update(i, { command: e.target.value })}
              placeholder={NO_COMMAND.has(r.action) ? "Géré par le plugin" : "give {username} minecraft:diamond 32"} className="field font-mono text-sm" aria-label="Commande" />
            <label className="flex items-center gap-1.5 text-xs text-muted"><input type="checkbox" checked={r.requireOnline} onChange={(e) => update(i, { requireOnline: e.target.checked })} /> joueur en ligne</label>
            <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-sm text-danger" aria-label="Supprimer l'action">✕</button>
          </li>
        ))}
      </ul>
      <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => setRows([...rows, { action: "GIVE_ITEM", command: "", requireOnline: true }])}>+ Ajouter une action</Button>
    </div>
  );
}
