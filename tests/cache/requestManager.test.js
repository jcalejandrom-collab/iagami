import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadCMSDB } from '../setup.js';

const TOKEN = 'Bearer eyJtest.abc.def';

function makePageResponse(items = [], total = 0) {
  return Promise.resolve(
    new Response(
      JSON.stringify({ items, totalItems: total, totalPages: 1, page: 1 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  );
}

describe('Request Manager — deduplicación de promesas', () => {
  it('dos llamadas simultáneas a la misma colección generan una sola petición HTTP', async () => {
    let fetchCount = 0;
    const CMSDB = loadCMSDB(() => {
      fetchCount++;
      return makePageResponse([{ id: '1', titulo: 'Noticia' }], 1);
    });
    sessionStorage.setItem('pb_token', TOKEN);

    // Lanzar dos llamadas en paralelo SIN esperar
    const [r1, r2] = await Promise.all([
      CMSDB.getAll('noticias'),
      CMSDB.getAll('noticias'),
    ]);

    expect(fetchCount).toBe(1);
    expect(r1).toEqual(r2);
    expect(r1).toHaveLength(1);
  });

  it('una segunda llamada después de que la primera resuelve SÍ genera nueva petición', async () => {
    let fetchCount = 0;
    const CMSDB = loadCMSDB(() => {
      fetchCount++;
      return makePageResponse([{ id: '1' }], 1);
    });
    sessionStorage.setItem('pb_token', TOKEN);

    await CMSDB.getAll('noticias');
    // Limpiar caché para forzar nueva petición de red
    CMSDB.clearCache('noticias');
    await CMSDB.getAll('noticias');

    expect(fetchCount).toBeGreaterThanOrEqual(2);
  });

  it('dos llamadas a colecciones distintas generan dos peticiones independientes', async () => {
    let fetchCount = 0;
    const CMSDB = loadCMSDB(() => {
      fetchCount++;
      return makePageResponse([], 0);
    });
    sessionStorage.setItem('pb_token', TOKEN);

    await Promise.all([
      CMSDB.getAll('noticias'),
      CMSDB.getAll('proyectos'),
    ]);

    expect(fetchCount).toBe(2);
  });
});

describe('Cache stale-while-revalidate', () => {
  it('primera llamada va a la red y popula el caché', async () => {
    let fetchCount = 0;
    const CMSDB = loadCMSDB(() => {
      fetchCount++;
      return makePageResponse([{ id: '1', titulo: 'A' }], 1);
    });
    sessionStorage.setItem('pb_token', TOKEN);

    const result = await CMSDB.getAll('noticias');

    expect(fetchCount).toBe(1);
    expect(result).toHaveLength(1);
  });

  it('segunda llamada inmediata devuelve desde caché (0 peticiones adicionales)', async () => {
    let fetchCount = 0;
    const CMSDB = loadCMSDB(() => {
      fetchCount++;
      return makePageResponse([{ id: '1' }], 1);
    });
    sessionStorage.setItem('pb_token', TOKEN);

    await CMSDB.getAll('noticias'); // Pobla caché
    fetchCount = 0;                 // Resetear contador

    await CMSDB.getAll('noticias'); // Debe venir del caché

    expect(fetchCount).toBe(0);
  });

  it('clearCache() fuerza nueva petición de red', async () => {
    let fetchCount = 0;
    const CMSDB = loadCMSDB(() => {
      fetchCount++;
      return makePageResponse([{ id: '1' }], 1);
    });
    sessionStorage.setItem('pb_token', TOKEN);

    await CMSDB.getAll('noticias');
    CMSDB.clearCache('noticias');
    fetchCount = 0;

    await CMSDB.getAll('noticias');

    expect(fetchCount).toBeGreaterThanOrEqual(1);
  });

  it('clearCache() sin colección limpia todo el caché', async () => {
    let fetchCount = 0;
    const CMSDB = loadCMSDB(() => {
      fetchCount++;
      return makePageResponse([], 0);
    });
    sessionStorage.setItem('pb_token', TOKEN);

    await CMSDB.getAll('noticias');
    await CMSDB.getAll('proyectos');
    CMSDB.clearCache(); // limpiar todo
    fetchCount = 0;

    await Promise.all([
      CMSDB.getAll('noticias'),
      CMSDB.getAll('proyectos'),
    ]);

    expect(fetchCount).toBe(2);
  });
});
