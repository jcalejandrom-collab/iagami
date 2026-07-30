import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadCMSDB } from '../setup.js';

const VALID_TOKEN = 'Bearer eyJvalido.abc.def';
const REFRESHED_TOKEN = 'Bearer eyJrefrescado.xyz.789';

function makeResponse(status, body = {}) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

// Respuesta válida de PocketBase auth-refresh incluye el nuevo token
function makeAuthRefreshOk() {
  return makeResponse(200, { token: REFRESHED_TOKEN, record: { id: 'u1' } });
}

describe('verifyToken()', () => {
  beforeEach(() => {
    vi.useFakeTimers(); // elimina esperas reales del backoff exponencial
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna true y actualiza el token cuando el servidor responde 200', async () => {
    sessionStorage.setItem('pb_token', VALID_TOKEN);
    sessionStorage.setItem('pb_user', JSON.stringify({ id: 'u1' }));

    const CMSDB = loadCMSDB(() => makeAuthRefreshOk());
    const result = await CMSDB.verifyToken();

    expect(result).toBe(true);
    // El token debe actualizarse con el nuevo que devuelve el servidor
    expect(sessionStorage.getItem('pb_token')).toBe(REFRESHED_TOKEN);
  });

  it('retorna false y limpia la sesión cuando el servidor responde 401', async () => {
    sessionStorage.setItem('pb_token', VALID_TOKEN);
    sessionStorage.setItem('pb_user', JSON.stringify({ id: 'u1' }));

    const CMSDB = loadCMSDB(() => makeResponse(401, { message: 'Unauthorized' }));
    const result = await CMSDB.verifyToken();

    expect(result).toBe(false);
    expect(sessionStorage.getItem('pb_token')).toBeNull();
  });

  it('retorna false cuando no hay token almacenado', async () => {
    // sessionStorage ya limpio por beforeEach del setup
    const CMSDB = loadCMSDB(() => makeAuthRefreshOk());
    const result = await CMSDB.verifyToken();
    expect(result).toBe(false);
  });

  it('preserva la sesión cuando hay error de red (offline)', async () => {
    sessionStorage.setItem('pb_token', VALID_TOKEN);
    sessionStorage.setItem('pb_user', JSON.stringify({ id: 'u1' }));

    const CMSDB = loadCMSDB(() => Promise.reject(new TypeError('Failed to fetch')));

    const promise = CMSDB.verifyToken();
    // Avanzar todos los timers (backoff exponencial) de golpe
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe(true);
    expect(sessionStorage.getItem('pb_token')).toBe(VALID_TOKEN);
  });

  it('preserva la sesión cuando el servidor responde 500', async () => {
    sessionStorage.setItem('pb_token', VALID_TOKEN);
    sessionStorage.setItem('pb_user', JSON.stringify({ id: 'u1' }));

    const CMSDB = loadCMSDB(() => makeResponse(500, { message: 'Internal Error' }));

    const promise = CMSDB.verifyToken();
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe(true);
    expect(sessionStorage.getItem('pb_token')).toBe(VALID_TOKEN);
  });

  it('reintenta hasta 3 veces antes de preservar sesión offline', async () => {
    sessionStorage.setItem('pb_token', VALID_TOKEN);
    sessionStorage.setItem('pb_user', JSON.stringify({ id: 'u1' }));

    let calls = 0;
    const CMSDB = loadCMSDB(() => {
      calls++;
      return Promise.reject(new TypeError('Failed to fetch'));
    });

    const promise = CMSDB.verifyToken();
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe(true);
    expect(calls).toBeGreaterThanOrEqual(1);
    expect(calls).toBeLessThanOrEqual(3);
  });

  it('emite sigap:offline cuando se agotan los reintentos de red', async () => {
    sessionStorage.setItem('pb_token', VALID_TOKEN);
    sessionStorage.setItem('pb_user', JSON.stringify({ id: 'u1' }));

    const CMSDB = loadCMSDB(() => Promise.reject(new TypeError('Failed to fetch')));
    const events = [];
    window.addEventListener('sigap:offline', () => events.push(true), { once: true });

    const promise = CMSDB.verifyToken();
    await vi.runAllTimersAsync();
    await promise;

    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it('retorna false y emite sigap:auth-error cuando el servidor no devuelve token', async () => {
    sessionStorage.setItem('pb_token', VALID_TOKEN);
    sessionStorage.setItem('pb_user', JSON.stringify({ id: 'u1' }));

    // Respuesta 200 pero sin campo token (backend corrupto)
    const CMSDB = loadCMSDB(() => makeResponse(200, { valid: true }));
    const authErrors = [];
    window.addEventListener('sigap:auth-error', (e) => authErrors.push(e.detail));

    const result = await CMSDB.verifyToken();

    expect(result).toBe(false);
    expect(authErrors.length).toBe(1);
    expect(authErrors[0].reason).toBe('missing-token');
    // No debe guardar "undefined" en sessionStorage
    const stored = sessionStorage.getItem('pb_token');
    expect(stored).not.toBe('undefined');
    window.removeEventListener('sigap:auth-error', () => {});
  });
});

describe('logout()', () => {
  it('elimina el token y el usuario de sessionStorage', () => {
    sessionStorage.setItem('pb_token', VALID_TOKEN);
    sessionStorage.setItem('pb_user', JSON.stringify({ id: 'u1' }));
    const CMSDB = loadCMSDB(() => makeAuthRefreshOk());

    CMSDB.logout();

    expect(sessionStorage.getItem('pb_token')).toBeNull();
    expect(sessionStorage.getItem('pb_user')).toBeNull();
  });

  it('limpia la caché al hacer logout', async () => {
    sessionStorage.setItem('pb_token', VALID_TOKEN);
    const CMSDB = loadCMSDB(() =>
      makeResponse(200, { items: [{ id: '1', titulo: 'Test' }], totalItems: 1, totalPages: 1 })
    );

    // Poblar caché
    await CMSDB.getAll('noticias');
    CMSDB.logout();

    // La siguiente llamada debe ir a la red
    let fetchCalled = false;
    vi.stubGlobal('fetch', () => {
      fetchCalled = true;
      return makeResponse(200, { items: [], totalItems: 0, totalPages: 1 });
    });

    sessionStorage.setItem('pb_token', VALID_TOKEN);
    await CMSDB.getAll('noticias');
    expect(fetchCalled).toBe(true);
  });
});
