import { describe,it,expect } from 'vitest';
import { addDays,dateKey,monday,monthDays,parseDate,shiftMonth,weekDays } from '../src/planning/dates';
import { activityDay,moveOccurrence,plannedSessions,setStart } from '../src/planning/model';
const program={id:'p',name:'Programme',weeks:Array.from({length:8},()=>({sessions:[{id:'same',name:'Séance',day:'Lundi',exercises:[{sets:[{kg:20}]}]}]}))};
describe('dates civiles locales',()=>{
 it('commence lundi et traverse les années',()=>{
  expect(monday('2027-01-01')).toBe('2026-12-28');
  expect(weekDays('2027-01-01')).toEqual(['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);
 });
 it('gère les années bissextiles et refuse les dates impossibles',()=>{
  expect(addDays('2024-02-28',1)).toBe('2024-02-29');
  expect(addDays('2025-02-28',1)).toBe('2025-03-01');
  expect(()=>parseDate('2025-02-29')).toThrow();
  expect(()=>parseDate('2026-13-01')).toThrow();
  expect(shiftMonth('2024-01-31',1)).toBe('2024-02-29');
  expect(shiftMonth('2026-12-31',1)).toBe('2027-01-31');
 });
 it('fournit une grille lundi-dimanche avec toutes les vraies dates',()=>{
  const grid=monthDays('2026-11-06');
  expect(grid[0]).toBe('2026-10-26');expect(grid.at(-1)).toBe('2026-12-06');
  expect(grid).toHaveLength(42);expect(new Set(grid).size).toBe(42);
 });
 it('traverse les changements d’heure sans sauter de jour',()=>{
  for(const date of ['2026-03-28','2026-10-24','2026-03-07','2026-10-31']){
   const next=addDays(date,1);expect(addDays(next,-1)).toBe(date);
   expect(parseDate(next).getHours()).toBe(12);
  }
  expect(dateKey(parseDate('2026-03-29'))).toBe('2026-03-29');
 });
});
describe('compatibilité V4 et planning fini',()=>{
 it('ne crée aucun début implicite et ne modifie pas le programme',()=>{
  const before=JSON.stringify(program);expect(plannedSessions(program)).toEqual([]);
  const calendar=setStart(undefined,'p','2026-11-04');
  const planned=plannedSessions(program,calendar.p);
  expect(planned).toHaveLength(8);expect(planned[0].date).toBe('2026-11-02');
  expect(planned.at(-1)?.date).toBe('2026-12-21');
  expect(JSON.stringify(program)).toBe(before);
 });
 it('déplace une seule occurrence sans toucher aux séries ni aux autres semaines',()=>{
  const calendar=setStart(undefined,'p','2026-11-02');const before=JSON.stringify(calendar);
  const next=moveOccurrence(calendar,program,'1:same','2026-11-12');
  const planned=plannedSessions(program,next.p);
  expect(planned[1].date).toBe('2026-11-12');expect(planned[0].date).toBe('2026-11-02');
  expect(planned[1].session).toBe(program.weeks[1].sessions[0]);
  expect(JSON.stringify(calendar)).toBe(before);
  expect(()=>moveOccurrence(calendar,program,'99:same','2026-11-12')).toThrow();
 });
 it('préserve les autres programmes et déplacements après modification explicite du début',()=>{
  const calendar={other:{startDate:'2025-01-06',moves:{}}};
  const next=setStart(calendar,'p','2026-11-04');expect(next.other).toBe(calendar.other);
  expect(next.p.startDate).toBe('2026-11-02');
 });
 it('date les activités selon leur instant local et jamais selon leur nom',()=>{
  expect(activityDay(+new Date(2026,10,6,23,45))).toBe('2026-11-06');
  expect(activityDay(NaN)).toBeNull();
 });
});
it.skipIf(!['Europe/Paris','America/New_York'].includes(process.env.TZ??''))('navigation locale aux transitions DST des fuseaux testés',()=>{
 if(process.env.TZ==='Europe/Paris'){
  expect(+parseDate(addDays('2026-03-28',1))-+parseDate('2026-03-28')).toBe(23*3600000);
  expect(+parseDate(addDays('2026-10-24',1))-+parseDate('2026-10-24')).toBe(25*3600000);
 }
 if(process.env.TZ==='America/New_York'){
  expect(+parseDate(addDays('2026-03-07',1))-+parseDate('2026-03-07')).toBe(23*3600000);
  expect(+parseDate(addDays('2026-10-31',1))-+parseDate('2026-10-31')).toBe(25*3600000);
 }
});
