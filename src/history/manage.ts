/** Destructive activity operations are pure; callers must persist before publishing state. */
export interface ActivityRecord {
  id: string;
  name: string;
  finishedAt: number;
  duration: number;
  exercises: Array<{
    id: string;
    name: string;
    trainingNote?: string;
    sets: Array<{kg:number;reps:number;rest:number;done:boolean;durationSeconds?:number}>;
    [key:string]:unknown;
  }>;
  [key:string]:unknown;
}
export interface HistoryState {
  history: ActivityRecord[];
  [key:string]:unknown;
}
export function removeActivity<T extends HistoryState>(state:T, activityId:string):T {
  if(!state.history.some(item=>item.id===activityId))throw Error('Séance introuvable.');
  return {...state,history:state.history.filter(item=>item.id!==activityId)};
}
export function updateActivity<T extends HistoryState>(state:T, activityId:string, edited:ActivityRecord):T {
  const source=state.history.find(item=>item.id===activityId);
  if(!source)throw Error('Séance introuvable.');
  if(edited.id!==source.id)throw Error('Identifiant de séance protégé.');
  if(!edited.name.trim()||edited.name.length>500)throw Error('Nom de séance invalide.');
  if(!Number.isFinite(edited.finishedAt)||edited.finishedAt<0)throw Error('Date de séance invalide.');
  if(!Number.isFinite(edited.duration)||edited.duration<1)throw Error('Durée de séance invalide.');
  if(!Array.isArray(edited.exercises)||edited.exercises.length<1)throw Error('Conserve au moins un exercice.');
  for(const exercise of edited.exercises){
    if(!exercise.name.trim())throw Error('Nom d’exercice manquant.');
    if(typeof exercise.trainingNote==='string'&&exercise.trainingNote.length>2000)throw Error('Note limitée à 2 000 caractères.');
    if(!Array.isArray(exercise.sets)||!exercise.sets.length)throw Error('Conserve au moins une série par exercice.');
    for(const set of exercise.sets){
      for(const field of ['kg','reps','rest'] as const){
        if(!Number.isFinite(set[field])||set[field]<0)throw Error('Série : charge, répétitions et repos invalides.');
      }
      if(typeof set.done!=='boolean')throw Error('Série : statut invalide.');
    }
  }
  return {...state,history:state.history.map(item=>item.id===activityId?edited:item)};
}
