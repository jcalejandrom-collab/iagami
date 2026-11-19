import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  StatusBar, ActivityIndicator, Image, Platform, Dimensions,
  KeyboardAvoidingView, Modal, Animated, Easing,
  TextInput, Alert, BackHandler, Linking,
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

const ICONOS = {
  denuncias:     require('./assets/iconos/01_presentar_denuncia.png'),
  tramites:      require('./assets/iconos/02_tramites_en_linea.png'),
  multas:        require('./assets/iconos/03_multas_ambientales.png'),
  atencion:      require('./assets/iconos/04_atencion_ciudadana.png'),
  empresas:      require('./assets/iconos/07_registro_empresa.png'),
  noticias:      require('./assets/iconos/08_noticias.png'),
  proyectos:     require('./assets/iconos/13_proyectos_sigap.png'),
  brigadas:      require('./assets/iconos/15_mapa_brigadas.png'),
  aula:          require('./assets/iconos/16_aula_ambiental.png'),
  estudiante:    require('./assets/iconos/17_portal_estudiante.png'),
  comunas:       require('./assets/iconos/comunas.png'),
  permisos:      require('./assets/iconos/permisos_ambientales.png'),
};

const WEB = 'https://iagami.online';

const MODULOS = [
  { id: 'denuncias',     label: 'Presentar Denuncia',   url: WEB, pagina: 'denuncia' },
  { id: 'tramites',      label: 'Trámites en Línea',    url: `${WEB}/tramites` },
  { id: 'multas',        label: 'Multas Ambientales',   url: `${WEB}/multas` },
  { id: 'atencion',      label: 'Atención Ciudadana',   url: `${WEB}/atencion` },
  { id: 'empresas',      label: 'Registro Empresa',     url: `${WEB}/empresas` },
  { id: 'permisos',      label: 'Permisos Ambientales', url: `${WEB}/permisos-ambientales` },
  { id: 'comunas',       label: 'Comunas',              url: `${WEB}/consejos-comunales` },
  { id: 'noticias',      label: 'Noticias',             url: `${WEB}/noticias` },
  { id: 'proyectos',     label: 'Proyectos SIGAP',      url: `${WEB}/proyectos` },
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


function crearScript(pagina) {
  return String.raw`(function(){
  if (window.__iagamiApp) { try { window.__iagamiApp.run(); } catch(e){} return; }
  var A = window.__iagamiApp = {};
  var PAGINA = ` + JSON.stringify(pagina || '') + String.raw`;
  var RX = /portal institucional|acceso representantes|personal iagami/i;
  var de = document.documentElement;
  var revelado = false;

  function post(m){ try { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(m); } catch(e){} }
  function revelar(){ if (revelado) return; revelado = true; try { de.style.visibility = 'visible'; } catch(e){} post('ready'); }
  try { de.style.visibility = 'hidden'; } catch(e){}
  setTimeout(revelar, 5000);

  var CSS =
    'body>header,body>nav,body>div>header,body>div>nav,header nav,[role=banner],nav[role=navigation],' +
    '.nav:not(.nav-tabs):not(.nav-pills),.navbar,.topbar,.top-bar,.alert-bar,.site-header,.main-header,' +
    '.portal-header,#navbar,#header,#topbar,#nav{display:none!important}' +
    'html,body{touch-action:pan-x pan-y!important;-webkit-text-size-adjust:100%!important;text-size-adjust:100%!important;overflow-x:hidden!important}' +
    'body{padding-top:0!important}';
  function css(){
    if (document.getElementById('_app_css')) return;
    var st = document.createElement('style'); st.id = '_app_css'; st.textContent = CSS;
    (document.head || de).appendChild(st);
  }

  var VP = 'width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';
  function vp(){
    var h = document.head; if (!h) return;
    var ms = document.querySelectorAll('meta[name=viewport]'), m = ms[0];
    for (var i = 1; i < ms.length; i++) ms[i].parentNode.removeChild(ms[i]);
    if (!m) { m = document.createElement('meta'); m.setAttribute('name','viewport'); h.insertBefore(m, h.firstChild); }
    if (m.getAttribute('content') !== VP) m.setAttribute('content', VP);
  }

  function ocultar(el){
    if (!el || el === document.body || el === de) return;
    if (el.id === '_app_back_btn' || el.querySelector('#_app_back_btn')) return;
    el.style.setProperty('display','none','important');
  }
  function yDoc(el){ return el.getBoundingClientRect().top + (window.pageYOffset || 0); }
  function barra(el){
    var best = null, n = el;
    while (n && n !== document.body && n !== de) {
      var r = n.getBoundingClientRect();
      if (r.height > 170) break;
      if (r.top + (window.pageYOffset||0) < 260) best = n;
      n = n.parentElement;
    }
    return best;
  }
  function limpiar(){
    var b = document.body; if (!b) return;
    try {
      var els = b.querySelectorAll('a,button,span,li,p,small,strong,b,h1,h2,h3,h4,h5,h6,div');
      for (var i = 0; i < els.length; i++) {
        var e = els[i];
        if (e.childElementCount > 4 || !e.getClientRects().length) continue;
        var t = e.textContent || '';
        if (t.length > 70 || !RX.test(t) || yDoc(e) > 300) continue;
        ocultar(barra(e));
      }
      var imgs = b.querySelectorAll('img');
      for (var j = 0; j < imgs.length; j++) {
        var im = imgs[j];
        if (im.closest('#_app_back_btn') || !im.getClientRects().length) continue;
        var file = (im.getAttribute('src') || '').split('?')[0].split('/').pop();
        var alt = im.getAttribute('alt') || '';
        if (!(/logo/i.test(file) || /iagami/i.test(alt))) continue;
        if (yDoc(im) > 200) continue;
        ocultar(barra(im));
      }
      var all = b.getElementsByTagName('*');
      for (var k = 0; k < all.length; k++) {
        var el = all[k]; if (el.id === '_app_back_btn') continue;
        var cs = window.getComputedStyle(el);
        if (cs.display === 'none' || (cs.position !== 'fixed' && cs.position !== 'sticky')) continue;
        var rr = el.getBoundingClientRect();
        var top = cs.position === 'fixed' ? rr.top : rr.top + (window.pageYOffset||0);
        if (top <= 8 && rr.height > 0 && rr.height < 170 && rr.width > window.innerWidth * 0.6) ocultar(el);
      }
    } catch(e){}
  }

  function boton(){
    if (!document.body || document.getElementById('_app_back_btn')) return;
    var b = document.createElement('div');
    b.id = '_app_back_btn'; b.setAttribute('role','button');
    b.style.cssText = 'position:fixed;bottom:22px;left:14px;z-index:2147483647;background:rgba(255,255,255,.93);border-radius:28px;padding:7px 14px 7px 10px;display:flex;align-items:center;box-shadow:0 3px 12px rgba(0,0,0,.18);border:1.5px solid rgba(29,107,62,.18);cursor:pointer';
    var img = document.createElement('img');
    img.src = 'https://iagami.online/assets/images/leaf-arrow.png';
    img.style.cssText = 'height:36px;vertical-align:middle';
    img.onerror = function(){ img.style.display = 'none'; };
    var sp = document.createElement('span');
    sp.textContent = 'App';
    sp.style.cssText = 'font-family:Poppins,sans-serif;font-weight:800;font-size:13px;color:#1a3d2b;margin-left:6px';
    b.appendChild(img); b.appendChild(sp);
    b.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); post('goback'); });
    document.body.appendChild(b);
  }

  function esRaiz(u){
    try {
      var a = document.createElement('a'); a.href = u;
      var host = a.hostname.replace(/^www\./,'');
      var p = a.pathname.replace(/\/(index\.html)?$/,'');
      var h = a.hash;
      return host === 'iagami.online' && p === '' && (!h || h === '#' || h === '#inicio' || h === '#home');
    } catch(e){ return false; }
  }
  document.addEventListener('click', function(ev){
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a || a.closest('#_app_back_btn')) return;
    if (esRaiz(a.href) || RX.test(a.textContent || '')) { ev.preventDefault(); ev.stopPropagation(); post('goback'); }
  }, true);
  try {
    var hb = history.back.bind(history);
    history.back = function(){ if (history.length <= 1) post('goback'); else hb(); };
  } catch(e){}

  var paginaHecha = !PAGINA;
  function irPagina(){
    if (paginaHecha) return true;
    if (typeof window.showPage !== 'function') return false;
    try { window.showPage(PAGINA); } catch(e){}
    var orig = window.showPage;
    window.showPage = function(p){
      if (String(p).indexOf(PAGINA) === -1) { post('goback'); return; }
      return orig.apply(this, arguments);
    };
    paginaHecha = true; return true;
  }

  function run(){ css(); vp(); limpiar(); boton(); if (revelado) post('ready'); }
  A.run = run;

  css();
  var tmr = null;
  new MutationObserver(function(){
    vp(); css();
    if (tmr) return;
    tmr = setTimeout(function(){ tmr = null; limpiar(); boton(); }, 120);
  }).observe(de, { childList: true, subtree: true, attributes: true, attributeFilter: ['content'] });

  function listo(){
    vp(); css(); limpiar(); boton();
    var t0 = Date.now();
    (function esperar(){
      if (irPagina() || Date.now() - t0 > 4000) {
        limpiar();
        requestAnimationFrame(function(){ requestAnimationFrame(revelar); });
      } else setTimeout(esperar, 50);
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', listo);
  else listo();
})();true;`;
}

const esRaizNativa = u => !!u && u.replace('://www.', '://').replace(/\/(index\.html)?$/, '') === WEB;

function abrirExterno(url) {
  Linking.openURL(url).catch(() => Alert.alert('No se pudo abrir', 'No hay una aplicación para abrir este enlace.'));
}

function PantallaWeb({ url, pagina, onBack, backRef }) {
  const webRef = useRef(null);
  const puedeAtras = useRef(false);
  const cargaInicial = useRef(false);
  const onBackRef = useRef(onBack); onBackRef.current = onBack;
  const volver = () => onBackRef.current();

  const [cubierto, setCubierto] = useState(true);
  const [error, setError] = useState(null);
  const [recarga, setRecarga] = useState(0);

  const source = useMemo(() => ({ uri: url }), [url]);
  const script = useMemo(() => crearScript(pagina), [pagina]);
  const empezoEnRaiz = esRaizNativa(url);

  useEffect(() => {
    if (!backRef) return undefined;
    backRef.current = () => {
      if (puedeAtras.current && webRef.current) { webRef.current.goBack(); return true; }
      return false;
    };
    return () => { backRef.current = null; };
  }, [backRef]);

  useEffect(() => {
    if (!cubierto) return undefined;
    const t = setTimeout(() => setCubierto(false), 7000);
    return () => clearTimeout(t);
  }, [cubierto, recarga]);

  function permitirCarga(req) {
    const u = req.url || '';
    if (req.isTopFrame === false) return true;
    if (/^(about:|data:|blob:|javascript:)/i.test(u)) return true;
    if (/^https?:\/\//i.test(u)) {
      const host = (u.split('/')[2] || '').toLowerCase().split(':')[0];
      const interno = host === 'iagami.online' || host.endsWith('.iagami.online');
      const esPdf = /\.pdf($|[?#])/i.test(u);
      if (interno && !esPdf) {
        if (cargaInicial.current && esRaizNativa(u)) { volver(); return false; }
        return true;
      }
    }
    abrirExterno(u);
    return false;
  }

  function onNav(nav) {
    puedeAtras.current = !!nav.canGoBack;
    if (!nav.loading && cargaInicial.current && !empezoEnRaiz && esRaizNativa(nav.url)) volver();
  }

  return (
    <View style={s.flex}>
      <WebView
        key={recarga}
        ref={webRef}
        source={source}
        style={s.flex}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        allowsInlineMediaPlayback
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
        textZoom={100}
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        bounces={false}
        overScrollMode="never"
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        applicationNameForUserAgent="IAGAMIApp/3.0"
        injectedJavaScriptBeforeContentLoaded={script}
        injectedJavaScript={script}
        onShouldStartLoadWithRequest={permitirCarga}
        onNavigationStateChange={onNav}
        onLoadEnd={() => { cargaInicial.current = true; setTimeout(() => setCubierto(false), 1500); }}
        onError={({ nativeEvent }) => { setCubierto(false); setError(nativeEvent?.description || 'Error'); }}
        onMessage={({ nativeEvent }) => {
          if (nativeEvent.data === 'goback') volver();
          else if (nativeEvent.data === 'ready') setCubierto(false);
        }}
      />
      {cubierto && !error && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={VERDE} />
        </View>
      )}
      {error && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: BG, alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
          <Text style={{ color: VERDE_DARK, fontWeight: '700', fontSize: 16, marginBottom: 6 }}>No se pudo cargar la página</Text>
          <Text style={{ color: GRIS, fontSize: 13, textAlign: 'center', marginBottom: 16 }}>Verifica tu conexión e intenta de nuevo.</Text>
          <TouchableOpacity style={[s.btnPrimary, { paddingHorizontal: 28, marginBottom: 10 }]}
            onPress={() => { setError(null); setCubierto(true); cargaInicial.current = false; setRecarga(k => k + 1); }}>
            <Text style={s.btnPrimaryTxt}>Reintentar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={volver}><Text style={s.verTodoTxt}>← Volver</Text></TouchableOpacity>
        </View>
      )}
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
  { q: ['denuncia','denunciar','reportar','problema'], a: 'Para presentar una denuncia ambiental, ve al módulo "Presentar Denuncia". Puedes reportar contaminación, tala ilegal, vertidos y más.', go: 'denuncias' },
  { q: ['multa','multas','sanción','deuda','expediente'], a: 'Consulta tus multas en el módulo "Multas Ambientales". Ingresa tu cédula para ver el estado de tus obligaciones.', go: 'multas' },
  { q: ['trámite','tramite','certificado','solicitud'], a: 'Los trámites ambientales están en el módulo "Trámites en Línea" con todos los requisitos.', go: 'tramites' },
  { q: ['permiso','permisos'], a: 'Los permisos ambientales están en el módulo "Permisos Ambientales".', go: 'permisos' },
  { q: ['empresa','registro empresa','rif','industria'], a: 'El registro y consulta de empresas está en el módulo "Registro Empresa". Busca por nombre o RIF.', go: 'empresas' },
  { q: ['noticia','noticias','información','comunicado'], a: 'Las últimas noticias del IAGAMI están en el módulo "Noticias" o en la pantalla principal.', go: 'noticias' },
  { q: ['proyecto','proyectos','obras','programa'], a: 'Consulta los proyectos y obras en el módulo "Proyectos SIGAP".', go: 'proyectos' },
  { q: ['brigada','brigadas','mapa brigadas'], a: 'El Mapa de Brigadas muestra la distribución de equipos por sector del municipio.', go: 'brigadas' },
  { q: ['aula ambiental','aula','educación','escuela'], a: 'El Aula Ambiental ofrece recursos de educación ambiental para la comunidad.', go: 'aula' },
  { q: ['estudiante','portal estudiante'], a: 'Accede al Portal del Estudiante para recursos educativos ambientales.', go: 'estudiante' },
  { q: ['comuna','comunas','consejo comunal'], a: 'Información sobre Comunas y Consejos Comunales del municipio en el módulo "Comunas".', go: 'comunas' },
  { q: ['atención','atencion','contacto','teléfono','dirección'], a: 'Encuentra nuestros datos de contacto en Atención Ciudadana.', go: 'atencion' },
  { q: ['hola','buenos días','buenas tardes','saludos'], a: '¡Hola! Soy Semeruquito, el asistente virtual del IAGAMI. ¿En qué puedo ayudarte hoy?' },
  { q: ['gracias','muchas gracias'], a: '¡Con gusto! Estoy aquí para ayudarte con cualquier consulta ambiental.' },
  { q: ['iagami','que es','quiénes son','instituto'], a: 'El IAGAMI es el Instituto Autónomo de Gestión Ambiental del Municipio Iribarren, Barquisimeto, Estado Lara.' },
];

const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const FAQ_RE = FAQ_LOCAL.map(it => ({ ...it,
  re: it.q.map(k => ({ k, re: new RegExp('(^|[^a-z0-9])' + escRe(norm(k))) })) }));

function responder(msg) {
  const m = norm(msg); let mejor = null, pts = 0;
  for (const it of FAQ_RE) {
    const p = it.re.reduce((a, { k, re }) => re.test(m) ? Math.max(a, k.length) : a, 0);
    if (p > pts) { pts = p; mejor = it; }
  }
  return mejor
    ? { text: mejor.a, go: mejor.go }
    : { text: 'No tengo información sobre eso ahora. Llama al 0412 672-9712 o escribe a Iagami.atencionparalavida@gmail.com', go: 'atencion' };
}

function Chatbot({ visible, onClose, onIr }) {
  const [mensajes, setMensajes] = useState([
    { id: '0', role: 'bot', text: '¡Hola! Soy Semeruquito, el asistente virtual del IAGAMI. ¿En qué puedo ayudarte?', go: null }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  const enviar = () => {
    const txt = input.trim();
    if (!txt) return;
    const resp = responder(txt);
    const user = { id: Date.now().toString(), role: 'user', text: txt, go: null };
    const bot = { id: (Date.now()+1).toString(), role: 'bot', text: resp.text, go: resp.go };
    setMensajes(p => [...p, user, bot]);
    setInput('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            <ScrollView ref={scrollRef} style={s.chatMsgs} contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
              {mensajes.map(m => (
                <View key={m.id} style={{ alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                  <View style={[s.bubble, m.role === 'user' ? s.bubbleUser : s.bubbleBot]}>
                    <Text style={[s.bubbleTxt, m.role === 'user' && { color: '#fff' }]}>{m.text}</Text>
                  </View>
                  {m.go && onIr && (
                    <TouchableOpacity onPress={() => { onClose(); onIr(m.go); }}
                      style={{ marginTop: 4, backgroundColor: VERDE, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Abrir módulo →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
            <View style={s.chatInput}>
              <TextInput style={s.chatField} placeholder="Escribe tu consulta..." placeholderTextColor={GRIS}
                value={input} onChangeText={setInput} onSubmitEditing={enviar} returnKeyType="send" blurOnSubmit={false} />
              <TouchableOpacity style={s.chatSend} onPress={enviar}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>↑</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}


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
  const [webNav, setWebNav] = useState(null);
  const [chatVisible, setChatVisible] = useState(false);
  const webBack = useRef(null);
  const webNavRef = useRef(webNav); webNavRef.current = webNav;

  const ir = (id) => {
    const mod = MODULOS.find(m => m.id === id);
    if (mod) setWebNav({ url: mod.url, pagina: mod.pagina });
  };
  const volver = () => setWebNav(null);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (webNavRef.current) {
        if (webBack.current && webBack.current()) return true;
        setWebNav(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={s.root}>
      <StatusBar backgroundColor={VERDE_DARK} barStyle="light-content" />
      <Navbar onHome={volver} />
      <View style={s.flex}>
        {webNav
          ? <PantallaWeb key={webNav.url + (webNav.pagina || '')} url={webNav.url} pagina={webNav.pagina} onBack={volver} backRef={webBack} />
          : <PantallaInicio ir={ir} />}
      </View>
      {!webNav && <FabSemeruquito onPress={() => setChatVisible(true)} />}
      <Chatbot visible={chatVisible} onClose={() => setChatVisible(false)} onIr={ir} />
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
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(20,50,32,0.88)', padding: 14 },
  heroTag: { color: DORADO, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 28 },
  heroSub: { color: '#ffffffbb', fontSize: 12, marginTop: 6, lineHeight: 18 },
  heroBtns: { flexDirection: 'row', marginTop: 14, gap: 10, flexWrap: 'wrap' },
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
  chatBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '72%', overflow: 'hidden' },
  chatHeader: { backgroundColor: VERDE_DARK, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 2, borderBottomColor: DORADO },
  chatAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10, borderWidth: 1.5, borderColor: DORADO },
  chatHeaderTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  chatClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  chatMsgs: { flex: 1 },
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
