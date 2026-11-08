export function validateGuidance(value:Record<string,unknown>):void {
 for(const key of ['objective','breathing','equipment','startingPosition','note','tip'])if(value[key]!==undefined&&(typeof value[key]!=='string'||String(value[key]).length>4000))throw Error(`${key} : texte invalide`);
 for(const key of ['instructions','cues','commonMistakes'])if(value[key]!==undefined&&(!Array.isArray(value[key])||(value[key] as unknown[]).some(x=>typeof x!=='string'||x.length>2000)))throw Error(`${key} : liste de textes attendue`);
 for(const key of ['imageUrl','videoUrl'])if(value[key]!==undefined&&value[key]!==''){if(typeof value[key]!=='string')throw Error(`${key} : URL invalide`);let url:URL;try{url=new URL(value[key] as string);}catch{throw Error(`${key} : URL invalide`);}if(url.protocol!=='https:'||url.username||url.password)throw Error(`${key} : URL HTTPS requise`);}
 if(value.perSide!==undefined&&typeof value.perSide!=='boolean')throw Error('perSide : booléen attendu');
 if(value.sideOrder!==undefined&&(!Array.isArray(value.sideOrder)||value.sideOrder.length!==2||new Set(value.sideOrder).size!==2||value.sideOrder.some(x=>x!=='left'&&x!=='right')))throw Error('sideOrder : left et right requis');
 for(const key of ['durationSeconds','transitionSeconds'])if(value[key]!==undefined&&(typeof value[key]!=='number'||!Number.isFinite(value[key])||(value[key] as number)<0))throw Error(`${key} : durée invalide`);
}
