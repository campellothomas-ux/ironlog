/** Configuration commune d'un exercice principal : répétitions OU minuteur. */
export interface EditableSet {
 kg:number;reps:number;rest:number;done:boolean;
 durationSeconds?:number;perSide?:boolean;sideOrder?:('left'|'right')[];transitionSeconds?:number;
 repsBeforeTimer?:number;
 [key:string]:unknown;
}
const valid=(n:number,min:number,max:number,label:string)=>{
 if(!Number.isFinite(n)||!Number.isInteger(n)||n<min||n>max)throw Error(label+' invalide');
 return n;
};
export function setTimedExercise(sets:EditableSet[],durationSeconds:number,perSide:boolean):EditableSet[]{
 valid(durationSeconds,1,3600,'Durée');if(typeof perSide!=='boolean')throw Error('Mode bilatéral invalide');
 if(!sets.length)throw Error('Exercice sans série');
 return sets.map(set=>{
  const prev=set.durationSeconds?set.repsBeforeTimer??set.reps:set.reps;
  return {...set,reps:0,repsBeforeTimer:prev,done:false,durationSeconds,perSide,
   ...(perSide?{sideOrder:set.sideOrder??['left','right'],transitionSeconds:set.transitionSeconds??5}:{})};
 }).map(set=>{
  if(!perSide){delete set.sideOrder;delete set.transitionSeconds;}
  return set;
 });
}
export function setRepetitionExercise(sets:EditableSet[],reps:number):EditableSet[]{
 valid(reps,0,100,'Répétitions');if(!sets.length)throw Error('Exercice sans série');
 return sets.map(set=>{
  const result={...set,reps,done:false};
  delete result.durationSeconds;delete result.perSide;delete result.sideOrder;
  delete result.transitionSeconds;delete result.repsBeforeTimer;
  return result;
 });
}
export function formerRepetitions(set:EditableSet):number {
 return set.repsBeforeTimer??(set.reps>0?set.reps:10);
}
