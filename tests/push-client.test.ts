// @vitest-environment happy-dom
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {enable,disable,testPush,credentials,checkStatus} from '../src/push/client';
const key='ironlog-push-install-v1';
const subscribe=vi.fn(),getSubscription=vi.fn(),unsubscribe=vi.fn();
const permission=vi.fn();
beforeEach(()=>{
 localStorage.clear();vi.stubEnv('VITE_PUSH_API_URL','https://push.example');vi.stubEnv('VITE_PUSH_PUBLIC_KEY','BA');
 Object.defineProperty(window,'isSecureContext',{value:true,configurable:true});
 vi.stubGlobal('PushManager',function(){});vi.stubGlobal('Notification',{requestPermission:permission});
 Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{getRegistration:vi.fn().mockResolvedValue({active:{},pushManager:{getSubscription,subscribe}})}});
 permission.mockResolvedValue('granted');unsubscribe.mockResolvedValue(true);
 const subscription={toJSON:()=>({endpoint:'https://x.push.apple.com/demo',keys:{p256dh:'key',auth:'auth'}}),unsubscribe};
 getSubscription.mockResolvedValue(subscription);subscribe.mockResolvedValue(subscription);
 vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>new Response(JSON.stringify({ok:true,connected:true}),{status:200})));
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.clearAllMocks();localStorage.clear();});
describe('notifications de test',()=>{
 it('demande la permission uniquement sur action et garde les secrets hors de la base de séances',async()=>{
  expect(permission).not.toHaveBeenCalled();await enable('code de test');expect(permission).toHaveBeenCalledOnce();
  expect(credentials()).not.toBeNull();expect(localStorage.getItem('ironlog-v4-prototype-2026-11-06')).toBeNull();
  const sent=vi.mocked(fetch).mock.calls[0];expect(String(sent[0])).toBe('https://push.example/pair');expect(JSON.parse(String(sent[1]?.body)).code).toBe('code de test');
  expect(localStorage.getItem(key)).not.toContain('code de test');
 });
 it('ne souscrit ni ne contacte le service si la permission est refusée',async()=>{
  permission.mockResolvedValueOnce('denied');await expect(enable('code')).rejects.toThrow('Autorisation refusée');expect(fetch).not.toHaveBeenCalled();expect(credentials()).toBeNull();
 });
 it('signale une panne réseau sans annoncer le succès et conserve le jeton pour un nouvel essai',async()=>{
  vi.mocked(fetch).mockRejectedValueOnce(new TypeError('offline'));await expect(enable('code')).rejects.toThrow('Service inaccessible');expect(credentials()).not.toBeNull();
 });
 it('test et désactivation demandent un jeton distinct et effacent le stockage local après succès',async()=>{
  await enable('code');expect(credentials()).not.toBeNull();expect(await checkStatus()).toBe(true);await testPush();await disable();expect(unsubscribe).toHaveBeenCalledOnce();expect(credentials()).toBeNull();
 });
 it('ne demande rien si la configuration est absente',async()=>{vi.stubEnv('VITE_PUSH_API_URL','');await expect(enable('code')).rejects.toThrow('non configuré');expect(permission).not.toHaveBeenCalled();});
});
