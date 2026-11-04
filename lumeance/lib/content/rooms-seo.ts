/**
 * Pages d'entrée par pièce de la maison (`/luminaires/<id>`), indexables. Textes éditoriaux
 * originaux : conseils généraux d'éclairage, sans promesse ni caractéristique de produit (les
 * dimensions et surfaces conseillées restent sur chaque fiche). Une page n'est publiée que si
 * au moins `ROOM_MIN_PRODUCTS` pièces en ligne y correspondent.
 */
export const ROOM_MIN_PRODUCTS = 3;

export interface RoomSeo {
  /** Mot-clé principal attendu dans le titre et la description (audit SEO). */
  keyword: string;
  title: string;
  h1: string;
  description: string;
  intro: string;
  sections: { h2: string; body: string[] }[];
  faq: { q: string; a: string }[];
}

export const ROOM_SEO: Record<string, RoomSeo> = {
  "salle-a-manger": {
    keyword: "salle à manger",
    title: "Luminaire salle à manger : suspensions et lustres",
    h1: "Luminaires pour salle à manger et cuisine",
    description:
      "Suspensions et lustres design pour la salle à manger et la cuisine : hauteur, diamètre et lumière au-dessus d’une table ou d’un îlot.",
    intro:
      "Au-dessus d’une table, la lumière rassemble. Elle doit éclairer les assiettes et les visages sans éblouir, et donner à la pièce son point d’ancrage.",
    sections: [
      {
        h2: "Choisir la taille selon la table",
        body: [
          "Une règle simple sert de point de départ : un luminaire dont le diamètre vaut à peu près la moitié, au plus les deux tiers, de la largeur de la table. Plus petit, il paraît perdu ; plus grand, il déborde sur les convives.",
          "Pour une table longue ou un îlot de cuisine, une suspension linéaire ou plusieurs suspensions alignées répartissent la lumière sur toute la longueur, là où un seul lustre rond laisserait les extrémités dans l’ombre.",
        ],
      },
      {
        h2: "La bonne hauteur d’accroche",
        body: [
          "On compte en général 70 à 80 cm entre le plateau et le bas du luminaire : assez haut pour se voir d’un bout à l’autre de la table, assez bas pour que la lumière reste intime. Sous un plafond très haut, on peut descendre un peu moins bas, mais le luminaire doit rester lié à la table plutôt qu’au plafond.",
          "Les pièces à hauteur réglable permettent d’ajuster ce point une fois la table en place. Chaque fiche précise la longueur de suspension disponible.",
        ],
      },
      {
        h2: "Quelle lumière pour un repas",
        body: [
          "Un blanc chaud flatte les teintes de la peau et des plats et installe une atmosphère de dîner. Le verre et l’acrylique diffusent une lumière douce ; le cristal la fragmente en reflets qui animent la table ; le métal ajouré dessine des ombres sur le plateau et les murs.",
          "Si la pièce sert aussi au travail ou aux devoirs, une version à intensité ou température réglable permet de passer d’une lumière franche à une lumière de soirée.",
        ],
      },
    ],
    faq: [
      {
        q: "À quelle hauteur suspendre un luminaire au-dessus d’une table ?",
        a: "En général à 70 à 80 cm au-dessus du plateau. Ajustez selon la taille des convives et la hauteur sous plafond.",
      },
      {
        q: "Un seul lustre ou plusieurs suspensions ?",
        a: "Un lustre rond convient à une table ronde ou carrée. Pour une table rectangulaire longue ou un îlot, une suspension linéaire ou deux à trois suspensions alignées éclairent mieux toute la longueur.",
      },
      {
        q: "Quelle taille de luminaire pour ma table ?",
        a: "Visez un diamètre d’environ la moitié de la largeur de la table, sans dépasser les deux tiers. Notre guide « Quelle taille ? » sur l’accueil propose les versions adaptées à la surface de votre pièce.",
      },
    ],
  },
  escalier: {
    keyword: "escalier",
    title: "Lustre escalier et double hauteur : cascades design",
    h1: "Lustres pour escalier et double hauteur",
    description:
      "Lustres en cascade pour cage d’escalier, duplex, mezzanine et hall en double hauteur : comment choisir la longueur et la composition, et notre sélection.",
    intro:
      "Une cage d’escalier ou une double hauteur offre un volume rare. Un lustre en cascade l’habite sur toute sa verticale et se découvre différemment à chaque marche.",
    sections: [
      {
        h2: "Penser à la verticale",
        body: [
          "Dans un grand volume, c’est la longueur du luminaire qui compte avant son diamètre. Une cascade qui occupe environ la moitié à deux tiers de la hauteur disponible se lit comme une pièce à part entière, sans écraser l’espace ni rester accrochée au plafond.",
          "Gardez un passage libre confortable sous le point le plus bas : en général au moins 2 m au-dessus des marches ou du sol de circulation.",
        ],
      },
      {
        h2: "Composer selon la forme de la trémie",
        body: [
          "Une trémie ronde ou carrée appelle une composition centrée, en couronne ou en spirale. Un escalier droit ou un vide long accepte mieux une composition linéaire, qui suit la pente ou la longueur du volume.",
          "Les cascades de sphères, de gouttes ou de cristal se voient de tous les côtés : depuis l’entrée, depuis l’étage et depuis l’escalier lui-même. Choisissez une pièce qui reste belle vue d’en dessous.",
        ],
      },
      {
        h2: "Installation et entretien",
        body: [
          "Les grandes compositions se posent par un électricien, avec un point d’accroche adapté au poids indiqué sur la fiche. Pour une très grande hauteur, prévoyez dès le départ l’accès pour l’installation et l’entretien.",
          "Les versions à télécommande permettent de régler l’intensité sans interrupteur supplémentaire, pratique dans une cage d’escalier qui se traverse à toute heure.",
        ],
      },
    ],
    faq: [
      {
        q: "Quelle longueur de lustre pour une cage d’escalier ?",
        a: "Comptez environ la moitié à deux tiers de la hauteur du volume, en gardant au moins 2 m de passage libre sous le point le plus bas.",
      },
      {
        q: "Quel lustre pour une mezzanine ou un duplex ?",
        a: "Une cascade verticale, qui se voit à la fois du rez-de-chaussée et de l’étage. Chaque fiche indique les hauteurs disponibles et la hauteur sous plafond conseillée.",
      },
      {
        q: "Peut-on installer soi-même un lustre en cascade ?",
        a: "Pour les grandes compositions, faites appel à un électricien : le point d’accroche doit supporter le poids de la pièce et le raccordement respecter la norme en vigueur.",
      },
    ],
  },
  salon: {
    keyword: "salon",
    title: "Luminaire de salon : lustres, suspensions, appliques",
    h1: "Luminaires pour le salon",
    description:
      "Lustre central, suspension sculpturale et appliques murales pour le salon : comment composer l’éclairage d’un séjour, et la sélection LUMÉANCE.",
    intro:
      "Le salon vit du matin au soir. Une pièce maîtresse au centre lui donne son caractère ; des touches de lumière sur les murs lui donnent sa profondeur.",
    sections: [
      {
        h2: "Une pièce maîtresse",
        body: [
          "Au centre du séjour, un lustre ou une grande suspension structure l’espace. Pour estimer la taille, une méthode courante consiste à additionner la longueur et la largeur de la pièce en mètres, puis multiplier par 8 : on obtient un ordre de grandeur du diamètre en centimètres (une pièce de 5 × 4 m appelle un luminaire d’environ 70 cm).",
          "Sous un plafond standard, privilégiez les compositions qui se déploient en largeur, en anneau ou en couronne ; les plafonds hauts accueillent des cascades plus longues.",
        ],
      },
      {
        h2: "Superposer les lumières",
        body: [
          "Un seul point lumineux aplatit une pièce. Ajoutez des appliques à hauteur des yeux, une lumière d’appoint près du canapé ou de la bibliothèque : chaque source sert un usage et l’ensemble crée de la profondeur.",
          "Les appliques sculpturales jouent aussi le rôle d’objet décoratif quand elles sont éteintes : placées de part et d’autre d’une cheminée ou d’une console, elles encadrent le mur.",
        ],
      },
      {
        h2: "Matières et ambiance",
        body: [
          "Le doré réchauffe un intérieur clair, le noir souligne une architecture contemporaine, le cristal apporte des reflets qui animent la pièce le soir. Le verre et l’acrylique diffusent une lumière plus enveloppante.",
        ],
      },
    ],
    faq: [
      {
        q: "Quelle taille de lustre pour un salon ?",
        a: "Additionnez la longueur et la largeur de la pièce en mètres et multipliez par 8 : vous obtenez un ordre de grandeur du diamètre en centimètres (environ 70 cm pour 5 × 4 m). Chaque fiche indique aussi la surface conseillée.",
      },
      {
        q: "Lustre ou appliques dans un salon ?",
        a: "Les deux se complètent : le lustre donne l’éclairage d’ensemble et le caractère, les appliques ajoutent des points de lumière plus bas, pour la lecture et l’ambiance du soir.",
      },
    ],
  },
  chambre: {
    keyword: "chambre",
    title: "Luminaire de chambre : appliques de chevet",
    h1: "Luminaires pour la chambre",
    description:
      "Appliques de chevet, petites suspensions et lumière douce pour la chambre : nos conseils de placement et notre sélection de luminaires design.",
    intro:
      "Dans une chambre, la lumière accompagne la fin de journée. Elle doit permettre de lire sans gêner l’autre, et s’adoucir au moment de dormir.",
    sections: [
      {
        h2: "Au chevet",
        body: [
          "Une applique murale ou une petite suspension de chaque côté du lit libère les tables de chevet et donne une symétrie apaisante. Placez-la en général entre 60 et 80 cm au-dessus du matelas, un peu en retrait de la tête de lit, pour éclairer le livre sans éblouir.",
          "Une suspension de chevet descend souvent jusqu’à 40 à 60 cm au-dessus de la table : vérifiez sur la fiche la longueur de câble disponible.",
        ],
      },
      {
        h2: "Une lumière douce",
        body: [
          "Privilégiez un blanc chaud et des sources diffusées ou orientées vers le mur. Les versions à intensité réglable passent d’une lumière de lecture à une veilleuse.",
          "Un luminaire central reste utile pour s’habiller ou ranger ; il peut être plus discret que dans le séjour, la chambre se vivant surtout à hauteur du lit.",
        ],
      },
      {
        h2: "Composer avec la tête de lit",
        body: [
          "Une tête de lit haute ou un mur habillé appelle des appliques fines, qui soulignent le relief sans le masquer. Devant un mur nu, une applique plus sculpturale devient le décor de la chambre.",
          "Pensez aussi aux interrupteurs : chaque côté du lit doit pouvoir allumer et éteindre sa lumière sans se lever. Les versions à télécommande simplifient ce point quand le câblage existant ne le permet pas.",
        ],
      },
    ],
    faq: [
      {
        q: "À quelle hauteur poser une applique de chevet ?",
        a: "En général entre 60 et 80 cm au-dessus du matelas, légèrement en retrait de la tête de lit.",
      },
      {
        q: "Quelle température de lumière pour une chambre ?",
        a: "Un blanc chaud, plus doux le soir. Les versions à intensité ou température réglable permettent d’adapter la lumière au moment.",
      },
    ],
  },
  entree: {
    keyword: "entrée",
    title: "Luminaire d’entrée et de couloir : appliques",
    h1: "Luminaires pour l’entrée et le couloir",
    description:
      "Appliques murales et suspensions pour l’entrée, le hall et le couloir : accueillir dès le seuil et guider le long des murs. Conseils et sélection.",
    intro:
      "L’entrée est la première impression d’une maison. Un luminaire bien choisi accueille dès le seuil ; une suite d’appliques guide ensuite le long du couloir.",
    sections: [
      {
        h2: "Accueillir dès le seuil",
        body: [
          "Dans un hall, une suspension ou un petit lustre donne immédiatement le ton de la maison. Si l’entrée est en double hauteur, voyez aussi nos lustres pour escalier, qui habitent toute la verticale.",
          "Près d’un miroir ou d’une console, une paire d’appliques éclaire le visage de face et encadre le mur.",
        ],
      },
      {
        h2: "Rythmer un couloir",
        body: [
          "Dans un couloir, des appliques espacées régulièrement, souvent tous les 2 à 3 m, rythment le passage mieux qu’un plafonnier unique. Placez-les en général vers 1,60 à 1,80 m du sol, et vérifiez leur profondeur pour ne pas gêner la circulation dans un passage étroit.",
          "Les appliques qui éclairent vers le haut et vers le bas font paraître le plafond plus haut et dessinent des motifs sur les murs.",
        ],
      },
      {
        h2: "Une lumière qui accueille",
        body: [
          "Dans une entrée, la lumière se traverse plus qu’elle ne s’habite : elle doit être immédiate, chaleureuse et flatteuse pour le visage. Un blanc chaud évite l’effet de hall froid et prépare au passage vers le séjour.",
          "Gardez une cohérence de finition avec les pièces qui suivent : le même doré ou le même noir, d’une pièce à l’autre, relie l’entrée au reste de la maison.",
        ],
      },
    ],
    faq: [
      {
        q: "À quelle hauteur poser une applique dans un couloir ?",
        a: "En général entre 1,60 et 1,80 m du sol, avec un espacement de 2 à 3 m entre deux appliques.",
      },
      {
        q: "Quel luminaire pour une petite entrée ?",
        a: "Une paire d’appliques peu profondes ou une petite suspension, qui éclairent sans encombrer le passage.",
      },
    ],
  },
};

/** Pièces publiées d'une entrée par pièce, dans l'ordre de `ROOMS`. */
export function roomProducts<T extends { slug: string }>(slugs: string[], products: T[]): T[] {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  return slugs.map((s) => bySlug.get(s)).filter((p): p is T => !!p);
}
