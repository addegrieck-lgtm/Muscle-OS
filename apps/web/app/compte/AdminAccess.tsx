"use client";

import { useActionState } from "react";
import { Button } from "@vaeloria/ui";
import { claimAdminAction, type AuthState } from "@/lib/auth/actions.full";

export function ClaimAdminForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(claimAdminAction, null);
  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row">
      <input name="code" type="password" required autoComplete="off" placeholder="Code d'administration" aria-label="Code d'administration" className="h-10 flex-1 rounded-md border border-line bg-surface-2 px-3 text-fg" />
      <Button type="submit" size="sm" variant="secondary" disabled={pending} className="h-10">Activer</Button>
      {state?.error && <p role="alert" className="text-sm text-danger sm:self-center">{state.error}</p>}
    </form>
  );
}
