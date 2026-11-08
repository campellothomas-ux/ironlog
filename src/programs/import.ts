import {validateGuidance} from './guidance';
import {parseDate} from '../planning/dates';
type Obj=Record<string,unknown>;
export interface Preparation {[key:string]:unknown;name:string;type:'mobility'|'activation'|'cardio'|'specific';sets:number;reps?:number;durationSeconds?:number;rest?:number;kg?:number;note?:string;equipment?:string}
export interface SetPrescription {[key:string]:unknown;kg:number;reps:number;rest:number;done:boolean}
export interface Exercise {[key:string]:unknown;id:string;name:string;primary:string[];secondary:string[];tip:string;sets:SetPrescription[]}
export interface Session {[key:string]:unknown;id:string;logicalKey:string;name:string;day:string;warmupExercises:Preparation[];exercises:Exercise[];cooldownExercises:Preparation[]}
export interface Program {[key:string]:unknown;id:string;name:string;description:string;startDate?:string;weeks:({[key:string]:unknown;sessions:Session[]})[]}
const obj=(x:unknown,p:string):Obj=>{if(!x||typeof x!=='object'||Array.isArray(x))throw Error(`${p} : objet attendu.`);return x as Obj;};
const arr=(x:unknown,p:string):unknown[]=>{if(!Array.isArray(x))throw Error(`${p} : liste attendue.`);return x;};
const text=(x:unknown,p:string):string=>{if(typeof x!=='string'||!x.trim()||x.length>500)throw Error(`${p} : texte requis (500 caractères maximum).`);return x;};
const optionalText=(x:unknown,p:string):string=>{if(typeof x!=='string'||x.length>2000)throw Error(`${p} : texte attendu (2 000 caractères maximum).`);return x;};
const number=(x:unknown,p:string):number=>{const n=typeof x==='string'&&/^\d+(?:\.\d+)?$/.test(x.trim())?Number(x):x;if(typeof n!=='number'||!Number.isFinite(n)||n<0)throw Error(`${p} : nombre positif ou nul attendu.`);return n;};
const reserved=['history','workout','prefs','calendar'];
function clean<T>(value:T):T {if(Array.isArray(value))return value.map(clean) as T;if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!reserved.includes(key)).map(([key,item])=>[key,clean(item)])) as T;return value;}
const extras=(x:Obj,keys:string[]):Obj=>Object.fromEntries(Object.entries(x).filter(([key])=>!keys.includes(key)&&!reserved.includes(key)).map(([key,value])=>[key,clean(value)]));
const optionalNumber=(x:unknown,p:string)=>x===undefined?undefined:number(x,p);
const id=(prefix:string)=>`${prefix}_${globalThis.crypto.randomUUID().replaceAll('-','')}`;
function secure(x:unknown,depth=0):void{if(depth>80)throw Error('Document trop imbriqué.');if(x&&typeof x==='object')for(const [k,v] of Object.entries(x)){if(['__proto__','constructor','prototype','history','workout','prefs','calendar'].includes(k))throw Error(`Propriété interdite dans un programme : ${k}.`);secure(v,depth+1);}}
const days=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
export function validatePreparation(value:unknown,path:string):Preparation {
 const v=obj(value,path);validateGuidance(v);const name=text(v.name??v.exercise??v.label,`${path} / nom`);
 const type=v.type??'specific';if(!['mobility','activation','cardio','specific'].includes(String(type)))throw Error(`${path} / type : valeur inconnue.`);
 if(v.duration!==undefined&&v.durationUnit!=='seconds'&&v.durationUnit!=='minutes')throw Error(`${path} / duration : précise durationUnit (seconds ou minutes).`);
 if(v.duration!==undefined&&v.durationSeconds!==undefined&&number(v.durationSeconds,`${path} / durationSeconds`)!==number(v.duration,`${path} / duration`)*(v.durationUnit==='minutes'?60:1))throw Error(`${path} : durées contradictoires.`);
 const duration=optionalNumber(v.durationSeconds??(v.duration!==undefined?number(v.duration,`${path} / duration`)*(v.durationUnit==='minutes'?60:1):undefined),`${path} / durationSeconds`);
 const reps=optionalNumber(v.reps??v.repetitions,`${path} / reps`),sets=number(v.sets??1,`${path} / sets`);
 if(!Number.isInteger(sets)||sets<1||sets>100)throw Error(`${path} / sets : entier de 1 à 100 requis.`);
 if(duration===undefined&&reps===undefined)throw Error(`${path} : indique durationSeconds et/ou reps.`);
 return {...extras(v,['execution','name','exercise','label','type','sets','reps','repetitions','duration','durationUnit','durationSeconds','rest','kg','note','equipment']),name,type:type as Preparation['type'],sets,...(reps===undefined?{}:{reps}),...(duration===undefined?{}:{durationSeconds:duration}),...(v.rest===undefined?{}:{rest:number(v.rest,`${path} / rest`)}),...(v.kg===undefined?{}:{kg:number(v.kg,`${path} / kg`)}),...(v.note===undefined?{}:{note:optionalText(v.note,`${path} / note`)}),...(v.equipment===undefined?{}:{equipment:optionalText(v.equipment,`${path} / equipment`)})};
}
type Lookup=(name:string)=>{primary:string[];secondary:string[];tip:string};
function exercise(value:unknown,path:string,lookup?:Lookup,legacy=false):Exercise {
 const x=obj(value,path);validateGuidance(x);const name=text(x.name||x.exercise||x.label||(legacy?'Exercice':undefined),`${path} / nom`);
 const set=(value:unknown,index:number):SetPrescription=>{const y=typeof value==='number'?{kg:value}:obj(value,`${path} / série ${index+1}`);const timing={...x,...y};validateGuidance(timing);return {...extras(y,['kg','weight','load','reps','repetitions','rest','restSeconds','done']),kg:number(y.kg??y.weight??y.load??0,`${path} / kg`),reps:number(y.reps??y.repetitions??x.reps??10,`${path} / reps`),rest:number(y.rest??y.restSeconds??x.rest??90,`${path} / rest`),done:false,...Object.fromEntries(['durationSeconds','perSide','sideOrder','transitionSeconds'].filter(k=>timing[k]!==undefined).map(k=>[k,timing[k]]))};};
 let sets:SetPrescription[];if(Array.isArray(x.sets))sets=x.sets.map(set);else{const count=number(x.sets??x.series??3,`${path} / sets`);if(!Number.isInteger(count)||count<1||count>100)throw Error(`${path} / sets : entier de 1 à 100 requis.`);sets=Array.from({length:count},(_,i)=>set(x,i));}
 if(sets.some(s=>s.durationSeconds!==undefined)&&sets.some(s=>!(Number(s.durationSeconds)>0)))throw Error(`${path} : toutes les séries chronométrées doivent avoir une durée positive.`);
 if(!sets.length||sets.length>100)throw Error(`${path} : 1 à 100 séries requises.`);
 const muscles=(v:unknown,p:string)=>v===undefined?[]:arr(v,p).map(x=>text(x,p));
 if(x.tip!==undefined)optionalText(x.tip,`${path} / tip`);if(x.note!==undefined)optionalText(x.note,`${path} / note`);const meta=lookup?.(name);return {...(x.note!==undefined?{note:x.note}:{}),...extras(x,['execution','id','name','exercise','label','primary','secondary','tip','note','sets','series','kg','weight','load','reps','repetitions','rest','restSeconds']),id:id('ex'),name,primary:muscles(x.primary??meta?.primary,`${path} / primary`),secondary:muscles(x.secondary??meta?.secondary,`${path} / secondary`),tip:typeof (x.tip??x.note??meta?.tip)==='string'?String(x.tip??x.note??meta?.tip):'',sets};
}
function session(value:unknown,path:string,lookup?:Lookup,legacy=false):Session {
 const s=obj(value,path),name=text(s.name||s.title||s.label||(legacy?'Séance':undefined),`${path} / nom`);const d=s.day??'Lundi';
 const day=days.find(x=>x.toLocaleLowerCase('fr')===String(d).toLocaleLowerCase('fr'));if(!day)throw Error(`${path} / day : jour invalide.`);
 const warm=arr(s.warmupExercises??[],`${path} / échauffement`).map((v,i)=>validatePreparation(v,`${path} / échauffement ${i+1}`));
 const main=arr(s.exercises??s.mainExercises??[],`${path} / exercices`).map((v,i)=>exercise(v,`${path} / exercice ${i+1}`,lookup,legacy));
 const cool=arr(s.cooldownExercises??[],`${path} / retour au calme`).map((v,i)=>validatePreparation(v,`${path} / retour au calme ${i+1}`));
 if(!warm.length&&!main.length&&!cool.length)throw Error(`${path} : au moins un mouvement est requis.`);
 const logicalKey=s.logicalKey===undefined?`${name.toLocaleLowerCase('fr')}|${day}`:text(s.logicalKey,`${path} / logicalKey`);
 return {...extras(s,['id','logicalKey','name','title','label','day','warmupExercises','exercises','mainExercises','cooldownExercises','prepState','restTimer','execution']),id:id('session'),logicalKey,name,day,warmupExercises:warm,exercises:main,cooldownExercises:cool};
}
function program(value:unknown,path:string,lookup?:Lookup,legacy=false):Program {
 const outer=obj(value,path),x=outer.program!==undefined?obj(outer.program,path):outer;
 const name=text(x.name||x.title||(legacy?'Programme importé':undefined),`${path} / nom`);if(x.description!==undefined)optionalText(x.description,`${path} / description`);for(const key of ['history','workout','prefs','calendar'])if(x[key]!==undefined)throw Error(`${path} : ${key} appartient à une sauvegarde complète.`);let source:unknown[];
 if(Array.isArray(x.weeks)){source=x.weeks;if(!source.length||source.length>52)throw Error(`${path} / weeks : 1 à 52 semaines requises.`);}
 else{const base=x.sessions??x.days??x.workouts;if(!Array.isArray(base))throw Error(`${path} : aucune liste de séances.`);const n=number(x.durationWeeks??x.weekCount??x.weeksCount??8,`${path} / durée`);if(!Number.isInteger(n)||n<1||n>52)throw Error(`${path} / durée : entier de 1 à 52 requis.`);source=Array.from({length:n},()=>({sessions:base}));}
 const weeks=source.map((w,i)=>{const o=obj(w,`${path} / semaine ${i+1}`);const sessions=arr(o.sessions??o.workouts??o.days??[],`${path} / semaine ${i+1}`).map((v,j)=>session(v,`${path} / semaine ${i+1} / séance ${j+1}`,lookup,legacy));const keys=new Set<string>();for(const s of sessions){if(keys.has(s.logicalKey))throw Error(`${path} / semaine ${i+1} : logicalKey dupliquée, indique une clé distincte.`);keys.add(s.logicalKey);}return {...extras(o,['sessions','workouts','days']),sessions};});
 if(weeks.every(w=>!w.sessions.length))throw Error(`${path} : aucune séance.`);
 let startDate:string|undefined;if(x.startDate!==undefined){startDate=text(x.startDate,`${path} / startDate`);try{parseDate(startDate);}catch{throw Error(`${path} / startDate : date locale invalide.`);}}
 return {...extras(x,['id','name','title','description','startDate','weeks','sessions','days','workouts','durationWeeks','weekCount','weeksCount']),id:id('plan'),name,description:typeof x.description==='string'?x.description:'',...(startDate?{startDate}:{}),weeks};
}
export function importPrograms(value:unknown,lookup?:Lookup):Program[] {
 secure(value);const root=obj(value,'Document');
 if(root.app!==undefined||root.data!==undefined)throw Error('Une sauvegarde complète doit être restaurée dans Vous > Plus.');
 if((root.kind!==undefined||root.formatVersion!==undefined)&&(root.kind!=='ironlog-programs'||root.formatVersion!==1))throw Error('Format ou version de programmes non pris en charge.');
 const items=root.programs!==undefined?arr(root.programs,'Programmes'):[root];if(!items.length||items.length>50)throw Error('Entre 1 et 50 programmes sont requis.');
 return items.map((item,i)=>program(item,`Programme ${i+1}`,lookup,root.kind===undefined));
}
export function exportPrograms(programs:Program[]){
 return {kind:'ironlog-programs',formatVersion:1,programs:programs.map(p=>({...extras(p,['id','name','description','startDate','weeks']),name:p.name,description:p.description,...(p.startDate?{startDate:p.startDate}:{}),weeks:p.weeks.map(w=>({...extras(w,['sessions']),sessions:w.sessions.map(s=>({...extras(s,['id','logicalKey','name','day','warmupExercises','exercises','cooldownExercises','prepState','restTimer','execution']),logicalKey:s.logicalKey??`${s.name.toLocaleLowerCase('fr')}|${s.day}`,name:s.name,day:s.day,warmupExercises:clean(s.warmupExercises??[]),exercises:s.exercises.map(e=>({...extras(e,['id','name','primary','secondary','tip','sets','execution']),name:e.name,primary:e.primary,secondary:e.secondary,tip:e.tip,sets:e.sets.map(z=>({...extras(z,['kg','reps','rest','done']),kg:z.kg,reps:z.reps,rest:z.rest}))})),cooldownExercises:clean(s.cooldownExercises??[])}))}))}))};
}
