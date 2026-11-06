export const validId=(id:unknown):id is string=>typeof id==='string'&&/^[a-f0-9]{32}$/.test(id);
export const validToken=(token:unknown):token is string=>typeof token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(token);
export async function digest(value:string):Promise<string> {
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
export function constantEqual(a:string,b:string):boolean {
 let difference=a.length^b.length;const size=Math.max(a.length,b.length);
 for(let i=0;i<size;i++)difference|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);
 return difference===0;
}
function decode(value:unknown):Uint8Array|null {
 if(typeof value!=='string'||!/^[A-Za-z0-9_-]+$/.test(value))return null;
 try{const binary=atob(value.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(binary,c=>c.charCodeAt(0));}catch{return null;}
}
export function validSubscription(value:unknown):boolean {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const sub=value as {endpoint?:unknown;expirationTime?:unknown;keys?:{p256dh?:unknown;auth?:unknown}};
 if(typeof sub.endpoint!=='string'||sub.endpoint.length>2048)return false;
 try {const url=new URL(sub.endpoint);const host=url.hostname.toLowerCase();
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash)return false;
  if(!(host==='web.push.apple.com'||host.endsWith('.push.apple.com')||host==='fcm.googleapis.com'))return false;
 } catch{return false;}
 const key=decode(sub.keys?.p256dh),auth=decode(sub.keys?.auth);
 return !!key&&key.length===65&&key[0]===4&&!!auth&&auth.length===16&&(sub.expirationTime===null||sub.expirationTime===undefined||typeof sub.expirationTime==='number'&&Number.isFinite(sub.expirationTime));
}
