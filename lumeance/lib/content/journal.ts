import type { ArtForm } from "@/types/catalog";
import { SEASON_ARTICLES } from "./journal-saison";

export interface Article {
  slug: string;
  /** Date et heure de mise en ligne (ISO 8601) : l'article reste invisible avant. */
  publishedAt: string;
  category: string;
  title: string;
  description: string;
  excerpt: string;
  art: ArtForm;
  readingMinutes: number;
  sections: { heading: string; paragraphs: string[] }[];
  /** Questions fréquentes affichées en fin d'article. */
  faq?: { q: string; a: string }[];
  /** Pièces évoquées : seules celles publiées au catalogue sont affichées. */
  productSlugs?: string[];
  related: { href: string; label: string }[];
}

/** Guides éditoriaux. Conseils généraux et repères usuels, présentés comme tels ;
 * ils ne remplacent pas l'avis d'un électricien ou d'un architecte d'intérieur. */
const GUIDES: Article[] = [
  {
    slug: "choisir-un-lustre-pour-un-grand-salon",
    publishedAt: "2026-10-31T08:00:00+01:00",
    category: "Guides d’achat",
    title: "Choisir un lustre pour un grand salon",
    description:
      "Dimensions, hauteur d’accroche, style et lumière : les repères pour choisir un lustre adapté à un grand salon.",
    excerpt:
      "Échelle, hauteur, lumière : trois questions à se poser avant de choisir la pièce maîtresse d’un salon.",
    art: "tiers",
    readingMinutes: 6,
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
      {
        heading: "Choisir une silhouette selon le plafond",
        paragraphs: [
          "Sous un plafond standard, autour de 2,50 m, privilégiez les compositions qui s’étalent en largeur plutôt qu’en hauteur : couronnes, plateaux de globes, branches horizontales. Elles éclairent largement sans descendre trop bas dans la pièce.",
          "À partir de 3 m sous plafond, et plus encore dans un salon en double hauteur, les cascades et les lustres à plusieurs niveaux prennent tout leur sens. Ils occupent la verticale, se voient depuis la mezzanine ou l’escalier et ramènent la lumière vers l’espace de vie.",
        ],
      },
      {
        heading: "Centrer sur la pièce ou sur l’usage",
        paragraphs: [
          "Dans un grand salon, le centre géométrique n’est pas toujours le bon repère. Si la pièce réunit un coin salon et une table, centrez plutôt le lustre sur la zone que vous voulez mettre en valeur, et complétez l’autre partie par une suspension plus discrète ou des appliques.",
          "Au-dessus d’un canapé ou d’une table basse, la hauteur peut être un peu plus basse que dans un passage, puisque personne ne circule dessous : la lumière gagne en intimité.",
        ],
      },
      {
        heading: "Puissance et couleur de lumière",
        paragraphs: [
          "Pour un éclairage d’ambiance, un ordre de grandeur souvent cité est de 100 à 200 lumens par mètre carré, que vous répartissez entre le lustre et les autres sources. Mieux vaut un lustre généreux associé à un variateur qu’une pièce trop sage que l’on ne peut pas moduler.",
          "Les lumières chaudes, entre 2 700 et 3 000 K, conviennent au salon. Un indice de rendu des couleurs élevé, au-delà de 90, restitue fidèlement le bois, les tissus et les œuvres.",
        ],
      },
      {
        heading: "Le style au service de l’intérieur",
        paragraphs: [
          "Dans un intérieur contemporain épuré, un lustre aux lignes graphiques ou aux matières translucides apporte du relief sans alourdir. Dans un appartement ancien à moulures, une pièce plus organique ou en cristal dialogue avec le décor existant.",
        ],
      },
    ],
    faq: [
      {
        q: "Quelle taille de lustre pour un salon de 30 m² ?",
        a: "Pour une pièce d’environ 6 × 5 m, additionnez longueur et largeur (11) et multipliez par 8 : un diamètre de l’ordre de 85 à 90 cm sert de point de départ, à ajuster selon la légèreté de la silhouette.",
      },
      {
        q: "À quelle hauteur accrocher un lustre de salon ?",
        a: "Dans une zone de passage, gardez au moins 2,10 m sous le point le plus bas. Au-dessus d’une table basse ou d’un coin salon, il peut descendre un peu plus bas.",
      },
      {
        q: "Faut-il un variateur ?",
        a: "C’est recommandé : il permet de passer d’une lumière de réception à une ambiance du soir. Vérifiez que le luminaire et ses sources sont compatibles.",
      },
    ],
    productSlugs: ["celeste", "nebuleuse", "organza", "ginkgo", "sylve", "luciole"],
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
    publishedAt: "2026-10-31T08:00:00+01:00",
    category: "Conseils éclairage",
    title: "Installer une suspension dans une cage d’escalier",
    description:
      "Hauteur, longueur de câble, sécurité et entretien : comment installer une suspension ou un lustre en cascade dans une cage d’escalier.",
    excerpt:
      "La cage d’escalier est le lieu idéal d’un luminaire spectaculaire — à condition d’anticiper la hauteur, l’accès et la fixation.",
    art: "cascade",
    readingMinutes: 6,
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
      {
        heading: "Quel type de luminaire choisir",
        paragraphs: [
          "Les cascades, composées de nombreux éléments suspendus à des hauteurs différentes, sont les plus adaptées : elles accompagnent la montée et se lisent aussi bien d’en bas que depuis le palier. Globes de verre, anneaux, cônes ou cristal taillé donnent chacun une lecture différente de la verticale.",
          "Pour une trémie étroite, une composition resserrée sous un pavillon de petit diamètre évite de gêner le passage. Dans un grand escalier hélicoïdal, une spirale qui épouse la courbe des marches est particulièrement élégante.",
        ],
      },
      {
        heading: "Calculer la longueur de la cascade",
        paragraphs: [
          "Mesurez la hauteur entre le plafond et le niveau le plus bas visible, puis retirez une marge pour que le point le plus bas reste au-dessus de la tête des personnes qui circulent. Une cascade occupe souvent la moitié aux deux tiers de cette hauteur : assez pour habiter le volume, sans descendre jusqu’au sol.",
          "Les luminaires dont chaque fil se règle offrent une grande souplesse : la forme finale se compose sur place, en fonction des points de vue réels.",
        ],
      },
      {
        heading: "Une lumière qui sécurise la montée",
        paragraphs: [
          "Le luminaire décoratif ne suffit pas toujours à éclairer chaque marche. Des balisages dans le mur, en contremarche ou le long de la main courante complètent la composition et assurent la sécurité, en particulier la nuit.",
          "Un éclairage commandé depuis le bas et depuis l’étage, ou une télécommande, évite de monter dans le noir.",
        ],
      },
      {
        heading: "Préparer l’installation",
        paragraphs: [
          "Avant la livraison, repérez le point d’alimentation au plafond et vérifiez qu’il se trouve bien au centre de la trémie ou à l’endroit voulu. Un déport est parfois possible avec un pavillon plus large ou un crochet de renvoi, mais il se prévoit à l’avance.",
        ],
      },
    ],
    faq: [
      {
        q: "Quelle hauteur laisser sous un lustre d’escalier ?",
        a: "Le point le plus bas doit rester à une hauteur confortable au-dessus des marches et du palier, sans risque de le heurter. Mesurez depuis le niveau le plus haut où l’on circule sous le luminaire.",
      },
      {
        q: "Comment nettoyer un lustre en grande hauteur ?",
        a: "Prévoyez l’accès dès l’installation : escabeau adapté, échafaudage ou nacelle selon la hauteur. Un dépoussiérage doux, hors tension, suffit le plus souvent.",
      },
      {
        q: "Faut-il un électricien ?",
        a: "Oui, c’est vivement recommandé : le point d’accroche doit supporter le poids du luminaire et le raccordement doit respecter la norme NF C 15-100.",
      },
    ],
    productSlugs: ["ondee", "halo", "lucie", "perle", "organza", "celeste"],
    related: [
      { href: "/collections/suspensions", label: "Découvrir les suspensions" },
      { href: "/journal/choisir-un-luminaire-en-verre", label: "Choisir un luminaire en verre" },
    ],
  },
  {
    slug: "choisir-un-luminaire-en-verre",
    publishedAt: "2026-10-31T08:00:00+01:00",
    category: "Guides d’achat",
    title: "Choisir un luminaire en verre",
    description:
      "Verre transparent, opalin, ambré ou cristal : comprendre l’effet de chaque matière sur la lumière avant de choisir un luminaire.",
    excerpt:
      "Transparent, opalin, ambré, cristal : chaque verre transforme la lumière à sa manière.",
    art: "globes",
    readingMinutes: 5,
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
      {
        heading: "Verre soufflé, verre moulé, acrylique",
        paragraphs: [
          "Le verre soufflé présente de légères variations, bulles ou nuances, qui font le charme d’une pièce artisanale. Le verre moulé est plus régulier. L’acrylique, plus léger et moins fragile, permet des formes impossibles en verre, comme des plaques ondulées ou des anneaux éclairés par la tranche.",
          "Le cristal se distingue par sa pureté et son indice de réfraction élevé, qui renforcent les éclats lorsqu’il est taillé en facettes.",
        ],
      },
      {
        heading: "Adapter le verre à la pièce",
        paragraphs: [
          "Dans une salle à manger, un verre clair ou légèrement teinté au-dessus de la table crée une lumière vivante sans éblouir les convives, à condition de bien régler la hauteur. Dans un salon, un verre teinté ou fumé installe une atmosphère plus feutrée.",
          "Dans une cage d’escalier ou un hall, le cristal et le verre clair multiplient les reflets et donnent de l’éclat à un grand volume.",
        ],
      },
      {
        heading: "Entretenir le verre",
        paragraphs: [
          "Un dépoussiérage régulier au chiffon microfibre sec suffit la plupart du temps. Pour un nettoyage plus complet, travaillez hors tension, avec un chiffon légèrement humide, puis séchez pour éviter les traces. Évitez les produits abrasifs sur le verre teinté et les finitions métalliques.",
        ],
      },
      {
        heading: "Le verre et la couleur de la lumière",
        paragraphs: [
          "La teinte du verre se combine avec la couleur de la source. Un verre ambré sous une lumière chaude donne une ambiance très enveloppante ; le même verre sous une lumière froide paraît plus terne. À l’inverse, le verre clair et le cristal supportent bien une lumière neutre, qui fait ressortir leur transparence.",
          "En cas de doute, choisissez un luminaire dont la couleur de lumière se règle : vous pourrez l’ajuster après l’installation, selon la pièce et les saisons.",
        ],
      },
    ],
    faq: [
      {
        q: "Le verre clair éblouit-il ?",
        a: "Il laisse voir la source : placez-le en hauteur ou choisissez des sources à faible luminance et un variateur pour un confort visuel optimal.",
      },
      {
        q: "Quelle différence entre verre et cristal ?",
        a: "Le cristal a une réfraction plus forte : taillé en facettes, il fragmente davantage la lumière et projette des éclats sur les murs et le plafond.",
      },
      {
        q: "Comment nettoyer un lustre en verre ?",
        a: "Hors tension, avec un chiffon microfibre sec ou légèrement humide, puis un séchage soigneux. Pas de produit abrasif.",
      },
    ],
    productSlugs: ["celeste", "nebuleuse", "constellation", "perle", "lucie", "aigrette"],
    related: [
      { href: "/collections/suspensions", label: "Suspensions en verre et cristal" },
      { href: "/journal/les-luminaires-sculpturaux", label: "Les luminaires sculpturaux" },
    ],
  },
  {
    slug: "les-luminaires-sculpturaux",
    publishedAt: "2026-10-31T08:00:00+01:00",
    category: "Inspiration lumineuse",
    title: "Les luminaires sculpturaux",
    description:
      "Pourquoi les luminaires sculpturaux s’imposent dans les intérieurs contemporains, et comment les mettre en scène.",
    excerpt:
      "Allumés comme éteints, ils occupent l’espace comme une œuvre. Comment les mettre en scène.",
    art: "organic",
    readingMinutes: 5,
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
      {
        heading: "Jouer avec les ombres",
        paragraphs: [
          "Un luminaire sculptural ne se contente pas d’éclairer : il projette. Une feuille de métal enroulée, des branches ou des voiles d’acrylique dessinent sur les murs des ombres et des éventails de lumière qui prolongent l’objet bien au-delà de sa taille réelle.",
          "Pour en profiter, installez-le à proximité d’un mur clair et uni, et évitez de le noyer dans un éclairage général trop puissant.",
        ],
      },
      {
        heading: "Associer plusieurs pièces sans surcharger",
        paragraphs: [
          "Une pièce maîtresse au plafond peut dialoguer avec des appliques sculpturales sur les murs, à condition de partager une matière ou une couleur : un métal doré répété, un même noir mat. Au-delà de deux ou trois pièces fortes dans un même espace, l’œil ne sait plus où se poser.",
          "Les appliques en série, posées de part et d’autre d’un lit, d’une console ou le long d’un couloir, créent un rythme qui structure l’architecture.",
        ],
      },
      {
        heading: "Le choix de la lumière",
        paragraphs: [
          "Une lumière chaude met en valeur les métaux dorés et les matières naturelles ; une lumière plus neutre souligne le graphisme des pièces noires ou blanches. Les luminaires dont la couleur de lumière se règle permettent d’adapter l’ambiance selon les saisons et les moments de la journée.",
        ],
      },
      {
        heading: "Les erreurs à éviter",
        paragraphs: [
          "Accrocher une pièce sculpturale trop haut, au ras d’un plafond bas, l’écrase et lui retire sa présence. À l’inverse, la placer dans un passage étroit oblige à la contourner et finit par gêner.",
          "Autre écueil : l’éclairer elle-même avec des spots puissants. Un luminaire sculptural porte déjà sa propre lumière ; un éclairage d’appoint trop fort efface ses ombres et ses reflets.",
        ],
      },
      {
        heading: "Un investissement durable",
        paragraphs: [
          "Parce qu’il compte autant éteint qu’allumé, un luminaire sculptural se choisit comme un meuble de famille : pour sa silhouette d’abord, puis pour sa qualité de fabrication, ses matières et la possibilité de l’entretenir. Vérifiez les dimensions réelles, le poids et le type de source avant d’arrêter votre choix. Demandez conseil en cas de doute sur la taille : une pièce bien proportionnée se garde des années.",
        ],
      },
    ],
    faq: [
      {
        q: "Où placer un luminaire sculptural ?",
        a: "Là où il peut être vu de loin et projeter sa lumière sur une surface claire : au-dessus d’une grande table, dans un hall, une cage d’escalier ou sur un pan de mur dégagé.",
      },
      {
        q: "Peut-on mélanger plusieurs styles ?",
        a: "Oui, en gardant un fil conducteur : une même finition, une même couleur de métal ou une même famille de formes.",
      },
    ],
    productSlugs: ["ginkgo", "sylve", "organza", "volute", "silhouette", "meandre"],
    related: [
      { href: "/collections/appliques", label: "Appliques sculpturales" },
      {
        href: "/journal/tendances-de-l-eclairage-contemporain",
        label: "Tendances de l’éclairage contemporain",
      },
    ],
  },
  {
    slug: "tendances-de-l-eclairage-contemporain",
    publishedAt: "2026-10-31T08:00:00+01:00",
    category: "Tendances déco",
    title: "Les tendances de l’éclairage contemporain",
    description:
      "Lumière chaude, formes organiques, matières naturelles et éclairage en plusieurs plans : les grandes orientations de l’éclairage contemporain.",
    excerpt:
      "Lumière chaude, formes organiques, plusieurs plans de lumière : ce qui guide les intérieurs aujourd’hui.",
    art: "halo",
    readingMinutes: 5,
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
      {
        heading: "La lumière intégrée et linéaire",
        paragraphs: [
          "Les barres lumineuses, les rubans et les luminaires linéaires gagnent les salles à manger et les cuisines. Fines, presque architecturales, elles accompagnent une longue table ou un îlot et diffusent une lumière continue, sans point éblouissant.",
          "Associées à des finitions bois ou métal, elles prolongent le mobilier plutôt que de s’en distinguer.",
        ],
      },
      {
        heading: "Le retour du spectaculaire",
        paragraphs: [
          "À l’opposé de la discrétion, les grands volumes accueillent des pièces démonstratives : cascades de cristal, pluies de cônes dorés, anneaux suspendus en spirale. Elles transforment une cage d’escalier ou une double hauteur en véritable scène.",
          "Ces pièces s’accompagnent volontiers d’une commande à distance pour régler l’intensité, voire la couleur de la lumière.",
        ],
      },
      {
        heading: "Durabilité et confort visuel",
        paragraphs: [
          "Les sources LED intégrées réduisent la consommation et la fréquence d’entretien. L’attention se porte aussi sur le confort : lumière sans scintillement, bon rendu des couleurs, sources protégées pour éviter l’éblouissement direct.",
        ],
      },
      {
        heading: "Des teintes et des finitions plus douces",
        paragraphs: [
          "Le laiton brossé, l’or satiné, le noir mat et les tons bronze prennent le pas sur les chromes très brillants. Ils accrochent la lumière sans la renvoyer brutalement et vieillissent avec élégance.",
          "Le verre se teinte : fumé, ambré, cognac. Il apporte une chaleur immédiate, même éteint, et adoucit les intérieurs très minéraux.",
        ],
      },
      {
        heading: "Composer selon les moments de la journée",
        paragraphs: [
          "La tendance la plus durable n’est pas une forme mais un usage : prévoir plusieurs ambiances. Une lumière franche pour cuisiner ou recevoir, une lumière tamisée pour le soir, une veilleuse pour la nuit. Variateurs, télécommandes et circuits séparés rendent ces changements simples au quotidien.",
        ],
      },
      {
        heading: "Les matières naturelles à l’honneur",
        paragraphs: [
          "Céramique, bois veiné, métal brossé : les luminaires empruntent aux arts décoratifs et à la nature. Feuillages, ramures ou rubans de matière deviennent des sources de lumière à part entière, qui réchauffent les intérieurs minimalistes. Ces matières vieillissent bien et s’accordent facilement avec le mobilier existant, ce qui en fait un choix durable plutôt qu’un simple effet de mode passager. Elles se marient aussi bien avec un intérieur contemporain qu’avec un décor plus classique.",
        ],
      },
    ],
    faq: [
      {
        q: "Quelle couleur de lumière choisir aujourd’hui ?",
        a: "Les intérieurs privilégient les blancs chauds, autour de 2 700 à 3 000 K, pour les pièces à vivre, avec une lumière plus neutre pour les espaces de travail.",
      },
      {
        q: "Les luminaires LED intégrés sont-ils durables ?",
        a: "Ils consomment peu et durent longtemps ; vérifiez la garantie et la possibilité de remplacer le module en cas de panne.",
      },
    ],
    productSlugs: ["meandre", "halo", "organza", "ondee", "aiguille", "ginkgo"],
    related: [
      { href: "/collections", label: "Toutes les collections" },
      {
        href: "/journal/choisir-un-lustre-pour-un-grand-salon",
        label: "Choisir un lustre pour un grand salon",
      },
    ],
  },
];

/** Tous les articles, y compris ceux programmés (à ne jamais afficher tels quels). */
export const ALL_ARTICLES: Article[] = [...GUIDES, ...SEASON_ARTICLES];

/** Articles en ligne à la date donnée, du plus récent au plus ancien. */
export function publishedArticles(now: Date = new Date()): Article[] {
  return ALL_ARTICLES.filter((a) => new Date(a.publishedAt).getTime() <= now.getTime()).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

/** Article en ligne uniquement : un article programmé renvoie null (page 404). */
export function getArticle(slug: string, now: Date = new Date()): Article | null {
  return publishedArticles(now).find((a) => a.slug === slug) ?? null;
}

/** Prochain article programmé (pour l'administration et les tests). */
export function nextScheduledArticle(now: Date = new Date()): Article | null {
  return (
    ALL_ARTICLES.filter((a) => new Date(a.publishedAt).getTime() > now.getTime()).sort(
      (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
    )[0] ?? null
  );
}

/** « 3 novembre 2026 », en heure de Paris. */
export function formatArticleDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}
