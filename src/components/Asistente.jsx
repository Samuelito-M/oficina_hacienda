import { useEffect, useRef, useState } from 'react';
import Entrar from './Entrar.jsx';
import { leerConexion, llamar, borrarSesion } from '../lib/ninos.js';
import { entender } from '../lib/asistente/entender.js';
import { responder, NECESITA_DATOS } from '../lib/asistente/responder.js';
import { EJEMPLOS, EJEMPLOS_EN } from '../lib/asistente/guia.js';
import { plano, idioma as detectar } from '../lib/asistente/texto.js';
import { normalizarConfig } from '../lib/horarioApp.js';
import { COLOR_PUESTO } from '../lib/horarioApp.js';
import JSZip from 'jszip';
import * as PDFLib from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { cargarRecursos } from '../lib/recursos.js';
import { descargar, extension, leerBytes } from '../lib/archivos.js';
import { leerMenu } from '../lib/menu.js';
import { mesPorDefecto } from '../lib/asistente/datosChat.js';
import { crearDescarga } from '../lib/asistente/descargas.js';
import { textoResultadoAccion } from '../lib/asistente/accionesChat.js';

const PARECE_DATO = /\b(quien|quienes|cumple|talla|tallas|zapatos|ropa|oncall|descansa|trabaja|trabajan|edad|anos tiene|ninos hay|cambiocasa)\b/;
const VIGENCIA = 60000;

function Rico({ t }) {
  const trozos = String(t).split(/(\*\*[^*]+\*\*)/g);
  return trozos.map((x, i) => (x.startsWith('**') && x.endsWith('**') ? <b key={i}>{x.slice(2, -2)}</b> : <span key={i}>{x}</span>));
}

function Respuesta({ r, onBoton, onPregunta }) {
  return (
    <>
      {r.partes.map((x, i) =>
        x.p ? (
          <p key={i}>
            <Rico t={x.p} />
          </p>
        ) : x.ul ? (
          <ul key={i}>
            {x.ul.map((y, j) => (
              <li key={j}>
                <Rico t={y} />
              </li>
            ))}
          </ul>
        ) : x.pasos ? (
          <ol key={i}>
            {x.pasos.map((y, j) => (
              <li key={j}>
                <Rico t={y} />
              </li>
            ))}
          </ol>
        ) : x.casas ? (
          <ul key={i} className="as-casas">
            {x.casas.map((c) => (
              <li key={c.casa}>
                <i style={{ background: COLOR_PUESTO[c.casa] }} />
                <b>{c.casa}</b>
                <span>{c.texto}</span>
              </li>
            ))}
          </ul>
        ) : null
      )}
      {r.botones && r.botones.length > 0 && (
        <div className="as-botones">
          {r.botones.map((b, i) => (
            <button key={i} type="button" className={`as-ir${b.descarga ? ' as-bajar' : ''}${b.hacer ? ' as-hacer' : ''}`} onClick={() => onBoton(b)}>
              {b.descarga ? `⬇ ${b.t}` : b.hacer ? b.t : `${b.t} →`}
            </button>
          ))}
        </div>
      )}
      {r.sugerencias && r.sugerencias.length > 0 && (
        <div className="as-sug">
          {r.sugerencias.map((s) => (
            <button key={s} type="button" onClick={() => onPregunta(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

const K_IDIOMA = 'oficina-hacienda.asistente.idioma';
const UI = {
  es: { abrir: 'Abrir a Sam Jr., la ayuda de la Oficina', ayuda: 'Sam Jr.', titulo: 'Sam Jr.', sub: 'Tu ayudante de la Oficina · pregúntame lo que sea', nuevo: 'Empezar de nuevo', cerrar: 'Cerrar la ayuda', escribe: 'Escribe tu pregunta…', enviar: 'Enviar', pensando: 'Pensando', hola: '¡Hola! 👋 Soy Sam Jr., tu ayudante de la Oficina. Pregúntame lo que necesites, en español o en inglés. Por ejemplo:', clave: 'Para responder eso necesito entrar a los datos de la Hacienda. Escribe la clave aquí abajo y te respondo enseguida.', vencio: 'Tu sesión venció. Vuelve a escribir la clave y te respondo.', red: (m) => `No pude conectar con la hoja de Google (${m || 'sin internet'}). Intenta otra vez en un momento.`, claveTexto: 'La misma clave de Niños y Horario.', ejemplos: EJEMPLOS },
  en: { abrir: 'Open Sam Jr., the Office helper', ayuda: 'Sam Jr.', titulo: 'Sam Jr.', sub: 'Your Office helper · ask me anything', nuevo: 'Start over', cerrar: 'Close help', escribe: 'Type your question…', enviar: 'Send', pensando: 'Thinking', hola: "Hi! 👋 I'm Sam Jr., your Office helper. Ask me anything, in English or Spanish. For example:", clave: "To answer that I need access to the Hacienda's data. Type the password below and I'll answer right away.", vencio: 'Your session expired. Type the password again and I’ll answer.', red: (m) => `I couldn't reach the Google sheet (${m || 'no internet'}). Please try again in a moment.`, claveTexto: 'The same password used for Niños and Horario.', ejemplos: EJEMPLOS_EN }
};

function idiomaInicial() {
  try {
    const g = localStorage.getItem(K_IDIOMA);
    if (g === 'es' || g === 'en') return g;
  } catch {
    return 'es';
  }
  return 'es';
}

const BIENVENIDA = { de: 'bot', bienvenida: true };

export default function Asistente({ personal, onHorarioApp, irAHorario, onAccion, vivo, tab, oficina, onWordArchivo, onMenuArchivo }) {
  const [abierto, setAbierto] = useState(false);
  const [lang, setLangState] = useState(idiomaInicial);
  const L = UI[lang];
  const setLang = (x) => {
    setLangState(x);
    try {
      localStorage.setItem(K_IDIOMA, x);
    } catch {
      return;
    }
  };
  const [mensajes, setMensajes] = useState([BIENVENIDA]);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [pideClave, setPideClave] = useState(null);
  const [con, setCon] = useState(leerConexion);
  const contexto = useRef(null);
  const cache = useRef({ horarios: new Map(), ninos: null, config: null });
  const lista = useRef(null);
  const entrada = useRef(null);
  const personalRef = useRef(personal);
  personalRef.current = personal;

  useEffect(() => {
    const f = () => {
      setCon(leerConexion());
      cache.current = { horarios: new Map(), ninos: null, config: null };
    };
    window.addEventListener('oficina-sesion', f);
    return () => window.removeEventListener('oficina-sesion', f);
  }, []);

  useEffect(() => {
    if (lista.current) lista.current.scrollTop = lista.current.scrollHeight;
  }, [mensajes, pensando, abierto, pideClave]);

  useEffect(() => {
    if (abierto && entrada.current) entrada.current.focus();
  }, [abierto]);

  const api = async (datos) => {
    const c = leerConexion();
    if (!c.token) {
      const e = new Error('clave');
      e.codigo = 'sesion';
      throw e;
    }
    try {
      return await llamar(c.url, { ...datos, token: c.token });
    } catch (err) {
      if (err.codigo === 'sesion') {
        borrarSesion();
        setCon(leerConexion());
      }
      throw err;
    }
  };

  const horario = async (mes) => {
    const vv = vivo && vivo.current;
    if (vv && vv.clave === mes && vv.horario) return { horario: vv.horario, config: vv.config, vivo: true, sinGuardar: !!vv.sinGuardar };
    const g = cache.current.horarios.get(mes);
    if (g && Date.now() - g.t < VIGENCIA) return g.v;
    const r = await api({ accion: 'horario', mes });
    const v = r.datos || null;
    cache.current.horarios.set(mes, { t: Date.now(), v });
    if (v && v.config) cache.current.config = normalizarConfig(v.config);
    return v;
  };

  const cargarNinos = async () => {
    const c = cache.current.ninos;
    if (c && Date.now() - c.t < VIGENCIA) return c.v;
    const r = await api({ accion: 'listar' });
    const v = Array.isArray(r.ninos) ? r.ninos : [];
    cache.current.ninos = { t: Date.now(), v };
    cache.current.casas = Array.isArray(r.casas) ? r.casas : [];
    return v;
  };
  const cargarCasas = async () => {
    if (!cache.current.casas) await cargarNinos();
    return cache.current.casas || [];
  };
  const verOficina = () => (oficina && oficina.current) || {};
  const datosPara = (usa, hoy, ninos) => ({ hoy, idioma: usa, personal: personalRef.current, horario, cargarNinos, ninosLista: ninos, ninosPorId: new Map(ninos.map((n) => [n.id, n])), mesActivo: tab === 'horario' && vivo && vivo.current ? vivo.current.clave : null, mesHorario: vivo && vivo.current ? vivo.current.clave : null, oficina: verOficina });

  const preparar = async () => {
    const hoy = new Date();
    const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    const [, ninos] = await Promise.all([cache.current.config ? null : horario(mes), cargarNinos()]);
    return { trabajadores: (cache.current.config || normalizarConfig(null)).personal, ninos };
  };

  const preguntar = async (q) => {
    const t = String(q || '').trim();
    if (!t || pensando) return;
    setTexto('');
    setPideClave(null);
    setMensajes((m) => [...m, { de: 'yo', t }]);
    setPensando(true);
    try {
      const hoy = new Date();
      let nombres = { trabajadores: [], ninos: [] };
      const logueado = !!leerConexion().token;
      if (logueado) {
        try {
          nombres = await preparar();
        } catch (err) {
          if (err.codigo !== 'sesion') throw err;
        }
      }
      const dicho = detectar(t);
      const usa = dicho || lang;
      if (dicho && dicho !== lang) setLang(dicho);
      const U = UI[usa];
      const e = entender(t, { hoy, ...nombres, contexto: contexto.current, idioma: usa });
      const necesita = NECESITA_DATOS.has(e.tipo) || (e.tipo === 'no_entendi' && PARECE_DATO.test(plano(t)));
      if (necesita && !leerConexion().token) {
        setPideClave(t);
        setMensajes((m) => [...m, { de: 'bot', r: { partes: [{ p: U.clave }] } }]);
        return;
      }
      const ninos = nombres.ninos || [];
      const r = await responder(e, datosPara(usa, hoy, ninos));
      if (e.tipo !== 'no_entendi' && e.tipo !== 'accion') contexto.current = e;
      if (r && r.hacerYa) {
        setPensando(false);
        await ejecutar(r.hacerYa, r, usa);
      } else if (r) setMensajes((m) => [...m, { de: 'bot', r }]);
    } catch (err) {
      const U = UI[detectar(t) || lang];
      if (err.codigo === 'sesion') {
        setPideClave(t);
        setMensajes((m) => [...m, { de: 'bot', r: { partes: [{ p: U.vencio }] } }]);
      } else setMensajes((m) => [...m, { de: 'bot', r: { partes: [{ p: U.red(err.message) }] } }]);
    } finally {
      setPensando(false);
    }
  };

  const [bajando, setBajando] = useState(false);
  const decir = (p, extra = {}) => setMensajes((m) => [...m, { de: 'bot', r: { partes: [{ p }], ...extra } }]);
  const ERRORES = {
    es: { 'sin-word': 'Para el Word necesito el Word de acuerdos del mes pasado. Súbelo con 📎.', 'sin-horario': 'Ese mes no tiene horario guardado.', 'sin-acuerdos': 'No hay acuerdos que hacer en ese mes.', 'sin-finde': 'Ese fin de semana no está en el horario.', 'sin-hojas': 'No hay hojas marcadas para ese fin de semana.', 'sin-menu': 'Primero súbeme el Excel del menú con 📎.' },
    en: { 'sin-word': 'For the Word I need last month’s agreements Word. Upload it with 📎.', 'sin-horario': 'That month has no saved schedule.', 'sin-acuerdos': 'There are no agreements to make that month.', 'sin-finde': 'That weekend isn’t in the schedule.', 'sin-hojas': 'No sheets are marked for that weekend.', 'sin-menu': 'First upload the menu Excel with 📎.' }
  };
  const bajar = async (d) => {
    if (bajando) return;
    setBajando(true);
    try {
      const f = await crearDescarga(d, { cargarNinos, cargarCasas, horario, personal: personalRef.current, oficina: verOficina(), api, libs: { JSZip, PDFLib, fontkit, cargarRecursos } });
      descargar(f.bytes, f.nombre, f.mime);
      decir(lang === 'en' ? `Done: **${f.nombre}** is in your Downloads folder.` : `Listo: **${f.nombre}** está en tu carpeta de Descargas.`);
    } catch (err) {
      console.error(err);
      if (err.codigo === 'sesion') decir(UI[lang].vencio);
      else decir(ERRORES[lang][err.message] || (lang === 'en' ? 'I couldn’t make the file. Please try again.' : 'No pude armar el archivo. Intenta otra vez.'));
    } finally {
      setBajando(false);
    }
  };

  const archivo = useRef(null);
  const pendiente = useRef(null);
  const pedirArchivo = (p) => {
    pendiente.current = p || null;
    if (archivo.current) {
      archivo.current.accept = p && p.tipo === 'word' ? '.docx' : p && p.tipo === 'menu' ? '.xlsx' : '.docx,.xlsx';
      archivo.current.value = '';
      archivo.current.click();
    }
  };
  const recibirArchivo = async (file) => {
    if (!file) return;
    const p = pendiente.current;
    pendiente.current = null;
    const E = lang === 'en';
    setMensajes((m) => [...m, { de: 'yo', t: `📎 ${file.name}` }]);
    const ext = extension(file.name);
    const tipo = p ? p.tipo : ext === 'docx' ? 'word' : ext === 'xlsx' ? 'menu' : '';
    if (!leerConexion().token) return decir(UI[lang].clave);
    setPensando(true);
    try {
      if (tipo === 'word') {
        if (ext !== 'docx') return decir(E ? 'That isn’t a Word (.docx). Please upload last month’s agreements Word.' : 'Eso no es un Word (.docx). Súbeme el Word de acuerdos del mes pasado.');
        const bytes = await leerBytes(file);
        await onWordArchivo(file);
        await new Promise((r) => setTimeout(r, 80));
        const luego = (p && p.luego) || { tipo: 'acuerdos', mes: mesPorDefecto({}, { hoy: new Date(), mesActivo: tab === 'horario' && vivo && vivo.current ? vivo.current.clave : null }) };
        decir(E ? 'Got it, I have the agreements Word. Making the agreements…' : 'Listo, tengo el Word de acuerdos. Armando los acuerdos…');
        setPensando(false);
        await bajar({ ...luego, wordBytes: bytes });
        return;
      }
      if (tipo === 'menu') {
        if (ext !== 'xlsx') return decir(E ? 'The menu has to be an Excel (.xlsx).' : 'El menú tiene que ser un Excel (.xlsx).');
        const bytes = await leerBytes(file);
        try {
          await leerMenu(bytes.slice(), JSZip);
        } catch (err) {
          return decir(E ? 'That Excel doesn’t look like the fortnight menu. If it’s the schedule, use it in Acuerdos.' : 'Ese Excel no parece el menú de la quincena. Si es el horario, úsalo en Acuerdos.');
        }
        await onMenuArchivo(file);
        setPensando(false);
        await bajar({ tipo: 'menu', menuBytes: bytes, nombre: file.name });
        return;
      }
      decir(E ? 'I can work with the agreements Word (.docx) or the menu Excel (.xlsx).' : 'Puedo trabajar con el Word de acuerdos (.docx) o el Excel del menú (.xlsx).');
    } catch (err) {
      console.error(err);
      decir(E ? 'I couldn’t read that file.' : 'No pude leer ese archivo.');
    } finally {
      setPensando(false);
    }
  };
  const repetir = async (e) => {
    if (pensando) return;
    setPensando(true);
    try {
      const ninos = await cargarNinos();
      const r = await responder(e, datosPara(lang, new Date(), ninos));
      if (r) setMensajes((m) => [...m, { de: 'bot', r }]);
    } catch (err) {
      decir(UI[lang].red(err.message));
    } finally {
      setPensando(false);
    }
  };

  const hechos = useRef(new Set());
  const ejecutar = async (a, r, usa = lang) => {
    const E = usa === 'en';
    if (!onAccion) return decir(E ? 'I can’t change the schedule from here.' : 'Desde aquí no puedo cambiar el horario.');
    const llave = a.clave || JSON.stringify(a);
    if (a.unaVez && hechos.current.has(llave)) return decir(E ? 'I already did that.' : 'Eso ya lo hice.');
    setPensando(true);
    let res;
    try {
      res = await onAccion(a);
      await new Promise((ok) => setTimeout(ok, 150));
    } catch (err) {
      console.error(err);
      res = { ok: false, error: 'error' };
    } finally {
      setPensando(false);
    }
    cache.current.horarios.delete(a.mes);
    if (!res.ok) return decir(textoResultadoAccion(res, a, E));
    if (a.unaVez) hechos.current.add(llave);
    const ver = { t: E ? 'See the Schedule' : 'Ver el Horario', ir: 'horario', mes: a.mes };
    if (a.tipo === 'guardar') return decir(E ? 'Saved ✅. Agreements and House changes can use it now.' : 'Guardado ✅. Acuerdos y Cambio de casa ya pueden usarlo.');
    if (a.tipo === 'deshacer' || a.tipo === 'restaurar') return decir(E ? 'Undone ↩️. It’s back to how it was.' : 'Listo, lo deshice ↩️. Quedó como estaba.', { botones: [ver] });
    const guardar = { t: E ? 'Save' : 'Guardar', hacer: { tipo: 'guardar', mes: a.mes } };
    const atras = { t: E ? 'Undo' : 'Deshacer', hacer: { tipo: 'deshacer', mes: a.mes } };
    if (a.tipo === 'armar') return decir(res.mensaje || (E ? 'Done.' : 'Listo.'), { botones: [guardar, atras] });
    const partes = r ? r.partes : [{ p: a.listo || (E ? 'Done ✅.' : 'Listo ✅.') }];
    setMensajes((m) => [...m, { de: 'bot', r: { partes, botones: a.sinHorario ? [atras, ver] : [guardar, atras, ver] } }]);
  };

  const boton = (b) => {
    if (b.hacer) return ejecutar({ ...b.hacer, unaVez: b.hacer.tipo === 'ausencia', clave: b.hacer.tipo === 'ausencia' ? JSON.stringify(b.hacer) : undefined }, null);
    if (b.descarga) return bajar(b.descarga);
    if (b.pedirArchivo) return pedirArchivo(b.pedirArchivo);
    if (b.repetir) return repetir(b.repetir);
    if (b.copiar != null) {
      const ok = () => decir(lang === 'en' ? 'Copied. You can paste it in WhatsApp now.' : 'Copiado. Ya lo puedes pegar en WhatsApp.');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(b.copiar).then(ok, () => decir(lang === 'en' ? 'This browser didn’t let me copy.' : 'Este navegador no dejó copiar.'));
      else decir(lang === 'en' ? 'This browser didn’t let me copy.' : 'Este navegador no dejó copiar.');
      return;
    }
    if (b.preparar) {
      if (verOficina().claveCargada !== b.clave) onHorarioApp(b.clave, b.horario, b.config);
      location.hash = `#${b.preparar}`;
    } else if (b.ir === 'horario' && b.mes) irAHorario(b.mes);
    else location.hash = `#${b.ir}`;
    if (window.matchMedia && window.matchMedia('(max-width: 640px)').matches) setAbierto(false);
  };

  return (
    <>
      {!abierto && (
        <button type="button" className="as-abrir" id="as-abrir" onClick={() => setAbierto(true)} aria-label={L.abrir}>
          <span aria-hidden="true">💬</span>
          <span className="as-abrir-t">{L.ayuda}</span>
        </button>
      )}
      {abierto && (
        <section className="as" id="asistente" role="dialog" aria-label={L.titulo}>
          <header className="as-cab">
            <div>
              <b>{L.titulo}</b>
              <span>{L.sub}</span>
            </div>
            <div className="as-idioma" role="group" aria-label="Idioma / Language">
              <button type="button" id="as-es" aria-pressed={lang === 'es'} onClick={() => setLang('es')}>
                ES
              </button>
              <button type="button" id="as-en" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
                EN
              </button>
            </div>
            <button
              type="button"
              className="as-x"
              title={L.nuevo}
              aria-label={L.nuevo}
              onClick={() => {
                setMensajes([BIENVENIDA]);
                contexto.current = null;
                setPideClave(null);
              }}
            >
              ↺
            </button>
            <button type="button" className="as-x" id="as-cerrar" aria-label={L.cerrar} onClick={() => setAbierto(false)}>
              ✕
            </button>
          </header>
          <div className="as-lista" ref={lista} aria-live="polite">
            {mensajes.map((m, i) =>
              m.de === 'yo' ? (
                <div key={i} className="as-yo">
                  {m.t}
                </div>
              ) : (
                <div key={i} className="as-bot">
                  <Respuesta r={m.bienvenida ? { partes: [{ p: L.hola }], sugerencias: L.ejemplos.slice(0, 5) } : m.r} onBoton={boton} onPregunta={preguntar} />
                </div>
              )
            )}
            {pensando && (
              <div className="as-bot as-pensando" aria-label={L.pensando}>
                <i />
                <i />
                <i />
              </div>
            )}
            {pideClave && (
              <div className="as-bot as-clave">
                <Entrar
                  url={con.url}
                  idioma={lang}
                  texto={L.claveTexto}
                  onEntrar={(c) => {
                    setCon(c);
                    const q = pideClave;
                    setPideClave(null);
                    setMensajes((m) => m.filter((x, k) => !(k === m.length - 1 && x.de === 'bot')));
                    setMensajes((m) => m.slice(0, -1));
                    setTimeout(() => preguntar(q), 0);
                  }}
                />
              </div>
            )}
          </div>
          <form
            className="as-escribir"
            onSubmit={(e) => {
              e.preventDefault();
              preguntar(texto);
            }}
          >
            <button type="button" className="as-clip" id="as-clip" onClick={() => pedirArchivo(null)} title={lang === 'en' ? 'Send a file (agreements Word or menu Excel)' : 'Mandar un archivo (Word de acuerdos o Excel del menú)'} aria-label={lang === 'en' ? 'Send a file' : 'Mandar un archivo'} disabled={pensando}>
              📎
            </button>
            <input ref={archivo} type="file" hidden id="as-archivo" onChange={(e) => recibirArchivo(e.target.files && e.target.files[0])} />
            <input ref={entrada} id="as-texto" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={L.escribe} aria-label={L.escribe} autoComplete="off" enterKeyHint="send" />
            <button type="submit" id="as-enviar" disabled={!texto.trim() || pensando} aria-label={L.enviar}>
              ➤
            </button>
          </form>
        </section>
      )}
    </>
  );
}
