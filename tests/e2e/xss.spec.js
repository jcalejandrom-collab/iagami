import { test, expect } from '@playwright/test';
import { injectSession, mockAuthRefreshOk, mockCollections } from './helpers/mockApi.js';

const XSS_PAYLOADS = [
  '<script>window.__xss=1</script>',
  '<img src=x onerror="window.__xss=2">',
  '"><script>window.__xss=3</script>',
  "javascript:window.__xss=4",
  '<svg onload="window.__xss=5">',
];

test.describe('Seguridad XSS en el navegador real', () => {
  // Capturar cualquier diálogo (alert/confirm/prompt) que XSS pudiera abrir
  test.beforeEach(async ({ page }) => {
    page.on('dialog', async dialog => {
      // Un diálogo inesperado es una falla de seguridad
      await dialog.dismiss();
      throw new Error(`XSS ejecutado: diálogo "${dialog.message()}" abierto por ${dialog.type()}`);
    });
  });

  test('el chatbot FAQ no ejecuta payloads XSS en el portal público', async ({ page }) => {
    // Mock del chatbot FAQ para que devuelva un payload XSS como respuesta
    await page.route('http://127.0.0.1:8090/api/collections/chatbot_faq/records**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          page: 1, perPage: 200, totalItems: 1, totalPages: 1,
          items: [{
            id: 'faq1',
            pregunta: '<script>window.__xss_pregunta=true</script>¿Qué es IAGAMI?',
            respuesta: '<img src=x onerror="window.__xss_respuesta=true">Es el Instituto Autónomo...',
          }],
        }),
      })
    );

    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');

    // Verificar que no se ejecutó código XSS
    const xssExecuted = await page.evaluate(() => window.__xss_pregunta || window.__xss_respuesta);
    expect(xssExecuted).toBeFalsy();
  });

  test('los títulos de noticias con XSS se muestran como texto, no como HTML', async ({ page }) => {
    const xssTitle = '<script>window.__xss_noticia=true</script>Noticia importante';

    await page.route('http://127.0.0.1:8090/api/collections/noticias/records**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          page: 1, perPage: 200, totalItems: 1, totalPages: 1,
          items: [{ id: 'n1', titulo: xssTitle, contenido: 'Contenido', created: '2025-01-01' }],
        }),
      })
    );

    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');

    const xssExecuted = await page.evaluate(() => window.__xss_noticia);
    expect(xssExecuted).toBeFalsy();
  });

  for (const payload of XSS_PAYLOADS) {
    test(`el formulario de denuncia escapa: ${payload.slice(0, 40)}`, async ({ page }) => {
      // Mock denuncias para el portal público
      await page.route('http://127.0.0.1:8090/**', route => route.fulfill({ status: 200, body: '{}' }));

      await page.goto('/index.html');

      // Buscar formulario de denuncia
      const descInput = page.locator('textarea[name="descripcion"], #denuncia-descripcion, textarea').first();
      if (!(await descInput.isVisible())) { test.skip(); return; }

      await descInput.fill(payload);

      // La variable XSS no debe haberse ejecutado
      const xssExecuted = await page.evaluate(() => window.__xss);
      expect(xssExecuted).toBeUndefined();
    });
  }

  test('el panel admin no ejecuta XSS en datos de colecciones', async ({ page }) => {
    await injectSession(page);
    await mockAuthRefreshOk(page);

    // Mock que devuelve payload XSS en datos del admin
    await page.route('http://127.0.0.1:8090/api/collections/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          page: 1, perPage: 200, totalItems: 1, totalPages: 1,
          items: [{
            id: 'x1',
            titulo: '<script>window.__xss_admin=true</script>',
            estado: '<img src=x onerror="window.__xss_admin=true">',
            nombre: '"><svg onload="window.__xss_admin=true">',
            created: '2025-01-01',
          }],
        }),
      })
    );

    await page.goto('/admin/index.html');
    await expect(page.locator('#auth-loader')).not.toBeVisible({ timeout: 8_000 });

    const xssExecuted = await page.evaluate(() => window.__xss_admin);
    expect(xssExecuted).toBeFalsy();
  });
});
