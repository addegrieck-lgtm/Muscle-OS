import type { ExerciseLog, ExerciseProgress, Feedback, Level, RecoveryEntry, WorkoutSession } from '../types/models';
import { exerciseById, getExercise } from '../data/exercises';
import { ENGINE_CONFIG, type EngineConfig } from './config';
import { avg, daysBetween, round } from '../utils';

/**
 * ProgressionEngine
 * Surcharge progressive prudente (acsm-2009, kotarsky-2018) :
 *  - une seule variable modifiée à la fois (répétitions OU charge OU variante OU tempo) ;
 *  - double progression : on atteint le haut de la fourchette avant d'augmenter la charge ;
 *  - augmentation de charge limitée (≈5 %, arrondie) ;
 *  - passage à une variante plus difficile quand le plafond de répétitions est atteint ;
 *  - baisse / régression après 2 échecs consécutifs ;
 *  - décharge programmée ou déclenchée par la fatigue (bell-2023).
 */

export type ProgressionChange = 'reps' | 'load' | 'variant' | 'tempo' | 'hold' | 'reduce' | 'regress';

export interface ProgressionResult {
  progress: ExerciseProgress;
  change: ProgressionChange;
  message: string;
}

export function initialProgress(log: ExerciseLog): ExerciseProgress {
  return {
    exerciseId: log.exerciseId,
    baseExerciseId: log.exerciseId,
    repMin: log.planned.repMin,
    repMax: log.planned.repMax,
    sets: log.planned.sets,
    load: log.planned.load,
    tempo: log.planned.tempo,
    topStreak: 0,
    failStreak: 0,
  };
}

const feedbackOk = (f?: Feedback) => f === 'easy' || f === 'ok' || f === undefined;

export function nextLoad(current: number, config: EngineConfig = ENGINE_CONFIG): number {
  const inc = Math.max(config.minLoadIncrementKg, current * config.loadIncrementPct);
  return round(current + inc, 0.5);
}

export function evaluateExercise(
  log: ExerciseLog,
  prev: ExerciseProgress | undefined,
  date: string,
  config: EngineConfig = ENGINE_CONFIG,
): ProgressionResult {
  const ex = getExercise(log.exerciseId);
  const p: ExerciseProgress = prev && prev.exerciseId === log.exerciseId ? { ...prev } : initialProgress(log);
  p.updatedAt = date;
  p.lastFeedback = log.feedback;
  const done = log.sets.filter((s) => s.done);
  const reps = done.map((s) => s.reps);
  const loadUsed = done.find((s) => s.load != null)?.load ?? log.planned.load;
  if (loadUsed != null) p.load = loadUsed;

  const cap = ex.mode === 'time' ? config.timeCapSeconds : config.repCapBodyweight;
  const step = ex.mode === 'time' ? 5 : ex.loadable ? 1 : 2;
  const unit = ex.mode === 'time' ? 's' : 'répétitions';

  if (log.pain) {
    p.failStreak = 0;
    p.topStreak = 0;
    const reg = ex.regression ? exerciseById(ex.regression) : undefined;
    if (reg) {
      p.exerciseId = reg.id;
      p.repMin = reg.defaultRange[0];
      p.repMax = reg.defaultRange[1];
      p.load = undefined;
      p.tempo = undefined;
      p.lastMessage = `Douleur signalée : passage à « ${reg.name} ». Si la douleur persiste, demande un avis médical.`;
      return { progress: p, change: 'regress', message: p.lastMessage };
    }
    p.lastMessage = 'Douleur signalée : ne force pas sur cet exercice. Si la douleur persiste, demande un avis médical.';
    return { progress: p, change: 'hold', message: p.lastMessage };
  }

  if (!reps.length) {
    p.lastMessage = 'Aucune série validée : objectif conservé.';
    return { progress: p, change: 'hold', message: p.lastMessage };
  }

  const allTop = reps.every((r) => r >= p.repMax);
  const belowMin = reps.filter((r) => r < p.repMin).length;
  const failed = log.feedback === 'very_hard' || belowMin >= Math.ceil(reps.length / 2);

  if (failed) {
    p.topStreak = 0;
    p.failStreak += 1;
    if (p.failStreak >= 2) {
      p.failStreak = 0;
      if (p.load != null && p.load > 0 && ex.loadable) {
        p.load = round(p.load * 0.9, 0.5);
        p.lastMessage = `Deux séances difficiles d’affilée : charge réduite à ${p.load} kg pour reconstruire.`;
        return { progress: p, change: 'reduce', message: p.lastMessage };
      }
      const reg = ex.regression ? exerciseById(ex.regression) : undefined;
      if (reg && avg(reps) < p.repMin * 0.7) {
        p.exerciseId = reg.id;
        p.repMin = reg.defaultRange[0];
        p.repMax = reg.defaultRange[1];
        p.tempo = undefined;
        p.lastMessage = `Variante plus accessible : « ${reg.name} ». On reconstruit une base solide.`;
        return { progress: p, change: 'regress', message: p.lastMessage };
      }
      const width = p.repMax - p.repMin;
      p.repMin = Math.max(ex.mode === 'time' ? 10 : 3, p.repMin - step);
      p.repMax = p.repMin + width;
      p.lastMessage = `Objectif ajusté : ${p.repMin}-${p.repMax} ${unit}.`;
      return { progress: p, change: 'reduce', message: p.lastMessage };
    }
    p.lastMessage = 'Séance difficile : même objectif la prochaine fois. Priorité à la technique.';
    return { progress: p, change: 'hold', message: p.lastMessage };
  }

  p.failStreak = 0;

  // Exercice avec charge externe (haltères, kettlebell…) mais aucune charge saisie : impossible de progresser proprement.
  const externalLoad = ex.loadable && ex.equipment.some((e) => e !== 'backpack');
  if (externalLoad && (p.load == null || p.load <= 0)) {
    p.topStreak = 0;
    p.lastMessage = 'Note la charge utilisée (kg) pour que l’app puisse la faire progresser.';
    return { progress: p, change: 'hold', message: p.lastMessage };
  }

  if (allTop && feedbackOk(log.feedback)) {
    p.topStreak += 1;
    // 1) charge externe disponible → augmenter la charge, revenir au bas de la fourchette
    if (ex.loadable && p.load != null && p.load > 0) {
      p.load = nextLoad(p.load, config);
      p.lastMessage = `Haut de fourchette atteint : charge → ${p.load} kg (retour à ${p.repMin} ${unit}).`;
      p.topStreak = 0;
      return { progress: p, change: 'load', message: p.lastMessage };
    }
    // 2) plafond atteint → variante plus difficile
    if (p.repMax >= cap && ex.progression) {
      const next = getExercise(ex.progression);
      p.exerciseId = next.id;
      p.repMin = next.defaultRange[0];
      p.repMax = next.defaultRange[1];
      p.tempo = undefined;
      p.topStreak = 0;
      p.lastMessage = `Bravo ! Nouvelle variante débloquée : « ${next.name} ».`;
      return { progress: p, change: 'variant', message: p.lastMessage };
    }
    // 3) plafond atteint, pas de variante → tempo plus lent
    if (p.repMax >= cap && !p.tempo && ex.mode === 'reps') {
      p.tempo = '3-1-1';
      p.lastMessage = 'Plafond atteint : descente lente en 3 secondes (tempo 3-1-1) pour augmenter la difficulté.';
      return { progress: p, change: 'tempo', message: p.lastMessage };
    }
    // 4) sinon : +répétitions (ou +secondes), sans dépasser le plafond
    if (p.repMax < cap) {
      p.repMin = Math.min(p.repMin + step, cap - step);
      p.repMax = Math.min(p.repMax + step, cap);
      p.lastMessage = `Progression : objectif ${p.repMin}-${p.repMax} ${unit}.`;
      return { progress: p, change: 'reps', message: p.lastMessage };
    }
    p.lastMessage = 'Niveau maximal de cet exercice atteint : maintiens la qualité ou ajoute une charge (sac à dos).';
    return { progress: p, change: 'hold', message: p.lastMessage };
  }

  p.topStreak = 0;
  p.lastMessage =
    log.feedback === 'hard'
      ? 'Bon travail : on garde le même objectif.'
      : `Vise ${p.repMax} ${unit} sur toutes les séries pour progresser.`;
  return { progress: p, change: 'hold', message: p.lastMessage };
}

/** Applique l'évaluation à toutes les entrées d'une séance terminée. */
export function applySession(
  session: WorkoutSession,
  progress: Record<string, ExerciseProgress>,
  config: EngineConfig = ENGINE_CONFIG,
): { progress: Record<string, ExerciseProgress>; results: (ProgressionResult & { exerciseId: string })[] } {
  const next = { ...progress };
  const results: (ProgressionResult & { exerciseId: string })[] = [];
  for (const log of session.exercises) {
    // la clé est l'exercice d'origine du programme pour conserver le lien avec le générateur
    const key = Object.keys(next).find((k) => next[k].exerciseId === log.exerciseId) ?? log.exerciseId;
    const res = evaluateExercise(log, next[key], session.date, config);
    res.progress.baseExerciseId = next[key]?.baseExerciseId ?? log.exerciseId;
    next[key] = res.progress;
    results.push({ ...res, exerciseId: log.exerciseId });
  }
  return { progress: next, results };
}

// ---------- Décharge ----------

export interface DeloadDecision {
  deload: boolean;
  reason?: string;
}

export function shouldDeload(params: {
  week: number;
  level: Level;
  recovery: RecoveryEntry[];
  sessions: WorkoutSession[];
  today: string;
  config?: EngineConfig;
}): DeloadDecision {
  const config = params.config ?? ENGINE_CONFIG;
  const every = config.deloadEveryWeeks[params.level];
  if (params.week > 1 && params.week % every === 0) {
    return { deload: true, reason: `Semaine ${params.week} : décharge programmée (toutes les ${every} semaines).` };
  }
  const recent = params.recovery.filter((r) => {
    const d = daysBetween(r.date, params.today);
    return d >= 0 && d < 7;
  });
  if (recent.length >= 4) {
    const score = avg(recent.map(readinessScore));
    if (score < 45) return { deload: true, reason: 'Fatigue élevée sur plusieurs jours : semaine allégée pour récupérer.' };
  }
  const recentLogs = params.sessions
    .filter((s) => {
      const d = daysBetween(s.date, params.today);
      return d >= 0 && d < 14;
    })
    .flatMap((s) => s.exercises);
  const veryHard = recentLogs.filter((l) => l.feedback === 'very_hard').length;
  if (recentLogs.length >= 8 && veryHard / recentLogs.length > 0.4) {
    return { deload: true, reason: 'Beaucoup d’exercices jugés « très difficiles » : décharge pour relancer la progression.' };
  }
  return { deload: false };
}

/** Score de forme 0-100 à partir du check-in matinal. */
export function readinessScore(r: Pick<RecoveryEntry, 'energy' | 'sleep' | 'soreness' | 'motivation'>): number {
  const n = (v: number) => (v - 1) / 4; // 1..5 → 0..1
  const score = 0.3 * n(r.energy) + 0.3 * n(r.sleep) + 0.25 * (1 - n(r.soreness)) + 0.15 * n(r.motivation);
  return Math.round(score * 100);
}

/** Record personnel « simple » : meilleure série (reps × charge ou reps). */
export function bestSetScore(log: ExerciseLog): number {
  return Math.max(0, ...log.sets.filter((s) => s.done).map((s) => (s.load ? s.reps * (1 + s.load / 30) : s.reps)));
}
