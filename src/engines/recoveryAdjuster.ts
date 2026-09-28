import type { CardioWorkout, Level, RecoveryEntry, Workout } from '../types/models';
import { readinessScore } from './progressionEngine';
import { buildCardioWorkout } from './cardioPlanner';
import { estimateWorkoutMinutes } from './workoutGenerator';

/**
 * RecoveryAdjuster
 * Ajuste la séance du jour selon le check-in matinal (énergie, sommeil, courbatures, motivation).
 * Sommeil < 7 h récurrent = facteur de moins bonne récupération (watson-2015).
 * Ne pose jamais de diagnostic : en cas de douleur, renvoie vers la prudence / un avis médical.
 */

export type ReadinessBand = 'high' | 'normal' | 'reduced' | 'low';

export interface Adjustment {
  score: number;
  band: ReadinessBand;
  volumeFactor: number;
  extraRir: number;
  replaceHardCardio: boolean;
  message: string;
}

export function readinessBand(score: number): ReadinessBand {
  if (score >= 75) return 'high';
  if (score >= 55) return 'normal';
  if (score >= 38) return 'reduced';
  return 'low';
}

export function computeAdjustment(entry?: RecoveryEntry): Adjustment {
  if (!entry) {
    return { score: -1, band: 'normal', volumeFactor: 1, extraRir: 0, replaceHardCardio: false, message: 'Fais ton check-in pour adapter la séance à ta forme du jour.' };
  }
  const score = readinessScore(entry);
  const band = readinessBand(score);
  if (entry.pain) {
    return {
      score,
      band: 'low',
      volumeFactor: 0.5,
      extraRir: 3,
      replaceHardCardio: true,
      message:
        'Tu signales une douleur : évite les exercices qui la provoquent. Si elle est importante, persistante, ou accompagnée d’autres symptômes, arrête et demande un avis médical.',
    };
  }
  switch (band) {
    case 'high':
      return { score, band, volumeFactor: 1, extraRir: 0, replaceHardCardio: false, message: 'Excellente forme : séance complète. Vise le haut des fourchettes.' };
    case 'normal':
      return { score, band, volumeFactor: 1, extraRir: 0, replaceHardCardio: false, message: 'Forme correcte : séance normale.' };
    case 'reduced':
      return {
        score,
        band,
        volumeFactor: 0.8,
        extraRir: 1,
        replaceHardCardio: true,
        message: 'Récupération moyenne : environ 20 % de séries en moins, garde 1 répétition de marge en plus. Cardio intense remplacé par du facile.',
      };
    default:
      return {
        score,
        band,
        volumeFactor: 0.6,
        extraRir: 2,
        replaceHardCardio: true,
        message:
          entry.sleep <= 2
            ? 'Sommeil insuffisant et fatigue : séance allégée (≈40 % de séries en moins). Une marche ou de la mobilité est aussi un excellent choix.'
            : 'Fatigue importante : séance allégée (≈40 % de séries en moins) ou repos actif. Écoute ton corps.',
      };
  }
}

export function adjustWorkout(w: Workout, adj: Adjustment): Workout {
  if (adj.volumeFactor >= 1 && adj.extraRir === 0) return w;
  const exercises = w.exercises.map((p) => ({
    ...p,
    sets: Math.max(1, Math.round(p.sets * adj.volumeFactor)),
    rir: p.rir + adj.extraRir,
  }));
  return { ...w, exercises, estimatedMinutes: estimateWorkoutMinutes(exercises) };
}

export function adjustCardio(c: CardioWorkout, adj: Adjustment, level: Level): CardioWorkout {
  if (!adj.replaceHardCardio) return c;
  if (c.hard) {
    return buildCardioWorkout(c.modality === 'walk' || c.modality === 'bodyweight' ? 'walk' : 'endurance', Math.max(15, c.totalMinutes * 0.8), c.modality === 'bodyweight' ? 'walk' : c.modality, {
      week: 1,
      beginnerRunner: false,
      level,
    });
  }
  if (adj.band === 'low') return { ...c, totalMinutes: Math.round(c.totalMinutes * 0.7), blocks: c.blocks.map((b) => ({ ...b, minutes: Math.round(b.minutes * 0.7 * 10) / 10 })) };
  return c;
}
