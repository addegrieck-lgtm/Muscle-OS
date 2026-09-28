import type { CardioBlock, CardioEquipment, CardioWorkout, Feedback, GoalId, Level, RunningExperience, SessionKind } from '../types/models';
import { ENGINE_CONFIG, type EngineConfig } from './config';
import { avg, clamp, round } from '../utils';

/**
 * CardioPlanner
 *  - volume hebdomadaire selon l'objectif, en référence aux 150-300 min/sem. de l'OMS (who-2020) ;
 *  - montée progressive ≤ ~10 %/semaine (nielsen-2014, garber-2011), semaine allégée toutes les 4 semaines ;
 *  - ≈80 % du temps en intensité facile (stoggl-2014) ;
 *  - cardio limité et placé loin des séances de jambes si l'objectif est musculaire (wilson-2012, schumann-2022).
 */

export interface CardioInput {
  goal: GoalId;
  level: Level;
  runningExperience: RunningExperience;
  cardioEquipment: CardioEquipment[];
  strengthWeekdays: number[];
  strengthKinds: SessionKind[];
  week: number;
  deload?: boolean;
  recentFeedback?: Feedback[];
}

export interface CardioPlan {
  weeklyMinutes: number;
  sessions: { weekday: number; workout: CardioWorkout }[];
  notes: string[];
}

const LEVEL_FACTOR: Record<Level, number> = { beginner: 0.8, intermediate: 1, advanced: 1.15 };

/** Minutes hebdomadaires visées pour la semaine `week`. */
export function weeklyCardioMinutes(input: CardioInput, config: EngineConfig = ENGINE_CONFIG): number {
  const target = config.weeklyCardioMinutes[input.goal] * LEVEL_FACTOR[input.level];
  const heavyStrength = input.strengthWeekdays.length >= 5;
  const cappedTarget = heavyStrength && input.goal !== 'cardio' ? Math.min(target, 90) : target;
  const start = cappedTarget * (input.runningExperience === 'none' || input.level === 'beginner' ? 0.6 : 0.8);

  // Si le cardio récent a été jugé trop dur, on « gèle » la progression d'une semaine.
  const fb = input.recentFeedback ?? [];
  const tooHard = fb.length >= 2 && avg(fb.map((f) => (f === 'very_hard' ? 3 : f === 'hard' ? 2 : f === 'ok' ? 1 : 0))) >= 2;
  const effectiveWeek = Math.max(1, input.week - (tooHard ? 1 : 0));

  let minutes = start;
  for (let w = 2; w <= effectiveWeek; w++) {
    if (w % config.cardioDeloadEveryWeeks === 0) continue; // pas de progression les semaines allégées
    minutes = Math.min(cappedTarget, minutes * (1 + config.maxWeeklyCardioIncrease));
  }
  if (effectiveWeek % config.cardioDeloadEveryWeeks === 0) minutes *= 0.8;
  if (input.deload) minutes *= 0.7;
  return round(minutes, 5);
}

type Modality = CardioWorkout['modality'];

export function pickModalities(eq: CardioEquipment[]): { run?: Modality; bike?: Modality; rope?: Modality; fallback: Modality } {
  return {
    run: eq.includes('outdoor_run') ? 'outdoor_run' : eq.includes('treadmill') ? 'treadmill' : undefined,
    bike: eq.includes('bike') ? 'bike' : undefined,
    rope: eq.includes('jump_rope') ? 'jump_rope' : undefined,
    fallback: 'walk',
  };
}

/** Programme course/marche progressif pour débutant complet. */
export function runWalkBlocks(week: number): CardioBlock[] {
  const table: [number, number, number][] = [
    [8, 1, 1.5],
    [6, 2, 1.5],
    [5, 3, 1.5],
    [5, 2, 1.5], // semaine allégée
    [4, 5, 1.5],
    [3, 8, 2],
    [2, 12, 2],
  ];
  const warm: CardioBlock = { label: 'Échauffement marche', minutes: 5, intensity: 'very_easy' };
  const cool: CardioBlock = { label: 'Retour au calme', minutes: 3, intensity: 'very_easy' };
  if (week > table.length) {
    return [warm, { label: 'Course continue facile', minutes: clamp(18 + (week - 8) * 2, 18, 35), intensity: 'easy' }, cool];
  }
  const [rep, run, walk] = table[week - 1];
  return [
    warm,
    { label: `Course facile ${run} min`, minutes: run, intensity: 'easy', repeat: rep },
    { label: `Marche ${walk} min`, minutes: walk, intensity: 'very_easy', repeat: rep },
    cool,
  ];
}

const total = (blocks: CardioBlock[]) => round(blocks.reduce((a, b) => a + b.minutes * (b.repeat ?? 1), 0), 1);

const LABEL_MOD: Record<Modality, string> = {
  outdoor_run: 'course',
  treadmill: 'tapis',
  bike: 'vélo',
  jump_rope: 'corde à sauter',
  none: 'marche',
  other: 'cardio',
  walk: 'marche',
  bodyweight: 'poids du corps',
};

export function buildCardioWorkout(
  type: CardioWorkout['type'],
  minutes: number,
  modality: Modality,
  ctx: { week: number; beginnerRunner: boolean; level: Level },
): CardioWorkout {
  const m = Math.max(10, Math.round(minutes));
  let blocks: CardioBlock[];
  let description: string;
  let title: string;
  let hard = false;
  const isRun = modality === 'outdoor_run' || modality === 'treadmill';

  switch (type) {
    case 'intervals': {
      hard = true;
      const work = ctx.level === 'beginner' ? 0.5 : 1;
      const rec = ctx.level === 'beginner' ? 1.5 : 1.5;
      const reps = clamp(Math.floor((m - 13) / (work + rec)), 4, 10);
      blocks = [
        { label: 'Échauffement progressif', minutes: 8, intensity: 'easy' },
        { label: `Effort ${work === 1 ? '1 min' : '30 s'} soutenu (RPE 7-8)`, minutes: work, intensity: 'hard', repeat: reps },
        { label: `Récupération ${rec} min très facile`, minutes: rec, intensity: 'very_easy', repeat: reps },
        { label: 'Retour au calme', minutes: 5, intensity: 'very_easy' },
      ];
      title = `Intervalles ${LABEL_MOD[modality]}`;
      description = 'Efforts courts et soutenus : tu peux dire quelques mots, pas une phrase. Récupère vraiment entre les efforts.';
      break;
    }
    case 'tempo': {
      hard = true;
      const tempoMin = clamp(Math.round(m * 0.4), 8, 25);
      blocks = [
        { label: 'Échauffement facile', minutes: 10, intensity: 'easy' },
        { label: 'Allure « confortablement difficile » (RPE 6-7)', minutes: tempoMin, intensity: 'moderate' },
        { label: 'Retour au calme', minutes: Math.max(5, m - 10 - tempoMin), intensity: 'easy' },
      ];
      title = `Tempo ${LABEL_MOD[modality]}`;
      description = 'Allure soutenue mais contrôlée : phrases courtes possibles. Idéal pour relever ton seuil.';
      break;
    }
    case 'long_run': {
      blocks = [{ label: 'Course longue très facile', minutes: m, intensity: 'easy' }];
      title = 'Sortie longue';
      description = 'Allure conversationnelle du début à la fin. Marche quelques minutes si besoin : c’est la durée qui compte.';
      break;
    }
    case 'easy_run': {
      if (ctx.beginnerRunner) {
        blocks = runWalkBlocks(ctx.week);
        title = 'Course / marche progressive';
        description = 'Alternance course facile et marche. Tu dois pouvoir parler en courant.';
      } else {
        blocks = [{ label: 'Course facile (test de la parole)', minutes: m, intensity: 'easy' }];
        title = 'Footing facile';
        description = 'Tu dois pouvoir tenir une conversation. Si tu es essoufflé, ralentis ou marche.';
      }
      break;
    }
    case 'conditioning': {
      hard = ctx.level !== 'beginner';
      const rounds = clamp(Math.round((m - 8) / 4), 3, 8);
      const moveLabel = modality === 'jump_rope' ? 'Corde à sauter 40 s / repos 20 s' : 'Jumping jacks, montées de genoux, squats — 40 s / 20 s';
      blocks = [
        { label: 'Échauffement articulaire', minutes: 5, intensity: 'easy' },
        { label: moveLabel, minutes: 3, intensity: 'moderate', repeat: rounds },
        { label: 'Pause', minutes: 1, intensity: 'very_easy', repeat: rounds },
        { label: 'Retour au calme', minutes: 3, intensity: 'very_easy' },
      ];
      title = modality === 'jump_rope' ? 'Coordination corde à sauter' : 'Conditionnement poids du corps';
      description = 'Travail de coordination et de conditionnement. Garde une technique propre, réception souple.';
      break;
    }
    case 'walk': {
      blocks = [{ label: 'Marche active (légèrement essoufflé)', minutes: m, intensity: 'moderate' }];
      title = 'Marche active';
      description = 'Marche d’un bon pas : tu peux parler mais pas chanter. Excellent pour la santé et la récupération.';
      break;
    }
    default: {
      blocks = [{ label: `Endurance ${LABEL_MOD[modality]} facile`, minutes: m, intensity: 'easy' }];
      title = `Endurance ${LABEL_MOD[modality]}`;
      description = 'Intensité facile et régulière (zone 2) : respiration aisée, conversation possible.';
    }
  }
  if (!isRun && (type === 'easy_run' || type === 'long_run')) {
    // pas de course disponible : on convertit en endurance sur la modalité disponible
    return buildCardioWorkout('endurance', m, modality, ctx);
  }
  return {
    id: `c-${type}-${m}-${modality}`,
    type,
    title,
    modality,
    totalMinutes: total(blocks),
    blocks,
    description,
    hard,
  };
}

/** Quels types de séances pour cet objectif ? (au plus 1 séance difficile pour les débutants). */
export function chooseCardioTypes(input: CardioInput, count: number): CardioWorkout['type'][] {
  const mod = pickModalities(input.cardioEquipment);
  const canRun = !!mod.run;
  const hardAllowed = input.deload ? 0 : input.level === 'beginner' ? (input.week >= 3 ? 1 : 0) : input.goal === 'cardio' ? 2 : 1;
  const musclefocused = input.goal === 'muscle_gain' || input.goal === 'strength';
  const types: CardioWorkout['type'][] = [];

  const easyType = (): CardioWorkout['type'] => (canRun && !musclefocused ? 'easy_run' : mod.bike ? 'endurance' : canRun ? 'easy_run' : 'walk');

  if (input.goal === 'cardio') {
    types.push(easyType());
    if (count >= 2) types.push(hardAllowed >= 1 ? (input.week % 2 === 0 ? 'tempo' : 'intervals') : easyType());
    if (count >= 3) types.push(canRun ? 'long_run' : 'endurance');
    if (count >= 4) types.push(hardAllowed >= 2 ? 'intervals' : easyType());
  } else if (input.goal === 'fat_loss' || input.goal === 'general' || input.goal === 'recomp') {
    types.push(easyType());
    if (count >= 2) types.push(hardAllowed >= 1 ? (mod.rope ? 'conditioning' : 'intervals') : 'walk');
    if (count >= 3) types.push('walk');
    if (count >= 4) types.push(easyType());
  } else {
    types.push(mod.bike ? 'endurance' : 'walk');
    if (count >= 2) types.push(hardAllowed >= 1 && input.goal !== 'strength' ? (mod.rope ? 'conditioning' : 'intervals') : 'walk');
  }
  return types.slice(0, count);
}

const isLegDay = (k: SessionKind) => k === 'lower' || k === 'legs' || k === 'full';

export function planCardio(input: CardioInput, config: EngineConfig = ENGINE_CONFIG): CardioPlan {
  const notes: string[] = [];
  const minutes = weeklyCardioMinutes(input, config);
  const count = minutes <= 45 ? 1 : minutes <= 100 ? 2 : minutes <= 170 ? 3 : 4;
  const types = chooseCardioTypes(input, count);
  const mod = pickModalities(input.cardioEquipment);
  const beginnerRunner = input.runningExperience === 'none';

  const kindByDay = new Map<number, SessionKind>();
  input.strengthWeekdays.forEach((d, i) => kindByDay.set(d, input.strengthKinds[i]));

  // Répartition des minutes : séances difficiles plus courtes, sortie longue plus longue.
  const weights = types.map((t) => (t === 'long_run' ? 1.5 : t === 'intervals' || t === 'conditioning' ? 0.8 : t === 'tempo' ? 0.9 : 1));
  const wSum = weights.reduce((a, b) => a + b, 0);

  const freeDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !kindByDay.has(d));
  const taken = new Set<number>();
  const sessions: CardioPlan['sessions'] = [];

  // placer d'abord les séances difficiles (contraintes plus fortes)
  const order = types.map((_, i) => i).sort((a, b) => Number(isHard(types[b])) - Number(isHard(types[a])));
  for (const i of order) {
    const t = types[i];
    const hard = isHard(t);
    const ok = (d: number) => {
      if (taken.has(d)) return false;
      if (!hard) return true;
      // pas de séance difficile la veille/le jour/le lendemain d'une séance jambes
      const prev = kindByDay.get((d + 6) % 7);
      const next = kindByDay.get((d + 1) % 7);
      const same = kindByDay.get(d);
      return !(same && isLegDay(same)) && !(next && isLegDay(next)) && !(prev && isLegDay(prev) && input.goal !== 'cardio');
    };
    let day = freeDays.find(ok);
    if (day === undefined) day = [...freeDays, ...[0, 1, 2, 3, 4, 5, 6].filter((d) => kindByDay.has(d) && !isLegDay(kindByDay.get(d)!))].find(ok);
    if (day === undefined) day = [0, 1, 2, 3, 4, 5, 6].find((d) => !taken.has(d) && !hard);
    if (day === undefined) {
      // impossible de placer une séance difficile proprement → séance facile
      types[i] = 'walk';
      day = [0, 1, 2, 3, 4, 5, 6].find((d) => !taken.has(d)) ?? 6;
      notes.push('Séance intense remplacée par une séance facile pour protéger la récupération des jambes.');
    }
    taken.add(day);
    const modality: Modality =
      types[i] === 'walk'
        ? 'walk'
        : types[i] === 'conditioning'
          ? (mod.rope ?? 'bodyweight')
          : types[i] === 'endurance'
            ? (mod.bike ?? mod.run ?? 'walk')
            : (mod.run ?? mod.bike ?? mod.rope ?? 'walk');
    const workout = buildCardioWorkout(types[i], (minutes * weights[i]) / wSum, modality, {
      week: input.week,
      beginnerRunner,
      level: input.level,
    });
    sessions.push({ weekday: day, workout });
  }

  if (input.goal === 'muscle_gain' || input.goal === 'strength') {
    notes.push('Cardio modéré et plutôt à vélo/marche : bénéfique pour la santé sans freiner la prise de muscle.');
  }
  if (input.deload) notes.push('Semaine de décharge : cardio réduit et sans séance intense.');
  sessions.sort((a, b) => a.weekday - b.weekday);
  return { weeklyMinutes: sessions.reduce((a, s) => a + s.workout.totalMinutes, 0), sessions, notes };
}

function isHard(t: CardioWorkout['type']) {
  return t === 'intervals' || t === 'tempo' || t === 'conditioning';
}
