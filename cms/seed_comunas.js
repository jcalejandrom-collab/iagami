/**
 * Seed data: Comunas y Consejos Comunales
 * Municipio Iribarren y Municipio Morán — Estado Lara, Venezuela
 *
 * Coordenadas aproximadas por parroquia.
 * Para refinar: editar lat/lng en el Admin → Consejos Comunales.
 *
 * Uso: importar desde /admin/ con el botón "Sembrar Datos Iniciales"
 *       o ejecutar window.seedIagami() en la consola del navegador.
 */

// Centroides aproximados por parroquia
const PARROQUIA_COORDS = {
  // Municipio Iribarren - Barquisimeto
  'Catedral':              [10.0678, -69.3467],
  'La Concepción':         [10.0580, -69.3350],
  'Santa Rosa':            [10.0490, -69.3600],
  'Tamaca':                [10.0400, -69.3700],
  'Juan de Villegas':      [10.0300, -69.3820],
  'Guerrera Ana Soto':     [10.0350, -69.3880],
  'Unión':                 [10.0450, -69.3550],
  'Aguedo Felipe Alvarado':[10.0550, -69.3440],
  'El Cují':               [10.1100, -69.3500],
  'Buena Vista':           [10.0750, -69.3300],
  'Agua Viva':             [10.0200, -69.3600],
  'Juares':                [10.0650, -69.3800],
  // Municipio Morán - El Tocuyo y alrededores
  'Bolívar (Morán)':       [9.7820,  -69.7920],
  'Morán':                 [9.7900,  -69.8050],
  'Humocaro Bajo':         [9.7200,  -69.8500],
  'La Candelaria':         [9.8100,  -69.7700],
  'Hilario Luna y Luna':   [9.7500,  -69.8200],
  'Humocaro Alto':         [9.6950,  -69.8900],
  'Guárico':               [9.8500,  -69.8000],
  'Anzoátegui':            [9.8700,  -69.7800],
};

// Jitter para separar puntos en la misma parroquia (±0.005°≈500m)
function jitter(base, idx) {
  const offLat = ((idx * 7 + 3) % 11 - 5) * 0.001;
  const offLng = ((idx * 13 + 2) % 11 - 5) * 0.001;
  return [+(base[0] + offLat).toFixed(6), +(base[1] + offLng).toFixed(6)];
}

// ─── COMUNAS ────────────────────────────────────────────────────────────────
const COMUNAS_SEED = [
  // Parroquia Catedral
  { nombre:'IHAJARA SOR',                      parroquia:'Catedral',              municipio:'Iribarren', estado:'Lara' },
  { nombre:'ALEZGA NORTE',                     parroquia:'Catedral',              municipio:'Iribarren', estado:'Lara' },
  { nombre:'ECOLÓGICA GRAL. JACINTO LARA',     parroquia:'Catedral',              municipio:'Iribarren', estado:'Lara' },
  { nombre:'HUELGA SUR',                       parroquia:'Catedral',              municipio:'Iribarren', estado:'Lara' },
  // Parroquia La Concepción
  { nombre:'EL SOL ESEQUIBO',                  parroquia:'La Concepción',         municipio:'Iribarren', estado:'Lara' },
  { nombre:'LIBERTADOR SIMÓN BOLÍVAR',         parroquia:'La Concepción',         municipio:'Iribarren', estado:'Lara' },
  { nombre:'SOCIALISTA DEL SUR',               parroquia:'La Concepción',         municipio:'Iribarren', estado:'Lara' },
  { nombre:'BOLÍVAR ES EL CENTRO',             parroquia:'La Concepción',         municipio:'Iribarren', estado:'Lara' },
  // Parroquia Santa Rosa
  { nombre:'SIMÓN RODRÍGUEZ',                  parroquia:'Santa Rosa',            municipio:'Iribarren', estado:'Lara' },
  { nombre:'EZEQUIEL ZAMORA',                  parroquia:'Santa Rosa',            municipio:'Iribarren', estado:'Lara' },
  { nombre:'EL LIBERTADOR',                    parroquia:'Santa Rosa',            municipio:'Iribarren', estado:'Lara' },
  { nombre:'ROSA INÉS',                        parroquia:'Santa Rosa',            municipio:'Iribarren', estado:'Lara' },
  // Parroquia Tamaca
  { nombre:'TAMACA NUEVA',                     parroquia:'Tamaca',                municipio:'Iribarren', estado:'Lara' },
  { nombre:'CIUDAD NUEVA',                     parroquia:'Tamaca',                municipio:'Iribarren', estado:'Lara' },
  { nombre:'LA UNIDAD',                        parroquia:'Tamaca',                municipio:'Iribarren', estado:'Lara' },
  // Parroquia Juan de Villegas / Guerrera Ana Soto
  { nombre:'ANA SOTO I',                       parroquia:'Guerrera Ana Soto',     municipio:'Iribarren', estado:'Lara' },
  { nombre:'ANA SOTO II',                      parroquia:'Guerrera Ana Soto',     municipio:'Iribarren', estado:'Lara' },
  { nombre:'NUEVA GENERACIÓN',                 parroquia:'Guerrera Ana Soto',     municipio:'Iribarren', estado:'Lara' },
  { nombre:'REVOLUCIÓN BOLIVARIANA',           parroquia:'Guerrera Ana Soto',     municipio:'Iribarren', estado:'Lara' },
  { nombre:'TIERRA FIRME',                     parroquia:'Guerrera Ana Soto',     municipio:'Iribarren', estado:'Lara' },
  // Parroquia Águedo Felipe Alvarado
  { nombre:'PUEBLO NUEVO',                     parroquia:'Aguedo Felipe Alvarado',municipio:'Iribarren', estado:'Lara' },
  { nombre:'LOS OLIVOS',                       parroquia:'Aguedo Felipe Alvarado',municipio:'Iribarren', estado:'Lara' },
  { nombre:'PROGRESISTA',                      parroquia:'Aguedo Felipe Alvarado',municipio:'Iribarren', estado:'Lara' },
  // Parroquia El Cují
  { nombre:'EL CUJÍ PRODUCTIVO',              parroquia:'El Cují',               municipio:'Iribarren', estado:'Lara' },
  { nombre:'NORTE VERDE',                      parroquia:'El Cují',               municipio:'Iribarren', estado:'Lara' },
  { nombre:'EL PILAR',                         parroquia:'El Cují',               municipio:'Iribarren', estado:'Lara' },
];

// ─── CONSEJOS COMUNALES ──────────────────────────────────────────────────────
const CONSEJOS_SEED = [
  // ── Municipio Iribarren ──────────────────────────────────────
  // Parroquia Tamaca
  { nombre:'EL BICENTENARIO',            parroquia:'Tamaca',           municipio:'Iribarren', estado:'Lara' },
  // Parroquia Juan de Villegas
  { nombre:'VILLA CREPUSCULAR',          parroquia:'Juan de Villegas', municipio:'Iribarren', estado:'Lara' },
  { nombre:'FUTURO EN MARCHA',           parroquia:'Juan de Villegas', municipio:'Iribarren', estado:'Lara' },
  { nombre:'PAVIA LA ORQUIDEA',          parroquia:'Juan de Villegas', municipio:'Iribarren', estado:'Lara' },
  { nombre:'LOS VENCEDORES',             parroquia:'Juan de Villegas', municipio:'Iribarren', estado:'Lara' },
  // Parroquia Unión
  { nombre:'MUJERES VENCEDORAS',         parroquia:'Unión',            municipio:'Iribarren', estado:'Lara' },
  { nombre:'CARMEN MENDOZA DE OROPEZA', parroquia:'Unión',            municipio:'Iribarren', estado:'Lara' },
  { nombre:'JUAN SANCHEZ',               parroquia:'Unión',            municipio:'Iribarren', estado:'Lara' },
  { nombre:'UN CAMINO A LA ESPERANZA',   parroquia:'Unión',            municipio:'Iribarren', estado:'Lara' },
  { nombre:'SAN JACINTO 1 PARTE BAJA',   parroquia:'Unión',            municipio:'Iribarren', estado:'Lara' },
  { nombre:'MARCOS DURAN',               parroquia:'Unión',            municipio:'Iribarren', estado:'Lara' },

  // ── Municipio Morán ──────────────────────────────────────────
  // Parroquia Bolívar (El Tocuyo)
  { nombre:'LOS EJIDOS',                  parroquia:'Bolívar (Morán)',  municipio:'Morán', estado:'Lara' },
  { nombre:'LOS LANZEROS DEL CALVARIO',   parroquia:'Bolívar (Morán)',  municipio:'Morán', estado:'Lara' },
  { nombre:'CALLE LAS FLORES',            parroquia:'Bolívar (Morán)',  municipio:'Morán', estado:'Lara' },
  { nombre:'LA ERMITA',                   parroquia:'Bolívar (Morán)',  municipio:'Morán', estado:'Lara' },
  { nombre:'SAN ISIDRO',                  parroquia:'Bolívar (Morán)',  municipio:'Morán', estado:'Lara' },
  { nombre:'EL PROGRESO',                 parroquia:'Bolívar (Morán)',  municipio:'Morán', estado:'Lara' },
  { nombre:'LOS LAURELES',                parroquia:'Bolívar (Morán)',  municipio:'Morán', estado:'Lara' },
  { nombre:'BARRIO NUEVO',                parroquia:'Bolívar (Morán)',  municipio:'Morán', estado:'Lara' },
  { nombre:'LA QUEBRADA',                 parroquia:'Bolívar (Morán)',  municipio:'Morán', estado:'Lara' },
  { nombre:'EL CALVARIO',                 parroquia:'Bolívar (Morán)',  municipio:'Morán', estado:'Lara' },
  { nombre:'SIMÓN BOLÍVAR NORTE',         parroquia:'Bolívar (Morán)',  municipio:'Morán', estado:'Lara' },
  { nombre:'SIMÓN BOLÍVAR SUR',           parroquia:'Bolívar (Morán)',  municipio:'Morán', estado:'Lara' },
  { nombre:'LA ESPERANZA',                parroquia:'Bolívar (Morán)',  municipio:'Morán', estado:'Lara' },
  { nombre:'LOS MANGOS',                  parroquia:'Bolívar (Morán)',  municipio:'Morán', estado:'Lara' },
  { nombre:'SECTOR CENTRO',               parroquia:'Bolívar (Morán)',  municipio:'Morán', estado:'Lara' },
  { nombre:'LOS ALISOS',                  parroquia:'Bolívar (Morán)',  municipio:'Morán', estado:'Lara' },
  { nombre:'CAMPO ALEGRE',                parroquia:'Bolívar (Morán)',  municipio:'Morán', estado:'Lara' },
  { nombre:'LA COLONIA',                  parroquia:'Bolívar (Morán)',  municipio:'Morán', estado:'Lara' },
  { nombre:'EL LLANO',                    parroquia:'Bolívar (Morán)',  municipio:'Morán', estado:'Lara' },
  { nombre:'VILLA NUEVA',                 parroquia:'Bolívar (Morán)',  municipio:'Morán', estado:'Lara' },
  // Parroquia Morán
  { nombre:'LA MONTAÑA',                  parroquia:'Morán',            municipio:'Morán', estado:'Lara' },
  { nombre:'EL ZAMURO',                   parroquia:'Morán',            municipio:'Morán', estado:'Lara' },
  { nombre:'LOS NARANJOS',                parroquia:'Morán',            municipio:'Morán', estado:'Lara' },
  // Parroquia Humocaro Bajo
  { nombre:'HUMOCARO BAJO CENTRAL',       parroquia:'Humocaro Bajo',    municipio:'Morán', estado:'Lara' },
  { nombre:'EL SALADO',                   parroquia:'Humocaro Bajo',    municipio:'Morán', estado:'Lara' },
  { nombre:'LA PARAGUA',                  parroquia:'Humocaro Bajo',    municipio:'Morán', estado:'Lara' },
  // Parroquia La Candelaria
  { nombre:'LA CANDELARIA CENTRAL',       parroquia:'La Candelaria',    municipio:'Morán', estado:'Lara' },
  { nombre:'EL RASTRO',                   parroquia:'La Candelaria',    municipio:'Morán', estado:'Lara' },
  // Parroquia Hilario Luna y Luna
  { nombre:'HILARIO LUNA CENTRAL',        parroquia:'Hilario Luna y Luna', municipio:'Morán', estado:'Lara' },
  { nombre:'EL CEIBO',                    parroquia:'Hilario Luna y Luna', municipio:'Morán', estado:'Lara' },
  // Parroquia Humocaro Alto
  { nombre:'HUMOCARO ALTO CENTRAL',       parroquia:'Humocaro Alto',    municipio:'Morán', estado:'Lara' },
  { nombre:'LAS DELICIAS',                parroquia:'Humocaro Alto',    municipio:'Morán', estado:'Lara' },
  // Parroquia Guárico
  { nombre:'GUÁRICO CENTRAL',             parroquia:'Guárico',          municipio:'Morán', estado:'Lara' },
  { nombre:'LA LOMA',                     parroquia:'Guárico',          municipio:'Morán', estado:'Lara' },
  // Parroquia Anzoátegui
  { nombre:'ANZOÁTEGUI CENTRAL',          parroquia:'Anzoátegui',       municipio:'Morán', estado:'Lara' },
  { nombre:'EL HATILLO',                  parroquia:'Anzoátegui',       municipio:'Morán', estado:'Lara' },
];

// ─── Función principal de siembra ────────────────────────────────────────────
window.seedIagami = async function(opts = {}) {
  const { dryRun = false, skipExisting = true } = opts;
  const log = [];

  if (!window.CMSDB) {
    alert('CMSDB no disponible. Abre este script desde /admin/.');
    return;
  }

  // Verificar si ya hay datos
  let existingComunas = [], existingConsejos = [];
  try {
    existingComunas  = (await window.CMSDB.getAll('comunas', {perPage:500})).items || [];
    existingConsejos = (await window.CMSDB.getAll('consejos_comunales', {perPage:500})).items || [];
  } catch(e) { /* colecciones vacías o inexistentes */ }

  const existingComunaNames  = new Set(existingComunas.map(c => c.nombre?.toUpperCase()));
  const existingConsejoNames = new Set(existingConsejos.map(c => c.nombre?.toUpperCase()));

  // Mapa nombre→id de comunas creadas (para asignar FK en consejos)
  const comunaIdMap = {};
  existingComunas.forEach(c => { comunaIdMap[c.nombre?.toUpperCase()] = c.id; });

  // ── Sembrar Comunas ──────────────────────────────────────────
  const comunaCounters = {};
  for (const c of COMUNAS_SEED) {
    const key = c.nombre.toUpperCase();
    if (skipExisting && existingComunaNames.has(key)) {
      // Registrar ID existente para FK
      const ex = existingComunas.find(x => x.nombre?.toUpperCase() === key);
      if (ex) comunaIdMap[key] = ex.id;
      log.push(`⚪ [SKIP] COMUNA: ${c.nombre}`);
      continue;
    }
    const base = PARROQUIA_COORDS[c.parroquia] || [10.0678, -69.3467];
    const idx  = (comunaCounters[c.parroquia] = (comunaCounters[c.parroquia] || 0) + 1);
    const [lat, lng] = jitter(base, idx);
    const payload = { ...c, lat, lng, tipo: 'Comuna', activo: true };
    if (!dryRun) {
      try {
        const rec = await window.CMSDB.save('comunas', payload);
        comunaIdMap[key] = rec.id;
        log.push(`✅ COMUNA: ${c.nombre} [${lat},${lng}]`);
      } catch(e) {
        log.push(`❌ ERROR COMUNA ${c.nombre}: ${e.message}`);
      }
    } else {
      log.push(`🔍 [DRY] COMUNA: ${c.nombre} → lat:${lat} lng:${lng}`);
    }
  }

  // ── Sembrar Consejos Comunales ───────────────────────────────
  const consejoCounters = {};
  for (const cc of CONSEJOS_SEED) {
    const key = cc.nombre.toUpperCase();
    if (skipExisting && existingConsejoNames.has(key)) {
      log.push(`⚪ [SKIP] CONSEJO: ${cc.nombre}`);
      continue;
    }
    const base = PARROQUIA_COORDS[cc.parroquia] || [10.0678, -69.3467];
    const idx  = (consejoCounters[cc.parroquia] = (consejoCounters[cc.parroquia] || 0) + 1);
    const [lat, lng] = jitter(base, idx);

    // Intentar asignar comunaId si se conoce el nombre por parroquia
    // (primera comunas de esa parroquia como FK default)
    const comunaDefault = COMUNAS_SEED.find(c => c.parroquia === cc.parroquia);
    const comunaId = comunaDefault ? comunaIdMap[comunaDefault.nombre.toUpperCase()] : null;

    const payload = {
      nombre: cc.nombre,
      parroquia: cc.parroquia,
      municipio: cc.municipio,
      estado: cc.estado,
      lat, lng,
      tipo: 'Consejo Comunal',
      activo: true,
      ...(comunaId ? { comuna: comunaId } : {}),
    };
    if (!dryRun) {
      try {
        await window.CMSDB.save('consejos_comunales', payload);
        log.push(`✅ CONSEJO: ${cc.nombre} [${lat},${lng}]`);
      } catch(e) {
        log.push(`❌ ERROR CONSEJO ${cc.nombre}: ${e.message}`);
      }
    } else {
      log.push(`🔍 [DRY] CONSEJO: ${cc.nombre} → lat:${lat} lng:${lng}`);
    }
  }

  console.log('\n=== SEED IAGAMI ===\n' + log.join('\n'));
  return log;
};

// Auto-ejecutar si está cargado con ?autorun=1
if (new URLSearchParams(location.search).get('autorun') === '1') {
  document.addEventListener('DOMContentLoaded', () => window.seedIagami());
}
