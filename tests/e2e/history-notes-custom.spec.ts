import {test,expect,type Page} from '@playwright/test';
const KEY='ironlog-v4-prototype-2026-11-06';
const stored=(page:Page)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),KEY);
async function start(page:Page){await page.goto('/');await page.locator('[data-a="home-start"]').click();}
async function finish(page:Page){page.once('dialog',d=>d.accept());await page.locator('[data-a="work-finish"]').first().click();}

test('une note de séance reste liée à son exercice et à l’historique, pas au programme',async({page})=>{
 await start(page);
 const original=await stored(page);
 await page.locator('.exercise-note summary').click();
 await page.locator('[data-workout-note][data-phase="main"]').fill('Bonne sensation, banc à cran 3');
 await page.locator('[data-a="ex-next"]').click();
 await page.locator('[data-a="ex-prev"]').click();
 await page.locator('.exercise-note summary').click();
 await expect(page.locator('[data-workout-note][data-phase="main"]')).toHaveValue('Bonne sensation, banc à cran 3');
 await finish(page);
 const after=await stored(page);
 expect(after.history[0].exercises[0].trainingNote).toBe('Bonne sensation, banc à cran 3');
 expect(after.programs).toEqual(original.programs);
 await page.locator('[data-a="activity-open"]').click();
 await expect(page.getByRole('dialog')).toContainText('Bonne sensation, banc à cran 3');
 await page.reload();
 expect((await stored(page)).history[0].exercises[0].trainingNote).toBe('Bonne sensation, banc à cran 3');
});

test('le remplacement propose une création avec le nom seul, persistante dans la bibliothèque personnelle',async({page})=>{
 await start(page);
 await page.locator('[data-a="replace-ex"]').click();
 await expect(page.locator('[data-a="replace-create"]')).toBeVisible();
 await page.locator('[data-a="replace-create"]').click();
 await page.locator('#custom-ex-name').fill('  Tirage unilatéral personnel  ');
 await page.locator('[data-a="replace-create-save"]').click();
 await expect(page.locator('.exheader')).toContainText('Tirage unilatéral personnel');
 const data=await stored(page);
 expect(data.customExercises.map((x:{name:string})=>x.name)).toContain('Tirage unilatéral personnel');
 expect(data.workout.exercises[0].name).toBe('Tirage unilatéral personnel');
 expect(data.workout.exercises[0].sets).toHaveLength(4);
 await page.reload();await page.locator('[data-a="resume"]').click();
 await page.locator('[data-a="replace-ex"]').click();
 await expect(page.getByRole('dialog')).toContainText('Tirage unilatéral personnel');
 await page.locator('[data-a="replace-create"]').click();
 await page.locator('#custom-ex-name').fill('Tirage unilatéral personnel');
 await page.locator('[data-a="replace-create-save"]').click();
 await expect(page.getByRole('status')).toContainText('existe déjà');
 expect((await stored(page)).customExercises).toHaveLength(1);
});

test('une ancienne séance se modifie : note, charge, durée et statistiques sont recalculées',async({page})=>{
 await start(page);
 await page.locator('[data-a="validate"]').first().click();
 await page.locator('[data-a="rest-skip"]').click();
 await finish(page);
 const before=await stored(page),prevVol=before.history[0].exercises[0].sets[0].kg;
 await page.locator('[data-a="history-edit-open"]').click();
 await page.locator('[data-history-field="name"]').fill('Séance Upper corrigée');
 await page.locator('[data-history-field="duration"]').fill('42');
 await page.locator('[data-history-set][data-field="kg"][data-i="0"][data-j="0"]').fill('99');
 await page.locator('[data-history-note][data-i="0"]').fill('Correction après la salle');
 await page.locator('[data-a="history-edit-save"]').click();
 await expect(page.getByRole('dialog')).toContainText('Séance Upper corrigée');
 await expect(page.getByRole('dialog')).toContainText('99 kg');
 const after=await stored(page);
 expect(after.history[0].duration).toBe(2520);
 expect(after.history[0].exercises[0].sets[0].kg).toBe(99);
 expect(after.history[0].exercises[0].trainingNote).toBe('Correction après la salle');
 expect(after.history[0].exercises[0].sets[0].done).toBe(true);
 expect(after.programs).toEqual(before.programs);
 expect(after.workout).toBeNull();
 expect(prevVol).not.toBe(99);
 await page.reload();
 await page.locator('[data-nav="you"]').click();
 await page.locator('[data-a="you-tab"][data-id="progress"]').click();
 await expect(page.locator('.stats3')).toContainText('594');
});

test('suppression d’une ancienne séance : confirmation et conservation des programmes',async({page})=>{
 await start(page);await finish(page);
 const before=await stored(page);
 await expect(page.locator('[data-a="history-delete"]')).toHaveCount(1);
 page.once('dialog',d=>d.dismiss());await page.locator('[data-a="history-delete"]').click();
 expect((await stored(page)).history).toHaveLength(1);
 page.once('dialog',d=>d.accept());await page.locator('[data-a="history-delete"]').click();
 const after=await stored(page);
 expect(after.history).toHaveLength(0);
 expect(after.programs).toEqual(before.programs);
 expect(after.workout).toBeNull();
 await page.locator('[data-a="you-tab"][data-id="records"]').click();
 await expect(page.locator('.page')).toContainText('Tes records apparaîtront');
 await page.reload();expect((await stored(page)).history).toHaveLength(0);
});

test('une erreur de stockage laisse intact l’historique pendant la suppression',async({page})=>{
 await start(page);await finish(page);
 await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');};});
 page.once('dialog',d=>d.accept());
 await page.locator('[data-a="history-delete"]').click();
 expect((await stored(page)).history).toHaveLength(1);
 await page.reload();expect((await stored(page)).history).toHaveLength(1);
});
