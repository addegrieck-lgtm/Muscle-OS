import { normalize } from '../utils';

/**
 * Système de prudence (riebe-2015).
 * L'application NE DIAGNOSTIQUE PAS. Elle détecte des signaux d'alerte dans ce que l'utilisateur
 * écrit ou déclare, recommande l'arrêt de l'exercice et, selon la gravité, un avis médical.
 */

export type SafetyLevel = 'none' | 'caution' | 'urgent';

export interface SafetyAssessment {
  level: SafetyLevel;
  message: string;
  matched: string[];
}

export const DISCLAIMER =
  'Cette application fournit des recommandations générales et ne remplace pas un professionnel de santé.';

const URGENT: [RegExp, string][] = [
  [/(douleur|mal|serre|oppression|pression).{0,20}(poitrine|thorax|thoracique|coeur)/, 'douleur thoracique'],
  [/(poitrine|thorax).{0,15}(douleur|serre|oppress|mal)/, 'douleur thoracique'],
  [/malaise|evanoui|perte de connaissance|tomber dans les pommes/, 'malaise'],
  [/palpitation|coeur (qui )?(bat|s emballe)|rythme cardiaque (anormal|irregulier)/, 'palpitations'],
  [/(essouffl|souffle court|respir).{0,25}(inhabituel|anormal|intense|difficile|n arrive pas|impossible)|difficulte.{0,5}respirer|du mal a respirer/, 'essoufflement inhabituel'],
  [/vertige|tete qui tourne|vision (trouble|floue)|voile noir/, 'vertiges'],
  [/engourdi|fourmill.{0,20}(bras|visage)|paralys|perte de force soudaine/, 'engourdissement'],
  [/douleur (intense|violente|insupportable|aigue)|craquement.{0,20}douleur|os casse|fracture/, 'douleur aiguë importante'],
];

const CAUTION: [RegExp, string][] = [
  [/douleur|douloureu/, 'douleur'],
  [/\bmal (au|a la|aux|a l|au niveau|dans)\b/, 'douleur localisée'],
  [/j ai mal\b(?! recupere| dormi)/, 'douleur'],
  [/blesse|blessure|entorse|tendin|claquage|dechir|elongation|foulure/, 'blessure'],
  [/gonfle|enfle|oedeme|hematome/, 'gonflement'],
  [/lancement|elancement|pincement|coince/, 'douleur articulaire'],
];

export function assessText(text: string): SafetyAssessment {
  const t = normalize(text);
  const urgent = URGENT.filter(([re]) => re.test(t)).map(([, l]) => l);
  if (urgent.length) {
    return {
      level: 'urgent',
      matched: [...new Set(urgent)],
      message:
        `⚠️ Tu décris un signe qui doit être pris au sérieux (${[...new Set(urgent)].join(', ')}).\n\n` +
        '**Arrête immédiatement l’effort** et mets-toi au repos.\n' +
        'Si les symptômes sont importants, persistent ou reviennent, **demande un avis médical sans attendre**. ' +
        'En cas de douleur thoracique, malaise, difficulté à respirer ou symptôme soudain : appelle le **15 (SAMU)** ou le **112**.\n\n' +
        'Je ne peux pas poser de diagnostic. Ne reprends pas l’entraînement avant d’avoir l’accord d’un professionnel de santé.',
    };
  }
  const caution = CAUTION.filter(([re]) => re.test(t)).map(([, l]) => l);
  if (caution.length) {
    return {
      level: 'caution',
      matched: [...new Set(caution)],
      message:
        '🩹 Tu signales une douleur ou une possible blessure.\n\n' +
        '• **Arrête l’exercice qui provoque la douleur** — ne « force » pas dessus.\n' +
        '• Tu peux continuer les exercices qui ne sollicitent pas la zone et ne déclenchent aucune douleur.\n' +
        '• Si la douleur est importante, persiste plus de quelques jours, s’accompagne d’un gonflement, d’une perte de mobilité ou de force : **consulte un médecin ou un kinésithérapeute**.\n\n' +
        'Je ne peux pas diagnostiquer l’origine de la douleur. Dans la séance, coche « Douleur » sur l’exercice concerné : l’app te proposera une variante plus douce.',
    };
  }
  return { level: 'none', matched: [], message: '' };
}
