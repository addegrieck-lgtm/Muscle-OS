import type { Field } from "./resources";

/** Champs des formulaires d'administration du monde (miroir des schémas de /admin/v1/world). */
export const SETTINGS: Field[] = [
  { name: "foundersCap", label: "Nombre de places de fondateur", kind: "number", required: true },
  { name: "empiresMaxMembers", label: "Membres max. par empire", kind: "number", required: true },
  { name: "worldRadius", label: "Rayon du monde (blocs, carte)", kind: "number", required: true },
  { name: "foundersOpen", label: "Attribution des numéros de fondateur ouverte", kind: "checkbox" },
];

export const MILESTONE: Field[] = [
  { name: "threshold", label: "Palier (nombre de fondateurs)", kind: "number", required: true },
  { name: "title", label: "Titre", kind: "text", required: true },
  { name: "reward", label: "Récompense (interne)", kind: "text", nullIfEmpty: true },
  { name: "description", label: "Description publique", kind: "textarea" },
  { name: "reveal", label: "Révélation (affichée seulement une fois le palier atteint)", kind: "textarea", nullIfEmpty: true },
];

export const JOURNAL: Field[] = [
  { name: "title", label: "Titre", kind: "text", required: true },
  { name: "slug", label: "Slug", kind: "text", required: true },
  { name: "episode", label: "Épisode (vide = hors série)", kind: "number" },
  { name: "kind", label: "Type", kind: "select", options: [["video", "Vidéo"], ["short", "Short"], ["update", "Mise à jour"], ["coulisses", "Coulisses"], ["milestone", "Étape"]] },
  { name: "videoUrl", label: "URL vidéo (YouTube…)", kind: "url", column: "video_url" },
  { name: "thumbnailUrl", label: "Miniature", kind: "url", column: "thumbnail_url" },
  { name: "publishedAt", label: "Date de sortie (vide = « à venir »)", kind: "datetime", column: "published_at" },
  { name: "published", label: "Visible sur le site", kind: "checkbox" },
  { name: "summary", label: "Résumé", kind: "textarea" },
  { name: "body", label: "Texte", kind: "textarea" },
];

export const ROADMAP: Field[] = [
  { name: "key", label: "Clé", kind: "text", required: true },
  { name: "title", label: "Titre", kind: "text", required: true },
  { name: "status", label: "Statut", kind: "select", options: [["upcoming", "À venir"], ["current", "En cours"], ["done", "Terminé"]] },
  { name: "position", label: "Ordre", kind: "number", required: true },
  { name: "eta", label: "Échéance affichée (ex. « Été 2026 »)", kind: "text", nullIfEmpty: true },
  { name: "summary", label: "Résumé", kind: "textarea" },
  { name: "details", label: "Détails", kind: "textarea" },
];

export const ZONE: Field[] = [
  { name: "key", label: "Clé", kind: "text", required: true },
  { name: "name", label: "Nom", kind: "text", required: true },
  { name: "kind", label: "Type", kind: "select", options: [["neutral", "Neutre"], ["spawn", "Spawn"], ["koth", "KOTH"], ["warzone", "Zone de guerre"], ["event", "Événement"], ["outpost", "Avant-poste"]] },
  { name: "active", label: "Affichée sur la carte", kind: "checkbox" },
  { name: "x1", label: "x1", kind: "number", required: true },
  { name: "z1", label: "z1", kind: "number", required: true },
  { name: "x2", label: "x2", kind: "number", required: true },
  { name: "z2", label: "z2", kind: "number", required: true },
  { name: "description", label: "Description", kind: "textarea" },
];

export const INFLUENCE: Field[] = [
  { name: "points", label: "Points", kind: "number", required: true },
  { name: "dailyCap", label: "Plafond par jour (vide = aucun)", kind: "number" },
  { name: "requiresLinked", label: "Compte Minecraft lié requis", kind: "checkbox" },
  { name: "active", label: "Active", kind: "checkbox" },
];

export const EMPIRE: Field[] = [
  { name: "name", label: "Nom", kind: "text", required: true },
  { name: "status", label: "Statut", kind: "select", options: [["active", "Actif"], ["banned", "Banni"], ["disbanded", "Dissous"]] },
  { name: "factionName", label: "Faction en jeu liée (territoires, guerres du bridge)", kind: "text", nullIfEmpty: true },
];

export const WAR: Field[] = [
  { name: "title", label: "Titre", kind: "text", required: true },
  { name: "slug", label: "Slug", kind: "text", required: true },
  { name: "attacker", label: "Attaquant (slug d'empire)", kind: "text", required: true },
  { name: "defender", label: "Défenseur (slug d'empire)", kind: "text", required: true },
  { name: "status", label: "Statut", kind: "select", options: [["planned", "Déclarée"], ["active", "Active"], ["ended", "Terminée"], ["cancelled", "Annulée"]] },
  { name: "winner", label: "Vainqueur (slug, si terminée)", kind: "text", nullIfEmpty: true },
  { name: "startsAt", label: "Début", kind: "datetime", required: true },
  { name: "endsAt", label: "Fin", kind: "datetime" },
  { name: "attackerScore", omitIfEmpty: true, label: "Score attaquant", kind: "number" },
  { name: "defenderScore", omitIfEmpty: true, label: "Score défenseur", kind: "number" },
  { name: "attackerTerritories", omitIfEmpty: true, label: "Territoires attaquant", kind: "number" },
  { name: "defenderTerritories", omitIfEmpty: true, label: "Territoires défenseur", kind: "number" },
  { name: "participants", omitIfEmpty: true, label: "Participants (réels)", kind: "number" },
  { name: "summary", label: "Résumé", kind: "textarea" },
];

export const WAR_EVENT: Field[] = [
  { name: "kind", label: "Type", kind: "select", options: [["note", "Info"], ["capture", "Capture"], ["battle", "Bataille"], ["end", "Fin"]] },
  { name: "message", label: "Message", kind: "text", required: true },
];

export const POLL: Field[] = [
  { name: "question", label: "Question", kind: "text", required: true },
  { name: "slug", label: "Slug", kind: "text", required: true },
  { name: "status", label: "Statut", kind: "select", options: [["draft", "Brouillon"], ["open", "Ouvert"], ["closed", "Clos"]] },
  { name: "eligibility", label: "Qui peut voter", kind: "select", options: [["account", "Tout compte"], ["linked", "Comptes liés à Minecraft"]] },
  { name: "closesAt", label: "Clôture", kind: "datetime" },
  { name: "outcome", label: "Décision prise (après clôture)", kind: "text", nullIfEmpty: true },
  { name: "description", label: "Description", kind: "textarea" },
  { name: "options", label: "Choix (un par ligne, modifiables seulement avant le premier vote)", kind: "lines" },
];

export const REJECT: Field[] = [{ name: "reason", label: "Motif du rejet", kind: "text", required: true }];

export const VOTE_SITE: Field[] = [
  { name: "name", label: "Nom affiché", kind: "text", required: true },
  { name: "key", label: "Clé", kind: "text", required: true },
  { name: "voteUrl", label: "Page de vote de VÆLORIA sur le site", kind: "url", column: "vote_url", required: true },
  { name: "verifier", label: "Vérification « J'ai voté »", kind: "select", options: [["serveur-prive.net", "serveur-prive.net (jeton API)"], ["serveur-minecraft.com", "serveur-minecraft.com (ID du serveur)"], ["liste-serveurs-minecraft.org", "liste-serveurs-minecraft.org (server_id)"], ["none", "Aucune (Votifier uniquement)"]] },
  { name: "verificationKey", label: "Clé de vérification (jeton ou ID fourni par le site, jamais affichée)", kind: "text", column: "verification_key", nullIfEmpty: true },
  { name: "votifierService", label: "Nom du service Votifier (votes reçus en jeu)", kind: "text", column: "votifier_service", nullIfEmpty: true },
  { name: "cooldownMinutes", label: "Délai entre deux votes (minutes)", kind: "number", column: "cooldown_minutes", required: true },
  { name: "rewardLabel", label: "Récompense affichée (ex. « 1 clé de vote »)", kind: "text", column: "reward_label" },
  { name: "rewardCommand", label: "Commande en jeu ({username}, {uuid}) — joueur connecté", kind: "text", column: "reward_command", nullIfEmpty: true },
  { name: "position", label: "Ordre", kind: "number", required: true },
  { name: "active", label: "Affiché sur /vote", kind: "checkbox" },
];
