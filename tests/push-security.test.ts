import { describe,it,expect } from 'vitest';
import { validId,validToken,validSubscription,constantEqual,digest } from '../worker/src/security';
const b64=(bytes:Uint8Array)=>Buffer.from(bytes).toString('base64url');
const valid=()=>({endpoint:'https://example.push.apple.com/3/device/abc',expirationTime:null,keys:{p256dh:b64(Uint8Array.from([4,...Array(64).fill(2)])),auth:b64(new Uint8Array(16))}});
describe('sécurité du prototype push',()=>{
 it('accepte uniquement des identifiants et jetons aléatoires de taille attendue',()=>{expect(validId('a'.repeat(32))).toBe(true);expect(validId('../private')).toBe(false);expect(validToken('A'.repeat(43))).toBe(true);expect(validToken('short')).toBe(false);});
 it('borne les destinations pour éviter la redirection vers un réseau arbitraire',()=>{const s=valid();expect(validSubscription(s)).toBe(true);expect(validSubscription({...s,endpoint:'https://fcm.googleapis.com/fcm/send/123'})).toBe(true);for(const endpoint of ['http://example.push.apple.com/x','https://push.apple.com.evil.example/x','https://127.0.0.1/x','https://user:pass@example.push.apple.com/x','https://example.push.apple.com:444/x'])expect(validSubscription({...s,endpoint})).toBe(false);});
 it('refuse les clés mal formées',()=>{const s=valid();expect(validSubscription({...s,keys:{...s.keys,auth:'bad'}})).toBe(false);expect(validSubscription({...s,keys:{...s.keys,p256dh:b64(new Uint8Array(65))}})).toBe(false);});
 it('compare les empreintes sans comparaison directe du secret',async()=>{const a=await digest('secret-a'),b=await digest('secret-b');expect(constantEqual(a,a)).toBe(true);expect(constantEqual(a,b)).toBe(false);expect(constantEqual(a,a+'0')).toBe(false);});
});
