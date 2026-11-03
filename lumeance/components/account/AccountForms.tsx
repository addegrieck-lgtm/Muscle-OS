"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  requestPasswordReset,
  signInAccount,
  signUpAccount,
  updatePassword,
  type AccountFormState,
} from "@/app/actions/account";
import { buttonClass } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";

const field =
  "mt-2 w-full border-b border-brun/25 bg-transparent py-3 outline-none transition-colors focus:border-champagne";
const INITIAL: AccountFormState = { ok: false, message: "" };

function Field({
  label,
  name,
  state,
  hint,
  children,
}: {
  label: string;
  name: string;
  state: AccountFormState;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="t-eyebrow text-brun/60">{label}</span>
      {children}
      {hint && !state.errors?.[name] && (
        <span className="t-small mt-2 block text-brun/50">{hint}</span>
      )}
      {state.errors?.[name] && (
        <span id={`err-${name}`} className="t-small mt-2 block text-[#8a3b2a]">
          {state.errors[name]}
        </span>
      )}
    </label>
  );
}

function Message({ state }: { state: AccountFormState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={`t-small border-l px-4 py-3 ${state.ok ? "border-champagne bg-creme/60 text-brun" : "border-[#8a3b2a] text-[#8a3b2a]"}`}
    >
      {state.message}
    </p>
  );
}

const inputProps = (name: string, state: AccountFormState) => ({
  name,
  className: field,
  "aria-invalid": Boolean(state.errors?.[name]),
  "aria-describedby": `err-${name}`,
});

export function SignupForm({ referral = "" }: { referral?: string }) {
  const [state, action, pending] = useActionState(signUpAccount, INITIAL);
  const [type, setType] = useState<"particulier" | "entreprise">("particulier");
  if (state.ok) return <Message state={state} />;
  return (
    <form action={action} className="space-y-8" noValidate>
      <div className="absolute -left-[9999px]" aria-hidden>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <fieldset>
        <legend className="t-eyebrow text-brun/60">Vous êtes</legend>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(
            [
              ["particulier", "Un particulier", "Cercle Luméance et parrainage"],
              ["entreprise", "Une entreprise", "Prix HT et remise par paliers"],
            ] as const
          ).map(([value, label, sub]) => (
            <label
              key={value}
              className={`cursor-pointer border px-4 py-4 transition-colors ${type === value ? "border-brun bg-brun text-ivoire" : "border-brun/20 hover:border-brun/50"}`}
            >
              <input
                type="radio"
                name="account_type"
                value={value}
                checked={type === value}
                onChange={() => setType(value)}
                className="sr-only"
              />
              <span className="block">{label}</span>
              <span
                className={`t-small mt-1 block ${type === value ? "text-ivoire/70" : "text-brun/55"}`}
              >
                {sub}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {type === "entreprise" && (
        <div className="grid gap-8 md:grid-cols-2">
          <Field label="Raison sociale" name="company_name" state={state}>
            <input {...inputProps("company_name", state)} autoComplete="organization" required />
          </Field>
          <Field label="SIRET" name="siret" state={state} hint="14 chiffres">
            <input {...inputProps("siret", state)} inputMode="numeric" required />
          </Field>
          <Field label="N° de TVA intracommunautaire (facultatif)" name="vat_number" state={state}>
            <input {...inputProps("vat_number", state)} />
          </Field>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <Field label="Prénom" name="first_name" state={state}>
          <input {...inputProps("first_name", state)} autoComplete="given-name" required />
        </Field>
        <Field label="Nom" name="last_name" state={state}>
          <input {...inputProps("last_name", state)} autoComplete="family-name" required />
        </Field>
        <Field label="E-mail" name="email" state={state}>
          <input {...inputProps("email", state)} type="email" autoComplete="email" required />
        </Field>
        <Field label="Téléphone (facultatif)" name="phone" state={state}>
          <input {...inputProps("phone", state)} type="tel" autoComplete="tel" />
        </Field>
      </div>
      <Field
        label="Mot de passe"
        name="password"
        state={state}
        hint="10 caractères minimum, dont une lettre et un chiffre"
      >
        <PasswordInput
          {...inputProps("password", state)}
          autoComplete="new-password"
          minLength={10}
          required
        />
      </Field>
      {type === "particulier" && (
        <Field label="Code de parrainage (facultatif)" name="referral" state={state}>
          <input
            {...inputProps("referral", state)}
            defaultValue={referral}
            autoCapitalize="characters"
          />
        </Field>
      )}

      <div className="space-y-4">
        <label className="t-small flex items-start gap-3">
          <input type="checkbox" name="newsletter" className="mt-1 accent-champagne" />
          <span>
            Je souhaite recevoir la lettre de la maison (nouvelles pièces, conseils). Désinscription
            en un clic.
          </span>
        </label>
        <label className="t-small flex items-start gap-3">
          <input
            type="checkbox"
            name="terms"
            required
            className="mt-1 accent-champagne"
            aria-describedby="err-terms"
          />
          <span>
            J’accepte les{" "}
            <Link href="/cgv" className="underline underline-offset-4">
              conditions générales de vente
            </Link>{" "}
            et la{" "}
            <Link href="/confidentialite" className="underline underline-offset-4">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>
        {state.errors?.terms && (
          <p id="err-terms" className="t-small text-[#8a3b2a]">
            {state.errors.terms}
          </p>
        )}
      </div>
      <Message state={state} />
      <button type="submit" disabled={pending} className={buttonClass("solid", "w-full")}>
        {pending ? "Création du compte…" : "Créer mon compte"}
      </button>
      {type === "entreprise" && (
        <p className="t-small text-brun/60">
          Votre compte entreprise est vérifié par nos soins (en général sous 48 h ouvrées) : les
          prix HT et la remise par paliers s’activent dès sa validation.
        </p>
      )}
    </form>
  );
}

export function SigninForm({ next = "/compte" }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAccount, INITIAL);
  return (
    <form action={action} className="space-y-8" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field label="E-mail" name="email" state={state}>
        <input {...inputProps("email", state)} type="email" autoComplete="email" required />
      </Field>
      <Field label="Mot de passe" name="password" state={state}>
        <PasswordInput
          {...inputProps("password", state)}
          autoComplete="current-password"
          required
        />
      </Field>
      <Message state={state} />
      <button type="submit" disabled={pending} className={buttonClass("solid", "w-full")}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
      <p className="t-small flex flex-wrap justify-between gap-3 text-brun/60">
        <Link href="/compte/mot-de-passe-oublie" className="underline underline-offset-4">
          Mot de passe oublié ?
        </Link>
        <Link href="/compte/inscription" className="underline underline-offset-4">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, INITIAL);
  if (state.ok) return <Message state={state} />;
  return (
    <form action={action} className="space-y-8" noValidate>
      <Field label="E-mail" name="email" state={state}>
        <input {...inputProps("email", state)} type="email" autoComplete="email" required />
      </Field>
      <Message state={state} />
      <button type="submit" disabled={pending} className={buttonClass("solid", "w-full")}>
        {pending ? "Envoi…" : "Recevoir le lien"}
      </button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, INITIAL);
  if (state.ok)
    return (
      <div className="space-y-6">
        <Message state={state} />
        <Link href="/compte" className={buttonClass("solid", "w-full")}>
          Mon compte
        </Link>
      </div>
    );
  return (
    <form action={action} className="space-y-8" noValidate>
      <Field
        label="Nouveau mot de passe"
        name="password"
        state={state}
        hint="10 caractères minimum, dont une lettre et un chiffre"
      >
        <PasswordInput {...inputProps("password", state)} autoComplete="new-password" required />
      </Field>
      <Field label="Confirmation" name="confirm" state={state}>
        <PasswordInput {...inputProps("confirm", state)} autoComplete="new-password" required />
      </Field>
      <Message state={state} />
      <button type="submit" disabled={pending} className={buttonClass("solid", "w-full")}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
