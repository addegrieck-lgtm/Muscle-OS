import { Container, Section } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { api, orNull } from "@/lib/api";
import { PREVIEW } from "@/lib/preview";
import { pageMeta } from "@/lib/seo";
import { CartWithNotice } from "./CartNotice";

export const revalidate = 30;
export const metadata = pageMeta({ title: "Panier", description: "Ton panier VÆLORIA.", path: "/boutique/panier", noindex: true });

export default async function CartPage() {
  const catalog = await orNull(api.shopCatalog());
  return (
    <>
      <PageHeader title="Panier" eyebrow="Boutique" crumbs={[{ name: "Boutique", path: "/boutique" }, { name: "Panier", path: "/boutique/panier" }]} />
      <Section className="py-8 sm:py-12">
        <Container>
          <CartWithNotice products={catalog?.products ?? []} checkoutEnabled={!PREVIEW && Boolean(catalog)} />
        </Container>
      </Section>
    </>
  );
}
