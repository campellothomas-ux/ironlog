import { it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
const tokens=readFileSync('src/tokens.css','utf8');
const color=(name:string)=>{const match=tokens.match(new RegExp(`--${name}\\s*:\\s*(#[0-9a-f]{6})`,'i'));if(!match)throw Error(`Couleur --${name} manquante`);return match[1];};
function luminance(hex:string){const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
it('WCAG AA : texte normal, secondaire, accent et action principale',()=>{
 for(const [fg,bg] of [['fg','bg'],['fg','card'],['muted','bg'],['muted','card2'],['accent','bg'],['accent','card'],['accent','card2'],['on-accent','dark'],['sand','card2']]){
  const values=[luminance(color(fg)),luminance(color(bg))].sort((a,b)=>b-a);
  expect((values[0]+.05)/(values[1]+.05),`${fg}/${bg}`).toBeGreaterThanOrEqual(4.5);
 }
});
