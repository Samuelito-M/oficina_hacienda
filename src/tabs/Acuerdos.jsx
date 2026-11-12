import { useMemo, useState } from 'react';
import Subir from '../components/Subir.jsx';
import Personal from '../components/Personal.jsx';
import Desconocidos from '../components/Desconocidos.jsx';
import { acuerdosElegidos, claveFinde, estaElegido, listo, vistaPrevia } from '../lib/seleccion.js';
import { finDeSemanaCorto, finDeSemanaLargo, MESES } from '../lib/text.js';
import { cedulaValida } from '../lib/personal.js';

const OK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
const MAS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
    <path d="M12 6v12M6 12h12" />
  </svg>
);
const BAJAR = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4v11" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 20h14" />
  </svg>
);

function FormCedula({ persona, onGuardar, onCancelar }) {
  const [completo, setCompleto] = useState(persona.completo || '');
  const [cedula, setCedula] = useState(persona.cedula || '');
  const [error, setError] = useState('');
  return (
    <form
      className="addp"
      onSubmit={(e) => {
        e.preventDefault();
        const c = cedula.replace(/\D/g, '');
        if (!completo.trim()) return setError('Escribe los apellidos y nombres.');
        if (!cedulaValida(c)) return setError('La cédula debe tener 10 números.');
        onGuardar(completo.trim(), c);
      }}
    >
      <p className="row">
        <b>{persona.nombre}</b> no tiene nombre completo o cédula guardados. Escríbelos una vez y quedan para los próximos meses.
      </p>
      <label>
        Apellidos y nombres
        <input value={completo} onChange={(e) => setCompleto(e.target.value)} placeholder="Como va en el acuerdo" autoFocus />
      </label>
      <label>
        Cédula
        <input value={cedula} onChange={(e) => setCedula(e.target.value)} inputMode="numeric" placeholder="10 números" maxLength={13} />
      </label>
      <div className="row-actions">
        <button type="submit">Guardar y agregar</button>
        <button type="button" className="mini" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
      {error && <p className="row" style={{ color: '#b3261e' }}>{error}</p>}
    </form>
  );
}

export default function Acuerdos({ horario, analisis, errorAnalisis, word, personal, setPersonal, over, setOver, onHorario, onWord, onDescargar, onExcelPagos, generando, generandoExcel, mantener, setMantener, aviso }) {
  const [abierto, setAbierto] = useState(null);
  const [verIdx, setVerIdx] = useState(0);
  const porId = useMemo(() => new Map(personal.map((p) => [p.id, p])), [personal]);
  const lista = useMemo(() => acuerdosElegidos(analisis, personal, over), [analisis, personal, over]);
  const monto = word.info?.monto || 60;
  const total = lista.length * monto;
  const personas = new Set(lista.map((a) => a.persona.id)).size;
  const viejos = word.info && analisis ? word.info.quedanPara(analisis.mes, analisis.anio) : 0;
  const resumen = useMemo(() => {
    const m = new Map();
    for (const a of lista) {
      if (!m.has(a.persona.id)) m.set(a.persona.id, { p: a.persona, items: [] });
      m.get(a.persona.id).items.push(a);
    }
    return Array.from(m.values());
  }, [lista]);
  const idx = Math.min(verIdx, Math.max(0, lista.length - 1));
  const actual = lista[idx];
  const prev = word.info && actual ? vistaPrevia(word.info.plantillaTextos, actual) : null;
  const mesNombre = analisis ? `${MESES[analisis.mes]} ${analisis.anio}` : '';
  const puede = analisis && word.info && lista.length > 0 && !generando;

  const alternar = (f, p) => {
    const k = `${claveFinde(f)}|${p.id}`;
    if (!listo(p)) {
      setAbierto(abierto && abierto.k === k ? null : { k, f, id: p.id });
      return;
    }
    setOver({ ...over, [k]: !estaElegido(over, f, p) });
  };

  return (
    <section className="wrap" aria-labelledby="t-acuerdos">
      <div className="intro">
        <h2 id="t-acuerdos">Acuerdos de fin de semana</h2>
        <p>Sube el horario del mes (PDF o Excel) y el Word de acuerdos del mes pasado. Los fijos salen solos; toca un nombre para agregar o quitar extras.</p>
      </div>
      <div className="uploads">
        <Subir etiqueta="Horario del mes" tipo="horario" estado={horario} onArchivo={onHorario} ayuda="El calendario del mes, en PDF o Excel" />
        <Subir etiqueta="Acuerdos del mes pasado" tipo="docx" estado={word} onArchivo={onWord} ayuda="El Word con los acuerdos de trabajo" />
      </div>

      {errorAnalisis && (
        <div className="alert bad" role="alert">
          <b>No pude leer el horario</b>
          <span>{errorAnalisis}</span>
        </div>
      )}
      {aviso && <div className="alert warn">{aviso}</div>}

      {!analisis && !errorAnalisis && (
        <div className="empty">
          <b>Sube el horario para empezar</b>
          La app lee quién trabaja cada fin de semana y en qué casa.
        </div>
      )}

      {analisis && (
        <>
          <Desconocidos analisis={analisis} personal={personal} setPersonal={setPersonal} />
          <div className="result">
            <div className="what">
              <small>{word.info ? 'Listo para descargar' : 'Falta el Word del mes pasado'}</small>
              <strong>Acuerdos de {mesNombre}</strong>
            </div>
            <div className="stats">
              <div className="stat">
                <b>{lista.length}</b>
                <span>Acuerdos</span>
              </div>
              <div className="stat">
                <b>{personas}</b>
                <span>Personas</span>
              </div>
              <div className="stat">
                <b>${total.toLocaleString('en-US')}</b>
                <span>Total</span>
              </div>
            </div>
            <div className="btns">
              <button className="dl ghost" disabled={!lista.length || generandoExcel} onClick={() => onExcelPagos(lista, monto)} title="Resumen y detalle de pagos para contabilidad">
                {generandoExcel ? <span className="spin" aria-hidden="true" /> : BAJAR}
                {generandoExcel ? 'Armando…' : 'Excel de pagos'}
              </button>
              <button className="dl" disabled={!puede} onClick={() => onDescargar(lista)}>
                {generando ? <span className="spin" aria-hidden="true" /> : BAJAR}
                {generando ? 'Armando…' : 'Descargar Word'}
              </button>
            </div>
          </div>

          <div className="cols">
            <div className="panel">
              <h3>Fines de semana según el horario</h3>
              <div className="legend">
                <span>
                  <i className="sw f" />
                  Fijo, ya incluido
                </span>
                <span>
                  <i className="sw e" />
                  Extra que agregaste
                </span>
                <span>
                  <i className="sw o" />
                  Toca para agregar
                </span>
                <span>
                  <i className="sw m" />
                  Falta cédula
                </span>
              </div>
              <div className="panel">
                {analisis.findes.map((f) => {
                  const n = lista.filter((a) => a.finde === f).length;
                  return (
                    <article className="wk" key={claveFinde(f)}>
                      <div className="wk-h">
                        <h4>{finDeSemanaLargo(f.sabado)}</h4>
                        <span>
                          {n} {n === 1 ? 'acuerdo' : 'acuerdos'} · ${n * monto}
                        </span>
                      </div>
                      {f.domingoFuera && <p className="wk-note">El domingo {f.domingo.getDate()} de {MESES[f.domingo.getMonth()]} no sale en este horario. Se cuenta el fin de semana completo con lo que dice el sábado.</p>}
                      {!Object.keys(f.casas).length && <p className="wk-note">No encontré casas para este fin de semana en el horario.</p>}
                      {Object.entries(f.casas).map(([casa, ids]) => (
                        <div className="house" key={casa}>
                          <div className="hn">{casa}</div>
                          <div className="chips">
                            {ids.map((id) => {
                              const p = porId.get(id);
                              if (!p) return null;
                              const k = `${claveFinde(f)}|${id}`;
                              if (!listo(p))
                                return (
                                  <button key={id} className="chip miss" onClick={() => alternar(f, p)} aria-label={`${p.nombre}: falta cédula, toca para agregarla`}>
                                    {p.nombre} <span className="t">falta cédula</span>
                                  </button>
                                );
                              const on = estaElegido(over, f, p);
                              const extra = !p.fijo;
                              return (
                                <button key={id} className={`chip ${on ? 'on' : ''} ${on && extra ? 'x' : ''}`} aria-pressed={on} onClick={() => alternar(f, p)}>
                                  {on ? OK : MAS}
                                  {p.nombre}
                                  {on && <span className="t">{p.fijo ? 'fijo' : 'extra'}</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {f.call.length > 0 && (
                        <div className="house">
                          <div className="hn">On Call</div>
                          <div className="chips">
                            {f.call.map((id) => (
                              <span key={id} className="chip call">
                                {porId.get(id)?.nombre || id} · no lleva acuerdo
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {abierto && abierto.k.startsWith(claveFinde(f) + '|') && porId.get(abierto.id) && (
                        <FormCedula
                          persona={porId.get(abierto.id)}
                          onCancelar={() => setAbierto(null)}
                          onGuardar={(completo, cedula) => {
                            setPersonal(personal.map((p) => (p.id === abierto.id ? { ...p, completo, cedula } : p)));
                            setOver({ ...over, [abierto.k]: true });
                            setAbierto(null);
                          }}
                        />
                      )}
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="panel">
              <h3>Resumen por persona</h3>
              <div className="tbox">
                <table>
                  <thead>
                    <tr>
                      <th>Persona</th>
                      <th>Fines de semana</th>
                      <th>Casa</th>
                      <th className="n">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.length === 0 && (
                      <tr>
                        <td colSpan={4} className="hint">
                          No hay acuerdos marcados.
                        </td>
                      </tr>
                    )}
                    {resumen.map(({ p, items }) => (
                      <tr key={p.id}>
                        <td>
                          {p.completo}
                          {!p.fijo && <span className="tag">extra</span>}
                        </td>
                        <td>
                          {items.map((a, i) => (
                            <span key={i} style={{ whiteSpace: 'nowrap' }}>
                              {i > 0 && ', '}
                              {finDeSemanaCorto(a.sabado)}
                            </span>
                          ))}
                        </td>
                        <td>{Array.from(new Set(items.map((a) => a.casa))).join(', ')}</td>
                        <td className="n">${(items.length * monto).toLocaleString('en-US')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}>Total</td>
                      <td className="n">${total.toLocaleString('en-US')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {word.info && (
                <label className="check">
                  <input type="checkbox" checked={mantener} onChange={(e) => setMantener(e.target.checked)} />
                  <span>Dejar al final del Word los {viejos} acuerdos anteriores que no son fines de semana de este mes ni del pasado, con sus fechas originales.</span>
                </label>
              )}
              <h3>Vista previa</h3>
              {!word.info && <p className="hint">Sube el Word del mes pasado para ver cómo queda cada acuerdo.</p>}
              {word.info && lista.length === 0 && <p className="hint">Marca al menos un acuerdo para verlo aquí.</p>}
              {prev && (
                <>
                  <div className="pv-head">
                    <button onClick={() => setVerIdx((idx - 1 + lista.length) % lista.length)} aria-label="Acuerdo anterior">
                      ‹
                    </button>
                    <select value={idx} onChange={(e) => setVerIdx(+e.target.value)} aria-label="Elegir acuerdo">
                      {lista.map((a, i) => (
                        <option key={i} value={i}>
                          {i + 1}. {a.completo} · {finDeSemanaCorto(a.sabado)}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => setVerIdx((idx + 1) % lista.length)} aria-label="Acuerdo siguiente">
                      ›
                    </button>
                  </div>
                  <article className="paper">
                    {prev.map((partes, i) => {
                      const txt = partes.map((x) => x.t).join('').trim();
                      if (!txt) return null;
                      const esTitulo = i === 0;
                      if (esTitulo) return <h5 key={i}>{txt}</h5>;
                      return (
                        <p key={i}>
                          {partes.map((x, j) => (x.fill ? <span key={j} className="fill">{x.t}</span> : <span key={j}>{x.t}</span>))}
                        </p>
                      );
                    })}
                  </article>
                </>
              )}
            </div>
          </div>
        </>
      )}
      <Personal personal={personal} setPersonal={setPersonal} />
    </section>
  );
}
