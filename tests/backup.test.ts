import { describe,it,expect,vi } from 'vitest';
import { makeBackup,parseBackup,restoreBackup,backupName,validateState } from '../src/backup/backup';
import { KEY } from '../src/storage';
import { sampleState } from './fixtures/backup';
import { startRestTimer } from '../src/workout/rest-timer';
describe('sauvegarde et restauration',()=>{
 it('exporte un état complet et préserve exactement toutes ses données',()=>{
  const state=sampleState();const backup=makeBackup(state,new Date('2026-11-06T21:15:00Z'));
  expect(backup).toMatchObject({app:'IronLog',formatVersion:1,createdAt:'2026-11-06T21:15:00.000Z'});
  const parsed=parseBackup(JSON.stringify(backup));expect(parsed.data).toEqual(state);
  expect(makeBackup(parsed.data).data).toEqual(state);
  expect(backupName(new Date(2026,10,6,22,15))).toBe('ironlog-backup-2026-11-06-2215.json');
 });
 it('préserve le chrono lié à la séance dans une sauvegarde complète',()=>{
  const state=sampleState();const timer=startRestTimer('cycle_1',state.workout.startedAt,90,1760000000000);
  const withTimer={...state,workout:{...state.workout,restTimer:timer}};
  expect(parseBackup(JSON.stringify(makeBackup(withTimer))).data).toEqual(withTimer);
  expect(()=>parseBackup(JSON.stringify(makeBackup({...state,workout:{...state.workout,restTimer:{...timer,workoutStartedAt:1}}})))).toThrow('chronomètre');
 });
 it('accepte la sauvegarde V4 et l’ancien état brut, sans normalisation',()=>{
  const state=sampleState();expect(parseBackup(JSON.stringify({app:'IronLog V4',version:4,data:state})).data).toEqual(state);
  expect(parseBackup(JSON.stringify(state)).data).toEqual(state);
 });
 it('préserve activité, performances, planning, profil et séance en cours après écriture',()=>{
  const state=sampleState();const storage={setItem:vi.fn()};restoreBackup(storage,state);
  expect(storage.setItem).toHaveBeenCalledOnce();expect(storage.setItem.mock.calls[0][0]).toBe(KEY);
  expect(JSON.parse(storage.setItem.mock.calls[0][1])).toEqual(state);
 });
 it('ne modifie rien lors d’un échec de stockage ou de quota',()=>{
  const state=sampleState(),before=JSON.stringify(state);
  for(const error of [new Error('inaccessible'),new DOMException('quota','QuotaExceededError')])expect(()=>restoreBackup({setItem:()=>{throw error;}},state)).toThrow();
  expect(JSON.stringify(state)).toBe(before);
 });
 it('restaure sans doublon lors d’un remplacement répété',()=>{
  let raw='';const storage={setItem:(_key:string,value:string)=>{raw=value;}};const state=sampleState();
  restoreBackup(storage,state);restoreBackup(storage,state);expect(JSON.parse(raw).history).toHaveLength(1);
 });
 it('rejette JSON invalide, versions inconnues et données dangereuses',()=>{
  expect(()=>parseBackup('{')).toThrow('JSON');expect(()=>parseBackup('{"app":"IronLog","formatVersion":99}')).toThrow('version');
  expect(()=>parseBackup('{"__proto__":{"polluted":true}}')).toThrow('non autorisée');
 });
 it('rejette structures et valeurs incohérentes',()=>{
  const state=sampleState();state.programs[0].weeks[0].sessions[0].exercises[0].sets[0].kg=-1;
  expect(()=>validateState(state)).toThrow('kg');
  const invalid=sampleState();invalid.calendar.plan_1.moves['0:session_1']='2025-02-30';expect(()=>validateState(invalid)).toThrow('date valide');
  const bad=sampleState();bad.workout.exIndex=100;expect(()=>validateState(bad)).toThrow('courant');
  expect(()=>validateState({...sampleState(),history:{}})).toThrow('Historique');
  const unsafe=sampleState();unsafe.workout.id='bad" onclick="';expect(()=>validateState(unsafe)).toThrow('non autorisés');
 });
});
