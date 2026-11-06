import { test, expect } from '@playwright/test';
const KEY='ironlog-v4-prototype-2026-11-06';
const load=(page:import('@playwright/test').Page)=>page.evaluate(key=>localStorage.getItem(key),KEY);
const navMore=async(page:import('@playwright/test').Page)=>{await page.locator('[data-nav="you"]').click();await page.locator('[data-a="you-tab"][data-id="more"]').click();};
test('aperçu, annulation, échec quota, restauration V4 et rechargement',async({page},info)=>{
 await page.goto('/');await page.locator('[data-a="home-start"]').click();
 const initial=JSON.parse((await load(page))!);
 initial.prefs.profile='Profil sauvegardé';initial.history=[{...initial.workout,id:'a1',finishedAt:1760000000000,duration:120}];
 initial.calendar={[initial.activePlanId]:{startDate:'2026-11-02',moves:{}}};
 const file={name:'ironlog-v4.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({app:'IronLog V4',version:4,data:initial}))};
 await navMore(page);const original=await load(page);
 await page.locator('[data-a="import-backup"]').click();await page.locator('#backup-file').setInputFiles(file);await page.locator('[data-a="backup-load"]').click();
 await expect(page.getByRole('dialog')).toContainText('Profil sauvegardé');await expect(page.getByRole('dialog')).toContainText('DONNÉES ACTUELLES');
 await page.screenshot({path:info.outputPath('backup-preview.png')});
 await page.locator('[data-a="backup-cancel"]').click();expect(await load(page)).toBe(original);
 await page.locator('[data-a="import-backup"]').click();await page.locator('#backup-file').setInputFiles(file);await page.locator('[data-a="backup-load"]').click();
 page.once('dialog',d=>d.dismiss());await page.locator('[data-a="backup-restore"]').click();expect(await load(page)).toBe(original);
 await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError');};});
 page.once('dialog',d=>d.accept());await page.locator('[data-a="backup-restore"]').click();await expect(page.getByRole('status')).toContainText('Stockage insuffisant');expect(await load(page)).toBe(original);
 await page.reload();await navMore(page);await page.locator('[data-a="import-backup"]').click();await page.locator('#backup-file').setInputFiles(file);await page.locator('[data-a="backup-load"]').click();
 page.once('dialog',d=>d.accept());await page.locator('[data-a="backup-restore"]').click();expect(JSON.parse((await load(page))!)).toEqual(initial);
 await page.reload();await navMore(page);const downloadPromise=page.waitForEvent('download');await page.locator('[data-a="export-all"]').click();const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/^ironlog-backup-.*\.json$/);
 const stream=await download.createReadStream();const chunks=[];for await(const chunk of stream!)chunks.push(chunk);expect(JSON.parse(Buffer.concat(chunks).toString()).data).toEqual({...initial,youTab:'more'});
});
test('base corrompue conservée et restauration depuis fichier valide',async({page},info)=>{
 await page.goto('/');await page.locator('[data-a="home-start"]').click();const state=JSON.parse((await load(page))!);
 await page.evaluate(key=>localStorage.setItem(key,'{cassé'),KEY);await page.reload();
 await expect(page.locator('.page')).toContainText('illisi');expect(await load(page)).toBe('{cassé');
 await page.screenshot({path:info.outputPath('recovery.png')});
 await page.locator('[data-a="import-backup"]').click();await page.locator('#backup-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{')});await page.locator('[data-a="backup-load"]').click();await expect(page.getByRole('status')).toContainText('JSON');expect(await load(page)).toBe('{cassé');
 await page.locator('#backup-file').setInputFiles({name:'valid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({app:'IronLog V4',version:4,data:state}))});await page.locator('[data-a="backup-load"]').click();
 page.once('dialog',d=>d.accept());await page.locator('[data-a="backup-restore"]').click();expect(JSON.parse((await load(page))!)).toEqual(state);await page.reload();await expect(page.locator('[data-a="resume"]')).toBeVisible();
});
test('échec de validation de série conserve la dernière version enregistrée',async({page})=>{
 await page.goto('/');await page.locator('[data-a="home-start"]').click();const previous=await load(page);
 await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError');};});
 await page.locator('[data-a="validate"]').click();await expect(page.getByRole('status')).toContainText('Enregistrement impossible');
 expect(await load(page)).toBe(previous);await expect(page.locator('[data-a="validate"]')).toContainText('Valider la série');
 await page.reload();await page.locator('[data-a="resume"]').click();expect(await load(page)).toBe(previous);
});
test('stockage inaccessible au démarrage affiche un écran contrôlé',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.getItem=function(){throw new DOMException('blocked','SecurityError');};});
 await page.goto('/');await expect(page.locator('.page')).toContainText('stockage local est inaccessible');
 await expect(page.locator('[data-a="recovery-export"]')).toHaveCount(0);
});
