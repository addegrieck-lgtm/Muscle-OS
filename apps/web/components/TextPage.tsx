import { Container, Section } from "@vaeloria/ui";
import { Markdown } from "@/lib/markdown";
import { PageHeader } from "./PageHeader";

/** Page de texte (règlement, pages légales) écrite en Markdown. */
export function TextPage({ title, path, eyebrow, description, body, children }: { title: string; path: string; eyebrow?: string; description?: string; body: string; children?: React.ReactNode }) {
  return (
    <>
      <PageHeader title={title} eyebrow={eyebrow} description={description} crumbs={[{ name: title, path }]} />
      <Section>
        <Container className="max-w-3xl">
          <Markdown source={body} />
          {children}
        </Container>
      </Section>
    </>
  );
}
