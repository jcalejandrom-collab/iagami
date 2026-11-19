import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  StatusBar, TextInput, Alert, ActivityIndicator,
  SafeAreaView, Platform
} from 'react-native';

const VERDE = '#1d6b3e';
const VERDE_DARK = '#1a3d2b';
const DORADO = '#C6A85B';
const BG = '#f5f7f5';
const TEXTO = '#1f2937';
const GRIS = '#64748b';

const API = 'https://api.iagami.online';

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

function Chip({ label, color = VERDE }) {
  return (
    <View style={[s.chip, { borderColor: color }]}>
      <Text style={[s.chipTxt, { color }]}>{label}</Text>
    </View>
  );
}

function PantallaInicio({ ir }) {
  const modulos = [
    { id: 'noticias',   label: 'Noticias',          icon: '📰', color: VERDE },
    { id: 'denuncias',  label: 'Denuncias',          icon: '🚨', color: '#dc2626' },
    { id: 'multas',     label: 'Consultar Multas',   icon: '📋', color: '#d97706' },
    { id: 'empresas',   label: 'Empresas',           icon: '🏭', color: VERDE },
    { id: 'tramites',   label: 'Trámites',           icon: '📄', color: '#7c3aed' },
    { id: 'comunales',  label: 'Consejos Comunales', icon: '🏘️', color: '#0891b2' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={VERDE_DARK} />
      <ScrollView contentContainerStyle={s.inicioScroll}>
        <View style={s.hero}>
          <View style={s.logoCircle}>
            <Text style={s.logoLetra}>I</Text>
          </View>
          <Text style={s.heroTitulo}>IAGAMI</Text>
          <Text style={s.heroSub}>Instituto Autónomo de Gestión Ambiental</Text>
          <Text style={s.heroMuni}>Municipio Iribarren · Barquisimeto</Text>
        </View>
        <Text style={s.secTitulo}>Servicios al Ciudadano</Text>
        <View style={s.grid}>
          {modulos.map(m => (
            <TouchableOpacity key={m.id} style={s.modCard} onPress={() => ir(m.id)}>
              <Text style={s.modIcon}>{m.icon}</Text>
              <Text style={s.modLabel}>{m.label}</Text>
              <View style={[s.modBar, { backgroundColor: m.color }]} />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.portalBtn} onPress={() => ir('portal')}>
          <Text style={s.portalBtnTxt}>🌐  Ver Portal Institucional</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function PantallaNoticias({ onBack }) {
  const [noticias, setNoticias] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/collections/noticias/records?sort=-created&perPage=20`)
      .then(r => r.json())
      .then(d => { setNoticias(d.items || []); setCargando(false); })
      .catch(() => { setNoticias([]); setCargando(false); });
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={VERDE_DARK} />
      <Header titulo="Últimas Noticias" onBack={onBack} />
      {cargando ? (
        <ActivityIndicator size="large" color={VERDE} style={{ marginTop: 40 }} />
      ) : (
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

function PantallaDenuncia({ onBack }) {
  const [form, setForm] = useState({
    nombre: '', cedula: '', telefono: '', email: '',
    tipo: '', descripcion: '', ubicacion: '',
  });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const tipos = ['Contaminación del aire', 'Vertido ilegal', 'Tala ilegal',
    'Contaminación de suelos', 'Ruido excesivo', 'Otro'];

  const enviar = async () => {
    if (!form.descripcion || !form.ubicacion) {
      Alert.alert('Campos requeridos', 'Por favor completa descripción y ubicación.');
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch(`${API}/api/collections/denuncias/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, estado: 'recibida', fecha: new Date().toISOString() }),
      });
      if (res.ok) setEnviado(true);
      else Alert.alert('Error', 'No se pudo enviar la denuncia.');
    } catch {
      Alert.alert('Error de conexión', 'Verifica tu internet.');
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <SafeAreaView style={s.safe}>
        <Header titulo="Denuncia" onBack={onBack} />
        <View style={s.exitoContainer}>
          <Text style={s.exitoIcon}>✅</Text>
          <Text style={s.exitoTitulo}>¡Denuncia Enviada!</Text>
          <Text style={s.exitoSub}>Tu reporte ha sido recibido por IAGAMI.{"\n"}Será procesado a la brevedad posible.</Text>
          <TouchableOpacity style={s.btnVerde} onPress={() => { setEnviado(false); setForm({ nombre:'',cedula:'',telefono:'',email:'',tipo:'',descripcion:'',ubicacion:'' }); }}>
            <Text style={s.btnVerdeTxt}>Hacer otra denuncia</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnDorado} onPress={onBack}>
            <Text style={s.btnDoradoTxt}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={VERDE_DARK} />
      <Header titulo="Hacer una Denuncia" onBack={onBack} />
      <ScrollView contentContainerStyle={s.listaPad} keyboardShouldPersistTaps="handled">
        <Text style={s.formSeccion}>Datos del denunciante (opcional)</Text>
        {[['nombre','Nombre completo'],['cedula','Cédula de identidad'],['telefono','Teléfono'],['email','Correo electrónico']].map(([k,p]) => (
          <TextInput key={k} style={s.input} placeholder={p} placeholderTextColor={GRIS}
            value={form[k]} onChangeText={v => setForm({...form,[k]:v})} />
        ))}
        <Text style={s.formSeccion}>Tipo de denuncia *</Text>
        <View style={s.tiposGrid}>
          {tipos.map(t => (
            <TouchableOpacity key={t} style={[s.tipoBtn, form.tipo===t && s.tipoBtnActivo]} onPress={() => setForm({...form,tipo:t})}>
              <Text style={[s.tipoBtnTxt, form.tipo===t && s.tipoBtnTxtActivo]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.formSeccion}>Descripción del hecho *</Text>
        <TextInput style={[s.input, s.inputArea]} placeholder="Describe detalladamente lo ocurrido..."
          placeholderTextColor={GRIS} multiline numberOfLines={4}
          value={form.descripcion} onChangeText={v => setForm({...form,descripcion:v})} />
        <Text style={s.formSeccion}>Ubicación *</Text>
        <TextInput style={s.input} placeholder="Dirección, sector o parroquia"
          placeholderTextColor={GRIS} value={form.ubicacion} onChangeText={v => setForm({...form,ubicacion:v})} />
        <TouchableOpacity style={[s.btnVerde, enviando && s.btnDeshabilitado]} onPress={enviar} disabled={enviando}>
          {enviando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnVerdeTxt}>📤  Enviar Denuncia</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function PantallaMultas({ onBack }) {
  const [cedula, setCedula] = useState('');
  const [multas, setMultas] = useState(null);
  const [cargando, setCargando] = useState(false);

  const consultar = async () => {
    if (!cedula) { Alert.alert('Requerido', 'Ingresa tu cédula de identidad.'); return; }
    setCargando(true);
    try {
      const res = await fetch(`${API}/api/collections/multas/records?filter=(cedula='${cedula}')&sort=-created`);
      const d = await res.json();
      setMultas(d.items || []);
    } catch {
      Alert.alert('Error', 'No se pudo conectar.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={VERDE_DARK} />
      <Header titulo="Consultar Multas" onBack={onBack} />
      <ScrollView contentContainerStyle={s.listaPad}>
        <TextInput style={s.input} placeholder="Cédula de identidad (ej: V-12345678)"
          placeholderTextColor={GRIS} keyboardType="numeric" value={cedula} onChangeText={setCedula} />
        <TouchableOpacity style={[s.btnVerde, cargando && s.btnDeshabilitado]} onPress={consultar} disabled={cargando}>
          {cargando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnVerdeTxt}>🔍  Consultar</Text>}
        </TouchableOpacity>
        {multas !== null && multas.length === 0 && (
          <Card style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 32 }}>✅</Text>
            <Text style={[s.noticiaTitle, { textAlign: 'center' }]}>Sin multas registradas</Text>
          </Card>
        )}
        {multas !== null && multas.map(m => (
          <Card key={m.id} style={{ marginTop: 12 }}>
            <Text style={[s.noticiaTitle, { fontSize: 20 }]}>Bs. {Number(m.monto || 0).toLocaleString('es-VE')}</Text>
            <Text style={s.noticiaTitle}>{m.concepto}</Text>
            <Text style={s.noticiaResumen}>Estado: {m.estado} · {m.fecha ? new Date(m.fecha).toLocaleDateString('es-VE') : ''}</Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function PantallaEmpresas({ onBack }) {
  const [busqueda, setBusqueda] = useState('');
  const [empresas, setEmpresas] = useState([]);
  const [cargando, setCargando] = useState(false);

  const buscar = async () => {
    setCargando(true);
    try {
      const filtro = busqueda ? `?filter=(nombre~'${busqueda}')` : '?perPage=20';
      const res = await fetch(`${API}/api/collections/empresas/records${filtro}&sort=nombre`);
      const d = await res.json();
      setEmpresas(d.items || []);
    } catch {
      setEmpresas([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { buscar(); }, []);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={VERDE_DARK} />
      <Header titulo="Empresas Registradas" onBack={onBack} />
      <View style={s.searchRow}>
        <TextInput style={s.searchInput} placeholder="Buscar por nombre o RIF..."
          placeholderTextColor={GRIS} value={busqueda} onChangeText={setBusqueda}
          onSubmitEditing={buscar} returnKeyType="search" />
        <TouchableOpacity style={s.searchBtn} onPress={buscar}>
          <Text style={s.searchBtnTxt}>🔍</Text>
        </TouchableOpacity>
      </View>
      {cargando ? (
        <ActivityIndicator size="large" color={VERDE} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={s.listaPad}>
          {empresas.length === 0 && <Text style={s.vacio}>No se encontraron empresas</Text>}
          {empresas.map(e => (
            <Card key={e.id} style={{ marginBottom: 10 }}>
              <Text style={s.noticiaTitle}>{e.nombre}</Text>
              <Text style={s.noticiaResumen}>RIF: {e.rif || 'N/D'} · {e.actividad || ''}</Text>
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function PantallaTramites({ onBack }) {
  const [tramites, setTramites] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/collections/tramites/records?sort=nombre&perPage=50`)
      .then(r => r.json())
      .then(d => { setTramites(d.items || []); setCargando(false); })
      .catch(() => setCargando(false));
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={VERDE_DARK} />
      <Header titulo="Trámites y Servicios" onBack={onBack} />
      {cargando ? (
        <ActivityIndicator size="large" color={VERDE} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={s.listaPad}>
          {tramites.length === 0 && <Text style={s.vacio}>No hay trámites disponibles</Text>}
          {tramites.map(t => (
            <Card key={t.id} style={{ marginBottom: 10 }}>
              <Text style={s.noticiaTitle}>{t.nombre}</Text>
              {t.descripcion && <Text style={s.noticiaResumen}>{t.descripcion}</Text>}
              {t.duracion && <Text style={[s.noticiaResumen, { color: VERDE, fontWeight: '600' }]}>⏱  {t.duracion}</Text>}
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function PantallaComunales({ onBack }) {
  const [consejos, setConsejos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/collections/consejos_comunales/records?sort=nombre&perPage=50`)
      .then(r => r.json())
      .then(d => { setConsejos(d.items || []); setCargando(false); })
      .catch(() => setCargando(false));
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={VERDE_DARK} />
      <Header titulo="Consejos Comunales" onBack={onBack} />
      {cargando ? (
        <ActivityIndicator size="large" color={VERDE} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={s.listaPad}>
          {consejos.length === 0 && <Text style={s.vacio}>No hay consejos comunales registrados</Text>}
          {consejos.map(c => (
            <Card key={c.id} style={{ marginBottom: 10 }}>
              <Text style={s.noticiaTitle}>{c.nombre}</Text>
              {c.parroquia && <Text style={s.noticiaResumen}>📍 {c.parroquia}</Text>}
              {c.vocero && <Text style={s.noticiaResumen}>👤 {c.vocero}</Text>}
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function PantallaPortal({ onBack }) {
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={VERDE_DARK} />
      <Header titulo="Portal Institucional" onBack={onBack} />
      <View style={s.portalContainer}>
        <Text style={{ fontSize: 48 }}>🌐</Text>
        <Text style={s.noticiaTitle}>Portal Web IAGAMI</Text>
        <Text style={[s.noticiaResumen, { textAlign: 'center' }]}>
          Visita el portal en:{"\n"}
          <Text style={{ color: VERDE, fontWeight: '700' }}>iagami.online</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [pantalla, setPantalla] = useState('inicio');
  const pantallas = {
    inicio:    <PantallaInicio ir={setPantalla} />,
    noticias:  <PantallaNoticias onBack={() => setPantalla('inicio')} />,
    denuncias: <PantallaDenuncia onBack={() => setPantalla('inicio')} />,
    multas:    <PantallaMultas onBack={() => setPantalla('inicio')} />,
    empresas:  <PantallaEmpresas onBack={() => setPantalla('inicio')} />,
    tramites:  <PantallaTramites onBack={() => setPantalla('inicio')} />,
    comunales: <PantallaComunales onBack={() => setPantalla('inicio')} />,
    portal:    <PantallaPortal onBack={() => setPantalla('inicio')} />,
  };
  return pantallas[pantalla] || pantallas.inicio;
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: BG },
  header:        { backgroundColor: VERDE_DARK, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:       { marginRight: 12, padding: 4 },
  backTxt:       { color: '#fff', fontSize: 22, lineHeight: 26 },
  headerTxt:     { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },
  inicioScroll:  { paddingBottom: 32 },
  hero:          { backgroundColor: VERDE_DARK, alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  logoCircle:    { width: 72, height: 72, borderRadius: 36, backgroundColor: DORADO, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoLetra:     { color: VERDE_DARK, fontSize: 36, fontWeight: '900' },
  heroTitulo:    { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 2 },
  heroSub:       { color: 'rgba(255,255,255,.85)', fontSize: 13, textAlign: 'center', marginTop: 4 },
  heroMuni:      { color: DORADO, fontSize: 12, marginTop: 4 },
  secTitulo:     { fontSize: 16, fontWeight: '700', color: VERDE_DARK, margin: 20, marginBottom: 12 },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  modCard:       { width: '46%', backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', elevation: 2 },
  modIcon:       { fontSize: 32, marginBottom: 8 },
  modLabel:      { fontSize: 13, fontWeight: '600', color: TEXTO, textAlign: 'center' },
  modBar:        { height: 3, borderRadius: 2, width: '60%', marginTop: 10 },
  portalBtn:     { margin: 20, backgroundColor: VERDE, borderRadius: 12, padding: 16, alignItems: 'center' },
  portalBtnTxt:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  card:          { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 1 },
  listaPad:      { padding: 16 },
  vacio:         { textAlign: 'center', color: GRIS, marginTop: 40, fontSize: 15 },
  chip:          { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8 },
  chipTxt:       { fontSize: 11, fontWeight: '600' },
  noticiaCard:   { marginBottom: 12 },
  noticiaTitle:  { fontSize: 15, fontWeight: '700', color: TEXTO, marginBottom: 4 },
  noticiaResumen:{ fontSize: 13, color: GRIS, lineHeight: 20 },
  noticiaFecha:  { fontSize: 11, color: DORADO, marginTop: 8, fontWeight: '600' },
  infoTxt:       { fontSize: 13, color: GRIS, lineHeight: 20, marginBottom: 16 },
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
  btnDorado:     { backgroundColor: DORADO, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10 },
  btnDoradoTxt:  { color: VERDE_DARK, fontWeight: '700', fontSize: 15 },
  btnDeshabilitado: { opacity: .6 },
  exitoContainer:{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  exitoIcon:     { fontSize: 64, marginBottom: 16 },
  exitoTitulo:   { fontSize: 24, fontWeight: '800', color: VERDE_DARK, marginBottom: 8 },
  exitoSub:      { fontSize: 14, color: GRIS, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  searchRow:     { flexDirection: 'row', padding: 12, gap: 8 },
  searchInput:   { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 14, color: TEXTO },
  searchBtn:     { backgroundColor: VERDE, borderRadius: 10, padding: 12, alignItems: 'center', justifyContent: 'center' },
  searchBtnTxt:  { fontSize: 18 },
  portalContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
