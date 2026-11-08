import {describe, it, expect} from 'vitest';
import {removeProgram, type RemovableState} from '../src/programs/remove';
const state = (): RemovableState & {history: {id:string}[];prefs:{profile:string}} => ({
  programs: [
    {id:'first',name:'Force',weeks:[{sessions:[{id:'s1'}]}]},
    {id:'second',name:'Mobilité',weeks:[{sessions:[{id:'s2'}]}]},
    {id:'third',name:'Course',weeks:[{sessions:[]}]},
  ],
  activePlanId:'first',week:4,homeSessionId:'s1',
  calendar:{first:{startDate:'2026-11-09',moves:{}},second:{startDate:'2026-11-16',moves:{}}},
  progPlanId:'second',progView:'detail',
  history:[{id:'completed'}],prefs:{profile:'Athlète'},
  workout:null,
});
describe('suppression de programmes non destructive',()=>{
  it('supprime un programme inactif avec son planning, sans modifier la source ni l’historique',()=>{
    const original=state();const next=removeProgram(original,'second');
    expect(next.programs.map(p=>p.id)).toEqual(['first','third']);
    expect(next.calendar).toEqual({first:original.calendar?.first});
    expect(next.history).toEqual(original.history);expect(next.prefs).toEqual(original.prefs);
    expect(next.activePlanId).toBe('first');expect(next.week).toBe(4);
    expect(next.progView).toBe('landing');expect(next.progPlanId).toBeNull();
    expect(original.programs).toHaveLength(3);
  });
  it('active un programme restant et réinitialise la sélection si on supprime le programme actif',()=>{
    const next=removeProgram(state(),'first');
    expect(next.activePlanId).toBe('second');expect(next.week).toBe(1);
    expect(next.homeSessionId).toBe('s2');expect(next.calendar?.first).toBeUndefined();
    expect(next.history).toEqual([{id:'completed'}]);
  });
  it('empêche la suppression du dernier programme',()=>{
    const single={...state(),programs:[state().programs[0]]};
    expect(()=>removeProgram(single,'first')).toThrow(/au moins un programme/);
  });
  it('protège une séance en cours, même si le programme est inactif',()=>{
    const current=state();current.workout={programId:'second'};
    expect(()=>removeProgram(current,'second')).toThrow(/en cours/);
    expect(current.programs).toHaveLength(3);
  });
  it('refuse un identifiant inconnu sans modifier la source',()=>{
    const original=state();expect(()=>removeProgram(original,'missing')).toThrow(/introuvable/);
    expect(original.programs).toHaveLength(3);
  });
});
