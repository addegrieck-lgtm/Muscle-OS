/**
 * Pièces mises en avant pour les restaurants, bars et hôtels, avec l'usage conseillé.
 * Seules les pièces publiées sont affichées (page /restauration et mention sur la fiche).
 * Conseils d'ambiance : ils ne valent pas validation réglementaire (ERP).
 */
export interface ProUse {
  /** Espace de l'établissement. */
  space: "salle" | "bar" | "accueil" | "murs";
  /** Usage conseillé, affiché sur la fiche et sur la page. */
  use: string;
}

export const PRO_SPACES: { id: ProUse["space"]; title: string; text: string }[] = [
  {
    id: "salle",
    title: "Au-dessus des tables",
    text: "Des suspensions répétées d’une table à l’autre donnent son rythme à la salle et posent une lumière basse, chaleureuse, sur les assiettes.",
  },
  {
    id: "bar",
    title: "Bar et comptoir",
    text: "Une ligne de lumière au-dessus du comptoir le désigne de loin et l’éclaire sans éblouir le personnel ni les clients.",
  },
  {
    id: "accueil",
    title: "Accueil et pièce maîtresse",
    text: "Un lustre sculptural à l’entrée, dans une double hauteur ou au centre de la salle : la pièce que l’on photographie et dont on se souvient.",
  },
  {
    id: "murs",
    title: "Murs, banquettes et terrasse",
    text: "Des appliques le long des banquettes, dans les couloirs ou sur la façade prolongent l’ambiance jusqu’aux tables du bord et à l’extérieur.",
  },
];

export const PRO_USES: Record<string, ProUse> = {
  luciole: { space: "salle", use: "En série au-dessus des tables d’une salle de restaurant." },
  aigrette: {
    space: "salle",
    use: "Au-dessus des tables, seule ou en série, pour une salle festive.",
  },
  constellation: {
    space: "bar",
    use: "Au-dessus d’un comptoir, d’un bar ou d’une grande table d’hôtes.",
  },
  meandre: {
    space: "bar",
    use: "Au-dessus d’un comptoir, d’une table d’hôtes ou d’une grande table.",
  },
  celeste: {
    space: "bar",
    use: "En version linéaire au-dessus d’un bar, ronde ou carrée dans une cage d’escalier.",
  },
  nebuleuse: { space: "accueil", use: "Pièce maîtresse d’une salle, d’un hall ou d’une entrée." },
  organza: {
    space: "accueil",
    use: "Lustre phare d’un hall, d’une salle principale ou d’une double hauteur.",
  },
  sylve: {
    space: "accueil",
    use: "Pièce de caractère pour une salle à l’esprit brasserie ou chalet.",
  },
  volute: {
    space: "murs",
    use: "Murs de salle, couloirs, façade et terrasse : étanche IP65, intérieur et extérieur.",
  },
  aiguille: { space: "murs", use: "Le long des banquettes et des tables adossées au mur." },
  silhouette: {
    space: "murs",
    use: "Mur d’accueil ou de salle : un tableau lumineux, une signature.",
  },
};

export const proUse = (slug: string): ProUse | null => PRO_USES[slug] ?? null;

/** Sujet prérempli du formulaire de contact. */
export const PRO_CONTACT_HREF = `/contact?objet=${encodeURIComponent(
  "Projet professionnel — restaurant, bar ou hôtel",
)}`;
