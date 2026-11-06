import { describe,it,expect,vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
describe('service worker : notification distante de test',()=>{
 it('n’affiche que le message de test connu et attend son affichage',async()=>{
  type PushEventMock={data?:{json:()=>unknown};waitUntil:(promise:Promise<unknown>)=>void};
  const listeners:Record<string,(event:PushEventMock)=>void>={};
  const showNotification=vi.fn().mockResolvedValue(undefined);
  const self={addEventListener:(name:string,handler:(event:PushEventMock)=>void)=>{listeners[name]=handler;},skipWaiting:vi.fn(),clients:{claim:vi.fn()},registration:{showNotification}};
  runInNewContext(readFileSync('public/sw.js','utf8'),{self,URL});
  const waitUntil=vi.fn();listeners.push({data:{json:()=>({type:'test'})},waitUntil});
  expect(showNotification).toHaveBeenCalledWith('IRONLOG — TEST',expect.objectContaining({body:'Notification de test IronLog.'}));
  expect(waitUntil).toHaveBeenCalledOnce();await waitUntil.mock.calls[0][0];
  listeners.push({data:{json:()=>({type:'unknown'})},waitUntil});expect(showNotification).toHaveBeenCalledOnce();
 });
});
