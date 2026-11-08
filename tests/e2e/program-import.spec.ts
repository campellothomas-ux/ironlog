import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const KEY='ironlog-v4-prototype-2026-11-06';
const fixture=readFileSync('examples/programs/preparation-session.json');
const read=(page:import('@playwright/test').Page)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),KEY);
async function openImport(page:import('@playwright/test').Page){await page.locator('[data-nav="program"]').click();await page.locator('[data-a="import-program"]').click();await page.locator('#json-import').setInputFiles({name:'programme.json',mimeType:'application/json',buffer:fixture});await page.locator('[data-a="import-save"]').click();}
test('aperçu sans mutation, séance avec préparation persistante et activité',async({page},info)=>{
 await page.clock.install({time:new Date('2026-11-06T12:00:00Z')});await page.goto('/');
 await page.locator('[data-nav="program"]').click();const before=await read(page);
 await page.locator('[data-a="import-program"]').click();await page.locator('#json-import').setInputFiles({name:'programme.json',mimeType:'application/json',buffer:fixture});await page.locator('[data-a="import-save"]').click();
 await expect(page.getByRole('dialog')).toContainText('PROGRAMMES DÉTECTÉS');expect(await read(page)).toEqual(before);
 await page.locator('[data-a="import-cancel"]').click();expect(await read(page)).toEqual(before);
 await openImport(page);await page.locator('[data-a="import-confirm"]').click();let state=await read(page);expect(state.programs).toHaveLength(2);expect(state.activePlanId).toBe(before.activePlanId);expect(state.history).toEqual(before.history);
 await page.locator('[data-a="open-plan"]').last().click();await page.locator('[data-a="activate-plan"]').click();await page.locator('[data-nav="home"]').click();await page.locator('[data-a="home-start"]').click();
 await expect(page.locator('.page.workout')).toContainText('Mobilité des chevilles');await page.screenshot({path:info.outputPath('warmup.png')});await page.locator('[data-a="prep-timer"]').click();await page.clock.fastForward(10000);await expect(page.locator('[data-preptime]')).toHaveText('0:35');
 await page.reload();await page.locator('[data-a="resume"]').click();await expect(page.locator('[data-preptime]')).toHaveText('0:35');
 await page.locator('[data-a="prep-done"]').click();await expect(page.locator('.page.workout')).toContainText('Squats sans charge');await page.locator('[data-a="prep-done"]').click();await expect(page.locator('.page.workout')).toContainText('Passages confirmés 1 / 2');await page.locator('[data-a="prep-skip"]').click();
 await expect(page.locator('[data-a="toggle-mode"]')).toBeVisible();await expect(page.locator('.valuebox').first()).toContainText('35');
 await page.locator('[data-a="validate"]').click();await page.locator('[data-a="rest-skip"]').click();await page.locator('[data-a="prep-open-cooldown"]').click();await page.locator('[data-a="prep-done"]').click();
 page.once('dialog',dialog=>dialog.accept());await page.locator('[data-a="work-finish"]').last().click();await expect(page.locator('.activity')).toHaveCount(1);
 state=await read(page);expect(state.history[0].prepState.warmup[0].donePasses).toBe(1);expect(state.history[0].prepState.warmup[1].skipped).toBe(true);expect(state.history[0].exercises[0].sets.filter((x:{done:boolean})=>x.done)).toHaveLength(1);
 await page.reload();await page.locator('[data-nav="you"]').click();await page.locator('[data-a="activity-open"]').click();await expect(page.getByRole('dialog')).toContainText('Mobilité des chevilles');
});
test('séance mobilité seule importée et enregistrée sans faux record',async({page})=>{
 await page.goto('/');await page.locator('[data-nav="program"]').click();await page.locator('[data-a="import-program"]').click();await page.locator('#json-import').setInputFiles('examples/programs/variable-weeks.json');await page.locator('[data-a="import-save"]').click();await page.locator('[data-a="import-confirm"]').click();await page.locator('[data-a="open-plan"]').last().click();
 const before=await read(page);await page.locator('[data-a="week-next"]').click();await expect(page.locator('.page')).toContainText('SEMAINE 3');expect((await read(page)).week).toBe(before.week);
 await page.locator('[data-a="activate-plan"]').click();await page.locator('[data-a="open-plan"]').last().click();await page.locator('[data-a="week-next"]').click();await page.locator('[data-a="week-next"]').click();await page.locator('[data-a="select-program-week"]').click();await page.locator('[data-nav="home"]').click();await page.locator('[data-a="home-start"]').click();await expect(page.locator('.page.workout')).toContainText('Mobilité douce');await page.locator('[data-a="prep-done"]').click();await page.locator('[data-a="prep-done"]').click();
 page.once('dialog',dialog=>dialog.accept());await page.locator('[data-a="work-finish"]').last().click();const state=await read(page);expect(state.history[0].exercises).toHaveLength(0);expect(state.history[0].prepState.cooldown[0].donePasses).toBe(1);
 await page.reload();await page.locator('[data-nav="you"]').click();await page.locator('[data-a="you-tab"][data-id="records"]').click();await expect(page.locator('.page')).toContainText('Tes records apparaîtront');
});

test('charges prévues conservées malgré un historique plus lourd',async({page})=>{
 await page.goto('/');await openImport(page);await page.locator('[data-a="import-confirm"]').click();await page.locator('[data-a="open-plan"]').last().click();await page.locator('[data-a="activate-plan"]').click();
 await page.evaluate(key=>{const d=JSON.parse(localStorage.getItem(key)!);const h=structuredClone(d.programs[0].weeks[0].sessions[0]);h.id='activity_previous';h.finishedAt=Date.now()-100000;h.duration=60;h.exercises[0].name='Hip thrust';h.exercises[0].sets[0].kg=100;h.exercises[0].sets[0].reps=6;h.exercises[0].sets[0].done=true;d.history.push(h);localStorage.setItem(key,JSON.stringify(d));},KEY);
 await page.reload();await page.locator('[data-a="home-start"]').click();await page.locator('[data-a="prep-skip-phase"]').click();
 await expect(page.locator('.valuebox').first()).toContainText('35');await expect(page.locator('.lastperf')).toContainText('100');
});
test('erreur de validation, doublon et quota ne modifient pas les données',async({page})=>{
 await page.goto('/');await page.locator('[data-nav="program"]').click();const before=await read(page);await page.locator('[data-a="import-program"]').click();
 const bad=JSON.parse(fixture.toString());delete bad.programs[0].weeks[0].sessions[0].warmupExercises[0].durationSeconds;bad.programs[0].weeks[0].sessions[0].warmupExercises[0].duration=45;
 await page.locator('#json-import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await page.locator('[data-a="import-save"]').click();await expect(page.getByRole('status')).toContainText('duration');expect(await read(page)).toEqual(before);
 await page.locator('#json-import').setInputFiles({name:'good.json',mimeType:'application/json',buffer:fixture});await page.locator('[data-a="import-save"]').click();
 await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError');};});await page.locator('[data-a="import-confirm"]').click();await expect(page.getByRole('status')).toContainText('Enregistrement impossible');expect(await read(page)).toEqual(before);
 await page.reload();await openImport(page);await page.locator('[data-a="import-confirm"]').click();const once=await read(page);await openImport(page);page.once('dialog',d=>d.dismiss());await page.locator('[data-a="import-confirm"]').click();expect((await read(page)).programs).toEqual(once.programs);
});
test('modification future demande confirmation et conserve les identifiants de calendrier',async({page})=>{
 await page.goto('/');await page.locator('[data-nav="program"]').click();await page.locator('[data-a="import-program"]').click();await page.locator('#json-import').setInputFiles('examples/programs/fixed-8-weeks.json');await page.locator('[data-a="import-save"]').click();await page.locator('[data-a="import-confirm"]').click();await page.locator('[data-a="open-plan"]').last().click();
 const before=await read(page);const imported=before.programs.at(-1);expect(before.calendar[imported.id].startDate).toBe('2026-11-02');expect(before.week).toBe(2);
 await page.locator('[data-a="edit-session"]').first().click();await page.locator('[data-ed="sessionname"]').fill('Upper adapté');await page.locator('input[name="edit-scope"][value="future"]').check();
 page.once('dialog',d=>d.dismiss());await page.locator('[data-a="editor-save"]').click();expect((await read(page)).programs).toEqual(before.programs);
 page.once('dialog',d=>d.accept());await page.locator('[data-a="editor-save"]').click();const after=await read(page);const edited=after.programs.at(-1);
 expect(edited.weeks[0].sessions[0].name).toBe(imported.weeks[0].sessions[0].name);expect(edited.weeks[1].sessions[0].name).toBe('Upper adapté');expect(edited.weeks[7].sessions[0].name).toBe('Upper adapté');
 expect(edited.weeks.map((w:{sessions:{id:string}[]})=>w.sessions[0].id)).toEqual(imported.weeks.map((w:{sessions:{id:string}[]})=>w.sessions[0].id));expect(after.week).toBe(before.week);expect(after.calendar).toEqual(before.calendar);
});
