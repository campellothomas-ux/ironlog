const KEY='ironlog-push-install-v1'; // Deliberately separate from transferable workout backups.
interface Credentials {installationId:string;token:string}
export interface Config {api:string;publicKey:string}
export function config():Config|null {
 const api=import.meta.env.VITE_PUSH_API_URL,publicKey=import.meta.env.VITE_PUSH_PUBLIC_KEY;
 if(!api||!publicKey)return null;
 try{const url=new URL(api);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)return null;return {api:url.origin,publicKey};}catch{return null;}
}
export function credentials():Credentials|null {
 try{const v=JSON.parse(localStorage.getItem(KEY)||'null');return v&&/^[a-f0-9]{32}$/.test(v.installationId)&&/^[A-Za-z0-9_-]{43}$/.test(v.token)?v:null;}catch{return null;}
}
export function support():string|null {
 if(!window.isSecureContext)return 'Une connexion HTTPS est nécessaire.';
 if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))return 'Ce navigateur ne prend pas en charge les notifications Web Push.';
 const ios=/iPhone|iPad|iPod/.test(navigator.userAgent);
 if(ios&&!window.matchMedia('(display-mode: standalone)').matches&&!(navigator as Navigator & {standalone?:boolean}).standalone)return 'Sur iPhone, installe cette preview sur l’écran d’accueil et ouvre-la depuis son icône.';
 return null;
}
function randomBytes(size:number):Uint8Array {const bytes=new Uint8Array(size);crypto.getRandomValues(bytes);return bytes;}
function base64url(bytes:Uint8Array):string{return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function keyBytes(key:string):Uint8Array<ArrayBuffer> {
 const binary=atob(key.replace(/-/g,'+').replace(/_/g,'/'));const bytes=new Uint8Array(new ArrayBuffer(binary.length));for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;
}
async function registration():Promise<ServiceWorkerRegistration>{
 const reg=await navigator.serviceWorker.getRegistration('/');if(!reg?.active)throw Error('Service worker indisponible. Recharge la preview après son installation.');return reg;
}
async function request(cfg:Config,path:string,body:object,token?:string):Promise<Record<string,unknown>> {
 let result:Response;
 try{result=await fetch(cfg.api+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body),cache:'no-store'});}catch{throw Error('Service inaccessible. Vérifie la connexion et la configuration.');}
 const data=await result.json().catch(()=>({})) as Record<string,unknown>;
 if(!result.ok){const errors:Record<string,string>={unauthorized:'Code ou accès refusé.',rate_limited:'Trop de tentatives. Réessaie plus tard.',subscription_expired:'Abonnement expiré. Désactive puis réactive les notifications.',not_configured:'Service de test non configuré.',already_paired:'Cette installation est déjà associée à un autre accès.',test_pending:'Un test différé est déjà en attente.'};throw Error(errors[String(data.error)]||'Le service a refusé la demande.');}
 return data;
}
export async function enable(code:string):Promise<void> {
 const cfg=config(),problem=support();if(!cfg)throw Error('Service de test non configuré.');if(problem)throw Error(problem);
 if(!code.trim())throw Error('Saisis le code d’appairage.');
 // Called synchronously from the user gesture before other asynchronous work.
 const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Autorisation refusée ou non accordée dans les réglages de l’appareil.');
 const reg=await registration();let sub=await reg.pushManager.getSubscription();
 if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(cfg.publicKey)});
 let auth=credentials();if(!auth){auth={installationId:Array.from(randomBytes(16),b=>b.toString(16).padStart(2,'0')).join(''),token:base64url(randomBytes(32))};localStorage.setItem(KEY,JSON.stringify(auth));}
 await request(cfg,'/pair',{installationId:auth.installationId,token:auth.token,code,subscription:sub.toJSON()});
}
export async function testPush():Promise<void>{const cfg=config(),auth=credentials();if(!cfg||!auth)throw Error('Active d’abord les notifications.');await request(cfg,'/test',{installationId:auth.installationId},auth.token);}
export async function scheduleTest(seconds:30|90):Promise<void>{const cfg=config(),auth=credentials();if(!cfg||!auth)throw Error('Active d’abord les notifications.');await request(cfg,'/test-delay',{installationId:auth.installationId,delaySeconds:seconds},auth.token);}
export async function cancelTest():Promise<void>{const cfg=config(),auth=credentials();if(!cfg||!auth)throw Error('Aucune installation active.');await request(cfg,'/cancel-test',{installationId:auth.installationId},auth.token);}
export async function checkStatus():Promise<boolean>{const cfg=config(),auth=credentials();if(!cfg||!auth)return false;return (await request(cfg,'/status',{installationId:auth.installationId},auth.token)).connected===true;}
export async function disable():Promise<void>{
 const cfg=config(),auth=credentials();if(!cfg||!auth)throw Error('Aucune installation active sur cet appareil.');
 await request(cfg,'/disable',{installationId:auth.installationId},auth.token);
 try{const reg=await registration();const sub=await reg.pushManager.getSubscription();if(sub&&!await sub.unsubscribe())throw Error('unsubscribe');}
 catch{localStorage.removeItem(KEY);throw Error('Accès serveur supprimé, mais la suppression locale de l’abonnement a échoué. Vérifie les réglages du navigateur.');}
 localStorage.removeItem(KEY);
}
