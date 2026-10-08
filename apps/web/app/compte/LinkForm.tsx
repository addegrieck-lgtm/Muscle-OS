"use client";

import { useActionState } from "react";
import { Button } from "@vaeloria/ui";
import { linkMinecraft } from "@/lib/shop/actions.full";

export function LinkForm() {
  const [state, action, pending] = useActionState(linkMinecraft, null);
  return (
    <form action={action} className="space-y-3">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
        <li>Connecte-toi sur <span className="font-mono text-fg">play.vaeloria.fr</span>.</li>
        <li>Tape <code className="rounded bg-surface-2 px-1 text-fg">/link</code> dans le chat : un code de 6 caractères s&apos;affiche (valable 10 minutes).</li>
        <li>Saisis-le ici.</li>
      </ol>
      <div className="flex gap-2">
        <input name="code" required maxLength={8} autoComplete="one-time-code" aria-label="Code de liaison" placeholder="AB3K9Q"
          className="h-11 w-36 rounded-lg border border-line bg-surface-2 px-3 font-mono uppercase tracking-[0.2em] text-fg focus:border-accent focus:outline-none" />
        <Button type="submit" disabled={pending}>{pending ? "Liaison…" : "Lier"}</Button>
      </div>
      {state && <p role="status" className={state.ok ? "text-sm text-success" : "text-sm text-danger"}>{state.message}</p>}
    </form>
  );
}
