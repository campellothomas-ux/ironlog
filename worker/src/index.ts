import { buildPushPayload, type PushSubscription } from '@block65/webcrypto-web-push';
import { constantEqual, digest, validId, validSubscription, validToken } from './security';
interface Env { INSTALLATIONS:DurableObjectNamespace; PAIRING:DurableObjectNamespace; ALLOWED_ORIGINS:string; PAIRING_CODE:string; VAPID_PUBLIC_KEY:string; VAPID_PRIVATE_KEY:string; VAPID_SUBJECT:string }
type Payload={installationId?:unknown;token?:unknown;code?:unknown;subscription?:unknown;delaySeconds?:unknown};
const response=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function readBody(request:Request):Promise<Payload|null> {
 if(Number(request.headers.get('content-length')||0)>8192)return null;
 try {const text=await request.text();if(new TextEncoder().encode(text).byteLength>8192)return null;const value:unknown=JSON.parse(text);return value&&typeof value==='object'&&!Array.isArray(value)?value as Payload:null;}catch{return null;}
}
export default {
 async fetch(request:Request,env:Env):Promise<Response> {
  const origin=request.headers.get('Origin')||'';
  const allowed=(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(!origin||!allowed.includes(origin))return response({error:'origin_not_allowed'},403);
  const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Vary':'Origin'};
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  const finish=(r:Response)=>{const out=new Response(r.body,r);for(const [key,value] of Object.entries(cors))out.headers.set(key,value);return out;};
  if(request.method!=='POST')return finish(response({error:'method'},405));
  if(!env.PAIRING_CODE||env.PAIRING_CODE.length<20||!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.VAPID_SUBJECT)return finish(response({error:'not_configured'},503));
  const path=new URL(request.url).pathname;if(!['/pair','/test','/test-delay','/cancel-test','/status','/disable'].includes(path))return finish(response({error:'not_found'},404));
  const body=await readBody(request);if(!body||!validId(body.installationId))return finish(response({error:'invalid_request'},400));
  const id=body.installationId;
  const trafficGate=env.PAIRING.get(env.PAIRING.idFromName('global'));
  const traffic=await trafficGate.fetch('https://internal/traffic',{method:'POST'});
  if(!traffic.ok)return finish(traffic);
  if(path==='/pair'){
   if(!validToken(body.token)||typeof body.code!=='string'||body.code.length>256||!validSubscription(body.subscription))return finish(response({error:'invalid_request'},400));
   const gate=env.PAIRING.get(env.PAIRING.idFromName('global'));
   const result=await gate.fetch('https://internal/pair',{method:'POST',body:JSON.stringify({code:body.code})});
   if(!result.ok)return finish(result);
   const install=env.INSTALLATIONS.get(env.INSTALLATIONS.idFromName(id));
   return finish(await install.fetch('https://internal/pair',{method:'POST',body:JSON.stringify({tokenHash:await digest(body.token),subscription:body.subscription})}));
  }
  if(path==='/test-delay'&&body.delaySeconds!==30&&body.delaySeconds!==90)return finish(response({error:'invalid_request'},400));
  const auth=request.headers.get('Authorization')||'';const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  if(!validToken(token))return finish(response({error:'unauthorized'},401));
  const install=env.INSTALLATIONS.get(env.INSTALLATIONS.idFromName(id));
  return finish(await install.fetch(`https://internal${path}`,{method:'POST',body:JSON.stringify({tokenHash:await digest(token),delaySeconds:body.delaySeconds})}));
 }
};
export class PairingGate {
 constructor(private state:DurableObjectState,private env:Env){}
 async fetch(request:Request):Promise<Response>{
  const now=Date.now();
  if(new URL(request.url).pathname==='/traffic'){
   const recent=(await this.state.storage.get<number[]>('traffic')||[]).filter(t=>t>now-60000);
   if(recent.length>=120)return response({error:'rate_limited'},429);
   recent.push(now);await this.state.storage.put('traffic',recent);return response({ok:true});
  }
  const data=await request.json() as {code:string};
  const attempts=(await this.state.storage.get<number[]>('attempts')||[]).filter(t=>t>now-600000);
  if(attempts.length>=10)return response({error:'rate_limited'},429);
  attempts.push(now);await this.state.storage.put('attempts',attempts);
  const good=constantEqual(await digest(data.code),await digest(this.env.PAIRING_CODE));
  return good?response({ok:true}):response({error:'unauthorized'},401);
 }
}
export class Installation {
 constructor(private state:DurableObjectState,private env:Env){}
 async fetch(request:Request):Promise<Response>{
  const path=new URL(request.url).pathname;const data=await request.json() as {tokenHash:string;subscription?:PushSubscription;delaySeconds?:number};
  if(path==='/pair'){
   const current=await this.state.storage.get<string>('tokenHash');
   if(current&&!constantEqual(current,data.tokenHash))return response({error:'already_paired'},409);
   await this.state.storage.put({tokenHash:data.tokenHash,subscription:data.subscription});return response({ok:true});
  }
  const expected=await this.state.storage.get<string>('tokenHash');
  if(!expected||!constantEqual(expected,data.tokenHash))return response({error:'unauthorized'},401);
  if(path==='/status')return response({connected:!!await this.state.storage.get('subscription'),testStatus:(await this.state.storage.get<{status:string}>('testJob'))?.status??null});
  if(path==='/disable'){await this.state.storage.deleteAlarm();await this.state.storage.deleteAll();return response({ok:true});}
  if(path==='/cancel-test'){await this.state.storage.deleteAlarm();await this.state.storage.delete('testJob');return response({ok:true});}
  if(path!=='/test'&&path!=='/test-delay')return response({error:'not_found'},404);
  const sub=await this.state.storage.get<PushSubscription>('subscription');if(!sub)return response({error:'subscription_missing'},410);
  if(path==='/test-delay'){const pending=await this.state.storage.get<{status:string}>('testJob');if(pending?.status==='pending'||pending?.status==='attempting')return response({error:'test_pending'},409);}
  const now=Date.now(),last=await this.state.storage.get<number>('lastTest')||0;
  if(now-last<60000)return response({error:'rate_limited'},429);
  await this.state.storage.put('lastTest',now);
  if(path==='/test-delay'){
   if(data.delaySeconds!==30&&data.delaySeconds!==90)return response({error:'invalid_request'},400);
   const due=now+data.delaySeconds*1000;
   await this.state.storage.put('testJob',{id:crypto.randomUUID(),due,status:'pending'});
   try{await this.state.storage.setAlarm(due);}catch{await this.state.storage.delete('testJob');return response({error:'alarm_unavailable'},503);}
   return response({scheduled:true,due});
  }
  return this.send(sub);
 }
 async alarm():Promise<void>{
  const job=await this.state.storage.get<{id:string;status:string}>('testJob');
  if(!job||job.status!=='pending')return;
  // Claim before sending: a retried alarm cannot send twice, even after a crash.
  // This deliberately favors avoiding duplicates over guaranteed delivery.
  await this.state.storage.put('testJob',{...job,status:'attempting'});
  const sub=await this.state.storage.get<PushSubscription>('subscription');
  if(!sub){await this.state.storage.put('testJob',{...job,status:'subscription_missing'});return;}
  const result=await this.send(sub);
  const current=await this.state.storage.get<{id:string}>('testJob');
  if(current?.id===job.id)await this.state.storage.put('testJob',{...job,status:result.ok?'accepted':'failed'});
 }
 private async send(sub:PushSubscription):Promise<Response>{
  try{
   const payload=await buildPushPayload({data:JSON.stringify({type:'test'}),options:{ttl:60}},sub,{subject:this.env.VAPID_SUBJECT,publicKey:this.env.VAPID_PUBLIC_KEY,privateKey:this.env.VAPID_PRIVATE_KEY});
   const result=await fetch(sub.endpoint,{...payload,redirect:'manual'});
   if(result.status===404||result.status===410){await this.state.storage.delete('subscription');return response({error:'subscription_expired'},410);}
   if(!result.ok)return response({error:'push_service_rejected'},502);
   return response({accepted:true});
  }catch{return response({error:'push_service_unavailable'},502);}
 }
}
