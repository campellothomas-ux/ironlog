/** A deletion changes the program catalogue, never completed activities. */
export interface RemovableProgram {
  id: string;
  name: string;
  weeks: {sessions: {id: string}[]}[];
}
export interface RemovableState {
  programs: RemovableProgram[];
  activePlanId: string;
  week: number;
  homeSessionId: string | null;
  calendar?: Record<string, unknown>;
  workout?: {programId?: string} | null;
  progPlanId?: string | null;
  progView?: string;
}
export function removeProgram<T extends RemovableState>(state: T, programId: string): T {
  if (!state.programs.some(program => program.id === programId)) {
    throw Error('Programme introuvable.');
  }
  if (state.programs.length <= 1) {
    throw Error('Conserve au moins un programme. Crée ou importe un autre programme avant de supprimer celui-ci.');
  }
  if (state.workout && (state.workout.programId === programId ||
      (state.activePlanId === programId && !state.workout.programId))) {
    throw Error('Une séance de ce programme est en cours. Termine-la avant de supprimer ce programme.');
  }
  const remaining = state.programs.filter(program => program.id !== programId);
  const removingActive = state.activePlanId === programId;
  const replacement = remaining[0];
  const calendar = state.calendar === undefined ? undefined
    : Object.fromEntries(Object.entries(state.calendar).filter(([id]) => id !== programId));
  return {
    ...state,
    programs: remaining,
    ...(calendar === undefined ? {} : {calendar}),
    ...(removingActive ? {
      activePlanId: replacement.id,
      week: 1,
      homeSessionId: replacement.weeks[0]?.sessions[0]?.id ?? null,
    } : {}),
    ...(state.progPlanId === programId ? {progPlanId: null, progView: 'landing'} : {}),
  } as T;
}
