"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { startCheckout, type CheckoutState } from "@/app/actions/checkout";
import { quoteCart } from "@/app/actions/public";
import { useCart } from "@/components/cart/CartProvider";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { formatPrice } from "@/lib/money";
import type { CartQuote } from "@/lib/services/pricing";

const field =
  "mt-2 w-full border-b border-brun/25 bg-transparent py-3 outline-none transition-colors focus:border-champagne";

const COUNTRY_NAMES: Record<string, string> = {
  FR: "France",
  BE: "Belgique",
  LU: "Luxembourg",
  MC: "Monaco",
  CH: "Suisse",
  DE: "Allemagne",
  ES: "Espagne",
  IT: "Italie",
  NL: "Pays-Bas",
};

export interface CheckoutDefaults {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  /** E-mail du compte connecté : non modifiable ici. */
  emailLocked: boolean;
}

export function CheckoutForm({
  defaults,
  countries,
}: {
  defaults: CheckoutDefaults;
  countries: string[];
}) {
  const { lines, ready } = useCart();
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [, start] = useTransition();
  const [state, action, pending] = useActionState<CheckoutState | null, FormData>(
    startCheckout,
    null,
  );

  useEffect(() => {
    if (!ready) return;
    start(async () => {
      try {
        setQuote(await quoteCart(lines));
      } catch {
        setQuote(null);
      }
    });
  }, [lines, ready]);

  if (!ready || !quote) return <p className="t-small py-20 text-brun/50">Chargement…</p>;
  if (quote.lines.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="t-h3">Votre panier est vide.</p>
        <div className="mt-10">
          <ButtonLink href="/collections">Découvrir la collection</ButtonLink>
        </div>
      </div>
    );
  }

  const v = (name: string, fallback = "") => state?.values?.[name] ?? fallback;
  const err = (name: string) =>
    state?.errors?.[name] ? (
      <span id={`err-${name}`} className="t-small mt-2 block text-[#8a3b2a]">
        {state.errors[name]}
      </span>
    ) : null;
  const input = (name: string, fallback = "") => ({
    name,
    defaultValue: v(name, fallback),
    className: field,
    "aria-invalid": Boolean(state?.errors?.[name]),
    "aria-describedby": `err-${name}`,
  });
  const blocked = quote.removed.length > 0 || quote.lines.some((l) => l.isDemo);

  return (
    <div className="grid gap-16 lg:grid-cols-12">
      <form action={action} className="space-y-10 lg:col-span-7" noValidate>
        <input type="hidden" name="cart" value={JSON.stringify(lines)} />
        <fieldset className="space-y-8">
          <legend className="t-eyebrow text-brun/60">Coordonnées</legend>
          <label className="block">
            <span className="t-eyebrow text-brun/60">E-mail</span>
            <input
              {...input("email", defaults.email)}
              type="email"
              autoComplete="email"
              required
              readOnly={defaults.emailLocked}
            />
            {err("email")}
          </label>
          <label className="block">
            <span className="t-eyebrow text-brun/60">Téléphone (pour la livraison)</span>
            <input {...input("phone", defaults.phone)} type="tel" autoComplete="tel" />
            {err("phone")}
          </label>
        </fieldset>

        <fieldset className="space-y-8">
          <legend className="t-eyebrow text-brun/60">Adresse de livraison</legend>
          <div className="grid gap-8 md:grid-cols-2">
            <label className="block">
              <span className="t-eyebrow text-brun/60">Prénom</span>
              <input
                {...input("first_name", defaults.first_name)}
                autoComplete="given-name"
                required
              />
              {err("first_name")}
            </label>
            <label className="block">
              <span className="t-eyebrow text-brun/60">Nom</span>
              <input
                {...input("last_name", defaults.last_name)}
                autoComplete="family-name"
                required
              />
              {err("last_name")}
            </label>
          </div>
          <label className="block">
            <span className="t-eyebrow text-brun/60">Adresse</span>
            <input {...input("address_line_1")} autoComplete="address-line1" required />
            {err("address_line_1")}
          </label>
          <label className="block">
            <span className="t-eyebrow text-brun/60">Complément (facultatif)</span>
            <input {...input("address_line_2")} autoComplete="address-line2" />
            {err("address_line_2")}
          </label>
          <div className="grid gap-8 md:grid-cols-3">
            <label className="block">
              <span className="t-eyebrow text-brun/60">Code postal</span>
              <input {...input("postal_code")} autoComplete="postal-code" required />
              {err("postal_code")}
            </label>
            <label className="block md:col-span-2">
              <span className="t-eyebrow text-brun/60">Ville</span>
              <input {...input("city")} autoComplete="address-level2" required />
              {err("city")}
            </label>
          </div>
          <label className="block">
            <span className="t-eyebrow text-brun/60">Pays</span>
            <select {...input("country", countries[0] ?? "FR")} autoComplete="country">
              {(countries.length ? countries : ["FR"]).map((c) => (
                <option key={c} value={c}>
                  {COUNTRY_NAMES[c] ?? c}
                </option>
              ))}
            </select>
            {err("country")}
          </label>
        </fieldset>

        <div className="space-y-3">
          <label className="t-small flex items-start gap-3">
            <input
              type="checkbox"
              name="accept_cgv"
              required
              defaultChecked={v("accept_cgv") === "on"}
              className="mt-1 accent-champagne"
              aria-describedby="err-accept_cgv"
            />
            <span>
              J’ai lu et j’accepte les{" "}
              <Link href="/cgv" className="underline underline-offset-4">
                conditions générales de vente
              </Link>{" "}
              ; je reconnais que ma commande implique une obligation de paiement.
            </span>
          </label>
          {err("accept_cgv")}
        </div>

        {state?.message && (
          <p role="alert" className="t-small border-l border-[#8a3b2a] px-4 py-3 text-[#8a3b2a]">
            {state.message}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || blocked}
          className={buttonClass("solid", "w-full")}
        >
          {pending ? "Redirection vers le paiement…" : `Payer ${formatPrice(quote.total)}`}
        </button>
        <p className="t-small text-brun/60">
          Paiement sécurisé sur la page de notre prestataire Stripe : vos coordonnées bancaires ne
          transitent jamais par notre site. Votre commande est confirmée dès réception du paiement.
        </p>
      </form>

      <aside className="lg:col-span-5" aria-label="Récapitulatif">
        <div className="bg-creme/70 p-7 md:p-10 lg:sticky lg:top-28">
          <h2 className="t-eyebrow">Votre commande</h2>
          {blocked && (
            <p role="alert" className="t-small mt-6 border-l border-champagne px-4 py-3">
              Votre panier doit être vérifié avant le paiement.{" "}
              <Link href="/panier" className="underline underline-offset-4">
                Retour au panier
              </Link>
            </p>
          )}
          <ul className="mt-8 space-y-4">
            {quote.lines.map((l) => (
              <li
                key={`${l.productId}-${l.variantId}-${JSON.stringify(l.options)}`}
                className="flex justify-between gap-4"
              >
                <span>
                  {l.name}
                  {l.quantity > 1 && ` × ${l.quantity}`}
                  {l.variantName && (
                    <span className="t-small block text-brun/60">{l.variantName}</span>
                  )}
                </span>
                <span className="shrink-0">{formatPrice(l.total)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-8 space-y-3 border-t border-brun/15 pt-6">
            {quote.discounts.map((d, i) => (
              <div
                key={`${d.productId}-${i}`}
                className="flex justify-between gap-4 text-champagne"
              >
                <dt>{d.productId ? `Offre ${d.label}` : d.label}</dt>
                <dd className="shrink-0">− {formatPrice(d.amount)}</dd>
              </div>
            ))}
            <div className="flex justify-between text-brun/70">
              <dt>Livraison</dt>
              <dd>
                {quote.shipping === null
                  ? "À confirmer"
                  : quote.shipping === 0
                    ? "Offerte"
                    : formatPrice(quote.shipping)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-brun/15 pt-4 font-serif text-2xl">
              <dt>Total TTC</dt>
              <dd>{formatPrice(quote.total)}</dd>
            </div>
          </dl>
          <Link href="/panier" className="t-small mt-6 inline-block underline underline-offset-4">
            Modifier le panier
          </Link>
        </div>
      </aside>
    </div>
  );
}

/** Vide le panier après un paiement confirmé (page de confirmation). */
export function ClearCartOnMount() {
  const { clear, ready } = useCart();
  useEffect(() => {
    if (ready) clear();
  }, [ready, clear]);
  return null;
}
