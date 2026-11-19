import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  StatusBar, TextInput, Alert, ActivityIndicator,
  Image, FlatList, Platform, Dimensions,
  KeyboardAvoidingView, Modal, Animated, Easing, Keyboard
} from 'react-native';
import { WebView } from 'react-native-webview';

const VERDE = '#1d6b3e';
const VERDE_DARK = '#1a3d2b';
const DORADO = '#C6A85B';
const BG = '#f5f7f5';
const TEXTO = '#1f2937';
const GRIS = '#64748b';

const API = 'https://api.iagami.online';
const { width } = Dimensions.get('window');

const LOGO = require('./assets/logo-iagami.png');
const HERO = require('./assets/app-icon.webp');
const SEMERUQUITO = require('./assets/semeruquito.png');
const LEAF_ARROW = require('./assets/leaf-arrow.png');

const ICONOS = {
  denuncias:     require('./assets/iconos/01_presentar_denuncia.png'),
  tramites:      require('./assets/iconos/02_tramites_en_linea.png'),
  multas:        require('./assets/iconos/03_multas_ambientales.png'),
  atencion:      require('./assets/iconos/04_atencion_ciudadana.png'),
  empresas:      require('./assets/iconos/07_registro_empresa.png'),
  noticias:      require('./assets/iconos/08_noticias.png'),
  planificacion: require('./assets/iconos/12_planificacion.png'),
  proyectos:     require('./assets/iconos/13_proyectos_sigap.png'),
  trabajador:    require('./assets/iconos/14_portal_trabajador.png'),
  brigadas:      require('./assets/iconos/15_mapa_brigadas.png'),
  aula:          require('./assets/iconos/16_aula_ambiental.png'),
  estudiante:    require('./assets/iconos/17_portal_estudiante.png'),
  comunas:       require('./assets/iconos/comunas.png'),
  permisos:      require('./assets/iconos/permisos_ambientales.png'),
};

const WEB = 'https://iagami.online';

const MODULOS = [
  { id: 'denuncias',     label: 'Presentar Denuncia',   url: WEB, js: "showPage('denuncia');true;" },
  { id: 'tramites',      label: 'Trámites en Línea',    url: `${WEB}/tramites` },
  { id: 'multas',        label: 'Multas Ambientales',   url: `${WEB}/multas` },
  { id: 'atencion',      label: 'Atención Ciudadana',   url: `${WEB}/atencion` },
  { id: 'empresas',      label: 'Registro Empresa',     url: `${WEB}/empresas` },
  { id: 'permisos',      label: 'Permisos Ambientales', url: `${WEB}/permisos-ambientales` },
  { id: 'comunas',       label: 'Comunas',              url: `${WEB}/consejos-comunales` },
  { id: 'noticias',      label: 'Noticias',             url: `${WEB}/noticias` },
  { id: 'planificacion', label: 'Planificación',        url: `${WEB}/planificacion` },
  { id: 'proyectos',     label: 'Proyectos SIGAP',      url: `${WEB}/proyectos` },
  { id: 'trabajador',    label: 'Portal Trabajador',    url: `${WEB}/siga-iagami/login.html` },
  { id: 'brigadas',      label: 'Mapa de Brigadas',     url: `${WEB}/brigadas-ambientales` },
  { id: 'aula',          label: 'Aula Ambiental',       url: `${WEB}/aula-ambiental` },
  { id: 'estudiante',    label: 'Portal Estudiante',    url: `${WEB}/aula-ambiental` },
];

// 60% verdes, 40% doradas — 2 tipos: 'leaf' (diamante) y 'mote' (orbe dorado)
const HOJAS_CONFIG = [
  { delay: 0,    startX: 18,  size: 15, duration: 9000,  dorada: false, tipo: 'leaf',  drift: -18, rotDeg: 180 },
  { delay: 1100, startX: 52,  size: 11, duration: 10500, dorada: false, tipo: 'leaf',  drift:  22, rotDeg: 240 },
  { delay: 2300, startX: 90,  size: 17, duration: 8500,  dorada: true,  tipo: 'mote',  drift: -12, rotDeg: 0   },
  { delay: 500,  startX: 130, size: 13, duration: 11000, dorada: false, tipo: 'leaf',  drift:  25, rotDeg: 200 },
  { delay: 3200, startX: 168, size: 9,  duration: 9500,  dorada: true,  tipo: 'mote',  drift: -20, rotDeg: 0   },
  { delay: 800,  startX: 210, size: 16, duration: 8800,  dorada: false, tipo: 'leaf',  drift:  15, rotDeg: 160 },
  { delay: 4000, startX: 248, size: 12, duration: 10000, dorada: true,  tipo: 'leaf',  drift: -28, rotDeg: 270 },
  { delay: 1600, startX: 288, size: 19, duration: 9200,  dorada: false, tipo: 'leaf',  drift:  18, rotDeg: 190 },
  { delay: 2800, startX: 325, size: 10, duration: 11500, dorada: false, tipo: 'leaf',  drift: -15, rotDeg: 220 },
  { delay: 3600, startX: 358, size: 14, duration: 9800,  dorada: true,  tipo: 'mote',  drift:  10, rotDeg: 0   },
  { delay: 700,  startX: 38,  size: 13, duration: 10200, dorada: false, tipo: 'leaf',  drift:  20, rotDeg: 150 },
  { delay: 2000, startX: 192, size: 8,  duration: 8200,  dorada: true,  tipo: 'mote',  drift: -16, rotDeg: 0   },
];

function HojaFlotante({ delay, startX, size, duration, dorada, tipo, drift, rotDeg }) {
  const y   = useRef(new Animated.Value(0)).current;
  const x   = useRef(new Animated.Value(0)).current;
  const op  = useRef(new Animated.Value(0)).current;
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Igual que floatUpHero del portal:
    // 0%-12%: fade in; 12%-85%: visible; 85%-100%: fade out
    const fadeIn  = duration * 0.12;
    const hold    = duration * 0.73;  // 85% - 12%
    const fadeOut = duration * 0.15;
    const maxOp   = dorada ? 0.72 : 0.60;

    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          // Movimiento: sube + deriva lateralmente
          Animated.timing(y,   { toValue: -342, duration, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
          Animated.timing(x,   { toValue: drift, duration, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
          Animated.timing(rot, { toValue: 1, duration, useNativeDriver: true }),
          // Opacidad: fade-in rápido → hold largo → fade-out final
          Animated.sequence([
            Animated.timing(op, { toValue: maxOp, duration: fadeIn,  useNativeDriver: true }),
            Animated.timing(op, { toValue: maxOp, duration: hold,    useNativeDriver: true }),
            Animated.timing(op, { toValue: 0,     duration: fadeOut, useNativeDriver: true }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(y,   { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(x,   { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(op,  { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(rot, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: [`0deg`, `${rotDeg}deg`] });

  if (tipo === 'mote') {
    // Orbe dorado brillante — igual a .hoja-hero.mote del portal
    return (
      <Animated.View style={{
        position: 'absolute', bottom: 10, left: startX,
        width: size * 2.2, height: size * 2.2, opacity: op,
        transform: [{ translateY: y }, { translateX: x }],
        borderRadius: size * 1.1,
        backgroundColor: 'rgba(255,232,100,0.55)',
        shadowColor: DORADO, shadowRadius: size, shadowOpacity: 0.6,
        shadowOffset: { width: 0, height: 0 },
      }} />
    );
  }

  // Hoja diamante — igual a .hoja-hero.leaf (border-radius: 50% 0 50% 0)
  const color = dorada ? 'rgba(198,168,91,0.85)' : 'rgba(74,222,128,0.75)';
  return (
    <Animated.View style={{
      position: 'absolute', bottom: 10, left: startX,
      width: size, height: size, opacity: op,
      transform: [{ translateY: y }, { translateX: x }, { rotate }],
      backgroundColor: color,
      borderTopLeftRadius: size * 0.5,
      borderBottomRightRadius: size * 0.5,
      borderTopRightRadius: 1,
      borderBottomLeftRadius: 1,
    }} />
  );
}

function HojasFlotantes() {
  return (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 360, pointerEvents: 'none' }}>
      {HOJAS_CONFIG.map((h, i) => <HojaFlotante key={i} {...h} />)}
    </View>
  );
}

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function fmtFecha(str) {
  if (!str) return '';
  const d = new Date(str.replace(' ', 'T'));
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

function Navbar({ onHome }) {
  return (
    <View style={s.navbar}>
      <TouchableOpacity onPress={onHome} style={s.navLogoWrap}>
        <Image source={LOGO} style={s.navLogo} resizeMode="contain" />
      </TouchableOpacity>
      <View style={s.navBadge}>
        <Text style={s.navBadgeTxt}>SIGAP v3.0</Text>
      </View>
    </View>
  );
}

function Header({ titulo, onBack }) {
  return (
    <View style={s.header}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backTxt}>←</Text>
        </TouchableOpacity>
      )}
      <Text style={s.headerTxt} numberOfLines={1}>{titulo}</Text>
    </View>
  );
}

function Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}

function PantallaInicio({ ir }) {
  const [noticias, setNoticias] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/collections/noticias/records?sort=-created&perPage=3&fields=id,titulo,resumen,created,imagen`)
      .then(r => r.json())
      .then(d => {
        if (d.items) {
          // deduplicar por id
          const uniq = [];
          const seen = new Set();
          for (const n of d.items) {
            if (!seen.has(n.id)) { seen.add(n.id); uniq.push(n); }
          }
          setNoticias(uniq.slice(0, 3));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingNews(false));
  }, []);

  return (
    <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={s.hero}>
        <Image source={HERO} style={s.heroImg} resizeMode="cover" />
        <HojasFlotantes />
        {/* Degradado solo en la parte inferior */}
        <View style={s.heroGradient} />
        <View style={s.heroOverlay}>
          <Text style={s.heroTag}>IAGAMI · Municipio Iribarren</Text>
          <Text style={s.heroTitle}>
            Gestionamos el{' '}
            <Text style={{ color: DORADO }}>futuro ambiental</Text>
            {'\n'}de nuestra ciudad
          </Text>
          <Text style={s.heroSub}>Portal institucional IAGAMI. Planificación estratégica, seguimiento de actividades y monitoreo ambiental en tiempo real.</Text>
          <View style={s.heroBtns}>
            <TouchableOpacity style={s.heroBtnPrimary} onPress={() => ir('denuncias')}>
              <Text style={s.heroBtnPrimaryTxt}>Presentar Denuncia</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.heroBtnSec} onPress={() => ir('tramites')}>
              <Text style={s.heroBtnSecTxt}>Ver Trámites →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.statItem}><Text style={s.statNum}>24/7</Text><Text style={s.statLabel}>Recepción denuncias</Text></View>
        <View style={s.statDivider} />
        <View style={s.statItem}><Text style={s.statNum}>SIGAP</Text><Text style={s.statLabel}>Sistema integral</Text></View>
        <View style={s.statDivider} />
        <View style={s.statItem}><Text style={s.statNum}>v3.0</Text><Text style={s.statLabel}>Plataforma digital</Text></View>
      </View>

      {/* Módulos */}
      <View style={s.section}>
        <View style={{ alignItems: 'center', marginBottom: 6 }}>
          <View style={s.pillTag}><Text style={s.pillTagTxt}>SERVICIOS EN LÍNEA</Text></View>
        </View>
        <Text style={s.sectionBigTitle}>Todo lo que necesitas,{'\n'}en un solo lugar</Text>
        <Text style={s.sectionDesc}>Accede a los servicios del municipio desde tu teléfono</Text>
        <View style={s.grid}>
          {MODULOS.map(m => (
            <TouchableOpacity key={m.id} style={s.modulo} onPress={() => ir(m.id)}>
              <View style={s.moduloImgWrap}>
                <Image source={ICONOS[m.id]} style={s.moduloIcon} resizeMode="contain" />
                <View style={s.moduloBar}>
                  <Text style={s.moduloLabel} numberOfLines={2}>{m.label}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Noticias — al final */}
      <View style={s.section}>
        <View style={{ alignItems: 'center', marginBottom: 6 }}>
          <View style={s.pillTag}><Text style={s.pillTagTxt}>NOTICIAS</Text></View>
        </View>
        <Text style={s.sectionBigTitle}>Últimas noticias{'\n'}de IAGAMI</Text>
        <Text style={s.sectionDesc}>Información institucional y ambiental del municipio</Text>
        {loadingNews ? (
          <ActivityIndicator color={VERDE} style={{ marginVertical: 16 }} />
        ) : noticias.length === 0 ? (
          <Text style={s.empty}>Sin noticias disponibles</Text>
        ) : (
          noticias.map(n => (
            <TouchableOpacity key={n.id} onPress={() => ir('noticias')}>
              <Card style={{ marginBottom: 14 }}>
                {n.imagen
                  ? <Image source={{ uri: `${API}/api/files/noticias/${n.id}/${n.imagen}` }} style={s.newsImg} resizeMode="cover" />
                  : null}
                <View style={{ padding: 14 }}>
                  <View style={s.newsTagRow}>
                    <View style={s.newsTagPill}><Text style={s.newsTagTxt}>Medio Ambiente</Text></View>
                  </View>
                  <Text style={s.newsTitle}>{n.titulo}</Text>
                  {n.resumen ? <Text style={s.newsSub} numberOfLines={2}>{n.resumen}</Text> : null}
                  <Text style={s.newsDate}>{fmtFecha(n.created)}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
        <TouchableOpacity style={s.verTodo} onPress={() => ir('noticias')}>
          <Text style={s.verTodoTxt}>Ver todas las noticias →</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function PantallaNoticias({ onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/collections/noticias/records?sort=-created&perPage=20`)
      .then(r => r.json()).then(d => { if (d.items) setItems(d.items); })
      .catch(() => Alert.alert('Error', 'No se pudieron cargar las noticias'))
      .finally(() => setLoading(false));
  }, []);

  const imgUrl = n => n.imagen ? `${API}/api/files/noticias/${n.id}/${n.imagen}` : null;

  return (
    <View style={s.flex}>
      <Header titulo="Noticias" onBack={onBack} />
      {loading ? <ActivityIndicator color={VERDE} style={s.loader} /> : (
        <FlatList data={items} keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 14 }}>
              {imgUrl(item) && <Image source={{ uri: imgUrl(item) }} style={[s.newsImg, { height: 220 }]} resizeMode="cover" />}
              <View style={{ padding: 14 }}>
                <Text style={s.newsTitle}>{item.titulo}</Text>
                {item.resumen ? <Text style={s.newsSub}>{item.resumen}</Text> : null}
                <Text style={s.newsDate}>{new Date(item.created).toLocaleDateString('es-VE')}</Text>
              </View>
            </Card>
          )}
          ListEmptyComponent={<Text style={s.empty}>Sin noticias disponibles</Text>}
        />
      )}
    </View>
  );
}

function PantallaDenuncias({ onBack }) {
  const [form, setForm] = useState({ nombre:'', cedula:'', telefono:'', email:'', tipo:'', descripcion:'', ubicacion:'' });
  const [enviando, setEnviando] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const enviar = async () => {
    if (!form.descripcion || !form.ubicacion) { Alert.alert('Campos requeridos', 'Descripción y ubicación son obligatorios.'); return; }
    setEnviando(true);
    try {
      const r = await fetch(`${API}/api/collections/denuncias/records`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, estado: 'recibida', canal: 'app_movil' }),
      });
      if (r.ok) { Alert.alert('✅ Denuncia enviada', 'Tu denuncia fue registrada exitosamente.'); setForm({ nombre:'', cedula:'', telefono:'', email:'', tipo:'', descripcion:'', ubicacion:'' }); }
      else Alert.alert('Error', 'No se pudo enviar. Intenta más tarde.');
    } catch { Alert.alert('Error de conexión', 'Verifica tu internet.'); }
    finally { setEnviando(false); }
  };

  const campo = (label, key, ph, multi = false) => (
    <View style={s.campo}>
      <Text style={s.campoLabel}>{label}</Text>
      <TextInput style={[s.input, multi && { height: 100, textAlignVertical: 'top' }]}
        placeholder={ph} placeholderTextColor={GRIS} value={form[key]} onChangeText={v => set(key, v)} multiline={multi} />
    </View>
  );

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header titulo="Presentar Denuncia" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Card style={{ marginBottom: 12, borderLeftWidth: 4, borderLeftColor: DORADO }}>
          <View style={{ padding: 14 }}>
            <Text style={{ color: VERDE_DARK, fontWeight: '700', marginBottom: 4 }}>Denuncia Ambiental Ciudadana</Text>
            <Text style={{ color: GRIS, fontSize: 13 }}>Reporta problemas ambientales. Los campos (*) son obligatorios.</Text>
          </View>
        </Card>
        {campo('Nombre completo', 'nombre', 'Tu nombre (opcional)')}
        {campo('Cédula', 'cedula', 'V-12345678 (opcional)')}
        {campo('Teléfono', 'telefono', '0414-0000000 (opcional)')}
        {campo('Email', 'email', 'correo@ejemplo.com (opcional)')}
        {campo('Tipo de denuncia', 'tipo', 'Ej: Contaminación, Tala, Vertidos...')}
        {campo('Ubicación *', 'ubicacion', 'Sector, calle, parroquia...')}
        {campo('Descripción *', 'descripcion', 'Describe detalladamente la situación...', true)}
        <TouchableOpacity style={[s.btnPrimary, enviando && { opacity: 0.6 }]} onPress={enviar} disabled={enviando}>
          {enviando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnPrimaryTxt}>Enviar Denuncia</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PantallaMultas({ onBack }) {
  const [cedula, setCedula] = useState('');
  const [multas, setMultas] = useState(null);
  const [loading, setLoading] = useState(false);

  const consultar = async () => {
    if (!cedula.trim()) { Alert.alert('Ingresa tu cédula'); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/collections/multas/records?filter=(cedula='${cedula.trim()}')`);
      const d = await r.json();
      setMultas(d.items || []);
    } catch { Alert.alert('Error de conexión'); }
    finally { setLoading(false); }
  };

  return (
    <View style={s.flex}>
      <Header titulo="Multas Ambientales" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Card style={{ marginBottom: 16 }}>
          <View style={{ padding: 14 }}>
            <Text style={s.campoLabel}>Número de Cédula</Text>
            <TextInput style={s.input} placeholder="Ej: 12345678" placeholderTextColor={GRIS} value={cedula} onChangeText={setCedula} keyboardType="numeric" />
            <TouchableOpacity style={[s.btnPrimary, { marginTop: 12 }, loading && { opacity: 0.6 }]} onPress={consultar} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnPrimaryTxt}>Consultar</Text>}
            </TouchableOpacity>
          </View>
        </Card>
        {multas !== null && (multas.length === 0
          ? <Text style={s.empty}>No se encontraron multas para esta cédula.</Text>
          : multas.map(m => (
            <Card key={m.id} style={{ marginBottom: 12 }}>
              <View style={{ padding: 14 }}>
                <Text style={{ fontWeight: '700', color: TEXTO }}>{m.numero_expediente || 'Expediente s/n'}</Text>
                <Text style={{ color: GRIS, marginTop: 4 }}>{m.descripcion}</Text>
                <Text style={{ color: '#dc2626', marginTop: 6, fontWeight: '600' }}>Monto: Bs. {m.monto || '—'}</Text>
                <Text style={{ color: GRIS, fontSize: 12 }}>Estado: {m.estado || '—'}</Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function PantallaListado({ titulo, coleccion, campos, onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/collections/${coleccion}/records?sort=-created&perPage=30`)
      .then(r => r.json()).then(d => { if (d.items) setItems(d.items); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <View style={s.flex}>
      <Header titulo={titulo} onBack={onBack} />
      {loading ? <ActivityIndicator color={VERDE} style={s.loader} /> : (
        <FlatList data={items} keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 10 }}>
              <View style={{ padding: 14 }}>
                {campos.map(c => item[c.key] ? (
                  <Text key={c.key} style={{ color: c.color || TEXTO, fontWeight: c.bold ? '700' : '400', fontSize: c.size || 14, marginBottom: 2 }}>
                    {c.label ? `${c.label}: ` : ''}{item[c.key]}
                  </Text>
                ) : null)}
              </View>
            </Card>
          )}
          ListEmptyComponent={<Text style={s.empty}>No hay registros disponibles</Text>}
        />
      )}
    </View>
  );
}

function PantallaEmpresas({ onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    fetch(`${API}/api/collections/empresas/records?sort=nombre&perPage=50`)
      .then(r => r.json()).then(d => { if (d.items) setItems(d.items); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtradas = items.filter(e =>
    e.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || e.rif?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <View style={s.flex}>
      <Header titulo="Registro de Empresas" onBack={onBack} />
      <View style={{ padding: 12, backgroundColor: '#fff' }}>
        <TextInput style={[s.input, { margin: 0 }]} placeholder="Buscar por nombre o RIF..." placeholderTextColor={GRIS} value={busqueda} onChangeText={setBusqueda} />
      </View>
      {loading ? <ActivityIndicator color={VERDE} style={s.loader} /> : (
        <FlatList data={filtradas} keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 10 }}>
              <View style={{ padding: 14 }}>
                <Text style={{ fontWeight: '700', color: TEXTO }}>{item.nombre}</Text>
                <Text style={{ color: GRIS, fontSize: 13 }}>RIF: {item.rif || '—'}</Text>
                {item.sector && <Text style={{ color: VERDE, fontSize: 12, marginTop: 4 }}>{item.sector}</Text>}
              </View>
            </Card>
          )}
          ListEmptyComponent={<Text style={s.empty}>No se encontraron empresas</Text>}
        />
      )}
    </View>
  );
}

function PantallaAgenda({ onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/collections/eventos/records?sort=-fecha&perPage=20`)
      .then(r => r.json()).then(d => { if (d.items) setItems(d.items); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <View style={s.flex}>
      <Header titulo="Agenda SIGAP" onBack={onBack} />
      {loading ? <ActivityIndicator color={VERDE} style={s.loader} /> : (
        <FlatList data={items} keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 12 }}>
              <View style={{ padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ backgroundColor: VERDE, borderRadius: 8, padding: 8, marginRight: 12, alignItems: 'center', minWidth: 50 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{item.fecha ? new Date(item.fecha).getDate() : '—'}</Text>
                    <Text style={{ color: DORADO, fontSize: 10 }}>{item.fecha ? new Date(item.fecha).toLocaleString('es-VE', { month: 'short' }).toUpperCase() : ''}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: TEXTO }}>{item.titulo || item.nombre}</Text>
                    {item.lugar && <Text style={{ color: GRIS, fontSize: 12 }}>{item.lugar}</Text>}
                  </View>
                </View>
                {item.descripcion && <Text style={{ color: GRIS, fontSize: 13 }}>{item.descripcion}</Text>}
              </View>
            </Card>
          )}
          ListEmptyComponent={<Text style={s.empty}>No hay eventos próximos</Text>}
        />
      )}
    </View>
  );
}

const INJECT_BACK = `
(function(){
  if(document.getElementById('_app_back_btn')) return;
  var btn = document.createElement('div');
  btn.id = '_app_back_btn';
  btn.innerHTML = '<img src="https://iagami.online/assets/images/leaf-arrow.png" style="height:38px;vertical-align:middle"> <span style="font-family:Poppins,sans-serif;font-weight:800;font-size:13px;color:#1a3d2b;letter-spacing:.3px">App</span>';
  btn.style.cssText = 'position:fixed;bottom:22px;left:14px;z-index:99999;background:rgba(255,255,255,0.93);border-radius:28px;padding:7px 14px 7px 10px;display:flex;align-items:center;gap:6px;box-shadow:0 3px 12px rgba(0,0,0,0.18);border:1.5px solid rgba(29,107,62,0.18);cursor:pointer;user-select:none;-webkit-user-select:none';
  btn.addEventListener('click', function(){ window.ReactNativeWebView.postMessage('goback'); });
  document.body.appendChild(btn);
})();true;
`;

function PantallaWeb({ url, js, onBack }) {
  const [loading, setLoading] = useState(true);
  const originUrl = useRef(url);

  function handleNavChange({ url: current, loading: nav }) {
    if (nav) return;
    const isRoot = current === 'https://iagami.online' ||
                   current === 'https://iagami.online/' ||
                   current === 'https://iagami.online/index.html';
    const startedAtRoot = originUrl.current === 'https://iagami.online' ||
                          originUrl.current === 'https://iagami.online/';
    if (isRoot && !startedAtRoot) onBack();
  }

  const inject = "document.head.insertAdjacentHTML('beforeend','<style>.nav,.topbar,.alert-bar{display:none!important}</style>');" +
                 (js || '') + INJECT_BACK;

  return (
    <View style={s.flex}>
      {loading && <ActivityIndicator color={VERDE} style={{ position: 'absolute', top: '50%', alignSelf: 'center', zIndex: 10 }} />}
      <WebView
        source={{ uri: url }}
        style={s.flex}
        onLoadEnd={() => setLoading(false)}
        onError={() => setLoading(false)}
        javaScriptEnabled
        domStorageEnabled
        onNavigationStateChange={handleNavChange}
        injectedJavaScript={inject}
        onMessage={({ nativeEvent }) => { if (nativeEvent.data === 'goback') onBack(); }}
        userAgent="Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
      />
    </View>
  );
}

function PantallaAtencion({ onBack }) {
  const telefonos = [
    { cargo: 'Presidente', nombre: 'Ing. Mauricio Orellana', num: '0426 550-9382', href: 'tel:+584265509382', ini: 'MO' },
    { cargo: 'Vicepresidenta', nombre: 'Lic. Dayana Bullones', num: '0412 519-1992', href: 'tel:+584125191992', ini: 'DB' },
    { cargo: 'Atención al ciudadano', nombre: 'Línea ciudadana IAGAMI', num: '0412 672-9712', href: 'tel:+584126729712', ini: '📞' },
    { cargo: 'Oficina — Denuncias e información', nombre: 'Teléfono fijo', num: '(0251) 257-9529', href: 'tel:+582512579529', ini: '☎' },
  ];
  const correos = [
    { label: 'Atención al Ciudadano', addr: 'Iagami.atencionparalavida@gmail.com', nota: 'Consultas, información general y atención ciudadana directa.' },
    { label: 'Vicepresidencia — Quejas y seguimiento', addr: 'vicepresidencia.iagami@gmail.com', nota: 'Quejas sobre trabajadores o mala praxis institucional.' },
    { label: 'Control y seguimiento interno', addr: 'seguimientoycontroliagami@gmail.com', nota: 'Seguimiento de casos, control de gestión y fiscalización.' },
  ];
  return (
    <View style={s.flex}>
      <Header titulo="Atención al Ciudadano" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* Dirección */}
        <Card style={{ marginBottom: 14, borderLeftWidth: 4, borderLeftColor: VERDE }}>
          <View style={{ padding: 16 }}>
            <Text style={{ color: DORADO, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>📍 SEDE PRINCIPAL</Text>
            <Text style={{ fontWeight: '700', color: VERDE_DARK, fontSize: 15, marginBottom: 6 }}>IAGAMI — Municipio Iribarren</Text>
            <Text style={{ color: TEXTO, fontSize: 13, lineHeight: 20 }}>Av. Libertador entre Av. Los Leones y Av. Argimiro Bracamonte{'\n'}Barquisimeto 3001, Estado Lara</Text>
            <Text style={{ color: GRIS, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>Dentro del Parque del Este</Text>
          </View>
        </Card>

        {/* Teléfonos */}
        <Card style={{ marginBottom: 14 }}>
          <View style={{ padding: 16 }}>
            <Text style={{ color: DORADO, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 14 }}>📱 DIRECTORIO TELEFÓNICO</Text>
            {telefonos.map((t, i) => (
              <View key={i}>
                {i > 0 && <View style={{ height: 1, backgroundColor: '#e8f5ee', marginVertical: 10 }} />}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: VERDE, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{t.ini}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: GRIS, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>{t.cargo}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: VERDE_DARK }}>{t.nombre}</Text>
                    <Text style={{ fontSize: 13, color: VERDE, fontWeight: '600', marginTop: 2 }}>{t.num}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Correos */}
        <Card style={{ marginBottom: 14 }}>
          <View style={{ padding: 16 }}>
            <Text style={{ color: DORADO, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 14 }}>✉️ CORREOS OFICIALES</Text>
            {correos.map((c, i) => (
              <View key={i}>
                {i > 0 && <View style={{ height: 1, backgroundColor: '#e8f5ee', marginVertical: 12 }} />}
                <Text style={{ fontSize: 10, color: GRIS, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>{c.label}</Text>
                <View style={{ backgroundColor: '#e8f5ee', borderRadius: 8, padding: 10 }}>
                  <Text style={{ color: VERDE, fontWeight: '700', fontSize: 13 }}>{c.addr}</Text>
                </View>
                <Text style={{ color: GRIS, fontSize: 12, marginTop: 5, fontStyle: 'italic', lineHeight: 17 }}>{c.nota}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Horario */}
        <Card>
          <View style={{ padding: 16 }}>
            <Text style={{ color: DORADO, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 14 }}>🕐 HORARIO DE ATENCIÓN</Text>
            {[
              { dia: 'Lunes – Viernes', hora: '8:00 AM – 4:00 PM', abierto: true },
              { dia: 'Sábado',          hora: '8:00 AM – 12:00 PM', abierto: true },
              { dia: 'Domingo',         hora: 'Cerrado',             abierto: false },
            ].map((h, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: '#e8f5ee' }}>
                <Text style={{ fontWeight: '600', color: VERDE_DARK, fontSize: 14 }}>{h.dia}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: GRIS, fontSize: 13 }}>{h.hora}</Text>
                  <View style={{ backgroundColor: h.abierto ? '#dcfce7' : '#fee2e2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: h.abierto ? '#15803d' : '#dc2626', fontSize: 10, fontWeight: '700' }}>{h.abierto ? 'Abierto' : 'Cerrado'}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Card>

      </ScrollView>
    </View>
  );
}

const FAQ_LOCAL = [
  { q: ['denuncia','denunciar','reportar','problema ambiental'], a: 'Para presentar una denuncia ambiental, ve al módulo "Presentar Denuncia". Puedes reportar contaminación, tala ilegal, vertidos y más.' },
  { q: ['multa','multas','sanción','deuda','expediente'], a: 'Consulta tus multas en el módulo "Multas Ambientales". Ingresa tu cédula para ver el estado de tus obligaciones.' },
  { q: ['trámite','tramite','permiso','certificado','solicitud'], a: 'Los trámites y permisos ambientales están en el módulo "Trámites en Línea" con todos los requisitos.' },
  { q: ['empresa','registro empresa','rif','industria'], a: 'El registro y consulta de empresas está en el módulo "Registro Empresa". Busca por nombre o RIF.' },
  { q: ['evento','agenda','actividad','charla'], a: 'Consulta la "Agenda SIGAP" para ver próximos eventos y actividades ambientales del municipio.' },
  { q: ['noticia','noticias','información','comunicado'], a: 'Las últimas noticias del IAGAMI están en el módulo "Noticias" o en la pantalla principal.' },
  { q: ['transparencia','documento','informe','presupuesto'], a: 'Los documentos de gestión pública están en el módulo "Transparencia".' },
  { q: ['indicador','indicadores','monitoreo','ambiental'], a: 'Los indicadores ambientales están en el módulo "Indicadores" para ver el estado del municipio.' },
  { q: ['proyecto','proyectos','obras','programa'], a: 'Consulta los proyectos y obras en el módulo "Proyectos SIGAP".' },
  { q: ['revista','publicación','digital'], a: 'La Revista Digital del IAGAMI está disponible en el módulo "Revista Digital".' },
  { q: ['brigada','brigadas','mapa'], a: 'El Mapa de Brigadas muestra la distribución de equipos por sector del municipio.' },
  { q: ['aula','educación','ambiental','escuela'], a: 'El Aula Ambiental ofrece recursos de educación ambiental para la comunidad.' },
  { q: ['comuna','comunas','consejo comunal'], a: 'Información sobre Comunas y Consejos Comunales del municipio en el módulo "Comunas".' },
  { q: ['hola','buenos días','buenas','saludos','hey'], a: '¡Hola! Soy Semeruquito, el asistente virtual del IAGAMI. ¿En qué puedo ayudarte hoy?' },
  { q: ['gracias','muchas gracias','ok','listo'], a: '¡Con gusto! Estoy aquí para ayudarte con cualquier consulta ambiental.' },
  { q: ['iagami','que es','quiénes son','instituto'], a: 'El IAGAMI es el Instituto Autónomo de Gestión Ambiental del Municipio Iribarren, Barquisimeto, Estado Lara.' },
];

function responder(msg) {
  const m = msg.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const item of FAQ_LOCAL) {
    if (item.q.some(k => m.includes(k.normalize('NFD').replace(/[̀-ͯ]/g, '')))) return item.a;
  }
  return 'No tengo información sobre eso ahora. Para más ayuda visita iagami.online o escribe a vicepresidencia.iagami@gmail.com';
}

function Chatbot({ visible, onClose }) {
  const [mensajes, setMensajes] = useState([
    { id: '0', role: 'bot', text: '¡Hola! Soy Semeruquito, el asistente virtual del IAGAMI. ¿En qué puedo ayudarte?' }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  const enviar = () => {
    const txt = input.trim();
    if (!txt) return;
    const user = { id: Date.now().toString(), role: 'user', text: txt };
    const bot = { id: (Date.now()+1).toString(), role: 'bot', text: responder(txt) };
    setMensajes(p => [...p, user, bot]);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.chatOverlay}>
        <View style={s.chatBox}>
          <View style={s.chatHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image source={SEMERUQUITO} style={s.chatAvatar} />
              <View>
                <Text style={s.chatHeaderTitle}>Semeruquito</Text>
                <Text style={{ color: DORADO, fontSize: 11 }}>Asistente IAGAMI</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={s.chatClose}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView ref={scrollRef} style={s.chatMsgs} contentContainerStyle={{ padding: 12, paddingBottom: 8 }}>
            {mensajes.map(m => (
              <View key={m.id} style={[s.bubble, m.role === 'user' ? s.bubbleUser : s.bubbleBot]}>
                <Text style={[s.bubbleTxt, m.role === 'user' && { color: '#fff' }]}>{m.text}</Text>
              </View>
            ))}
          </ScrollView>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={s.chatInput}>
              <TextInput style={s.chatField} placeholder="Escribe tu consulta..." placeholderTextColor={GRIS}
                value={input} onChangeText={setInput} onSubmitEditing={enviar} returnKeyType="send" />
              <TouchableOpacity style={s.chatSend} onPress={enviar}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>↑</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

const SCREENS = {
  noticias:      PantallaNoticias,
  denuncias:     PantallaDenuncias,
  multas:        PantallaMultas,
  empresas:      PantallaEmpresas,
  agenda:        PantallaAgenda,
  atencion:      PantallaAtencion,
  tramites:      (p) => <PantallaListado titulo="Trámites en Línea"    coleccion="tramites"    campos={[{key:'nombre',bold:true},{key:'titulo',bold:true},{key:'descripcion',color:GRIS,size:13},{key:'requisitos',color:VERDE,size:12,label:'Requisitos'}]} {...p} />,
  transparencia: (p) => <PantallaListado titulo="Transparencia"        coleccion="documentos"  campos={[{key:'titulo',bold:true},{key:'nombre',bold:true},{key:'created',color:GRIS,size:12}]} {...p} />,
  revista:       (p) => <PantallaListado titulo="Revista Digital"      coleccion="revistas"    campos={[{key:'titulo',bold:true},{key:'descripcion',color:GRIS,size:13}]} {...p} />,
  indicadores:   (p) => <PantallaListado titulo="Indicadores"          coleccion="indicadores" campos={[{key:'nombre',bold:true},{key:'valor',color:VERDE,bold:true},{key:'descripcion',color:GRIS,size:13}]} {...p} />,
  organizacion:  (p) => <PantallaListado titulo="Organización"         coleccion="proyectos"   campos={[{key:'nombre',bold:true},{key:'descripcion',color:GRIS,size:13}]} {...p} />,
  planificacion: (p) => <PantallaListado titulo="Planificación"        coleccion="planificacion" campos={[{key:'nombre',bold:true},{key:'descripcion',color:GRIS,size:13}]} {...p} />,
  proyectos:     (p) => <PantallaListado titulo="Proyectos SIGAP"      coleccion="proyectos"   campos={[{key:'nombre',bold:true},{key:'descripcion',color:GRIS,size:13},{key:'estado',color:VERDE,size:12}]} {...p} />,
  trabajador:    (p) => <PantallaListado titulo="Portal Trabajador"    coleccion="trabajadores" campos={[{key:'nombre',bold:true},{key:'cargo',color:GRIS,size:13}]} {...p} />,
  brigadas:      (p) => <PantallaListado titulo="Mapa de Brigadas"     coleccion="control_seguimiento" campos={[{key:'nombre',bold:true},{key:'descripcion',color:GRIS,size:13}]} {...p} />,
  aula:          (p) => <PantallaListado titulo="Aula Ambiental"       coleccion="chatbot_faq" campos={[{key:'pregunta',bold:true},{key:'respuesta',color:GRIS,size:13}]} {...p} />,
  comunas:       (p) => <PantallaListado titulo="Comunas"              coleccion="comunas"     campos={[{key:'nombre',bold:true},{key:'parroquia',color:GRIS,size:13},{key:'descripcion',color:GRIS,size:12}]} {...p} />,
  permisos:      (p) => <PantallaListado titulo="Permisos Ambientales" coleccion="tramites"    campos={[{key:'nombre',bold:true},{key:'descripcion',color:GRIS,size:13}]} {...p} />,
};

function FabSemeruquito({ onPress }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(1)).current;
  const ringOp = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ring, { toValue: 1.5, duration: 1200, useNativeDriver: true }),
          Animated.timing(ringOp, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ring, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(ringOp, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
        Animated.delay(600),
      ])
    ).start();
  }, []);

  return (
    <TouchableOpacity style={s.fabWrap} onPress={onPress} activeOpacity={0.85}>
      <Animated.View style={[s.fabRing, { transform: [{ scale: ring }], opacity: ringOp }]} />
      <Animated.View style={[s.fab, { transform: [{ scale: pulse }] }]}>
        <Image source={SEMERUQUITO} style={s.fabImg} />
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function App() {
  const [pantalla, setPantalla] = useState('inicio');
  const [webNav, setWebNav] = useState(null); // { url, titulo }
  const [chatVisible, setChatVisible] = useState(false);
  const ir = (id) => {
    const mod = MODULOS.find(m => m.id === id);
    if (mod) { setWebNav({ url: mod.url, titulo: mod.label, js: mod.js }); return; }
    if (SCREENS[id] || id === 'inicio') setPantalla(id);
  };
  const volver = () => { setWebNav(null); setPantalla('inicio'); };
  const Pantalla = SCREENS[pantalla];

  return (
    <View style={s.root}>
      <StatusBar backgroundColor={VERDE_DARK} barStyle="light-content" />
      <Navbar onHome={volver} />
      <View style={s.flex}>
        {webNav
          ? <PantallaWeb url={webNav.url} titulo={webNav.titulo} js={webNav.js} onBack={() => setWebNav(null)} />
          : pantalla === 'inicio' ? <PantallaInicio ir={ir} />
          : Pantalla ? <Pantalla onBack={volver} />
          : <PantallaInicio ir={ir} />}
      </View>
      <FabSemeruquito onPress={() => setChatVisible(true)} />
      <Chatbot visible={chatVisible} onClose={() => setChatVisible(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  navbar: {
    backgroundColor: VERDE_DARK, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24,
    paddingBottom: 10, borderBottomWidth: 3, borderBottomColor: DORADO,
  },
  navLogoWrap: {
    borderWidth: 3, borderColor: DORADO, borderRadius: 10, padding: 5,
    backgroundColor: 'rgba(198,168,91,0.15)',
    shadowColor: DORADO, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 12,
    elevation: 6,
  },
  navLogo: { width: 124, height: 50 },
  navBadge: { backgroundColor: DORADO+'22', borderColor: DORADO, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  navBadgeTxt: { color: DORADO, fontSize: 11, fontWeight: '700' },
  header: { backgroundColor: VERDE, flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 2, borderBottomColor: DORADO },
  backBtn: { marginRight: 12, padding: 4 },
  backTxt: { color: DORADO, fontSize: 22, fontWeight: '700' },
  headerTxt: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },
  hero: { width: '100%', height: 380, position: 'relative', overflow: 'hidden' },
  heroImg: { width: '100%', height: '100%' },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 220, backgroundColor: 'transparent',
    borderTopWidth: 0,
    // degradado simulado con opacidad
  },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '38%', backgroundColor: 'rgba(20,50,32,0.88)', padding: 14, justifyContent: 'flex-end' },
  heroTag: { color: DORADO, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 28 },
  heroSub: { color: '#ffffffbb', fontSize: 12, marginTop: 6, lineHeight: 18 },
  heroBtns: { flexDirection: 'row', marginTop: 14, gap: 10 },
  heroBtnPrimary: { backgroundColor: VERDE, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: DORADO },
  heroBtnPrimaryTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  heroBtnSec: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#ffffff44' },
  heroBtnSecTxt: { color: '#fff', fontWeight: '600', fontSize: 13 },
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800', color: VERDE },
  statLabel: { fontSize: 10, color: GRIS, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: '#e2e8f0', marginVertical: 4 },
  section: { padding: 16, paddingTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionBar: { width: 4, height: 20, backgroundColor: DORADO, borderRadius: 2, marginRight: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: VERDE_DARK },
  noticiaCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: VERDE, elevation: 1, shadowColor: '#000', shadowOffset: { width:0,height:1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  noticiaDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: DORADO, marginTop: 5, marginRight: 10 },
  noticiaTitle: { fontWeight: '600', color: TEXTO, fontSize: 14, lineHeight: 20 },
  noticiaSub: { color: GRIS, fontSize: 12, marginTop: 2 },
  verTodo: { alignItems: 'flex-end', marginTop: 4 },
  verTodoTxt: { color: VERDE, fontWeight: '600', fontSize: 13 },
  pillTag: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: DORADO+'88', paddingHorizontal: 14, paddingVertical: 5 },
  pillTagTxt: { color: GRIS, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  sectionBigTitle: { color: DORADO, fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 6, lineHeight: 30 },
  sectionDesc: { color: GRIS, fontSize: 13, textAlign: 'center', marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  modulo: { width: (width-44)/2, borderRadius: 16, margin: 6, borderWidth: 2.5, borderColor: DORADO, overflow: 'hidden', backgroundColor: '#e8f5e9', elevation: 4, shadowColor: DORADO, shadowOffset: { width:0,height:2 }, shadowOpacity: 0.4, shadowRadius: 6 },
  moduloImgWrap: { width: '100%', aspectRatio: 1, position: 'relative' },
  moduloIcon: { width: '100%', height: '100%', resizeMode: 'contain' },
  moduloBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(26,61,43,0.88)', paddingVertical: 8, paddingHorizontal: 6 },
  moduloLabel: { color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  moduloSub: { color: '#ffffffaa', fontSize: 11, textAlign: 'center', marginTop: 2 },
  newsTagRow: { flexDirection: 'row', marginBottom: 6 },
  newsTagPill: { backgroundColor: VERDE+'22', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  newsTagTxt: { color: VERDE, fontSize: 11, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width:0,height:1 }, shadowOpacity: 0.08, shadowRadius: 3, overflow: 'hidden' },
  newsImg: { width: '100%', height: 200, resizeMode: 'cover' },
  newsTitle: { fontWeight: '700', color: TEXTO, fontSize: 15, lineHeight: 22 },
  newsSub: { color: GRIS, fontSize: 13, marginTop: 4, lineHeight: 18 },
  newsDate: { color: DORADO, fontSize: 11, marginTop: 6, fontWeight: '600' },
  campo: { marginBottom: 14 },
  campoLabel: { color: TEXTO, fontWeight: '600', marginBottom: 6, fontSize: 14 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, color: TEXTO, fontSize: 15 },
  btnPrimary: { backgroundColor: VERDE, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: DORADO },
  btnPrimaryTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  fabWrap: { position: 'absolute', bottom: 28, right: 24, width: 68, height: 68, alignItems: 'center', justifyContent: 'center' },
  fabRing: { position: 'absolute', width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: DORADO },
  fab: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: DORADO, shadowOffset: { width:0,height:4 }, shadowOpacity: 0.6, shadowRadius: 10, borderWidth: 2.5, borderColor: DORADO },
  fabImg: { width: 54, height: 54, borderRadius: 27 },
  chatOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  chatBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', overflow: 'hidden' },
  chatHeader: { backgroundColor: VERDE_DARK, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 2, borderBottomColor: DORADO },
  chatAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10, borderWidth: 1.5, borderColor: DORADO },
  chatHeaderTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  chatClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  chatMsgs: { flex: 1, maxHeight: 340 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 14, marginBottom: 10 },
  bubbleBot: { backgroundColor: '#f0fdf4', alignSelf: 'flex-start', borderWidth: 1, borderColor: VERDE+'33', borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: VERDE, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleTxt: { color: TEXTO, fontSize: 14, lineHeight: 20 },
  chatInput: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', gap: 8 },
  chatField: { flex: 1, backgroundColor: BG, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0', color: TEXTO, fontSize: 14 },
  chatSend: { width: 42, height: 42, backgroundColor: VERDE, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  loader: { flex: 1, justifyContent: 'center', marginTop: 60 },
  empty: { color: GRIS, textAlign: 'center', marginTop: 40, fontSize: 15 },
  webBack: {
    position: 'absolute', bottom: 24, left: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 28, paddingHorizontal: 14, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 8,
    borderWidth: 1.5, borderColor: 'rgba(29,107,62,0.18)',
  },
  webBackImg: { width: 44, height: 44 },
  webBackTxt: { color: '#1a3d2b', fontWeight: '800', fontSize: 13, letterSpacing: 0.3 },
});
