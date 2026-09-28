import type {
  CoachAction,
  DayMeals,
  ExerciseProgress,
  IntakeLog,
  Macros,
  NutritionPlan,
  Program,
  RecoveryEntry,
  User,
  WeightEntry,
  WorkoutSession,
} from '../types/models';
import { FOODS, getFood } from '../data/foods';
import { EXERCISES, exerciseById, getExercise } from '../data/exercises';
import { muscleLabel, WEEKDAYS } from '../data/reference';
import { assessText, type SafetyLevel } from './safety';
import { computeAdjustment } from './recoveryAdjuster';
import { generateMeal, isFoodAllowed, macrosOf } from './mealGenerator';
import { weeklyWeightChangePct, latestWeight } from './analytics';
import { suggestCalorieAdjustment } from './nutritionCalculator';
import { daysBetween, fmt, normalize, weekdayIndex } from '../utils';

/**
 * Coach local à base de règles : fonctionne hors-ligne, sans API.
 * Architecture « provider » : un fournisseur LLM (ex. Ollama local, gratuit) peut être branché
 * plus tard via `CoachProvider` — la couche de sécurité reste toujours appliquée en premier.
 */

export interface CoachContext {
  user: User;
  program?: Program;
  nutrition?: NutritionPlan;
  todayMeals?: DayMeals;
  intake?: IntakeLog;
  recoveryToday?: RecoveryEntry;
  sessions: WorkoutSession[];
  progress: Record<string, ExerciseProgress>;
  weights: WeightEntry[];
  pantry: string[];
  today: string;
}

export interface CoachReply {
  text: string;
  severity: 'info' | 'warning' | 'danger';
  actions?: CoachAction[];
  sourceIds?: string[];
  intent: string;
}

export interface CoachProvider {
  id: string;
  answer(question: string, ctx: CoachContext): Promise<CoachReply>;
}

// ---------------- Aides ----------------

const FOOD_SYNONYMS: Record<string, string[]> = {
  chicken: ['poulet', 'blanc de poulet'],
  turkey: ['dinde'],
  beef5: ['steak', 'boeuf', 'viande hachee', 'steak hache'],
  ham: ['jambon'],
  eggs: ['oeuf', 'oeufs'],
  tuna: ['thon'],
  salmon: ['saumon'],
  cod: ['cabillaud', 'poisson blanc', 'colin'],
  shrimp: ['crevette'],
  tofu: ['tofu'],
  lentils: ['lentille'],
  chickpeas: ['pois chiche'],
  red_beans: ['haricots rouges'],
  fromage_blanc: ['fromage blanc'],
  skyr: ['skyr'],
  yogurt: ['yaourt', 'yogourt'],
  milk: ['lait'],
  rice: ['riz'],
  pasta: ['pates', 'pate'],
  oats: ['avoine', 'flocons'],
  bread: ['pain'],
  potatoes: ['pomme de terre', 'pommes de terre', 'patate'],
  sweet_potato: ['patate douce'],
  quinoa: ['quinoa'],
  couscous: ['semoule', 'couscous'],
  banana: ['banane'],
  broccoli: ['brocoli'],
  olive_oil: ['huile d olive', 'huile'],
  peanut_butter: ['beurre de cacahuete'],
};

export function findFoodsInText(text: string): string[] {
  const t = normalize(text);
  const found: string[] = [];
  // les expressions les plus longues d'abord (patate douce avant patate)
  const entries = Object.entries(FOOD_SYNONYMS).flatMap(([id, syns]) => syns.map((s) => [id, s] as const)).sort((a, b) => b[1].length - a[1].length);
  let rest = t;
  for (const [id, syn] of entries) {
    const re = new RegExp(`\\b${syn}s?\\b`);
    if (re.test(rest)) {
      found.push(id);
      rest = rest.replace(re, ' ');
    }
  }
  return [...new Set(found)];
}

export function substitutesFor(foodId: string, ctx: CoachContext, n = 3): string[] {
  const f = getFood(foodId);
  const density = (x: typeof f) => (x.kcal ? x.protein / x.kcal : 0);
  return FOODS.filter((x) => x.id !== f.id && !x.staple && x.category === f.category && isFoodAllowed(x, ctx.user.nutrition))
    .sort((a, b) => Math.abs(density(a) - density(f)) - Math.abs(density(b) - density(f)))
    .slice(0, n)
    .map((x) => x.id);
}

export function eatenMacros(ctx: CoachContext): Macros {
  const eaten = ctx.todayMeals?.meals.filter((m) => ctx.intake?.eatenMealIds.includes(m.id)) ?? [];
  const base = eaten.reduce((a, m) => ({ kcal: a.kcal + m.macros.kcal, protein: a.protein + m.macros.protein, carbs: a.carbs + m.macros.carbs, fat: a.fat + m.macros.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const x = ctx.intake?.extra ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  return { kcal: base.kcal + x.kcal, protein: base.protein + x.protein, carbs: base.carbs + x.carbs, fat: base.fat + x.fat };
}

const describeWorkoutToday = (ctx: CoachContext): string => {
  if (!ctx.program) return 'Aucun programme généré pour l’instant.';
  const day = ctx.program.schedule[weekdayIndex(ctx.today)];
  const parts: string[] = [];
  const w = ctx.program.workouts.find((x) => x.id === day.workoutId);
  if (w) parts.push(`🏋️ **${w.title}** (${w.focus.map(muscleLabel).join(', ')}) ≈ ${w.estimatedMinutes} min`);
  if (day.cardio) parts.push(`🏃 **${day.cardio.title}** ${Math.round(day.cardio.totalMinutes)} min`);
  if (day.core) parts.push('🧱 **Gainage & abdos** ≈ 12 min');
  return parts.length ? parts.join('\n') : '😴 Jour de repos (une marche légère est toujours bienvenue).';
};

// ---------------- Intentions ----------------

type Handler = (q: string, n: string, ctx: CoachContext) => CoachReply | null;

const handlers: [string, Handler][] = [
  [
    'short_time',
    (_q, n, ctx) => {
      const m = n.match(/(\d{1,3})\s*(min|minute|mn)/);
      const short = /(que|seulement|juste|peu de temps|pas le temps|pas beaucoup de temps|press)/.test(n);
      if (!m && !(short && /temps/.test(n))) return null;
      const minutes = m ? Math.max(10, Math.min(60, parseInt(m[1], 10))) : 20;
      const prio = Object.entries(ctx.user.musclePriorities).filter(([, p]) => p === 'priority').map(([k]) => muscleLabel(k as never));
      return {
        intent: 'short_time',
        severity: 'info',
        text:
          `Pas de souci : ${minutes} minutes bien utilisées valent bien mieux que rien.\n\n` +
          `Je te prépare une **séance express de ${minutes} min** en circuit, repos courts, qui garde ${prio.length ? `tes priorités (**${prio.join(', ')}**)` : 'un équilibre full body'} en premier.\n\n` +
          'Conseil : échauffe-toi 2-3 min, puis enchaîne. Garde 1-2 répétitions en réserve.',
        actions: [{ type: 'start_quick_workout', minutes, label: `Lancer la séance ${minutes} min` }],
        sourceIds: ['who-2020', 'refalo-2023'],
      };
    },
  ],
  [
    'missed_session',
    (_q, n, ctx) => {
      if (!/(rate|manque|pas pu|loupe|saute|zappe|pas fait|oublie)/.test(n) || !/(seance|entrainement|sport|muscu|cardio|course|hier)/.test(n)) return null;
      const last = [...ctx.sessions].filter((s) => s.finishedAt).sort((a, b) => b.date.localeCompare(a.date))[0];
      const since = last ? daysBetween(last.date, ctx.today) : null;
      return {
        intent: 'missed_session',
        severity: 'info',
        text:
          'Aucun problème, une séance manquée ne change rien à long terme — c’est la régularité sur des semaines qui compte.\n\n' +
          '**Ce que je te conseille :**\n' +
          '• **Ne double pas** les séances pour « rattraper ».\n' +
          '• Fais aujourd’hui la séance prévue, ou si aujourd’hui est un jour de repos, fais la séance manquée à la place.\n' +
          '• Puis reprends le planning normal.\n\n' +
          `Aujourd’hui : \n${describeWorkoutToday(ctx)}` +
          (since != null && since > 7 ? `\n\nTa dernière séance date de ${since} jours : reprends avec 1 série de moins par exercice cette semaine.` : ''),
        actions: [{ type: 'navigate', to: 'training', label: 'Voir mon entraînement' }],
      };
    },
  ],
  [
    'recovery',
    (_q, n, ctx) => {
      if (!/(mal recupere|recupere mal|fatigue|creve|epuise|mal dormi|pas dormi|dormi \d|courbatur|pas d energie|a plat|vide|lessive|recuperation)/.test(n)) return null;
      const adj = computeAdjustment(ctx.recoveryToday);
      const tips =
        '• Garde la séance mais avec **moins de séries** (−20 à −40 %) et 2 répétitions de marge en plus.\n' +
        '• Remplace le cardio intense par de la **marche** ou du vélo facile.\n' +
        '• Vise **7 h de sommeil ou plus** (consensus AASM) et assez de protéines/glucides.\n' +
        '• Les courbatures ne sont pas un indicateur de progrès : pas besoin de les chercher.';
      return {
        intent: 'recovery',
        severity: 'info',
        text:
          (ctx.recoveryToday
            ? `D’après ton check-in (forme ${adj.score}/100) : ${adj.message}\n\n`
            : 'Fais ton check-in matinal (Accueil) : je pourrai ajuster automatiquement la séance.\n\n') +
          tips +
          '\n\nSi la fatigue dure plus de 1-2 semaines malgré le repos, parles-en à un médecin.',
        actions: [{ type: 'navigate', to: 'home', label: 'Faire mon check-in' }],
        sourceIds: ['watson-2015', 'bell-2023'],
      };
    },
  ],
  [
    'missing_food',
    (_q, n, ctx) => {
      if (!/(pas de|plus de|n ai pas|manque de|sans|pas d )/.test(n)) return null;
      const foods = findFoodsInText(n);
      if (!foods.length) return null;
      const lines = foods.map((id) => {
        const subs = substitutesFor(id, ctx);
        return `• **${getFood(id).name}** → ${subs.map((s) => getFood(s).name).join(', ') || 'aucun substitut compatible avec tes préférences'}`;
      });
      return {
        intent: 'missing_food',
        severity: 'info',
        text:
          'Voici des remplacements équivalents (même rôle, apport protéique proche) :\n\n' +
          lines.join('\n') +
          '\n\nTu peux aussi indiquer ce que tu as dans « J’ai déjà ces aliments » (Nutrition) : les repas seront recalculés avec.',
        actions: [{ type: 'navigate', to: 'nutrition-pantry', label: 'Ouvrir « J’ai ces aliments »' }],
      };
    },
  ],
  [
    'what_to_eat',
    (_q, n, ctx) => {
      if (!/(manger|repas|diner|dejeuner|ce soir|midi|faim|cuisiner|recette)/.test(n)) return null;
      if (!ctx.nutrition) return null;
      const eaten = eatenMacros(ctx);
      const remainingKcal = Math.max(300, ctx.nutrition.targetKcal - eaten.kcal);
      const remainingProt = Math.max(20, ctx.nutrition.protein - eaten.protein);
      const type = /(matin|petit dej)/.test(n) ? 'breakfast' : /(midi|dejeuner)/.test(n) ? 'lunch' : /(collation|gouter|encas)/.test(n) ? 'snack' : 'dinner';
      const target = { kcal: Math.min(remainingKcal, type === 'snack' ? 400 : 1000), protein: Math.min(remainingProt, type === 'snack' ? 35 : 60) };
      const usePantry = ctx.pantry.length >= 3;
      const meal =
        generateMeal(type, target, { prefs: ctx.user.nutrition, availableFoods: usePantry ? ctx.pantry : undefined, seed: Date.now() % 1000 }) ??
        generateMeal(type, target, { prefs: ctx.user.nutrition, seed: Date.now() % 1000 });
      if (!meal) return null;
      const m = macrosOf(meal.items);
      return {
        intent: 'what_to_eat',
        severity: 'info',
        text:
          `Aujourd’hui tu as consommé ≈ **${fmt(eaten.kcal)} kcal** et **${fmt(eaten.protein)} g** de protéines. ` +
          `Il te reste ≈ ${fmt(ctx.nutrition.targetKcal - eaten.kcal)} kcal et ${fmt(ctx.nutrition.protein - eaten.protein)} g de protéines.\n\n` +
          `Proposition${usePantry ? ' (avec les aliments que tu as)' : ''} : **${meal.name}**\n` +
          meal.items.map((i) => `• ${getFood(i.foodId).name} — ${i.grams} g`).join('\n') +
          `\n\n≈ ${fmt(m.kcal)} kcal · ${fmt(m.protein)} g P · ${fmt(m.carbs)} g G · ${fmt(m.fat)} g L · ${meal.prepMinutes} min`,
        actions: [{ type: 'navigate', to: 'nutrition', label: 'Voir mes repas' }],
        sourceIds: ['schoenfeld-aragon-2018'],
      };
    },
  ],
  [
    'exercise_progress',
    (_q, n, ctx) => {
      if (!/(progress|ameliorer|plus de|reussir|faire|debloquer|augmenter)/.test(n)) return null;
      const keys: [RegExp, string][] = [
        [/pompe/, 'pushup'],
        [/traction/, 'pullup'],
        [/squat/, 'bodyweight_squat'],
        [/planche|gainage/, 'plank'],
        [/abdo/, 'crunch'],
        [/dips/, 'chair_dip'],
        [/fente/, 'reverse_lunge'],
      ];
      const hit = keys.find(([re]) => re.test(n));
      if (!hit) return null;
      const ex = getExercise(hit[1]);
      const chain: string[] = [];
      let cur = ex.regression ? exerciseById(ex.regression) : undefined;
      while (cur && chain.length < 3) {
        chain.unshift(cur.name);
        cur = cur.regression ? exerciseById(cur.regression) : undefined;
      }
      chain.push(`**${ex.name}**`);
      let nx = ex.progression ? exerciseById(ex.progression) : undefined;
      while (nx && chain.length < 7) {
        chain.push(nx.name);
        nx = nx.progression ? exerciseById(nx.progression) : undefined;
      }
      const prog = Object.values(ctx.progress).find((p) => p.baseExerciseId === ex.id || p.exerciseId === ex.id);
      const state = prog ? `\n\nTon niveau actuel : **${getExercise(prog.exerciseId).name}**, objectif ${prog.repMin}-${prog.repMax}${getExercise(prog.exerciseId).mode === 'time' ? ' s' : ' répétitions'}${prog.load ? ` à ${prog.load} kg` : ''}.` : '';
      return {
        intent: 'exercise_progress',
        severity: 'info',
        text:
          `Pour progresser sur **${ex.name.toLowerCase()}** :\n\n` +
          '• **2-3 séances par semaine** sollicitant le mouvement.\n' +
          '• **Double progression** : quand tu atteins le haut de la fourchette sur toutes les séries, l’app augmente la difficulté (répétitions → variante → tempo/charge).\n' +
          '• S’arrêter à **1-3 répétitions de l’échec** suffit ; la technique propre avant tout.\n' +
          '• Descente contrôlée (2-3 s) pour augmenter le temps sous tension.\n\n' +
          `Progression des variantes :\n${chain.join(' → ')}\n\n` +
          `Points clés : ${ex.cues.slice(0, 3).join(' · ')}.` +
          state,
        sourceIds: ['kotarsky-2018', 'acsm-2009', 'refalo-2023'],
      };
    },
  ],
  [
    'protein',
    (_q, n, ctx) => {
      if (!/proteine/.test(n)) return null;
      const eaten = eatenMacros(ctx);
      const target = ctx.nutrition;
      const perMeal = Math.round(ctx.user.weightKg * 0.4);
      const rich = FOODS.filter((f) => isFoodAllowed(f, ctx.user.nutrition) && f.protein >= 10 && f.kcal > 0 && f.protein / f.kcal > 0.1)
        .slice(0, 6)
        .map((f) => f.name);
      return {
        intent: 'protein',
        severity: 'info',
        text:
          (target
            ? `Ta cible : **${target.protein} g/j** (plage documentée ${target.proteinRange[0]}-${target.proteinRange[1]} g). Aujourd’hui : ${fmt(eaten.protein)} g.\n\n`
            : '') +
          `• Les méta-analyses situent le plateau des gains autour de **1,6 g/kg/j** (jusqu’à ~2,2 g/kg), les besoins varient selon les personnes.\n` +
          `• Répartis sur 3-5 repas (≈ ${perMeal} g par repas).\n` +
          `• Sources compatibles avec tes préférences : ${rich.join(', ')}.\n` +
          '• Les compléments ne sont pas indispensables si l’alimentation couvre les besoins.',
        sourceIds: ['morton-2018', 'jager-2017', 'schoenfeld-aragon-2018'],
      };
    },
  ],
  [
    'weight_trend',
    (_q, n, ctx) => {
      if (!/(poids|stagne|plateau|balance|grossi|maigri|kilos?)/.test(n)) return null;
      const w = weeklyWeightChangePct(ctx.weights, ctx.today);
      const adj = suggestCalorieAdjustment(ctx.user.goal, w);
      const last = latestWeight(ctx.weights);
      return {
        intent: 'weight_trend',
        severity: 'info',
        text:
          (last ? `Dernière pesée : **${fmt(last, 1)} kg**. ` : 'Aucune pesée enregistrée. ') +
          (w != null ? `Tendance (moyenne 7 j) : **${w > 0 ? '+' : ''}${fmt(w, 2)} %/semaine**.\n\n` : '\n\n') +
          `${adj.message}\n\n` +
          'Le poids fluctue chaque jour (eau, sel, glucides, digestion) : seule la **moyenne glissante** sur 2-3 semaines est fiable. Pèse-toi le matin, à jeun, après être allé aux toilettes.',
        actions: [{ type: 'navigate', to: 'progress', label: 'Voir ma courbe de poids' }],
        sourceIds: ['helms-2014', 'iraki-2019'],
      };
    },
  ],
  [
    'today',
    (_q, n, ctx) => {
      if (!/(aujourd hui|programme|seance du jour|quoi faire|je fais quoi|entrainement)/.test(n)) return null;
      return { intent: 'today', severity: 'info', text: `Au programme aujourd’hui (${WEEKDAYS[weekdayIndex(ctx.today)]}) :\n\n${describeWorkoutToday(ctx)}`, actions: [{ type: 'navigate', to: 'training', label: 'Ouvrir l’entraînement' }] };
    },
  ],
  [
    'cardio',
    (_q, n, ctx) => {
      if (!/(cardio|courir|course|footing|endurance|velo|corde|marche)/.test(n)) return null;
      const sessions = ctx.program?.schedule.filter((d) => d.cardio) ?? [];
      return {
        intent: 'cardio',
        severity: 'info',
        text:
          `Cette semaine : **${Math.round(ctx.program?.weeklyCardioMinutes ?? 0)} min** de cardio.\n` +
          sessions.map((d) => `• ${WEEKDAYS[d.weekday]} : ${d.cardio!.title} (${Math.round(d.cardio!.totalMinutes)} min)`).join('\n') +
          '\n\n• L’essentiel en **intensité facile** (tu peux parler), 1 séance plus intense maximum pour un débutant.\n' +
          '• Augmentation de volume progressive (≈10 %/semaine max), semaine allégée toutes les 4 semaines.\n' +
          '• L’OMS recommande 150-300 min d’activité modérée par semaine au total (marche comprise).',
        sourceIds: ['who-2020', 'stoggl-2014', 'nielsen-2014'],
      };
    },
  ],
  [
    'sleep',
    (_q, n) => {
      if (!/(sommeil|dormir|dors)/.test(n)) return null;
      return {
        intent: 'sleep',
        severity: 'info',
        text:
          'Le consensus AASM/SRS recommande **7 heures ou plus** par nuit chez l’adulte.\n\n• Horaires réguliers, chambre fraîche et sombre.\n• Évite la caféine en fin de journée.\n• Une séance intense tard le soir peut gêner l’endormissement chez certaines personnes.\n\nEn cas de troubles persistants, parles-en à ton médecin.',
        sourceIds: ['watson-2015'],
      };
    },
  ],
  [
    'water',
    (_q, n, ctx) => {
      if (!/(eau|boire|hydrat)/.test(n)) return null;
      return {
        intent: 'water',
        severity: 'info',
        text: `Objectif estimé : **${ctx.nutrition?.waterL ?? 2} L/j** de boissons (références EFSA + entraînement). Aujourd’hui : ${fmt((ctx.intake?.waterMl ?? 0) / 1000, 1)} L.\n\nBois un peu plus quand il fait chaud ou lors des séances longues. Une urine claire est un bon repère.`,
        sourceIds: ['efsa-2010-water'],
      };
    },
  ],
  [
    'motivation',
    (_q, n) => {
      if (!/(motivation|pas envie|flemme|demotive|abandonner)/.test(n)) return null;
      return {
        intent: 'motivation',
        severity: 'info',
        text:
          'Normal, la motivation fluctue. La clé est de **réduire la barrière d’entrée** :\n\n• Engage-toi juste pour 10 minutes : souvent, on continue une fois lancé.\n• Une séance courte compte, une séance ratée ne compte pas contre toi.\n• Regarde ta courbe de progression : tu as déjà avancé.',
        actions: [{ type: 'start_quick_workout', minutes: 15, label: 'Séance 15 min' }],
      };
    },
  ],
];

export const EXAMPLE_QUESTIONS = [
  'Que dois-je manger ce soir ?',
  'Je n’ai que 20 minutes.',
  'Je n’ai pas de poulet.',
  'J’ai mal récupéré.',
  'Je n’ai pas pu faire ma séance hier.',
  'Comment progresser aux pompes ?',
  'Combien de protéines par jour ?',
  'Mon poids stagne.',
];

export function answerLocally(question: string, ctx: CoachContext): CoachReply {
  // 1) Sécurité TOUJOURS en premier.
  const safety = assessText(question);
  if (safety.level !== 'none') {
    return { intent: `safety_${safety.level}`, severity: safety.level === 'urgent' ? 'danger' : 'warning', text: safety.message, sourceIds: ['riebe-2015'] };
  }
  const n = normalize(question);
  for (const [, h] of handlers) {
    const r = h(question, n, ctx);
    if (r) return r;
  }
  return {
    intent: 'fallback',
    severity: 'info',
    text:
      'Je n’ai pas bien compris. Je fonctionne hors-ligne avec tes données (programme, repas, poids, séances). Essaie par exemple :\n\n' +
      EXAMPLE_QUESTIONS.map((q) => `• ${q}`).join('\n'),
  };
}

export const localProvider: CoachProvider = {
  id: 'local',
  answer: async (q, ctx) => answerLocally(q, ctx),
};

/** Résumé compact des données pour un LLM (Ollama) — jamais de photos, rien d'identifiant. */
export function contextSummary(ctx: CoachContext): string {
  const u = ctx.user;
  const eaten = eatenMacros(ctx);
  const prio = Object.entries(u.musclePriorities).filter(([, p]) => p !== 'normal').map(([m, p]) => `${muscleLabel(m as never)}=${p}`);
  return [
    `Profil: ${u.age} ans, ${u.sex === 'male' ? 'homme' : 'femme'}, ${u.heightCm} cm, ${latestWeight(ctx.weights) ?? u.weightKg} kg, niveau ${u.level}, objectif ${u.goal}.`,
    `Disponibilité: ${u.daysPerWeek} j/sem, ${u.sessionMinutes} min. Matériel: ${u.equipment.join(', ') || 'aucun'}.`,
    `Priorités musculaires: ${prio.join(', ') || 'aucune'}.`,
    ctx.nutrition ? `Cibles: ${ctx.nutrition.targetKcal} kcal, ${ctx.nutrition.protein} g protéines. Consommé aujourd'hui: ${Math.round(eaten.kcal)} kcal, ${Math.round(eaten.protein)} g P.` : '',
    `Séance du jour: ${describeWorkoutToday(ctx).replace(/\*\*/g, '')}`,
    ctx.recoveryToday ? `Check-in: énergie ${ctx.recoveryToday.energy}/5, sommeil ${ctx.recoveryToday.sleep}/5, courbatures ${ctx.recoveryToday.soreness}/5.` : '',
    `Régime: ${u.nutrition.diet}, allergies: ${u.nutrition.allergies.join(', ') || 'aucune'}, n'aime pas: ${u.nutrition.dislikedFoods.map((f) => getFood(f).name).join(', ') || 'rien'}.`,
    `Exercices connus: ${EXERCISES.length}.`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Fournisseur optionnel : LLM local via Ollama (gratuit, tourne sur ton ordinateur).
 * En cas d'erreur réseau, retombe sur le coach local.
 */
export function ollamaProvider(url: string, model: string): CoachProvider {
  return {
    id: 'ollama',
    async answer(question, ctx) {
      const safety = assessText(question);
      if (safety.level !== 'none') return answerLocally(question, ctx);
      try {
        const res = await fetch(`${url.replace(/\/$/, '')}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            stream: false,
            messages: [
              {
                role: 'system',
                content:
                  'Tu es un coach sportif et nutritionnel francophone, prudent et basé sur les preuves (ACSM, OMS, méta-analyses). ' +
                  'Réponds de façon concise et concrète en utilisant les données ci-dessous. Ne pose jamais de diagnostic médical ; ' +
                  'en cas de douleur ou symptôme inquiétant, recommande d’arrêter et de consulter.\n\n' +
                  contextSummary(ctx),
              },
              { role: 'user', content: question },
            ],
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { message?: { content?: string } };
        const text = data.message?.content?.trim();
        if (!text) throw new Error('réponse vide');
        return { intent: 'llm', severity: 'info', text };
      } catch {
        const local = answerLocally(question, ctx);
        return { ...local, text: `${local.text}\n\n_(Ollama injoignable — réponse du coach local.)_` };
      }
    },
  };
}

export type { SafetyLevel };
