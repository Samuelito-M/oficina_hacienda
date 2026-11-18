import Ventana from '../components/Ventana.jsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import * as PDFLib from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import pdfjs from '../lib/pdfjs.js';
import Entrar from '../components/Entrar.jsx';
import { CASAS } from '../lib/personal.js';
import { MESES } from '../lib/text.js';
import { leerConexion, borrarSesion, llamar } from '../lib/ninos.js';
import { leerItemsPdf, analizarHorario, HorarioError } from '../lib/horario.js';
import { leerGrillaExcel, analizarHorarioExcel } from '../lib/horarioExcel.js';
import { descargar, extension, leerBytes, MIME, nombreSeguro } from '../lib/archivos.js';
import { cargarRecursos } from '../lib/recursos.js';
import { generarExcelHorario, generarPdfHorario } from '../lib/horarioExport.js';
import {
  PUESTOS,
  ON_CALL,
  COLOR_PUESTO,
  CORTO,
  DIAS_SEM,
  DIAS_LARGO,
  claveMes,
  partesMes,
  moverMes,
  normalizarConfig,
  normalizarHorario,
  horarioVacio,
  en,
  poner,
  contexto,
  diasDeSemana,
  problemas,
  faltanEnDia,
  copiarAnterior,
  resumirQuitados,
  armar,
  sincronizarOnCall,
  ponerEnBloque,
  darDeBaja,
  reactivar,
  activo,
  activos,
  idNuevo,
  resumenMes,
  desdeExcel,
  casasDe,
  esDeUnaCasa,
  ROLES,
  ponerNota,
  ponerObs,
  MAX_NOTA,
  MAX_OBS
} from '../lib/horarioApp.js';

const Cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const nombreMes = (clave) => {
  const { anio, mes } = partesMes(clave);
  return `${Cap(MESES[mes])} ${anio}`;
};
const soloMes = (clave) => MESES[partesMes(clave).mes];
const J = (x) => JSON.stringify(x);
const estaVacio = (h) => !h || (!Object.keys(h.dias).length && !Object.keys(h.notas || {}).length && !h.obs);

function cuando(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hoy = new Date();
  const hora = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.toDateString() === hoy.toDateString()) return `hoy a las ${hora}`;
  return `el ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

function Elegir({ ctx, d, k, onListo, onCerrar }) {
  const actuales = en(ctx.horario, d, k);
  const [sel, setSel] = useState(actuales);
  const [verNo, setVerNo] = useState(false);
  const [toda, setToda] = useState(true);
  const bloque = ctx.bloque(d);
  const conBloque = (k === ON_CALL || ctx.finde(d)) && bloque.length > 1;
  const todos = activos(ctx.config, ctx.clave);
  const hayOc = todos.some((p) => p.oc);
  const deAqui = (p) => (k === ON_CALL ? !hayOc || p.oc : casasDe(p).includes(k));
  const gente = todos.filter((p) => deAqui(p) || actuales.includes(p.id));
  const ocultos = todos.length - gente.length;
  const lista = gente.map((p) => ({ p, m: actuales.includes(p.id) ? '' : ctx.motivo(p.id, d, k) }));
  const extra = actuales.filter((id) => !gente.some((p) => p.id === id)).map((id) => ({ p: { id, n: ctx.nombre(id) }, m: '' }));
  const si = [...extra, ...lista.filter((x) => !x.m)].sort((a, b) => actuales.includes(b.p.id) - actuales.includes(a.p.id) || esDeUnaCasa(b.p, k) - esDeUnaCasa(a.p, k) || (b.p.pref === k) - (a.p.pref === k) || a.p.n.localeCompare(b.p.n, 'es'));
  const no = lista.filter((x) => x.m).sort((a, b) => a.p.n.localeCompare(b.p.n, 'es'));
  const R = ctx.config.reglas;
  const pide = k === ON_CALL ? '¿Quién está de llamada?' : !ctx.finde(d) ? (R.auxMin[k] ? `Entre semana necesita ${R.auxMin[k]} ${R.auxMin[k] === 1 ? 'auxiliar' : 'auxiliares'}.` : 'Entre semana no es obligatorio que tenga a alguien.') : `Fin de semana: con los padres de casa${R.auxMin[k] ? ` más ${R.auxMin[k]} ${R.auxMin[k] === 1 ? 'auxiliar' : 'auxiliares'}` : ''}, o ${R.sinPadres} auxiliares si los padres descansan.`;
  const fila = ({ p, m }) => (
    <label key={p.id}>
      <input type="checkbox" checked={sel.includes(p.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))} />
      <span>{p.n}</span>
      <span className="r">{m || (esDeUnaCasa(p, k) ? 'padre/madre de esta casa' : p.pref === k ? 'prefiere esta casa' : p.id && ctx.porId.get(p.id) && !deAqui(ctx.porId.get(p.id)) ? (k === ON_CALL ? 'no hace on call' : `no va a ${k}`) : '')}</span>
    </label>
  );
  const abiertoNo = verNo || !si.length;
  return (
    <>
      <h3>
        {k === ON_CALL ? 'On call' : k} · {DIAS_LARGO[ctx.wd(d)]} {d} de {MESES[ctx.mes]}
      </h3>
      <p className="hint">{pide}</p>
      <div className="h-opc">{si.length ? si.map(fila) : <p className="hint">{no.length ? 'Nadie está libre ese día. Si igual quieres poner a alguien, elígelo abajo.' : k === ON_CALL ? 'Nadie tiene marcado “On call” en Personal y reglas.' : `Nadie tiene marcada ${k} en Personal y reglas.`}</p>}</div>
      {no.length > 0 && (
        <>
          <button type="button" className="btn-link h-vermas" onClick={() => setVerNo(!abiertoNo)}>
            {abiertoNo ? '▾' : '▸'} No disponibles ({no.length})
          </button>
          {abiertoNo && <div className="h-opc apagado">{no.map(fila)}</div>}
        </>
      )}
      {ocultos > 0 && (
        <p className="hint h-solo">
          Solo salen {k === ON_CALL ? 'las personas que hacen on call' : `las personas que trabajan en ${k}`}. Para cambiar a dónde va cada uno, abre “Personal y reglas”.
        </p>
      )}
      {conBloque && (
        <label className="h-toda">
          <input type="checkbox" id="h-todo-bloque" checked={toda} onChange={(e) => setToda(e.target.checked)} />
          <span>
            {ctx.finde(d) ? 'Poner lo mismo todo el fin de semana' : 'Poner lo mismo de lunes a jueves'}
            <small>
              del {DIAS_LARGO[ctx.wd(bloque[0])]} {bloque[0]} al {DIAS_LARGO[ctx.wd(bloque[bloque.length - 1])]} {bloque[bloque.length - 1]}
            </small>
          </span>
        </label>
      )}
      <div className="h-acc">
        <button type="button" className="h-btn" onClick={onCerrar}>
          Cancelar
        </button>
        <button type="button" className="h-btn prim" id="h-elegir-ok" onClick={() => onListo(sel, conBloque && toda)}>
          Listo
        </button>
      </div>
    </>
  );
}

function EditarTexto({ titulo, ayuda, inicial, max, filas, ejemplo, onGuardar, onCerrar, id }) {
  const [t, setT] = useState(inicial || '');
  return (
    <>
      <h3>{titulo}</h3>
      <p className="hint">{ayuda}</p>
      <textarea id={id} className="h-nota-txt" rows={filas} maxLength={max} value={t} placeholder={ejemplo} autoFocus onChange={(e) => setT(e.target.value)} />
      <span className="hint h-cuenta">
        {t.length} / {max}
      </span>
      <div className="h-acc">
        {inicial && (
          <button type="button" className="h-btn h-borrar" onClick={() => onGuardar('')}>
            Borrar
          </button>
        )}
        <span className="esp" />
        <button type="button" className="h-btn" onClick={onCerrar}>
          Cancelar
        </button>
        <button type="button" className="h-btn prim" id={`${id}-ok`} onClick={() => onGuardar(t)}>
          Listo
        </button>
      </div>
    </>
  );
}

function Regla({ id, texto, valor, max, onCambio }) {
  return (
    <label className="h-regla">
      <span>{texto}</span>
      <input id={id} type="number" min="0" max={max} value={valor} onChange={(e) => onCambio(Math.max(0, Math.min(max, Math.floor(+e.target.value) || 0)))} />
    </label>
  );
}

function Personal({ config, clave, onCambio, onQuitar, onCerrar }) {
  const [vista, setVista] = useState('gente');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('aux');
  const [borrando, setBorrando] = useState('');
  const [error, setError] = useState('');
  const cambiar = (id, cambios) => onCambio({ ...config, personal: config.personal.map((p) => (p.id === id ? { ...p, ...cambios } : p)) });
  const R = config.reglas;
  const regla = (cambios) => onCambio({ ...config, reglas: { ...R, ...cambios } });
  const agregar = () => {
    const n = nombre.trim().replace(/\s+/g, ' ');
    if (!n) return setError('Escribe el nombre.');
    if (config.personal.some((p) => p.n.toLowerCase() === n.toLowerCase())) return setError('Ya hay alguien con ese nombre.');
    onCambio({ ...config, personal: [{ id: idNuevo(config, n), n, rol, casas: [], pref: '', dias: rol === 'aux' ? [0, 1, 2, 3, 4, 5, 6] : [5, 6, 0], oc: false }, ...config.personal] });
    setNombre('');
    setError('');
  };
  const cambiarRol = (p, nuevo) => cambiar(p.id, { rol: nuevo, casas: nuevo === 'padre' ? casasDe(p).slice(0, 1) : casasDe(p), pref: nuevo === 'padre' ? '' : p.pref, dias: nuevo === 'aux' ? (p.rol === 'aux' ? p.dias : [0, 1, 2, 3, 4, 5, 6]) : [5, 6, 0] });
  const tocarCasa = (p, c) => {
    const on = casasDe(p).includes(c);
    if (p.rol === 'padre') return cambiar(p.id, { casas: on ? [] : [c] });
    const casas = on ? casasDe(p).filter((x) => x !== c) : CASAS.filter((x) => x === c || casasDe(p).includes(x));
    cambiar(p.id, { casas, pref: casas.includes(p.pref) ? p.pref : '' });
  };
  const trabajan = config.personal.filter((p) => activo(p, clave));
  const fuera = config.personal.filter((p) => !activo(p, clave));
  const grupos = [
    ['padre', 'Padres de casa'],
    ['aux', 'Auxiliares'],
    ['finde', 'Auxiliares solo de fin de semana']
  ];
  const filaPersona = (p) => (
    <div className="h-persona" key={p.id} data-persona={p.n}>
      <div className="nom">
        <b>{p.n}</b>
        <select value={p.rol} aria-label={`Tipo de ${p.n}`} onChange={(e) => cambiarRol(p, e.target.value)}>
          {Object.entries(ROLES).map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </select>
        {!casasDe(p).length && <span className="h-err">Márcale {p.rol === 'padre' ? 'su casa' : 'al menos una casa'}</span>}
      </div>
      <div className="col">
        <span className="et">{p.rol === 'padre' ? 'Su casa' : 'Casas a las que va'}</span>
        <div className="h-casas" role="group" aria-label={`Casas de ${p.n}`}>
          {CASAS.map((c) => {
            const on = casasDe(p).includes(c);
            return (
              <button key={c} type="button" aria-pressed={on} title={c} data-casa={c} style={on ? { background: COLOR_PUESTO[c], borderColor: COLOR_PUESTO[c] } : undefined} onClick={() => tocarCasa(p, c)}>
                {CORTO[c]}
              </button>
            );
          })}
        </div>
      </div>
      <div className="col">
        <span className="et">{p.rol === 'aux' ? 'Días que trabaja (apaga su descanso)' : 'Días que trabaja'}</span>
        <div className="h-dias" role="group" aria-label={`Días que trabaja ${p.n}`}>
          {[1, 2, 3, 4, 5, 6, 0].map((w) => (
            <button key={w} type="button" aria-pressed={p.dias.includes(w)} title={DIAS_LARGO[w]} data-dia={w} onClick={() => cambiar(p.id, { dias: p.dias.includes(w) ? p.dias.filter((x) => x !== w) : [...p.dias, w] })}>
              {DIAS_SEM[w][0]}
            </button>
          ))}
        </div>
      </div>
      {p.rol !== 'padre' && (
        <div className="col">
          <span className="et">Prefiere</span>
          <select value={p.pref || ''} aria-label={`Casa preferida de ${p.n}`} data-pref onChange={(e) => cambiar(p.id, { pref: e.target.value })}>
            <option value="">Cualquiera</option>
            {casasDe(p).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}
      <label className="oc">
        <input type="checkbox" checked={p.oc} onChange={(e) => cambiar(p.id, { oc: e.target.checked })} /> On call
      </label>
      <button
        type="button"
        className={`h-x${borrando === p.id ? ' si' : ''}`}
        onClick={() => {
          if (borrando !== p.id) return setBorrando(p.id);
          setBorrando('');
          onQuitar(p.id);
        }}
      >
        {borrando === p.id ? '¿Quitar?' : 'Quitar'}
      </button>
    </div>
  );
  return (
    <>
      <h3>Personal y reglas</h3>
      <div className="h-tabs">
        <button type="button" id="h-tab-gente" className={vista === 'gente' ? 'on' : ''} onClick={() => setVista('gente')}>
          Trabajadores
        </button>
        <button type="button" id="h-tab-reglas" className={vista === 'reglas' ? 'on' : ''} onClick={() => setVista('reglas')}>
          Reglas
        </button>
      </div>
      {vista === 'gente' ? (
        <>
          <div className="h-caja">
            <b>Agregar trabajador</b>
            <div className="h-fila">
              <input id="h-nuevo-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" maxLength={30} onKeyDown={(e) => e.key === 'Enter' && agregar()} />
              <select id="h-nuevo-rol" value={rol} onChange={(e) => setRol(e.target.value)} aria-label="Tipo">
                {Object.entries(ROLES).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </select>
              <button type="button" className="h-btn prim" id="h-nuevo-ok" onClick={agregar}>
                Agregar
              </button>
            </div>
            {error && <span className="h-err">{error}</span>}
          </div>
          <p className="hint">Lo que cambies aquí también se actualiza en Acuerdos y en Cambio de casa. Solo falta poner los apellidos y la cédula en Acuerdos, en Personal.</p>
          <div className="h-gente">
            {grupos.map(([k, t]) => {
              const l = trabajan.filter((p) => p.rol === k);
              return l.length ? (
                <div key={k}>
                  <h4 className="h-grupo">{t}</h4>
                  {l.map(filaPersona)}
                </div>
              ) : null;
            })}
            {fuera.length > 0 && (
              <div>
                <h4 className="h-grupo">Ya no trabajan</h4>
                {fuera.map((p) => (
                  <div className="h-persona baja" key={p.id}>
                    <div className="nom">
                      <b>{p.n}</b>
                      <span className="hint">Trabajó hasta {MESES[partesMes(p.hasta).mes]} de {partesMes(p.hasta).anio}</span>
                    </div>
                    <button type="button" className="h-x" onClick={() => onCambio(reactivar(config, p.id))}>
                      Volver a poner
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="h-reglas">
          <p className="hint">Con estas reglas la app arma el horario y te avisa si algo no se cumple. Fin de semana es de viernes a domingo.</p>
          <h4 className="h-grupo">Fines de semana al mes</h4>
          <Regla id="h-r-padres" texto="Fines de semana que trabajan los padres de casa (uno sí, uno no)" valor={R.findesPadres} max={5} onCambio={(v) => regla({ findesPadres: v })} />
          <Regla id="h-r-aux" texto="Fines de semana que trabaja cada auxiliar (uno más si el mes trae 5)" valor={R.findesAux} max={5} onCambio={(v) => regla({ findesAux: v })} />
          <label className="h-regla h-check">
            <span>Si no alcanza la gente un fin de semana, que alguien haga un fin de semana más (la app te dice quién)</span>
            <input type="checkbox" id="h-r-extra" checked={R.extraFinde !== false} onChange={(e) => regla({ extraFinde: e.target.checked })} />
          </label>
          <h4 className="h-grupo">Cuántos auxiliares por casa</h4>
          <Regla id="h-r-sin" texto="Fin de semana que los padres de casa descansan" valor={R.sinPadres} max={4} onCambio={(v) => regla({ sinPadres: v })} />
          <p className="hint">Siempre, además de los padres (de lunes a jueves y también cuando los padres trabajan):</p>
          {CASAS.map((c) => (
            <label className="h-regla" key={c}>
              <span>
                <i style={{ background: COLOR_PUESTO[c] }} />
                {c}
              </span>
              <input type="number" min="0" max="4" data-auxmin={c} aria-label={`Auxiliares en ${c}`} value={R.auxMin[c]} onChange={(e) => regla({ auxMin: { ...R.auxMin, [c]: Math.max(0, Math.min(4, Math.floor(+e.target.value) || 0)) } })} />
            </label>
          ))}
          <h4 className="h-grupo">On call</h4>
          <p className="hint">Quien tenga marcado “On call” en Trabajadores queda de llamada de lunes a jueves después de cada fin de semana que trabaja. La app lo pone y lo quita sola.</p>
          <h4 className="h-grupo">De lunes a jueves</h4>
          <p className="hint">Trabajan todos los auxiliares menos en su día de descanso. Los que sobran van a Casa 2 o de segundo en otra casa.</p>
        </div>
      )}
      <div className="h-acc">
        <button type="button" className="h-btn prim" id="h-personal-ok" onClick={onCerrar}>
          Listo
        </button>
      </div>
    </>
  );
}

function Vacaciones({ ctx, onCambio, onCerrar }) {
  const h = ctx.horario;
  const gente = activos(ctx.config, ctx.clave);
  const [id, setId] = useState(gente[0]?.id || '');
  const [de, setDe] = useState('');
  const [a, setA] = useState('');
  const [fer, setFer] = useState('');
  const [error, setError] = useState('');
  const mes = MESES[ctx.mes];
  const agregar = () => {
    const d1 = Math.floor(+de);
    const d2 = Math.floor(+a) || d1;
    if (!(d1 >= 1 && d2 >= d1 && d2 <= ctx.n) || !id) return setError(`Escribe días del 1 al ${ctx.n}.`);
    let nuevo = { ...h, vac: [...h.vac, { id, de: d1, a: d2 }] };
    for (let d = d1; d <= d2; d++) for (const k of PUESTOS) if (en(nuevo, d, k).includes(id)) nuevo = poner(nuevo, d, k, en(nuevo, d, k).filter((x) => x !== id));
    onCambio(nuevo);
    setDe('');
    setA('');
    setError('');
  };
  return (
    <>
      <h3>Vacaciones y feriados</h3>
      <p className="hint">De {mes}. A quien está de vacaciones la app lo saca del horario esos días.</p>
      <div className="h-lista">
        {h.vac.map((v, i) => (
          <div key={i}>
            <span>
              <b>{ctx.nombre(v.id)}</b> · {v.de === v.a ? `el ${v.de}` : `del ${v.de} al ${v.a}`} de {mes}
            </span>
            <button type="button" className="h-x" onClick={() => onCambio({ ...h, vac: h.vac.filter((_, j) => j !== i) })}>
              Quitar
            </button>
          </div>
        ))}
        {h.fer.map((f) => (
          <div key={`f${f}`}>
            <span>
              <b>Feriado</b> · {DIAS_LARGO[ctx.wd(f)]} {f} de {mes}
            </span>
            <button type="button" className="h-x" onClick={() => onCambio({ ...h, fer: h.fer.filter((x) => x !== f) })}>
              Quitar
            </button>
          </div>
        ))}
        {!h.vac.length && !h.fer.length && <p className="hint">Nada este mes.</p>}
      </div>
      <div className="h-caja">
        <b>Agregar vacaciones o permiso</b>
        <div className="h-fila">
          <select id="h-vac-quien" value={id} onChange={(e) => setId(e.target.value)} aria-label="Persona">
            {gente.map((p) => (
              <option key={p.id} value={p.id}>
                {p.n}
              </option>
            ))}
          </select>
          <span>del</span>
          <input id="h-vac-de" className="num" type="number" min="1" max={ctx.n} value={de} onChange={(e) => setDe(e.target.value)} aria-label="Desde el día" />
          <span>al</span>
          <input id="h-vac-a" className="num" type="number" min="1" max={ctx.n} value={a} onChange={(e) => setA(e.target.value)} aria-label="Hasta el día" />
          <button type="button" className="h-btn prim" id="h-vac-ok" onClick={agregar}>
            Agregar
          </button>
        </div>
        {error && <span className="h-err">{error}</span>}
      </div>
      <div className="h-caja">
        <b>Marcar un feriado</b>
        <div className="h-fila">
          <span>Día</span>
          <input id="h-fer-dia" className="num" type="number" min="1" max={ctx.n} value={fer} onChange={(e) => setFer(e.target.value)} aria-label="Día feriado" />
          <button
            type="button"
            className="h-btn"
            id="h-fer-ok"
            onClick={() => {
              const f = Math.floor(+fer);
              if (f >= 1 && f <= ctx.n && !h.fer.includes(f)) onCambio({ ...h, fer: [...h.fer, f].sort((x, y) => x - y) });
              setFer('');
            }}
          >
            Marcar
          </button>
        </div>
      </div>
      <div className="h-acc">
        <button type="button" className="h-btn prim" onClick={onCerrar}>
          Listo
        </button>
      </div>
    </>
  );
}

export default function Horario({ personal, avisar, onConfig, mesInicial }) {
  const [con, setCon] = useState(leerConexion);
  const [mensajeClave, setMensajeClave] = useState('');
  const hoy = new Date();
  const [clave, setClave] = useState(mesInicial || claveMes(hoy.getFullYear(), hoy.getMonth()));
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState('');
  const [horario, setHorario] = useState(null);
  const [guardado, setGuardado] = useState(null);
  const [actualizado, setActualizado] = useState('');
  const [anterior, setAnterior] = useState(null);
  const [base, setBase] = useState({ vac: [], fer: [] });
  const [config, setConfig] = useState(normalizarConfig(null));
  const [configGuardada, setConfigGuardada] = useState('');
  const [nuevos, setNuevos] = useState([]);
  const [notas, setNotas] = useState([]);
  const [modo, setModo] = useState('semana');
  const [sem, setSem] = useState(0);
  const [ventana, setVentana] = useState(null);
  const [ocupado, setOcupado] = useState('');
  const archivo = useRef(null);
  const conRef = useRef(con);
  conRef.current = con;

  const salir = (err) => {
    borrarSesion();
    setMensajeClave(err && err.message ? err.message : '');
    setCon(leerConexion());
  };

  const cargar = async (cual) => {
    setEstado('cargando');
    setError('');
    try {
      const c = conRef.current;
      const r = await llamar(c.url, { accion: 'horario', mes: cual, token: c.token });
      const d = r.datos || {};
      const h = normalizarHorario(d.horario);
      const antCrudo = normalizarHorario(d.anterior);
      const ant = estaVacio(antCrudo) ? null : antCrudo;
      const cfg = normalizarConfig(d.config);
      setConfig(cfg);
      setConfigGuardada(d.config && d.config.v === 3 ? J(cfg) : '');
      setBase({ vac: h ? h.vac : [], fer: h ? h.fer : [] });
      setHorario(estaVacio(h) ? null : h);
      setGuardado(h ? J(h) : null);
      setActualizado(d.actualizado || '');
      setAnterior(ant);
      setNuevos([]);
      setNotas([]);
      setSem(0);
      setEstado('listo');
    } catch (err) {
      if (err.codigo === 'sesion') return salir(err);
      setError(err.message === 'Acción desconocida.' ? 'viejo' : err.message || 'No se pudo cargar el horario.');
      setEstado('error');
    }
  };

  useEffect(() => {
    if (con.token) cargar(clave);
  }, [con.token, clave]);

  const sucio = horario != null && J(horario) !== guardado;

  useEffect(() => {
    if (onConfig && estado === 'listo') onConfig(configGuardada ? JSON.parse(configGuardada) : config);
  }, [configGuardada, estado]);

  useEffect(() => {
    if (!sucio) return undefined;
    const f = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', f);
    return () => window.removeEventListener('beforeunload', f);
  }, [sucio]);

  const ctx = useMemo(() => contexto(clave, horario || horarioVacio(), config), [clave, horario, config]);
  const todos = useMemo(() => (horario ? problemas(ctx) : []), [ctx, horario]);
  const faltas = todos.filter((p) => p.tipo === 'falta').length;

  const guardarConfig = async (cfg) => {
    if (J(cfg) === configGuardada) return;
    try {
      await llamar(con.url, { accion: 'guardarConfig', config: cfg, token: con.token });
      setConfigGuardada(J(cfg));
    } catch (err) {
      if (err.codigo === 'sesion') return salir(err);
      avisar('No se pudo guardar el personal. Revisa tu internet.');
    }
  };

  const guardar = async () => {
    setOcupado('guardar');
    try {
      const primera = guardado == null;
      const r = await llamar(con.url, { accion: 'guardarHorario', mes: clave, horario, token: con.token });
      await guardarConfig(config);
      setGuardado(J(horario));
      setActualizado(r.actualizado || new Date().toISOString());
      setNuevos([]);
      setNotas([]);
      avisar(primera ? `Horario de ${soloMes(clave)} guardado. Si después cambia algo, lo editas aquí y tocas “Actualizar horario”.` : 'Horario actualizado. Acuerdos y Cambio de casa ya pueden usar la versión nueva.');
    } catch (err) {
      if (err.codigo === 'sesion') return salir(err);
      avisar(err.message === 'horario-grande' ? 'El horario es demasiado grande para guardarse.' : 'No se pudo guardar. Revisa tu internet e intenta otra vez.');
    } finally {
      setOcupado('');
    }
  };

  const deshacer = () => {
    const g = guardado ? JSON.parse(guardado) : null;
    setHorario(estaVacio(g) ? null : g);
    setNuevos([]);
    setNotas([]);
  };

  const cambiar = (h) => setHorario(h);

  const borrar = async () => {
    const vacio = { ...horarioVacio(), vac: horario ? horario.vac : base.vac, fer: horario ? horario.fer : base.fer };
    if (guardado) {
      setOcupado('borrar');
      try {
        const r = await llamar(con.url, { accion: 'guardarHorario', mes: clave, horario: vacio, token: con.token });
        setGuardado(J(vacio));
        setActualizado(r.actualizado || new Date().toISOString());
      } catch (err) {
        setOcupado('');
        if (err.codigo === 'sesion') return salir(err);
        avisar('No se pudo borrar. Revisa tu internet e intenta otra vez.');
        return;
      }
      setOcupado('');
    }
    setBase({ vac: vacio.vac, fer: vacio.fer });
    setHorario(null);
    setNuevos([]);
    setNotas([]);
    setVentana(null);
    avisar(`Borré el horario de ${soloMes(clave)}. Ahora puedes armarlo, copiarlo o empezar de cero.`);
  };

  const copiar = () => {
    const r = copiarAnterior(clave, anterior, config, horario || { ...horarioVacio(), ...base });
    setHorario(r.horario);
    setNotas(resumirQuitados(r.quitados, ctx.nombre));
    setNuevos([]);
    setSem(0);
    avisar(`Copié ${soloMes(moverMes(clave, -1))}. Revisa, cambia lo que sea distinto y toca “Guardar horario”.`);
  };

  const llenar = (desdeCero) => {
    const desde = horario || { ...horarioVacio(), ...base };
    const inicio = desdeCero ? { ...horarioVacio(), vac: desde.vac, fer: desde.fer, notas: desde.notas || {}, obs: desde.obs || '' } : horario;
    const r = armar(clave, inicio, config, anterior);
    setHorario(r.horario);
    setNuevos(desdeCero ? [] : (n) => [...n, ...r.nuevos]);
    if (desdeCero) {
      setNotas([]);
      setSem(0);
    }
    const quedan = problemas(contexto(clave, r.horario, config)).filter((p) => p.tipo === 'falta');
    const casasQ = Array.from(new Set(quedan.map((p) => p.k)));
    const rango = (x) => (x.dias.length > 1 ? `del ${x.dias[0]} al ${x.dias[x.dias.length - 1]}` : `el ${x.dias[0]}`);
    const extra = r.extras && r.extras.length ? ` Para que no falte gente, ${r.extras.map((x) => `${x.n} hace un ${x.total}.º fin de semana (${x.casa}, ${rango(x)})`).join(' y ')}.` : '';
    const falto = quedan.length ? ` No alcanzó la gente para ${quedan.length} ${quedan.length === 1 ? 'espacio' : 'espacios'} (${casasQ.join(', ')}): quedaron marcados en verde para que los revises.` : '';
    if (extra) setNotas((n) => [...n.filter((x) => !x.startsWith('Para que no falte gente')), extra.trim()]);
    if (desdeCero) avisar(`Armé ${soloMes(clave)} con las reglas.${extra}${falto} Revisa y toca “${guardado ? 'Actualizar' : 'Guardar'} horario”.`);
    else avisar(r.nuevos.length ? `Completé ${r.casas} ${r.casas === 1 ? 'espacio' : 'espacios'}${r.calls ? ' y el on call' : ''}. Lo nuevo está en color.${extra}${falto}${quedan.length ? ' Si quieres que la app reacomode a todos, usa “Volver a armar con las reglas”.' : ''}` : 'No había nadie libre para lo que falta. Toca lo marcado en verde para elegir, o usa “Volver a armar con las reglas”.');
  };

  const subir = async (file) => {
    if (!file) return;
    const ext = extension(file.name);
    if (ext !== 'xlsx' && ext !== 'pdf') return avisar('Sube el horario en Excel (.xlsx) o en PDF.');
    setOcupado('subir');
    try {
      const bytes = await leerBytes(file);
      const an = ext === 'xlsx' ? analizarHorarioExcel(await leerGrillaExcel(bytes, JSZip), personal, file.name) : analizarHorario(await leerItemsPdf(bytes, pdfjs), personal, file.name);
      const suClave = claveMes(an.anio, an.mes);
      if (suClave !== clave) {
        avisar(`Ese archivo es de ${nombreMes(suClave).toLowerCase()}. Ve a ese mes con las flechas de arriba y súbelo ahí.`);
        return;
      }
      const r = desdeExcel(an.dias, personal, config);
      setConfig(r.config);
      setHorario({ ...r.horario, vac: (horario || base).vac, fer: Array.from(new Set([...(horario || base).fer, ...(an.feriados || [])])).sort((x, y) => x - y), notas: { ...(horario ? horario.notas : {}), ...(an.notas || {}) }, obs: [horario ? horario.obs : '', an.obs || ''].filter(Boolean).join(' · ').slice(0, MAX_OBS) });
      setNotas(r.agregados.length ? [`Agregué al personal a: ${r.agregados.join(', ')}`] : []);
      setNuevos([]);
      avisar(`Leí el horario de ${soloMes(clave)}. Revísalo y toca “Guardar horario”.`);
    } catch (err) {
      console.error(err);
      avisar(err instanceof HorarioError ? err.message : 'No pude leer ese archivo.');
    } finally {
      setOcupado('');
    }
  };

  const bajar = async (que) => {
    setOcupado(que);
    try {
      const base = nombreSeguro(`HORARIO ${soloMes(clave).toUpperCase()} ${partesMes(clave).anio}`);
      if (que === 'excel') descargar(await generarExcelHorario(clave, horario, config, JSZip), `${base}.xlsx`, MIME.xlsx);
      else descargar(await generarPdfHorario(clave, horario, config, PDFLib, fontkit, await cargarRecursos()), `${base}.pdf`, MIME.pdf);
      setVentana(null);
      avisar('Listo, revisa tu carpeta de Descargas.');
    } catch (err) {
      console.error(err);
      avisar('No se pudo armar el archivo. Intenta otra vez.');
    } finally {
      setOcupado('');
    }
  };

  const irMes = (n) => {
    if (sucio) return avisar('Primero guarda o deshaz los cambios de este mes.');
    setClave(moverMes(clave, n));
  };

  if (!con.url || !con.token) {
    return (
      <section className="wrap" aria-labelledby="t-horario">
        <div className="intro">
          <h2 id="t-horario">Horario del mes</h2>
          <p>Arma el horario de las casas copiando el mes anterior y cambiando solo lo distinto.</p>
        </div>
        <Entrar
          url={con.url}
          mensaje={mensajeClave}
          texto="El horario se guarda en la hoja de Google de Hacienda y usa la misma clave de Niños. Este dispositivo la va a recordar 30 días."
          onEntrar={(c) => {
            setMensajeClave('');
            setCon(c);
          }}
        />
      </section>
    );
  }

  const esNuevo = (d, k, id) => nuevos.includes(`${d}|${k}|${id}`);
  const nombres = (d, k) => en(ctx.horario, d, k).map((id) => ({ id, n: ctx.nombre(id), app: esNuevo(d, k, id) }));

  const tablaSemana = (s) => {
    const dias = diasDeSemana(ctx, s);
    const pre = ctx.wd(dias[0]);
    const post = 6 - ctx.wd(dias[dias.length - 1]);
    const hueco = (n, T) => Array.from({ length: n }, (_, i) => <T key={`h${i}`} className="fuera" />);
    return (
      <div className="h-card h-scroll">
        <table className="h-sem">
          <thead>
            <tr>
              <th className="puesto" />
              {hueco(pre, 'th')}
              {dias.map((d) => (
                <th key={d} className={`${ctx.finde(d) ? 'fin' : ''}${horario.fer.includes(d) ? ' fer' : ''}`}>
                  {DIAS_SEM[ctx.wd(d)]}
                  <b>{d}</b>
                  {horario.fer.includes(d) && <span className="fer">FERIADO</span>}
                </th>
              ))}
              {hueco(post, 'th')}
            </tr>
          </thead>
          <tbody>
            {PUESTOS.map((k) => (
              <tr key={k} className={k === ON_CALL ? 'sep' : ''}>
                <th className="puesto">
                  <i style={{ background: COLOR_PUESTO[k] }} />
                  {k === ON_CALL ? 'On call' : k}
                </th>
                {hueco(pre, 'td')}
                {dias.map((d) => {
                  const f = ctx.falta(k, d);
                  return (
                    <td key={d} className={ctx.finde(d) ? 'fin' : ''}>
                      <button type="button" className={`h-celda${f > 0 ? ' falta' : ''}`} data-d={d} data-k={k} onClick={() => setVentana({ tipo: 'elegir', d, k })}>
                        {nombres(d, k).map((x) => (
                          <span key={x.id} className={`n${x.app ? ' app' : ''}`}>
                            {x.n}
                          </span>
                        ))}
                        {f > 0 && <span className="f">Revisar · {f === 1 ? 'falta 1' : `faltan ${f}`}</span>}
                      </button>
                    </td>
                  );
                })}
                {hueco(post, 'td')}
              </tr>
            ))}
            <tr className="nota-fila">
              <th className="puesto">
                <i className="nota-ico" aria-hidden="true">✎</i>
                Notas
              </th>
              {hueco(pre, 'td')}
              {dias.map((d) => {
                const t = horario.notas[d];
                return (
                  <td key={d} className={ctx.finde(d) ? 'fin' : ''}>
                    <button type="button" className={`h-celda h-nota${t ? ' con' : ''}`} data-nota={d} onClick={() => setVentana({ tipo: 'nota', d })} aria-label={t ? `Nota del ${d}: ${t}` : `Agregar nota al ${d}`}>
                      {t || <span className="mas">+ nota</span>}
                    </button>
                  </td>
                );
              })}
              {hueco(post, 'td')}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const cajaDia = (d) => {
    const falta = faltanEnDia(ctx, d);
    return (
      <div key={d} className={`h-dia${ctx.finde(d) ? ' fin' : ''}${falta ? ' mal' : ''}`}>
        <div className="dh">
          <b>{d}</b>
          <span className="dh-der">
            {horario.fer.includes(d) ? <span className="fer">FERIADO</span> : falta ? <span className="bad">revisar</span> : null}
            <button type="button" className={`h-lapiz${horario.notas[d] ? ' con' : ''}`} data-nota={d} title={horario.notas[d] ? 'Editar nota' : 'Agregar nota'} aria-label={horario.notas[d] ? `Editar nota del ${d}` : `Agregar nota al ${d}`} onClick={() => setVentana({ tipo: 'nota', d })}>
              ✎
            </button>
          </span>
        </div>
        {PUESTOS.map((k) => {
          const l = nombres(d, k);
          const f = ctx.falta(k, d);
          return (
            <button key={k} type="button" className={`h-linea${k === ON_CALL ? ' chica' : ''}`} data-d={d} data-k={k} onClick={() => setVentana({ tipo: 'elegir', d, k })}>
              <span className="et" style={{ background: COLOR_PUESTO[k] }}>
                {CORTO[k]}
              </span>
              <span className="qs">
                {l.map((x, i) => (
                  <span key={x.id} className={x.app ? 'app' : ''}>
                    {x.n}
                    {i < l.length - 1 || f > 0 ? ', ' : ''}
                  </span>
                ))}
                {f > 0 && <span className="el">elegir{f > 1 ? ` ${f}` : ''}…</span>}
                {!l.length && f <= 0 && <span className="sin">—</span>}
              </span>
            </button>
          );
        })}
        {horario.notas[d] && (
          <button type="button" className="h-dia-nota" onClick={() => setVentana({ tipo: 'nota', d })}>
            {horario.notas[d]}
          </button>
        )}
      </div>
    );
  };

  const aviso = (lista, donde) => {
    const malos = lista;
    if (!malos.length)
      return (
        <div className="h-estado ok">
          <span>✓</span>
          <div>{donde === 'mes' ? 'Todo el mes está completo.' : 'Esta semana está completa.'}</div>
        </div>
      );
    return (
      <div className="h-estado mal">
        <span aria-hidden="true">📝</span>
        <div>
          <b>
            {malos.length === 1 ? '1 cosa' : `${malos.length} cosas`} para revisar {donde === 'mes' ? 'en el mes' : 'esta semana'}
          </b>
          <ul>
            {malos.slice(0, 6).map((p, i) => (
              <li key={i}>{p.t}</li>
            ))}
            {malos.length > 6 && <li>y {malos.length - 6} más…</li>}
          </ul>
        </div>
      </div>
    );
  };

  const cuerpo = () => {
    if (estado === 'cargando')
      return (
        <div className="empty">
          <span className="spin" aria-hidden="true" /> Cargando el horario…
        </div>
      );
    if (estado === 'error')
      return error === 'viejo' ? (
        <div className="alert warn">
          <b>Falta actualizar el código de Google</b>
          <span>Para usar el Horario hay que pegar el Code.gs nuevo en Apps Script y crear una nueva versión de la implementación.</span>
        </div>
      ) : (
        <div className="alert bad">
          <b>No se pudo cargar el horario</b>
          <span>{error}</span>
          <button type="button" className="mini" onClick={() => cargar(clave)}>
            Intentar otra vez
          </button>
        </div>
      );
    if (!horario) {
      const ant = soloMes(moverMes(clave, -1));
      return (
        <div className="h-card h-vacio">
          <div className="ico" aria-hidden="true">
            🗓️
          </div>
          <h3>{nombreMes(clave)} todavía está vacío</h3>
          <p>La app arma el mes completo con las reglas: padres de casa un fin de semana sí y uno no, auxiliares con su día de descanso y el on call. Después solo cambias lo que haga falta.</p>
          <button type="button" className="h-btn prim grande" id="h-armar" onClick={() => llenar(true)}>
            Armar el horario con las reglas
          </button>
          <div className="h-otras">
            {anterior && (
              <button type="button" className="btn-link" id="h-copiar" onClick={copiar}>
                Copiar el de {ant}
              </button>
            )}
            <button type="button" className="btn-link" id="h-subir" disabled={ocupado === 'subir'} onClick={() => archivo.current.click()}>
              {ocupado === 'subir' ? 'Leyendo…' : 'Subir un Excel o PDF'}
            </button>
            <button type="button" className="btn-link" id="h-blanco" onClick={() => setHorario({ ...horarioVacio(), ...base })}>
              Empezar en blanco
            </button>
          </div>
        </div>
      );
    }
    const delaSemana = todos.filter((p) => ctx.semanaDe(p.d) === sem);
    return (
      <>
        <div className="h-barra">
          <div className="seg" role="group" aria-label="Ver">
            <button type="button" id="h-ver-semana" aria-pressed={modo === 'semana'} onClick={() => setModo('semana')}>
              Semana
            </button>
            <button type="button" id="h-ver-mes" aria-pressed={modo === 'mes'} onClick={() => setModo('mes')}>
              Mes
            </button>
          </div>
          {modo === 'semana' && (
            <div className="h-sems">
              {Array.from({ length: ctx.semanas }, (_, i) => {
                const ds = diasDeSemana(ctx, i);
                return (
                  <button key={i} type="button" className={i === sem ? 'on' : ''} onClick={() => setSem(i)}>
                    {ds[0]}–{ds[ds.length - 1]}
                    {todos.some((p) => ctx.semanaDe(p.d) === i) && <span className="pt" />}
                  </button>
                );
              })}
            </div>
          )}
          <span className="esp" />
          {faltas > 0 && (
            <button type="button" className="h-btn prim" id="h-completar" onClick={() => llenar(false)}>
              ✨ Completar lo que falta
            </button>
          )}
          <button type="button" className="h-btn h-btn-borrar" id="h-borrar" onClick={() => setVentana({ tipo: 'borrar' })}>
            Borrar
          </button>
          <button type="button" className="h-btn" id="h-descargar" onClick={() => setVentana({ tipo: 'bajar' })}>
            Descargar
          </button>
        </div>
        {ctx.revisa ? aviso(modo === 'semana' ? delaSemana : todos, modo) : <p className="hint">Este mes es anterior a las reglas nuevas, así que la app no lo revisa.</p>}
        {notas.length > 0 && <p className="hint">{notas.join(' · ')}</p>}
        {horario.obs && (
          <button type="button" className="h-obs" id="h-obs-ver" onClick={() => setVentana({ tipo: 'obs' })}>
            <b>Observaciones del mes</b>
            <span>{horario.obs}</span>
          </button>
        )}
        {modo === 'semana' ? (
          tablaSemana(Math.min(sem, ctx.semanas - 1))
        ) : (
          <div className="h-scroll">
            <div className="h-mes">
              {DIAS_SEM.map((x) => (
                <div key={x} className="dn">
                  {x}
                </div>
              ))}
              {Array.from({ length: ctx.wd(1) }, (_, i) => (
                <div key={`v${i}`} className="h-dia out" />
              ))}
              {Array.from({ length: ctx.n }, (_, i) => cajaDia(i + 1))}
            </div>
          </div>
        )}
        <div className="h-pie">
          {nuevos.length > 0 && (
            <span className="ley">
              <i /> Lo puso la app, revísalo
            </span>
          )}
          <span className="esp" />
          <button type="button" className="btn-link" onClick={() => setVentana({ tipo: 'resumen' })}>
            Ver resumen del mes
          </button>
          {!horario.obs && (
            <button type="button" className="btn-link" id="h-obs-agregar" onClick={() => setVentana({ tipo: 'obs' })}>
              Agregar observaciones del mes
            </button>
          )}
          <button type="button" className="btn-link" id="h-resubir" disabled={ocupado === 'subir'} onClick={() => archivo.current.click()}>
            Subir Excel de {soloMes(clave)}
          </button>
          <button type="button" className="btn-link" id="h-rearmar" onClick={() => setVentana({ tipo: 'rearmar' })}>
            Volver a armar con las reglas
          </button>
          {anterior && (
            <button type="button" className="btn-link" onClick={() => setVentana({ tipo: 'recopiar' })}>
              Volver a copiar {soloMes(moverMes(clave, -1))}
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <section className={`wrap hor${sucio ? ' con-barra' : ''}`} aria-labelledby="t-horario">
      <div className="h-cab">
        <h2 id="t-horario">Horario</h2>
        <div className="h-mesnav">
          <button type="button" id="h-mes-antes" aria-label="Mes anterior" onClick={() => irMes(-1)}>
            ‹
          </button>
          <span id="h-mes">{nombreMes(clave)}</span>
          <button type="button" id="h-mes-despues" aria-label="Mes siguiente" onClick={() => irMes(1)}>
            ›
          </button>
        </div>
        {horario && !sucio && actualizado && <span className="h-guardado">✓ Guardado {cuando(actualizado)}</span>}
        <span className="esp" />
        {estado === 'listo' && horario && (
          <button type="button" className="h-btn" id="h-vacaciones" onClick={() => setVentana({ tipo: 'vac' })}>
            Vacaciones y feriados
          </button>
        )}
        {estado === 'listo' && (
          <button type="button" className="h-btn" id="h-personal" onClick={() => setVentana({ tipo: 'personal' })}>
            Personal y reglas
          </button>
        )}
      </div>

      {cuerpo()}

      <input
        ref={archivo}
        type="file"
        hidden
        accept=".xlsx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(e) => {
          subir(e.target.files[0]);
          e.target.value = '';
        }}
      />

      <Ventana abierta={ventana?.tipo === 'elegir'} onCerrar={() => setVentana(null)} etiqueta="Elegir personas">
        {ventana?.tipo === 'elegir' && (
          <Elegir
            key={`${ventana.d}|${ventana.k}`}
            ctx={ctx}
            d={ventana.d}
            k={ventana.k}
            onCerrar={() => setVentana(null)}
            onListo={(ids, todaLaSemana) => {
              const h2 = ponerEnBloque(ctx, ventana.d, ventana.k, ids, todaLaSemana);
              cambiar(ventana.k === ON_CALL ? h2 : sincronizarOnCall(clave, h2, config, anterior));
              setVentana(null);
            }}
          />
        )}
      </Ventana>

      <Ventana
        abierta={ventana?.tipo === 'personal'}
        ancha
        etiqueta="Personal"
        onCerrar={() => {
          setVentana(null);
          guardarConfig(config);
        }}
      >
        <Personal
          config={config}
          clave={clave}
          onCambio={setConfig}
          onCerrar={() => {
            setVentana(null);
            guardarConfig(config);
          }}
          onQuitar={(id) => {
            const n = ctx.nombre(id);
            const r = darDeBaja(config, horario, id, clave);
            setConfig(r.config);
            if (horario) cambiar(r.horario);
            avisar(`${n} ya no sale desde ${soloMes(clave)}. Los meses anteriores quedan igual.`);
          }}
        />
      </Ventana>

      <Ventana abierta={ventana?.tipo === 'vac'} onCerrar={() => setVentana(null)} etiqueta="Vacaciones y feriados">
        {horario && <Vacaciones ctx={ctx} onCambio={cambiar} onCerrar={() => setVentana(null)} />}
      </Ventana>

      <Ventana abierta={ventana?.tipo === 'bajar'} onCerrar={() => setVentana(null)} etiqueta="Descargar">
        <h3>Descargar el horario de {soloMes(clave)}</h3>
        {sucio && <p className="h-err">Tienes cambios sin guardar. Se descarga lo que ves en pantalla.</p>}
        <div className="h-bajar">
          <button type="button" id="h-bajar-pdf" disabled={!!ocupado} onClick={() => bajar('pdf')}>
            <b>{ocupado === 'pdf' ? 'Armando…' : 'PDF para imprimir'}</b>
            <span>Todo el mes en una hoja, con colores por casa.</span>
          </button>
          <button type="button" id="h-bajar-excel" disabled={!!ocupado} onClick={() => bajar('excel')}>
            <b>{ocupado === 'excel' ? 'Armando…' : 'Excel'}</b>
            <span>Con el formato de siempre, para mandar o editar.</span>
          </button>
        </div>
        <div className="h-acc">
          <button type="button" className="h-btn" onClick={() => setVentana(null)}>
            Cerrar
          </button>
        </div>
      </Ventana>

      <Ventana abierta={ventana?.tipo === 'resumen'} onCerrar={() => setVentana(null)} etiqueta="Resumen del mes">
        <h3>Resumen de {soloMes(clave)}</h3>
        <p className="hint">Cuántos días trabaja cada persona este mes.</p>
        <table className="h-res">
          <thead>
            <tr>
              <th>Persona</th>
              <th>Días</th>
              <th>Fines de semana</th>
              <th>On call</th>
            </tr>
          </thead>
          <tbody>
            {ventana?.tipo === 'resumen' &&
              resumenMes(ctx).map((x) => (
                <tr key={x.p.id}>
                  <td>{x.p.n}</td>
                  <td>{x.dias}</td>
                  <td>{x.fines}</td>
                  <td>{x.calls}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="h-acc">
          <button type="button" className="h-btn prim" onClick={() => setVentana(null)}>
            Listo
          </button>
        </div>
      </Ventana>

      <Ventana abierta={ventana?.tipo === 'nota'} onCerrar={() => setVentana(null)} etiqueta="Nota del día">
        {ventana?.tipo === 'nota' && horario && (
          <EditarTexto
            key={`nota${ventana.d}`}
            id="h-nota"
            titulo={`Nota del ${DIAS_LARGO[ctx.wd(ventana.d)]} ${ventana.d} de ${MESES[ctx.mes]}`}
            ayuda="Sale en ese día del horario, en el PDF y en el Excel."
            ejemplo="Ej. Marivid de 2 a 8 solo este día"
            inicial={horario.notas[ventana.d] || ''}
            max={MAX_NOTA}
            filas={3}
            onCerrar={() => setVentana(null)}
            onGuardar={(t) => {
              cambiar(ponerNota(horario, ventana.d, t));
              setVentana(null);
            }}
          />
        )}
      </Ventana>

      <Ventana abierta={ventana?.tipo === 'obs'} onCerrar={() => setVentana(null)} etiqueta="Observaciones del mes">
        {ventana?.tipo === 'obs' && horario && (
          <EditarTexto
            id="h-obs"
            titulo={`Observaciones de ${soloMes(clave)}`}
            ayuda="Algo general del mes. Sale arriba del horario en la app, y abajo en el PDF y en el Excel."
            ejemplo="Ej. En las vacaciones de navidad los niños salen el 23. Reunión de personal el 15."
            inicial={horario.obs}
            max={MAX_OBS}
            filas={5}
            onCerrar={() => setVentana(null)}
            onGuardar={(t) => {
              cambiar(ponerObs(horario, t));
              setVentana(null);
            }}
          />
        )}
      </Ventana>

      <Ventana abierta={ventana?.tipo === 'borrar'} onCerrar={() => setVentana(null)} etiqueta="Borrar horario">
        <h3>¿Borrar el horario de {soloMes(clave)}?</h3>
        <p className="hint">
          Se borran las casas, el on call, las notas y las observaciones de {soloMes(clave)}{guardado ? ', también en la hoja de Google' : ''}. Vuelve a salir la pantalla para armarlo con las reglas, copiar el mes anterior o empezar de cero. Las vacaciones y feriados se quedan.
        </p>
        <p className="hint">Los demás meses no se tocan.</p>
        <div className="h-acc">
          <button type="button" className="h-btn" onClick={() => setVentana(null)}>
            Cancelar
          </button>
          <button type="button" className="h-btn h-peligro" id="h-borrar-ok" disabled={ocupado === 'borrar'} onClick={borrar}>
            {ocupado === 'borrar' ? 'Borrando…' : `Sí, borrar ${soloMes(clave)}`}
          </button>
        </div>
      </Ventana>

      <Ventana abierta={ventana?.tipo === 'rearmar'} onCerrar={() => setVentana(null)} etiqueta="Volver a armar">
        <h3>¿Volver a armar {soloMes(clave)} con las reglas?</h3>
        <p className="hint">Se borra lo que hay en {soloMes(clave)} y la app lo arma de nuevo. Las vacaciones y feriados se quedan. No se guarda hasta que toques el botón de guardar.</p>
        <div className="h-acc">
          <button type="button" className="h-btn" onClick={() => setVentana(null)}>
            Cancelar
          </button>
          <button
            type="button"
            className="h-btn prim"
            id="h-rearmar-ok"
            onClick={() => {
              setVentana(null);
              llenar(true);
            }}
          >
            Sí, armar de nuevo
          </button>
        </div>
      </Ventana>

      <Ventana abierta={ventana?.tipo === 'recopiar'} onCerrar={() => setVentana(null)} etiqueta="Volver a copiar">
        <h3>¿Volver a copiar {soloMes(moverMes(clave, -1))}?</h3>
        <p className="hint">Se reemplaza todo lo que hay en {soloMes(clave)} por la copia de {soloMes(moverMes(clave, -1))}. Las vacaciones y feriados se quedan. No se guarda hasta que toques el botón de guardar.</p>
        <div className="h-acc">
          <button type="button" className="h-btn" onClick={() => setVentana(null)}>
            Cancelar
          </button>
          <button
            type="button"
            className="h-btn prim"
            id="h-recopiar-ok"
            onClick={() => {
              setVentana(null);
              copiar();
            }}
          >
            Sí, copiar otra vez
          </button>
        </div>
      </Ventana>

      {sucio && (
        <div className="h-guardar" role="region" aria-label="Guardar cambios">
          <span>
            <b>{guardado ? 'Hiciste cambios en el horario.' : 'El horario todavía no está guardado.'}</b> {guardado ? 'Toca Actualizar para que queden guardados.' : ''}
          </span>
          <span className="bts">
            <button type="button" className="h-btn" id="h-deshacer" disabled={ocupado === 'guardar'} onClick={deshacer}>
              {guardado ? 'Deshacer cambios' : 'Borrar todo'}
            </button>
            <button type="button" className="h-btn prim grande" id="h-guardar" disabled={ocupado === 'guardar'} onClick={guardar}>
              {ocupado === 'guardar' ? 'Guardando…' : guardado ? 'Actualizar horario' : 'Guardar horario'}
            </button>
          </span>
        </div>
      )}
    </section>
  );
}
