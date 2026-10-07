"use client";

import { useActionState } from "react";
import { Button } from "@vaeloria/ui";
import { createIncident, enqueueCommand, type FormState } from "@/lib/actions";

export function IncidentForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createIncident, null);
  return (
    <form action={action} className="grid max-w-xl gap-3">
      <input name="title" required placeholder="Titre (ex. Maintenance du serveur Factions)" className="field" aria-label="Titre" />
      <div className="grid grid-cols-2 gap-3">
        <select name="severity" className="field" aria-label="Gravité">
          <option value="maintenance">Maintenance</option><option value="minor">Mineur</option><option value="major">Majeur</option><option value="critical">Critique</option>
        </select>
        <select name="status" className="field" aria-label="Statut">
          <option value="investigating">Analyse</option><option value="identified">Identifié</option><option value="monitoring">Surveillance</option>
        </select>
      </div>
      <textarea name="body" rows={3} placeholder="Détails affichés sur /status" className="field" aria-label="Détails" />
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <div><Button type="submit" size="sm" disabled={pending}>Publier l&apos;incident</Button></div>
    </form>
  );
}

export function CommandForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(enqueueCommand, null);
  return (
    <form action={action} className="grid max-w-xl gap-3">
      <input name="playerUuid" placeholder="UUID du joueur (facultatif)" className="field font-mono text-sm" aria-label="UUID" />
      <input name="command" required placeholder="Commande sans / (ex. give {joueur} diamond 1)" className="field font-mono text-sm" aria-label="Commande" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requireOnline" className="accent-[var(--accent)]" /> Exécuter seulement quand le joueur est en ligne</label>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <div><Button type="submit" size="sm" disabled={pending}>Mettre en file</Button></div>
    </form>
  );
}
