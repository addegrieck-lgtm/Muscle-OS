import { describe, expect, it } from "vitest";
import {
  domainOf,
  isFollow,
  linksTo,
  parseGscLinksExport,
  referringDomains,
} from "@/lib/seo/backlinks";

describe("liens externes", () => {
  it("trouve les liens vers le site, leur texte et leur attribut rel", () => {
    const html = `
      <p>Voir <a href="https://maisonlumeance.fr/luminaires/escalier" rel="nofollow">ce lustre d&rsquo;escalier</a></p>
      <a class="x" href="https://www.maisonlumeance.fr/"><img src="l.png" alt="LUMÉANCE"></a>
      <a href="https://autre-site.fr/">ailleurs</a>
      <a href="https://maisonlumeance.fr.pirate.com/">piège</a>`;
    const f = linksTo(html, "maisonlumeance.fr");
    expect(f).toHaveLength(2);
    expect(f[0]).toMatchObject({ anchor: "ce lustre d’escalier", rel: "nofollow" });
    expect(f[1]!.anchor).toBe("[image] LUMÉANCE");
    expect(isFollow(f[0]!.rel)).toBe(false);
    expect(isFollow("")).toBe(true);
    expect(isFollow("noopener sponsored")).toBe(false);
  });

  it("lit l'export « Liens » de Search Console", () => {
    const csv = `Site,Pages liées\nexemple-deco.fr,3\n"https://blog.test.fr/article",1\n\nnotadomain,2`;
    expect(parseGscLinksExport(csv)).toEqual([
      "https://exemple-deco.fr/",
      "https://blog.test.fr/article",
    ]);
  });

  it("compte les domaines référents uniquement pour les liens obtenus", () => {
    expect(domainOf("https://www.Exemple.fr/a")).toBe("exemple.fr");
    expect(
      referringDomains([
        { source_domain: "a.fr", status: "obtenu" },
        { source_domain: "a.fr", status: "obtenu" },
        { source_domain: "b.fr", status: "prospect" },
      ]),
    ).toBe(1);
  });
});
