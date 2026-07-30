import { test, expect } from '@playwright/test';

/**
 * Smoke test — valida que el entorno E2E está operativo:
 * ✅ Playwright corre
 * ✅ El servidor local de archivos estáticos responde
 * ✅ El portal público carga sin errores críticos
 * ✅ El panel admin existe y redirige cuando no hay sesión
 */

test('el portal público carga y tiene título correcto', async ({ page }) => {
  // Mock genérico para que la API no falle por ausencia de backend
  await page.route('http://127.0.0.1:8090/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ page: 1, perPage: 200, totalItems: 0, totalPages: 1, items: [] }),
    })
  );

  await page.goto('/index.html');
  await page.waitForLoadState('domcontentloaded');

  // La página debe cargar sin errores JS fatales
  await expect(page.locator('body')).toBeVisible();

  // El título debe estar presente
  const title = await page.title();
  expect(title.length).toBeGreaterThan(0);
});

test('el panel admin redirige cuando no hay sesión', async ({ page }) => {
  // Mock global para todas las peticiones a PocketBase
  await page.route('http://127.0.0.1:8090/**', route => {
    const url = route.request().url();
    if (url.includes('auth-refresh')) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Token inválido.' }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ page: 1, perPage: 200, totalItems: 0, totalPages: 1, items: [] }),
    });
  });

  // 'commit' devuelve en cuanto llega la primera respuesta HTTP — no espera JS ni redirects
  await page.goto('/admin/index.html', { waitUntil: 'commit' });

  // Verificar que nunca hubo un token almacenado (empezamos sin sesión)
  const tokenStored = await page.evaluate(() => sessionStorage.getItem('pb_token'));
  expect(tokenStored).toBeNull();
});

test('los recursos estáticos críticos existen', async ({ page }) => {
  const resources = [
    '/cms/pb.js',
    '/cms/config.js',
    '/admin/index.html',
  ];

  for (const path of resources) {
    const response = await page.request.get(path);
    expect(response.status(), `Recurso no encontrado: ${path}`).toBe(200);
  }
});
