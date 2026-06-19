'use strict';

/* =====================================================
   IAGAMI CMS — Persistent localStorage database
   Instituto Autónomo de Gestión Ambiental, Municipio Iribarren
   Exposed as global: CMSDB
   ===================================================== */

const CMSDB = (() => {

  const KEYS = {
    noticias:    'iagami_cms_noticias',
    tramites:    'iagami_cms_tramites',
    eventos:     'iagami_cms_eventos',
    documentos:  'iagami_cms_documentos',
    org:         'iagami_cms_org',
    proyectos:   'iagami_cms_proyectos',
    indicadores: 'iagami_cms_indicadores',
    empresas:    'iagami_cms_empresas',
    alertas:     'iagami_cms_alertas',
    multas:      'iagami_cms_multas',
    denuncias:   'iagami_cms_denuncias',
    media:       'iagami_cms_media',
    consejos:    'iagami_cms_consejos',
    bienvenida:   'iagami_cms_bienvenida',
    planificacion:'iagami_cms_planificacion',
    revistas:       'iagami_cms_revistas',
    reportes_pago:  'iagami_cms_reportes_pago'
  };

  /* ─────────────────────────────────────────
     Utility helpers
  ───────────────────────────────────────── */

  function uid() {
    return (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function now() {
    return new Date().toISOString();
  }

  /* ─────────────────────────────────────────
     Low-level read / write
  ───────────────────────────────────────── */

  function _read(storageKey) {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('[CMSDB] read error →', storageKey, e);
      return [];
    }
  }

  function _write(storageKey, data) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('[CMSDB] write error →', storageKey, e);
      if (e && e.name === 'QuotaExceededError') {
        alert('Error crítico: almacenamiento local lleno. Por favor, limpie el sistema desde el panel de mantenimiento.');
      }
      return false;
    }
  }

  function _key(collection) {
    return KEYS[collection] || collection;
  }

  /* ─────────────────────────────────────────
     Public CRUD API
  ───────────────────────────────────────── */

  /**
   * Return all items in a collection.
   * @param {string} collection - key name from KEYS or raw localStorage key
   */
  function getAll(collection) {
    return _read(_key(collection));
  }

  /**
   * Return a single item by id, or null.
   */
  function getOne(collection, id) {
    return getAll(collection).find(item => item.id === id) || null;
  }

  /**
   * Insert (no id) or update (has id) an item.
   * Automatically sets created_at / updated_at.
   * Returns the saved item.
   */
  function save(collection, item) {
    const storageKey = _key(collection);
    const list = _read(storageKey);

    if (!item.id) {
      // INSERT
      item = Object.assign({}, item, {
        id:         uid(),
        created_at: now(),
        updated_at: now()
      });
      list.push(item);
    } else {
      // UPDATE
      const idx = list.findIndex(i => i.id === item.id);
      item = Object.assign({}, item, { updated_at: now() });
      if (idx >= 0) {
        list[idx] = item;
      } else {
        if (!item.created_at) item.created_at = now();
        list.push(item);
      }
    }

    _write(storageKey, list);
    return item;
  }

  /**
   * Delete an item by id.
   * Returns true if something was removed, false otherwise.
   */
  function remove(collection, id) {
    const storageKey = _key(collection);
    const list = _read(storageKey);
    const next = list.filter(i => i.id !== id);
    if (next.length === list.length) return false;
    _write(storageKey, next);
    return true;
  }

  /* ─────────────────────────────────────────
     Internal seed helper
     Only writes if collection is empty.
  ───────────────────────────────────────── */

  function _seed(collection, items) {
    const storageKey = _key(collection);
    const initKey = storageKey + '_initialized';
    const existing = _read(storageKey);
    if (localStorage.getItem(initKey) && existing.length > 0) return;
    if (items.length === 0 && existing.length > 0) return;
    const stamped = items.map(item => Object.assign({
      created_at: now(),
      updated_at: now()
    }, item));
    _write(storageKey, stamped);
    localStorage.setItem(initKey, 'true');
  }

  /* ═══════════════════════════════════════════════════
     SEED DATA
     Called once (guarded by _seed's length check).
  ═══════════════════════════════════════════════════ */

  function seedAll() {

    /* ── NOTICIAS ── */
    _seed('noticias', [
      {
        id:        'noticia-001',
        titulo:    'Jornada de reforestación en el Parque del Este beneficia 200 familias',
        categoria: 'Medio Ambiente',
        fecha:     '2026-05-28',
        autor:     'Dirección de Proyectos',
        estado:    'publicado',
        destacada: true,
        imagen:    null,
        contenido: [
          'La Instancia de Atención a la Gestión Ambiental del Municipio Iribarren (IAGAMI) llevó a cabo una exitosa jornada de reforestación en el Parque del Este de Barquisimeto, en la que participaron más de 350 voluntarios entre funcionarios, estudiantes y vecinos organizados. Durante la actividad se plantaron 1.200 árboles nativos de las especies samán, araguaney y jabillo, con el objetivo de recuperar las áreas verdes degradadas del parque.',
          'La iniciativa forma parte del Plan de Recuperación de Espacios Naturales Urbanos impulsado por la dirección, que busca incrementar la cobertura boscosa del municipio en un 20 % para el año 2027. Según datos del monitoreo ambiental de IAGAMI, las temperaturas en las zonas reforestadas pueden reducirse hasta 4 °C en comparación con áreas sin cobertura vegetal, lo que representa un beneficio directo para las aproximadamente 200 familias que habitan los sectores adyacentes al parque.',
          'El Director General de IAGAMI destacó que este tipo de acciones fortalecen el compromiso institucional con la sostenibilidad y la participación ciudadana: "Cada árbol plantado hoy es una inversión en el bienestar de las generaciones futuras de Barquisimeto. La unión de la institución con las comunidades es el motor de nuestra gestión ambiental". La próxima jornada de reforestación está programada para el mes de julio en la parroquia Santa Rosa.'
        ].join('\n\n')
      },
      {
        id:        'noticia-002',
        titulo:    'Nuevo sistema de monitoreo de calidad del agua en el Río Turbio',
        categoria: 'Comunidad',
        fecha:     '2026-05-25',
        autor:     'Dirección de Calidad Ambiental',
        estado:    'publicado',
        destacada: false,
        imagen:    null,
        contenido: [
          'IAGAMI instaló cuatro estaciones de monitoreo en tiempo real a lo largo del curso del Río Turbio para medir parámetros fisicoquímicos y microbiológicos del agua. Los datos recolectados se integran a una plataforma digital de acceso público que permite a ciudadanos, investigadores y entes gubernamentales consultar el estado del afluente en cualquier momento.',
          'Las estaciones miden variables como pH, turbidez, oxígeno disuelto, conductividad eléctrica y presencia de coliformes fecales. El sistema genera alertas automáticas cuando algún indicador supera los umbrales establecidos por las normas venezolanas de calidad del agua (COVENIN 1431). Esta tecnología fue adquirida mediante un convenio con la Universidad Centroccidental Lisandro Alvarado (UCLA) y representa una inversión significativa en equipos especializados de última generación.',
          'La Directora de Calidad Ambiental explicó que los primeros resultados muestran una mejora significativa en el sector norte del río gracias a las acciones de control de vertidos industriales realizadas durante el primer trimestre del año. Se espera extender la red de monitoreo a los afluentes principales en los próximos seis meses, completando así la cobertura total de los cuerpos de agua del municipio.'
        ].join('\n\n')
      },
      {
        id:        'noticia-003',
        titulo:    'IAGAMI actualiza reglamento de permisos para actividades industriales',
        categoria: 'Normativa',
        fecha:     '2026-05-20',
        autor:     'Dirección Jurídica',
        estado:    'publicado',
        destacada: false,
        imagen:    null,
        contenido: [
          'Mediante Resolución N° 012-2026, IAGAMI actualizó el reglamento interno que regula la obtención de permisos ambientales para actividades industriales en el Municipio Iribarren. Los cambios más relevantes incluyen la reducción de los plazos de respuesta, la digitalización de la presentación de documentos y la incorporación de criterios de economía circular en la evaluación de proyectos.',
          'Entre las modificaciones más destacadas se encuentra la obligatoriedad de presentar un Plan de Gestión de Residuos Sólidos para empresas con más de 20 empleados, así como la realización de inspecciones trimestrales en lugar de semestrales para los establecimientos de categoría de riesgo alto. El nuevo reglamento también establece sanciones progresivas para quienes incumplan los requisitos de seguimiento ambiental.',
          'El documento completo está disponible en la sección de Transparencia del portal institucional y en las instalaciones de IAGAMI. Todos los permisos otorgados bajo el régimen anterior tienen un período de adecuación de 90 días hábiles para ajustarse a las nuevas disposiciones normativas.'
        ].join('\n\n')
      },
      {
        id:        'noticia-004',
        titulo:    'Campaña de educación ambiental llega a 15 escuelas del municipio',
        categoria: 'Educación',
        fecha:     '2026-05-15',
        autor:     'Dirección de Comunicaciones',
        estado:    'publicado',
        destacada: true,
        imagen:    null,
        contenido: [
          'El programa "Ambiente en el Aula" de IAGAMI completó su primera fase al llegar a 15 instituciones educativas del Municipio Iribarren con talleres, materiales didácticos y actividades prácticas sobre reciclaje, conservación del agua y biodiversidad local. En total, más de 4.200 estudiantes de educación primaria participaron en las actividades durante el mes de mayo.',
          'Los facilitadores del programa —técnicos especializados de la Dirección de Comunicaciones de IAGAMI— utilizaron materiales reciclados para las demostraciones, lo que reforzó el mensaje de reutilización creativa. Cada escuela recibió un kit ambiental que incluye semillas nativas, composteras artesanales y guías didácticas alineadas con el currículo bolivariano. Los docentes participantes fueron capacitados para continuar impartiendo los contenidos durante el resto del año escolar.',
          'La segunda fase del programa está prevista para el mes de septiembre e incluirá la creación de huertos escolares en cinco liceos del municipio. IAGAMI invita a otras instituciones educativas interesadas a inscribirse a través del portal o llamando directamente a la Dirección de Comunicaciones.'
        ].join('\n\n')
      },
      {
        id:        'noticia-005',
        titulo:    'Exitosa jornada de limpieza en el Parque Ayacucho',
        categoria: 'Comunidad',
        fecha:     '2026-05-10',
        autor:     'Dirección de Proyectos',
        estado:    'publicado',
        destacada: false,
        imagen:    null,
        contenido: [
          'Este sábado, más de 200 vecinos y funcionarios de IAGAMI se dieron cita en el Parque Ayacucho para realizar una jornada de limpieza y embellecimiento de este icónico espacio barquisimetano. Durante la actividad se recolectaron más de 2 toneladas de residuos sólidos, los cuales fueron clasificados en orgánicos, reciclables e inservibles para su disposición adecuada.',
          'Además de la limpieza, se realizaron podas de mantenimiento, pintura de bordillos y se plantaron flores y plantas ornamentales en los canteros del parque. La Alcaldía del Municipio Iribarren colaboró con la dotación de herramientas y el transporte de los residuos al centro de acopio municipal. Los consejos comunales de las parroquias Catedral y Concepción organizaron la logística vecinal.',
          'El impacto de este tipo de jornadas trasciende lo ambiental: generan sentido de pertenencia y fortalecen los lazos comunitarios. IAGAMI programará jornadas similares en otros parques del municipio durante el segundo semestre del año, priorizando los espacios con mayor índice de deterioro ambiental.'
        ].join('\n\n')
      },
      {
        id:        'noticia-006',
        titulo:    'IAGAMI firma convenio con UPEL para investigación ambiental',
        categoria: 'Institucional',
        fecha:     '2026-05-05',
        autor:     'Dirección General',
        estado:    'publicado',
        destacada: false,
        imagen:    null,
        contenido: [
          'IAGAMI y la Universidad Pedagógica Experimental Libertador (UPEL) — Instituto Pedagógico de Barquisimeto suscribieron un convenio marco de cooperación institucional orientado al desarrollo de proyectos de investigación ambiental aplicada en el Municipio Iribarren. El acuerdo tiene una vigencia de dos años y contempla la realización conjunta de estudios de biodiversidad, talleres de capacitación docente y la co-publicación de resultados científicos.',
          'Entre los primeros proyectos derivados del convenio se encuentran un inventario de aves migratorias en el cerro Terepaima y un estudio sobre la calidad del suelo en zonas agrícolas periurbanas. Estudiantes de los programas de Biología y Geografía participarán como asistentes de investigación, lo que constituye una valiosa oportunidad de formación práctica en el campo ambiental.',
          'El rector de la UPEL-IPB señaló que este convenio refuerza el compromiso de la universidad con el desarrollo sustentable de la región: "La investigación ambiental de calidad requiere alianzas sólidas con las instituciones del Estado, y IAGAMI es un socio estratégico fundamental para lograr un impacto real en nuestra comunidad".'
        ].join('\n\n')
      }
    ]);

    /* ── TRÁMITES ── */
    _seed('tramites', [
      {
        id:               'tramite-001',
        nombre:           'Permiso Ambiental de Actividades',
        categoria:        'Permisos',
        descripcion:      'Autorización institucional requerida para el inicio o continuación de actividades productivas, comerciales o de servicios que puedan generar impacto ambiental en el Municipio Iribarren. Es el instrumento legal que garantiza que la actividad cumple con las normativas ambientales vigentes.',
        tiempo_respuesta: '15 días hábiles',
        costo:            'Gratuito',
        estado:           'activo',
        requisitos: [
          'Solicitud formal dirigida al Director General de IAGAMI',
          'RIF actualizado de la empresa o persona natural',
          'Croquis de ubicación georreferenciado del establecimiento',
          'Memoria descriptiva de la actividad a desarrollar',
          'Plan de manejo de residuos sólidos y líquidos',
          'Cédula de identidad del representante legal',
          'Registro Mercantil (personas jurídicas)'
        ],
        pasos: [
          'Consignar el expediente completo en la ventanilla de trámites de IAGAMI',
          'Recepción y registro del expediente — se entrega número de control',
          'Revisión técnica y jurídica del expediente (5 días hábiles)',
          'Inspección de campo al establecimiento (5 días hábiles)',
          'Elaboración del informe técnico y dictamen',
          'Emisión y firma del permiso por el Director General',
          'Notificación y entrega del permiso al solicitante'
        ]
      },
      {
        id:               'tramite-002',
        nombre:           'Certificado de Conformidad Ambiental',
        categoria:        'Certificaciones',
        descripcion:      'Documento que acredita que un establecimiento o actividad cumple con los estándares ambientales exigidos por IAGAMI y la normativa nacional. Es requerido para la renovación de licencias de funcionamiento ante la Alcaldía del Municipio Iribarren.',
        tiempo_respuesta: '10 días hábiles',
        costo:            '0.5 UT',
        estado:           'activo',
        requisitos: [
          'Solicitud formal con datos completos del establecimiento',
          'Copia del Permiso Ambiental de Actividades vigente',
          'Informe de auditoría ambiental interna (últimos 6 meses)',
          'Comprobante de pago de la tasa administrativa correspondiente',
          'Registro de disposición de residuos del último año'
        ],
        pasos: [
          'Presentar la solicitud con la documentación requerida en ventanilla',
          'Verificación del pago de la tasa administrativa',
          'Revisión documental por el equipo técnico de IAGAMI',
          'Inspección de verificación en el establecimiento',
          'Emisión del Certificado de Conformidad Ambiental'
        ]
      },
      {
        id:               'tramite-003',
        nombre:           'Registro Ambiental Empresarial',
        categoria:        'Registros',
        descripcion:      'Inscripción de empresas y establecimientos en el Registro Ambiental Municipal de IAGAMI. El registro es obligatorio para todas las empresas industriales, comerciales y de servicios del municipio y constituye la base del sistema de seguimiento ambiental institucional.',
        tiempo_respuesta: '7 días hábiles',
        costo:            'Gratuito',
        estado:           'activo',
        requisitos: [
          'Planilla de inscripción (disponible en sede IAGAMI o en el portal)',
          'Acta constitutiva y Registro Mercantil vigente',
          'RIF actualizado de la empresa',
          'Cédula de identidad del representante legal',
          'Descripción general de las actividades productivas y localización'
        ],
        pasos: [
          'Obtener y completar la planilla de inscripción',
          'Consignar la planilla con los documentos requeridos en ventanilla',
          'Verificación y validación documental (2 días hábiles)',
          'Asignación del Número de Registro Ambiental (NRA)',
          'Incorporación al sistema de seguimiento ambiental de IAGAMI',
          'Entrega del certificado de inscripción al solicitante'
        ]
      },
      {
        id:               'tramite-004',
        nombre:           'Licencia de Funcionamiento Ambiental',
        categoria:        'Licencias',
        descripcion:      'Licencia expedida por IAGAMI que habilita el funcionamiento de establecimientos de alto impacto ambiental tales como plantas industriales, talleres mecánicos, lavanderías industriales, empresas mineras y similares. Requiere inspección técnica previa y es de renovación anual.',
        tiempo_respuesta: '20 días hábiles',
        costo:            'Gratuito',
        estado:           'activo',
        requisitos: [
          'Solicitud formal con descripción detallada del proceso productivo',
          'Registro Ambiental Empresarial vigente',
          'Estudio de impacto ambiental (para empresas de categoría A)',
          'Planos del establecimiento aprobados por ingeniería municipal',
          'Plan de contingencia ambiental actualizado',
          'Póliza de responsabilidad civil ambiental vigente',
          'Comprobante de disposición final de residuos peligrosos'
        ],
        pasos: [
          'Presentar la solicitud con toda la documentación indicada en ventanilla',
          'Revisión de admisibilidad del expediente (3 días hábiles)',
          'Evaluación técnica y jurídica del expediente (7 días hábiles)',
          'Inspección técnica al establecimiento (5 días hábiles)',
          'Sesión del Comité de Evaluación Ambiental',
          'Elaboración y firma de la Licencia de Funcionamiento Ambiental',
          'Entrega de la licencia y registro en el sistema de control institucional'
        ]
      },
      {
        id:               'tramite-005',
        nombre:           'Certificado de No Afectación',
        categoria:        'Certificaciones',
        descripcion:      'Documento que certifica que una determinada área, parcela o actividad no genera afectación ambiental significativa sobre recursos naturales protegidos, zonas de amortiguación o ecosistemas sensibles. Es frecuentemente requerido por notarías, registros inmobiliarios y organismos financieros.',
        tiempo_respuesta: '5 días hábiles',
        costo:            'Gratuito',
        estado:           'activo',
        requisitos: [
          'Solicitud formal con identificación precisa del área o actividad',
          'Documento de propiedad o posesión del terreno',
          'Croquis o plano de ubicación del área con coordenadas',
          'Cédula de identidad vigente del solicitante',
          'Descripción del uso previsto del área o actividad a certificar'
        ],
        pasos: [
          'Presentar la solicitud con la documentación completa en ventanilla',
          'Verificación catastral y ambiental del área en bases de datos (2 días hábiles)',
          'Inspección de campo si fuere necesario por el técnico evaluador',
          'Elaboración y firma del Certificado de No Afectación',
          'Entrega al solicitante y registro en el sistema institucional'
        ]
      }
    ]);

    /* ── EVENTOS ── */
    _seed('eventos', [
      {
        id:          'evento-001',
        titulo:      'Taller de Educación Ambiental Escolar',
        fecha:       '2026-06-05',
        hora_inicio: '08:00',
        hora_fin:    '12:00',
        lugar:       'UPEL Barquisimeto — Auditorio Principal',
        tipo:        'Taller',
        descripcion: 'Taller dirigido a docentes de educación primaria para fortalecer competencias en educación ambiental y herramientas pedagógicas sostenibles.',
        estado:      'programado',
        organizador: 'Dirección de Comunicaciones'
      },
      {
        id:          'evento-002',
        titulo:      'Monitoreo Zona Industrial Norte',
        fecha:       '2026-06-12',
        hora_inicio: '07:00',
        hora_fin:    '13:00',
        lugar:       'Parroquia Juan de Villegas — Zona Industrial',
        tipo:        'Inspección',
        descripcion: 'Jornada de monitoreo ambiental y verificación de cumplimiento de normativas en los establecimientos industriales de la zona norte del municipio.',
        estado:      'programado',
        organizador: 'Dirección de Calidad Ambiental'
      },
      {
        id:          'evento-003',
        titulo:      'Campaña de Reforestación Comunitaria',
        fecha:       '2026-06-18',
        hora_inicio: '07:00',
        hora_fin:    '11:00',
        lugar:       'Parroquia Santa Rosa — Sector El Trompillo',
        tipo:        'Jornada',
        descripcion: 'Jornada comunitaria de plantación de árboles nativos con participación de consejos comunales, escuelas y vecinos organizados de la parroquia Santa Rosa.',
        estado:      'programado',
        organizador: 'Dirección de Proyectos'
      },
      {
        id:          'evento-004',
        titulo:      'Mesa Técnica con Consejos Comunales',
        fecha:       '2026-06-25',
        hora_inicio: '09:00',
        hora_fin:    '12:00',
        lugar:       'Sede IAGAMI — Sala de Reuniones',
        tipo:        'Reunión',
        descripcion: 'Espacio de articulación con representantes de consejos comunales para revisar avances en proyectos ambientales comunitarios y planificar acciones del tercer trimestre.',
        estado:      'programado',
        organizador: 'Dirección General'
      }
    ]);

    /* ── DOCUMENTOS ── */
    _seed('documentos', [
      {
        id:                'doc-001',
        titulo:            'Informe de Gestión 2025',
        categoria:         'Informes',
        año:               2025,
        estado:            'publicado',
        descripcion:       'Informe anual de gestión institucional correspondiente al ejercicio fiscal 2025, con resultados por dirección y proyectos ejecutados.',
        fecha_publicacion: '2026-01-15',
        descargas:         0
      },
      {
        id:                'doc-002',
        titulo:            'Memoria y Cuenta 2025',
        categoria:         'Memorias',
        año:               2025,
        estado:            'publicado',
        descripcion:       'Memoria y cuenta presentada ante el Concejo Municipal del Municipio Iribarren correspondiente al año 2025.',
        fecha_publicacion: '2026-02-10',
        descargas:         0
      },
      {
        id:                'doc-003',
        titulo:            'Presupuesto Institucional 2026',
        categoria:         'Presupuestos',
        año:               2026,
        estado:            'publicado',
        descripcion:       'Presupuesto de ingresos y gastos de IAGAMI para el ejercicio fiscal 2026, aprobado por el Concejo Municipal.',
        fecha_publicacion: '2026-01-05',
        descargas:         0
      },
      {
        id:                'doc-004',
        titulo:            'Resolución N° 001-2026 Normas Ambientales',
        categoria:         'Resoluciones',
        año:               2026,
        estado:            'publicado',
        descripcion:       'Resolución que establece las normas técnicas y procedimientos para el control de actividades con impacto ambiental en el Municipio Iribarren.',
        fecha_publicacion: '2026-01-20',
        descargas:         0
      },
      {
        id:                'doc-005',
        titulo:            'Plan Operativo Anual 2026',
        categoria:         'Informes',
        año:               2026,
        estado:            'publicado',
        descripcion:       'Plan Operativo Anual de IAGAMI con metas, indicadores y cronograma de actividades para el año 2026.',
        fecha_publicacion: '2026-01-10',
        descargas:         0
      }
    ]);

    /* ── ORGANIZACIÓN ── */
    _seed('org', [
      { id:'dg',  nombre:'Dirección General',              tipo:'direccion', padre:null,  responsable:'Director General',                funciones:'Dirección, coordinación y representación institucional de IAGAMI ante organismos públicos y privados.' },
      { id:'dca', nombre:'Dirección de Calidad Ambiental', tipo:'direccion', padre:'dg',  responsable:'Director(a) de Calidad Ambiental', funciones:'Monitoreo, control y evaluación de la calidad ambiental del municipio, incluyendo aire, agua y suelo.' },
      { id:'dp',  nombre:'Dirección de Proyectos',         tipo:'direccion', padre:'dg',  responsable:'Director(a) de Proyectos',         funciones:'Formulación, ejecución y seguimiento de proyectos de gestión ambiental y desarrollo sostenible.' },
      { id:'dd',  nombre:'Dirección de Denuncias',         tipo:'direccion', padre:'dg',  responsable:'Director(a) de Denuncias',         funciones:'Recepción, tramitación y seguimiento de denuncias ambientales ciudadanas e institucionales.' },
      { id:'da',  nombre:'Dirección de Administración',    tipo:'direccion', padre:'dg',  responsable:'Director(a) de Administración',    funciones:'Gestión presupuestaria, contable, de recursos humanos y bienes institucionales.' },
      { id:'dj',  nombre:'Dirección Jurídica',             tipo:'direccion', padre:'dg',  responsable:'Director(a) Jurídico(a)',           funciones:'Asesoría legal, elaboración de instrumentos normativos y defensa jurídica de la institución.' },
      { id:'di',  nombre:'Dirección de Informática',       tipo:'direccion', padre:'dg',  responsable:'Director(a) de Informática',        funciones:'Gestión de infraestructura tecnológica, sistemas de información y transformación digital institucional.' },
      { id:'dc',  nombre:'Dirección de Comunicaciones',    tipo:'direccion', padre:'dg',  responsable:'Director(a) de Comunicaciones',    funciones:'Comunicación institucional, relaciones públicas, prensa y educación ambiental comunitaria.' }
    ]);

    /* ── PROYECTOS ── */
    _seed('proyectos', [
      {
        id:                'proy-001',
        nombre:            'Reforestación Terepaima Norte',
        estado:            'En Ejecución',
        porcentaje_avance: 68,
        responsable:       'Dirección de Proyectos',
        descripcion:       'Proyecto integral de reforestación en la vertiente norte del cerro Terepaima con especies nativas del bosque seco tropical, orientado a la recuperación de la cubierta vegetal y la protección de nacientes de agua.',
        beneficiados:      '5.000 familias',
        inicio:            '2025-03-01',
        fin_estimado:      '2026-12-31',
        ubicacion:         'Parroquia Santa Rosa — Sector Terepaima Norte',
        indicadores_clave: ['1.500 Ha a reforestar', '45.000 árboles nativos', '120 voluntarios activos']
      },
      {
        id:                'proy-002',
        nombre:            'Recuperación Río Turbio Sector 3',
        estado:            'En Ejecución',
        porcentaje_avance: 45,
        responsable:       'Dirección de Calidad Ambiental',
        descripcion:       'Proyecto de descontaminación, reencauzamiento y revegetación de las márgenes del Río Turbio en su sector 3, desde el puente Libertador hasta el sector La Madriguera.',
        beneficiados:      '12.000 familias',
        inicio:            '2025-06-01',
        fin_estimado:      '2027-06-30',
        ubicacion:         'Parroquias Catedral y Concepción',
        indicadores_clave: ['8 km de margen a recuperar', '4 estaciones de monitoreo', 'Reducción 60% vertidos']
      },
      {
        id:                'proy-003',
        nombre:            'Planta de Reciclaje El Cují',
        estado:            'Completado',
        porcentaje_avance: 100,
        responsable:       'Dirección de Proyectos',
        descripcion:       'Construcción y puesta en marcha de la planta de clasificación y reciclaje de residuos sólidos en el sector El Cují, con capacidad para procesar 20 toneladas diarias de material reciclable.',
        beneficiados:      '80.000 familias',
        inicio:            '2024-01-15',
        fin_estimado:      '2025-12-31',
        fecha_cierre:      '2025-11-20',
        ubicacion:         'Sector El Cují, Parroquia Juan de Villegas',
        indicadores_clave: ['20 T/día capacidad', '45 empleos generados', '12 materiales clasificados']
      }
    ]);

    /* ── INDICADORES ── */
    _seed('indicadores', [
      { id:'ind-001', nombre:'Calidad del Aire',      valor_actual:87,   unidad:'%',  meta:95,   tendencia:'mejora',  icono:'💨', descripcion:'Índice de calidad del aire en zonas urbanas del municipio.' },
      { id:'ind-002', nombre:'Calidad del Agua',      valor_actual:72,   unidad:'%',  meta:90,   tendencia:'estable', icono:'💧', descripcion:'Índice de calidad fisicoquímica y microbiológica de fuentes hídricas.' },
      { id:'ind-003', nombre:'Áreas Verdes',          valor_actual:1200, unidad:'Ha', meta:1500, tendencia:'mejora',  icono:'🌿', descripcion:'Hectáreas de espacios verdes urbanos bajo mantenimiento institucional.' },
      { id:'ind-004', nombre:'Reciclaje',             valor_actual:43,   unidad:'%',  meta:60,   tendencia:'mejora',  icono:'♻️', descripcion:'Porcentaje de residuos sólidos urbanos reciclados o aprovechados.' },
      { id:'ind-005', nombre:'Reforestación',         valor_actual:340,  unidad:'Ha', meta:500,  tendencia:'estable', icono:'🌳', descripcion:'Hectáreas efectivamente reforestadas en el ejercicio vigente.' },
      { id:'ind-006', nombre:'Gestión Institucional', valor_actual:95,   unidad:'%',  meta:100,  tendencia:'mejora',  icono:'📊', descripcion:'Índice de cumplimiento del Plan Operativo Anual de IAGAMI.' }
    ]);

    /* ── EMPRESAS ── */
    _seed('empresas', [
      { id:'emp-001', nombre:'Inversiones La Verde C.A.',   rif:'J-12345678-9', categoria:'Industrial',   estado_permiso:'Vigente',    fecha_vencimiento:'2026-12-31', actividad:'Fabricación de pinturas y recubrimientos' },
      { id:'emp-002', nombre:'Constructora Iribarren S.A.', rif:'J-98765432-1', categoria:'Construcción', estado_permiso:'En Proceso', fecha_vencimiento:null,          actividad:'Construcción de obras civiles y urbanismo' },
      { id:'emp-003', nombre:'Farmacia Norte C.A.',         rif:'J-11223344-5', categoria:'Comercial',    estado_permiso:'Vigente',    fecha_vencimiento:'2026-10-15', actividad:'Distribución y venta de productos farmacéuticos' },
      { id:'emp-004', nombre:'Minera Lara S.A.',            rif:'J-55443322-1', categoria:'Industrial',   estado_permiso:'Vencido',    fecha_vencimiento:'2025-09-30', actividad:'Extracción y procesamiento de minerales no metálicos' }
    ]);

    /* ── ALERTAS ── */
    _seed('alertas', [
      { id:'alerta-001', mensaje:'⚠ Quema controlada Zona Norte — Restricción vehicular en vía Duaca',                                           tipo:'warning', activa:true, fecha:'2026-06-03' },
      { id:'alerta-002', mensaje:'🌊 Alerta Preventiva: Río Turbio — Monitoreo permanente activo',                                               tipo:'info',    activa:true, fecha:'2026-06-03' },
      { id:'alerta-003', mensaje:'🌡 Calor extremo: Se recomienda hidratación y evitar exposición solar entre 12:00 y 15:00 horas',              tipo:'info',    activa:true, fecha:'2026-06-03' }
    ]);

    /* ── MULTAS ── */
    _seed('multas', [
      {
        id: 'multa-001', expediente: 'EXP-2026-001',
        documento: 'J-12345678-9', nombre: 'Inversiones La Verde C.A.',
        tipo: 'Contaminación del Agua', descripcion: 'Vertido de efluentes industriales sin tratamiento al afluente La Quebrada.',
        monto: 50000, fecha: '2026-04-10', estado: 'Pendiente',
        observaciones: 'El infractor debe presentarse ante IAGAMI en un plazo de 15 días hábiles para acordar plan de pago.',
        publicado: true
      },
      {
        id: 'multa-002', expediente: 'EXP-2026-002',
        documento: 'V-15678901', nombre: 'Carlos Méndez',
        tipo: 'Quema Ilegal', descripcion: 'Quema no autorizada de vegetación en zona protegida Parroquia Santa Rosa.',
        monto: 12000, fecha: '2026-03-22', estado: 'Pagada',
        observaciones: 'Multa cancelada el 15/04/2026. Expediente cerrado.',
        publicado: true
      },
      {
        id: 'multa-003', expediente: 'EXP-2026-003',
        documento: 'J-98765432-1', nombre: 'Constructora Iribarren S.A.',
        tipo: 'Deforestación ilegal', descripcion: 'Tala de 3 hectáreas de árboles nativos sin permiso ambiental en zona de amortiguación.',
        monto: 150000, fecha: '2026-05-05', estado: 'En Proceso',
        observaciones: 'Expediente en revisión por el equipo jurídico de IAGAMI. Se está tramitando plan de restauración ecológica.',
        publicado: true
      }
    ]);
    _seed('denuncias', [
      {
        id: 'den-001',
        caso: 'DEN-001',
        tipo: 'Contaminación del Agua',
        descripcion: 'Vertido de aguas negras a la quebrada La Ruezga en el sector El Trompillo.',
        ubicacion: 'Sector El Trompillo, Parroquia Santa Rosa',
        nombre: 'Ciudadano Anónimo',
        email: '',
        telefono: '',
        fecha: '2026-05-20',
        estado: 'inspeccion',
        publicado: true,
        historial: [
          { estado: 'recibida', fecha: '2026-05-20', comentario: 'Denuncia recibida y registrada en el sistema SIGAP.' },
          { estado: 'revision', fecha: '2026-05-21', comentario: 'Expediente asignado a la Dirección de Calidad Ambiental para revisión técnica.' },
          { estado: 'inspeccion', fecha: '2026-05-24', comentario: 'Inspector asignado. Visita de campo programada para el 27/05/2026.' }
        ]
      },
      {
        id: 'den-002',
        caso: 'DEN-002',
        tipo: 'Deforestación',
        descripcion: 'Tala de árboles en zona residencial sin permiso ambiental.',
        ubicacion: 'Urbanización Los Jardines, Parroquia Concepción',
        nombre: 'María González',
        email: '',
        telefono: '',
        fecha: '2026-05-28',
        estado: 'cerrada',
        publicado: true,
        historial: [
          { estado: 'recibida', fecha: '2026-05-28', comentario: 'Denuncia recibida correctamente.' },
          { estado: 'revision', fecha: '2026-05-29', comentario: 'Revisión documental completada. Se constata la infracción.' },
          { estado: 'inspeccion', fecha: '2026-06-01', comentario: 'Inspección realizada. Sanción emitida al infractor.' },
          { estado: 'cerrada', fecha: '2026-06-03', comentario: 'Caso cerrado. Infractor multado. Árboles serán repuestos en 30 días.' }
        ]
      }
    ]);
    _seed('media',    []);

    /* ── CONSEJOS COMUNALES ── */
    _seed('consejos', [
      { id:'cc-001', nombre:'Consejo Comunal Simón Bolívar', codigo:'CC-IRB-001', estado:'Lara', municipio:'Iribarren', parroquia:'Catedral', comunidad:'Sector Centro', direccion:'Calle 27 entre Carreras 18 y 19, Barquisimeto', fecha_constitucion:'2008-03-15', num_familias:120, num_habitantes:480, responsable:'María González', cedula:'V-12345678', telefono:'+58 412 555-0001', email:'ccsimonbolivar@gmail.com', coordenadas:'10.0647,-69.3574', estatus:'Activo', observaciones:'Consejo comunal activo con proyectos de mejoras viales y alumbrado.', documentos:[] },
      { id:'cc-002', nombre:'Consejo Comunal Los Jardines', codigo:'CC-IRB-002', estado:'Lara', municipio:'Iribarren', parroquia:'Concepción', comunidad:'Urbanización Los Jardines', direccion:'Av. Los Jardines, Sector B, Barquisimeto', fecha_constitucion:'2010-07-22', num_familias:85, num_habitantes:340, responsable:'Carlos Méndez', cedula:'V-15678901', telefono:'+58 414 555-0002', email:'cclosjardines@gmail.com', coordenadas:'10.0712,-69.3421', estatus:'Activo', observaciones:'Participan activamente en programas de reciclaje y reforestación.', documentos:[] },
      { id:'cc-003', nombre:'Consejo Comunal Santa Rosa Norte', codigo:'CC-IRB-003', estado:'Lara', municipio:'Iribarren', parroquia:'Santa Rosa', comunidad:'Santa Rosa Norte', direccion:'Carrera 45, Santa Rosa, Barquisimeto', fecha_constitucion:'2012-11-05', num_familias:200, num_habitantes:820, responsable:'Ana Pérez', cedula:'V-18901234', telefono:'+58 416 555-0003', email:'ccsantarosanorte@gmail.com', coordenadas:'10.0589,-69.3298', estatus:'Activo', observaciones:'Uno de los consejos más activos de la parroquia Santa Rosa.', documentos:[] },
      { id:'cc-004', nombre:'Consejo Comunal El Cují Verde', codigo:'CC-IRB-004', estado:'Lara', municipio:'Iribarren', parroquia:'Juan de Villegas', comunidad:'El Cují', direccion:'Sector El Cují, Zona Industrial, Barquisimeto', fecha_constitucion:'2015-04-18', num_familias:65, num_habitantes:260, responsable:'Luis Rodríguez', cedula:'V-20123456', telefono:'+58 426 555-0004', email:'ccelcuji@gmail.com', coordenadas:'10.0445,-69.3102', estatus:'Inactivo', observaciones:'En proceso de renovación de voceros.', documentos:[] }
    ]);

    _seed('bienvenida', [
      {
        id: 'bienvenida-001',
        titulo: 'Bienvenido al Portal SIGAP-IAGAMI',
        mensaje: 'Sistema Integral de Gestión Ambiental del Municipio Iribarren. Accede a trámites, denuncias, proyectos y más.',
        imagen: null,
        color_fondo: '#1d6b3e',
        activa: false,
        mostrarSiempre: false
      }
    ]);

    _seed('planificacion', [
      {
        id: 'plan-001',
        titulo: 'Plan de Reforestación Municipal 2026',
        descripcion: 'Plan integral de reforestación en las parroquias de mayor déficit de cobertura verde del municipio Iribarren.',
        responsable: 'Dirección de Proyectos',
        fecha: '2026-06-30',
        prioridad: 'Alta',
        estado: 'En Progreso',
        avance: 45
      },
      {
        id: 'plan-002',
        titulo: 'Campaña de Educación Ambiental Escolar',
        descripcion: 'Talleres y actividades de educación ambiental en 20 instituciones educativas del municipio.',
        responsable: 'Dirección de Comunicaciones',
        fecha: '2026-07-15',
        prioridad: 'Media',
        estado: 'Pendiente',
        avance: 0
      },
      {
        id: 'plan-003',
        titulo: 'Monitoreo de Calidad del Agua — Segundo Trimestre',
        descripcion: 'Monitoreo sistemático de los cuerpos de agua del municipio con las nuevas estaciones instaladas.',
        responsable: 'Dirección de Calidad Ambiental',
        fecha: '2026-06-20',
        prioridad: 'Alta',
        estado: 'Completado',
        avance: 100
      }
    ]);

    /* ── REVISTAS ── */
    _seed('revistas', [
      {
        id: 'rev-001',
        titulo: 'Revista IAGAMI — Gestión Ambiental 2026',
        numero_edicion: '01',
        fecha: '2026-06-01',
        categoria: 'Ambiental',
        descripcion: 'Primera edición de la Revista Digital IAGAMI. Especial de medio ambiente, logros institucionales y proyectos de gestión ambiental del Municipio Iribarren.',
        portada_url: '',
        pdf_url: '',
        estado: 'publicada',
        destacada: true,
        visualizaciones: 0,
        descargas: 0,
        contenido_bloques: [
          { id:'blk-001', tipo:'portada', titulo:'Revista IAGAMI', subtitulo:'Gestión Ambiental — Edición 01 · 2026', color_fondo:'#1d6b3e', imagen_url:'' },
          { id:'blk-002', tipo:'encabezado', titulo:'Mensaje del Director', subtitulo:'IAGAMI — Municipio Iribarren' },
          { id:'blk-003', tipo:'texto', contenido:'Estimados ciudadanos del Municipio Iribarren, con gran satisfacción presentamos la primera edición de nuestra Revista Digital IAGAMI, un espacio institucional dedicado a informar, educar y promover la conciencia ambiental en nuestra comunidad. A lo largo de estas páginas encontrarán los avances en materia de gestión ambiental, los proyectos en ejecución y las acciones que juntos hemos logrado para preservar nuestro entorno natural.' },
          { id:'blk-004', tipo:'cita', texto:'Proteger el ambiente es proteger nuestra identidad como pueblo. Iribarren verde para la vida.', autor:'— Dirección IAGAMI' },
          { id:'blk-005', tipo:'encabezado', titulo:'Logros del Primer Semestre', subtitulo:'Enero – Junio 2026' },
          { id:'blk-006', tipo:'articulo', titulo:'Monitoreo de Calidad del Agua', autor:'Dirección de Calidad Ambiental', contenido:'Durante el primer semestre de 2026, se completó el monitoreo de 18 cuerpos de agua del municipio, incluyendo ríos, quebradas y embalses. Los resultados muestran una mejora del 23% en los índices de calidad comparados con el período anterior.', imagen_url:'' },
          { id:'blk-007', tipo:'separador', estilo:'decorativo' },
          { id:'blk-008', tipo:'noticias', titulo_seccion:'Noticias Ambientales', cantidad:'3' }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]);
  }

  /* ─────────────────────────────────────────
     Public API
  ───────────────────────────────────────── */
  return {
    KEYS,
    uid,
    now,
    getAll,
    getOne,
    save,
    remove,
    seedAll
  };

})();

/* Auto-seed on script load */
CMSDB.seedAll();
