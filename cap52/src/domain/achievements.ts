import { weekStreaks, type ChallengeProgress } from './progress';

/** Badges dérivés des données : rien n'est stocké, donc rien ne peut se désynchroniser. */
export type AchievementId = 'first_week' | 'five_weeks' | 'halfway' | 'streak_4' | 'goal_reached';

export interface Achievement {
  id: AchievementId;
  unlocked: boolean;
}

/** Les badges valorisent la régularité et la progression, jamais un montant élevé. */
export function computeAchievements(progress: ChallengeProgress): Achievement[] {
  const { best } = weekStreaks(progress.weeks, progress.currentWeek);
  return [
    { id: 'first_week', unlocked: progress.completedWeeks >= 1 },
    { id: 'five_weeks', unlocked: progress.completedWeeks >= 5 },
    { id: 'halfway', unlocked: progress.progressBp >= 5_000 },
    { id: 'streak_4', unlocked: best >= 4 },
    { id: 'goal_reached', unlocked: progress.isGoalReached },
  ];
}
