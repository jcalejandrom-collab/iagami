/**
 * mockApi.js — Interceptores de red para tests E2E
 *
 * Simula la API PocketBase (127.0.0.1:8090) sin depender de infraestructura real.
 * Todos los tests de E2E usan estas funciones para controlar las respuestas del backend.
 */

const PB = 'http://127.0.0.1:8090';

// ─── Tokens de prueba ─────────────────────────────────────────────────────────
export const TEST_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.mock';
export const REFRESHED_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refreshed.mock';

// ─── Usuarios de prueba por rol ───────────────────────────────────────────────
export const USERS = {
  presidente: { id: 'u_pres', email: 'presidente@iagami.online', rol: 'PRESIDENTE', nombre: 'Ana Presidenta' },
  director:   { id: 'u_dir',  email: 'director@iagami.online',   rol: 'DIRECTOR',   nombre: 'Luis Director'   },
  trabajador: { id: 'u_trab', email: 'trabajo@iagami.online',    rol: 'TRABAJADOR', nombre: 'Pedro Trabajador' },
};

// ─── Datos de colecciones de prueba ──────────────────────────────────────────
const COLLECTIONS = {
  noticias:    [{ id: 'n1', titulo: 'Noticia de prueba', contenido: 'Contenido seguro', created: '2025-01-01' }],
  proyectos:   [{ id: 'p1', nombre: 'Proyecto verde', estado: 'activo', created: '2025-01-01' }],
  bienvenida:  [{ id: 'b1', titulo: '¡Bienvenidos a IAGAMI!', activo: true, created: '2025-01-01' }],
  chatbot_faq: [{ id: 'faq1', pregunta: '¿Qué es IAGAMI?', respuesta: 'Es el Instituto...', created: '2025-01-01' }],
  denuncias:   [],
};

// ─── Helper para respuestas PocketBase paginadas ──────────────────────────────
function pbList(items) {
  return { page: 1, perPage: 200, totalItems: items.length, totalPages: 1, items };
}

// ─── Interceptores principales ────────────────────────────────────────────────

/**
 * Configura un login exitoso para un usuario de prueba.
 * Intercepta POST /api/collections/admins/auth-with-password
 */
export async function mockLogin(page, user = USERS.presidente) {
  await page.route(`${PB}/api/collections/admins/auth-with-password`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: TEST_TOKEN, record: user }),
    })
  );
}

/**
 * Configura auth-refresh exitoso (sesión válida).
 * Intercepta POST /api/collections/admins/auth-refresh
 */
export async function mockAuthRefreshOk(page, user = USERS.presidente) {
  await page.route(`${PB}/api/collections/admins/auth-refresh`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: REFRESHED_TOKEN, record: user }),
    })
  );
}

/**
 * Simula sesión expirada: auth-refresh devuelve 401.
 */
export async function mockAuthRefresh401(page) {
  await page.route(`${PB}/api/collections/admins/auth-refresh`, route =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Token inválido o expirado.' }),
    })
  );
}

/**
 * Simula error de red en auth-refresh (modo offline).
 */
export async function mockAuthRefreshOffline(page) {
  await page.route(`${PB}/api/collections/admins/auth-refresh`, route =>
    route.abort('internetdisconnected')
  );
}

/**
 * Intercepta todas las consultas a colecciones y devuelve datos de prueba.
 */
export async function mockCollections(page) {
  await page.route(`${PB}/api/collections/**`, route => {
    const url = route.request().url();

    // Pasar endpoints de autenticación al handler específico registrado después
    if (url.includes('/auth-refresh') || url.includes('/auth-with-password')) {
      return route.fallback();
    }

    // Identificar la colección por la URL
    const match = url.match(/\/api\/collections\/([^/]+)\/records/);
    const col = match ? match[1] : null;
    const items = col && COLLECTIONS[col] ? COLLECTIONS[col] : [];

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(pbList(items)),
    });
  });
}

/**
 * Simula error 500 del servidor en todas las peticiones a colecciones.
 */
export async function mockCollections500(page) {
  await page.route(`${PB}/api/collections/**`, route => {
    const url = route.request().url();
    if (url.includes('/auth-refresh') || url.includes('/auth-with-password')) {
      return route.fallback();
    }
    return route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Error interno del servidor.' }),
    });
  });
}

/**
 * Inyecta el token de prueba en sessionStorage antes de navegar.
 * Evita tener que pasar por el flujo de login en cada test.
 */
export async function injectSession(page, user = USERS.presidente) {
  await page.addInitScript(({ token, user: u }) => {
    sessionStorage.setItem('pb_token', token);
    sessionStorage.setItem('pb_user', JSON.stringify(u));
  }, { token: TEST_TOKEN, user });
}
