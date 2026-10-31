import { LogoSymbol } from "@/components/brand/Logo";
import { NewsletterForm } from "@/components/layout/NewsletterForm";

export function Newsletter({ title }: { title: string }) {
  return (
    <section
      className="relative overflow-hidden bg-creme py-28 md:py-40"
      aria-labelledby="newsletter-title"
    >
      <div className="container-luxe flex flex-col items-center text-center">
        <LogoSymbol className="h-16 w-16" />
        <h2 id="newsletter-title" data-reveal className="t-h2 mt-8 max-w-3xl">
          {title}
        </h2>
        <p data-reveal className="mt-6 max-w-lg text-brun/75">
          Nouvelles créations, coulisses de la maison et conseils de mise en lumière. Quelques
          lettres par an, jamais plus.
        </p>
        <div data-reveal className="mt-12 flex w-full justify-center text-left">
          <NewsletterForm source="home" />
        </div>
      </div>
    </section>
  );
}
