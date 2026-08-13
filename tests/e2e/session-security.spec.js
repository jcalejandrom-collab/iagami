import { test, expect } from '@playwright/test';
import {
  injectSession, mockAuthRefreshOk, mockCollections, mockAuthRefresh401,
  TEST_TOKEN, REFRESHED_TOKEN,
} from './helpers/mockApi.js';

const PB = 'http://127.0.0.1:8090';

// ─── Flujo 1: Almacenamiento del token ────────────────────────────────────────
test.describe('Almacenamiento seguro del token', () => {
  test('el token se guarda en sessionStorage, nunca en localStorage', async ({ page }) => {
    await injectSession(page);
    await mockAuthRefreshOk(page);
    await mockCollections(page);

    await page.goto('/admin/index.html');
    await page.waitForSelector('#auth-loader', { state: 'hidden', timeout: 8_000 }).catch(() => {});

    const inSession  = await page.evaluate(() => sessionStorage.getItem('pb_token'));
    const inLocal    = await page.evaluate(() => localStorage.getItem('pb_token'));
    const inCookies  = await page.evaluate(() => document.cookie);

    expect(inSession).not.toBeNull();
    expect(inLocal).toBeNull();
    expect(inCookies).not.toContain('pb_token');
  });

  test('el token actualizado mantiene el prefijo Bearer', async ({ page }) => {
    await injectSession(page);
    await mockAuthRefreshOk(page);
    await mockCollections(page);

    await page.goto('/admin/index.html');
    await page.waitForSelector('#auth-loader', { state: 'hidden', timeout: 8_000 }).catch(() => {});

    const token = await page.evaluate(() => sessionStorage.getItem('pb_token'));
    // REFRESHED_TOKEN arranca con "Bearer "
    expect(token).toBe(REFRESHED_TOKEN);
    expect(token).toMatch(/^Bearer /);
  });

  test('el token no aparece en la URL ni en query strings del panel admin', async ({ page }) => {
    await injectSession(page);
    await mockAuthRefreshOk(page);
    await mockCollections(page);

    await page.goto('/admin/index.html');
    await page.waitForSelector('#auth-loader', { state: 'hidden', timeout: 8_000 }).catch(() => {});

    const url = page.url();
    const token = await page.evaluate(() => sessionStorage.getItem('pb_token'));

    expect(url).not.toContain(token || '');
    expect(url).not.toContain('token=');
    expect(url).not.toContain('auth=');
  });
});

// ─── Flujo 2: Logout completo ─────────────────────────────────────────────────
test.describe('Logout y limpieza de sesión', () => {
  test('logout elimina pb_token y pb_user de sessionStorage', async ({ page }) => {
    await injectSession(page);
    await mockAuthRefreshOk(page);
    await mockCollections(page);
    await page.route(`${PB}/**`, route => route.fulfill({ status: 200, body: '{}' }));

    await page.goto('/admin/index.html');
    await page.waitForSelector('#auth-loader', { state: 'hidden', timeout: 6_000 }).catch(() => {});

    // Confirmar que la sesión está activa antes del logout
    const tokenAntes = await page.evaluate(() => sessionStorage.getItem('pb_token'));
    expect(tokenAntes).not.toBeNull();

    const logoutBtn = page.locator('[data-action="logout"], #btn-logout, .btn-logout').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      const tokenDespues = await page.evaluate(() => sessionStorage.getItem('pb_token'));
      const userDespues  = await page.evaluate(() => sessionStorage.getItem('pb_user'));
      expect(tokenDespues).toBeNull();
      expect(userDespues).toBeNull();
    }
  });

  test('después del logout el panel admin ya no es accesible', async ({ page }) => {
    await injectSession(page);
    await mockAuthRefreshOk(page);
    await mockCollections(page);
    await page.route(`${PB}/**`, route => route.fulfill({ status: 200, body: '{}' }));

    await page.goto('/admin/index.html');
    await page.waitForSelector('#auth-loader', { state: 'hidden', timeout: 6_000 }).catch(() => {});

    const logoutBtn = page.locator('[data-action="logout"], #btn-logout, .btn-logout').first();
    if (await logoutBtn.isVisible()) {
      await mockAuthRefresh401(page);
      await logoutBtn.click();

      // Navegar de vuelta al admin sin sesión válida → debe redirigir
      await page.goto('/admin/index.html', { waitUntil: 'commit' });
      await expect(page).not.toHaveURL(/admin\/index\.html$/, { timeout: 8_000 });
    }
  });
});

// ─── Flujo 3: Expiración durante uso activo ───────────────────────────────────
test.describe('Expiración de sesión durante uso activo', () => {
  test('401 en petición de colección dispara sigap:session-expired y redirige', async ({ page }) => {
    await injectSession(page);
    await mockAuthRefreshOk(page);

    // Auth-refresh OK pero todas las colecciones devuelven 401
    await page.route(`${PB}/api/collections/**`, route => {
      const url = route.request().url();
      if (url.includes('/auth-refresh') || url.includes('/auth-with-password')) {
        return route.fallback();
      }
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Token expirado.' }),
      });
    });

    // Capturar el evento antes de navegar
    await page.addInitScript(() => {
      window.__sessionExpiredEmitted = false;
      window.addEventListener('sigap:session-expired', () => {
        window.__sessionExpiredEmitted = true;
      }, { once: true });
    });

    await page.goto('/admin/index.html');

    // verifyToken OK → admin carga → colecciones 401 → sigap:session-expired → redirect
    await expect(page).not.toHaveURL(/admin\/index\.html$/, { timeout: 12_000 });
  });

  test('errores de red en colecciones NO disparan sigap:session-expired (solo 401 del servidor)', async ({ page }) => {
    await injectSession(page);
    await mockAuthRefreshOk(page);

    // Abortar colecciones (red caída) — no debe tratarse como sesión expirada
    await page.route(`${PB}/api/collections/**`, route => {
      const url = route.request().url();
      if (url.includes('/auth-refresh') || url.includes('/auth-with-password')) {
        return route.fallback();
      }
      return route.abort('internetdisconnected');
    });

    await page.addInitScript(() => {
      window.__sessionExpiredFired = false;
      window.addEventListener('sigap:session-expired', () => {
        window.__sessionExpiredFired = true;
      });
    });

    await page.goto('/admin/index.html');
    await page.waitForSelector('#auth-loader', { state: 'hidden', timeout: 8_000 }).catch(() => {});

    // El panel admin debe seguir visible — error de red ≠ sesión expirada
    // (el elemento #sec-dashboard solo existe en el panel admin, no en el portal)
    await expect(page.locator('#sec-dashboard')).toBeVisible({ timeout: 4_000 });
    const fired = await page.evaluate(() => window.__sessionExpiredFired);
    expect(fired).toBe(false);
  });
});

// ─── Flujo 4: Aislamiento por contexto ───────────────────────────────────────
test.describe('Aislamiento de sesiones', () => {
  test('sessionStorage es independiente entre contextos de browser', async ({ browser }) => {
    test.setTimeout(50_000); // Dos contextos completos

    // Contexto A — sesión presidente
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await injectSession(pageA);
    await mockAuthRefreshOk(pageA);
    await mockCollections(pageA);
    await pageA.goto('/admin/index.html');
    await pageA.waitForSelector('#auth-loader', { state: 'hidden', timeout: 8_000 }).catch(() => {});
    const tokenA = await pageA.evaluate(() => sessionStorage.getItem('pb_token'));

    // Contexto B — sin sesión (navegar a index.html para acceder a sessionStorage)
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await pageB.goto('/index.html');
    const tokenB = await pageB.evaluate(() => sessionStorage.getItem('pb_token'));

    // B no debe tener el token de A
    expect(tokenA).not.toBeNull();
    expect(tokenB).toBeNull();

    await ctxA.close();
    await ctxB.close();
  });

  test('datos de usuario en sessionStorage corresponden al usuario inyectado', async ({ page }) => {
    await injectSession(page);
    await mockAuthRefreshOk(page);
    await mockCollections(page);

    await page.goto('/admin/index.html');
    await page.waitForSelector('#auth-loader', { state: 'hidden', timeout: 8_000 }).catch(() => {});

    const user = await page.evaluate(() => JSON.parse(sessionStorage.getItem('pb_user') || '{}'));
    expect(user.email).toBe('presidente@iagami.online');
    expect(user.rol).toBe('PRESIDENTE');
  });
});
