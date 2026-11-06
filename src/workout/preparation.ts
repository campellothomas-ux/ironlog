import type {Preparation} from '../programs/import';
export type PrepPhase='warmup'|'main'|'cooldown'|'complete';
export interface Progress {donePasses:number;skipped:boolean}
export interface PrepState {phase:PrepPhase;index:number;warmup:Progress[];cooldown:Progress[];timerUntil:number|null}
export function initialPreparation(warmup:Preparation[],mainCount:number,cooldown:Preparation[]):PrepState {
 return {phase:warmup.length?'warmup':mainCount?'main':cooldown.length?'cooldown':'complete',index:0,warmup:warmup.map(()=>({donePasses:0,skipped:false})),cooldown:cooldown.map(()=>({donePasses:0,skipped:false})),timerUntil:null};
}
export function advancePreparation(state:PrepState,items:Preparation[],mainCount:number,hasCooldown:boolean,skip=false):PrepState {
 if(state.phase!=='warmup'&&state.phase!=='cooldown')return state;
 const phase=state.phase,index=state.index,current=items[index];if(!current)return state;
 const progress=state[phase].map((x,i)=>i===index?{donePasses:skip?x.donePasses:Math.min(current.sets,x.donePasses+1),skipped:skip}:x);
 const next={...state,[phase]:progress,timerUntil:null};
 if(!skip&&progress[index].donePasses<current.sets)return next;
 if(index+1<items.length)return {...next,index:index+1};
 return {...next,index:0,phase:phase==='warmup'?(mainCount?'main':hasCooldown?'cooldown':'complete'):'complete'};
}
export function remainingPreparationSeconds(until:number|null,now=Date.now()):number {return until===null?0:Math.max(0,Math.ceil((until-now)/1000));}
