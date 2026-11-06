import {describe,it,expect} from 'vitest';
import {startRestTimer,remainingMs,reconcile,pause,resume,adjust,cancel,restoreTimer} from '../src/workout/rest-timer';
describe('repos à échéance absolue',()=>{
 it('démarre et calcule sans compteur ni valeur négative',()=>{const t=startRestTimer('r1',100,90,1000);expect(remainingMs(t,31000)).toBe(60000);expect(remainingMs(t,200000)).toBe(0);expect(reconcile(t,91000).status).toBe('completed');});
 it('met en pause et reprend sans compter le temps suspendu',()=>{const t=startRestTimer('r',1,90,1000),p=pause(t,11000);expect(p.remainingMs).toBe(80000);expect(remainingMs(p,999999)).toBe(80000);expect(remainingMs(resume(p,100000),120000)).toBe(60000);});
 it('ajuste actif et pause, et termine à zéro',()=>{const t=startRestTimer('r',1,30,1000);expect(remainingMs(adjust(t,30,11000),11000)).toBe(50000);const p=adjust(pause(t,11000),-15,50000);expect(p.status).toBe('paused');expect(p.remainingMs).toBe(5000);expect(adjust(p,-15,50000).status).toBe('completed');});
 it('restaure uniquement le bon cycle et supporte une longue suspension',()=>{const t=startRestTimer('r',42,90,1000);expect(restoreTimer(JSON.parse(JSON.stringify(t)),42)).toEqual(t);expect(restoreTimer(t,43)).toBeNull();expect(reconcile(t,86400000).status).toBe('completed');expect(restoreTimer({...t,deadline:'bad'},42)).toBeNull();});
 it('conserve la fin et ne recrée pas un événement à la relecture',()=>{const t=reconcile(startRestTimer('r',1,10,1000),11000);expect(reconcile(t,20000)).toBe(t);expect(cancel(t).status).toBe('cancelled');expect(remainingMs(cancel(t),20000)).toBe(0);});
 it('recalcule selon les changements d’horloge système',()=>{const t=startRestTimer('r',1,30,10000);expect(remainingMs(t,5000)).toBe(35000);expect(remainingMs(t,45000)).toBe(0);});
});
