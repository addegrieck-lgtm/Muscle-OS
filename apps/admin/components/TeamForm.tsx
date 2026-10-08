"use client";

import { useActionState } from "react";
import { Button } from "@vaeloria/ui";
import { setTeamRole, type TeamState } from "@/lib/teamActions";

export function TeamForm({ email, role, compact }: { email?: string; role?: string; compact?: boolean }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(setTeamRole, null);
  return (
    <form action={action} className={compact ? "flex items-center justify-end gap-2" : "grid max-w-xl gap-3 sm:grid-cols-[1fr_10rem_auto]"}>
      {email ? <input type="hidden" name="email" value={email} /> : <input name="email" type="email" required placeholder="Adresse e-mail du compte" aria-label="E-mail" className="field" />}
      <select name="role" defaultValue={role ?? "admin"} aria-label="Rôle" className="field">
        <option value="admin">Administrateur</option>
        <option value="owner">Propriétaire</option>
        <option value="moderator">Modérateur (sans back-office)</option>
        <option value="player">Retirer l&apos;accès</option>
      </select>
      <Button type="submit" size="sm" disabled={pending} className="h-10">{compact ? "Appliquer" : "Donner l'accès"}</Button>
      {state && "error" in state && <p role="alert" className="text-sm text-danger sm:col-span-3">{state.error}</p>}
      {state && "ok" in state && <p role="status" className="text-sm text-success sm:col-span-3">{state.ok}</p>}
    </form>
  );
}
