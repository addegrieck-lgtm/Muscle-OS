import type { Equipment, MuscleGroupId, PriorityLevel, User } from '../src/types/models';
import { defaultPriorities } from '../src/data/reference';

export function makeUser(overrides: Partial<User> = {}, prios: Partial<Record<MuscleGroupId, PriorityLevel>> = {}): User {
  return {
    id: 'u1',
    name: 'Test',
    createdAt: '2026-01-01T00:00:00.000Z',
    startDate: '2026-01-05',
    age: 30,
    sex: 'male',
    heightCm: 178,
    weightKg: 75,
    level: 'beginner',
    runningExperience: 'none',
    activityLevel: 'light',
    goal: 'muscle_gain',
    daysPerWeek: 3,
    sessionMinutes: 45,
    equipment: ['bodyweight'] as Equipment[],
    cardioEquipment: ['outdoor_run'],
    musclePriorities: { ...defaultPriorities(), ...prios },
    nutrition: {
      mealsPerDay: 4,
      diet: 'omnivore',
      likedFoods: [],
      dislikedFoods: [],
      allergies: [],
      budget: 'medium',
      cookingTime: 'moderate',
    },
    ...overrides,
  };
}
