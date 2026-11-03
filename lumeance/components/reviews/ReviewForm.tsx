"use client";

import { useActionState, useId, useState } from "react";
import type { FormState } from "@/app/actions/public";
import { submitReview } from "@/app/actions/reviews";
import { buttonClass } from "@/components/ui/Button";
import { REVIEW_MAX_PHOTOS } from "@/lib/services/reviews";

/** Réduit une photo dans le navigateur (1600 px, JPEG) : envoi rapide, même depuis un téléphone. */
async function shrink(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.86));
    return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export function ReviewForm({
  token,
  productId,
  productName,
  defaultName,
}: {
  token: string;
  productId: string;
  productName: string;
  defaultName: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitReview, {
    ok: false,
    message: "",
  });
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const id = useId();
  const err = (k: string) => state.errors?.[k];

  if (state.ok)
    return (
      <p role="status" className="border border-champagne/40 bg-champagne/10 p-5 text-brun">
        {state.message}
      </p>
    );

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating || ""} />
      <div className="absolute -left-[9999px]" aria-hidden>
        <label>
          Site web <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <fieldset>
        <legend className="t-eyebrow text-brun/60">Votre note pour {productName}</legend>
        <div className="mt-2 flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} sur 5`}
              aria-pressed={rating === n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              className={`text-3xl leading-none transition-colors ${n <= (hover || rating) ? "text-champagne" : "text-brun/20"}`}
            >
              ★
            </button>
          ))}
        </div>
        {err("rating") && <p className="t-small mt-1 text-red-800">{err("rating")}</p>}
      </fieldset>

      <label className="block">
        <span className="t-eyebrow text-brun/60">Titre (facultatif)</span>
        <input
          name="title"
          maxLength={120}
          className="mt-2 w-full border-b border-brun/25 bg-transparent py-2 outline-none focus:border-champagne"
        />
      </label>
      <label className="block">
        <span className="t-eyebrow text-brun/60">Votre avis</span>
        <textarea
          name="body"
          required
          rows={5}
          maxLength={3000}
          placeholder="Qualité, rendu de la lumière, installation, livraison…"
          className="mt-2 w-full border border-brun/20 bg-transparent p-3 outline-none focus:border-champagne"
          aria-invalid={Boolean(err("body"))}
        />
        {err("body") && <p className="t-small mt-1 text-red-800">{err("body")}</p>}
      </label>
      <label className="block">
        <span className="t-eyebrow text-brun/60">Nom affiché</span>
        <input
          name="authorName"
          required
          maxLength={60}
          defaultValue={defaultName}
          className="mt-2 w-full border-b border-brun/25 bg-transparent py-2 outline-none focus:border-champagne"
        />
        <span className="t-small mt-1 block text-brun/50">
          Un prénom et une initiale suffisent, par exemple « Marie D. ».
        </span>
        {err("authorName") && <p className="t-small mt-1 text-red-800">{err("authorName")}</p>}
      </label>
      <label className="block">
        <span className="t-eyebrow text-brun/60">
          Photos chez vous (facultatif, {REVIEW_MAX_PHOTOS} au maximum)
        </span>
        <input
          id={`${id}-photos`}
          name="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
          multiple
          className="mt-2 block w-full text-sm"
          onChange={async (e) => {
            const input = e.currentTarget;
            const files = [...(input.files ?? [])].slice(0, REVIEW_MAX_PHOTOS);
            setPreparing(true);
            const dt = new DataTransfer();
            for (const f of files) dt.items.add(await shrink(f));
            input.files = dt.files;
            setPreparing(false);
          }}
        />
        {err("photos") && <p className="t-small mt-1 text-red-800">{err("photos")}</p>}
      </label>
      <label className="flex items-start gap-3 t-small text-brun/75">
        <input type="checkbox" name="consent" required className="mt-1 accent-champagne" />
        <span>
          J’accepte que mon avis, le nom affiché et mes photos soient publiés sur le site LUMÉANCE
          après relecture.{" "}
          <a href="/avis-clients" className="underline underline-offset-4">
            Comment nous traitons les avis
          </a>
          .
        </span>
      </label>
      {err("consent") && <p className="t-small text-red-800">{err("consent")}</p>}
      {state.message && !state.ok && (
        <p role="alert" className="t-small text-red-800">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending || preparing} className={buttonClass("solid")}>
        {preparing ? "Préparation des photos…" : pending ? "Envoi…" : "Envoyer mon avis"}
      </button>
    </form>
  );
}
