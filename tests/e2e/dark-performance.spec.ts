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
  const headerHeight=await page.locator('.apphead').evaluate(node=>node.getBoundingClientRect().height);
  expect(headerHeight).toBeLessThanOrEqual(48);
  const viewport=await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).toContain('user-scalable=no');
  expect(viewport).toContain('maximum-scale=1');
  await page.locator('[data-a="home-start"]').click();
  await expect(page.locator('.apphead')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('[data-a="mode-sport"]')).toHaveCount(0);
  await expect(page.locator('[data-a="mode-detail"]')).toHaveCount(0);
  await expect(page.getByText('Consignes et démonstration',{exact:true})).toHaveCount(0);
  const switcher=page.getByRole('switch',{name:'Mode sport'});
  await expect(page.locator('.exheader [data-a="info-ex"] + [data-a="toggle-mode"]')).toHaveCount(1);
  await expect(page.locator('.mode-switch-group')).toHaveCount(0);
  await expect(switcher).toHaveText('ON');
  const size=await switcher.boundingBox();
  expect(size).not.toBeNull();
  expect(size!.width).toBe(44);
  expect(size!.height).toBe(44);
  const exheader=await page.locator('.exheader').boundingBox();
  const series=await page.locator('.sport-panel .setey').boundingBox();
  expect(series!.y-(exheader!.y+exheader!.height)).toBeGreaterThan(10);
  expect(series!.y-(exheader!.y+exheader!.height)).toBeLessThan(170);
  await expect(switcher).toHaveAttribute('aria-checked','true');
  await switcher.click();
  await expect(page.locator('.details-row')).toHaveCount(4);
  await expect(switcher).toHaveAttribute('aria-checked','false');
  await expect(switcher).toHaveText('OFF');
  await page.reload();await page.locator('[data-a="resume"]').click();
  await expect(page.getByRole('switch',{name:'Mode sport'})).toHaveAttribute('aria-checked','false');
  await page.getByRole('switch',{name:'Mode sport'}).click();
  await expect(page.getByRole('switch',{name:'Mode sport'})).toHaveText('ON');
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

test('mode Sport : équilibre des espaces verticaux sur grand écran et scroll sur petit écran',async({page})=>{
  await page.setViewportSize({width:390,height:900});
  await page.goto('/');
  await page.locator('[data-a="home-start"]').click();
  const layout=await page.evaluate(()=>{
    const rect=(selector:string)=>document.querySelector(selector)!.getBoundingClientRect();
    const screen=rect('.page.workout');
    const heading=rect('.exheader');
    const panel=rect('.sport-panel');
    const perf=rect('.lastperf');
    const pips=rect('.set-pips');
    return {
      headingToSeries:panel.top-heading.bottom,
      seriesToPerf:perf.top-panel.bottom,
      perfToPips:pips.top-perf.bottom,
      pipsToBottom:screen.bottom-pips.bottom,
      horizontalOverflow:document.documentElement.scrollWidth>window.innerWidth,
    };
  });
  expect(layout.headingToSeries).toBeGreaterThan(20);
  expect(layout.seriesToPerf).toBeGreaterThan(20);
  expect(layout.perfToPips).toBeGreaterThan(20);
  expect(layout.pipsToBottom).toBeGreaterThan(20);
  expect(layout.pipsToBottom).toBeLessThan(150);
  expect(layout.horizontalOverflow).toBe(false);
  await page.setViewportSize({width:375,height:550});
  await page.locator('.set-pips').scrollIntoViewIfNeeded();
  await expect(page.locator('.pip').first()).toBeVisible();
  await page.locator('.pip').last().click();
  await expect(page.locator('.pip').last()).toHaveClass(/active/);
});
