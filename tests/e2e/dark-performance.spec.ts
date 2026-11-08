import {test,expect,type Page} from '@playwright/test';
const KEY='ironlog-v4-prototype-2026-11-06';
const read=(page:Page)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),KEY);
async function addProgram(page:Page,name='Programme temporaire'){
  await page.locator('[data-nav="program"]').click();
  await page.locator('[data-a="create-program"]').click();
  await page.locator('#create-name').fill(name);
  await page.locator('[data-a="create-save"]').click();
}
test('thème anthracite monochrome et bascule Sport / Détail persistante',async({page})=>{
  await page.goto('/');
  expect(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor)).toBe('rgb(38, 38, 38)');
  await page.locator('[data-a="home-start"]').click();
  await expect(page.locator('[data-a="mode-sport"]')).toHaveCount(0);
  await expect(page.locator('[data-a="mode-detail"]')).toHaveCount(0);
  await expect(page.getByText('Consignes et démonstration',{exact:true})).toHaveCount(0);
  const switcher=page.getByRole('switch',{name:'Mode sport'});
  await expect(switcher).toHaveAttribute('aria-checked','true');
  await switcher.click();
  await expect(page.locator('.details-row')).toHaveCount(4);
  await expect(switcher).toHaveAttribute('aria-checked','false');
  await page.reload();await page.locator('[data-a="resume"]').click();
  await expect(page.getByRole('switch',{name:'Mode sport'})).toHaveAttribute('aria-checked','false');
  await page.getByRole('switch',{name:'Mode sport'}).click();
  await expect(page.locator('.valuebox')).toHaveCount(3);
  await page.locator('[data-a="info-ex"]').click();
  await expect(page.getByRole('dialog')).toContainText('CONSEILS TECHNIQUES');
  await expect(page.getByRole('dialog')).toContainText('Conseils');
});
test('impossible de supprimer le dernier programme',async({page})=>{
  await page.goto('/');await page.locator('[data-nav="program"]').click();
  await page.locator('[data-a="open-plan"]').first().click();
  await page.locator('[data-a="delete-plan"]').click();
  await expect(page.getByRole('status')).toContainText('au moins un programme');
  expect((await read(page)).programs).toHaveLength(1);
});
test('annuler puis confirmer supprime uniquement le programme et son calendrier',async({page})=>{
  await page.goto('/');
  await addProgram(page,'À supprimer');
  const before=await read(page);expect(before.programs).toHaveLength(2);
  page.once('dialog',dialog=>dialog.dismiss());
  await page.locator('[data-a="delete-plan"]').click();
  expect((await read(page)).programs).toHaveLength(2);
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('[data-a="delete-plan"]').click();
  await expect(page.locator('[data-a="open-plan"]')).toHaveCount(1);
  const after=await read(page);
  expect(after.activePlanId).toBe(before.activePlanId);
  expect(after.history).toEqual(before.history);
  expect(after.programs.map((p:{name:string})=>p.name)).not.toContain('À supprimer');
  await page.reload();expect((await read(page)).programs).toHaveLength(1);
});
test('supprimer le programme actif réactive un autre programme sans perdre les activités',async({page})=>{
  await page.goto('/');
  await page.locator('[data-a="home-start"]').click();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('[data-a="work-finish"]').click();
  const initial=await read(page);expect(initial.history).toHaveLength(1);
  await addProgram(page,'Actif à supprimer');
  await page.locator('[data-a="activate-plan"]').click();
  await page.locator('[data-a="open-plan"]').last().click();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('[data-a="delete-plan"]').click();
  const after=await read(page);
  expect(after.activePlanId).toBe(initial.activePlanId);
  expect(after.week).toBe(1);
  expect(after.history).toEqual(initial.history);
});
test('une séance en cours bloque la suppression de son programme',async({page})=>{
  await page.goto('/');await addProgram(page,'Programme en cours');
  await page.locator('[data-a="activate-plan"]').click();
  await page.locator('[data-nav="home"]').click();
  await page.locator('[data-a="home-start"]').click();
  await page.locator('[data-nav="program"]').click();
  await page.locator('[data-a="open-plan"]').last().click();
  await page.locator('[data-a="delete-plan"]').click();
  await expect(page.getByRole('status')).toContainText('en cours');
  expect((await read(page)).programs).toHaveLength(2);
});
test('échec de stockage lors de la suppression : rien ne disparaît',async({page})=>{
  await page.goto('/');await addProgram(page);
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');};});
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('[data-a="delete-plan"]').click();
  await expect(page.getByRole('status')).toBeVisible();
  expect((await read(page)).programs).toHaveLength(2);
  await page.reload();expect((await read(page)).programs).toHaveLength(2);
});
