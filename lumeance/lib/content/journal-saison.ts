import type { Article } from "./journal";

/**
 * Programme éditorial hiver 2026-2027 : un article par semaine, le mardi à 8 h (heure de Paris).
 * Un article n'est visible (Journal, page, sitemap) qu'à partir de sa date `publishedAt`.
 * Conseils généraux et repères usuels, présentés comme tels ; aucune caractéristique de produit
 * n'est donnée ici au-delà de ce que précisent les fiches.
 */
export const SEASON_ARTICLES: Article[] = [
  {
    slug: "creer-une-ambiance-cocooning-avec-la-lumiere",
    publishedAt: "2026-11-03T08:00:00+01:00",
    category: "Ambiances et styles",
    title: "Créer une ambiance cocooning avec la lumière",
    description:
      "Lumière chaude, points lumineux bas, intensité réglable : comment transformer une pièce en refuge douillet quand les jours raccourcissent.",
    excerpt:
      "Quand les jours raccourcissent, la lumière devient le premier matériau du confort. Quelques principes suffisent à réchauffer une pièce.",
    art: "organic",
    readingMinutes: 5,
    sections: [
      {
        heading: "Le cocooning commence par la couleur de la lumière",
        paragraphs: [
          "Une ambiance enveloppante tient d’abord à la teinte de la lumière. Un blanc chaud, autour de 2 700 à 3 000 kelvins, rappelle la lueur d’une flamme ou d’un coucher de soleil : il adoucit les matières, réchauffe le bois et donne aux tissus un aspect plus moelleux. Un blanc froid, au-delà de 5 000 kelvins, convient aux espaces de travail mais refroidit un salon le soir.",
          "Si votre luminaire propose plusieurs teintes, réservez le blanc chaud aux pièces de vie et aux soirées. C’est le réglage le plus simple pour passer d’une pièce fonctionnelle à une pièce où l’on a envie de rester.",
        ],
      },
      {
        heading: "Multiplier les sources plutôt qu’augmenter la puissance",
        paragraphs: [
          "Une seule source au centre du plafond écrase les volumes et laisse les angles dans l’ombre. Le cocooning naît au contraire de plusieurs foyers lumineux répartis dans la pièce : une suspension au-dessus de la table basse, une applique près d’un fauteuil, une lampe posée sur une console.",
          "Chaque source éclaire peu, mais l’ensemble dessine des zones de lumière et d’ombre qui donnent de la profondeur. L’œil se repose, la pièce paraît plus intime, sans être sombre.",
        ],
      },
      {
        heading: "Faire descendre la lumière",
        paragraphs: [
          "Plus la lumière est basse, plus l’ambiance est feutrée. Une suspension réglée un peu plus bas au-dessus d’une table ou d’un coin lecture concentre la lumière là où l’on vit, au lieu de baigner tout le volume.",
          "Les appliques murales jouent le même rôle : posées à hauteur d’yeux ou légèrement au-dessus, elles éclairent les murs et créent un halo qui agrandit visuellement la pièce tout en la rendant plus chaleureuse.",
        ],
      },
      {
        heading: "Choisir des matières qui adoucissent",
        paragraphs: [
          "Le verre dépoli, l’acrylique opalin ou le cristal diffusent et fragmentent la lumière. Ils évitent l’éblouissement d’une ampoule nue et produisent une lueur douce, parfois scintillante, qui participe à l’atmosphère.",
          "Les finitions métalliques chaudes — laiton, or champagne, doré — renvoient elles aussi une lumière dorée. Associées à des textiles épais et à du bois, elles complètent naturellement une ambiance d’hiver.",
        ],
      },
      {
        heading: "Pouvoir baisser l’intensité",
        paragraphs: [
          "Un variateur ou une télécommande permet d’adapter la lumière au moment : pleine intensité pour recevoir, lumière tamisée pour un film ou une soirée calme. Vérifiez simplement que les ampoules et le luminaire sont compatibles avec la variation, car toutes les LED ne le sont pas.",
        ],
      },
    ],
    faq: [
      {
        q: "Quelle température de couleur choisir pour une ambiance cocooning ?",
        a: "Un blanc chaud, entre 2 700 et 3 000 K environ. Il donne une lumière dorée, proche de celle d’une flamme, qui réchauffe les matières.",
      },
      {
        q: "Faut-il plusieurs luminaires dans un salon ?",
        a: "Oui, idéalement. Plusieurs sources réparties dans la pièce créent de la profondeur et une ambiance plus douce qu’un unique point lumineux au plafond.",
      },
    ],
    productSlugs: ["luciole", "silhouette"],
    related: [
      { href: "/collections/suspensions", label: "Voir les suspensions" },
      { href: "/collections/appliques", label: "Voir les appliques" },
    ],
  },
  {
    slug: "blanc-chaud-neutre-ou-froid-choisir-la-temperature-de-couleur",
    publishedAt: "2026-11-10T08:00:00+01:00",
    category: "Conseils éclairage",
    title: "Blanc chaud, neutre ou froid : choisir la bonne température de couleur",
    description:
      "Comprendre les kelvins pour choisir une lumière blanc chaud, neutre ou froid selon la pièce, l’usage et l’ambiance recherchée.",
    excerpt:
      "Derrière les mots « chaud » et « froid », une échelle simple : les kelvins. La comprendre évite bien des déceptions une fois le luminaire installé.",
    art: "globes",
    readingMinutes: 5,
    sections: [
      {
        heading: "Ce que mesurent les kelvins",
        paragraphs: [
          "La température de couleur, exprimée en kelvins (K), décrit la teinte d’une lumière blanche. Plus le chiffre est bas, plus la lumière tire vers le jaune orangé ; plus il est élevé, plus elle tire vers le bleu. Elle ne dit rien de la puissance : une lumière froide n’éclaire pas davantage qu’une lumière chaude.",
          "On distingue en pratique trois familles : le blanc chaud (environ 2 700 à 3 000 K), le blanc neutre (autour de 4 000 K) et le blanc froid (5 000 K et au-delà).",
        ],
      },
      {
        heading: "Le blanc chaud, pour les pièces de vie",
        paragraphs: [
          "C’est la lumière du salon, de la salle à manger et de la chambre. Elle valorise le bois, les tissus et les teintes de peau, et favorise la détente en soirée. C’est aussi celle qui met le mieux en valeur le verre ambré, le cristal et les métaux dorés.",
        ],
      },
      {
        heading: "Le blanc neutre, l’équilibre",
        paragraphs: [
          "Plus proche de la lumière du jour en milieu de journée, le blanc neutre restitue les couleurs de façon fidèle sans paraître clinique. Il convient bien à une cuisine, à une entrée peu lumineuse ou à un bureau à la maison. Dans un intérieur aux tons gris, blancs ou béton, il peut aussi être plus juste qu’un blanc très chaud.",
        ],
      },
      {
        heading: "Le blanc froid, pour la précision",
        paragraphs: [
          "Le blanc froid stimule et favorise la concentration. Il trouve sa place dans un atelier, un dressing où l’on veut distinguer précisément les couleurs, ou une salle de bains pour se maquiller. Dans un salon, il donne vite une impression d’espace public.",
          "Certains luminaires permettent de choisir la teinte, voire de passer de l’une à l’autre : c’est une souplesse appréciable dans une pièce aux usages multiples.",
        ],
      },
      {
        heading: "Garder la même teinte dans une même pièce",
        paragraphs: [
          "Mélanger un blanc chaud et un blanc froid dans le même espace crée un contraste rarement heureux : les zones paraissent mal assorties. Une fois la teinte choisie, gardez-la pour toutes les sources de la pièce, y compris les lampes d’appoint.",
        ],
      },
    ],
    faq: [
      {
        q: "Une lumière froide éclaire-t-elle plus qu’une lumière chaude ?",
        a: "Non. La température de couleur décrit la teinte de la lumière ; la quantité de lumière se mesure en lumens.",
      },
      {
        q: "Quelle teinte pour une chambre ?",
        a: "Un blanc chaud, autour de 2 700 K, qui accompagne la détente en fin de journée.",
      },
    ],
    productSlugs: ["celeste", "nebuleuse"],
    related: [
      { href: "/collections", label: "Toutes les pièces" },
      {
        href: "/journal/creer-une-ambiance-cocooning-avec-la-lumiere",
        label: "L’ambiance cocooning",
      },
    ],
  },
  {
    slug: "comment-choisir-une-suspension-pour-son-salon",
    publishedAt: "2026-11-17T08:00:00+01:00",
    category: "Guides d’achat",
    title: "Comment choisir une suspension pour son salon",
    description:
      "Taille, hauteur, style et lumière : les repères pour choisir une suspension de salon à la bonne échelle et bien la placer.",
    excerpt:
      "Une suspension de salon se choisit d’abord par rapport au volume de la pièce et à ce qu’elle doit éclairer. Le style vient ensuite.",
    art: "organic",
    readingMinutes: 6,
    sections: [
      {
        heading: "Définir son rôle avant son style",
        paragraphs: [
          "Une suspension peut éclairer l’ensemble du salon, signaler un espace (le coin canapé, la table basse) ou simplement servir de pièce décorative. Ce rôle détermine sa taille et sa position bien plus que son esthétique.",
          "Au centre de la pièce, elle sert d’éclairage d’ambiance général. Décalée au-dessus d’une table basse ou d’un coin lecture, elle structure l’espace et crée un point focal.",
        ],
      },
      {
        heading: "Trouver la bonne échelle",
        paragraphs: [
          "Un repère couramment utilisé consiste à additionner la longueur et la largeur de la pièce en mètres et à multiplier le résultat par 8 à 10 pour obtenir un ordre de grandeur du diamètre en centimètres. Un salon de 5 × 4 mètres appelle ainsi une suspension de 70 à 90 cm environ.",
          "Ce n’est qu’un point de départ : une pièce très haute sous plafond supporte une pièce plus imposante, un salon bas de plafond appelle une silhouette plus légère ou plus horizontale.",
        ],
      },
      {
        heading: "Régler la hauteur",
        paragraphs: [
          "Dans une zone de passage, on laisse généralement au moins 2,10 m environ entre le sol et le bas du luminaire pour circuler sans gêne. Au-dessus d’une table basse, où personne ne passe dessous, elle peut descendre davantage et devenir plus présente.",
          "Les modèles à câbles réglables offrent une vraie liberté : indiquez la hauteur sous plafond avant l’installation pour ajuster la longueur.",
        ],
      },
      {
        heading: "Accorder la forme et les matières",
        paragraphs: [
          "Une couronne ou une silhouette organique adoucit un salon aux lignes droites ; une composition de sphères apporte de la légèreté ; un modèle sculptural affirme le caractère de la pièce. Les matières suivent la même logique : le verre et le cristal apportent de la lumière réfléchie, le métal noir du graphisme, le doré de la chaleur.",
        ],
      },
      {
        heading: "Penser à la lumière qu’elle diffuse",
        paragraphs: [
          "Une suspension aux sources apparentes éblouit davantage qu’un modèle à diffuseurs. Dans un salon, privilégiez une lumière filtrée — verre dépoli, acrylique, cristal — et une teinte chaude. Complétez-la par une ou deux sources d’appoint pour éviter que tout repose sur elle.",
        ],
      },
    ],
    faq: [
      {
        q: "À quelle hauteur accrocher une suspension dans un salon ?",
        a: "Dans une zone de passage, comptez au moins 2,10 m environ sous le luminaire. Au-dessus d’une table basse, elle peut descendre plus bas.",
      },
      {
        q: "Quelle taille de suspension pour un salon de 20 m² ?",
        a: "Pour une pièce de 5 × 4 m, un ordre de grandeur de 70 à 90 cm de diamètre, à ajuster selon la hauteur sous plafond et le style.",
      },
    ],
    productSlugs: ["luciole", "aigrette", "constellation"],
    related: [
      { href: "/collections/suspensions", label: "Voir les suspensions" },
      {
        href: "/journal/choisir-un-lustre-pour-un-grand-salon",
        label: "Choisir un lustre pour un grand salon",
      },
    ],
  },
  {
    slug: "eclairer-une-salle-a-manger",
    publishedAt: "2026-11-24T08:00:00+01:00",
    category: "Conseils éclairage",
    title: "Éclairer une salle à manger : taille, hauteur et position de la suspension",
    description:
      "Les repères pour éclairer une table de salle à manger : dimensions de la suspension, hauteur au-dessus de la table, modèles linéaires ou ronds.",
    excerpt:
      "Au-dessus d’une table, la suspension n’est pas seulement décorative : elle doit éclairer les assiettes sans éblouir les convives.",
    art: "tiers",
    readingMinutes: 5,
    sections: [
      {
        heading: "La table, point de départ",
        paragraphs: [
          "Dans une salle à manger, le luminaire se centre sur la table et non sur la pièce. Si la table n’est pas sous le point lumineux existant, un crochet de déport ou un nouveau point de raccordement réalisé par un électricien permet de recentrer la suspension.",
        ],
      },
      {
        heading: "Ronde ou linéaire, selon la forme de la table",
        paragraphs: [
          "Une table ronde ou carrée appelle une suspension ronde. Pour une table rectangulaire, une suspension linéaire ou plusieurs suspensions alignées éclairent toute la longueur de manière homogène.",
          "Un repère courant : la suspension mesure environ la moitié aux deux tiers de la largeur de la table pour un modèle rond, et laisse au moins 30 cm environ de chaque côté par rapport aux extrémités pour un modèle linéaire.",
        ],
      },
      {
        heading: "La bonne hauteur au-dessus de la table",
        paragraphs: [
          "On place généralement le bas du luminaire à 70 à 80 cm environ au-dessus du plateau. Plus haut, la lumière se disperse et la pièce perd en intimité ; plus bas, elle gêne la vue entre les convives.",
          "Les câbles réglables permettent d’ajuster cette hauteur une fois la table en place : c’est l’occasion de tester avant de fixer définitivement.",
        ],
      },
      {
        heading: "Une lumière qui flatte les visages et les plats",
        paragraphs: [
          "Un blanc chaud et une lumière filtrée par du verre, du cristal ou un diffuseur rendent les repas plus chaleureux. Si vous recevez souvent, une intensité réglable permet de passer d’un dîner animé à une fin de soirée plus calme.",
        ],
      },
      {
        heading: "Compléter l’éclairage de la pièce",
        paragraphs: [
          "La suspension éclaire la table, mais le reste de la pièce a besoin de lumière : des appliques de part et d’autre d’un buffet ou d’un miroir équilibrent l’ensemble et évitent l’effet « îlot » au milieu de l’obscurité.",
        ],
      },
    ],
    faq: [
      {
        q: "À quelle hauteur placer une suspension au-dessus d’une table ?",
        a: "Le bas du luminaire se place généralement à 70 à 80 cm environ au-dessus du plateau.",
      },
      {
        q: "Quelle suspension pour une grande table rectangulaire ?",
        a: "Un modèle linéaire, ou plusieurs suspensions alignées, pour éclairer toute la longueur de façon homogène.",
      },
    ],
    productSlugs: ["sylve", "aigrette", "luciole"],
    related: [
      { href: "/collections/suspensions", label: "Voir les suspensions" },
      { href: "/collections/lustres", label: "Voir les lustres" },
    ],
  },
  {
    slug: "eclairage-de-noel-elegant",
    publishedAt: "2026-12-01T08:00:00+01:00",
    category: "Inspiration lumineuse",
    title: "Un éclairage de Noël élégant, sans en faire trop",
    description:
      "Guirlandes, bougies, luminaires existants : composer un éclairage de fêtes chaleureux et raffiné, en gardant une unité de teinte.",
    excerpt:
      "Les fêtes invitent à multiplier les lumières. Le secret d’un intérieur élégant en décembre : moins de couleurs, plus de douceur.",
    art: "cascade",
    readingMinutes: 4,
    sections: [
      {
        heading: "Une seule teinte de lumière",
        paragraphs: [
          "Les guirlandes multicolores et clignotantes donnent vite une impression de désordre. Pour une décoration raffinée, choisissez des guirlandes en blanc chaud, proches de la teinte de vos luminaires, et des modes fixes plutôt que les animations.",
        ],
      },
      {
        heading: "S’appuyer sur les luminaires existants",
        paragraphs: [
          "Votre suspension ou votre lustre est déjà le cœur lumineux de la pièce. Plutôt que de le concurrencer, mettez-le en valeur : quelques branchages ou une couronne posée sur la table en dessous, une intensité un peu plus basse pour laisser exister les petites lumières autour.",
          "Ne suspendez jamais de décorations directement sur un luminaire ni sur ses câbles : poids, chaleur et électricité ne font pas bon ménage.",
        ],
      },
      {
        heading: "Jouer les hauteurs",
        paragraphs: [
          "Une ambiance de fête réussie répartit la lumière à plusieurs niveaux : au plafond avec le luminaire principal, à mi-hauteur avec le sapin ou des appliques, au ras de la table avec des photophores. Cette superposition crée de la profondeur sans éblouir.",
        ],
      },
      {
        heading: "La flamme, avec précaution",
        paragraphs: [
          "Les bougies apportent une lumière vivante incomparable. Placez-les loin des textiles et des branchages, ne les laissez jamais sans surveillance, et préférez les bougies LED à proximité du sapin.",
        ],
      },
    ],
    faq: [
      {
        q: "Quelle couleur de guirlande pour une décoration élégante ?",
        a: "Un blanc chaud, en mode fixe, assorti à la teinte des luminaires de la pièce.",
      },
      {
        q: "Peut-on accrocher des décorations à un lustre ?",
        a: "Non : le poids, la chaleur et la proximité des parties électriques le déconseillent.",
      },
    ],
    productSlugs: ["celeste", "nebuleuse", "aigrette"],
    related: [
      { href: "/collections/lustres", label: "Voir les lustres" },
      {
        href: "/journal/blanc-chaud-neutre-ou-froid-choisir-la-temperature-de-couleur",
        label: "Choisir la température de couleur",
      },
    ],
  },
  {
    slug: "offrir-un-luminaire",
    publishedAt: "2026-12-08T08:00:00+01:00",
    category: "Guides d’achat",
    title: "Offrir un luminaire : les questions à se poser",
    description:
      "Pièce, dimensions, installation, style : les bonnes questions avant d’offrir un luminaire, et comment éviter les mauvaises surprises.",
    excerpt:
      "Un luminaire est un cadeau qui dure. Il demande seulement quelques vérifications pour qu’il trouve vraiment sa place.",
    art: "sconce",
    readingMinutes: 4,
    sections: [
      {
        heading: "Pour quelle pièce ?",
        paragraphs: [
          "Avant le style, il faut savoir où le luminaire sera installé. Une suspension destinée à une salle à manger ne se choisit pas comme une applique pour une entrée. Si la surprise est importante, une question discrète sur un projet de décoration en cours suffit souvent à orienter le choix.",
        ],
      },
      {
        heading: "Les dimensions et la hauteur sous plafond",
        paragraphs: [
          "Un luminaire trop grand ou trop long pour la pièce devient un encombrement. Notez si possible la surface de la pièce et la hauteur sous plafond, et privilégiez les modèles à suspension réglable, plus faciles à adapter.",
        ],
      },
      {
        heading: "L’installation",
        paragraphs: [
          "Une suspension ou une applique se raccorde au réseau électrique : l’installation doit se faire hors tension et, pour les modèles lourds ou les grandes hauteurs, par un électricien qualifié. Offrir aussi la pose, ou la prévoir, évite que le cadeau reste dans son carton.",
        ],
      },
      {
        heading: "Un style qui s’accorde à l’intérieur",
        paragraphs: [
          "Observez les matières dominantes de la pièce : bois clair, métal noir, laiton, marbre. Un luminaire qui reprend l’une d’elles s’intègre naturellement. Un tableau lumineux ou une applique sculpturale peut aussi devenir une véritable œuvre, à mi-chemin entre la décoration et l’éclairage.",
        ],
      },
      {
        heading: "Anticiper les délais",
        paragraphs: [
          "Certaines pièces demandent un délai de livraison de plusieurs semaines. Pour un cadeau de fin d’année, renseignez-vous tôt sur le délai annoncé pour la version choisie.",
        ],
      },
    ],
    faq: [
      {
        q: "Quel luminaire offrir sans connaître la pièce ?",
        a: "Une applique ou un tableau lumineux, plus faciles à placer qu’une grande suspension dont la taille dépend du volume de la pièce.",
      },
    ],
    productSlugs: ["silhouette", "luciole"],
    related: [
      { href: "/collections/appliques", label: "Voir les appliques" },
      { href: "/collections", label: "Toutes les pièces" },
    ],
  },
  {
    slug: "eclairer-une-entree-et-un-couloir",
    publishedAt: "2026-12-15T08:00:00+01:00",
    category: "Conseils éclairage",
    title: "Éclairer une entrée et un couloir avec caractère",
    description:
      "Appliques, suspension, tableau lumineux : comment éclairer une entrée et un couloir pour soigner la première impression.",
    excerpt:
      "L’entrée donne le ton de toute la maison. Souvent oubliée, elle mérite pourtant une lumière pensée.",
    art: "sconce",
    readingMinutes: 4,
    sections: [
      {
        heading: "La première impression",
        paragraphs: [
          "Une entrée sombre ou éclairée par un simple plafonnier donne une impression froide dès le seuil. Une lumière chaude et bien répartie, au contraire, invite à entrer et prépare à l’ambiance du reste de la maison.",
        ],
      },
      {
        heading: "Les appliques pour allonger l’espace",
        paragraphs: [
          "Dans un couloir étroit, une suspension gêne parfois le passage. Les appliques murales, disposées à intervalles réguliers, éclairent les murs et donnent une sensation de profondeur. Elles se placent souvent autour de 1,60 à 1,80 m du sol, à ajuster selon la hauteur sous plafond et le modèle.",
        ],
      },
      {
        heading: "Une pièce forte au bout du couloir",
        paragraphs: [
          "Un tableau lumineux ou une applique sculpturale en fin de perspective attire le regard et transforme un passage en galerie. C’est l’endroit idéal pour une pièce qui tient à la fois de l’œuvre et du luminaire.",
        ],
      },
      {
        heading: "Une suspension si la hauteur le permet",
        paragraphs: [
          "Dans une entrée haute ou un hall, une suspension affirmée devient un point focal. Laissez au moins 2,10 m environ de passage sous le luminaire et choisissez une forme qui reste lisible depuis l’entrée.",
        ],
      },
    ],
    faq: [
      {
        q: "À quelle hauteur poser une applique dans un couloir ?",
        a: "Souvent autour de 1,60 à 1,80 m du sol, à ajuster selon la hauteur sous plafond et la forme de l’applique.",
      },
    ],
    productSlugs: ["silhouette"],
    related: [
      { href: "/collections/appliques", label: "Voir les appliques" },
      { href: "/journal/les-luminaires-sculpturaux", label: "Les luminaires sculpturaux" },
    ],
  },
  {
    slug: "superposer-les-lumieres-ambiance-fonctionnelle-accent",
    publishedAt: "2026-12-22T08:00:00+01:00",
    category: "Conseils éclairage",
    title: "Superposer les lumières : ambiance, fonction et accent",
    description:
      "La règle des trois niveaux d’éclairage — ambiance, fonctionnel, accent — pour composer une lumière équilibrée dans chaque pièce.",
    excerpt:
      "Les intérieurs les mieux éclairés ne reposent jamais sur une seule source. Ils superposent trois types de lumière.",
    art: "tiers",
    readingMinutes: 5,
    sections: [
      {
        heading: "La lumière d’ambiance",
        paragraphs: [
          "C’est l’éclairage général, qui permet de circuler et de voir l’ensemble de la pièce. Il est souvent assuré par une suspension ou un lustre, éventuellement complété par un éclairage indirect. Il doit être doux et homogène, sans chercher à tout éclairer intensément.",
        ],
      },
      {
        heading: "La lumière fonctionnelle",
        paragraphs: [
          "Elle sert une tâche précise : lire, cuisiner, se maquiller, travailler. Elle est plus directe et plus localisée — une suspension au-dessus d’un îlot, une liseuse près d’un fauteuil, une applique de part et d’autre d’un miroir.",
        ],
      },
      {
        heading: "La lumière d’accent",
        paragraphs: [
          "Elle met en valeur un élément : une œuvre, une niche, une matière, un luminaire sculptural lui-même. C’est elle qui donne du relief et du caractère. Un tableau lumineux ou une applique décorative jouent souvent ce rôle.",
        ],
      },
      {
        heading: "Composer les trois",
        paragraphs: [
          "Dans un salon, on peut associer une suspension centrale (ambiance), une lampe de lecture (fonction) et une applique décorative (accent). En commandant chaque niveau séparément, on compose plusieurs ambiances avec les mêmes luminaires.",
          "Gardez une même teinte de lumière pour les trois niveaux : c’est ce qui assure l’unité de l’ensemble.",
        ],
      },
    ],
    faq: [
      {
        q: "Combien de sources lumineuses dans un salon ?",
        a: "Au moins trois, une par niveau : ambiance, fonctionnel et accent, idéalement commandées séparément.",
      },
    ],
    productSlugs: ["celeste", "silhouette", "luciole"],
    related: [
      { href: "/collections", label: "Toutes les pièces" },
      {
        href: "/journal/creer-une-ambiance-cocooning-avec-la-lumiere",
        label: "L’ambiance cocooning",
      },
    ],
  },
  {
    slug: "quel-eclairage-pour-une-chambre",
    publishedAt: "2026-12-29T08:00:00+01:00",
    category: "Décoration intérieure",
    title: "Quel éclairage pour une chambre élégante et apaisante ?",
    description:
      "Lumière chaude, éclairage de chevet, suspension ou appliques : composer l’éclairage d’une chambre qui favorise le repos.",
    excerpt:
      "La chambre est la pièce où la lumière doit le plus s’effacer. Elle accompagne le soir, sans jamais agresser.",
    art: "globes",
    readingMinutes: 5,
    sections: [
      {
        heading: "Une lumière chaude et douce",
        paragraphs: [
          "En fin de journée, une lumière chaude (autour de 2 700 K) et peu intense accompagne la détente. Évitez les sources nues dans le champ de vision depuis le lit : une suspension à diffuseur ou des appliques orientées vers le mur sont plus confortables.",
        ],
      },
      {
        heading: "Le plafonnier n’est pas obligatoire",
        paragraphs: [
          "Une chambre peut se passer d’un éclairage central puissant. Une suspension décorative de taille modérée, éventuellement décalée, suffit souvent pour l’ambiance générale, complétée par des points lumineux plus bas.",
        ],
      },
      {
        heading: "Le chevet, en suspension ou en applique",
        paragraphs: [
          "Remplacer les lampes de chevet par deux petites suspensions ou deux appliques libère les tables de nuit et donne une allure d’hôtel. Placez-les de façon à éclairer le livre sans éblouir la personne à côté.",
        ],
      },
      {
        heading: "Une tête de lit mise en valeur",
        paragraphs: [
          "Un tableau lumineux ou une applique sculpturale au-dessus de la tête de lit crée un point focal et une lumière indirecte très douce, idéale pour le soir.",
        ],
      },
    ],
    faq: [
      {
        q: "Quelle température de couleur dans une chambre ?",
        a: "Un blanc chaud, autour de 2 700 K, qui favorise la détente en soirée.",
      },
    ],
    productSlugs: ["silhouette", "aigrette"],
    related: [
      { href: "/collections/appliques", label: "Voir les appliques" },
      { href: "/collections/suspensions", label: "Voir les suspensions" },
    ],
  },
  {
    slug: "entretenir-un-lustre-en-verre-ou-en-cristal",
    publishedAt: "2027-01-05T08:00:00+01:00",
    category: "Entretien des luminaires",
    title: "Entretenir un lustre en verre ou en cristal",
    description:
      "Les gestes pour nettoyer un lustre en verre ou en cristal en toute sécurité et lui rendre son éclat, sans abîmer les finitions.",
    excerpt:
      "Le verre et le cristal ne révèlent toute leur lumière que propres. Un entretien régulier et délicat suffit.",
    art: "cascade",
    readingMinutes: 4,
    sections: [
      {
        heading: "Avant toute chose : couper le courant",
        paragraphs: [
          "Éteignez le luminaire, coupez le circuit au tableau électrique et laissez refroidir les sources. Prévoyez un escabeau stable et, pour un grand lustre, une seconde personne.",
        ],
      },
      {
        heading: "Le dépoussiérage régulier",
        paragraphs: [
          "Un passage d’un plumeau doux ou d’un chiffon microfibre sec toutes les quelques semaines évite l’accumulation de poussière. C’est le geste le plus simple pour conserver l’éclat du verre.",
        ],
      },
      {
        heading: "Le nettoyage approfondi",
        paragraphs: [
          "Une à deux fois par an, nettoyez les éléments en verre ou en cristal avec un chiffon légèrement humidifié d’eau tiède additionnée d’un peu de liquide vaisselle doux, puis séchez aussitôt avec un chiffon microfibre pour éviter les traces. Portez des gants en coton pour ne pas laisser d’empreintes.",
          "Ne pulvérisez jamais de produit directement sur le luminaire : le liquide pourrait atteindre les parties électriques.",
        ],
      },
      {
        heading: "Respecter les finitions",
        paragraphs: [
          "Les métaux dorés, laitonnés ou peints sont plus fragiles que le verre. Un chiffon sec suffit ; évitez les produits abrasifs, l’alcool et les détergents agressifs, qui ternissent les finitions. En cas de doute, suivez la notice du fabricant.",
        ],
      },
    ],
    faq: [
      {
        q: "À quelle fréquence nettoyer un lustre en cristal ?",
        a: "Un dépoussiérage toutes les quelques semaines, et un nettoyage approfondi une à deux fois par an.",
      },
      {
        q: "Peut-on vaporiser un nettoyant sur un lustre ?",
        a: "Non : appliquez le produit sur le chiffon, jamais directement sur le luminaire.",
      },
    ],
    productSlugs: ["celeste", "nebuleuse", "aigrette"],
    related: [
      { href: "/collections/lustres", label: "Voir les lustres" },
      { href: "/journal/choisir-un-luminaire-en-verre", label: "Choisir un luminaire en verre" },
    ],
  },
  {
    slug: "lumens-watts-led-comprendre-un-eclairage",
    publishedAt: "2027-01-12T08:00:00+01:00",
    category: "Guides d’achat",
    title: "Lumens, watts, LED : comprendre les chiffres d’un éclairage",
    description:
      "Lumens, watts, kelvins, indice de rendu des couleurs, étiquette énergie : lire les caractéristiques d’un luminaire LED sans se tromper.",
    excerpt:
      "Les fiches techniques des luminaires alignent des chiffres. Quatre d’entre eux suffisent à bien choisir.",
    art: "globes",
    readingMinutes: 5,
    sections: [
      {
        heading: "Les lumens : la quantité de lumière",
        paragraphs: [
          "Avec les LED, la puissance en watts ne dit plus grand-chose de la lumière produite. C’est le flux lumineux, en lumens (lm), qui indique la quantité de lumière émise. Pour comparer deux luminaires, comparez leurs lumens.",
        ],
      },
      {
        heading: "Les watts : la consommation",
        paragraphs: [
          "Les watts mesurent la puissance consommée. Le rapport entre les deux, en lumens par watt, indique l’efficacité : plus il est élevé, moins la lumière coûte en électricité.",
        ],
      },
      {
        heading: "Les kelvins : la teinte",
        paragraphs: [
          "La température de couleur, en kelvins, décrit la teinte de la lumière : environ 2 700 à 3 000 K pour un blanc chaud, autour de 4 000 K pour un blanc neutre, 5 000 K et plus pour un blanc froid.",
        ],
      },
      {
        heading: "L’IRC : la fidélité des couleurs",
        paragraphs: [
          "L’indice de rendu des couleurs (IRC ou CRI), sur 100, indique la fidélité avec laquelle la lumière restitue les couleurs. Un IRC de 80 est courant ; au-delà de 90, les couleurs des tissus, du bois et des peaux sont rendues avec plus de justesse.",
        ],
      },
      {
        heading: "L’étiquette énergie",
        paragraphs: [
          "Depuis septembre 2021, les sources lumineuses vendues dans l’Union européenne portent une étiquette énergie à l’échelle A à G, plus exigeante que l’ancienne. Une source classée F ou E aujourd’hui peut donc être tout à fait courante : l’échelle a été recalibrée pour laisser de la place aux progrès futurs.",
        ],
      },
    ],
    faq: [
      {
        q: "Comment comparer la puissance lumineuse de deux LED ?",
        a: "Comparez leurs lumens : c’est la quantité de lumière émise. Les watts indiquent seulement la consommation.",
      },
      {
        q: "Pourquoi une LED récente est-elle classée F ?",
        a: "L’échelle de l’étiquette énergie a été recalibrée en 2021 ; les classes A et B sont réservées aux sources les plus efficaces.",
      },
    ],
    productSlugs: ["nebuleuse", "celeste"],
    related: [
      {
        href: "/journal/blanc-chaud-neutre-ou-froid-choisir-la-temperature-de-couleur",
        label: "La température de couleur",
      },
      { href: "/collections", label: "Toutes les pièces" },
    ],
  },
  {
    slug: "suspension-plafonnier-ou-applique-que-choisir",
    publishedAt: "2027-01-19T08:00:00+01:00",
    category: "Guides d’achat",
    title: "Suspension, plafonnier ou applique : que choisir ?",
    description:
      "Les différences entre suspension, plafonnier, lustre et applique murale, et comment choisir selon la pièce, la hauteur et l’ambiance.",
    excerpt:
      "Trois familles de luminaires, trois manières de placer la lumière dans une pièce. Le bon choix dépend surtout de la hauteur et de l’usage.",
    art: "sconce",
    readingMinutes: 5,
    sections: [
      {
        heading: "La suspension : la lumière qui descend",
        paragraphs: [
          "Accrochée au plafond par un ou plusieurs câbles, la suspension rapproche la lumière de la zone à éclairer. Elle convient aux tables, aux îlots, aux coins salon et aux pièces assez hautes. C’est aussi la famille la plus décorative, souvent pensée comme une pièce maîtresse.",
        ],
      },
      {
        heading: "Le lustre : une suspension monumentale",
        paragraphs: [
          "Le lustre est une suspension de grande dimension, souvent à plusieurs sources, conçue pour les volumes généreux : séjours, halls, cages d’escalier, pièces en double hauteur.",
        ],
      },
      {
        heading: "Le plafonnier : la lumière au plus près du plafond",
        paragraphs: [
          "Fixé directement contre le plafond, le plafonnier convient aux pièces basses, aux couloirs et aux espaces où une suspension gênerait le passage. Il éclaire de manière plus diffuse et générale.",
        ],
      },
      {
        heading: "L’applique : la lumière sur le mur",
        paragraphs: [
          "Fixée au mur, l’applique éclaire les parois, crée des halos et structure l’espace. Elle complète un éclairage central, éclaire un couloir sans encombrer, accompagne un miroir ou une tête de lit, et peut devenir un élément décoratif à part entière.",
        ],
      },
      {
        heading: "Les associer",
        paragraphs: [
          "Le plus souvent, la bonne réponse est une combinaison : une suspension ou un lustre pour l’ambiance générale, des appliques pour les murs et les zones d’usage. C’est cette superposition qui rend une pièce vraiment agréable.",
        ],
      },
    ],
    faq: [
      {
        q: "Quelle différence entre un lustre et une suspension ?",
        a: "Le lustre est une suspension de grande dimension, souvent à plusieurs sources, pensée pour les grands volumes.",
      },
      {
        q: "Que choisir pour un plafond bas ?",
        a: "Un plafonnier ou des appliques, ou une suspension compacte placée hors des zones de passage.",
      },
    ],
    productSlugs: ["luciole", "celeste", "silhouette"],
    related: [
      { href: "/collections/suspensions", label: "Les suspensions" },
      { href: "/collections/appliques", label: "Les appliques" },
    ],
  },
  {
    slug: "eclairer-une-piece-en-double-hauteur",
    publishedAt: "2027-01-26T08:00:00+01:00",
    category: "Inspiration lumineuse",
    title: "Éclairer une pièce en double hauteur ou une mezzanine",
    description:
      "Lustres en cascade, suspensions à longs câbles, appliques : comment éclairer un séjour en double hauteur ou une mezzanine.",
    excerpt:
      "Un grand volume vertical est une chance rare. La lumière doit en épouser la hauteur au lieu de rester collée au plafond.",
    art: "cascade",
    readingMinutes: 5,
    sections: [
      {
        heading: "Occuper la hauteur",
        paragraphs: [
          "Dans une pièce en double hauteur, un luminaire fixé près du plafond éclaire mal et paraît perdu. Les compositions en cascade, dont les sources descendent à des hauteurs différentes, occupent le vide et accompagnent le regard du sol jusqu’au plafond.",
        ],
      },
      {
        heading: "Choisir la longueur de suspension",
        paragraphs: [
          "Le bas de la composition doit rester à une hauteur confortable, au-dessus d’une table ou d’un espace de passage. Mesurez la hauteur totale avant de choisir : les modèles à câbles réglables permettent d’ajuster la composition à votre volume.",
        ],
      },
      {
        heading: "Penser aux deux points de vue",
        paragraphs: [
          "Un luminaire de double hauteur se regarde d’en bas, mais aussi depuis la mezzanine ou l’escalier. Les sphères de verre, les compositions organiques et les pièces sculpturales sont lisibles sous tous les angles.",
        ],
      },
      {
        heading: "Compléter avec des appliques",
        paragraphs: [
          "Des appliques posées sur les murs à différents niveaux éclairent la mezzanine et l’escalier, et soulignent la verticalité de la pièce sans multiplier les suspensions.",
        ],
      },
      {
        heading: "L’installation, une affaire de professionnel",
        paragraphs: [
          "Travailler en hauteur demande un équipement adapté. Pour un lustre lourd ou une grande hauteur, confiez la pose à un électricien, qui vérifiera aussi la solidité du point d’ancrage.",
        ],
      },
    ],
    faq: [
      {
        q: "Quel luminaire pour une pièce en double hauteur ?",
        a: "Une composition en cascade ou une suspension à longs câbles, qui occupe la hauteur au lieu de rester près du plafond.",
      },
    ],
    productSlugs: ["celeste", "nebuleuse"],
    related: [
      { href: "/collections/lustres", label: "Voir les lustres" },
      {
        href: "/journal/installer-une-suspension-dans-une-cage-d-escalier",
        label: "Une suspension dans une cage d’escalier",
      },
    ],
  },
  {
    slug: "ou-et-a-quelle-hauteur-installer-une-applique-murale",
    publishedAt: "2027-02-02T08:00:00+01:00",
    category: "Conseils éclairage",
    title: "Où et à quelle hauteur installer une applique murale ?",
    description:
      "Salon, couloir, chambre, salle à manger : les repères de hauteur et d’espacement pour installer des appliques murales.",
    excerpt:
      "Bien placée, une applique transforme un mur en source de lumière. Quelques repères évitent l’effet « mal posée ».",
    art: "sconce",
    readingMinutes: 4,
    sections: [
      {
        heading: "La hauteur, à hauteur de regard",
        paragraphs: [
          "Dans un salon ou un couloir, une applique se place souvent entre 1,60 et 1,80 m environ du sol, de façon à ne pas éblouir les personnes debout. Dans une pièce haute sous plafond, on peut la remonter un peu pour conserver l’équilibre des proportions.",
        ],
      },
      {
        heading: "L’espacement dans un couloir",
        paragraphs: [
          "Pour un éclairage régulier, espacez les appliques de façon homogène et alignez-les à la même hauteur. Une alternance de zones éclairées et plus sombres peut aussi être recherchée, à condition d’être régulière.",
        ],
      },
      {
        heading: "Autour d’un miroir ou d’un buffet",
        paragraphs: [
          "De part et d’autre d’un miroir ou d’un buffet, deux appliques symétriques encadrent le meuble et éclairent les visages de façon flatteuse. Centrez-les sur l’élément plutôt que sur le mur.",
        ],
      },
      {
        heading: "Les appliques décoratives",
        paragraphs: [
          "Un tableau lumineux ou une applique sculpturale se place comme une œuvre : centrée sur un mur dégagé, au bout d’une perspective ou au-dessus d’une console. Prévoyez l’emplacement du raccordement avant de fixer.",
        ],
      },
      {
        heading: "Le raccordement",
        paragraphs: [
          "Une applique se raccorde à une sortie de câble murale. Si aucune n’est présente à l’emplacement voulu, un électricien peut en créer une. Toute intervention se fait hors tension et dans le respect de la norme NF C 15-100.",
        ],
      },
    ],
    faq: [
      {
        q: "À quelle hauteur fixer une applique dans un salon ?",
        a: "Souvent entre 1,60 et 1,80 m environ du sol, à adapter à la hauteur sous plafond et au modèle.",
      },
    ],
    productSlugs: ["silhouette"],
    related: [
      { href: "/collections/appliques", label: "Voir les appliques" },
      {
        href: "/journal/eclairer-une-entree-et-un-couloir",
        label: "Éclairer une entrée et un couloir",
      },
    ],
  },
  {
    slug: "creer-une-ambiance-tamisee-et-romantique",
    publishedAt: "2027-02-09T08:00:00+01:00",
    category: "Ambiances et styles",
    title: "Créer une ambiance tamisée et romantique",
    description:
      "Lumière chaude, intensité réglable, sources basses et reflets : composer une ambiance tamisée pour un dîner ou une soirée à deux.",
    excerpt:
      "Une soirée réussie tient souvent à la lumière. Tamiser, ce n’est pas éteindre : c’est choisir ce que l’on éclaire.",
    art: "globes",
    readingMinutes: 4,
    sections: [
      {
        heading: "Baisser l’intensité, pas la qualité",
        paragraphs: [
          "Une ambiance tamisée repose sur une lumière faible mais chaude. Un variateur, ou un luminaire à intensité réglable, permet de descendre la lumière sans changer de source. Vérifiez la compatibilité des ampoules avec la variation.",
        ],
      },
      {
        heading: "Éclairer la table, laisser la pièce dans la pénombre",
        paragraphs: [
          "Pour un dîner, concentrez la lumière sur la table avec une suspension réglée assez bas, et laissez le reste de la pièce en lumière très douce. Cette concentration crée naturellement l’intimité.",
        ],
      },
      {
        heading: "Les reflets et la scintillance",
        paragraphs: [
          "Le cristal, le verre et le métal doré multiplient les reflets et donnent à une lumière faible une présence vivante. Quelques bougies sur la table complètent cet effet, à placer loin des tissus.",
        ],
      },
      {
        heading: "Une teinte très chaude",
        paragraphs: [
          "Plus la lumière est basse, plus une teinte chaude est agréable. Si votre luminaire propose plusieurs températures de couleur, choisissez la plus chaude pour la soirée.",
        ],
      },
    ],
    faq: [
      {
        q: "Comment tamiser la lumière sans changer de luminaire ?",
        a: "Avec un variateur compatible ou un luminaire à intensité réglable, en vérifiant que les ampoules acceptent la variation.",
      },
    ],
    productSlugs: ["aigrette", "luciole", "nebuleuse"],
    related: [
      { href: "/journal/eclairer-une-salle-a-manger", label: "Éclairer une salle à manger" },
      { href: "/collections/suspensions", label: "Voir les suspensions" },
    ],
  },
];
