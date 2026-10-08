"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink, Card, Skeleton, buttonClass, cn, formatNumber } from "@vaeloria/ui";
import { CopyField, ShareButton } from "@/components/world/Share";
import { loginHref, useMyWorld } from "@/lib/world/useMyWorld";

function Step({ n, done, title, children }: { n: number; done: boolean; title: string; children?: React.ReactNode }) {
  return (
    <li className={cn("rounded-[var(--radius-card)] border p-4", done ? "border-ruby/40 bg-ruby/5" : "border-line")}>
      <p className="flex items-center gap-3 font-display text-sm font-semibold uppercase tracking-[0.1em]">
        <span aria-hidden className={cn("grid size-7 place-items-center rounded-sm text-xs", done ? "ruby-fill" : "border border-line-strong text-muted")}>{done ? "✓" : n}</span>
        {title}
        {done && <span className="sr-only">(fait)</span>}
      </p>
      {children && <div className="mt-3 text-sm text-muted">{children}</div>}
    </li>
  );
}

/** Parcours fondateur : compte → numéro de fondateur → Minecraft → empire → invitations. */
export function JoinFlow() {
  const [state] = useMyWorld();
  const [invitation, setInvitation] = useState<string | null>(null);
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("invitation");
    if (code && /^[A-Z0-9]{6,12}$/.test(code)) setInvitation(code);
  }, []);

  if (state.status === "loading") return <Skeleton className="h-72" />;

  if (state.status === "unavailable")
    return (
      <Card className="space-y-3">
        <p className="font-display text-lg font-bold uppercase tracking-[0.05em]">Les inscriptions ouvriront ici</p>
        <p className="text-sm text-muted">Cet aperçu n&apos;est pas relié au serveur. Rejoins le Discord pour être prévenu de l&apos;ouverture des places de fondateur.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ButtonLink href={loginHref("/rejoindre", true)}>Créer mon compte</ButtonLink>
          <ButtonLink href="/discord" variant="secondary">Rejoindre le Discord</ButtonLink>
        </div>
      </Card>
    );

  if (state.status === "anonymous")
    return (
      <Card className="space-y-4">
        {invitation && <p className="rounded-md border border-ruby/40 bg-ruby/10 px-3 py-2 text-sm">Tu as été invité avec le code <strong className="font-mono">{invitation}</strong>. Il sera pris en compte à ton inscription.</p>}
        <ol className="space-y-3">
          <Step n={1} done={false} title="Crée ton compte VÆLORIA">Une adresse e-mail et un mot de passe. Ton numéro de fondateur est attribué immédiatement.</Step>
          <Step n={2} done={false} title="Lie ton compte Minecraft" />
          <Step n={3} done={false} title="Fonde ou rejoins un empire" />
        </ol>
        <ButtonLink href={loginHref("/rejoindre", true)} size="lg" className="w-full" data-track="cta_click" data-track-id="rejoindre-compte">Créer mon compte</ButtonLink>
        <p className="text-center text-sm text-muted">Déjà inscrit ? <a href={loginHref("/rejoindre")} className="font-semibold text-accent">Se connecter</a></p>
      </Card>
    );

  const d = state.data;
  const inviteUrl = d.referral.code ? `${window.location.origin}/invite/${d.referral.code}` : null;
  return (
    <div className="space-y-4">
      <Card className="text-center">
        {d.founder ? (
          <>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-muted">Fondateur</p>
            <p className="metal-text mt-1 font-display text-6xl font-bold tabular-nums">#{formatNumber(d.founder)}</p>
            <p className="mt-2 text-sm text-muted">Ce numéro est à toi pour toujours.</p>
          </>
        ) : (
          <>
            <p className="font-display text-lg font-bold uppercase tracking-[0.05em]">Bienvenue dans VÆLORIA</p>
            <p className="mt-1 text-sm text-muted">Les places de fondateur sont toutes attribuées, mais ton histoire commence maintenant.</p>
          </>
        )}
      </Card>
      <ol className="space-y-3">
        <Step n={1} done title="Compte VÆLORIA créé">{d.displayName ?? undefined}</Step>
        <Step n={2} done={d.linked} title={d.linked ? `Minecraft lié${d.minecraft ? ` : ${d.minecraft}` : ""}` : "Lie ton compte Minecraft"}>
          {!d.linked && (
            <>
              Connecte-toi au serveur, tape <code className="rounded bg-surface-2 px-1 text-fg">/link</code> et saisis le code dans ton compte.
              <div className="mt-3"><Link href="/compte" className={buttonClass("secondary", "sm")}>Saisir mon code</Link></div>
            </>
          )}
        </Step>
        <Step n={3} done={Boolean(d.empire)} title={d.empire ? `Empire : ${d.empire.name}` : "Fonde ou rejoins un empire"}>
          {d.empire ? (
            <Link href={`/empire/${d.empire.slug}`} className="font-semibold text-accent">Voir mon empire →</Link>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Link href="/empires/creer" className={buttonClass("primary", "sm")}>Fonder un empire</Link>
              <Link href="/empires?recrute=1" className={buttonClass("secondary", "sm")}>Rejoindre un empire</Link>
            </div>
          )}
        </Step>
      </ol>
      {inviteUrl && (
        <Card className="space-y-4">
          <div>
            <p className="font-display text-lg font-bold uppercase tracking-[0.05em]">Recrute tes alliés</p>
            <p className="text-sm text-muted">Chaque joueur invité qui lie son compte Minecraft te rapporte de l&apos;influence.</p>
          </div>
          <CopyField label="Ton lien d'invitation" value={inviteUrl} />
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[["Clics", d.referral.clicks], ["Inscrits", d.referral.registered], ["Validés", d.referral.qualified]].map(([l, v]) => (
              <div key={l} className="rounded-md border border-line p-2"><dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">{l}</dt><dd className="font-display text-xl font-bold tabular-nums">{formatNumber(v as number)}</dd></div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ShareButton url={inviteUrl} title="Rejoins-moi sur VÆLORIA" label="Partager mon lien" />
            <p className="text-sm text-muted">Influence : <strong className="text-fg tabular-nums">{formatNumber(d.influence)}</strong></p>
          </div>
        </Card>
      )}
    </div>
  );
}
