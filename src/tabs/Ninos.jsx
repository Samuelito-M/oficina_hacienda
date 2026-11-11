import { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { CASAS } from '../lib/personal.js';
import { fold } from '../lib/text.js';
import { leerBytes, extension } from '../lib/archivos.js';
import { NinosError, leerConexion, guardarUrl, guardarSesion, borrarSesion, borrarUrl, llamar, urlValida, edad, proximoCumple, cumpleCorto, leerFecha, leerListaExcel } from '../lib/ninos.js';

const normal = (n) => ({ ...n, nacimiento: leerFecha(n.nacimiento) || String(n.nacimiento || '') });

const VACIO = { id: '', nombre: '', casa: '', nacimiento: '', tallaRopa: '', tallaZapatos: '', notas: '' };

function Candado() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function Entrar({ url, onEntrar, mensaje }) {
  const [u, setU] = useState(url);
  const [clave, setClave] = useState('');
  const [cambiarUrl, setCambiarUrl] = useState(!url);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (!urlValida(u)) return setError('La dirección debe ser la de la implementación de Google y terminar en /exec.');
    if (!clave) return setError('Escribe la clave.');
    setCargando(true);
    try {
      const r = await llamar(u, { accion: 'entrar', clave });
      guardarUrl(u);
      guardarSesion(r.token, r.expira);
      setClave('');
      onEntrar({ url: u.trim(), token: r.token, expira: r.expira });
    } catch (err) {
      setError(err instanceof NinosError ? err.message : 'No se pudo entrar.');
    } finally {
      setCargando(false);
    }
  };
  return (
    <form className="lock" onSubmit={enviar}>
      <div className="lock-ic">
        <Candado />
      </div>
      <h3>Esta sección tiene clave</h3>
      <p className="hint">La información de los niños solo la ven las personas que tienen la clave. Este dispositivo la va a recordar 30 días.</p>
      {mensaje && <div className="alert warn">{mensaje}</div>}
      {cambiarUrl ? (
        <label className="campo">
          Dirección de la hoja de Google
          <input id="ninos-url" value={u} onChange={(e) => setU(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" autoComplete="off" spellCheck="false" />
        </label>
      ) : (
        <p className="hint">
          Conectado a la hoja de niños.{' '}
          <button type="button" className="btn-link" onClick={() => setCambiarUrl(true)}>
            Cambiar dirección
          </button>
        </p>
      )}
      <label className="campo">
        Clave
        <input id="ninos-clave" type="password" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="current-password" autoFocus={!cambiarUrl} />
      </label>
      {error && (
        <p className="err-txt" role="alert">
          {error}
        </p>
      )}
      <button className="dl" disabled={cargando}>
        {cargando && <span className="spin" aria-hidden="true" />}
        Entrar
      </button>
    </form>
  );
}

function Ficha({ inicial, casas, onGuardar, onCancelar, onBorrar, guardando }) {
  const [n, setN] = useState(inicial);
  const [error, setError] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const set = (k) => (e) => setN({ ...n, [k]: e.target.value });
  const e = edad(n.nacimiento);
  return (
    <form
      className="ficha"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (!n.nombre.trim()) return setError('Escribe el nombre.');
        if (n.nacimiento && !leerFecha(n.nacimiento)) return setError('Revisa la fecha de cumpleaños.');
        setError('');
        onGuardar({ ...n, nombre: n.nombre.trim() });
      }}
    >
      <h4>{inicial.id ? `Editar a ${inicial.nombre}` : 'Agregar niño'}</h4>
      <div className="ficha-grid">
        <label className="campo span2">
          Nombre y apellido
          <input id="f-nombre" value={n.nombre} onChange={set('nombre')} autoFocus />
        </label>
        <label className="campo">
          Casa
          <input id="f-casa" list="lista-casas" value={n.casa} onChange={set('casa')} placeholder="Casa 1" />
          <datalist id="lista-casas">
            {casas.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label className="campo">
          Cumpleaños {e != null && <span className="hint">· {e} años</span>}
          <input id="f-nac" type="date" value={n.nacimiento} onChange={set('nacimiento')} max={new Date().toISOString().slice(0, 10)} />
        </label>
        <label className="campo">
          Talla de ropa
          <input id="f-ropa" value={n.tallaRopa} onChange={set('tallaRopa')} placeholder="Ej. 10 o M" />
        </label>
        <label className="campo">
          Talla de zapatos
          <input id="f-zap" value={n.tallaZapatos} onChange={set('tallaZapatos')} placeholder="Ej. 32" />
        </label>
        <label className="campo span2">
          Notas
          <input id="f-notas" value={n.notas} onChange={set('notas')} placeholder="Opcional" />
        </label>
      </div>
      {error && <p className="err-txt">{error}</p>}
      <div className="row-actions">
        <button className="mini solid" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" className="mini" onClick={onCancelar}>
          Cancelar
        </button>
        {inicial.id &&
          (confirmar ? (
            <>
              <span className="hint">¿Quitar a {inicial.nombre} de la lista?</span>
              <button type="button" className="mini danger" onClick={() => onBorrar(inicial)}>
                Sí, quitar
              </button>
              <button type="button" className="mini" onClick={() => setConfirmar(false)}>
                No
              </button>
            </>
          ) : (
            <button type="button" className="mini danger" style={{ marginLeft: 'auto' }} onClick={() => setConfirmar(true)}>
              Quitar de la lista
            </button>
          ))}
      </div>
    </form>
  );
}

function Importar({ existentes, onImportar, onCerrar, importando }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [saltar, setSaltar] = useState(true);
  const input = useRef(null);
  const nombres = new Set(existentes.map((n) => fold(n.nombre).trim()));
  const lista = datos ? datos.ninos.filter((n) => !(saltar && nombres.has(fold(n.nombre).trim()))) : [];
  const repetidos = datos ? datos.ninos.length - datos.ninos.filter((n) => !nombres.has(fold(n.nombre).trim())).length : 0;
  return (
    <div className="ficha">
      <h4>Importar niños desde Excel</h4>
      <p className="hint">El Excel necesita una columna “Nombre”. Si tiene columnas de casa, fecha de nacimiento, talla de ropa o talla de zapatos, también se traen.</p>
      <div className="row-actions">
        <button type="button" className="mini solid" onClick={() => input.current && input.current.click()}>
          Elegir Excel
        </button>
        <button type="button" className="mini" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
      <input
        ref={input}
        type="file"
        hidden
        accept=".xlsx"
        onChange={async (e) => {
          const f = e.target.files && e.target.files[0];
          e.target.value = '';
          if (!f) return;
          setError('');
          setDatos(null);
          if (extension(f.name) !== 'xlsx') return setError('Elige un Excel .xlsx.');
          try {
            setDatos(await leerListaExcel(await leerBytes(f), JSZip));
          } catch (err) {
            setError(err instanceof NinosError ? err.message : 'No pude leer ese Excel.');
          }
        }}
      />
      {error && <p className="err-txt">{error}</p>}
      {datos && (
        <>
          <p className="hint">
            Encontré {datos.ninos.length} niños en la hoja “{datos.hoja}”.
            {repetidos > 0 && ` ${repetidos} ya están en la lista.`}
          </p>
          {repetidos > 0 && (
            <label className="check">
              <input type="checkbox" checked={saltar} onChange={(e) => setSaltar(e.target.checked)} />
              <span>No traer los que ya están en la lista</span>
            </label>
          )}
          <div className="tbox">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Casa</th>
                  <th>Cumpleaños</th>
                  <th>Ropa</th>
                  <th>Zapatos</th>
                </tr>
              </thead>
              <tbody>
                {lista.slice(0, 200).map((n, i) => (
                  <tr key={i}>
                    <td>{n.nombre}</td>
                    <td>{n.casa}</td>
                    <td>{n.nacimiento ? cumpleCorto(n.nacimiento) + ' ' + n.nacimiento.slice(0, 4) : n.fechaDudosa ? <span className="err-txt">No entendí “{n.fechaDudosa}”</span> : ''}</td>
                    <td>{n.tallaRopa}</td>
                    <td>{n.tallaZapatos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row-actions">
            <button type="button" className="mini solid" disabled={!lista.length || importando} onClick={() => onImportar(lista)}>
              {importando ? 'Importando…' : `Importar ${lista.length} ${lista.length === 1 ? 'niño' : 'niños'}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Ninos() {
  const [con, setCon] = useState(leerConexion);
  const [ninos, setNinos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [mensajeClave, setMensajeClave] = useState('');
  const [buscar, setBuscar] = useState('');
  const [casa, setCasa] = useState('');
  const [orden, setOrden] = useState('casa');
  const [ficha, setFicha] = useState(null);
  const [importar, setImportar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const hoy = new Date();

  const salirPorSesion = (err) => {
    borrarSesion();
    setCon((c) => ({ ...c, token: '', expira: 0 }));
    setNinos(null);
    setMensajeClave(err.message);
  };

  const cargar = async (c = con) => {
    setCargando(true);
    setError('');
    try {
      const r = await llamar(c.url, { accion: 'listar', token: c.token });
      setNinos(Array.isArray(r.ninos) ? r.ninos.map(normal) : []);
    } catch (err) {
      if (err.codigo === 'sesion') salirPorSesion(err);
      else setError(err.message || 'No pude traer la lista.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (con.url && con.token && ninos === null && !cargando) cargar();
  }, [con.url, con.token]);

  const accion = async (datos, despues) => {
    setGuardando(true);
    setError('');
    try {
      const r = await llamar(con.url, { ...datos, token: con.token });
      await despues(r);
    } catch (err) {
      if (err.codigo === 'sesion') salirPorSesion(err);
      else setError(err.message || 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const casas = useMemo(() => {
    const s = new Set(CASAS);
    (ninos || []).forEach((n) => n.casa && s.add(n.casa));
    return Array.from(s);
  }, [ninos]);

  const filtrados = useMemo(() => {
    const q = fold(buscar).trim();
    const l = (ninos || []).filter((n) => (!casa || n.casa === casa) && (!q || fold(`${n.nombre} ${n.casa} ${n.notas}`).includes(q)));
    const idxCasa = (c) => {
      const i = casas.indexOf(c);
      return i < 0 ? 999 : i;
    };
    const por = {
      casa: (a, b) => idxCasa(a.casa) - idxCasa(b.casa) || a.nombre.localeCompare(b.nombre, 'es'),
      nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
      edad: (a, b) => (edad(b.nacimiento) ?? -1) - (edad(a.nacimiento) ?? -1) || a.nombre.localeCompare(b.nombre, 'es'),
      cumple: (a, b) => (proximoCumple(a.nacimiento)?.dias ?? 999) - (proximoCumple(b.nacimiento)?.dias ?? 999)
    }[orden];
    return l.sort(por);
  }, [ninos, buscar, casa, orden, casas]);

  const proximos = useMemo(
    () =>
      (ninos || [])
        .map((n) => ({ n, p: proximoCumple(n.nacimiento) }))
        .filter((x) => x.p && x.p.dias <= 45)
        .sort((a, b) => a.p.dias - b.p.dias)
        .slice(0, 8),
    [ninos]
  );
  const esteMes = (ninos || []).filter((n) => {
    const m = String(n.nacimiento || '').slice(5, 7);
    return m && +m === hoy.getMonth() + 1;
  }).length;

  if (!con.url || !con.token)
    return (
      <section className="wrap" aria-labelledby="t-ninos">
        <div className="intro">
          <h2 id="t-ninos">Niños de la Hacienda</h2>
          <p>Cumpleaños, edades y tallas de ropa y zapatos de cada niño.</p>
        </div>
        <Entrar
          url={con.url}
          mensaje={mensajeClave}
          onEntrar={(c) => {
            setMensajeClave('');
            setNinos(null);
            setCon(c);
          }}
        />
      </section>
    );

  return (
    <section className="wrap" aria-labelledby="t-ninos">
      <div className="intro">
        <h2 id="t-ninos">Niños de la Hacienda</h2>
        <p>Cumpleaños, edades y tallas de ropa y zapatos de cada niño. Los cambios se guardan en la hoja de Google y todos los ven al instante.</p>
      </div>

      <div className="result">
        <div className="stats">
          <div className="stat">
            <b>{ninos ? ninos.length : '–'}</b>
            <span>Niños</span>
          </div>
          <div className="stat">
            <b>{ninos ? esteMes : '–'}</b>
            <span>Cumplen este mes</span>
          </div>
        </div>
        <div className="btns">
          <button className="dl ghost" onClick={() => cargar()} disabled={cargando}>
            {cargando ? <span className="spin" aria-hidden="true" /> : null}
            Actualizar
          </button>
          <button
            className="dl ghost"
            onClick={() => {
              setFicha(null);
              setImportar(true);
            }}
          >
            Importar Excel
          </button>
          <button
            className="dl"
            onClick={() => {
              setImportar(false);
              setFicha({ ...VACIO, casa: casa || '' });
            }}
          >
            Agregar niño
          </button>
        </div>
      </div>

      {error && (
        <div className="alert bad" role="alert">
          {error}
        </div>
      )}
      {aviso && <div className="alert ok-msg">{aviso}</div>}

      {ficha && (
        <Ficha
          key={ficha.id || 'nuevo'}
          inicial={ficha}
          casas={casas}
          guardando={guardando}
          onCancelar={() => setFicha(null)}
          onGuardar={(n) =>
            accion({ accion: 'guardar', nino: n }, async (r) => {
              const nino = normal(r.nino);
              setNinos((l) => {
                const lista = l || [];
                return lista.some((x) => x.id === nino.id) ? lista.map((x) => (x.id === nino.id ? nino : x)) : [...lista, nino];
              });
              setFicha(null);
              setAviso(`Guardado: ${r.nino.nombre}.`);
            })
          }
          onBorrar={(n) =>
            accion({ accion: 'borrar', id: n.id }, async () => {
              setNinos((l) => (l || []).filter((x) => x.id !== n.id));
              setFicha(null);
              setAviso(`${n.nombre} ya no está en la lista.`);
            })
          }
        />
      )}

      {importar && (
        <Importar
          existentes={ninos || []}
          importando={guardando}
          onCerrar={() => setImportar(false)}
          onImportar={(lista) =>
            accion({ accion: 'importar', ninos: lista.map(({ fechaDudosa, ...n }) => n) }, async (r) => {
              setImportar(false);
              setAviso(`Listo: se importaron ${r.agregados} niños.`);
              await cargar();
            })
          }
        />
      )}

      {ninos && proximos.length > 0 && (
        <div className="panel">
          <h3>Próximos cumpleaños</h3>
          <div className="bdays">
            {proximos.map(({ n, p }) => (
              <div className={`bday ${p.dias === 0 ? 'hoy' : ''}`} key={n.id}>
                <b>{n.nombre}</b>
                <span>
                  {cumpleCorto(n.nacimiento)} · cumple {p.cumple}
                </span>
                <small>{p.dias === 0 ? '¡Hoy!' : p.dias === 1 ? 'Mañana' : `En ${p.dias} días`}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {ninos === null && cargando && (
        <div className="empty">
          <span className="spin" aria-hidden="true" /> Trayendo la lista…
        </div>
      )}

      {ninos && (
        <div className="panel">
          <div className="filtros">
            <input id="ninos-buscar" type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por nombre" aria-label="Buscar niño" />
            <select id="ninos-casa" value={casa} onChange={(e) => setCasa(e.target.value)} aria-label="Filtrar por casa">
              <option value="">Todas las casas</option>
              {casas.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select id="ninos-orden" value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Ordenar">
              <option value="casa">Ordenar por casa</option>
              <option value="nombre">Ordenar por nombre</option>
              <option value="edad">Ordenar por edad</option>
              <option value="cumple">Próximo cumpleaños primero</option>
            </select>
          </div>
          {ninos.length === 0 ? (
            <div className="empty">
              <b>Todavía no hay niños en la lista</b>
              Agrégalos uno por uno o importa un Excel.
            </div>
          ) : (
            <div className="tbox">
              <table className="ninos">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Casa</th>
                    <th>Cumpleaños</th>
                    <th className="n">Edad</th>
                    <th>Ropa</th>
                    <th>Zapatos</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((n) => {
                    const e = edad(n.nacimiento);
                    const p = proximoCumple(n.nacimiento);
                    return (
                      <tr key={n.id}>
                        <td>
                          <b>{n.nombre}</b>
                          {n.notas && <div className="hint">{n.notas}</div>}
                        </td>
                        <td>{n.casa}</td>
                        <td>
                          {cumpleCorto(n.nacimiento) || (n.nacimiento ? <span className="err-txt">{n.nacimiento}</span> : <span className="hint">—</span>)}
                          {p && p.dias <= 30 && <span className="tag">{p.dias === 0 ? 'hoy' : `en ${p.dias} d`}</span>}
                        </td>
                        <td className="n">{e ?? '—'}</td>
                        <td>{n.tallaRopa || <span className="hint">—</span>}</td>
                        <td>{n.tallaZapatos || <span className="hint">—</span>}</td>
                        <td>
                          <button
                            className="mini"
                            onClick={() => {
                              setImportar(false);
                              setFicha({ ...VACIO, ...n, nacimiento: leerFecha(n.nacimiento) || '' });
                            }}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtrados.length === 0 && (
                    <tr>
                      <td colSpan={7} className="hint">
                        Nadie coincide con la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="row-actions">
        <button
          className="mini"
          onClick={() => {
            borrarSesion();
            setNinos(null);
            setCon((c) => ({ ...c, token: '', expira: 0 }));
            setMensajeClave('');
          }}
        >
          Salir en este dispositivo
        </button>
        <button
          className="mini"
          onClick={() => {
            borrarUrl();
            setNinos(null);
            setCon({ url: '', token: '', expira: 0 });
          }}
        >
          Cambiar hoja de Google
        </button>
        <span className="hint">Clave recordada hasta el {new Date(con.expira).toLocaleDateString('es-EC', { day: 'numeric', month: 'long' })}.</span>
      </div>
    </section>
  );
}
