/**
 * Tests E2E — Módulo Auditoría Institucional (sec-auditoria)
 *
 * Valida: acceso por rol, carga de datos, filtros, paginación, exportación CSV.
 */

import { test, expect } from '@playwright/test';
import {
  mockAuthRefreshOk,
  mockCollections,
  injectSession,
  USERS,
} from './helpers/mockApi.js';

const PB = 'http://127.0.0.1:8090';

// Registros de auditoría de prueba
const AUDIT_ROWS = [
  { id: 'a1', fecha: '2026-07-29T20:00:00Z', usuario: 'presidente@iagami.online', modulo: 'noticias', accion: 'save', nivel: 'info',    detalle: 'Noticia creada' },
  { id: 'a2', fecha: '2026-07-29T20:05:00Z', usuario: 'director@iagami.online',   modulo: 'auth',     accion: 'login', nivel: 'info',   detalle: 'Login correcto' },
  { id: 'a3', fecha: '2026-07-29T20:10:00Z', usuario: 'trabajo@iagami.online',    modulo: 'empresas', accion: 'save', nivel: 'warning', detalle: 'Campo faltante' },
];

/**
 * Intercepta iagami_sys_logs y devuelve filas de prueba.
 * Cede auth-refresh al mock específico (LIFO safety).
 */
async function mockAuditLogs(page, rows = AUDIT_ROWS) {
  await page.route(`${PB}/api/collections/**`, route => {
    const url = route.request().url();
    if (url.includes('/auth-refresh') || url.includes('/auth-with-password')) {
      return route.fallback();
    }
    if (url.includes('/iagami_sys_logs/records')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ page: 1, perPage: 26, totalItems: rows.length, totalPages: 1, items: rows }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ page: 1, perPage: 200, totalItems: 0, totalPages: 1, items: [] }),
    });
  });
}

async function irAuditoria(page) {
  // Click en el nav item de Auditoría
  await page.click('button[data-section="auditoria"]');
}

// ─── PRESIDENTE — acceso completo ─────────────────────────────────────────────
test.describe('PRESIDENTE — acceso a Auditoría', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page, USERS.presidente);
    await mockAuthRefreshOk(page, USERS.presidente);
    await mockCollections(page);
    await mockAuditLogs(page);   // registrado después → LIFO: toma prioridad para iagami_sys_logs
    await page.goto('/admin/index.html');
    await expect(page.locator('#auth-loader')).not.toBeVisible({ timeout: 8_000 });
    await expect(page.locator('#sec-dashboard')).toBeVisible({ timeout: 6_000 });
  });

  test('ve el ítem Auditoría en el sidebar', async ({ page }) => {
    await expect(page.locator('button[data-section="auditoria"]')).toBeVisible();
  });

  test('puede abrir el módulo de Auditoría', async ({ page }) => {
    await irAuditoria(page);
    await expect(page.locator('#sec-auditoria')).toHaveClass(/active/);
  });

  test('ve la tabla con los registros de auditoría', async ({ page }) => {
    await irAuditoria(page);
    await expect(page.locator('#audit-tabla-wrap')).toBeVisible({ timeout: 6_000 });
    await expect(page.locator('#audit-tbody tr')).toHaveCount(3, { timeout: 6_000 });
  });

  test('los filtros son visibles', async ({ page }) => {
    await irAuditoria(page);
    await expect(page.locator('#audit-filtros')).toBeVisible();
    await expect(page.locator('#audit-f-modulo')).toBeVisible();
    await expect(page.locator('#audit-f-nivel')).toBeVisible();
    await expect(page.locator('#audit-f-usuario')).toBeVisible();
  });

  test('el botón Exportar CSV existe y no falla', async ({ page }) => {
    await irAuditoria(page);
    // Selector específico del botón de auditoría (onclick único)
    const csvBtn = page.locator('[onclick="auditExportarCSV()"]');
    await expect(csvBtn).toBeVisible();
    await csvBtn.click();
    // Tras el click el botón vuelve al texto original (no queda en "⏳ Exportando…")
    await expect(csvBtn).toContainText('CSV', { timeout: 5_000 });
  });

  test('NO muestra el panel de acceso denegado', async ({ page }) => {
    await irAuditoria(page);
    const denegado = page.locator('#audit-acceso-denegado');
    await expect(denegado).toBeHidden();
  });
});

// ─── DIRECTOR — acceso completo ───────────────────────────────────────────────
test.describe('DIRECTOR — acceso a Auditoría', () => {
  test('ve la tabla de logs', async ({ page }) => {
    await injectSession(page, USERS.director);
    await mockAuthRefreshOk(page, USERS.director);
    await mockCollections(page);
    await mockAuditLogs(page);
    await page.goto('/admin/index.html');
    await expect(page.locator('#auth-loader')).not.toBeVisible({ timeout: 8_000 });
    await expect(page.locator('#sec-dashboard')).toBeVisible({ timeout: 6_000 });
    await irAuditoria(page);
    await expect(page.locator('#audit-tabla-wrap')).toBeVisible({ timeout: 6_000 });
    await expect(page.locator('#audit-tbody tr')).toHaveCount(3, { timeout: 6_000 });
  });
});

// ─── TRABAJADOR — acceso denegado ─────────────────────────────────────────────
test.describe('TRABAJADOR — acceso denegado a Auditoría', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page, USERS.trabajador);
    await mockAuthRefreshOk(page, USERS.trabajador);
    await mockCollections(page);
    await mockAuditLogs(page);
    await page.goto('/admin/index.html');
    await expect(page.locator('#auth-loader')).not.toBeVisible({ timeout: 8_000 });
    await expect(page.locator('#sec-dashboard')).toBeVisible({ timeout: 6_000 });
  });

  test('muestra el panel de acceso denegado', async ({ page }) => {
    await irAuditoria(page);
    await expect(page.locator('#audit-acceso-denegado')).toBeVisible({ timeout: 4_000 });
  });

  test('NO muestra la tabla de logs', async ({ page }) => {
    await irAuditoria(page);
    const tabla = page.locator('#audit-tabla-wrap');
    await expect(tabla).toBeHidden();
  });
});
