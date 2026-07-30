#!/usr/bin/env node
/**
 * SIGAP — Production Readiness Verifier
 * Verifica la capa repositorio antes de apertura a usuarios reales.
 * Ejecutar: node scripts/verify-production-ready.js
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

let passed = 0;
let failed = 0;
let warned = 0;

function check(label, ok, detail = '') {
  if (ok) {
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function warn(label, detail = '') {
  console.warn(`  ⚠ ${label}${detail ? ` — ${detail}` : ''}`);
  warned++;
}

function exists(rel) {
  return existsSync(join(ROOT, rel));
}

function readFile(rel) {
  const full = join(ROOT, rel);
  return existsSync(full) ? readFileSync(full, 'utf8') : null;
}

// ── 1. Archivos críticos de producción ────────────────────────────────────────

console.log('\n[1] Archivos críticos de producción');
check('index.html (portal público)',         exists('index.html'));
check('admin/index.html (panel admin)',      exists('admin/index.html'));
check('cms/pb.js (cliente PocketBase)',      exists('cms/pb.js'));
check('cms/config.js (configuración)',       exists('cms/config.js'));
check('cms/monitoring.js (observabilidad)', exists('cms/monitoring.js'));
check('_headers (seguridad Cloudflare)',     exists('_headers'));
check('package.json',                        exists('package.json'));
check('package-lock.json',                   exists('package-lock.json'));

// ── 2. Headers de seguridad ───────────────────────────────────────────────────

console.log('\n[2] Headers de seguridad (_headers)');
const headers = readFile('_headers') || '';
check('Strict-Transport-Security',         headers.includes('Strict-Transport-Security'));
check('X-Frame-Options: DENY',             headers.includes('X-Frame-Options') && headers.includes('DENY'));
check('X-Content-Type-Options: nosniff',   headers.includes('nosniff'));
check('Content-Security-Policy presente',  headers.includes('Content-Security-Policy'));
check('Referrer-Policy',                   headers.includes('Referrer-Policy'));
check('Permissions-Policy',                headers.includes('Permissions-Policy'));

const hasEnforcement = /^Content-Security-Policy[^-]/m.test(headers);
const hasReportOnly  = headers.includes('Content-Security-Policy-Report-Only');
if (hasEnforcement) {
  check('CSP en modo Enforcement (activo)', true, 'asegúrese de tener ≥7 días de observación limpia');
} else if (hasReportOnly) {
  warn('CSP en modo Report-Only', 'no bloquea — activar Enforcement con PR #75 tras ≥7 días');
} else {
  check('CSP configurado', false, 'no se encontró ninguna directiva CSP');
}

// ── 3. Secretos hardcodeados ──────────────────────────────────────────────────

console.log('\n[3] Secretos hardcodeados');
const SECRET_PATTERNS = [
  /api[_-]?key\s*[:=]\s*['"][^'"]{8,}/i,
  /password\s*[:=]\s*['"][^'"]{4,}/i,
  /secret\s*[:=]\s*['"][^'"]{8,}/i,
  /token\s*[:=]\s*['"][^'"]{16,}/i,
  /dsn\s*[:=]\s*['"]https?:\/\/[^'"]{10,}/i,
];
const PROD_FILES = [
  'cms/pb.js', 'cms/config.js', 'cms/monitoring.js',
  'admin/index.html', 'index.html',
];
let secretsFound = false;
for (const rel of PROD_FILES) {
  const content = readFile(rel);
  if (!content) { continue; }
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      check(`Sin secretos en ${rel}`, false, `coincidencia con patrón: ${pattern}`);
      secretsFound = true;
      break;
    }
  }
}
if (!secretsFound) {
  check('Sin secretos hardcodeados en archivos de producción', true);
}

// ── 4. console.log en producción ──────────────────────────────────────────────

console.log('\n[4] console.log en producción');
const PROD_JS = ['cms/pb.js', 'cms/monitoring.js', 'cms/config.js', 'cms/animations.js'];
let consoleLogs = 0;
for (const rel of PROD_JS) {
  const content = readFile(rel);
  if (!content) { continue; }
  const matches = content.match(/console\.log\s*\(/g) || [];
  if (matches.length > 0) {
    check(`Sin console.log en ${rel}`, false, `${matches.length} instancia(s)`);
    consoleLogs += matches.length;
  }
}
if (consoleLogs === 0) {
  check('Sin console.log en archivos CMS de producción', true);
}

// ── 5. URL API sin hardcodear ─────────────────────────────────────────────────

console.log('\n[5] Configuración de API');
const configJs = readFile('cms/config.js') || '';
check('URL PocketBase leída desde meta tag',
  configJs.includes('pb-url') || configJs.includes('pbUrl') || configJs.includes('PB_URL'));
check('Sin URL de producción hardcodeada en config.js',
  !(/['"]https?:\/\/api\.iagami\.online/.test(configJs)));

// ── 6. Documentación operativa ────────────────────────────────────────────────

console.log('\n[6] Documentación operativa');
const DOCS = [
  'docs/checklist-lanzamiento.md',
  'docs/disaster-recovery.md',
  'docs/matriz-permisos.md',
  'docs/manual-administrador.md',
  'docs/manual-trabajador.md',
  'docs/politicas-uso.md',
  'docs/production-readiness.md',
  'docs/production-environment-validation.md',
  'docs/seguridad.md',
];
for (const doc of DOCS) {
  check(doc, exists(doc));
}

// ── 7. CI / Workflows ─────────────────────────────────────────────────────────

console.log('\n[7] CI / Workflows');
check('.github/workflows/audit.yml',        exists('.github/workflows/audit.yml'));
check('.github/workflows/secrets-scan.yml', exists('.github/workflows/secrets-scan.yml'));
check('.trufflehog-ignore',                  exists('.trufflehog-ignore'));

// ── 8. Tests disponibles ──────────────────────────────────────────────────────

console.log('\n[8] Tests');
check('tests/ existe',                      exists('tests'));
check('vitest.config.js',                   exists('vitest.config.js'));
check('playwright.config.js',               exists('playwright.config.js'));

const pkg = JSON.parse(readFile('package.json') || '{}');
check('script "test" definido en package.json',  !!(pkg.scripts && pkg.scripts.test));
check('script "lint" definido en package.json',  !!(pkg.scripts && pkg.scripts.lint));

// ── Resumen ───────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(60));
console.log(`Resultado: ${passed} ✓  ${failed} ✗  ${warned} ⚠`);

if (failed === 0) {
  console.log('\n✅ PASS — capa repositorio lista para apertura a usuarios.');
  console.log('   Pendiente: validación de infraestructura VPS (Fase B).');
  process.exit(0);
} else {
  console.error(`\n✗ FAIL — ${failed} verificación(es) fallida(s). Corregir antes de abrir a usuarios.`);
  process.exit(1);
}
