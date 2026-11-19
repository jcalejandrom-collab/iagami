import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  StatusBar, TextInput, Alert, ActivityIndicator,
  SafeAreaView, Image, Platform, ImageBackground
} from 'react-native';

const VERDE = '#1d6b3e';
const VERDE_DARK = '#1a3d2b';
const DORADO = '#C6A85B';
const BG = '#f5f7f5';
const TEXTO = '#1f2937';
const GRIS = '#64748b';

const API = 'https://api.iagami.online';
const RAW = 'https://raw.githubusercontent.com/jcalejandrom-collab/iagami/claude/bold-tesla-uuTwO/assets/images';

const LOGO = { uri: `${RAW}/logo-iagami.png` };

const MODULOS = [
  { id: 'denuncias',  label: 'Presentar Denuncia',   sub: 'Reporta problemas ambientales',    icon: { uri: `${RAW}/iconos/01_presentar_denuncia.png` } },
  { id: 'tramites',   label: 'Trámites en Línea',     sub: 'Permisos y certificaciones',        icon: { uri: `${RAW}/iconos/02_tramites_en_linea.png` } },
  { id: 'multas',     label: 'Multas Ambientales',    sub: 'Consulta expedientes',              icon: { uri: `${RAW}/iconos/03_multas_ambientales.png` } },
  { id: 'noticias',   label: 'Noticias',              sub: 'Actualidad institucional',          icon: { uri: `${RAW}/iconos/08_noticias.png` } },
  { id: 'empresas',   label: 'Registro Empresa',      sub: 'Registro ambiental',                icon: { uri: `${RAW}/iconos/07_registro_empresa.png` } },
  { id: 'comunales',  label: 'Comunas',               sub: 'Consejos comunales',                icon: { uri: `${RAW}/iconos/comunas.png` } },
  { id: 'tramites',   label: 'Transparencia',         sub: 'Información institucional',         icon: { uri: `${RAW}/iconos/05_transparencia.png` } },
  { id: 'agenda',     label: 'Agenda SIGAP',          sub: 'Actividades programadas',           icon: { uri: `${RAW}/iconos/06_agenda_sigap.png` } },
];

function Header({ titulo, onBack }) {
  return (
    <View style={s.header}>
      {onBack
        ? <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backTxt}>←</Text></TouchableOpacity>
        : <Image source={LOGO} style={s.headerLogo} resizeMode="contain" />}
      <Text style={s.headerTxt} numberOfLines={1}>{titulo}</Text>
    </View>
  );
}

function Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}

function Chip({ label, color = VERDE }) {
  return (
    <View style={[s.chip, { borderColor: color }]}>
      <Text style={[s.chipTxt, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Pantalla: Inicio ───────────────────────────────────────────────────────

function PantallaInicio({ ir }) {
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={VERDE_DARK} />

      {/* Navbar */}
      <View style={s.navbar}>
        <Image source={LOGO} style={s.navLogo} resizeMode="contain" />
        <Text style={s.navBrand}>IAGAMI</Text>
        <View style={s.navSigap}><Text style={s.navSigapTxt}>SIGAP v3.0</Text></View>
      </View>

      <ScrollView contentContainerStyle={s.inicioScroll}>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroBadge}>
            <View style={s.heroDot} />
            <Text style={s.heroBadgeTxt}>SIGAP · Sistema Integral de Gestión Ambiental</Text>
          </View>
          <Text style={s.heroSlogan}>Iribarren Verde para la vida</Text>
          <Text style={s.heroTitulo}>
            {'Gestionamos el '}
            <Text style={{ color: DORADO }}>futuro{"\n"}ambiental</Text>
            {' de nuestro municipio'}
          </Text>
          <Text style={s.heroSub}>
            Portal institucional IAGAMI. Planificación estratégica, seguimiento de actividades
            programadas, denuncias ciudadanas y monitoreo ambiental en tiempo real.
          </Text>
          <View style={s.heroBtns}>
            <TouchableOpacity style={s.heroBtnVerde} onPress={() => ir('denuncias')}>
              <Text style={s.heroBtnVerdeTxt}>📋  Presentar Denuncia</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.heroBtnBorde} onPress={() => ir('tramites')}>
              <Text style={s.heroBtnBordeTxt}>Ver Trámites →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sección servicios */}
        <View style={s.secHeader}>
          <Text style={s.secTitulo}>Acceso a los Servicios Institucionales</Text>
          <Text style={s.secSub}>del Municipio desde cualquier dispositivo</Text>
        </View>

        {/* Grid de módulos */}
        <View style={s.grid}>
          {MODULOS.map((m, i) => (
            <TouchableOpacity key={i} style={s.modCard} onPress={() => ir(m.id)}>
              <Image source={m.icon} style={s.modIcon} resizeMode="cover" />
              <View style={s.modInfo}>
                <Text style={s.modLabel} numberOfLines={2}>{m.label}</Text>
                <Text style={s.modSub} numberOfLines={1}>{m.sub}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.footer}>
          <Image source={LOGO} style={s.footerLogo} resizeMode="contain" />
          <Text style={s.footerTxt}>Instituto Autónomo de Gestión Ambiental{"\n"}Municipio Iribarren · Barquisimeto · Estado Lara</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Pantalla: Noticias ─────────────────────────────────────────────────────

function PantallaNoticias({ onBack }) {
  const [noticias, setNoticias] = useState([]);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    fetch(`${API}/api/collections/noticias/records?sort=-created&perPage=20`)
      .then(r => r.json()).then(d => { setNoticias(d.items || []); setCargando(false); })
      .catch(() => setCargando(false));
  }, []);
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={VERDE_DARK} />
      <Header titulo="Últimas Noticias" onBack={onBack} />
      {cargando ? <ActivityIndicator size="large" color={VERDE} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={s.listaPad}>
          {noticias.length === 0 && <Text style={s.vacio}>No hay noticias disponibles</Text>}
          {noticias.map(n => (
            <Card key={n.id} style={s.noticiaCard}>
              <Chip label={n.categoria || 'Ambiental'} />
              <Text style={s.noticiaTitle}>{n.titulo}</Text>
              <Text style={s.noticiaResumen} numberOfLines={3}>{n.resumen || n.contenido}</Text>
              <Text style={s.noticiaFecha}>{n.fecha ? new Date(n.fecha).toLocaleDateString('es-VE') : ''}</Text>
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Pantalla: Denuncia ─────────────────────────────────────────────────────

function PantallaDenuncia({ onBack }) {
  const [form, setForm] = useState({ nombre:'', cedula:'', telefono:'', email:'', tipo:'', descripcion:'', ubicacion:'' });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const tipos = ['Contaminación del aire','Vertido ilegal','Tala ilegal','Contaminación de suelos','Ruido excesivo','Otro'];
  const enviar = async () => {
    if (!form.descripcion || !form.ubicacion) { Alert.alert('Requerido','Completa descripción y ubicación.'); return; }
    setEnviando(true);
    try {
      const res = await fetch(`${API}/api/collections/denuncias/records`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form,estado:'recibida',fecha:new Date().toISOString()}) });
      if (res.ok) setEnviado(true); else Alert.alert('Error','No se pudo enviar.');
    } catch { Alert.alert('Sin conexión','Verifica tu internet.'); } finally { setEnviando(false); }
  };
  if (enviado) return (
    <SafeAreaView style={s.safe}><Header titulo="Denuncia" onBack={onBack} />
      <View style={s.exitoContainer}>
        <Text style={s.exitoIcon}>✅</Text>
        <Text style={s.exitoTitulo}>¡Denuncia Enviada!</Text>
        <Text style={s.exitoSub}>Tu reporte fue recibido por IAGAMI.</Text>
        <TouchableOpacity style={s.btnVerde} onPress={onBack}><Text style={s.btnVerdeTxt}>Volver al inicio</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={VERDE_DARK} />
      <Header titulo="Presentar Denuncia" onBack={onBack} />
      <ScrollView contentContainerStyle={s.listaPad} keyboardShouldPersistTaps="handled">
        {[['nombre','Nombre completo'],['cedula','Cédula de identidad'],['telefono','Teléfono'],['email','Correo electrónico']].map(([k,p]) => (
          <TextInput key={k} style={s.input} placeholder={p} placeholderTextColor={GRIS} value={form[k]} onChangeText={v=>setForm({...form,[k]:v})} />
        ))}
        <Text style={s.formSeccion}>Tipo de denuncia *</Text>
        <View style={s.tiposGrid}>
          {tipos.map(t=><TouchableOpacity key={t} style={[s.tipoBtn,form.tipo===t&&s.tipoBtnActivo]} onPress={()=>setForm({...form,tipo:t})}><Text style={[s.tipoBtnTxt,form.tipo===t&&s.tipoBtnTxtActivo]}>{t}</Text></TouchableOpacity>)}
        </View>
        <Text style={s.formSeccion}>Descripción *</Text>
        <TextInput style={[s.input,s.inputArea]} placeholder="Describe detalladamente..." placeholderTextColor={GRIS} multiline numberOfLines={4} value={form.descripcion} onChangeText={v=>setForm({...form,descripcion:v})} />
        <Text style={s.formSeccion}>Ubicación *</Text>
        <TextInput style={s.input} placeholder="Dirección, sector o parroquia" placeholderTextColor={GRIS} value={form.ubicacion} onChangeText={v=>setForm({...form,ubicacion:v})} />
        <TouchableOpacity style={[s.btnVerde,enviando&&s.btnDeshabilitado]} onPress={enviar} disabled={enviando}>
          {enviando?<ActivityIndicator color="#fff"/>:<Text style={s.btnVerdeTxt}>📤  Enviar Denuncia</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Pantalla: Multas ───────────────────────────────────────────────────────

function PantallaMultas({ onBack }) {
  const [cedula, setCedula] = useState('');
  const [multas, setMultas] = useState(null);
  const [cargando, setCargando] = useState(false);
  const consultar = async () => {
    if (!cedula) { Alert.alert('Requerido','Ingresa tu cédula.'); return; }
    setCargando(true);
    try {
      const res = await fetch(`${API}/api/collections/multas/records?filter=(cedula='${cedula}')&sort=-created`);
      const d = await res.json(); setMultas(d.items||[]);
    } catch { Alert.alert('Error','No se pudo conectar.'); } finally { setCargando(false); }
  };
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={VERDE_DARK} />
      <Header titulo="Multas Ambientales" onBack={onBack} />
      <ScrollView contentContainerStyle={s.listaPad}>
        <TextInput style={s.input} placeholder="Cédula de identidad (ej: V-12345678)" placeholderTextColor={GRIS} keyboardType="numeric" value={cedula} onChangeText={setCedula} />
        <TouchableOpacity style={[s.btnVerde,cargando&&s.btnDeshabilitado]} onPress={consultar} disabled={cargando}>
          {cargando?<ActivityIndicator color="#fff"/>:<Text style={s.btnVerdeTxt}>🔍  Consultar</Text>}
        </TouchableOpacity>
        {multas!==null&&multas.length===0&&<Card style={{marginTop:20,alignItems:'center'}}><Text style={{fontSize:32}}>✅</Text><Text style={s.noticiaTitle}>Sin multas registradas</Text></Card>}
        {multas!==null&&multas.map(m=>(
          <Card key={m.id} style={{marginTop:12}}>
            <Text style={[s.noticiaTitle,{fontSize:20}]}>Bs. {Number(m.monto||0).toLocaleString('es-VE')}</Text>
            <Text style={s.noticiaTitle}>{m.concepto}</Text>
            <Text style={s.noticiaResumen}>Estado: {m.estado} · {m.fecha?new Date(m.fecha).toLocaleDateString('es-VE'):''}</Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Pantalla: Empresas ─────────────────────────────────────────────────────

function PantallaEmpresas({ onBack }) {
  const [busqueda, setBusqueda] = useState('');
  const [empresas, setEmpresas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const buscar = async () => {
    setCargando(true);
    try {
      const f = busqueda?`?filter=(nombre~'${busqueda}')`:'?perPage=20';
      const res = await fetch(`${API}/api/collections/empresas/records${f}&sort=nombre`);
      const d = await res.json(); setEmpresas(d.items||[]);
    } catch { setEmpresas([]); } finally { setCargando(false); }
  };
  useEffect(()=>{buscar();},[]);
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={VERDE_DARK} />
      <Header titulo="Registro de Empresas" onBack={onBack} />
      <View style={s.searchRow}>
        <TextInput style={s.searchInput} placeholder="Buscar por nombre o RIF..." placeholderTextColor={GRIS} value={busqueda} onChangeText={setBusqueda} onSubmitEditing={buscar} />
        <TouchableOpacity style={s.searchBtn} onPress={buscar}><Text style={s.searchBtnTxt}>🔍</Text></TouchableOpacity>
      </View>
      {cargando?<ActivityIndicator size="large" color={VERDE} style={{marginTop:40}}/>:(
        <ScrollView contentContainerStyle={s.listaPad}>
          {empresas.length===0&&<Text style={s.vacio}>No se encontraron empresas</Text>}
          {empresas.map(e=><Card key={e.id} style={{marginBottom:10}}><Text style={s.noticiaTitle}>{e.nombre}</Text><Text style={s.noticiaResumen}>RIF: {e.rif||'N/D'} · {e.actividad||''}</Text></Card>)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Pantalla: Trámites ─────────────────────────────────────────────────────

function PantallaTramites({ onBack }) {
  const [tramites, setTramites] = useState([]);
  const [cargando, setCargando] = useState(true);
  useEffect(()=>{
    fetch(`${API}/api/collections/tramites/records?sort=nombre&perPage=50`)
      .then(r=>r.json()).then(d=>{setTramites(d.items||[]);setCargando(false);}).catch(()=>setCargando(false));
  },[]);
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={VERDE_DARK} />
      <Header titulo="Trámites y Servicios" onBack={onBack} />
      {cargando?<ActivityIndicator size="large" color={VERDE} style={{marginTop:40}}/>:(
        <ScrollView contentContainerStyle={s.listaPad}>
          {tramites.length===0&&<Text style={s.vacio}>No hay trámites disponibles</Text>}
          {tramites.map(t=>(
            <Card key={t.id} style={{marginBottom:10}}>
              <Text style={s.noticiaTitle}>{t.nombre}</Text>
              {t.descripcion&&<Text style={s.noticiaResumen}>{t.descripcion}</Text>}
              {t.duracion&&<Text style={[s.noticiaResumen,{color:VERDE,fontWeight:'600'}]}>⏱ {t.duracion}</Text>}
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Pantalla: Comunales ────────────────────────────────────────────────────

function PantallaComunales({ onBack }) {
  const [consejos, setConsejos] = useState([]);
  const [cargando, setCargando] = useState(true);
  useEffect(()=>{
    fetch(`${API}/api/collections/consejos_comunales/records?sort=nombre&perPage=50`)
      .then(r=>r.json()).then(d=>{setConsejos(d.items||[]);setCargando(false);}).catch(()=>setCargando(false));
  },[]);
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={VERDE_DARK} />
      <Header titulo="Consejos Comunales" onBack={onBack} />
      {cargando?<ActivityIndicator size="large" color={VERDE} style={{marginTop:40}}/>:(
        <ScrollView contentContainerStyle={s.listaPad}>
          {consejos.length===0&&<Text style={s.vacio}>No hay consejos comunales registrados</Text>}
          {consejos.map(c=>(
            <Card key={c.id} style={{marginBottom:10}}>
              <Text style={s.noticiaTitle}>{c.nombre}</Text>
              {c.parroquia&&<Text style={s.noticiaResumen}>📍 {c.parroquia}</Text>}
              {c.vocero&&<Text style={s.noticiaResumen}>👤 {c.vocero}</Text>}
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Pantalla: Agenda ───────────────────────────────────────────────────────

function PantallaAgenda({ onBack }) {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  useEffect(()=>{
    fetch(`${API}/api/collections/eventos/records?sort=-fecha&perPage=20`)
      .then(r=>r.json()).then(d=>{setEventos(d.items||[]);setCargando(false);}).catch(()=>setCargando(false));
  },[]);
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={VERDE_DARK} />
      <Header titulo="Agenda SIGAP" onBack={onBack} />
      {cargando?<ActivityIndicator size="large" color={VERDE} style={{marginTop:40}}/>:(
        <ScrollView contentContainerStyle={s.listaPad}>
          {eventos.length===0&&<Text style={s.vacio}>No hay eventos programados</Text>}
          {eventos.map(e=>(
            <Card key={e.id} style={{marginBottom:10}}>
              <Text style={s.noticiaFecha}>{e.fecha?new Date(e.fecha).toLocaleDateString('es-VE',{weekday:'long',day:'numeric',month:'long'}):''}</Text>
              <Text style={s.noticiaTitle}>{e.titulo||e.nombre}</Text>
              {e.lugar&&<Text style={s.noticiaResumen}>📍 {e.lugar}</Text>}
              {e.descripcion&&<Text style={s.noticiaResumen}>{e.descripcion}</Text>}
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── App principal ──────────────────────────────────────────────────────────

export default function App() {
  const [pantalla, setPantalla] = useState('inicio');
  const pantallas = {
    inicio:    <PantallaInicio ir={setPantalla} />,
    noticias:  <PantallaNoticias onBack={()=>setPantalla('inicio')} />,
    denuncias: <PantallaDenuncia onBack={()=>setPantalla('inicio')} />,
    multas:    <PantallaMultas onBack={()=>setPantalla('inicio')} />,
    empresas:  <PantallaEmpresas onBack={()=>setPantalla('inicio')} />,
    tramites:  <PantallaTramites onBack={()=>setPantalla('inicio')} />,
    comunales: <PantallaComunales onBack={()=>setPantalla('inicio')} />,
    agenda:    <PantallaAgenda onBack={()=>setPantalla('inicio')} />,
  };
  return pantallas[pantalla] || pantallas.inicio;
}

// ─── Estilos ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: BG },

  navbar:        { backgroundColor: VERDE_DARK, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: `rgba(198,168,91,.35)` },
  navLogo:       { width: 36, height: 36, marginRight: 8 },
  navBrand:      { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 1, flex: 1 },
  navSigap:      { backgroundColor: 'rgba(198,168,91,.2)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: DORADO },
  navSigapTxt:   { color: DORADO, fontSize: 10, fontWeight: '700' },

  header:        { backgroundColor: VERDE_DARK, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:       { marginRight: 12, padding: 4 },
  backTxt:       { color: '#fff', fontSize: 22 },
  headerLogo:    { width: 32, height: 32, marginRight: 10 },
  headerTxt:     { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1 },

  inicioScroll:  { paddingBottom: 32 },

  hero:          { backgroundColor: VERDE_DARK, padding: 24, paddingTop: 28 },
  heroBadge:     { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  heroDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80', marginRight: 8 },
  heroBadgeTxt:  { color: 'rgba(255,255,255,.8)', fontSize: 11 },
  heroSlogan:    { color: DORADO, fontSize: 13, fontStyle: 'italic', marginBottom: 8 },
  heroTitulo:    { color: '#fff', fontSize: 26, fontWeight: '800', lineHeight: 34, marginBottom: 12 },
  heroSub:       { color: 'rgba(255,255,255,.75)', fontSize: 13, lineHeight: 20, marginBottom: 20 },
  heroBtns:      { flexDirection: 'row', gap: 10 },
  heroBtnVerde:  { backgroundColor: VERDE, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, flex: 1 },
  heroBtnVerdeTxt:{ color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  heroBtnBorde:  { borderWidth: 1.5, borderColor: 'rgba(255,255,255,.5)', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16 },
  heroBtnBordeTxt:{ color: '#fff', fontWeight: '600', fontSize: 13 },

  secHeader:     { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4, alignItems: 'center' },
  secTitulo:     { fontSize: 15, fontWeight: '700', color: VERDE_DARK, textAlign: 'center' },
  secSub:        { fontSize: 12, color: GRIS, textAlign: 'center', marginTop: 2 },

  grid:          { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 10 },
  modCard:       { width: '46%', backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: DORADO, elevation: 2 },
  modIcon:       { width: '100%', height: 100 },
  modInfo:       { padding: 10 },
  modLabel:      { fontSize: 12, fontWeight: '700', color: VERDE_DARK, marginBottom: 2 },
  modSub:        { fontSize: 10, color: GRIS },

  footer:        { alignItems: 'center', padding: 24, borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 10 },
  footerLogo:    { width: 60, height: 60, marginBottom: 10 },
  footerTxt:     { fontSize: 11, color: GRIS, textAlign: 'center', lineHeight: 18 },

  card:          { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 1 },
  listaPad:      { padding: 16 },
  vacio:         { textAlign: 'center', color: GRIS, marginTop: 40, fontSize: 15 },

  chip:          { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8 },
  chipTxt:       { fontSize: 11, fontWeight: '600' },

  noticiaCard:   { marginBottom: 12 },
  noticiaTitle:  { fontSize: 15, fontWeight: '700', color: TEXTO, marginBottom: 4 },
  noticiaResumen:{ fontSize: 13, color: GRIS, lineHeight: 20 },
  noticiaFecha:  { fontSize: 11, color: DORADO, marginTop: 4, fontWeight: '600', marginBottom: 4 },

  formSeccion:   { fontSize: 13, fontWeight: '700', color: VERDE_DARK, marginTop: 16, marginBottom: 8 },
  input:         { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 14, color: TEXTO, marginBottom: 10 },
  inputArea:     { height: 100, textAlignVertical: 'top' },
  tiposGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tipoBtn:       { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#fff' },
  tipoBtnActivo: { borderColor: VERDE, backgroundColor: VERDE },
  tipoBtnTxt:    { fontSize: 12, color: GRIS },
  tipoBtnTxtActivo: { color: '#fff', fontWeight: '600' },

  btnVerde:      { backgroundColor: VERDE, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  btnVerdeTxt:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDeshabilitado: { opacity: .6 },

  exitoContainer:{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  exitoIcon:     { fontSize: 64, marginBottom: 16 },
  exitoTitulo:   { fontSize: 24, fontWeight: '800', color: VERDE_DARK, marginBottom: 8 },
  exitoSub:      { fontSize: 14, color: GRIS, textAlign: 'center', lineHeight: 22, marginBottom: 32 },

  searchRow:     { flexDirection: 'row', padding: 12, gap: 8 },
  searchInput:   { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 14, color: TEXTO },
  searchBtn:     { backgroundColor: VERDE, borderRadius: 10, padding: 12, alignItems: 'center', justifyContent: 'center' },
  searchBtnTxt:  { fontSize: 18 },
});
