import { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { CASAS } from '../lib/personal.js';
import { fold } from '../lib/text.js';
import { leerBytes, extension } from '../lib/archivos.js';
import { esVieja } from '../lib/tallas.js';
import Foto from '../components/ninos/Foto.jsx';
import Tallas from '../components/ninos/Tallas.jsx';
import Documentos from '../components/ninos/Documentos.jsx';
import CasasEditor from '../components/ninos/Casas.jsx';
import Equipos from '../components/ninos/Equipos.jsx';
import { sexoDe } from '../lib/equipos.js';
import { NinosError, leerConexion, guardarUrl, guardarSesion, borrarSesion, borrarUrl, llamar, urlValida, edad, proximoCumple, cumpleCorto, leerFecha, leerListaExcel } from '../lib/ninos.js';

const normal = (n) => ({ ...n, nacimiento: leerFecha(n.nacimiento) || String(n.nacimiento || '') });

const VACIO = { id: '', nombre: '', casa: '', nacimiento: '', tallaRopa: '', tallaZapatos: '', notas: '', descripcion: '', colorFavorito: '', pasatiempos: '', deseos: '', sexo: '' };
const iniciales = (nombre) => String(nombre || '').split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

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

function Ficha({ inicial, casas, onGuardar, onCancelar, onBorrar, guardando, foto, puedeFoto, puedeSexo, onFoto, onQuitarFoto }) {
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
      <Foto url={foto} iniciales={iniciales(n.nombre)} puede={puedeFoto} guardadoAntes={!!inicial.id} onSubir={onFoto} onQuitar={onQuitarFoto} />
      <div className="ficha-grid">
        <label className="campo span2">
          Nombre y apellido
          <input id="f-nombre" value={n.nombre} onChange={set('nombre')} autoFocus />
        </label>
        <label className="campo">
          Es
          <select id="f-sexo" value={n.sexo || ''} onChange={set('sexo')} disabled={!puedeSexo} title={puedeSexo ? '' : 'Actualiza el código de Google para guardar esto'}>
            <option value="">Sin marcar</option>
            <option value="F">Niña</option>
            <option value="M">Niño</option>
          </select>
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
        <label className="campo span4">
          Notas
          <input id="f-notas" value={n.notas} onChange={set('notas')} placeholder="Opcional" />
        </label>
      </div>
      <details className="sub" open={!!(n.descripcion || n.colorFavorito || n.pasatiempos || n.deseos)}>
        <summary>Para las hojas de regalos</summary>
        <div className="ficha-grid">
          <label className="campo span4">
            Sobre el niño
            <textarea id="f-desc" rows={3} value={n.descripcion} onChange={set('descripcion')} placeholder="Ej. Pablo es un niño alegre que disfruta jugar con sus amigos…" />
          </label>
          <label className="campo">
            Color favorito
            <input id="f-color" value={n.colorFavorito} onChange={set('colorFavorito')} />
          </label>
          <label className="campo">
            Pasatiempos
            <input id="f-hobby" value={n.pasatiempos} onChange={set('pasatiempos')} />
          </label>
          <label className="campo span2">
            Deseos
            <input id="f-deseos" value={n.deseos} onChange={set('deseos')} placeholder="Ej. Pelota, audífonos, libro de dinosaurios" />
          </label>
        </div>
      </details>
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
  const [panel, setPanel] = useState('');
  const [sexoF, setSexoF] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [version, setVersion] = useState(2);
  const [casasData, setCasasData] = useState([]);
  const [fotos, setFotos] = useState({});
  const fotosRef = useRef({});
  const conRef = useRef(con);
  conRef.current = con;
  const abrir = (p) => {
    setPanel(p);
    if (p !== 'ficha') setFicha(null);
  };
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
      setVersion(Number(r.version) || 1);
      setCasasData(Array.isArray(r.casas) ? r.casas : []);
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
      return true;
    } catch (err) {
      if (err.message === 'Acción desconocida.') err.message = 'Esta función necesita el código de Google nuevo. Actualiza Code.gs en Apps Script.';
      if (err.codigo === 'sesion') salirPorSesion(err);
      else setError(err.message || 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const asegurarFotos = async (ids) => {
    const faltan = Array.from(new Set(ids)).filter((id) => !(id in fotosRef.current));
    for (let i = 0; i < faltan.length; i += 20) {
      const parte = faltan.slice(i, i + 20);
      const c = conRef.current;
      const r = await llamar(c.url, { accion: 'fotos', ids: parte, token: c.token });
      const nuevo = { ...fotosRef.current };
      for (const id of parte) nuevo[id] = (r.fotos && r.fotos[id]) || '';
      fotosRef.current = nuevo;
      setFotos(nuevo);
    }
    return fotosRef.current;
  };

  useEffect(() => {
    if (!ninos || version < 2) return;
    const ids = [...ninos.filter((n) => n.conFoto).map((n) => n.id), ...casasData.filter((c) => c.conFoto).map((c) => `casa:${c.casa}`)];
    if (ids.some((id) => !(id in fotosRef.current)))
      asegurarFotos(ids).catch((err) => {
        if (err.codigo === 'sesion') salirPorSesion(err);
      });
  }, [ninos, casasData, version]);

  const ponerFoto = (id, data) => {
    const nuevo = { ...fotosRef.current, [id]: data };
    fotosRef.current = nuevo;
    setFotos(nuevo);
  };

  const subirFoto = (id, data) =>
    new Promise((ok, mal) => {
      accion({ accion: 'guardarFoto', id, foto: data }, async () => {
        ponerFoto(id, data);
        if (id.startsWith('casa:')) setCasasData((l) => l.map((c) => (`casa:${c.casa}` === id ? { ...c, conFoto: true } : c)));
        else setNinos((l) => (l || []).map((n) => (n.id === id ? { ...n, conFoto: true } : n)));
      }).then((bien) => (bien ? ok() : mal(new Error('No se pudo guardar la foto.'))));
    });

  const quitarFoto = (id) =>
    accion({ accion: 'borrarFoto', id }, async () => {
      ponerFoto(id, '');
      if (id.startsWith('casa:')) setCasasData((l) => l.map((c) => (`casa:${c.casa}` === id ? { ...c, conFoto: false } : c)));
      else setNinos((l) => (l || []).map((n) => (n.id === id ? { ...n, conFoto: false } : n)));
    });

  const casas = useMemo(() => {
    const s = new Set(CASAS);
    (ninos || []).forEach((n) => n.casa && s.add(n.casa));
    return Array.from(s);
  }, [ninos]);

  const filtrados = useMemo(() => {
    const q = fold(buscar).trim();
    const l = (ninos || []).filter((n) => (!casa || n.casa === casa) && (!sexoF || sexoDe(n) === sexoF) && (!q || fold(`${n.nombre} ${n.casa} ${n.notas}`).includes(q)));
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
  }, [ninos, buscar, casa, sexoF, orden, casas]);

  const textoFiltro = [casa, sexoF === 'F' ? 'solo niñas' : sexoF === 'M' ? 'solo niños' : '', buscar.trim() && `búsqueda “${buscar.trim()}”`].filter(Boolean).join(', ');

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
          <button className="dl ghost" onClick={() => abrir('importar')}>
            Importar Excel
          </button>
          <button className="dl ghost" disabled={!ninos || !ninos.length} onClick={() => abrir('tallas')}>
            Tallas
          </button>
          <button className="dl ghost" disabled={!ninos || !ninos.length} onClick={() => abrir('equipos')}>
            Equipos
          </button>
          <button className="dl ghost" disabled={!ninos || !ninos.length} onClick={() => abrir('docs')}>
            Documentos
          </button>
          <button className="dl ghost" onClick={() => abrir('casas')}>
            Casas
          </button>
          <button
            className="dl"
            onClick={() => {
              setPanel('ficha');
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
      {ninos && version < 3 && (
        <div className="alert warn">
          <b>Falta actualizar el código de Google</b>
          <span>
            La lista funciona, pero para {version < 2 ? 'fotos, casas, hojas de regalos, tallas con fecha y marcar niño o niña' : 'marcar si es niño o niña'} hay que pegar el Code.gs nuevo en Apps Script y crear una nueva versión de la implementación.
          </span>
        </div>
      )}

      {panel === 'ficha' && ficha && (
        <Ficha
          key={ficha.id || 'nuevo'}
          inicial={ficha}
          casas={casas}
          guardando={guardando}
          foto={ficha.id ? fotos[ficha.id] : ''}
          puedeFoto={version >= 2}
          puedeSexo={version >= 3}
          onFoto={(data) => subirFoto(ficha.id, data)}
          onQuitarFoto={() => quitarFoto(ficha.id)}
          onCancelar={() => setFicha(null)}
          onGuardar={(n) =>
            accion({ accion: 'guardar', nino: n }, async (r) => {
              const nino = normal(r.nino);
              setNinos((l) => {
                const lista = l || [];
                return lista.some((x) => x.id === nino.id) ? lista.map((x) => (x.id === nino.id ? nino : x)) : [...lista, nino];
              });
              const seguir = !ficha.id && version >= 2;
              setFicha(seguir ? { ...VACIO, ...nino } : null);
              setAviso(seguir ? `Guardado: ${r.nino.nombre}. Ya puedes agregarle la foto.` : `Guardado: ${r.nino.nombre}.`);
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

      {panel === 'importar' && (
        <Importar
          existentes={ninos || []}
          importando={guardando}
          onCerrar={() => setPanel('')}
          onImportar={(lista) =>
            accion({ accion: 'importar', ninos: lista.map(({ fechaDudosa, ...n }) => n) }, async (r) => {
              setPanel('');
              setAviso(`Listo: se importaron ${r.agregados} niños.`);
              await cargar();
            })
          }
        />
      )}

      {panel === 'docs' && ninos && (
        <Documentos
          lista={filtrados}
          todos={ninos}
          casa={casa}
          filtro={textoFiltro}
          casasData={casasData}
          version={version}
          asegurarFotos={asegurarFotos}
          onCerrar={() => setPanel('')}
          onIrCasas={() => abrir('casas')}
        />
      )}

      {panel === 'equipos' && ninos && (
        <Equipos
          lista={filtrados}
          casas={casas}
          filtro={textoFiltro}
          version={version}
          guardando={guardando}
          onCerrar={() => setPanel('')}
          onMarcarSexos={(lista) =>
            accion({ accion: 'sexos', lista }, async () => {
              const m = new Map(lista.map((x) => [x.id, x.sexo]));
              setNinos((l) => (l || []).map((n) => (m.has(n.id) ? { ...n, sexo: m.get(n.id) } : n)));
              setAviso(`Guardado: ${lista.length} ${lista.length === 1 ? 'niño marcado' : 'niños marcados'}.`);
            })
          }
        />
      )}

      {panel === 'tallas' && ninos && (
        <Tallas
          lista={filtrados}
          filtro={textoFiltro}
          onCerrar={() => setPanel('')}
          onEditar={(n) => {
            setPanel('ficha');
            setFicha({ ...VACIO, ...n, nacimiento: leerFecha(n.nacimiento) || '' });
          }}
        />
      )}

      {panel === 'casas' && (
        <CasasEditor
          casas={casas}
          casasData={casasData}
          fotos={fotos}
          puede={version >= 2}
          guardando={guardando}
          onCerrar={() => setPanel('')}
          onGuardar={(c) =>
            accion({ accion: 'guardarCasa', casa: c }, async (r) => {
              setCasasData((l) => (l.some((x) => x.casa === r.casa.casa) ? l.map((x) => (x.casa === r.casa.casa ? { ...x, ...r.casa } : x)) : [...l, { ...r.casa, conFoto: false }]));
              setAviso(`Guardado: ${r.casa.casa}.`);
            })
          }
          onFoto={(c, data) => subirFoto(`casa:${c}`, data)}
          onQuitarFoto={(c) => quitarFoto(`casa:${c}`)}
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
            <select id="ninos-sexo" value={sexoF} onChange={(e) => setSexoF(e.target.value)} aria-label="Niños o niñas">
              <option value="">Niños y niñas</option>
              <option value="F">Solo niñas</option>
              <option value="M">Solo niños</option>
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
                          <div className="quien">
                            <span className="avatar">{fotos[n.id] ? <img src={fotos[n.id]} alt="" /> : iniciales(n.nombre)}</span>
                            <span>
                              <b>{n.nombre}</b>
                              {n.notas && <div className="hint">{n.notas}</div>}
                            </span>
                          </div>
                        </td>
                        <td>{n.casa}</td>
                        <td>
                          {cumpleCorto(n.nacimiento) || (n.nacimiento ? <span className="err-txt">{n.nacimiento}</span> : <span className="hint">—</span>)}
                          {p && p.dias <= 30 && <span className="tag">{p.dias === 0 ? 'hoy' : `en ${p.dias} d`}</span>}
                        </td>
                        <td className="n">{e ?? '—'}</td>
                        <td>
                          {n.tallaRopa || <span className="hint">—</span>}
                          {esVieja(n) && <span className="tag vieja" title="Las tallas no se actualizan hace más de 6 meses">revisar</span>}
                        </td>
                        <td>{n.tallaZapatos || <span className="hint">—</span>}</td>
                        <td>
                          <button
                            className="mini"
                            onClick={() => {
                              setPanel('ficha');
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
