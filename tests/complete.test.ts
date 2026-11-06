import { describe, it, expect, vi } from 'vitest';
import { completeWorkout } from '../src/workout/complete';
import { KEY } from '../src/storage';
const fixture = () => ({programs:[{id:'plan'}], history:[], workout:{id:'session', startedAt:1000, exIndex:0, mode:'sport', exercises:[{sets:[{kg:65,reps:6,rest:120,done:true}]}]}});
describe('fin de séance', () => {
  it('écrit activité et suppression de séance en une opération, sans muter la V4', () => {
    const state=fixture(), storage={setItem:vi.fn()};
    const result=completeWorkout(state,storage,61000);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    const [key,raw]=storage.setItem.mock.calls[0];
    expect(key).toBe(KEY);
    const saved=JSON.parse(raw);
    expect(saved.workout).toBeNull();
    expect(saved.history).toHaveLength(1);
    expect(saved.history[0]).toMatchObject({duration:60,exercises:state.workout.exercises});
    expect(saved.history[0]).not.toHaveProperty('mode');
    expect(saved.programs).toEqual(state.programs);
    expect(result.state).toEqual(saved);
    expect(state.workout).not.toBeNull();
    expect(state.history).toHaveLength(0);
  });
  it('préserve la séance en cas de quota dépassé et permet de réessayer', () => {
    const state=fixture(), before=JSON.stringify(state);
    expect(()=>completeWorkout(state,{setItem:()=>{throw new Error('QuotaExceededError');}})).toThrow();
    expect(JSON.stringify(state)).toBe(before);
    expect(completeWorkout(state,{setItem:vi.fn()}).state.history).toHaveLength(1);
  });
  it('ne crée pas de doublon après double appel ni reprise du même identifiant', () => {
    const storage={setItem:vi.fn()}, original=fixture();
    const first=completeWorkout(original,storage).state;
    expect(completeWorkout(first,storage).state.history).toHaveLength(1);
    expect(completeWorkout({...first,workout:original.workout},storage).state.history).toHaveLength(1);
  });
  it('permet deux occurrences distinctes du même modèle', () => {
    const storage={setItem:vi.fn()}, state=fixture();
    const first=completeWorkout(state,storage).state;
    const second=completeWorkout({...first,workout:{...state.workout,startedAt:2000}},storage);
    expect(second.state.history).toHaveLength(2);
  });
});
