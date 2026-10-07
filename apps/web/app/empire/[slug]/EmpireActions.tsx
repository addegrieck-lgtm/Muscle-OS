"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink, Card, cn } from "@vaeloria/ui";
import { CopyField, ShareButton } from "@/components/world/Share";
import { loginHref, useMyWorld, worldAction } from "@/lib/world/useMyWorld";

/** Actions joueur sur une page d'empire : rejoindre, quitter, gérer (chef), partager. */
export function EmpireActions({ slug, name, recruiting }: { slug: string; name: string; recruiting: boolean }) {
  const [state, reload] = useMyWorld();
  const [code, setCode] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [motto, setMotto] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("code");
    if (c && /^[A-Z0-9]{8}$/.test(c)) setCode(c);
  }, []);

  async function run(path: string, body: object, ok: string, method: "POST" | "PATCH" = "POST") {
    setBusy(true);
    setMsg(null);
    const r = await worldAction(path, body, method);
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: r.error });
    if (r.ok) reload();
  }

  const share = <ShareButton url={`/empire/${slug}`} title={`${name} — empire de VÆLORIA`} label="Partager" trackId={slug} />;
  const feedback = msg && <p role={msg.ok ? "status" : "alert"} className={cn("text-sm", msg.ok ? "text-success" : "text-danger")}>{msg.text}</p>;

  if (state.status === "loading" || state.status === "unavailable") return <div className="flex flex-wrap gap-2">{share}</div>;
  if (state.status === "anonymous")
    return (
      <div className="flex flex-wrap gap-2">
        {(recruiting || code) && <ButtonLink href={loginHref(`/empire/${slug}${code ? `?code=${code}` : ""}`)}>Rejoindre l&apos;empire</ButtonLink>}
        {share}
      </div>
    );

  const mine = state.data.empire;
  if (!mine)
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {recruiting || code ? (
            <Button disabled={busy} onClick={() => run("empire/join", { slug, code: code ?? undefined }, `Bienvenue dans ${name}.`)}>Rejoindre l&apos;empire</Button>
          ) : (
            <span className="self-center text-sm text-muted">Cet empire recrute uniquement sur invitation.</span>
          )}
          {share}
        </div>
        {feedback}
      </div>
    );

  if (mine.slug !== slug)
    return (
      <div className="flex flex-wrap items-center gap-2">
        {share}
        <span className="text-sm text-muted">Tu fais partie de <a href={`/empire/${mine.slug}`} className="text-accent">{mine.name}</a>.</span>
      </div>
    );

  const leader = mine.role === "leader";
  const invite = mine.inviteCode ? `${window.location.origin}/empire/${slug}?code=${mine.inviteCode}` : null;
  return (
    <Card className="space-y-4">
      <p className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-accent">{leader ? "Tu diriges cet empire" : mine.role === "officer" ? "Officier de l'empire" : "Membre de l'empire"}</p>
      {invite && <CopyField label="Lien d'invitation" value={invite} />}
      {leader && (
        <div className="space-y-3 border-t border-line pt-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={mine.recruiting} disabled={busy} onChange={(e) => run("empire", { recruiting: e.target.checked }, e.target.checked ? "Recrutement ouvert." : "Recrutement sur invitation uniquement.", "PATCH")} />
            Recrutement ouvert à tous
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Devise</span>
            <input maxLength={80} value={motto ?? ""} placeholder="Nouvelle devise" onChange={(e) => setMotto(e.target.value)} className="h-10 w-full rounded-md border border-line bg-surface-2 px-3 text-fg" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Présentation</span>
            <textarea maxLength={600} rows={3} value={description ?? ""} placeholder="Présente ton empire aux recrues" onChange={(e) => setDescription(e.target.value)} className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-fg" />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy || (motto === null && description === null)} onClick={() => run("empire", { ...(motto !== null && { motto }), ...(description !== null && { description }) }, "Empire mis à jour. La page publique s'actualise sous une minute.", "PATCH")}>Enregistrer</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => run("empire", { regenerateCode: true }, "Nouveau lien d'invitation généré.", "PATCH")}>Nouveau lien</Button>
          </div>
        </div>
      )}
      {feedback}
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        {share}
        <Button variant="ghost" disabled={busy} onClick={() => { if (confirm(leader ? "Quitter l'empire ? Le commandement passera à un autre membre (ou l'empire sera dissous s'il est seul)." : "Quitter l'empire ?")) run("empire/leave", {}, "Tu as quitté l'empire."); }}>Quitter l&apos;empire</Button>
      </div>
    </Card>
  );
}
