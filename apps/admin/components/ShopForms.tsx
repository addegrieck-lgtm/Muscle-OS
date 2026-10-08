"use client";

import { useActionState } from "react";
import { Button } from "@vaeloria/ui";
import { adjustPoints, refundOrder, saveCategory, savePromotion, saveRank, saveSettings, type FormState } from "@/lib/shopActions";

const local = (v: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const Err = ({ s }: { s: FormState }) => (s?.error ? <p role="alert" className="text-sm text-danger">{s.error}</p> : null);

type Promo = { id: string; name: string; label: string | null; kind: string; value: number; targetType: string; targetId: string | null; startsAt: string; endsAt: string | null; active: boolean };

export function PromotionForm({ promo, targets }: { promo: Promo | null; targets: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePromotion.bind(null, promo?.id ?? null), null);
  const target = promo ? (promo.targetType === "all" ? "all" : `${promo.targetType}:${promo.targetId}`) : "all";
  return (
    <form action={action} className="grid max-w-2xl gap-4">
      <label className="block"><span className="mb-1 block text-sm font-semibold">Nom interne</span><input name="name" required defaultValue={promo?.name} className="field" /></label>
      <label className="block"><span className="mb-1 block text-sm font-semibold">Badge affiché (ex. WEEK-END VÆLORIA)</span><input name="label" maxLength={40} defaultValue={promo?.label ?? ""} className="field" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-sm font-semibold">Type</span>
          <select name="kind" defaultValue={promo?.kind ?? "percent"} className="field">
            <option value="percent">Réduction en %</option><option value="fixed">Réduction fixe (€)</option><option value="points_bonus">Bonus de points</option>
          </select>
        </label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">Valeur (%, € ou points)</span>
          <input name="value" required inputMode="decimal" defaultValue={promo ? (promo.kind === "fixed" ? (promo.value / 100).toFixed(2) : promo.value) : ""} className="field" />
        </label>
      </div>
      <label className="block"><span className="mb-1 block text-sm font-semibold">S&apos;applique à</span>
        <select name="target" defaultValue={target} className="field">{targets.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-sm font-semibold">Début</span><input name="startsAt" type="datetime-local" defaultValue={local(promo?.startsAt ?? null)} className="field" /></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">Fin (vide = sans fin)</span><input name="endsAt" type="datetime-local" defaultValue={local(promo?.endsAt ?? null)} className="field" /></label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={promo?.active ?? true} /> Active</label>
      <p className="text-xs text-muted">Règles : la meilleure réduction s&apos;applique (pas de cumul) ; le plus grand bonus de points s&apos;ajoute ; les points automatiques suivent le prix réduit.</p>
      <Err s={state} />
      <div><Button type="submit" disabled={pending}>Enregistrer</Button></div>
    </form>
  );
}

type Rank = { key: string; name: string; minPoints: number; position: number; productId: string | null; color: string | null; perks: string[]; active: boolean };

export function RankForm({ rank, products }: { rank: Rank | null; products: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveRank.bind(null, rank?.key ?? null), null);
  return (
    <form action={action} className="grid gap-2 rounded-md border border-line p-3 sm:grid-cols-[110px_1fr_100px_70px_1fr_auto] sm:items-end">
      <label className="text-xs text-muted">Clé<input name="key" required defaultValue={rank?.key} className="field mt-1 font-mono text-sm" /></label>
      <label className="text-xs text-muted">Nom<input name="name" required defaultValue={rank?.name} className="field mt-1" /></label>
      <label className="text-xs text-muted">Seuil (points)<input name="minPoints" type="number" min={0} required defaultValue={rank?.minPoints} className="field mt-1" /></label>
      <label className="text-xs text-muted">Ordre<input name="position" type="number" required defaultValue={rank?.position} className="field mt-1" /></label>
      <label className="text-xs text-muted">Contenu livré (produit)
        <select name="productId" defaultValue={rank?.productId ?? ""} className="field mt-1">
          <option value="">— aucun —</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <div className="flex items-center gap-2">
        <input type="hidden" name="color" value={rank?.color ?? ""} />
        <input type="hidden" name="perks" value={(rank?.perks ?? []).join("\n")} />
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={rank?.active ?? true} /> actif</label>
        <Button type="submit" size="sm" disabled={pending}>{rank ? "Enregistrer" : "Ajouter"}</Button>
      </div>
      {state?.error && <p role="alert" className="text-sm text-danger sm:col-span-6">{state.error}</p>}
    </form>
  );
}

export function SettingsForm({ pointsPerEuro }: { pointsPerEuro: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettings, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="text-sm font-semibold">Points par euro dépensé<input name="pointsPerEuro" inputMode="decimal" defaultValue={pointsPerEuro} className="field mt-1 w-28" /></label>
      <Button type="submit" size="sm" disabled={pending}>Enregistrer</Button>
      <Err s={state} />
    </form>
  );
}

export function AdjustPointsForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(adjustPoints, null);
  return (
    <form action={action} className="grid max-w-2xl gap-2 sm:grid-cols-[1fr_100px_1fr_auto] sm:items-end">
      <label className="text-xs text-muted">UUID du joueur<input name="uuid" required className="field mt-1 font-mono text-xs" /></label>
      <label className="text-xs text-muted">Points (+/−)<input name="delta" type="number" required className="field mt-1" /></label>
      <label className="text-xs text-muted">Motif (visible par le joueur)<input name="label" required minLength={3} className="field mt-1" /></label>
      <Button type="submit" size="sm" disabled={pending}>Ajuster</Button>
      {state && <p className={`text-sm sm:col-span-4 ${state.error ? "text-danger" : "text-success"}`}>{state.error || "Ajustement enregistré dans le grand livre."}</p>}
    </form>
  );
}

export function RefundForm({ publicId, maxCents }: { publicId: string; maxCents: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(refundOrder.bind(null, publicId), null);
  return (
    <form action={action} className="grid max-w-xl gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-end">
      <label className="text-xs text-muted">Montant (€)<input name="amount" required inputMode="decimal" defaultValue={(maxCents / 100).toFixed(2)} className="field mt-1" /></label>
      <label className="text-xs text-muted">Motif<input name="reason" required minLength={3} className="field mt-1" /></label>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>Enregistrer le remboursement</Button>
      <Err s={state} />
    </form>
  );
}

type Cat = { id: string; name: string; description: string; position: number; active: boolean; seoTitle: string | null; seoDescription: string | null };

export function CategoryForm({ cat }: { cat: Cat }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCategory.bind(null, cat.id), null);
  return (
    <form action={action} className="grid gap-2 rounded-md border border-line p-3 sm:grid-cols-2">
      <label className="text-xs text-muted">Nom<input name="name" required defaultValue={cat.name} className="field mt-1" /></label>
      <label className="text-xs text-muted">Ordre<input name="position" type="number" defaultValue={cat.position} className="field mt-1" /></label>
      <label className="text-xs text-muted sm:col-span-2">Description<input name="description" defaultValue={cat.description} className="field mt-1" /></label>
      <label className="text-xs text-muted">Titre SEO<input name="seoTitle" maxLength={70} defaultValue={cat.seoTitle ?? ""} className="field mt-1" /></label>
      <label className="text-xs text-muted">Description SEO<input name="seoDescription" maxLength={170} defaultValue={cat.seoDescription ?? ""} className="field mt-1" /></label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="active" defaultChecked={cat.active} /> Visible</label>
        <Button type="submit" size="sm" disabled={pending}>Enregistrer</Button>
        <Err s={state} />
      </div>
    </form>
  );
}
