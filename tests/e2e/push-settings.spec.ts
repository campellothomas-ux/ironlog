import {test,expect} from '@playwright/test';
test('service non configuré ne demande pas de permission et ne promet pas d’alerte',async({page})=>{
 await page.goto('/');await page.locator('[data-nav="you"]').click();await page.locator('[data-a="you-tab"][data-id="more"]').click();
 await expect(page.locator('.page')).toContainText('NOTIFICATIONS DE REPOS');
 await expect(page.locator('.page')).toContainText('Service de test non configuré');
 await expect(page.locator('.page')).toContainText('Les alertes de repos ne sont pas programmées');
 await expect(page.locator('[data-a="push-enable"]')).toHaveCount(0);
});
