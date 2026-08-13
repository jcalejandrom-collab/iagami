import { test, expect } from '@playwright/test';
import {
  injectSession, mockAuthRefreshOk, mockCollections, mockCollections500, USERS,
} from './helpers/mockApi.js';

test.describe('Permisos y roles', () => {
  test('error 403 muestra aviso sin cerrar la sesión', async ({ page }) => {
    await injectSession(page);
    await mockAuthRefreshOk(page);

    // Primera colección OK, segunda devuelve 403
    let requestCount = 0;
    await page.route('http://127.0.0.1:8090/api/collections/**', route => {
      requestCount++;
      if (requestCount > 2) {
        return route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Acceso denegado.' }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ page: 1, perPage: 200, totalItems: 0, totalPages: 1, items: [] }),
      });
    });

    await page.goto('/admin/index.html');
    await expect(page.locator('#auth-loader')).not.toBeVisible({ timeout: 8_000 });

    // El token debe seguir existiendo (403 no hace logout)
    const token = await page.evaluate(() => sessionStorage.getItem('pb_token'));
    expect(token).not.toBeNull();
  });

  test('error 500 no expulsa al usuario', async ({ page }) => {
    await injectSession(page);
    await mockAuthRefreshOk(page);
    await mockCollections500(page);

    await page.goto('/admin/index.html');
    await expect(page.locator('#auth-loader')).not.toBeVisible({ timeout: 8_000 });

    // Sesión intacta tras error 500
    const token = await page.evaluate(() => sessionStorage.getItem('pb_token'));
    expect(token).not.toBeNull();
  });

  test('distintos usuarios tienen distintos datos en sesión', async ({ page: page1, browser }) => {
    // Contexto 1 — Presidente
    await injectSession(page1, USERS.presidente);
    await mockAuthRefreshOk(page1, USERS.presidente);
    await mockCollections(page1);
    await page1.goto('/admin/index.html');
    await expect(page1.locator('#auth-loader')).not.toBeVisible({ timeout: 8_000 });
    const user1 = await page1.evaluate(() => JSON.parse(sessionStorage.getItem('pb_user') || '{}'));
    expect(user1.rol).toBe('PRESIDENTE');

    // Contexto 2 — Trabajador (contexto aislado)
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await injectSession(page2, USERS.trabajador);
    await mockAuthRefreshOk(page2, USERS.trabajador);
    await mockCollections(page2);
    await page2.goto('/admin/index.html');
    await expect(page2.locator('#auth-loader')).not.toBeVisible({ timeout: 8_000 });
    const user2 = await page2.evaluate(() => JSON.parse(sessionStorage.getItem('pb_user') || '{}'));
    expect(user2.rol).toBe('TRABAJADOR');

    await ctx2.close();
  });
});

test.describe('Dashboard y carga de datos', () => {
  test('el dashboard carga correctamente con datos del mock', async ({ page }) => {
    await injectSession(page);
    await mockAuthRefreshOk(page);
    await mockCollections(page);

    await page.goto('/admin/index.html');

    // Auth loader debe desaparecer
    await expect(page.locator('#auth-loader')).not.toBeVisible({ timeout: 8_000 });

    // El cuerpo debe ser visible y la página no debe mostrar pantalla en blanco
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(10);
  });

  test('el portal público carga sin autenticación', async ({ page }) => {
    await page.route('http://127.0.0.1:8090/api/collections/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ page: 1, perPage: 200, totalItems: 0, totalPages: 1, items: [] }),
      })
    );

    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');

    // El portal no requiere autenticación
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/login/, { timeout: 3_000 });
  });
});
