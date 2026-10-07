"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@vaeloria/ui";
import { track } from "@/lib/track";
import { joinBeta } from "./actions";

const input = "h-11 w-full rounded-lg border border-line bg-surface-2 px-3 text-fg placeholder:text-subtle focus:border-accent focus:outline-none";

export function BetaForm() {
  const [state, action, pending] = useActionState(joinBeta, null);
  useEffect(() => {
    if (state?.ok) track("beta_signup");
  }, [state]);

  if (state?.ok) return <p role="status" className="rounded-lg border border-success/30 bg-success/10 p-4 font-semibold text-success">{state.message}</p>;
  return (
    <form action={action} className="space-y-4" noValidate>
      <div>
        <label htmlFor="mc" className="mb-1 block text-sm font-semibold">Pseudo Minecraft <span className="text-danger">*</span></label>
        <input id="mc" name="minecraftUsername" required minLength={3} maxLength={16} pattern="[A-Za-z0-9_]{3,16}" autoComplete="username" className={input} placeholder="Steve" />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-semibold">E-mail <span className="font-normal text-subtle">(facultatif — uniquement pour te prévenir de l&apos;ouverture)</span></label>
        <input id="email" name="email" type="email" autoComplete="email" className={input} />
      </div>
      <div>
        <label htmlFor="ref" className="mb-1 block text-sm font-semibold">Code de parrainage / créateur <span className="font-normal text-subtle">(facultatif)</span></label>
        <input id="ref" name="referralCode" maxLength={20} className={input} />
      </div>
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="consent" required className="mt-1 size-4 accent-[var(--accent)]" />
        <span>J&apos;accepte que ces informations soient utilisées pour gérer mon inscription à la bêta. Voir la <a href="/confidentialite" className="underline">politique de confidentialité</a>.</span>
      </label>
      {state && !state.ok && <p role="alert" className="text-sm font-semibold text-danger">{state.message}</p>}
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>{pending ? "Inscription…" : "M'inscrire à la bêta"}</Button>
    </form>
  );
}
