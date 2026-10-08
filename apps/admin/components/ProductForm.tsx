"use client";

import { useActionState, useState } from "react";
import { Button } from "@vaeloria/ui";
import { saveProduct, type FormState } from "@/lib/shopActions";
import { DeliveryEditor } from "./DeliveryEditor";

type Product = {
  id: string; name: string; slug: string; categoryId: string; shortDescription: string; description: string; priceCents: number; points: number | null;
  imageUrl: string | null; stock: number | null; active: boolean; sortOrder: number; deliveryType: string;
  deliveries: { action: string; command: string | null; requireOnline: boolean }[];
};

const TYPES = ["RANK", "KIT", "ITEM", "SPAWNER", "PACK", "COSMETIC"];

export function ProductForm({ product, categories, pointsPerEuro }: { product: Product | null; categories: { id: string; name: string }[]; pointsPerEuro: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProduct.bind(null, product?.id ?? null), null);
  const [price, setPrice] = useState(product ? (product.priceCents / 100).toFixed(2) : "");
  const [mode, setMode] = useState(product?.points != null ? "custom" : "auto");
  const autoPoints = Math.floor(Number(price.replace(",", ".") || 0) * pointsPerEuro);
  const slugify = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/æ/g, "ae").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const [slug, setSlug] = useState(product?.slug ?? "");

  return (
    <form action={action} className="grid max-w-3xl gap-4">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom"><input name="name" required defaultValue={product?.name} onChange={(e) => !product && setSlug(slugify(e.target.value))} className="field" /></Field>
        <Field label="Slug (URL)"><input name="slug" required value={slug} onChange={(e) => setSlug(e.target.value)} pattern="[a-z0-9-]+" className="field font-mono text-sm" /></Field>
        <Field label="Catégorie">
          <select name="categoryId" defaultValue={product?.categoryId} className="field">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </Field>
        <Field label="Type de livraison">
          <select name="deliveryType" defaultValue={product?.deliveryType ?? "ITEM"} className="field">{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
        <Field label="Prix (€)"><input name="price" required inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="field" /></Field>
        <Field label="Points gagnés">
          <div className="flex items-center gap-2">
            <select name="pointsMode" value={mode} onChange={(e) => setMode(e.target.value)} className="field w-40">
              <option value="auto">Automatique</option><option value="custom">Personnalisé</option>
            </select>
            {mode === "custom" ? <input name="points" type="number" min={0} required defaultValue={product?.points ?? autoPoints} className="field" /> : <span className="text-sm text-muted">= {autoPoints} pts</span>}
          </div>
        </Field>
        <Field label="Stock (vide = illimité)"><input name="stock" type="number" min={0} defaultValue={product?.stock ?? ""} className="field" /></Field>
        <Field label="Ordre d'affichage"><input name="sortOrder" type="number" defaultValue={product?.sortOrder ?? 0} className="field" /></Field>
      </fieldset>
      <Field label="Description courte (carte produit)"><input name="shortDescription" maxLength={200} defaultValue={product?.shortDescription} className="field" /></Field>
      <Field label="Description"><textarea name="description" rows={4} defaultValue={product?.description} className="field" /></Field>
      <Field label="Image (URL, facultatif)"><input name="imageUrl" type="url" defaultValue={product?.imageUrl ?? ""} className="field" /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={product?.active ?? false} className="size-4" /> Actif (visible en boutique)</label>
      <fieldset className="rounded-[var(--radius-card)] border border-line p-4">
        <legend className="px-1 text-sm font-semibold">Livraison en jeu</legend>
        <DeliveryEditor initial={product?.deliveries ?? []} />
      </fieldset>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <div><Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</Button></div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}
