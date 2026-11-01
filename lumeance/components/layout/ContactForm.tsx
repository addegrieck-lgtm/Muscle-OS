"use client";

import { useActionState } from "react";
import { sendContact, type FormState } from "@/app/actions/public";
import { buttonClass } from "@/components/ui/Button";

const field =
  "mt-2 w-full border-b border-brun/25 bg-transparent py-3 outline-none transition-colors focus:border-champagne";

export function ContactForm({ defaultSubject = "" }: { defaultSubject?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendContact, {
    ok: false,
    message: "",
  });
  const err = (k: string) =>
    state.errors?.[k] ? (
      <p id={`err-${k}`} className="t-small mt-2 text-[#8a3b2a]">
        {state.errors[k]}
      </p>
    ) : null;
  return (
    <form action={action} className="space-y-8" noValidate>
      <div className="absolute -left-[9999px]" aria-hidden>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        <label className="block">
          <span className="t-eyebrow text-brun/60">Nom</span>
          <input
            name="name"
            required
            autoComplete="name"
            className={field}
            aria-invalid={Boolean(state.errors?.name)}
            aria-describedby="err-name"
          />
          {err("name")}
        </label>
        <label className="block">
          <span className="t-eyebrow text-brun/60">E-mail</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={field}
            aria-invalid={Boolean(state.errors?.email)}
            aria-describedby="err-email"
          />
          {err("email")}
        </label>
      </div>
      <label className="block">
        <span className="t-eyebrow text-brun/60">Objet</span>
        <input
          name="subject"
          required
          defaultValue={defaultSubject}
          className={field}
          aria-invalid={Boolean(state.errors?.subject)}
          aria-describedby="err-subject"
        />
        {err("subject")}
      </label>
      <label className="block">
        <span className="t-eyebrow text-brun/60">Message</span>
        <textarea
          name="message"
          required
          rows={6}
          className={`${field} resize-y`}
          aria-invalid={Boolean(state.errors?.message)}
          aria-describedby="err-message"
        />
        {err("message")}
      </label>
      <p className="t-small text-brun/60">
        Vos informations servent uniquement à répondre à votre message. Voir notre{" "}
        <a href="/confidentialite" className="underline underline-offset-4">
          politique de confidentialité
        </a>
        .
      </p>
      <button type="submit" disabled={pending} className={buttonClass("solid")}>
        {pending ? "Envoi…" : "Envoyer"}
      </button>
      <p
        role="status"
        aria-live="polite"
        className={`t-small ${state.ok ? "text-champagne" : "text-brun"}`}
      >
        {state.message}
      </p>
    </form>
  );
}
