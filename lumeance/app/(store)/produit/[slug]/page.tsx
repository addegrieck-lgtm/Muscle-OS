import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductCard } from "@/components/catalog/ProductCard";
import { AccordionItem } from "@/components/product/Accordion";
import { AddToCart } from "@/components/product/AddToCart";
import { ProductGallery } from "@/components/product/ProductGallery";
import { StickyBuyBar } from "@/components/product/StickyBuyBar";
import { VariantProvider } from "@/components/product/VariantContext";
import { Breadcrumbs } from "@/components/ui/PageHeader";
import { categoryLabel } from "@/lib/navigation";
import { getProductBySlug, getProducts, relatedProducts } from "@/lib/services/catalog";
import { getShippingSettings } from "@/lib/services/content";
import { jsonLdScript, productJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Dimensions } from "@/types/catalog";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return {};
  return pageMetadata({
    title: p.seoTitle ?? `${p.name} — ${categoryLabel(p.categorySlug)}`,
    description: p.seoDescription ?? p.shortDescription ?? `${p.name}, luminaire design LUMÉANCE.`,
    path: `/produit/${p.slug}`,
    image: p.images[0]?.url,
    noindex: p.isDemo,
  });
}

const DIM_LABELS: Record<keyof Dimensions, string> = {
  height: "Hauteur",
  width: "Largeur",
  depth: "Profondeur",
  diameter: "Diamètre",
  cable_length: "Longueur de câble",
};

const formatMm = (mm: number) => `${(mm / 10).toLocaleString("fr-FR")} cm`;

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, all, shipping] = await Promise.all([
    getProductBySlug(slug),
    getProducts(),
    getShippingSettings(),
  ]);
  if (!product) notFound();
  const related = relatedProducts(all, product);
  const jsonLd = productJsonLd(product);
  const dims = Object.entries(product.dimensions).filter(([, v]) => typeof v === "number") as [
    keyof Dimensions,
    number,
  ][];
  const paragraphs = (product.description ?? "").split(/\n{2,}/).filter(Boolean);

  return (
    <>
      <div className="container-luxe pt-28 md:pt-32">
        <Breadcrumbs
          items={[
            { name: "Accueil", path: "/" },
            {
              name: categoryLabel(product.categorySlug) || "Collections",
              path: product.categorySlug ? `/collections/${product.categorySlug}` : "/collections",
            },
            { name: product.name, path: `/produit/${product.slug}` },
          ]}
        />
      </div>

      <section className="container-luxe mt-8 grid gap-12 pb-24 lg:grid-cols-12 lg:gap-20">
        <VariantProvider
          initial={product.variants.find((v) => v.active)?.id ?? null}
          initialOptions={Object.fromEntries(
            (product.options ?? []).map((o) => [o.id, o.values[0]!.id]),
          )}
        >
          <div className="lg:col-span-7">
            <ProductGallery product={product} />
          </div>
          <div className="lg:col-span-5 lg:pt-6">
            <p className="t-eyebrow text-champagne">{categoryLabel(product.categorySlug)}</p>
            <h1 className="t-h1 mt-4">{product.name}</h1>
            <p className="t-small mt-3 text-brun/50">Réf. {product.reference}</p>
            {product.shortDescription && (
              <p className="t-lead mt-8 text-brun/85">{product.shortDescription}</p>
            )}

            {product.isDemo && (
              <p className="t-small mt-8 border-l border-champagne bg-creme/60 px-4 py-3 text-brun/80">
                Pièce fictive présentée pour l’aperçu du showroom : vous pouvez l’ajouter au panier
                pour découvrir le parcours, mais elle ne peut pas être commandée.
              </p>
            )}

            <div id="achat" className="mt-10 scroll-mt-28">
              <AddToCart product={product} />
            </div>

            <div className="mt-10 border-t border-brun/10">
              <AccordionItem title="Description" open>
                <div className="space-y-4">
                  {paragraphs.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </AccordionItem>
              <AccordionItem title="Dimensions et matières">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 t-small">
                  {dims.map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-brun/55">{DIM_LABELS[k]}</dt>
                      <dd>{formatMm(v)}</dd>
                    </div>
                  ))}
                  {product.weight && (
                    <>
                      <dt className="text-brun/55">Poids</dt>
                      <dd>{(product.weight / 1000).toLocaleString("fr-FR")} kg</dd>
                    </>
                  )}
                  {product.materials.length > 0 && (
                    <>
                      <dt className="text-brun/55">Matières</dt>
                      <dd>{product.materials.join(", ")}</dd>
                    </>
                  )}
                  {product.finishes.length > 0 && (
                    <>
                      <dt className="text-brun/55">Finitions</dt>
                      <dd>{product.finishes.join(", ")}</dd>
                    </>
                  )}
                </dl>
                {product.isDemo && (
                  <p className="t-small mt-4 text-brun/50">
                    Dimensions indicatives d’une pièce fictive.
                  </p>
                )}
              </AccordionItem>
              <AccordionItem title="Fiche technique">
                {product.specifications.length > 0 ? (
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3 t-small">
                    {product.specifications.map((s) => (
                      <div key={s.label} className="contents">
                        <dt className="text-brun/55">{s.label}</dt>
                        <dd>{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="t-small">
                    La fiche technique complète (alimentation, culots, puissance, indice de
                    protection, documents de conformité) sera publiée après vérification des
                    documents du fournisseur.
                  </p>
                )}
              </AccordionItem>
              <AccordionItem title="Livraison et retours">
                <p className="t-small">{product.deliveryInformation ?? shipping.deliveryNote}</p>
                <p className="t-small mt-3">
                  Droit de rétractation de 14 jours et garanties légales : voir{" "}
                  <a href="/retours" className="underline underline-offset-4">
                    retours et garanties
                  </a>
                  .
                </p>
              </AccordionItem>
              <AccordionItem title="Installation">
                <p className="t-small">
                  {product.assemblyInformation ??
                    "Le raccordement d’un luminaire au réseau électrique doit être réalisé hors tension, dans le respect de la norme NF C 15-100. Nous recommandons l’intervention d’un électricien qualifié, en particulier pour les pièces lourdes ou installées en grande hauteur."}
                </p>
              </AccordionItem>
            </div>
          </div>
          <StickyBuyBar product={product} targetId="achat" />
        </VariantProvider>
      </section>

      {related.length > 0 && (
        <section className="bg-creme py-24 md:py-32" aria-labelledby="related-title">
          <div className="container-luxe">
            <h2 id="related-title" className="t-h2">
              Dans le même esprit
            </h2>
            <div className="mt-14 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-10">
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
        />
      )}
    </>
  );
}
