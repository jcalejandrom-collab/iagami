import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { beforeEach, vi } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PB_SRC = readFileSync(resolve(__dirname, '../cms/pb.js'), 'utf-8');

/**
 * Carga una instancia fresca de CMSDB en cada test.
 * Evita contaminación de estado entre tests (cache, circuit breaker, etc.).
 */
export function loadCMSDB(fetchMock = undefined) {
  // Resetear el objeto window.CMSDB si existe (estado previo)
  delete window.CMSDB;

  // Inyectar fetch mock en window antes de ejecutar el script
  if (fetchMock) {
    vi.stubGlobal('fetch', fetchMock);
  }

  // Ejecutar el IIFE en el contexto de la ventana jsdom
  // eslint-disable-next-line no-new-func
  new Function(PB_SRC)();

  return window.CMSDB;
}

beforeEach(() => {
  // Limpiar sesión y mocks ANTES de cada test para evitar contaminación
  if (window.CMSDB?.destroy) { window.CMSDB.destroy(); }
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete window.CMSDB;
});
