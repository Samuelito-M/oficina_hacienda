import { useEffect, useRef, useState } from 'react';
import Entrar from './Entrar.jsx';
import { leerConexion, llamar, borrarSesion } from '../lib/ninos.js';
import { entender } from '../lib/asistente/entender.js';
import { responder, NECESITA_DATOS } from '../lib/asistente/responder.js';
import { EJEMPLOS, EJEMPLOS_EN } from '../lib/asistente/guia.js';
import { plano, idioma as detectar } from '../lib/asistente/texto.js';
import { normalizarConfig } from '../lib/horarioApp.js';
import { COLOR_PUESTO } from '../lib/horarioApp.js';

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
            <button key={i} type="button" className="as-ir" onClick={() => onBoton(b)}>
              {b.t} →
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

export default function Asistente({ personal, onHorarioApp, irAHorario }) {
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
    return v;
  };

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
      const r = await responder(e, { hoy, idioma: usa, personal: personalRef.current, horario, cargarNinos, ninosLista: ninos, ninosPorId: new Map(ninos.map((n) => [n.id, n])) });
      if (e.tipo !== 'no_entendi') contexto.current = e;
      if (r) setMensajes((m) => [...m, { de: 'bot', r }]);
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

  const boton = (b) => {
    if (b.preparar) {
      onHorarioApp(b.clave, b.horario, b.config);
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
