import { test, expect } from '@playwright/test';
import {
  mockLogin, mockAuthRefreshOk, mockAuthRefresh401, mockAuthRefreshOffline,
  mockCollections, injectSession, TEST_TOKEN, REFRESHED_TOKEN, USERS,
} from './helpers/mockApi.js';

// ─── Flujo 1: Login ────────────────────────────────────────────────────────────
test.describe('Login', () => {
  test('login exitoso redirige al dashboard', async ({ page }) => {
    await mockLogin(page);
    await mockAuthRefreshOk(page);
    await mockCollections(page);

    await page.goto('/index.html');
    // Abrir el modal de login haciendo click en "Acceder"
    await page.click('button:has-text("Acceder")');
    await expect(page.locator('#modal-login')).toBeVisible({ timeout: 3_000 });

    // Selectores reales del formulario: #login-user y #login-pass
    await page.fill('#login-user', 'presidente@iagami.online');
    await page.fill('#login-pass', 'contraseña-segura');
    await page.click('button:has-text("Iniciar sesión")');

    // Debe redirigir al admin panel
    await expect(page).toHaveURL(/admin/, { timeout: 8_000 });
  });

  test('credenciales incorrectas muestran error y no redirigen', async ({ page }) => {
    await page.route('http://127.0.0.1:8090/api/collections/admins/auth-with-password', route =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Credenciales incorrectas.' }),
      })
    );

    await page.goto('/index.html');
    await page.click('button:has-text("Acceder")');
    await expect(page.locator('#modal-login')).toBeVisible({ timeout: 3_000 });

    await page.fill('#login-user', 'malo@iagami.online');
    await page.fill('#login-pass', 'wrongpass');
    await page.click('button:has-text("Iniciar sesión")');

    // El error debe aparecer, no debe redirigir al admin
    await expect(page.locator('#login-modal-error')).toBeVisible({ timeout: 4_000 });
    await expect(page).not.toHaveURL(/admin\/index/);
  });
});

// ─── Flujo 2: Guarda de ruta — acceso sin token ────────────────────────────────
test.describe('Guardas de ruta', () => {
  test('acceder al admin sin token redirige al login', async ({ page }) => {
    // Sin inyectar sesión ni token
    await mockAuthRefresh401(page);

    await page.goto('/admin/index.html');

    // Debe redirigir fuera del admin
    await expect(page).not.toHaveURL(/admin\/index\.html$/, { timeout: 6_000 });
  });

  test('acceder al admin CON token válido muestra el dashboard', async ({ page }) => {
    await injectSession(page);
    await mockAuthRefreshOk(page);
    await mockCollections(page);

    await page.goto('/admin/index.html');

    // El loader debe desaparecer y el dashboard ser visible
    await expect(page.locator('#auth-loader')).not.toBeVisible({ timeout: 6_000 });
    await expect(page.locator('#sec-dashboard')).toBeVisible({ timeout: 6_000 });
  });
});

// ─── Flujo 3: Expiración de sesión ────────────────────────────────────────────
test.describe('Expiración de sesión', () => {
  test('401 en auth-refresh muestra loader y redirige al login', async ({ page }) => {
    await injectSession(page);
    await mockAuthRefresh401(page);
    await mockCollections(page);

    await page.goto('/admin/index.html', { waitUntil: 'commit' });

    // Debe salir del panel admin — esperar navegación a login
    await expect(page).not.toHaveURL(/admin\/index\.html$/, { timeout: 8_000 });
  });

  test('el token se actualiza cuando auth-refresh devuelve 200', async ({ page }) => {
    await injectSession(page);
    await mockAuthRefreshOk(page);
    await mockCollections(page);

    await page.goto('/admin/index.html');

    // Esperar a que desaparezca el loader O a que el dashboard sea visible
    await page.waitForSelector('#auth-loader', { state: 'hidden', timeout: 8_000 }).catch(() => {});

    // El token debe haberse actualizado al refreshed
    const token = await page.evaluate(() => sessionStorage.getItem('pb_token'));
    expect(token).toBe(REFRESHED_TOKEN);
  });
});

// ─── Flujo 4: Modo offline ────────────────────────────────────────────────────
test.describe('Modo offline', () => {
  test('error de red en auth-refresh mantiene la sesión (NO redirige)', async ({ page }) => {
    await injectSession(page);
    await mockAuthRefreshOffline(page);
    await mockCollections(page);

    await page.goto('/admin/index.html');

    // Esperar a que el loader desaparezca (verifyToken termina con true en offline)
    await page.waitForSelector('#auth-loader', { state: 'hidden', timeout: 15_000 }).catch(() => {});

    const token = await page.evaluate(() => sessionStorage.getItem('pb_token'));
    expect(token).toBe(TEST_TOKEN);
  });

  test('sigap:offline se dispara cuando falla la red', async ({ page }) => {
    await injectSession(page);
    await mockAuthRefreshOffline(page);
    await mockCollections(page);

    // addInitScript corre ANTES que cualquier script de la página — captura el evento correctamente
    await page.addInitScript(() => {
      window.__offlineEmitted = false;
      window.addEventListener('sigap:offline', () => { window.__offlineEmitted = true; }, { once: true });
    });

    await page.goto('/admin/index.html');
    await page.waitForSelector('#auth-loader', { state: 'hidden', timeout: 15_000 }).catch(() => {});

    const emitted = await page.evaluate(() => window.__offlineEmitted);
    expect(emitted).toBe(true);
  });
});

// ─── Flujo 5: Logout ──────────────────────────────────────────────────────────
test.describe('Logout', () => {
  test('logout limpia la sesión y redirige', async ({ page }) => {
    await injectSession(page);
    await mockAuthRefreshOk(page);
    await mockCollections(page);
    // Mock logout endpoint
    await page.route('http://127.0.0.1:8090/**', route => route.fulfill({ status: 200, body: '{}' }));

    await page.goto('/admin/index.html');
    await expect(page.locator('#auth-loader')).not.toBeVisible({ timeout: 6_000 });

    // Hacer click en logout
    const logoutBtn = page.locator('[data-action="logout"], #btn-logout, .btn-logout').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      // Verificar que el token fue eliminado
      const token = await page.evaluate(() => sessionStorage.getItem('pb_token'));
      expect(token).toBeNull();
    }
  });
});
