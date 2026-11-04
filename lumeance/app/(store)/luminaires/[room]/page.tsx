import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductCard } from "@/components/catalog/ProductCard";
import { FurtherReading } from "@/components/linking/FurtherReading";
import { AccordionItem } from "@/components/product/Accordion";
import { PageHeader } from "@/components/ui/PageHeader";
import { ROOMS, roomById } from "@/lib/content/home";
import { ROOM_MIN_PRODUCTS, ROOM_SEO, roomProducts } from "@/lib/content/rooms-seo";
import { getProducts } from "@/lib/services/catalog";
import { listPublishedArticles } from "@/lib/services/journal";
import { guidesForRoom } from "@/lib/seo/linking";
import { pageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ room: string }> };

async function load(id: string) {
  const room = roomById(id);
  const seo = ROOM_SEO[id];
  if (!room || !seo) return null;
  const products = roomProducts(room.slugs, await getProducts());
  return { room, seo, products };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load((await params).room);
  if (!data) return {};
  return pageMetadata({
    title: data.seo.title,
    description: data.seo.description,
    path: `/luminaires/${data.room.id}`,
    // Trop peu de pièces en ligne : page trop mince pour les moteurs.
    noindex: data.products.length < ROOM_MIN_PRODUCTS,
  });
}

export default async function RoomPage({ params }: Props) {
  const data = await load((await params).room);
  if (!data) notFound();
  const { room, seo, products } = data;
  const others = ROOMS.filter((r) => r.id !== room.id && ROOM_SEO[r.id]);
  return (
    <>
      <PageHeader
        crumbs={[
          { name: "Accueil", path: "/" },
          { name: "Collections", path: "/collections" },
          { name: room.label, path: `/luminaires/${room.id}` },
        ]}
        eyebrow="Par pièce de la maison"
        title={seo.h1}
        intro={seo.intro}
      />

      <section className="container-luxe pb-24" aria-label="Pièces conseillées">
        <p className="t-eyebrow text-brun/60">
          {products.length} pièce{products.length > 1 ? "s" : ""} conseillée
          {products.length > 1 ? "s" : ""}
        </p>
        <div className="mt-8 grid gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-24">
          {products.map((p, i) => (
            <ProductCard key={p.slug} product={p} index={i} />
          ))}
        </div>
      </section>

      <section className="bg-creme py-24">
        <div className="container-luxe space-y-16">
          {seo.sections.map((s) => (
            <div key={s.h2} className="grid gap-6 md:grid-cols-12">
              <h2 className="t-h3 md:col-span-4">{s.h2}</h2>
              <div className="space-y-5 text-brun/80 md:col-span-7 md:col-start-6">
                {s.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-luxe grid gap-10 py-24 md:grid-cols-12">
        <h2 className="t-h3 md:col-span-4">Questions fréquentes</h2>
        <div className="md:col-span-7 md:col-start-6">
          {seo.faq.map((f) => (
            <AccordionItem key={f.q} title={f.q}>
              <p>{f.a}</p>
            </AccordionItem>
          ))}
        </div>
      </section>

      <FurtherReading
        title="Nos guides"
        articles={guidesForRoom(await listPublishedArticles(), room)}
      />

      <nav aria-label="Autres pièces" className="border-t border-brun/10 bg-ivoire py-16">
        <div className="container-luxe">
          <p className="t-eyebrow text-champagne">Éclairer une autre pièce</p>
          <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3 font-serif text-xl">
            {others.map((r) => (
              <li key={r.id}>
                <Link href={`/luminaires/${r.id}`} className="hover:text-champagne">
                  {r.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/collections" className="hover:text-champagne">
                Toute la collection
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}
