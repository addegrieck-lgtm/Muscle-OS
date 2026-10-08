"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, cn } from "@vaeloria/ui";
import { loginAction, registerAction, type AuthState } from "@/lib/auth/actions.full";

const input = "h-11 w-full rounded-md border border-line bg-surface-2 px-3 text-fg";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-subtle">{hint}</span>}
    </label>
  );
}

/** Connexion et création de compte (e-mail + mot de passe). */
export function AuthForms({ next, initialMode }: { next: string; initialMode: "connexion" | "inscription" }) {
  const [mode, setMode] = useState(initialMode);
  const [loginState, login, loggingIn] = useActionState<AuthState, FormData>(loginAction, null);
  const [registerState, register, registering] = useActionState<AuthState, FormData>(registerAction, null);
  const tab = (m: typeof mode, label: string) => (
    <button type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
      className={cn("h-10 flex-1 rounded-md font-display text-sm font-semibold uppercase tracking-[0.08em]", mode === m ? "ruby-fill" : "text-muted hover:text-fg")}>
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Connexion ou inscription" className="flex gap-1 rounded-lg border border-line p-1">
        {tab("connexion", "Se connecter")}
        {tab("inscription", "Créer un compte")}
      </div>

      {mode === "connexion" ? (
        <form action={login} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <Field label="Adresse e-mail"><input key={loginState?.error} name="email" type="email" required autoComplete="email" defaultValue={loginState?.values?.email} className={input} /></Field>
          <Field label="Mot de passe"><input name="password" type="password" required autoComplete="current-password" className={input} /></Field>
          {loginState?.error && <p role="alert" className="text-sm text-danger">{loginState.error}</p>}
          <Button type="submit" size="lg" disabled={loggingIn} className="w-full">{loggingIn ? "Connexion…" : "Se connecter"}</Button>
          <p className="text-center text-sm text-muted">Pas encore de compte ? <button type="button" onClick={() => setMode("inscription")} className="font-semibold text-accent">Créer un compte</button></p>
        </form>
      ) : (
        <form action={register} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <Field label="Pseudo" hint="Visible seulement par toi et l'équipe. En public, tu apparais avec ton pseudo Minecraft une fois lié.">
            <input key={`n${registerState?.error}`} name="displayName" required minLength={3} maxLength={24} autoComplete="nickname" defaultValue={registerState?.values?.displayName} className={input} />
          </Field>
          <Field label="Adresse e-mail"><input key={`e${registerState?.error}`} name="email" type="email" required autoComplete="email" defaultValue={registerState?.values?.email} className={input} /></Field>
          <Field label="Mot de passe" hint="10 caractères minimum.">
            <input name="password" type="password" required minLength={10} autoComplete="new-password" className={input} />
          </Field>
          <Field label="Confirmer le mot de passe"><input name="confirm" type="password" required minLength={10} autoComplete="new-password" className={input} /></Field>
          <label className="flex items-start gap-2 text-sm text-muted">
            <input key={`t${registerState?.error}`} type="checkbox" name="terms" required defaultChecked={registerState?.values?.terms} className="mt-1" />
            <span>J&apos;accepte le <Link href="/rules" className="text-accent">règlement</Link> et la <Link href="/confidentialite" className="text-accent">politique de confidentialité</Link>.</span>
          </label>
          {registerState?.error && <p role="alert" className="text-sm text-danger">{registerState.error}</p>}
          <Button type="submit" size="lg" disabled={registering} className="w-full">{registering ? "Création…" : "Créer mon compte"}</Button>
        </form>
      )}
    </div>
  );
}
