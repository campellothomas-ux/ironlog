import { persist, type StorageWriter } from '../storage';

interface Workout {
  id: string;
  startedAt: number;
  exIndex?: number;
  focusSet?: number | null;
  mode?: string;
  [key: string]: unknown;
}
interface Activity extends Workout {
  finishedAt: number;
  duration: number;
}
interface State {
  workout: Workout | null;
  history: Activity[];
  [key: string]: unknown;
}

// Un seul setItem remplace atomiquement séance active + historique.
// L'appelant ne remplace son état mémoire qu'après une écriture réussie.
export function completeWorkout<T extends State>(state: T, storage: StorageWriter, now = Date.now()) {
  const workout = state.workout;
  if (!workout) return { state, activity: null };
  // L'id V4 identifie le modèle, pas une occurrence de séance.
  const id = `activity_${workout.id}_${workout.startedAt}`;
  const existing = state.history.find(activity => activity.id === id);
  const activity: Activity = existing ?? {
    ...JSON.parse(JSON.stringify(workout)), id,
    finishedAt: now,
    duration: Math.max(1, Math.round((now - workout.startedAt) / 1000)),
  };
  delete activity.exIndex;
  delete activity.focusSet;
  delete activity.mode;
  const next = { ...state, history: existing ? state.history : [...state.history, activity], workout: null, youTab: 'activities' };
  persist(storage, next);
  return { state: next as T, activity };
}
