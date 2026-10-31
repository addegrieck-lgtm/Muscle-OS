"use client";

import { useActionState, useId } from "react";
import { subscribeNewsletter, type FormState } from "@/app/actions/public";

export function NewsletterForm({
  source = "site",
  dark = false,
}: {
  source?: string;
  dark?: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(subscribeNewsletter, {
    ok: false,
    message: "",
  });
  const id = useId();
  const line = dark
    ? "border-ivoire/30 focus-within:border-champagne"
    : "border-brun/25 focus-within:border-champagne";

  return (
    <form action={action} className="w-full max-w-xl" noValidate>
      <input type="hidden" name="source" value={source} />
      <div className="absolute -left-[9999px]" aria-hidden>
        <label>
          Site web <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className={`flex items-end gap-4 border-b pb-3 transition-colors ${line}`}>
        <label htmlFor={`${id}-email`} className="sr-only">
          Adresse e-mail
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Votre adresse e-mail"
          className={`w-full bg-transparent font-serif text-xl outline-none placeholder:opacity-50 md:text-2xl ${dark ? "text-ivoire" : "text-brun"}`}
          aria-invalid={Boolean(state.errors?.email)}
          aria-describedby={`${id}-msg`}
        />
        <button
          type="submit"
          disabled={pending}
          className="t-eyebrow shrink-0 pb-1 text-champagne transition-opacity hover:opacity-70 disabled:opacity-40"
        >
          {pending ? "Envoi…" : "S’inscrire"}
        </button>
      </div>
      <label
        className={`mt-4 flex items-start gap-3 t-small ${dark ? "text-ivoire/60" : "text-brun/70"}`}
      >
        <input type="checkbox" name="consent" required className="mt-1 accent-champagne" />
        <span>
          J’accepte de recevoir la lettre de LUMÉANCE. Désinscription possible à tout moment. Voir
          notre{" "}
          <a href="/confidentialite" className="underline underline-offset-4">
            politique de confidentialité
          </a>
          .
        </span>
      </label>
      <p
        id={`${id}-msg`}
        role="status"
        aria-live="polite"
        className={`mt-3 t-small ${state.ok ? "text-champagne" : dark ? "text-ivoire/80" : "text-brun"}`}
      >
        {state.errors?.email ?? state.errors?.consent ?? state.message}
      </p>
    </form>
  );
}
