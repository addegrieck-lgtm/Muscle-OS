"use client";

import { useActionState } from "react";
import { signIn } from "../actions-auth";
import { inputClass } from "@/components/admin/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, { error: "" });
  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="mb-1.5 block text-[0.7rem] uppercase tracking-[0.14em] text-brun/60">
          E-mail
        </span>
        <input name="email" type="email" required autoComplete="username" className={inputClass} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[0.7rem] uppercase tracking-[0.14em] text-brun/60">
          Mot de passe
        </span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          className={inputClass}
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-[#8a3b2a]">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-brun py-3 text-xs uppercase tracking-[0.2em] text-ivoire hover:bg-noir disabled:opacity-50"
      >
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
