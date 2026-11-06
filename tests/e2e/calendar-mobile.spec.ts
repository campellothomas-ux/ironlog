import { test,expect,type Page } from '@playwright/test';
const key='ironlog-v4-prototype-2026-11-06';
const click=async(page:Page,action:string)=>page.locator(`[data-a="${action}"]`).click();
const stored=(page:Page)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);
async function noOverflow(page:Page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 for(const tab of await page.locator('[data-nav]').all()){
  const rect=await tab.boundingBox();expect(rect).not.toBeNull();expect(rect!.y+rect!.height).toBeLessThanOrEqual((page.viewportSize()?.height??0)+1);
 }
}
test('calendrier explicite, activités indépendantes, déplacement et rechargement',async({page})=>{
 await page.clock.install({time:new Date('2026-11-06T12:00:00+01:00')});
 await page.goto('/');await click(page,'home-start');
 page.once('dialog',d=>d.accept());await click(page,'work-finish');
 const before=await stored(page);
 await page.locator('[data-nav="program"]').click();await click(page,'open-planning');
 await expect(page.locator('#calendar-start')).toHaveValue('');
 await expect(page.locator('.calendar-agenda')).toContainText('Activité enregistrée');
 expect((await stored(page)).calendar).toBeUndefined();
 await page.locator('#calendar-start').fill('2026-11-04');
 page.once('dialog',d=>d.accept());await click(page,'calendar-anchor');
 await page.locator('[data-a="calendar-mode"][data-id="month"]').click();
 await expect(page.locator('.calendar-day')).toHaveCount(42);
 await expect(page.locator('[data-date="2026-11-02"] .planned-dot')).toBeVisible();
 await expect(page.locator('[data-date="2026-11-06"] .activity-dot')).toBeVisible();
 await page.locator('[data-date="2026-11-02"]').click();
 await expect(page.locator('.calendar-agenda')).toContainText('Upper Body');
 await expect(page.locator('.calendar-agenda')).not.toContainText('Activité enregistrée');
 await click(page,'calendar-info');await expect(page.getByRole('dialog')).toContainText('Développé couché');await click(page,'modal-close');
 await click(page,'calendar-move');await page.locator('#calendar-move-date').fill('2026-11-03');await click(page,'calendar-move-save');
 await expect(page.locator('.calendar-agenda')).toContainText('Upper Body');
 const after=await stored(page);
 expect(after.programs).toEqual(before.programs);expect(after.history).toEqual(before.history);expect(after.week).toBe(before.week);
 await page.reload();await page.locator('[data-nav="program"]').click();
 await page.locator('[data-a="calendar-mode"][data-id="month"]').click();
 await page.locator('[data-date="2026-11-03"]').click();await expect(page.locator('.calendar-agenda')).toContainText('Upper Body');
 await noOverflow(page);
});
test('parcours séance et migration réelle V4 sans perte',async({page})=>{
 // L'ancien HTML est la véritable source V4, même origine, même clé.
 await page.goto('/ironlog-v4-prototype.html');await click(page,'home-start');
 page.once('dialog',d=>d.accept());await click(page,'work-finish');
 await click(page,'modal-close');await page.locator('[data-nav="home"]').click();await click(page,'home-start');
 const original=await stored(page);
 await page.goto('/');expect(await stored(page)).toEqual(original);await click(page,'resume');
 expect((await stored(page)).programs).toEqual(original.programs);
 for(const [field,value] of [['kg','42.5'],['reps','11'],['rest','75']]){
  await page.locator(`[data-a="wheel"][data-f="${field}"]`).click();
  await page.locator('#wheel-direct').fill(value);await click(page,'wheel-save');
 }
 await click(page,'mode-detail');
 await expect(page.locator('.details-row').first()).toContainText('42,5');
 await expect(page.locator('.details-row').first()).toContainText('1:15');
 await page.locator('[data-a="validate"]').first().click();await click(page,'rest-skip');
 await expect(page.locator('.details-row').first()).toHaveAttribute('aria-label','Série 1 : validée');
 await page.locator('[data-a="validate"]').first().click();
 await expect(page.locator('.details-row').first()).toHaveAttribute('aria-label','Série 1 : à faire');
 await click(page,'ex-next');await click(page,'ex-prev');
 await click(page,'add-set');
 const last=page.locator('.details-row').last();await last.scrollIntoViewIfNeeded();
 const rect=await last.boundingBox();const nav=await page.locator('#tabbar').boundingBox();
 expect(rect!.y+rect!.height).toBeLessThanOrEqual(nav!.y);
 await page.reload();await click(page,'resume');
 await expect(page.locator('.details-row').first()).toContainText('42,5');
 page.once('dialog',d=>d.accept());await click(page,'work-finish');
 await expect(page.locator('.activity')).toHaveCount(2);
 await page.reload();await page.locator('[data-nav="you"]').click();await expect(page.locator('.activity')).toHaveCount(2);
 await noOverflow(page);
});
test('programme : création, édition et conservation après rechargement',async({page})=>{
 await page.goto('/');await page.locator('[data-nav="program"]').click();
 await click(page,'create-program');await page.locator('#create-name').fill('Mobilité & force');await click(page,'create-save');
 await click(page,'edit-session');await page.locator('[data-ed="sessionname"]').fill('Séance personnalisée');
 await click(page,'editor-save');await expect(page.locator('.page')).toContainText('Séance personnalisée');
 await page.reload();await page.locator('[data-nav="program"]').click();
 expect((await stored(page)).programs.at(-1).weeks[1].sessions[0].name).toBe('Séance personnalisée');
 await noOverflow(page);
});
test('vues responsive et captures',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.clock.install({time:new Date('2026-11-06T12:00:00+01:00')});
 await page.goto('/');
 await expect(page.locator('.status')).toHaveCount(0);await noOverflow(page);
 await page.screenshot({path:info.outputPath('home.png')});
 await click(page,'home-start');await noOverflow(page);
 await page.locator('.set-pips').scrollIntoViewIfNeeded();
 const pips=await page.locator('.set-pips').boundingBox();const help=await page.locator('.workfoot').boundingBox();
 expect(pips!.y+pips!.height).toBeLessThanOrEqual(help!.y+1);
 await page.screenshot({path:info.outputPath('sport-series.png')});
 await page.locator('.page.workout').evaluate(el=>el.scrollTop=0);
 await page.screenshot({path:info.outputPath('sport.png')});
 await click(page,'mode-detail');await page.screenshot({path:info.outputPath('detail.png')});
 await page.locator('[data-nav="program"]').click();await page.screenshot({path:info.outputPath('programs.png')});
 await click(page,'open-planning');await page.locator('#calendar-start').fill('2026-11-02');page.once('dialog',d=>d.accept());await click(page,'calendar-anchor');
 await page.clock.fastForward(3000);
 await page.locator('.page').evaluate(el=>el.scrollTop=0);
 await page.screenshot({path:info.outputPath('week.png')});
 await page.locator('[data-a="calendar-mode"][data-id="month"]').click();await page.screenshot({path:info.outputPath('month.png')});
 await noOverflow(page);
 await click(page,'program-back');await page.locator('[data-a="open-plan"]').first().click();await page.locator('[data-a="edit-session"]').first().click();
 await page.screenshot({path:info.outputPath('editor.png')});await click(page,'modal-close');
 await page.locator('[data-nav="you"]').click();
 await page.locator('[data-a="you-tab"][data-id="progress"]').click();await noOverflow(page);await page.screenshot({path:info.outputPath('progress.png')});
 await page.locator('[data-a="you-tab"][data-id="records"]').click();await noOverflow(page);
 await page.locator('[data-nav="workout"]').click();
 page.once('dialog',d=>d.accept());await click(page,'work-finish');await page.clock.fastForward(3000);
 await page.screenshot({path:info.outputPath('activities.png')});
 await click(page,'activity-share');await page.screenshot({path:info.outputPath('share.png')});await click(page,'modal-close');
 expect(errors).toEqual([]);
});
test('roue et saisie restent accessibles lorsque la hauteur disponible diminue',async({page})=>{
 await page.goto('/');await click(page,'home-start');
 await page.locator('[data-a="wheel"][data-f="kg"]').click();
 await page.setViewportSize({width:375,height:450});
 await page.locator('#wheel-direct').focus();await page.locator('#wheel-direct').fill('55');
 await page.locator('[data-a="wheel-save"]').scrollIntoViewIfNeeded();
 const rect=await page.locator('[data-a="wheel-save"]').boundingBox();expect(rect!.y+rect!.height).toBeLessThanOrEqual(450);
 await click(page,'wheel-save');await expect(page.locator('.valuebox').first()).toContainText('55');
});
