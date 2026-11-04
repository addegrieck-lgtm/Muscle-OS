import type { Article } from "./journal";

/**
 * Propositions d'articles de la rédaction, importées dans le studio en « à relire » : elles ne
 * paraissent qu'après relecture et validation par un administrateur. Conseils généraux présentés
 * comme tels ; aucune caractéristique de produit, aucune source inventée (les sources sont à
 * ajouter dans le studio si l'article cite une norme ou une étude).
 */
export const PROPOSALS: Article[] = [
  {
    slug: "eclairer-un-ilot-de-cuisine",
    publishedAt: "2026-12-01T08:00:00+01:00",
    category: "Conseils pièce par pièce",
    title: "Éclairer un îlot de cuisine : nombre et hauteur",
    description:
      "Nombre de suspensions, espacement, hauteur au-dessus du plan et choix de la lumière : les repères pour bien éclairer un îlot de cuisine.",
    excerpt:
      "Un îlot se travaille, se partage et se regarde : sa lumière doit servir les trois. Nombre, hauteur, espacement, les repères pour bien faire.",
    art: "globes",
    readingMinutes: 5,
    sections: [
      {
        heading: "Un îlot, trois usages",
        paragraphs: [
          "L’îlot central est devenu le cœur de bien des cuisines ouvertes. On y prépare, on y prend le petit-déjeuner, on y discute un verre à la main pendant que le dîner mijote. Sa lumière doit donc être assez franche pour couper des légumes sans se fatiguer les yeux, et assez belle pour que l’îlot soit, le soir, un point d’accroche dans la pièce de vie.",
          "C’est pourquoi on l’éclaire presque toujours avec des suspensions plutôt qu’avec des spots encastrés seuls : elles rapprochent la lumière du plan de travail et donnent à l’ensemble une présence que le plafond seul ne peut pas offrir.",
        ],
      },
      {
        heading: "Une, deux ou trois suspensions ?",
        paragraphs: [
          "Tout dépend de la longueur de l’îlot. Une seule suspension convient à un îlot court, jusqu’à environ 1,20 m, ou à une suspension longue et linéaire qui couvre à elle seule toute la longueur. Au-delà, deux suspensions équilibrent un îlot de 1,50 à 2 m ; trois conviennent aux îlots plus longs.",
          "Les nombres impairs ont la réputation d’être plus harmonieux, mais c’est avant tout une question d’échelle : mieux vaut deux pièces généreuses que trois trop petites qui semblent flotter au-dessus du plan.",
          "Une suspension linéaire est une alternative élégante : une seule ligne de lumière, un seul point de raccordement, et un éclairage régulier d’un bout à l’autre.",
        ],
      },
      {
        heading: "Espacement et position",
        paragraphs: [
          "Avec plusieurs suspensions, laissez entre elles un espace au moins égal à leur diamètre, souvent davantage, et gardez une distance d’environ 15 à 30 cm entre la dernière suspension et chaque extrémité de l’îlot. Les luminaires restent ainsi au-dessus du plan, là où l’on travaille, sans déborder sur le passage.",
          "Centrez la ligne de suspensions sur la largeur de l’îlot, et non sur la pièce. Si le point électrique existant n’est pas au bon endroit, un électricien peut le déplacer ou installer une platine de répartition : c’est un petit chantier qui change tout au résultat.",
        ],
      },
      {
        heading: "La bonne hauteur au-dessus du plan",
        paragraphs: [
          "On recommande en général de laisser 75 à 90 cm entre le plan de travail et le bas des suspensions. Plus bas, elles gênent la vue entre les personnes assises de part et d’autre ; plus haut, la lumière se disperse et l’îlot perd de sa présence.",
          "Ajustez selon la taille des occupants et la hauteur sous plafond : sous un plafond très haut, on peut descendre légèrement les suspensions pour qu’elles restent liées à l’îlot. Les modèles à hauteur réglable permettent d’affiner une fois l’îlot en place.",
        ],
      },
      {
        heading: "Quelle lumière choisir",
        paragraphs: [
          "Pour un plan de travail, une lumière suffisamment intense évite d’avoir à se pencher sur ce que l’on coupe. Une température de couleur entre 2 700 et 3 000 K reste chaleureuse tout en restituant fidèlement les couleurs des aliments.",
          "L’idéal est de pouvoir moduler : pleine lumière pour cuisiner, lumière douce pour le dîner ou l’apéritif. Un variateur compatible, ou des suspensions dont l’intensité se règle, font passer l’îlot de l’atelier au salon en un geste.",
          "Enfin, pensez aux matériaux : le verre et l’acrylique diffusent une lumière enveloppante, le métal la dirige vers le plan de travail. Au-dessus d’un îlot très utilisé, une suspension facile à nettoyer est un atout au quotidien.",
        ],
      },
    ],
    faq: [
      {
        q: "À quelle hauteur suspendre un luminaire au-dessus d’un îlot ?",
        a: "En général entre 75 et 90 cm au-dessus du plan de travail, à ajuster selon la hauteur sous plafond et la taille des occupants.",
      },
      {
        q: "Combien de suspensions pour un îlot de 2 mètres ?",
        a: "Deux suspensions généreuses ou une suspension linéaire conviennent le plus souvent. Laissez entre elles au moins l’équivalent de leur diamètre.",
      },
      {
        q: "Faut-il un variateur au-dessus d’un îlot ?",
        a: "Ce n’est pas obligatoire, mais c’est très utile : il permet de passer d’une lumière de travail à une lumière d’ambiance. Vérifiez que le luminaire est compatible.",
      },
    ],
    productSlugs: ["meandre", "constellation", "luciole"],
    related: [
      { href: "/luminaires/salle-a-manger", label: "Luminaires pour salle à manger et cuisine" },
      { href: "/collections/suspensions", label: "Toutes les suspensions" },
    ],
  },
  {
    slug: "lustre-en-cristal-ou-en-verre",
    publishedAt: "2026-12-08T08:00:00+01:00",
    category: "Guides d’achat",
    title: "Lustre en cristal ou en verre : comment choisir ?",
    description:
      "Reflets, diffusion de la lumière, style, entretien : ce qui distingue un lustre en cristal d’un lustre en verre, pour choisir selon votre intérieur.",
    excerpt:
      "Le cristal fait danser la lumière, le verre l’adoucit. Deux matières, deux caractères : voici comment choisir celle qui convient à votre intérieur.",
    art: "cascade",
    readingMinutes: 5,
    sections: [
      {
        heading: "Deux matières, deux façons de traiter la lumière",
        paragraphs: [
          "Face à un lustre, on regarde d’abord sa silhouette. Mais ce qui fera l’atmosphère de la pièce, c’est la manière dont sa matière transforme la lumière. Le cristal taillé la décompose et la renvoie en éclats ; le verre la laisse passer, la colore parfois, et l’adoucit.",
          "Aucune n’est supérieure à l’autre : elles répondent à des envies différentes. La question à se poser n’est pas « lequel est le plus beau ? », mais « quelle lumière je veux voir dans cette pièce le soir ? ».",
        ],
      },
      {
        heading: "Le cristal : reflets et éclat",
        paragraphs: [
          "Taillé en facettes, le cristal agit comme une multitude de petits prismes. Allumé, un lustre en cristal projette des reflets sur les murs et le plafond, parfois de légers arcs-en-ciel, et scintille au moindre mouvement d’air. C’est la matière des pièces de réception, des halls et des cages d’escalier, où l’on veut un effet de lumière vivant.",
          "On parle couramment de cristal pour des verres très transparents et taillés avec précision, comme le cristal K9 souvent utilisé en luminaire : ce qui compte pour l’effet, c’est la pureté de la matière et la qualité de la taille. Chaque fiche indique la matière exacte utilisée.",
          "Le cristal aime les sources de lumière ponctuelles, comme de petits spots ou des LED nues, qui allument chaque facette. Sous une lumière très diffuse, il perd une partie de son éclat.",
        ],
      },
      {
        heading: "Le verre : douceur et caractère",
        paragraphs: [
          "Soufflé, moulé, fumé, ambré ou dépoli, le verre offre une palette beaucoup plus large. Une sphère de verre clair laisse voir la source et crée un halo net ; un verre dépoli ou opalin diffuse une lumière enveloppante, sans éblouissement ; un verre teinté réchauffe ou assombrit l’ambiance.",
          "Le verre convient particulièrement aux intérieurs contemporains, aux salles à manger où l’on cherche une lumière douce sur la table, et aux pièces où l’on veut un luminaire présent sans multiplier les reflets.",
        ],
      },
      {
        heading: "Choisir selon la pièce",
        paragraphs: [
          "Dans un grand volume, une double hauteur ou un escalier, le cristal donne toute sa mesure : la lumière se démultiplie et la pièce s’anime. Dans un salon intime ou une chambre, le verre, plus calme, installe une atmosphère reposante.",
          "Pensez aussi au décor : le cristal dialogue bien avec les miroirs, le laiton, le marbre et les intérieurs classiques revisités ; le verre accompagne volontiers le bois, la pierre, les tons naturels et les lignes épurées.",
        ],
      },
      {
        heading: "L’entretien",
        paragraphs: [
          "Les deux matières se nettoient avec douceur, luminaire éteint et refroidi : un chiffon doux et sec, ou légèrement humide, suffit le plus souvent. Les lustres en cristal comptent beaucoup de pièces : prévoyez un peu de temps, et photographiez l’ensemble avant de démonter quoi que ce soit.",
          "Évitez les produits abrasifs et les sprays directement sur les parties électriques. Pour les grands lustres en hauteur, un professionnel saura intervenir en sécurité.",
        ],
      },
    ],
    faq: [
      {
        q: "Un lustre en cristal éclaire-t-il plus qu’un lustre en verre ?",
        a: "Pas forcément plus, mais différemment : le cristal renvoie la lumière en reflets et en éclats, le verre la diffuse plus uniformément. La puissance dépend avant tout des sources lumineuses.",
      },
      {
        q: "Le cristal convient-il à un intérieur moderne ?",
        a: "Oui, à condition de choisir une silhouette contemporaine : cascades, spirales ou compositions géométriques s’accordent très bien avec un intérieur actuel.",
      },
      {
        q: "Comment nettoyer un lustre en cristal ?",
        a: "Luminaire éteint et froid, avec un chiffon doux et sec ou légèrement humide, sans produit abrasif. Pour un grand lustre en hauteur, faites appel à un professionnel.",
      },
    ],
    productSlugs: ["lucie", "perle", "celeste"],
    related: [
      {
        href: "/journal/entretenir-un-lustre-en-verre-ou-en-cristal",
        label: "Entretenir un lustre en verre ou en cristal",
      },
      { href: "/collections/lustres", label: "Tous les lustres" },
    ],
  },
  {
    slug: "variateur-et-led-bien-les-associer",
    publishedAt: "2026-12-15T08:00:00+01:00",
    category: "Guides techniques",
    title: "Variateur et LED : une lumière sans scintillement",
    description:
      "Compatibilité, type de variateur, charge minimale, télécommande : les points à vérifier pour faire varier un luminaire LED sans scintillement ni bourdonnement.",
    excerpt:
      "Faire varier une lumière LED change l’ambiance d’une pièce. Encore faut-il que le luminaire et le variateur s’entendent : voici quoi vérifier.",
    art: "halo",
    readingMinutes: 5,
    sections: [
      {
        heading: "Pourquoi faire varier la lumière",
        paragraphs: [
          "Une même pièce ne demande pas la même lumière à 8 h et à 22 h. Pouvoir baisser l’intensité permet de passer d’un éclairage de travail à une ambiance de soirée, de ménager les yeux et de donner à un lustre une présence plus intime.",
          "Avec les LED, la variation est possible, mais elle demande un peu d’attention : un mauvais couple luminaire-variateur peut provoquer un scintillement, un léger bourdonnement ou une plage de réglage très réduite.",
        ],
      },
      {
        heading: "Première vérification : le luminaire est-il « dimmable » ?",
        paragraphs: [
          "Tous les luminaires LED ne se prêtent pas à la variation. L’information figure sur la fiche ou la notice du produit, souvent sous le terme anglais « dimmable ». Si elle n’est pas indiquée, considérez que le luminaire n’est pas prévu pour un variateur mural et demandez confirmation avant l’installation.",
          "Certains luminaires intègrent leur propre variation, par télécommande ou par application. Dans ce cas, on les raccorde sur un interrupteur classique et l’on règle l’intensité avec la télécommande fournie, sans ajouter de variateur mural.",
        ],
      },
      {
        heading: "Choisir un variateur adapté aux LED",
        paragraphs: [
          "Les anciens variateurs conçus pour les ampoules à incandescence ou halogènes ne conviennent souvent pas aux LED. Préférez un variateur indiqué comme compatible LED ; les modèles à coupure de phase en fin d’onde, dits « trailing edge », sont fréquemment recommandés pour les LED.",
          "Vérifiez aussi la charge minimale et maximale du variateur : une seule source LED de faible puissance peut se trouver sous la charge minimale et provoquer un scintillement. La notice du variateur et celle du luminaire indiquent ces valeurs.",
        ],
      },
      {
        heading: "Les signes d’une mauvaise association",
        paragraphs: [
          "Scintillement à faible intensité, lumière qui ne s’éteint pas complètement, bourdonnement du variateur ou du luminaire, plage de réglage qui ne descend pas assez bas : autant de signes que le couple n’est pas idéal.",
          "La solution passe souvent par un variateur mieux adapté, un réglage de la plage minimale quand le variateur le permet, ou le passage à la commande intégrée du luminaire.",
          "Si plusieurs luminaires sont raccordés au même variateur, additionnez leurs puissances et vérifiez que le total reste dans la plage indiquée par le fabricant du variateur. Mélanger sur un même circuit des sources de marques ou de technologies différentes complique aussi le réglage : mieux vaut des luminaires homogènes sur une même commande.",
        ],
      },
      {
        heading: "Faire appel à un professionnel",
        paragraphs: [
          "Le remplacement d’un interrupteur par un variateur est une intervention sur l’installation électrique. Confiez-la à un électricien qualifié, qui vérifiera la compatibilité, le câblage et le respect des normes en vigueur.",
          "Avant d’acheter, notez la référence de votre luminaire et posez la question : un conseil en amont évite bien des déceptions une fois le luminaire installé.",
        ],
      },
    ],
    faq: [
      {
        q: "Peut-on mettre un variateur sur n’importe quelle LED ?",
        a: "Non. Le luminaire doit être indiqué comme compatible avec la variation (« dimmable ») et le variateur doit être prévu pour les LED.",
      },
      {
        q: "Pourquoi ma LED scintille-t-elle avec un variateur ?",
        a: "Le plus souvent, le variateur n’est pas adapté aux LED ou la puissance raccordée est inférieure à sa charge minimale. Un variateur compatible LED règle généralement le problème.",
      },
      {
        q: "Un luminaire avec télécommande a-t-il besoin d’un variateur mural ?",
        a: "Non : il se raccorde sur un interrupteur classique et l’intensité se règle avec la télécommande. Ajouter un variateur mural peut au contraire perturber son fonctionnement.",
      },
    ],
    productSlugs: ["ondee", "halo", "organza"],
    related: [
      {
        href: "/journal/blanc-chaud-neutre-ou-froid-choisir-la-temperature-de-couleur",
        label: "Choisir la bonne température de couleur",
      },
      { href: "/collections", label: "Toute la collection" },
    ],
  },
];
