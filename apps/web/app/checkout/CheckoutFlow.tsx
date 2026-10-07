"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Me, Quote } from "@vaeloria/types";
import { Button, ButtonLink, EmptyState, cn, formatPrice } from "@vaeloria/ui";
import { useCart } from "@/components/shop/cart";
import { quoteCart, startCheckout } from "@/lib/shop/actions.full";
import { track } from "@/lib/track";

const STEPS = ["Pseudo", "Compte", "Résumé", "Paiement", "Confirmation"] as const;
const PSEUDO_KEY = "vae-checkout-recipient";
const KEY_KEY = "vae-checkout-key";

/** Clé d'idempotence stable tant que le panier ne change pas : un double clic ou un rechargement ne crée pas deux commandes. */
function idempotencyKey(cartHash: string): string {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY_KEY) ?? "null") as { hash: string; key: string } | null;
    if (saved?.hash === cartHash) return saved.key;
    const key = crypto.randomUUID();
    sessionStorage.setItem(KEY_KEY, JSON.stringify({ hash: cartHash, key }));
    return key;
  } catch {
    return crypto.randomUUID();
  }
}

export function CheckoutFlow({ me, loginHref }: { me: Me | null; loginHref: string }) {
  const { lines, ready } = useCart();
  const linked = me?.minecraft ?? [];
  const [recipient, setRecipient] = useState("");
  const [step, setStep] = useState(0);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const cartHash = useMemo(() => JSON.stringify([...lines].sort((a, b) => a.productId.localeCompare(b.productId))), [lines]);

  useEffect(() => {
    let saved = "";
    try {
      saved = sessionStorage.getItem(PSEUDO_KEY) ?? "";
    } catch {
      /* ignore */
    }
    setRecipient(saved || linked[0]?.username || "");
    // Retour de la connexion Discord : on reprend directement au résumé.
    if (saved && me) setStep(2);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step !== 2 || !ready) return;
    track("checkout_started");
    setQuote(null);
    setError(null);
    quoteCart(lines).then((r) => (r.ok ? setQuote(r.data) : setError(r.error)));
  }, [step, ready, cartHash]); // eslint-disable-line react-hooks/exhaustive-deps

  if (ready && lines.length === 0) {
    return <EmptyState title="Ton panier est vide"><div className="mt-4"><ButtonLink href="/boutique">Retour à la boutique</ButtonLink></div></EmptyState>;
  }

  const validPseudo = /^[A-Za-z0-9_]{3,16}$/.test(recipient);
  const savePseudo = () => {
    try {
      sessionStorage.setItem(PSEUDO_KEY, recipient);
    } catch {
      /* ignore */
    }
  };

  async function pay() {
    if (!quote) return;
    setBusy(true);
    setError(null);
    setStep(3);
    const r = await startCheckout({ items: lines, recipient, idempotencyKey: idempotencyKey(cartHash) });
    if (!r.ok) {
      setBusy(false);
      setStep(2);
      setError(r.error);
      return;
    }
    // Redirection vers la page de paiement du prestataire : la validation n'a jamais lieu ici.
    window.location.assign(r.data.paymentUrl);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.14em] text-muted sm:hidden">
        Étape {step + 1}/{STEPS.length} — <span className="text-fg">{STEPS[step]}</span>
      </p>
      <ol className="mb-8 grid grid-cols-5 gap-1" aria-label="Étapes du paiement">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className="flex flex-col items-center gap-1.5 text-center">
            <span className={cn("h-1 w-full rounded-full", i <= step ? "bg-ruby" : "bg-line")} />
            <span className={cn("hidden font-display text-xs font-semibold uppercase tracking-[0.1em] sm:block", i === step ? "text-fg" : "text-subtle")}>
              {i + 1}. {s}
            </span>
            <span className="sr-only sm:hidden">{i + 1}. {s}</span>
          </li>
        ))}
      </ol>

      {error && <p role="alert" className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p>}

      {step === 0 && (
        <Panel title="Pour quel joueur ?">
          <p className="text-sm text-muted">L&apos;achat sera livré à ce compte Minecraft Java, et les points lui seront crédités.</p>
          {linked.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {linked.map((m) => (
                <button key={m.uuid} type="button" onClick={() => setRecipient(m.username)} className={cn("rounded-md border px-3 py-2 text-sm font-semibold", recipient === m.username ? "border-ruby text-fg" : "border-line text-muted hover:text-fg")}>
                  {m.username} <span className="text-xs text-subtle">(lié)</span>
                </button>
              ))}
            </div>
          )}
          <label htmlFor="pseudo" className="mt-4 block text-sm font-semibold">Pseudo Minecraft</label>
          <input id="pseudo" value={recipient} onChange={(e) => setRecipient(e.target.value.trim())} autoComplete="off" spellCheck={false} maxLength={16}
            className="mt-1 h-12 w-full rounded-lg border border-line bg-surface-2 px-3 font-mono text-fg focus:border-accent focus:outline-none" placeholder="Steve" />
          {recipient && !validPseudo && <p className="mt-1 text-sm text-danger">3 à 16 caractères : lettres, chiffres et _.</p>}
          <p className="mt-2 text-xs text-subtle">Le pseudo est converti en identifiant Minecraft unique (UUID) au moment de la commande : un changement de pseudo plus tard ne fait pas perdre l&apos;achat.</p>
          <div className="mt-5 flex justify-between gap-3">
            <ButtonLink href="/boutique/panier" variant="ghost">Panier</ButtonLink>
            <Button disabled={!validPseudo} onClick={() => { savePseudo(); setStep(me ? 2 : 1); }}>Continuer</Button>
          </div>
        </Panel>
      )}

      {step === 1 && (
        <Panel title="Compte VÆLORIA">
          {me ? (
            <p className="text-sm text-muted">Connecté en tant que <strong className="text-fg">{me.user.displayName}</strong>.</p>
          ) : (
            <>
              <p className="text-sm text-muted">Un compte VÆLORIA (connexion Discord, sans mot de passe) est nécessaire pour payer : il protège tes achats et te donne accès à ton historique.</p>
              <ButtonLink href={loginHref} size="lg" className="mt-5 w-full sm:w-auto">Se connecter avec Discord</ButtonLink>
            </>
          )}
          <div className="mt-5 flex justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep(0)}>Retour</Button>
            {me && <Button onClick={() => setStep(2)}>Continuer</Button>}
          </div>
        </Panel>
      )}

      {step >= 2 && step <= 3 && (
        <Panel title="Résumé de la commande">
          {!quote ? (
            <div className="h-32 animate-pulse rounded-md bg-surface-2" aria-busy />
          ) : (
            <>
              <p className="text-sm text-muted">Destinataire : <strong className="font-mono text-fg">{recipient}</strong> · <button type="button" className="text-accent underline" onClick={() => setStep(0)}>modifier</button></p>
              {quote.rejected.length > 0 && <p className="mt-3 text-sm text-warning">Certains produits ne sont plus disponibles : retire-les du panier pour continuer.</p>}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase tracking-wider text-subtle"><th className="py-2">Produit</th><th>Qté</th><th className="text-right">Prix unitaire</th><th className="text-right">Total</th></tr></thead>
                  <tbody>
                    {quote.lines.map((l) => (
                      <tr key={l.productId} className="border-t border-line">
                        <td className="py-2 pr-2 font-semibold">{l.name}<span className="block text-xs font-normal text-accent">+{l.totalPoints} pts</span></td>
                        <td className="tabular-nums">{l.quantity}</td>
                        <td className="text-right tabular-nums">{formatPrice(l.unitPriceCents)}</td>
                        <td className="text-right font-semibold tabular-nums">{formatPrice(l.totalCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
                {quote.discountCents > 0 && <div className="flex justify-between text-muted"><dt>Réductions</dt><dd>−{formatPrice(quote.discountCents)}</dd></div>}
                <div className="flex justify-between"><dt className="font-display font-semibold uppercase tracking-[0.08em]">Total</dt><dd className="font-display text-2xl font-bold tabular-nums">{formatPrice(quote.totalCents)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Points gagnés</dt><dd className="font-display font-semibold text-accent">+{quote.totalPoints}</dd></div>
              </dl>
              <label className="mt-5 flex items-start gap-3 text-sm text-muted">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 size-4 accent-[var(--accent-fill)]" />
                <span>J&apos;accepte les <Link href="/cgv" className="underline">conditions générales de vente</Link> et demande la livraison immédiate du contenu numérique, ce qui met fin à mon droit de rétractation une fois la livraison effectuée.</span>
              </label>
              <div className="mt-5 flex justify-between gap-3">
                <Button variant="ghost" onClick={() => setStep(me ? 0 : 1)} disabled={busy}>Retour</Button>
                <Button size="lg" onClick={pay} disabled={!accepted || busy || quote.rejected.length > 0 || quote.lines.length === 0}>
                  {busy ? "Redirection vers le paiement…" : `Payer ${formatPrice(quote.totalCents)}`}
                </Button>
              </div>
              <p className="mt-3 text-xs text-subtle">Tu vas être redirigé vers la page sécurisée de notre prestataire de paiement. VÆLORIA ne voit jamais tes données bancaires.</p>
            </>
          )}
        </Panel>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="metal-border rounded-[var(--radius-card)] p-5 sm:p-6">
      <h2 className="mb-3 font-display text-xl font-bold uppercase tracking-[0.05em]">{title}</h2>
      {children}
    </section>
  );
}
