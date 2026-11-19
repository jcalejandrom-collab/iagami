import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  StatusBar, TextInput, Alert, ActivityIndicator,
  Image, FlatList, Platform, Dimensions,
  KeyboardAvoidingView, Modal
} from 'react-native';

const VERDE = '#1d6b3e';
const VERDE_DARK = '#1a3d2b';
const DORADO = '#C6A85B';
const BG = '#f5f7f5';
const TEXTO = '#1f2937';
const GRIS = '#64748b';

const API = 'https://api.iagami.online';
const { width } = Dimensions.get('window');

const LOGO = require('./assets/logo-iagami.png');
const APP_ICON = require('./assets/app-icon.png');
const SEMERUQUITO = require('./assets/semeruquito.png');

const ICONOS = {
  denuncias:     require('./assets/iconos/01_presentar_denuncia.png'),
  tramites:      require('./assets/iconos/02_tramites_en_linea.png'),
  multas:        require('./assets/iconos/03_multas_ambientales.png'),
  atencion:      require('./assets/iconos/04_atencion_ciudadana.png'),
  transparencia: require('./assets/iconos/05_transparencia.png'),
  agenda:        require('./assets/iconos/06_agenda_sigap.png'),
  empresas:      require('./assets/iconos/07_registro_empresa.png'),
  noticias:      require('./assets/iconos/08_noticias.png'),
};

const MODULOS = [
  { id: 'denuncias',     label: 'Presentar Denuncia',  sub: 'Reporta problemas ambientales' },
  { id: 'tramites',      label: 'Trámites en Línea',   sub: 'Permisos y certificaciones' },
  { id: 'multas',        label: 'Consultar Multas',    sub: 'Revisa tu estado de multas' },
  { id: 'atencion',      label: 'Atención Ciudadana',  sub: 'Consultas y orientación' },
  { id: 'transparencia', label: 'Transparencia',       sub: 'Información pública' },
  { id: 'agenda',        label: 'Agenda SIGAP',        sub: 'Eventos y actividades' },
  { id: 'empresas',      label: 'Registro Empresa',    sub: 'Gestión empresarial' },
  { id: 'noticias',      label: 'Noticias',            sub: 'Actualidad ambiental' },
];

function Navbar({ onHome }) {
  return (
    <View style={s.navbar}>
      <TouchableOpacity onPress={onHome} style={s.navLogoBtn}>
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
    fetch(`${API}/api/collections/noticias/records?sort=-created&perPage=3&fields=id,titulo,resumen,imagen,created`)
      .then(r => r.json())
      .then(d => { if (d.items) setNoticias(d.items); })
      .catch(() => {})
      .finally(() => setLoadingNews(false));
  }, []);

  return (
    <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={s.hero}>
        <Image source={APP_ICON} style={s.heroImg} resizeMode="cover" />
        <View style={s.heroOverlay}>
          <Text style={s.heroTag}>IAGAMI · Municipio Iribarren</Text>
          <Text style={s.heroTitle}>
            Gestionamos el{' '}
            <Text style={{ color: DORADO }}>futuro ambiental</Text>
            {'\n'}de nuestra ciudad
          </Text>
          <Text style={s.heroSub}>Sistema Integral de Gestión Ambiental Pública</Text>
        </View>
      </View>

      <View style={s.section}>
        <View style={s.sectionHeader}>
          <View style={s.sectionBar} />
          <Text style={s.sectionTitle}>Últimas Noticias</Text>
        </View>
        {loadingNews ? (
          <ActivityIndicator color={VERDE} style={{ marginVertical: 16 }} />
        ) : noticias.length === 0 ? (
          <Text style={s.empty}>Sin noticias disponibles</Text>
        ) : (
          noticias.map(n => (
            <TouchableOpacity key={n.id} style={s.noticiaCard} onPress={() => ir('noticias')}>
              <View style={s.noticiaDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.noticiaTitle} numberOfLines={2}>{n.titulo}</Text>
                {n.resumen ? <Text style={s.noticiaSub} numberOfLines={2}>{n.resumen}</Text> : null}
              </View>
            </TouchableOpacity>
          ))
        )}
        <TouchableOpacity style={s.verTodo} onPress={() => ir('noticias')}>
          <Text style={s.verTodoTxt}>Ver todas las noticias →</Text>
        </TouchableOpacity>
      </View>

      <View style={s.section}>
        <View style={s.sectionHeader}>
          <View style={s.sectionBar} />
          <Text style={s.sectionTitle}>Servicios Ciudadanos</Text>
        </View>
        <View style={s.grid}>
          {MODULOS.map(m => (
            <TouchableOpacity key={m.id} style={s.modulo} onPress={() => ir(m.id)}>
              <View style={s.moduloIconWrap}>
                <Image source={ICONOS[m.id]} style={s.moduloIcon} resizeMode="contain" />
              </View>
              <Text style={s.moduloLabel} numberOfLines={2}>{m.label}</Text>
              <Text style={s.moduloSub} numberOfLines={1}>{m.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
      .then(r => r.json())
      .then(d => { if (d.items) setItems(d.items); })
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
              {imgUrl(item) && <Image source={{ uri: imgUrl(item) }} style={s.newsImg} resizeMode="cover" />}
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
    } catch { Alert.alert('Error de conexión', 'Verifica tu internet e intenta de nuevo.'); }
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
            <Text style={{ color: GRIS, fontSize: 13 }}>Reporta problemas ambientales en el Municipio Iribarren. Los campos (*) son obligatorios.</Text>
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
      <Header titulo="Consultar Multas" onBack={onBack} />
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
        {multas !== null && (
          multas.length === 0 ? <Text style={s.empty}>No se encontraron multas para esta cédula.</Text>
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

function PantallaEmpresas({ onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    fetch(`${API}/api/collections/empresas/records?sort=nombre&perPage=50`)
      .then(r => r.json()).then(d => { if (d.items) setItems(d.items); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtradas = items.filter(e => e.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || e.rif?.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <View style={s.flex}>
      <Header titulo="Registro de Empresas" onBack={onBack} />
      <View style={{ padding: 12, backgroundColor: '#fff' }}>
        <TextInput style={[s.input, { margin: 0 }]} placeholder="Buscar por nombre o RIF..." placeholderTextColor={GRIS} value={busqueda} onChangeText={setBusqueda} />
      </View>
      {loading ? <ActivityIndicator color={VERDE} style={s.loader} /> : (
        <FlatList data={filtradas} keyExtractor={i => i.id} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
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

function PantallaTramites({ onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/collections/tramites/records?sort=nombre&perPage=50`)
      .then(r => r.json()).then(d => { if (d.items) setItems(d.items); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <View style={s.flex}>
      <Header titulo="Trámites en Línea" onBack={onBack} />
      {loading ? <ActivityIndicator color={VERDE} style={s.loader} /> : (
        <FlatList data={items} keyExtractor={i => i.id} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 12 }}>
              <View style={{ padding: 14 }}>
                <Text style={{ fontWeight: '700', color: TEXTO }}>{item.nombre || item.titulo}</Text>
                {item.descripcion && <Text style={{ color: GRIS, fontSize: 13, marginTop: 4 }}>{item.descripcion}</Text>}
                {item.requisitos && <Text style={{ color: VERDE, fontSize: 12, marginTop: 6 }}>Requisitos: {item.requisitos}</Text>}
              </View>
            </Card>
          )}
          ListEmptyComponent={<Text style={s.empty}>No hay trámites disponibles</Text>}
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
        <FlatList data={items} keyExtractor={i => i.id} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
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

function PantallaTransparencia({ onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/collections/documentos/records?sort=-created&perPage=30`)
      .then(r => r.json()).then(d => { if (d.items) setItems(d.items); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <View style={s.flex}>
      <Header titulo="Transparencia" onBack={onBack} />
      {loading ? <ActivityIndicator color={VERDE} style={s.loader} /> : (
        <FlatList data={items} keyExtractor={i => i.id} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 10 }}>
              <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, marginRight: 12 }}>📄</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: TEXTO }}>{item.titulo || item.nombre}</Text>
                  <Text style={{ color: GRIS, fontSize: 12, marginTop: 2 }}>{new Date(item.created).toLocaleDateString('es-VE')}</Text>
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={<Text style={s.empty}>No hay documentos disponibles</Text>}
        />
      )}
    </View>
  );
}

function PantallaAtencion({ onBack }) {
  return (
    <View style={s.flex}>
      <Header titulo="Atención Ciudadana" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Card style={{ marginBottom: 14, borderLeftWidth: 4, borderLeftColor: DORADO }}>
          <View style={{ padding: 16 }}>
            <Text style={{ fontWeight: '700', color: VERDE_DARK, fontSize: 16, marginBottom: 10 }}>IAGAMI — Municipio Iribarren</Text>
            <Text style={{ color: GRIS, marginBottom: 6 }}>📍 Barquisimeto, Estado Lara, Venezuela</Text>
            <Text style={{ color: GRIS, marginBottom: 6 }}>🌐 iagami.online</Text>
            <Text style={{ color: GRIS, marginBottom: 6 }}>📧 contacto@iagami.online</Text>
          </View>
        </Card>
        <Card>
          <View style={{ padding: 16 }}>
            <Text style={{ fontWeight: '700', color: TEXTO, marginBottom: 10 }}>Horario de atención</Text>
            <Text style={{ color: GRIS }}>Lunes a Viernes: 8:00 AM – 4:00 PM</Text>
            <Text style={{ color: GRIS, marginTop: 4 }}>Sábados: 8:00 AM – 12:00 PM</Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const FAQ_LOCAL = [
  { q: ['denuncia','denunciar','reportar','problema ambiental'], a: 'Para presentar una denuncia ambiental, ve al módulo "Presentar Denuncia". Puedes reportar contaminación, tala ilegal, vertidos y más.' },
  { q: ['multa','multas','sanción','deuda'], a: 'Consulta tus multas en el módulo "Consultar Multas". Ingresa tu cédula para ver el estado de tus obligaciones.' },
  { q: ['trámite','tramite','permiso','certificado','solicitud'], a: 'Los trámites y permisos ambientales están en el módulo "Trámites en Línea" con todos los requisitos.' },
  { q: ['empresa','registro empresa','rif','industria'], a: 'El registro y consulta de empresas está en el módulo "Registro Empresa". Busca por nombre o RIF.' },
  { q: ['evento','agenda','actividad','charla'], a: 'Consulta la "Agenda SIGAP" para ver próximos eventos y actividades ambientales del municipio.' },
  { q: ['noticia','noticias','información','comunicado'], a: 'Las últimas noticias del IAGAMI están en el módulo "Noticias" o en la pantalla principal.' },
  { q: ['transparencia','documento','informe','presupuesto'], a: 'Los documentos de gestión pública están en el módulo "Transparencia".' },
  { q: ['hola','buenos días','buenas','saludos','hey'], a: '¡Hola! Soy Semeruquito, el asistente virtual del IAGAMI. ¿En qué puedo ayudarte hoy?' },
  { q: ['gracias','muchas gracias','ok','listo'], a: '¡Con gusto! Estoy aquí para ayudarte con cualquier consulta ambiental.' },
  { q: ['iagami','que es','quiénes son','instituto'], a: 'El IAGAMI es el Instituto Autónomo de Gestión Ambiental del Municipio Iribarren, Barquisimeto, Estado Lara.' },
];

function responder(msg) {
  const m = msg.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const item of FAQ_LOCAL) {
    if (item.q.some(k => m.includes(k.normalize('NFD').replace(/[̀-ͯ]/g, '')))) return item.a;
  }
  return 'No tengo información sobre eso ahora. Para más ayuda visita iagami.online o escribe a contacto@iagami.online';
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
  noticias: PantallaNoticias, denuncias: PantallaDenuncias, multas: PantallaMultas,
  empresas: PantallaEmpresas, tramites: PantallaTramites, agenda: PantallaAgenda,
  transparencia: PantallaTransparencia, atencion: PantallaAtencion,
};

export default function App() {
  const [pantalla, setPantalla] = useState('inicio');
  const [chatVisible, setChatVisible] = useState(false);
  const ir = id => { if (SCREENS[id]) setPantalla(id); };
  const volver = () => setPantalla('inicio');
  const Pantalla = SCREENS[pantalla];

  return (
    <View style={s.root}>
      <StatusBar backgroundColor={VERDE_DARK} barStyle="light-content" />
      <Navbar onHome={volver} />
      <View style={s.flex}>
        {pantalla === 'inicio' ? <PantallaInicio ir={ir} /> : <Pantalla onBack={volver} />}
      </View>
      <TouchableOpacity style={s.fab} onPress={() => setChatVisible(true)}>
        <Image source={SEMERUQUITO} style={s.fabImg} />
      </TouchableOpacity>
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
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24,
    paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: DORADO,
  },
  navLogoBtn: { padding: 4 },
  navLogo: { width: 100, height: 48 },
  navBadge: { backgroundColor: DORADO+'22', borderColor: DORADO, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  navBadgeTxt: { color: DORADO, fontSize: 11, fontWeight: '700' },
  header: { backgroundColor: VERDE, flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 2, borderBottomColor: DORADO },
  backBtn: { marginRight: 12, padding: 4 },
  backTxt: { color: DORADO, fontSize: 22, fontWeight: '700' },
  headerTxt: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },
  hero: { width: '100%', height: 240, position: 'relative', overflow: 'hidden' },
  heroImg: { width: '100%', height: '100%' },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(26,61,43,0.82)', padding: 18 },
  heroTag: { color: DORADO, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 26 },
  heroSub: { color: '#ffffffcc', fontSize: 12, marginTop: 6 },
  section: { padding: 16, paddingTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionBar: { width: 4, height: 20, backgroundColor: DORADO, borderRadius: 2, marginRight: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: VERDE_DARK },
  noticiaCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: VERDE, elevation: 1, shadowColor: '#000', shadowOffset: { width:0, height:1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  noticiaDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: DORADO, marginTop: 5, marginRight: 10 },
  noticiaTitle: { fontWeight: '600', color: TEXTO, fontSize: 14, lineHeight: 20 },
  noticiaSub: { color: GRIS, fontSize: 12, marginTop: 2 },
  verTodo: { alignItems: 'flex-end', marginTop: 4 },
  verTodoTxt: { color: VERDE, fontWeight: '600', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  modulo: { width: (width-56)/2, backgroundColor: '#fff', borderRadius: 14, padding: 14, margin: 6, alignItems: 'center', borderWidth: 1, borderColor: DORADO+'44', elevation: 2, shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity: 0.08, shadowRadius: 4 },
  moduloIconWrap: { width: 72, height: 72, borderRadius: 16, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 1, borderColor: DORADO+'33' },
  moduloIcon: { width: 60, height: 60 },
  moduloLabel: { color: TEXTO, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  moduloSub: { color: GRIS, fontSize: 11, textAlign: 'center', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width:0, height:1 }, shadowOpacity: 0.08, shadowRadius: 3, overflow: 'hidden' },
  newsImg: { width: '100%', height: 160 },
  newsTitle: { fontWeight: '700', color: TEXTO, fontSize: 15, lineHeight: 22 },
  newsSub: { color: GRIS, fontSize: 13, marginTop: 4, lineHeight: 18 },
  newsDate: { color: DORADO, fontSize: 11, marginTop: 6, fontWeight: '600' },
  campo: { marginBottom: 14 },
  campoLabel: { color: TEXTO, fontWeight: '600', marginBottom: 6, fontSize: 14 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, color: TEXTO, fontSize: 15 },
  btnPrimary: { backgroundColor: VERDE, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: DORADO },
  btnPrimaryTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  fab: { position: 'absolute', bottom: 28, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: DORADO, shadowOffset: { width:0, height:4 }, shadowOpacity: 0.5, shadowRadius: 8, borderWidth: 2, borderColor: DORADO },
  fabImg: { width: 52, height: 52, borderRadius: 26 },
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
});
