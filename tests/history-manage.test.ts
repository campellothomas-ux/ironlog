import {describe,it,expect} from 'vitest';
import {removeActivity,updateActivity,type HistoryState,type ActivityRecord} from '../src/history/manage';
const activity=(id:string):ActivityRecord=>({
  id,name:'Upper Body',finishedAt:1794265200000,duration:2700,
  exercises:[{id:'ex-1',name:'Rowing',trainingNote:'Bonne amplitude',sets:[{kg:55,reps:8,rest:90,done:true}]}],
});
const state=():HistoryState&{programs:{id:string}[];calendar:{a:number};workout:{id:string}|null}=>({
 history:[activity('one'),activity('two')],programs:[{id:'plan-a'}],calendar:{a:1},workout:{id:'in-progress'}
});
describe('historique modifiable sans mutation des données liées',()=>{
 it('supprime exactement une séance et laisse programme, calendrier et séance active',()=>{
   const before=state(),after=removeActivity(before,'one');
   expect(after.history.map(x=>x.id)).toEqual(['two']);
   expect(after.programs).toBe(before.programs);
   expect(after.calendar).toBe(before.calendar);
   expect(after.workout).toBe(before.workout);
   expect(before.history).toHaveLength(2);
 });
 it('refuse un identifiant inexistant',()=>{
   expect(()=>removeActivity(state(),'missing')).toThrow(/introuvable/);
 });
 it('met à jour séries et notes de la seule séance ciblée sans toucher aux autres',()=>{
   const before=state(),edited=structuredClone(before.history[0]);
   edited.exercises[0].sets[0].kg=57.5;edited.exercises[0].trainingNote='Plus fluide';
   const next=updateActivity(before,'one',edited);
   expect(next.history[0].exercises[0].sets[0].kg).toBe(57.5);
   expect(next.history[0].exercises[0].trainingNote).toBe('Plus fluide');
   expect(next.history[1]).toBe(before.history[1]);
   expect(before.history[0].exercises[0].sets[0].kg).toBe(55);
   expect(next.programs).toBe(before.programs);
 });
 it('interdit de changer l’identité, les notes trop longues et les séries négatives',()=>{
   const before=state(),edited=structuredClone(before.history[0]);
   edited.id='second';expect(()=>updateActivity(before,'one',edited)).toThrow(/Identifiant/);
   edited.id='one';edited.exercises[0].trainingNote='a'.repeat(2001);
   expect(()=>updateActivity(before,'one',edited)).toThrow(/2 000/);
   edited.exercises[0].trainingNote='';edited.exercises[0].sets[0].kg=-1;
   expect(()=>updateActivity(before,'one',edited)).toThrow(/Série/);
 });
});
