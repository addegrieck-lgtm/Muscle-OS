"use client";

import Link from "next/link";
import { useState } from "react";
import { CRESTS, EMPIRE_COLORS } from "@vaeloria/types";
import { Button, ButtonLink, Card, Ornament, Skeleton, buttonClass, cn } from "@vaeloria/ui";
import { CREST_LABELS, Crest } from "@/components/world/Crest";
import { CopyField, ShareButton } from "@/components/world/Share";
import { loginHref, useMyWorld, worldAction } from "@/lib/world/useMyWorld";

const input = "h-11 w-full rounded-md border border-line bg-surface-2 px-3 text-fg";

/** Fondation d'un empire : nom, tag, devise, couleur, blason, avec aperçu en direct. */
export function EmpireCreator() {
  const [state, reload] = useMyWorld();
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [motto, setMotto] = useState("");
  const [color, setColor] = useState<string>(EMPIRE_COLORS[0]);
  const [crest, setCrest] = useState<string>(CRESTS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [born, setBorn] = useState<string | null>(null);

  if (state.status === "loading") return <Skeleton className="h-96" />;
  if (state.status === "unavailable")
    return <Card><p className="font-display text-lg font-bold uppercase">La fondation des empires ouvrira ici</p><p className="mt-2 text-sm text-muted">Cet aperçu n&apos;est pas relié au serveur.</p></Card>;
  if (state.status === "anonymous")
    return (
      <Card className="space-y-3 text-center">
        <p className="font-display text-lg font-bold uppercase tracking-[0.05em]">Crée ton compte pour fonder ton empire</p>
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <ButtonLink href={loginHref("/empires/creer", true)} size="lg">Créer mon compte</ButtonLink>
          <ButtonLink href={loginHref("/empires/creer")} size="lg" variant="secondary">Se connecter</ButtonLink>
        </div>
      </Card>
    );

  const mine = state.data.empire;
  if (born && mine) {
    const invite = mine.inviteCode ? `${window.location.origin}/empire/${mine.slug}?code=${mine.inviteCode}` : `${window.location.origin}/empire/${mine.slug}`;
    return (
      <Card className="space-y-6 text-center">
        <Crest crest={crest} color={color} className="mx-auto size-28" title={mine.name} />
        <div>
          <Ornament className="mb-4" />
          <p className="metal-text font-display text-3xl font-bold uppercase tracking-[0.08em] sm:text-4xl">Votre empire est né.</p>
          <p className="mt-2 font-display text-xl font-bold uppercase">{mine.name}</p>
        </div>
        <div className="text-left"><CopyField label="Lien d'invitation de ton empire" value={invite} /></div>
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <ShareButton url={`/empire/${mine.slug}`} title={`${mine.name} — empire de VÆLORIA`} label="Partager l'empire" trackId={mine.slug} />
          <Link href={`/empire/${mine.slug}`} className={buttonClass("primary", "md")}>Voir mon empire</Link>
        </div>
      </Card>
    );
  }
  if (mine)
    return (
      <Card className="space-y-3">
        <p className="font-display text-lg font-bold uppercase">Tu fais déjà partie de {mine.name}</p>
        <p className="text-sm text-muted">Quitte ton empire actuel avant d&apos;en fonder un autre.</p>
        <Link href={`/empire/${mine.slug}`} className={buttonClass("secondary", "sm")}>Voir mon empire</Link>
      </Card>
    );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await worldAction("empire", { name: name.trim(), tag, motto: motto.trim(), color, crest });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setBorn((r.data as { slug: string }).slug);
    reload();
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Nom de l&apos;empire</span>
          <input required minLength={3} maxLength={24} value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="Ex. Ordre Noir" />
        </label>
        <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Tag</span>
            <input required pattern="[A-Z0-9]{2,5}" maxLength={5} value={tag} onChange={(e) => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} className={cn(input, "font-mono uppercase")} placeholder="ONR" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Devise <span className="font-normal text-subtle">(facultatif)</span></span>
            <input maxLength={80} value={motto} onChange={(e) => setMotto(e.target.value)} className={input} placeholder="Ex. Par le fer et le feu" />
          </label>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Couleur</legend>
          <div className="flex flex-wrap gap-2">
            {EMPIRE_COLORS.map((c) => (
              <label key={c} className={cn("grid size-10 cursor-pointer place-items-center rounded-md border-2", color === c ? "border-fg" : "border-transparent")}>
                <input type="radio" name="color" value={c} checked={color === c} onChange={() => setColor(c)} className="sr-only" />
                <span className="size-7 rounded-sm" style={{ background: c }} />
                <span className="sr-only">{c}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Blason</legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {CRESTS.map((c) => (
              <label key={c} className={cn("cursor-pointer rounded-md border p-1.5 text-center", crest === c ? "border-ruby bg-ruby/10" : "border-line hover:border-line-strong")}>
                <input type="radio" name="crest" value={c} checked={crest === c} onChange={() => setCrest(c)} className="sr-only" />
                <Crest crest={c} color={color} className="mx-auto size-10" />
                <span className="mt-1 block text-[11px] text-muted">{CREST_LABELS[c]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto">{busy ? "Fondation…" : "Fonder mon empire"}</Button>
      </div>
      <aside aria-label="Aperçu" className="lg:sticky lg:top-24 lg:self-start">
        <div className="metal-border rounded-[var(--radius-card)] p-6 text-center">
          <Crest crest={crest} color={color} className="mx-auto size-28" />
          <p className="mt-4 break-words font-display text-2xl font-bold uppercase tracking-[0.04em]">{name.trim() || "Ton empire"}</p>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-subtle">[{tag || "TAG"}] · Empire</p>
          {motto.trim() && <p className="mt-3 text-sm italic text-muted">« {motto.trim()} »</p>}
        </div>
      </aside>
    </form>
  );
}
