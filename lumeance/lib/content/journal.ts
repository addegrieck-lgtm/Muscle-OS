import type { ArtForm } from "@/types/catalog";

export interface Article {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  art: ArtForm;
  readingMinutes: number;
  sections: { heading: string; paragraphs: string[] }[];
  related: { href: string; label: string }[];
}

/** Guides éditoriaux. Conseils généraux et repères usuels, présentés comme tels ;
 * ils ne remplacent pas l'avis d'un électricien ou d'un architecte d'intérieur. */
export const ARTICLES: Article[] = [
  {
    slug: "choisir-un-lustre-pour-un-grand-salon",
    title: "Choisir un lustre pour un grand salon",
    description:
      "Dimensions, hauteur d’accroche, style et lumière : les repères pour choisir un lustre adapté à un grand salon.",
    excerpt:
      "Échelle, hauteur, lumière : trois questions à se poser avant de choisir la pièce maîtresse d’un salon.",
    art: "tiers",
    readingMinutes: 4,
    sections: [
      {
        heading: "Partir de l’échelle de la pièce",
        paragraphs: [
          "Un lustre trop petit se perd dans un grand volume ; trop grand, il écrase la pièce. Un repère couramment utilisé : additionnez la longueur et la largeur de la pièce en mètres, puis multipliez par 8 environ pour obtenir un ordre de grandeur du diamètre en centimètres. Une pièce de 6 × 5 mètres appelle ainsi un lustre d’environ 85 à 90 cm de diamètre.",
          "Ce calcul n’est qu’un point de départ : une silhouette aérienne, en verre ou en fils fins, peut se permettre un diamètre plus généreux qu’une pièce dense en cristal.",
        ],
      },
      {
        heading: "Régler la hauteur",
        paragraphs: [
          "Dans une zone de passage, laissez une hauteur libre confortable sous le point le plus bas du luminaire — un minimum de 2,10 m est souvent retenu. Avec une grande hauteur sous plafond, un lustre en cascade ou à plusieurs niveaux permet d’occuper la verticale et de ramener la lumière à hauteur d’homme.",
        ],
      },
      {
        heading: "Penser la lumière, pas seulement l’objet",
        paragraphs: [
          "Le lustre fixe l’ambiance générale ; il gagne à être complété par des appliques et des lampadaires pour créer plusieurs plans de lumière. Une température de couleur chaude (autour de 2 700 K) et un variateur compatible donnent une atmosphère enveloppante le soir.",
          "Enfin, vérifiez le poids de la pièce et la nature du plafond : les luminaires lourds exigent une fixation adaptée, à faire valider par un professionnel.",
        ],
      },
    ],
    related: [
      { href: "/collections/lustres", label: "Découvrir les lustres" },
      {
        href: "/journal/installer-une-suspension-dans-une-cage-d-escalier",
        label: "Éclairer une cage d’escalier",
      },
    ],
  },
  {
    slug: "installer-une-suspension-dans-une-cage-d-escalier",
    title: "Installer une suspension dans une cage d’escalier",
    description:
      "Hauteur, longueur de câble, sécurité et entretien : comment installer une suspension ou un lustre en cascade dans une cage d’escalier.",
    excerpt:
      "La cage d’escalier est le lieu idéal d’un luminaire spectaculaire — à condition d’anticiper la hauteur, l’accès et la fixation.",
    art: "cascade",
    readingMinutes: 4,
    sections: [
      {
        heading: "Un volume vertical à habiter",
        paragraphs: [
          "Une cage d’escalier offre souvent la plus grande hauteur de la maison. Les compositions verticales — cascades de globes, suspensions à plusieurs niveaux — y trouvent naturellement leur place et se découvrent sous plusieurs angles au fil de la montée.",
        ],
      },
      {
        heading: "Mesurer avant de choisir",
        paragraphs: [
          "Relevez la hauteur entre le plafond et le palier le plus bas, ainsi que l’espace libre au centre de la trémie. Le luminaire ne doit gêner ni le passage ni la main courante, et son point le plus bas doit rester à une hauteur confortable au-dessus des marches.",
          "Vérifiez la longueur de câble disponible et la possibilité de la régler : c’est elle qui permettra d’ajuster finement la composition une fois en place.",
        ],
      },
      {
        heading: "Fixation, accès et entretien",
        paragraphs: [
          "Le point d’accroche doit supporter le poids du luminaire : un renfort peut être nécessaire selon la nature du plafond. Le raccordement se fait hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est vivement recommandée.",
          "Pensez dès le départ à l’accès pour le nettoyage et le remplacement des sources : en grande hauteur, un échafaudage ou une nacelle peut être nécessaire.",
        ],
      },
    ],
    related: [
      { href: "/collections/suspensions", label: "Découvrir les suspensions" },
      { href: "/journal/choisir-un-luminaire-en-verre", label: "Choisir un luminaire en verre" },
    ],
  },
  {
    slug: "choisir-un-luminaire-en-verre",
    title: "Choisir un luminaire en verre",
    description:
      "Verre transparent, opalin, ambré ou cristal : comprendre l’effet de chaque matière sur la lumière avant de choisir un luminaire.",
    excerpt:
      "Transparent, opalin, ambré, cristal : chaque verre transforme la lumière à sa manière.",
    art: "globes",
    readingMinutes: 3,
    sections: [
      {
        heading: "Transparent : la lumière à nu",
        paragraphs: [
          "Le verre clair laisse voir la source et projette une lumière nette. Il met en valeur les sources décoratives et crée des reflets vivants, mais peut éblouir : préférez-le en hauteur ou associé à des sources de faible luminance.",
        ],
      },
      {
        heading: "Opalin : une lumière diffuse",
        paragraphs: [
          "Le verre opalin diffuse la lumière de façon homogène et douce. C’est le choix des pièces à vivre, des chambres et des appliques placées à hauteur des yeux.",
        ],
      },
      {
        heading: "Ambré et fumé : la chaleur",
        paragraphs: [
          "Teinté, le verre réchauffe la lumière et lui donne une couleur de fin de journée. L’effet est très décoratif, au prix d’un flux lumineux réduit : prévoyez d’autres sources pour l’éclairage fonctionnel.",
        ],
      },
      {
        heading: "Cristal : le jeu des reflets",
        paragraphs: [
          "Taillé en facettes, le cristal fragmente la lumière et dessine des éclats sur les murs et le plafond. Il demande un entretien régulier pour conserver son éclat : un chiffon doux et sec suffit le plus souvent.",
        ],
      },
    ],
    related: [
      { href: "/collections/suspensions", label: "Suspensions en verre et cristal" },
      { href: "/journal/les-luminaires-sculpturaux", label: "Les luminaires sculpturaux" },
    ],
  },
  {
    slug: "les-luminaires-sculpturaux",
    title: "Les luminaires sculpturaux",
    description:
      "Pourquoi les luminaires sculpturaux s’imposent dans les intérieurs contemporains, et comment les mettre en scène.",
    excerpt:
      "Allumés comme éteints, ils occupent l’espace comme une œuvre. Comment les mettre en scène.",
    art: "organic",
    readingMinutes: 3,
    sections: [
      {
        heading: "Une présence avant d’être une source",
        paragraphs: [
          "Un luminaire sculptural se regarde en plein jour. Sa silhouette — une arche, une branche, une constellation de globes — structure la pièce même éteint, à la manière d’une œuvre d’art.",
        ],
      },
      {
        heading: "Lui laisser de l’espace",
        paragraphs: [
          "Comme une sculpture, il a besoin de vide autour de lui. Évitez de le concurrencer par d’autres pièces fortes dans le même champ de vision ; un mur nu, un plafond haut ou une grande table lui offrent le cadre idéal.",
        ],
      },
      {
        heading: "Accorder matières et intérieur",
        paragraphs: [
          "Laiton et métal doré dialoguent avec le bois, la pierre et les textiles naturels ; le verre apporte de la légèreté aux pièces très architecturées. Une même finition répétée sur quelques éléments suffit à créer une cohérence.",
        ],
      },
    ],
    related: [
      { href: "/collections/lampadaires", label: "Lampadaires sculpturaux" },
      {
        href: "/journal/tendances-de-l-eclairage-contemporain",
        label: "Tendances de l’éclairage contemporain",
      },
    ],
  },
  {
    slug: "tendances-de-l-eclairage-contemporain",
    title: "Les tendances de l’éclairage contemporain",
    description:
      "Lumière chaude, formes organiques, matières naturelles et éclairage en plusieurs plans : les grandes orientations de l’éclairage contemporain.",
    excerpt:
      "Lumière chaude, formes organiques, plusieurs plans de lumière : ce qui guide les intérieurs aujourd’hui.",
    art: "halo",
    readingMinutes: 3,
    sections: [
      {
        heading: "Des lumières plus chaudes et modulables",
        paragraphs: [
          "Les intérieurs contemporains privilégient des températures de couleur chaudes et des sources variables. Un bon indice de rendu des couleurs (IRC) restitue fidèlement les matières, le bois comme les textiles.",
        ],
      },
      {
        heading: "Plusieurs plans de lumière",
        paragraphs: [
          "Plutôt qu’un plafonnier unique, on compose : une pièce maîtresse au centre, des appliques pour révéler les murs, des lampadaires et des lampes pour les usages. Chaque scène se règle selon le moment de la journée.",
        ],
      },
      {
        heading: "Formes organiques et matières nobles",
        paragraphs: [
          "Courbes, globes, compositions inspirées du végétal : les formes s’adoucissent. Le verre soufflé, le laiton et les finitions satinées remplacent les surfaces trop brillantes, pour une élégance plus discrète.",
        ],
      },
    ],
    related: [
      { href: "/collections", label: "Toutes les collections" },
      {
        href: "/journal/choisir-un-lustre-pour-un-grand-salon",
        label: "Choisir un lustre pour un grand salon",
      },
    ],
  },
];

export const getArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug) ?? null;
