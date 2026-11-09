import {describe,it,expect} from 'vitest';
import {setTimedExercise,setRepetitionExercise,formerRepetitions} from '../src/workout/prescription';
const source=()=>[
 {kg:0,reps:10,rest:60,done:false},
 {kg:0,reps:12,rest:75,done:true},
 {kg:0,reps:15,rest:90,done:false},
];
describe('basculer un exercice créé en répétitions ou durée',()=>{
 it('convertit toutes les séries en chronos sans effacer les repos ni l original',()=>{
  const before=source(),after=setTimedExercise(before,30,false);
  expect(before[0]).not.toHaveProperty('durationSeconds');
  expect(after.map(s=>s.durationSeconds)).toEqual([30,30,30]);
  expect(after.map(s=>s.reps)).toEqual([0,0,0]);
  expect(after.map(s=>s.rest)).toEqual([60,75,90]);
  expect(after.map(s=>s.done)).toEqual([false,false,false]);
  expect(after.map(formerRepetitions)).toEqual([10,12,15]);
 });
 it('propose un chrono par côté avec transition de cinq secondes',()=>{
  const arr=setTimedExercise(source(),30,true);
  expect(arr[0]).toMatchObject({durationSeconds:30,perSide:true,sideOrder:['left','right'],transitionSeconds:5});
  const back=setTimedExercise(arr,40,false);
  expect(back[0].perSide).toBe(false);
  expect(back[0]).not.toHaveProperty('sideOrder');
  expect(back[0]).not.toHaveProperty('transitionSeconds');
  expect(formerRepetitions(back[0])).toBe(10);
 });
 it('revient à des répétitions sans minuterie résiduelle',()=>{
  const timed=setTimedExercise(source(),30,true),back=setRepetitionExercise(timed,12);
  expect(back).toHaveLength(3);
  for(const set of back)expect(set).toMatchObject({reps:12,done:false});
  for(const set of back)for(const k of ['durationSeconds','perSide','transitionSeconds','sideOrder','repsBeforeTimer'])expect(set).not.toHaveProperty(k);
 });
 it('refuse les durées et répétitions incohérentes sans modifier l entrée',()=>{
  const data=source();
  for(const value of [0,-5,3601,NaN,Infinity,1.2])expect(()=>setTimedExercise(data,value,false)).toThrow();
  expect(()=>setRepetitionExercise(data,-1)).toThrow();
  expect(data).toEqual(source());
 });
});
