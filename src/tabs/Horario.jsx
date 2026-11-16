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
  completar,
  quitarPersona,
  idNuevo,
  resumenMes,
  desdeExcel
} from '../lib/horarioApp.js';

const Cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const nombreMes = (clave) => {
  const { anio, mes } = partesMes(clave);
  return `${Cap(MESES[mes])} ${anio}`;
};
const soloMes = (clave) => MESES[partesMes(clave).mes];
const J = (x) => JSON.stringify(x);

function cuando(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hoy = new Date();
  const hora = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.toDateString() === hoy.toDateString()) return `hoy a las ${hora}`;
  return `el ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

function Ventana({ abierta, onCerrar, ancha, children, etiqueta }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierta && !d.open) d.showModal();
    if (!abierta && d.open) d.close();
  }, [abierta]);
  return (
    <dialog
      ref={ref}
      className={`h-dlg${ancha ? ' ancha' : ''}`}
      aria-label={etiqueta}
      onClose={onCerrar}
      onClick={(e) => {
        if (e.target === ref.current) onCerrar();
      }}
    >
      {abierta && <div className="h-dlg-in">{children}</div>}
    </dialog>
  );
}

function Elegir({ ctx, d, k, onListo, onCerrar }) {
  const actuales = en(ctx.horario, d, k);
  const [sel, setSel] = useState(actuales);
  const [verNo, setVerNo] = useState(false);
  const lista = ctx.config.personal.map((p) => ({ p, m: actuales.includes(p.id) ? '' : ctx.motivo(p.id, d, k) }));
  const extra = actuales.filter((id) => !ctx.porId.has(id)).map((id) => ({ p: { id, n: id }, m: '' }));
  const si = [...extra, ...lista.filter((x) => !x.m)].sort((a, b) => actuales.includes(b.p.id) - actuales.includes(a.p.id) || (b.p.padre === k) - (a.p.padre === k) || a.p.n.localeCompare(b.p.n, 'es'));
  const no = lista.filter((x) => x.m).sort((a, b) => a.p.n.localeCompare(b.p.n, 'es'));
  const nec = ctx.necesita(k, d);
  const fila = ({ p, m }) => (
    <label key={p.id}>
      <input type="checkbox" checked={sel.includes(p.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))} />
      <span>{p.n}</span>
      <span className="r">{m || (p.padre === k ? 'de esta casa' : '')}</span>
    </label>
  );
  const abiertoNo = verNo || !si.length;
  return (
    <>
      <h3>
        {k === ON_CALL ? 'On call' : k} · {DIAS_LARGO[ctx.wd(d)]} {d} de {MESES[ctx.mes]}
      </h3>
      <p className="hint">{k === ON_CALL ? '¿Quién está de llamada este día?' : `Marca quién trabaja aquí este día.${nec ? ` Necesita ${nec} ${nec === 1 ? 'persona' : 'personas'}.` : ''}`}</p>
      <div className="h-opc">{si.length ? si.map(fila) : <p className="hint">Nadie está libre según las reglas. Si igual quieres poner a alguien, elígelo abajo.</p>}</div>
      {no.length > 0 && (
        <>
          <button type="button" className="btn-link h-vermas" onClick={() => setVerNo(!abiertoNo)}>
            {abiertoNo ? '▾' : '▸'} No disponibles ({no.length})
          </button>
          {abiertoNo && <div className="h-opc apagado">{no.map(fila)}</div>}
        </>
      )}
      <div className="h-acc">
        <button type="button" className="h-btn" onClick={onCerrar}>
          Cancelar
        </button>
        <button type="button" className="h-btn prim" id="h-elegir-ok" onClick={() => onListo(sel)}>
          Listo
        </button>
      </div>
    </>
  );
}

function Personal({ config, onCambio, onQuitar, onCerrar }) {
  const [vista, setVista] = useState('gente');
  const [nombre, setNombre] = useState('');
  const [casa, setCasa] = useState('');
  const [borrando, setBorrando] = useState('');
  const [error, setError] = useState('');
  const cambiar = (id, cambios) => onCambio({ ...config, personal: config.personal.map((p) => (p.id === id ? { ...p, ...cambios } : p)) });
  const agregar = () => {
    const n = nombre.trim().replace(/\s+/g, ' ');
    if (!n) return setError('Escribe el nombre.');
    if (config.personal.some((p) => p.n.toLowerCase() === n.toLowerCase())) return setError('Ya hay alguien con ese nombre.');
    onCambio({ ...config, personal: [{ id: idNuevo(config, n), n, padre: casa, dias: casa ? [0, 5, 6] : [1, 2, 3, 4], oc: false }, ...config.personal] });
    setNombre('');
    setError('');
  };
  return (
    <>
      <h3>Personal</h3>
      <div className="h-tabs">
        <button type="button" className={vista === 'gente' ? 'on' : ''} onClick={() => setVista('gente')}>
          Trabajadores
        </button>
        <button type="button" className={vista === 'casas' ? 'on' : ''} onClick={() => setVista('casas')}>
          Personas por casa
        </button>
      </div>
      {vista === 'gente' ? (
        <>
          <div className="h-caja">
            <b>Agregar trabajador</b>
            <div className="h-fila">
              <input id="h-nuevo-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" maxLength={30} onKeyDown={(e) => e.key === 'Enter' && agregar()} />
              <select id="h-nuevo-casa" value={casa} onChange={(e) => setCasa(e.target.value)} aria-label="Tipo">
                <option value="">Rota entre casas</option>
                {CASAS.map((c) => (
                  <option key={c} value={c}>
                    Padre/madre de {c}
                  </option>
                ))}
              </select>
              <button type="button" className="h-btn prim" id="h-nuevo-ok" onClick={agregar}>
                Agregar
              </button>
            </div>
            {error && <span className="h-err">{error}</span>}
          </div>
          <p className="hint">Marca en verde los días que trabaja cada persona. La app usa esto para avisarte y para completar espacios.</p>
          <div className="h-gente">
            {config.personal.map((p) => (
              <div className="h-persona" key={p.id}>
                <div className="nom">
                  <b>{p.n}</b>
                  <select value={p.padre} aria-label={`Tipo de ${p.n}`} onChange={(e) => cambiar(p.id, { padre: e.target.value })}>
                    <option value="">Rota entre casas</option>
                    {CASAS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="h-dias" role="group" aria-label={`Días que trabaja ${p.n}`}>
                  {[1, 2, 3, 4, 5, 6, 0].map((w) => (
                    <button key={w} type="button" aria-pressed={p.dias.includes(w)} title={DIAS_LARGO[w]} onClick={() => cambiar(p.id, { dias: p.dias.includes(w) ? p.dias.filter((x) => x !== w) : [...p.dias, w] })}>
                      {DIAS_SEM[w][0]}
                    </button>
                  ))}
                </div>
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
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="hint">Cuántas personas necesita cada casa como mínimo. La app avisa en rojo si falta alguien.</p>
          <div className="h-nec cab">
            <span />
            <span>Lun a jue</span>
            <span>Vie a dom</span>
          </div>
          {CASAS.map((c) => (
            <div className="h-nec" key={c}>
              <span>
                <i style={{ background: COLOR_PUESTO[c] }} />
                {c}
              </span>
              {[0, 1].map((j) => (
                <input
                  key={j}
                  type="number"
                  min="0"
                  max="6"
                  aria-label={`${c} ${j ? 'fin de semana' : 'entre semana'}`}
                  value={config.nec[c][j]}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(6, Math.floor(+e.target.value) || 0));
                    onCambio({ ...config, nec: { ...config.nec, [c]: j ? [config.nec[c][0], v] : [v, config.nec[c][1]] } });
                  }}
                />
              ))}
            </div>
          ))}
        </>
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
  const [id, setId] = useState(ctx.config.personal[0]?.id || '');
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
            {ctx.config.personal.map((p) => (
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

export default function Horario({ personal, avisar }) {
  const [con, setCon] = useState(leerConexion);
  const [mensajeClave, setMensajeClave] = useState('');
  const hoy = new Date();
  const [clave, setClave] = useState(claveMes(hoy.getFullYear(), hoy.getMonth()));
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState('');
  const [horario, setHorario] = useState(null);
  const [guardado, setGuardado] = useState(null);
  const [actualizado, setActualizado] = useState('');
  const [anterior, setAnterior] = useState(null);
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
      const cfg = normalizarConfig(d.config);
      const h = normalizarHorario(d.horario);
      setConfig(cfg);
      setConfigGuardada(d.config ? J(cfg) : '');
      setHorario(h);
      setGuardado(h ? J(h) : null);
      setActualizado(d.actualizado || '');
      setAnterior(normalizarHorario(d.anterior));
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
    setHorario(guardado ? JSON.parse(guardado) : null);
    setNuevos([]);
    setNotas([]);
  };

  const cambiar = (h) => setHorario(h);

  const copiar = () => {
    const r = copiarAnterior(clave, anterior, config, horario);
    setHorario(r.horario);
    setNotas(resumirQuitados(r.quitados, ctx.nombre));
    setNuevos([]);
    setSem(0);
    avisar(`Copié ${soloMes(moverMes(clave, -1))}. Revisa, cambia lo que sea distinto y toca “Guardar horario”.`);
  };

  const llenar = () => {
    const r = completar(clave, horario, config);
    setHorario(r.horario);
    setNuevos((n) => [...n, ...r.nuevos]);
    const quedan = problemas(contexto(clave, r.horario, config)).filter((p) => p.tipo === 'falta').length;
    const partes = [];
    if (r.casas) partes.push(`${r.casas} ${r.casas === 1 ? 'espacio' : 'espacios'} en las casas`);
    if (r.calls) partes.push(`el on call de ${r.calls} ${r.calls === 1 ? 'día' : 'días'}`);
    avisar(partes.length ? `Llené ${partes.join(' y ')}. Lo nuevo está en color para que lo revises.${quedan ? ` ${quedan === 1 ? 'Quedó 1 espacio' : `Quedaron ${quedan} espacios`} sin nadie libre.` : ''}` : 'No había nadie libre para los espacios que faltan. Tócalos para elegir a alguien.');
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
      setHorario({ ...r.horario, vac: horario ? horario.vac : [], fer: horario ? horario.fer : [] });
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
                  const f = ctx.necesita(k, d) - en(ctx.horario, d, k).length;
                  return (
                    <td key={d} className={ctx.finde(d) ? 'fin' : ''}>
                      <button type="button" className={`h-celda${f > 0 ? ' falta' : ''}`} data-d={d} data-k={k} onClick={() => setVentana({ tipo: 'elegir', d, k })}>
                        {nombres(d, k).map((x) => (
                          <span key={x.id} className={`n${x.app ? ' app' : ''}`}>
                            {x.n}
                          </span>
                        ))}
                        {f > 0 && <span className="f">Falta {f}</span>}
                      </button>
                    </td>
                  );
                })}
                {hueco(post, 'td')}
              </tr>
            ))}
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
          {horario.fer.includes(d) ? <span className="fer">FERIADO</span> : falta ? <span className="bad">falta {falta}</span> : null}
        </div>
        {PUESTOS.map((k) => {
          const l = nombres(d, k);
          const f = ctx.necesita(k, d) - l.length;
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
        <span>⚠️</span>
        <div>
          <b>
            {malos.length === 1 ? 'Hay 1 cosa' : `Hay ${malos.length} cosas`} por revisar {donde === 'mes' ? 'en el mes' : 'esta semana'}
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
          {anterior ? (
            <>
              <p>Empieza con el horario de {ant}. Se copia igual (cada lunes con su lunes, cada sábado con su sábado) y luego solo cambias lo que sea distinto.</p>
              <button type="button" className="h-btn prim grande" id="h-copiar" onClick={copiar}>
                Copiar el horario de {ant}
              </button>
            </>
          ) : (
            <p>Si ya tienes el horario de este mes en Excel o PDF, súbelo y la app lo lee. Si no, empieza en blanco.</p>
          )}
          <button type="button" className={`h-btn${anterior ? '' : ' prim grande'}`} id="h-subir" disabled={ocupado === 'subir'} onClick={() => archivo.current.click()}>
            {ocupado === 'subir' ? 'Leyendo…' : `Subir el horario de ${soloMes(clave)} (Excel o PDF)`}
          </button>
          <button type="button" className="btn-link" id="h-blanco" onClick={() => setHorario(horarioVacio())}>
            o empezar en blanco
          </button>
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
            <button type="button" className="h-btn prim" id="h-completar" onClick={llenar}>
              ✨ Completar lo que falta
            </button>
          )}
          <button type="button" className="h-btn" id="h-descargar" onClick={() => setVentana({ tipo: 'bajar' })}>
            Descargar
          </button>
        </div>
        {aviso(modo === 'semana' ? delaSemana : todos, modo)}
        {notas.length > 0 && <p className="hint">{notas.join(' · ')}</p>}
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
            Personal
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
            onListo={(ids) => {
              cambiar(poner(horario, ventana.d, ventana.k, ids));
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
          onCambio={setConfig}
          onCerrar={() => {
            setVentana(null);
            guardarConfig(config);
          }}
          onQuitar={(id) => {
            const n = ctx.nombre(id);
            setConfig({ ...config, personal: config.personal.filter((p) => p.id !== id) });
            if (horario) cambiar(quitarPersona(horario, id));
            avisar(`Quité a ${n}. Los meses pasados quedan igual.`);
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
