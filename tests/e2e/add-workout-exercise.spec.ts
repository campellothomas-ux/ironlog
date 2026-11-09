import {test,expect,type Page} from '@playwright/test';
const KEY='ironlog-v4-prototype-2026-11-06';
const current=(page:Page)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),KEY);
async function start(page:Page){await page.goto('/');await page.locator('[data-a="home-start"]').click();}

test('ajouter en pleine séance un exercice du catalogue, sauvegarder, reprendre et finir',async({page})=>{
 await start(page);
 const before=await current(page);
 const count=before.workout.exercises.length;
 await page.getByRole('button',{name:'Ajouter un exercice',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('AJOUTER UN EXERCICE');
 await expect(page.getByRole('dialog')).toContainText('Le programme prévu ne sera pas modifié');
 const selected=page.locator('[data-a="work-add-pick"]').filter({hasText:'Squat goblet'});
 await selected.click();
 let after=await current(page);
 expect(after.workout.exercises).toHaveLength(count+1);
 expect(after.workout.exIndex).toBe(count);
 expect(after.workout.exercises[count]).toMatchObject({
   name:'Squat goblet',sets:[{kg:0,reps:10,rest:90,done:false},{kg:0,reps:10,rest:90,done:false},{kg:0,reps:10,rest:90,done:false}]
 });
 expect(after.programs).toEqual(before.programs);
 expect(after.history).toEqual(before.history);
 await expect(page.locator('.exheader')).toContainText('Squat goblet');
 await page.reload();
 await page.locator('[data-a="resume"]').click();
 after=await current(page);
 expect(after.workout.exercises).toHaveLength(count+1);
 expect(after.workout.exIndex).toBe(count);
 await page.locator('[data-a="wheel"][data-f="kg"]').click();
 await page.locator('#wheel-direct').fill('22.5');
 await page.locator('[data-a="wheel-save"]').click();
 await page.locator('[data-a="validate"]').first().click();
 if(await page.locator('[data-a="rest-skip"]').count())await page.locator('[data-a="rest-skip"]').first().click();
 page.once('dialog',d=>d.accept());
 await page.locator('[data-a="work-finish"]').first().click();
 const finished=await current(page);
 expect(finished.workout).toBeNull();
 expect(finished.history[0].exercises).toHaveLength(count+1);
 expect(finished.history[0].exercises[count].sets[0]).toMatchObject({kg:22.5,done:true});
 expect(finished.programs).toEqual(before.programs);
});

test('création rapide pendant une séance : saisie du nom seule puis chrono bilatéral',async({page})=>{
 await start(page);
 const before=await current(page);
 await page.locator('[data-a="work-add-open"]').click();
 await page.locator('[data-a="work-add-new"]').click();
 await page.locator('#work-add-name').fill('Gainage improvisé');
 await page.locator('[data-a="work-add-save"]').click();
 let state=await current(page);
 const item=state.workout.exercises.at(-1);
 expect(item).toMatchObject({name:'Gainage improvisé',primary:['Autres']});
 expect(item.sets).toHaveLength(3);
 expect(item.sets[0]).toMatchObject({kg:0,reps:10,rest:90,done:false});
 expect(state.customExercises.at(-1).name).toBe('Gainage improvisé');
 expect(state.programs).toEqual(before.programs);
 await page.locator('[data-a="wheel"][data-f="reps"]').click();
 await page.locator('[data-a="wheel-mode"][data-mode="chrono"]').click();
 await page.locator('#wheel-per-side').check();
 await page.locator('#wheel-direct').fill('30');
 await page.locator('[data-a="wheel-save"]').click();
 state=await current(page);
 expect(state.workout.exercises.at(-1).sets[0]).toMatchObject({durationSeconds:30,perSide:true,transitionSeconds:5});
 await page.locator('[data-a="prep-timer"]').click();
 await expect(page.locator('[data-execution-time]')).toHaveText('0:30');
 await page.locator('[data-nav="home"]').click();
 await page.locator('[data-a="resume"]').click();
 expect((await current(page)).workout.exercises.at(-1).execution).toBeDefined();
});

test('l’ajout est non destructif si on ferme ou si le stockage échoue',async({page})=>{
 await start(page);
 const before=await current(page);
 await page.locator('[data-a="work-add-open"]').click();
 await page.getByRole('button',{name:'Fermer'}).click();
 expect(await current(page)).toEqual(before);
 await page.locator('[data-a="work-add-open"]').click();
 await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');};});
 await page.locator('[data-a="work-add-pick"]').first().click();
 await expect(page.getByRole('status')).toContainText('Stockage insuffisant');
 expect(await current(page)).toEqual(before);
 await page.reload();
 const saved=await current(page);
 expect(saved.workout.exercises).toHaveLength(before.workout.exercises.length);
 expect(saved.programs).toEqual(before.programs);
});
