'use strict';

/* Configuración de entorno para el frontend del portal IAGAMI.
 *
 * Este archivo se carga ANTES de cms/pb.js y le indica la URL real de
 * PocketBase para el entorno actual (local / staging / producción),
 * evitando hardcodear endpoints dentro de pb.js.
 *
 * EN PRODUCCIÓN (Vercel u otro hosting): sustituye el valor de PB_URL
 * por la URL pública de tu instancia de PocketBase. Si tu plataforma de
 * despliegue permite generar este archivo en build time desde una
 * variable de entorno, hazlo ahí en lugar de editarlo a mano.
 */
window.__IAGAMI_CONFIG__ = {
  PB_URL: 'http://127.0.0.1:8090',
};
