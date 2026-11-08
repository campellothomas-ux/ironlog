/** Absolute-deadline execution; elapsed steps are timing evidence, not physical confirmation. */
export type Side='left'|'right';
export interface TimedSet {durationSeconds:number;rest:number;perSide?:boolean;sideOrder?:Side[];transitionSeconds?:number}
export interface Step {set:number;phase:'work'|'side-transition'|'rest';side:Side|null;seconds:number}
export interface ExerciseTimer {exerciseId:string;steps:Step[];index:number;deadline:number|null;remainingMs:number;status:'active'|'paused'|'completed'|'interrupted';history:{index:number;outcome:'elapsed'|'skipped';at:number}[]}
export function createExerciseTimer(exerciseId:string,sets:TimedSet[],now:number):ExerciseTimer {
 if(!exerciseId||!sets.length||sets.length>100||!Number.isFinite(now)||now<0)throw Error('Prescription chronométrée invalide');
 const steps:Step[]=[];
 sets.forEach((s,set)=>{if(!Number.isFinite(s.durationSeconds)||s.durationSeconds<=0||!Number.isFinite(s.rest)||s.rest<0)throw Error('Durée invalide');const order=s.sideOrder??['left','right'];if(order.length!==2||new Set(order).size!==2||order.some(x=>x!=='left'&&x!=='right'))throw Error('Ordre des côtés invalide');const transition=s.transitionSeconds??5;if(!Number.isFinite(transition)||transition<0)throw Error('Transition invalide');
 if(s.perSide){steps.push({set,phase:'work',side:order[0],seconds:s.durationSeconds});if(transition>0)steps.push({set,phase:'side-transition',side:null,seconds:transition});steps.push({set,phase:'work',side:order[1],seconds:s.durationSeconds});}else steps.push({set,phase:'work',side:null,seconds:s.durationSeconds});
 if(set<sets.length-1&&s.rest>0)steps.push({set,phase:'rest',side:null,seconds:s.rest});});
 return {exerciseId,steps,index:0,deadline:now+steps[0].seconds*1000,remainingMs:steps[0].seconds*1000,status:'active',history:[]};
}
export function reconcileExerciseTimer(input:ExerciseTimer,now:number):ExerciseTimer {
 const t=structuredClone(input);if(t.status!=='active'||t.deadline===null)return t;
 while(t.index<t.steps.length&&now>=(t.deadline??Infinity)){const at:number=t.deadline!;t.history.push({index:t.index,outcome:'elapsed',at});t.index++;if(t.index===t.steps.length){t.status='completed';t.deadline=null;t.remainingMs=0;return t;}t.deadline=at+t.steps[t.index].seconds*1000;}
 t.remainingMs=Math.max(0,(t.deadline??now)-now);return t;
}
export function controlExerciseTimer(input:ExerciseTimer,action:'pause'|'resume'|'restart-set'|'skip'|'stop',now:number):ExerciseTimer {
 const t=reconcileExerciseTimer(input,now);
 if(action==='restart-set'){const set=t.steps[Math.min(t.index,t.steps.length-1)].set;t.index=t.steps.findIndex(x=>x.set===set);t.history=t.history.filter(h=>h.index<t.index);t.remainingMs=t.steps[t.index].seconds*1000;t.deadline=now+t.remainingMs;t.status='active';return t;}
 if(action==='stop'&&t.status!=='completed'){t.status='interrupted';t.deadline=null;return t;}
 if(action==='pause'&&t.status==='active'){t.status='paused';t.deadline=null;}
 if(action==='resume'&&t.status==='paused'){t.status='active';t.deadline=now+t.remainingMs;}
 if(action==='skip'&&(t.status==='active'||t.status==='paused')){t.history.push({index:t.index,outcome:'skipped',at:now});t.index++;if(t.index===t.steps.length){t.status='completed';t.remainingMs=0;t.deadline=null;}else {t.remainingMs=t.steps[t.index].seconds*1000;t.deadline=t.status==='active'?now+t.remainingMs:null;}}
 return t;
}
export function validateExerciseTimer(value:unknown):asserts value is ExerciseTimer {
 const fail=()=>{throw Error('Chronométrage d’exercice invalide');};
 if(!value||typeof value!=='object')return fail();const t=value as ExerciseTimer;
 if(typeof t.exerciseId!=='string'||!t.exerciseId||!Array.isArray(t.steps)||!t.steps.length||t.steps.length>400||!Array.isArray(t.history))return fail();
 const finite=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
 for(const s of t.steps)if(!s||!Number.isInteger(s.set)||s.set<0||!['work','side-transition','rest'].includes(s.phase)||![null,'left','right'].includes(s.side)||!finite(s.seconds)||s.seconds<=0)return fail();
 if(!Number.isInteger(t.index)||t.index<0||t.index>t.steps.length||!['active','paused','completed','interrupted'].includes(t.status)||!finite(t.remainingMs))return fail();
 if(t.status==='active'?(!finite(t.deadline)||t.index===t.steps.length):t.deadline!==null)return fail();
 if((t.status==='completed')!==(t.index===t.steps.length)||t.history.length!==t.index)return fail();
 t.history.forEach((h,i)=>{if(!h||h.index!==i||!['elapsed','skipped'].includes(h.outcome)||!finite(h.at))fail();});
}
