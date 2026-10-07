import { Container, Section } from "@vaeloria/ui";
import { FaqList } from "@/components/Faq";
import { PageHeader } from "@/components/PageHeader";
import { FALLBACK_FAQ } from "@/content/faq";
import { api, orNull } from "@/lib/api";
import { JsonLd, faqLd, pageMeta } from "@/lib/seo";

export const revalidate = 300;
export const metadata = pageMeta({
  title: "FAQ — version, IP, comment rejoindre",
  description: "Questions fréquentes sur VÆLORIA : version Minecraft, IP du serveur, comment rejoindre, fonctionnement du Faction, PvP 1.8, saison et Discord.",
  path: "/faq",
});

export default async function FaqPage() {
  const faq = await orNull(api.get<{ items: { question: string; answer: string }[] }>("/api/v1/faq", { revalidate: 300 }));
  const items = faq?.items.length ? faq.items : FALLBACK_FAQ;
  return (
    <>
      <JsonLd data={faqLd(items)} />
      <PageHeader eyebrow="FAQ" title="Questions fréquentes" crumbs={[{ name: "FAQ", path: "/faq" }]} />
      <Section>
        <Container className="max-w-3xl">
          <FaqList items={items} />
        </Container>
      </Section>
    </>
  );
}
