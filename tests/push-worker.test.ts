import { describe,it,expect,vi } from 'vitest';
import worker,{Installation,PairingGate} from '../worker/src/index';
import { digest } from '../worker/src/security';
class Storage {
 data=new Map<string,unknown>();
 async get<T>(key:string):Promise<T|undefined>{return this.data.get(key) as T|undefined;}
 async put(key:string|Record<string,unknown>,value?:unknown){if(typeof key==='string')this.data.set(key,value);else for(const [k,v] of Object.entries(key))this.data.set(k,v);}
 async delete(key:string){return this.data.delete(key);}
 async deleteAll(){this.data.clear();}
 alarmAt:number|null=null;async setAlarm(at:number){this.alarmAt=at;}async deleteAlarm(){this.alarmAt=null;}
}
const request=(path:string,body:object)=>new Request(`https://internal${path}`,{method:'POST',body:JSON.stringify(body)});
const b64=(bytes:ArrayBuffer|Uint8Array)=>Buffer.from(bytes instanceof Uint8Array?bytes:new Uint8Array(bytes)).toString('base64url');
async function keys(){
 const vapid=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',vapid.privateKey);
 const publicKey=b64(await crypto.subtle.exportKey('raw',vapid.publicKey));
 const receiver=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 return {publicKey,privateKey:jwk.d!,subscription:{endpoint:'https://example.push.apple.com/3/device/abc',expirationTime:null,keys:{p256dh:b64(await crypto.subtle.exportKey('raw',receiver.publicKey)),auth:b64(crypto.getRandomValues(new Uint8Array(16)))}}};
}
describe('service de test distant',()=>{
 it('limite les tentatives d’appairage',async()=>{
  const storage=new Storage(),gate=new PairingGate({storage} as never,{PAIRING_CODE:'a-secret-at-least-20-characters'} as never);
  for(let i=0;i<10;i++)expect((await gate.fetch(request('/pair',{code:'wrong'}))).status).toBe(401);
  expect((await gate.fetch(request('/pair',{code:'a-secret-at-least-20-characters'}))).status).toBe(429);
 });
 it('isole les installations, authentifie, chiffre le test et élimine un abonnement expiré',async()=>{
  const k=await keys(),storage=new Storage(),hash=await digest('a'.repeat(43)),other=await digest('b'.repeat(43));
  const env={VAPID_PUBLIC_KEY:k.publicKey,VAPID_PRIVATE_KEY:k.privateKey,VAPID_SUBJECT:'mailto:test@example.com'};
  const instance=new Installation({storage} as never,env as never);
  expect((await instance.fetch(request('/pair',{tokenHash:hash,subscription:k.subscription}))).status).toBe(200);
  expect((await instance.fetch(request('/pair',{tokenHash:other,subscription:k.subscription}))).status).toBe(409);
  expect((await instance.fetch(request('/test',{tokenHash:other}))).status).toBe(401);
  const fetchMock=vi.fn().mockResolvedValue(new Response(null,{status:201}));vi.stubGlobal('fetch',fetchMock);
  try{
   const result=await instance.fetch(request('/test',{tokenHash:hash}));expect(result.status).toBe(200);expect(await result.json()).toEqual({accepted:true});
   expect(fetchMock).toHaveBeenCalledOnce();const [endpoint,options]=fetchMock.mock.calls[0];expect(endpoint).toBe(k.subscription.endpoint);expect(options.redirect).toBe('manual');expect(new Headers(options.headers).get('content-encoding')).toBe('aes128gcm');
   expect((await instance.fetch(request('/test',{tokenHash:hash}))).status).toBe(429);
   await storage.put('lastTest',Date.now()-60001);fetchMock.mockResolvedValueOnce(new Response(null,{status:410}));
   expect((await instance.fetch(request('/test',{tokenHash:hash}))).status).toBe(410);
   expect(await storage.get('subscription')).toBeUndefined();
   expect((await instance.fetch(request('/disable',{tokenHash:hash}))).status).toBe(200);
  }finally{vi.unstubAllGlobals();}
 });
 it('sépare deux appareils et refuse les jetons croisés',async()=>{
  const a=new Installation({storage:new Storage()} as never,{} as never),b=new Installation({storage:new Storage()} as never,{} as never);
  const ta=await digest('a'.repeat(43)),tb=await digest('b'.repeat(43));
  await a.fetch(request('/pair',{tokenHash:ta,subscription:{endpoint:'https://example.push.apple.com/a'}}));
  await b.fetch(request('/pair',{tokenHash:tb,subscription:{endpoint:'https://example.push.apple.com/b'}}));
  expect((await a.fetch(request('/status',{tokenHash:tb}))).status).toBe(401);
  expect((await b.fetch(request('/status',{tokenHash:ta}))).status).toBe(401);
  expect((await a.fetch(request('/status',{tokenHash:ta}))).status).toBe(200);
  expect((await b.fetch(request('/status',{tokenHash:tb}))).status).toBe(200);
 });
 it('programme un test différé, ne renvoie pas deux fois et annule sur demande',async()=>{
  const k=await keys(),storage=new Storage(),hash=await digest('a'.repeat(43));
  const instance=new Installation({storage} as never,{VAPID_PUBLIC_KEY:k.publicKey,VAPID_PRIVATE_KEY:k.privateKey,VAPID_SUBJECT:'mailto:test@example.com'} as never);
  await instance.fetch(request('/pair',{tokenHash:hash,subscription:k.subscription}));
  expect((await instance.fetch(request('/test-delay',{tokenHash:hash,delaySeconds:30}))).status).toBe(200);expect(storage.alarmAt).not.toBeNull();
  const mocked=vi.fn().mockResolvedValue(new Response(null,{status:201}));vi.stubGlobal('fetch',mocked);
  try{
   await instance.alarm();await instance.alarm();expect(mocked).toHaveBeenCalledOnce();
   expect((await storage.get<{status:string}>('testJob'))?.status).toBe('accepted');
   await storage.put('lastTest',Date.now()-60001);
   await instance.fetch(request('/test-delay',{tokenHash:hash,delaySeconds:30}));
   await instance.fetch(request('/cancel-test',{tokenHash:hash}));await instance.alarm();expect(mocked).toHaveBeenCalledOnce();expect(storage.alarmAt).toBeNull();
   await storage.put('lastTest',Date.now()-60001);await instance.fetch(request('/test-delay',{tokenHash:hash,delaySeconds:90}));
   await instance.fetch(request('/disable',{tokenHash:hash}));await instance.alarm();expect(mocked).toHaveBeenCalledOnce();expect(storage.alarmAt).toBeNull();
  }finally{vi.unstubAllGlobals();}
 });
 it('refuse les origines et les secrets absents',async()=>{
  const env={ALLOWED_ORIGINS:'https://preview.example'};
  const denied=await worker.fetch(new Request('https://worker.example/test',{method:'POST',headers:{Origin:'https://attacker.example'}}),env as never);expect(denied.status).toBe(403);
  const unconfigured=await worker.fetch(new Request('https://worker.example/test',{method:'POST',headers:{Origin:'https://preview.example'}}),env as never);expect(unconfigured.status).toBe(503);
 });
});
