import {validateExerciseTimer} from '../workout/exercise-timer';
import {validateGuidance} from '../programs/guidance';
import { parseDate } from '../planning/dates';
import { persist, type StorageWriter } from '../storage';
import { validatePreparation } from '../programs/import';
import { restoreTimer } from '../workout/rest-timer';

type RecordValue = Record<string, unknown>;
export interface Backup { app: 'IronLog'; formatVersion: 1; createdAt: string; data: RecordValue }
const object = (v:unknown, path:string):RecordValue => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error(`${path} doit être un objet.`);
  return v as RecordValue;
};
const array = (v:unknown,path:string):unknown[] => {if(!Array.isArray(v)) throw Error(`${path} doit être une liste.`);return v;};
const string = (v:unknown,path:string):string => {if(typeof v!=='string'||!v.trim())throw Error(`${path} doit être renseigné.`);return v;};
const number = (v:unknown,path:string):number => {if(typeof v!=='number'||!Number.isFinite(v)||v<0)throw Error(`${path} doit être un nombre positif ou nul.`);return v;};
function identifier(v:unknown,path:string):string {const id=string(v,path);if(/[<>"'`]/.test(id)||Array.from(id).some(char=>char.charCodeAt(0)<32))throw Error(`${path} contient des caractères non autorisés.`);return id;}
function date(v:unknown,path:string) {try {parseDate(string(v,path));} catch {throw Error(`${path} doit être une date valide (AAAA-MM-JJ).`);}}
function exercises(v:unknown,path:string,allowEmpty=false) {
  const entries=array(v,path);if(!entries.length&&!allowEmpty)throw Error(`${path} ne peut pas être vide.`);
  entries.forEach((entry,i)=>{
    const p=`${path}, exercice ${i+1}`,e=object(entry,p);validateGuidance(e);if(e.execution!==undefined)validateExerciseTimer(e.execution);identifier(e.id,`${p} : identifiant`);string(e.name,`${p} : nom`);
    for(const field of ['primary','secondary']) array(e[field],`${p} : ${field}`).forEach(x=>string(x,`${p} : muscle`));
    if(e.tip!==undefined&&typeof e.tip!=='string')throw Error(`${p} : conseil invalide.`);if(e.trainingNote!==undefined&&(typeof e.trainingNote!=='string'||e.trainingNote.length>2000))throw Error(`${p} : note invalide (2 000 caractères maximum).`);
    const sets=array(e.sets,`${p} : séries`);if(!sets.length)throw Error(`${p} : aucune série.`);
    sets.forEach((entry,j)=>{const t=object(entry,`${p}, série ${j+1}`);validateGuidance(t);for(const field of ['kg','reps','rest'])number(t[field],`${p}, série ${j+1} : ${field}`);if(typeof t.done!=='boolean')throw Error(`${p}, série ${j+1} : validation invalide.`);});
  });
}
function session(v:unknown,path:string) {const s=object(v,path);identifier(s.id,`${path} : identifiant`);string(s.name,`${path} : nom`);if(s.day!==undefined)string(s.day,`${path} : jour`);for(const field of ['warmupExercises','cooldownExercises'])if(s[field]!==undefined)array(s[field],`${path} : ${field}`).forEach((v,i)=>{const p=`${path} : ${field} ${i+1}`;const item=object(v,p);validatePreparation(item,p);if(item.trainingNote!==undefined&&(typeof item.trainingNote!=='string'||item.trainingNote.length>2000))throw Error(`${p} : note invalide.`);});const hasPrep=(Array.isArray(s.warmupExercises)&&s.warmupExercises.length>0)||(Array.isArray(s.cooldownExercises)&&s.cooldownExercises.length>0);exercises(s.exercises,`${path} : exercices`,hasPrep);if(s.prepState!==undefined){const st=object(s.prepState,'Préparation');if(!['warmup','main','cooldown','complete'].includes(String(st.phase)))throw Error('Phase de préparation invalide.');const index=number(st.index,'Préparation : index');if(!Number.isInteger(index))throw Error('Préparation : index invalide.');for(const field of ['warmup','cooldown']){const entries=array(st[field],`Préparation : ${field}`);const items=array(s[field==='warmup'?'warmupExercises':'cooldownExercises']??[],field);if(entries.length!==items.length)throw Error('Préparation : progression incohérente.');entries.forEach((entry,i)=>{const progress=object(entry,'Progression');if(progress.execution!==undefined)validateExerciseTimer(progress.execution);const done=number(progress.donePasses,'Passages');if(!Number.isInteger(done)||done>number(object(items[i],'Mouvement').sets,'Séries')||typeof progress.skipped!=='boolean')throw Error('Préparation : progression invalide.');});if(st.phase===field&&index>=entries.length)throw Error('Préparation : mouvement courant invalide.');}if(st.timerUntil!==null&&(typeof st.timerUntil!=='number'||!Number.isFinite(st.timerUntil)||st.timerUntil<0))throw Error('Minuteur de préparation invalide.');if(st.phase==='main'&&array(s.exercises,'Exercices').length===0)throw Error('Phase principale sans exercice.');}return s;}
export function validateState(input:unknown):RecordValue {
  safeTree(input);const data=object(input,'Données');
  const programs=array(data.programs,'Programmes');if(!programs.length)throw Error('La sauvegarde ne contient aucun programme.');
  programs.forEach((entry,i)=>{const p=object(entry,`Programme ${i+1}`);identifier(p.id,'Identifiant du programme');string(p.name,'Nom du programme');const weeks=array(p.weeks,'Semaines');if(!weeks.length)throw Error('Un programme ne contient aucune semaine.');weeks.forEach((w,j)=>array(object(w,`Semaine ${j+1}`).sessions,`Séances semaine ${j+1}`).forEach((s,k)=>session(s,`Semaine ${j+1}, séance ${k+1}`)));});
  if(data.customExercises!==undefined){
    const customs=array(data.customExercises,'Exercices personnalisés');
    if(customs.length>1000)throw Error('Trop d’exercices personnalisés.');
    const known=new Set<string>();
    customs.forEach((v,i)=>{
      const p=`Exercice personnalisé ${i+1}`,e=object(v,p),name=string(e.name,`${p} : nom`);
      if(name.length>100)throw Error(`${p} : 100 caractères maximum.`);
      const key=name.trim().toLocaleLowerCase('fr');
      if(known.has(key))throw Error('Exercice personnalisé en doublon.');
      known.add(key);
      for(const field of ['primary','secondary'])array(e[field],`${p} : ${field}`).forEach(x=>string(x,`${p} : muscle`));
      if(e.tip!==undefined&&typeof e.tip!=='string')throw Error(`${p} : conseil invalide.`);
    });
  }
  const active=string(data.activePlanId,'Programme actif');if(!programs.some(p=>(p as RecordValue).id===active))throw Error('Le programme actif est introuvable.');
  const week=number(data.week,'Semaine active');if(!Number.isInteger(week)||week<1)throw Error('Semaine active invalide.');
  const prefs=object(data.prefs,'Préférences');string(prefs.profile,'Profil');if(prefs.mode!=='sport'&&prefs.mode!=='detail')throw Error('Mode de séance invalide.');
  array(data.history,'Historique').forEach((h,i)=>{const p=`Activité ${i+1}`,a=session(h,p);number(a.finishedAt,`${p} : date`);number(a.duration,`${p} : durée`);if(!Number.isFinite(new Date(a.finishedAt as number).getTime()))throw Error(`${p} : date invalide.`);});
  if(data.workout!==null&&data.workout!==undefined){const w=session(data.workout,'Séance en cours');number(w.startedAt,'Séance en cours : début');const index=number(w.exIndex,'Séance en cours : exercice courant');if(!Number.isInteger(index)||(array(w.exercises,'Exercices').length>0?index>=array(w.exercises,'Exercices').length:index!==0))throw Error('Séance en cours : exercice courant invalide.');if(w.restTimer!==undefined&&!restoreTimer(w.restTimer,w.startedAt as number))throw Error('Séance en cours : chronomètre invalide.');}
  if(data.calendar!==undefined){const calendar=object(data.calendar,'Planning');for(const [id,value] of Object.entries(calendar)){const entry=object(value,`Planning ${id}`);date(entry.startDate,`Planning ${id} : début`);const moves=object(entry.moves,`Planning ${id} : déplacements`);for(const [key,value] of Object.entries(moves))date(value,`Déplacement ${key}`);}}
  return data;
}
function safeTree(value:unknown,depth=0):void {
  if(depth>100)throw Error('Sauvegarde trop imbriquée.');
  if(value&&typeof value==='object')for(const [key,item] of Object.entries(value)){if(['__proto__','prototype','constructor'].includes(key))throw Error('La sauvegarde contient une propriété non autorisée.');safeTree(item,depth+1);}
}
export function parseBackup(text:string):{data:RecordValue;createdAt:string|null} {
  let parsed:unknown;try{parsed=JSON.parse(text);}catch{throw Error('Fichier JSON illisible ou incomplet.');}
  safeTree(parsed);const root=object(parsed,'Sauvegarde');let data:unknown,createdAt:string|null=null;
  if(root.app==='IronLog'&&root.formatVersion===1){data=root.data;if(typeof root.createdAt!=='string'||!Number.isFinite(Date.parse(root.createdAt)))throw Error('Date de création invalide.');createdAt=root.createdAt;}
  else if(root.app==='IronLog V4'&&root.version===4){data=root.data;}
  else if(root.app===undefined&&root.version===undefined&&root.formatVersion===undefined&&Array.isArray(root.programs)){data=root;}
  else throw Error('Format ou version de sauvegarde non pris en charge.');
  return {data:validateState(data),createdAt};
}
export function makeBackup(data:unknown,now=new Date()):Backup {safeTree(data);return {app:'IronLog',formatVersion:1,createdAt:now.toISOString(),data:validateState(data)};}
export function restoreBackup(storage:StorageWriter,data:RecordValue):RecordValue {safeTree(data);validateState(data);persist(storage,data);return data;}
export function backupName(now=new Date()):string {const pad=(n:number)=>String(n).padStart(2,'0');return `ironlog-backup-${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;}
