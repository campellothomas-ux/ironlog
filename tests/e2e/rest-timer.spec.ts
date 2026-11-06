import {test,expect,type Page} from '@playwright/test';
const key='ironlog-v4-prototype-2026-11-06';
async function start(page:Page){await page.goto('/');await page.locator('[data-a="home-start"]').click();await page.locator('[data-a="validate"]').click();await expect(page.locator('[data-resttime]')).toBeVisible();}
test('pause, durée, rechargement et expiration sans alerte répétée',async({page})=>{
 await page.clock.install({time:new Date('2026-11-06T12:00:00Z')});await start(page);
 await page.clock.fastForward(30000);await expect(page.locator('[data-resttime]').first()).toHaveText('1:30');
 await page.locator('[data-a="rest-toggle"]').click();await page.clock.fastForward(120000);
 await expect(page.locator('[data-resttime]').first()).toHaveText('1:30');
 await page.locator('[data-a="rest-add"][data-n="30"]').click();await expect(page.locator('[data-resttime]').first()).toHaveText('2:00');
 await page.locator('[data-a="rest-minimize"]').click();await page.reload();
 await expect(page.locator('#restbanner')).toContainText('PAUSE');await expect(page.locator('#restbanner')).toContainText('2:00');
 await page.locator('[data-a="rest-open"]').click();await page.locator('[data-a="rest-toggle"]').click();await page.locator('[data-a="rest-minimize"]').click();
 await page.clock.fastForward(121000);await expect(page.locator('#restbanner')).toContainText('REPOS TERMINÉ');
 let saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);expect(saved.workout.restTimer.status).toBe('completed');
 await page.reload();await expect(page.locator('#restbanner')).toContainText('REPOS TERMINÉ');await expect(page.getByRole('status')).toHaveCount(0);
 await page.locator('#restbanner [data-a="rest-skip"]').click();saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);expect(saved.workout.restTimer).toBeUndefined();
});
test('fin de séance ou annulation ne laisse aucun chrono fantôme',async({page})=>{
 await start(page);await page.locator('[data-a="rest-skip"]').click();await page.reload();await expect(page.locator('#restbanner')).toBeHidden();
 await page.locator('[data-a="resume"]').click();await page.locator('[data-a="validate"]').click();
 await page.locator('[data-a="rest-minimize"]').click();page.once('dialog',d=>d.accept());await page.locator('[data-a="work-finish"]').click();
 let saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);expect(saved.workout).toBeNull();expect(saved.history[0].restTimer).toBeUndefined();
 await page.locator('[data-nav="home"]').click();await page.locator('[data-a="home-start"]').click();await page.reload();
 saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);expect(saved.workout.restTimer).toBeUndefined();await expect(page.locator('#restbanner')).toBeHidden();
});
test('échec stockage pendant la pause conserve le repos enregistré',async({page})=>{
 await start(page);const before=await page.evaluate(key=>localStorage.getItem(key),key);
 await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError');};});
 await page.locator('[data-a="rest-toggle"]').click();await expect(page.getByRole('status')).toContainText('Enregistrement impossible');
 expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(before);
 await expect(page.locator('[data-a="rest-toggle"]')).toContainText('PAUSE');
 await page.reload();
 // A reload reopens a timer that had not been minimized.
 await expect(page.locator('[data-a="rest-toggle"]')).toBeVisible();
});
