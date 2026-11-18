import { useEffect, useMemo, useRef, useState } from 'react';
import Ventana from '../Ventana.jsx';
import { CASAS } from '../../lib/personal.js';
import { fold, MESES } from '../../lib/text.js';
import { cargarCaras, detectar, referenciasDe, sinCaraEnDirectorio } from '../../lib/caras.js';
import { emparejar, ninosDeFoto, carasParaAprender } from '../../lib/emparejar.js';
import { prepararFoto } from '../../lib/fotosAlbum.js';

const MAX_LOTE = 60;
const fechaBonita = (f) => {
  const m = String(f || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${+m[3]} de ${MESES[+m[2] - 1]} de ${m[1]}` : '';
};

function ordenarPorCasa(ninos) {
  const grupos = new Map();
  for (const c of [...CASAS, '']) grupos.set(c, []);
  for (const n of ninos) {
    const c = CASAS.includes(n.casa) ? n.casa : '';
    grupos.get(c).push(n);
  }
  for (const l of grupos.values()) l.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return [...grupos].filter(([, l]) => l.length);
}

function ElegirNino({ ninos, titulo, actual, enFoto, onElegir, onIgnorar, onQuitar, onCerrar, multiple, inicial, onListo }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(() => new Set(inicial || []));
  const lista = ninos.filter((n) => !q || fold(n.nombre).includes(fold(q)));
  return (
    <>
      <h3>{titulo}</h3>
      <input className="al-buscar" type="search" placeholder="Buscar por nombre" value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Buscar niño" />
      <div className="al-elegir">
        {ordenarPorCasa(lista).map(([casa, l]) => (
          <div key={casa || 'sin'} className="al-grupo">
            <h4>{casa || 'Sin casa'}</h4>
            <div className="al-opciones">
              {l.map((n) =>
                multiple ? (
                  <label key={n.id} className={`al-op${sel.has(n.id) ? ' on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={sel.has(n.id)}
                      onChange={() =>
                        setSel((s) => {
                          const x = new Set(s);
                          x.has(n.id) ? x.delete(n.id) : x.add(n.id);
                          return x;
                        })
                      }
                    />
                    {n.nombre}
                  </label>
                ) : (
                  <button key={n.id} type="button" className={`al-op${actual === n.id ? ' on' : ''}${enFoto && enFoto.has(n.id) && actual !== n.id ? ' ya' : ''}`} onClick={() => onElegir(n.id)}>
                    {n.nombre}
                    {enFoto && enFoto.has(n.id) && actual !== n.id && <span className="hint"> · ya está en la foto</span>}
                  </button>
                )
              )}
            </div>
          </div>
        ))}
        {!lista.length && <p className="hint">No hay ningún niño con ese nombre.</p>}
      </div>
      <div className="row-actions">
        {multiple && (
          <button type="button" className="mini solid" onClick={() => onListo([...sel])}>
            Listo ({sel.size})
          </button>
        )}
        {onIgnorar && (
          <button type="button" className="mini" onClick={onIgnorar}>
            No es un niño de la casa
          </button>
        )}
        {onQuitar && (
          <button type="button" className="mini" onClick={onQuitar}>
            Quitar
          </button>
        )}
        <button type="button" className="mini" onClick={onCerrar}>
          Cancelar
        </button>
      </div>
    </>
  );
}

function Carpeta({ carpeta, api, onCambio }) {
  const [abierto, setAbierto] = useState(!carpeta);
  const [enlace, setEnlace] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  if (carpeta && !abierto)
    return (
      <p className="al-carpeta">
        📁 Las fotos se guardan en la carpeta{' '}
        <a href={carpeta.url} target="_blank" rel="noreferrer">
          {carpeta.nombre}
        </a>{' '}
        de Google Drive.{' '}
        <button type="button" className="btn-link" onClick={() => setAbierto(true)}>
          Cambiar carpeta
        </button>
      </p>
    );
  return (
    <form
      className="al-config"
      onSubmit={async (e) => {
        e.preventDefault();
        setGuardando(true);
        setError('');
        try {
          const r = await api({ accion: 'albumCarpeta', enlace });
          onCambio(r.carpeta);
          setAbierto(false);
          setEnlace('');
        } catch (err) {
          setError(err.message);
        } finally {
          setGuardando(false);
        }
      }}
    >
      <h4>¿En qué carpeta de Google Drive guardo las fotos?</h4>
      <ol>
        <li>Abre Google Drive y entra a la carpeta compartida donde quieres las fotos.</li>
        <li>Copia la dirección de arriba (la que tiene “/folders/”).</li>
        <li>Pégala aquí. Adentro se van a crear las carpetas Casa 1, Casa 2… con una carpeta por niño.</li>
      </ol>
      <div className="al-fila">
        <input id="al-enlace" type="url" required placeholder="https://drive.google.com/drive/folders/…" value={enlace} onChange={(e) => setEnlace(e.target.value)} aria-label="Enlace de la carpeta de Drive" />
        <button className="dl" disabled={guardando || !enlace.trim()}>
          {guardando ? 'Revisando…' : 'Usar esta carpeta'}
        </button>
        {carpeta && (
          <button type="button" className="dl ghost" onClick={() => setAbierto(false)}>
            Cancelar
          </button>
        )}
      </div>
      <p className="hint">La cuenta de Google donde está el código de la app tiene que poder editar esa carpeta. Compártela solo con el personal: quien entre a la carpeta ve las fotos de todos los niños.</p>
      {error && <p className="al-error">{error}</p>}
    </form>
  );
}

function FotoRevisar({ f, porId, onCara, onAgregar, onQuitarExtra, onOmitir }) {
  const ids = ninosDeFoto(f);
  return (
    <article className={`al-rev${f.omitir ? ' omitida' : ''}`}>
      <div className="al-img">
        <img src={f.prep.foto} alt={`Foto ${f.prep.nombre}`} />
        {!f.omitir &&
          f.caras.map((c, i) => (
            <button
              key={i}
              type="button"
              className={`al-caja ${c.ignorar ? 'ign' : c.id ? c.nivel : 'nadie'}`}
              style={{ left: `${c.caja.x * 100}%`, top: `${c.caja.y * 100}%`, width: `${c.caja.w * 100}%`, height: `${c.caja.h * 100}%` }}
              onClick={() => onCara(i)}
              aria-label={c.id ? `Cara de ${porId.get(c.id)?.nombre}. Cambiar` : '¿Quién es? Elegir'}
            />
          ))}
      </div>
      <div className="al-info">
        <p className="hint">
          {fechaBonita(f.prep.fecha)}
          {!f.prep.fechaDeCamara && ' (fecha del archivo)'}
        </p>
        {!f.omitir && (
          <div className="al-chips">
            {f.caras.map((c, i) =>
              c.ignorar ? null : (
                <button key={i} type="button" className={`al-chip ${c.id ? c.nivel : 'nadie'}`} onClick={() => onCara(i)}>
                  {c.id ? (c.nivel === 'quizas' ? `¿${porId.get(c.id)?.nombre}?` : porId.get(c.id)?.nombre) : '¿Quién es?'}
                </button>
              )
            )}
            {(f.extra || []).map((id) => (
              <span key={id} className="al-chip seguro">
                {porId.get(id)?.nombre}
                <button type="button" aria-label={`Quitar a ${porId.get(id)?.nombre}`} onClick={() => onQuitarExtra(id)}>
                  ×
                </button>
              </span>
            ))}
            <button type="button" className="al-chip mas" onClick={onAgregar}>
              + Agregar niño
            </button>
          </div>
        )}
        <p className={`al-destino${!ids.length && !f.omitir ? ' sin' : ''}`}>
          {f.omitir ? 'No se va a subir.' : ids.length ? `Va a la carpeta de ${ids.map((id) => porId.get(id)?.nombre).join(', ')}.` : 'No reconocí a ningún niño: va a “Sin ordenar”.'}
        </p>
        <label className="al-omitir">
          <input type="checkbox" checked={!!f.omitir} onChange={(e) => onOmitir(e.target.checked)} /> No subir esta foto
        </label>
      </div>
    </article>
  );
}

function Subir({ ninos, fotosDir, asegurarFotos, api, carpeta, onGuardado }) {
  const [lote, setLote] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [elegir, setElegir] = useState(null);
  const [subiendo, setSubiendo] = useState(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [sinRef, setSinRef] = useState(null);
  const refs = useRef(null);
  const input = useRef(null);
  const porId = useMemo(() => new Map(ninos.map((n) => [n.id, n])), [ninos]);

  const cambiar = (key, fn) => setLote((l) => l.map((f) => (f.key === key ? fn(f) : f)));

  const procesar = async (archivos) => {
    setError('');
    const imgs = archivos.filter((a) => /^image\//.test(a.type) || /\.(jpe?g|png|heic|heif|webp)$/i.test(a.name));
    if (!imgs.length) return setError('Elige fotos (JPG o PNG).');
    const tomar = imgs.slice(0, MAX_LOTE);
    const nuevos = tomar.map((a, i) => ({ key: `${Date.now()}-${i}-${a.name}`, archivo: a, estado: 'esperando', caras: [], extra: [] }));
    setLote((l) => [...l, ...nuevos]);
    if (imgs.length > MAX_LOTE) setError(`Elegiste ${imgs.length} fotos. Voy con las primeras ${MAX_LOTE}; sube las demás después de guardar estas.`);
    setTrabajando(true);
    try {
      if (!refs.current) {
        setMsg('Bajando el programa que reconoce caras (solo la primera vez, puede tardar un minuto)…');
        await cargarCaras(setMsg);
        setMsg('Trayendo las fotos del directorio…');
        const conFoto = ninos.filter((n) => n.conFoto).map((n) => n.id);
        const dir = await asegurarFotos(conFoto);
        let aprendidas = {};
        try {
          aprendidas = (await api({ accion: 'caras' })).caras || {};
        } catch {
          aprendidas = {};
        }
        refs.current = await referenciasDe(ninos, dir || fotosDir, aprendidas, setMsg);
        setSinRef({ malas: sinCaraEnDirectorio(ninos).filter((n) => !(aprendidas[n.id] || []).length), sinFoto: ninos.filter((n) => !n.conFoto && !(aprendidas[n.id] || []).length) });
      }
      let i = 0;
      for (const f of nuevos) {
        i++;
        setMsg(`Buscando caras en la foto ${i} de ${nuevos.length}…`);
        cambiar(f.key, (x) => ({ ...x, estado: 'leyendo' }));
        try {
          const prep = await prepararFoto(f.archivo);
          const det = await detectar(prep.canvas);
          const m = emparejar(det, refs.current);
          prep.canvas = null;
          cambiar(f.key, (x) => ({ ...x, estado: 'listo', prep, caras: det.map((c, k) => ({ ...c, ...m[k] })) }));
        } catch (err) {
          cambiar(f.key, (x) => ({ ...x, estado: 'error', error: err.message || 'No se pudo leer.' }));
        }
      }
      setMsg('');
    } catch (err) {
      setError(err.message);
      setMsg('');
      setLote((l) => l.filter((f) => f.estado !== 'esperando'));
    } finally {
      setTrabajando(false);
    }
  };

  const listos = lote.filter((f) => f.estado === 'listo');
  const aSubir = listos.filter((f) => !f.omitir);
  const reconocidos = aSubir.reduce((s, f) => s + ninosDeFoto(f).length, 0);
  const dudas = aSubir.reduce((s, f) => s + f.caras.filter((c) => !c.ignorar && c.id && c.nivel === 'quizas').length, 0);
  const sinNinos = aSubir.filter((f) => !ninosDeFoto(f).length).length;
  const conError = lote.filter((f) => f.estado === 'error');

  const elegirCara = (key, i, id) =>
    cambiar(key, (f) => {
      const caras = f.caras.map((c, k) => (k === i ? { ...c, id, nivel: 'seguro', ignorar: false, corregida: true } : c.id === id ? { ...c, id: '', nivel: 'nadie' } : c));
      return { ...f, caras, extra: (f.extra || []).filter((x) => x !== id) };
    });

  const guardar = async () => {
    setError('');
    const fotos = aSubir;
    const res = { nuevas: 0, repetidas: 0, fallas: [] };
    for (let i = 0; i < fotos.length; i++) {
      const f = fotos[i];
      setSubiendo({ i: i + 1, n: fotos.length });
      let hecho = false;
      for (let intento = 0; intento < 3 && !hecho; intento++) {
        try {
          const r = await api({ accion: 'albumSubir', foto: f.prep.foto, mini: f.prep.mini, fecha: f.prep.fecha, nombre: f.prep.nombre, huella: f.prep.huella, ninos: ninosDeFoto(f) });
          r.repetida ? res.repetidas++ : res.nuevas++;
          hecho = true;
        } catch (err) {
          if (err.codigo === 'sesion' || err.codigo === 'sinCarpeta') {
            setSubiendo(null);
            setError(err.message);
            setLote((l) => l.filter((x) => !fotos.slice(0, i).includes(x)));
            return;
          }
          if (intento === 2) res.fallas.push(f);
        }
      }
    }
    try {
      const aprender = carasParaAprender(fotos.filter((f) => !res.fallas.includes(f)), refs.current || new Map());
      if (aprender.length) {
        await api({ accion: 'guardarCaras', nuevas: aprender });
        refs.current = null;
      }
    } catch {
      refs.current = refs.current || null;
    }
    setSubiendo(null);
    setLote((l) => l.filter((f) => res.fallas.includes(f) || f.estado === 'error'));
    if (res.fallas.length) setError(`No se pudieron subir ${res.fallas.length} fotos. Revisa el internet y dale Guardar otra vez.`);
    onGuardado(res);
  };

  const fotoElegir = elegir && lote.find((f) => f.key === elegir.key);

  return (
    <div className="al-subir">
      {!lote.length && (
        <div
          className={`al-soltar${arrastrando ? ' sobre' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            if (carpeta) procesar([...e.dataTransfer.files]);
          }}
        >
          <p className="al-grande">📷</p>
          <p>
            <b>Elige las fotos</b> o arrástralas aquí.
          </p>
          <p className="hint">Puedes elegir muchas a la vez (hasta {MAX_LOTE}). La app busca las caras aquí mismo, en este aparato, y antes de guardar te deja revisar.</p>
          <button type="button" className="dl" id="al-elegir" disabled={!carpeta} onClick={() => input.current.click()}>
            Elegir fotos
          </button>
          {!carpeta && <p className="hint">Primero elige la carpeta de Drive.</p>}
        </div>
      )}
      <input
        ref={input}
        id="al-archivos"
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const a = [...e.target.files];
          e.target.value = '';
          procesar(a);
        }}
      />
      {msg && (
        <p className="al-msg" role="status">
          <span className="spin" aria-hidden="true" /> {msg}
        </p>
      )}
      {error && <p className="al-error">{error}</p>}
      {sinRef && (sinRef.malas.length > 0 || sinRef.sinFoto.length > 0) && lote.length > 0 && (
        <details className="al-aviso">
          <summary>
            {sinRef.malas.length + sinRef.sinFoto.length} {sinRef.malas.length + sinRef.sinFoto.length === 1 ? 'niño todavía no se puede reconocer solo' : 'niños todavía no se pueden reconocer solos'}
          </summary>
          {sinRef.malas.length > 0 && <p>No se ve bien la cara en la foto del directorio de: {sinRef.malas.map((n) => n.nombre).join(', ')}. Cámbiala por una foto de frente y con buena luz.</p>}
          {sinRef.sinFoto.length > 0 && <p>No tienen foto en el directorio: {sinRef.sinFoto.map((n) => n.nombre).join(', ')}.</p>}
          <p className="hint">Mientras tanto, agrégalos a mano con “+ Agregar niño”. Cuando corriges una cara, la app aprende y la próxima vez los reconoce.</p>
        </details>
      )}

      {listos.length > 0 && (
        <div className="al-resumen" role="status">
          <span>
            <b>{aSubir.length}</b> {aSubir.length === 1 ? 'foto' : 'fotos'}
          </span>
          <span>
            <b>{reconocidos}</b> {reconocidos === 1 ? 'niño reconocido' : 'niños reconocidos'}
          </span>
          {dudas > 0 && (
            <span className="duda">
              <b>{dudas}</b> con “¿?” para revisar
            </span>
          )}
          {sinNinos > 0 && (
            <span>
              <b>{sinNinos}</b> a “Sin ordenar”
            </span>
          )}
        </div>
      )}
      {listos.length > 0 && <p className="hint">Revisa los nombres. Toca una cara o un nombre para corregirlo. Los que dicen “¿Nombre?” son los que la app no está segura.</p>}

      <div className="al-lote">
        {lote.map((f) =>
          f.estado === 'listo' ? (
            <FotoRevisar
              key={f.key}
              f={f}
              porId={porId}
              onCara={(i) => setElegir({ key: f.key, i })}
              onAgregar={() => setElegir({ key: f.key, i: -1 })}
              onQuitarExtra={(id) => cambiar(f.key, (x) => ({ ...x, extra: x.extra.filter((y) => y !== id) }))}
              onOmitir={(v) => cambiar(f.key, (x) => ({ ...x, omitir: v }))}
            />
          ) : f.estado === 'error' ? (
            <article key={f.key} className="al-rev omitida">
              <p>
                <b>{f.archivo.name}</b>: {f.error}
              </p>
              <button type="button" className="mini" onClick={() => setLote((l) => l.filter((x) => x.key !== f.key))}>
                Quitar
              </button>
            </article>
          ) : (
            <article key={f.key} className="al-rev cargando">
              <span className="spin" aria-hidden="true" /> {f.archivo.name}
            </article>
          )
        )}
      </div>

      {lote.length > 0 && (
        <div className="al-barra">
          <button type="button" className="dl" id="al-guardar" disabled={trabajando || !!subiendo || !aSubir.length} onClick={guardar}>
            {subiendo ? `Guardando ${subiendo.i} de ${subiendo.n}…` : `Guardar en Drive (${aSubir.length})`}
          </button>
          <button type="button" className="dl ghost" disabled={trabajando || !!subiendo} onClick={() => input.current.click()}>
            Agregar más fotos
          </button>
          <button type="button" className="dl ghost" disabled={trabajando || !!subiendo} onClick={() => setLote([])}>
            Descartar todo
          </button>
          {conError.length > 0 && <span className="hint">{conError.length} no se pudieron leer.</span>}
        </div>
      )}

      <Ventana abierta={!!fotoElegir} onCerrar={() => setElegir(null)} etiqueta="Elegir niño">
        {fotoElegir && (
          <ElegirNino
            ninos={ninos}
            titulo={elegir.i === -1 ? '¿Quién más sale en la foto?' : '¿Quién es?'}
            actual={elegir.i >= 0 ? fotoElegir.caras[elegir.i].id : ''}
            enFoto={new Set(ninosDeFoto(fotoElegir))}
            onElegir={(id) => {
              if (elegir.i === -1) cambiar(fotoElegir.key, (f) => ({ ...f, extra: ninosDeFoto(f).includes(id) ? f.extra : [...(f.extra || []), id] }));
              else elegirCara(fotoElegir.key, elegir.i, id);
              setElegir(null);
            }}
            onIgnorar={
              elegir.i >= 0
                ? () => {
                    cambiar(fotoElegir.key, (f) => ({ ...f, caras: f.caras.map((c, k) => (k === elegir.i ? { ...c, ignorar: true } : c)) }));
                    setElegir(null);
                  }
                : null
            }
            onQuitar={
              elegir.i >= 0 && fotoElegir.caras[elegir.i].id
                ? () => {
                    cambiar(fotoElegir.key, (f) => ({ ...f, caras: f.caras.map((c, k) => (k === elegir.i ? { ...c, id: '', nivel: 'nadie' } : c)) }));
                    setElegir(null);
                  }
                : null
            }
            onCerrar={() => setElegir(null)}
          />
        )}
      </Ventana>
    </div>
  );
}

function Visor({ foto, ninos, porId, api, onCambio, onBorrada, onCerrar }) {
  const [datos, setDatos] = useState('');
  const [error, setError] = useState('');
  const [editar, setEditar] = useState(false);
  const [borrar, setBorrar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    let vivo = true;
    setDatos('');
    api({ accion: 'albumFoto', id: foto.id })
      .then((r) => vivo && setDatos(r.datos))
      .catch((err) => vivo && setError(err.message));
    return () => {
      vivo = false;
    };
  }, [foto.id]);
  if (editar)
    return (
      <ElegirNino
        ninos={ninos}
        multiple
        inicial={foto.ninos}
        titulo="¿Quién sale en esta foto?"
        onCerrar={() => setEditar(false)}
        onListo={async (ids) => {
          setGuardando(true);
          try {
            const r = await api({ accion: 'albumEtiquetar', id: foto.id, ninos: ids });
            onCambio(r.foto);
            setEditar(false);
          } catch (err) {
            setError(err.message);
            setEditar(false);
          } finally {
            setGuardando(false);
          }
        }}
      />
    );
  return (
    <>
      <div className="al-visor">{datos ? <img src={datos} alt="Foto" /> : error ? <p className="al-error">{error}</p> : <span className="spin" aria-hidden="true" />}</div>
      <p className="hint">{fechaBonita(foto.fecha)}</p>
      <p>{foto.ninos.length ? foto.ninos.map((id) => porId.get(id)?.nombre || 'Niño que ya no está').join(', ') : 'Sin ordenar: todavía no dice quién sale.'}</p>
      <div className="row-actions">
        <button type="button" className="mini solid" disabled={guardando} onClick={() => setEditar(true)}>
          {guardando ? 'Guardando…' : 'Cambiar quién sale'}
        </button>
        <a className="mini" href={foto.url} target="_blank" rel="noreferrer">
          Abrir en Drive
        </a>
        {borrar ? (
          <>
            <button
              type="button"
              className="mini danger"
              onClick={async () => {
                try {
                  await api({ accion: 'albumBorrar', id: foto.id });
                  onBorrada(foto.id);
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              Sí, borrar la foto
            </button>
            <button type="button" className="mini" onClick={() => setBorrar(false)}>
              No
            </button>
          </>
        ) : (
          <button type="button" className="mini" onClick={() => setBorrar(true)}>
            Borrar
          </button>
        )}
        <button type="button" className="mini" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </>
  );
}

function Galeria({ ninos, cuentas, api, inicial, onCuentas }) {
  const [sel, setSel] = useState(inicial || '_todas');
  const [fotos, setFotos] = useState(null);
  const [minis, setMinis] = useState({});
  const [error, setError] = useState('');
  const [ver, setVer] = useState(null);
  const [cuantas, setCuantas] = useState(60);
  const porId = useMemo(() => new Map(ninos.map((n) => [n.id, n])), [ninos]);
  const minisRef = useRef({});

  useEffect(() => {
    let vivo = true;
    setFotos(null);
    setError('');
    setCuantas(60);
    api({ accion: 'album', ...(sel === '_sin' ? { sin: true } : sel === '_todas' ? {} : { nino: sel }) })
      .then((r) => {
        if (!vivo) return;
        setFotos(r.fotos || []);
        onCuentas(r.cuentas);
      })
      .catch((err) => vivo && setError(err.message));
    return () => {
      vivo = false;
    };
  }, [sel]);

  useEffect(() => {
    if (!fotos) return;
    let vivo = true;
    (async () => {
      const faltan = fotos.slice(0, cuantas).map((f) => f.id).filter((id) => !(id in minisRef.current));
      for (let i = 0; i < faltan.length && vivo; i += 30) {
        try {
          const r = await api({ accion: 'albumMinis', ids: faltan.slice(i, i + 30) });
          minisRef.current = { ...minisRef.current, ...r.minis };
          if (vivo) setMinis(minisRef.current);
        } catch (err) {
          if (vivo) setError(err.message);
          return;
        }
      }
    })();
    return () => {
      vivo = false;
    };
  }, [fotos, cuantas]);

  const n = (id) => cuentas[id] || 0;
  const titulo = sel === '_todas' ? 'Todas las fotos' : sel === '_sin' ? 'Sin ordenar' : porId.get(sel)?.nombre || '';

  return (
    <div className="al-galeria">
      <label className="al-ver">
        <span>Ver fotos de</span>
        <select id="al-ver" value={sel} onChange={(e) => setSel(e.target.value)}>
          <option value="_todas">Todas ({cuentas._total || 0})</option>
          <option value="_sin">Sin ordenar ({cuentas._sin || 0})</option>
          {ordenarPorCasa(ninos).map(([casa, l]) => (
            <optgroup key={casa || 'sin'} label={casa || 'Sin casa'}>
              {l.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre} ({n(x.id)})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <h4 className="al-titulo">
        {titulo}
        {fotos && <span className="hint"> · {fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'}</span>}
      </h4>
      {error && <p className="al-error">{error}</p>}
      {!fotos && !error && (
        <p className="al-msg">
          <span className="spin" aria-hidden="true" /> Cargando…
        </p>
      )}
      {fotos && !fotos.length && <p className="hint">{sel === '_sin' ? 'No hay fotos sin ordenar. 👍' : 'Todavía no hay fotos aquí.'}</p>}
      {fotos && fotos.length > 0 && (
        <div className="al-grid">
          {fotos.slice(0, cuantas).map((f) => (
            <button key={f.id} type="button" className="al-mini" onClick={() => setVer(f)} aria-label={`Foto del ${fechaBonita(f.fecha)}`}>
              {minis[f.id] ? <img src={minis[f.id]} alt="" loading="lazy" /> : <span className="spin" aria-hidden="true" />}
              <span>{fechaBonita(f.fecha).replace(/ de (\d{4})$/, ' $1')}</span>
            </button>
          ))}
        </div>
      )}
      {fotos && fotos.length > cuantas && (
        <button type="button" className="dl ghost" onClick={() => setCuantas((c) => c + 60)}>
          Ver más fotos
        </button>
      )}
      <Ventana abierta={!!ver} onCerrar={() => setVer(null)} ancha etiqueta="Foto">
        {ver && (
          <Visor
            foto={ver}
            ninos={ninos}
            porId={porId}
            api={api}
            onCerrar={() => setVer(null)}
            onCambio={(f) => {
              setVer(f);
              setFotos((l) => l.map((x) => (x.id === f.id ? f : x)).filter((x) => sel === '_todas' || (sel === '_sin' ? !x.ninos.length : x.ninos.includes(sel))));
              api({ accion: 'albumEstado' })
                .then((r) => onCuentas(r.cuentas))
                .catch(() => null);
            }}
            onBorrada={(id) => {
              setVer(null);
              setFotos((l) => l.filter((x) => x.id !== id));
              api({ accion: 'albumEstado' })
                .then((r) => onCuentas(r.cuentas))
                .catch(() => null);
            }}
          />
        )}
      </Ventana>
    </div>
  );
}

export default function Album({ ninos, fotos, asegurarFotos, api, inicial, onCerrar }) {
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState('');
  const [vista, setVista] = useState(inicial ? 'album' : '');
  const [aviso, setAviso] = useState('');
  const [clave, setClave] = useState(0);
  const caja = useRef(null);
  useEffect(() => {
    try {
      caja.current && caja.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    api({ accion: 'albumEstado' })
      .then((r) => {
        setEstado({ carpeta: r.carpeta, cuentas: r.cuentas || {} });
        setVista((v) => v || (r.cuentas && r.cuentas._total ? 'album' : 'subir'));
      })
      .catch((err) => setError(err.message === 'Acción desconocida.' ? 'Para las fotos falta actualizar el código de Google a la versión 7 (pega el Code.gs nuevo y crea una nueva versión de la implementación).' : err.message));
  }, []);

  return (
    <div className="panel al" id="album" ref={caja}>
      <div className="al-cab">
        <h3>Fotos de los niños</h3>
        <button type="button" className="mini" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
      {error && <p className="al-error">{error}</p>}
      {!estado && !error && (
        <p className="al-msg">
          <span className="spin" aria-hidden="true" /> Cargando…
        </p>
      )}
      {estado && (
        <>
          <Carpeta carpeta={estado.carpeta} api={api} onCambio={(c) => setEstado((e) => ({ ...e, carpeta: c }))} />
          {estado.carpeta && (
            <div className="seg al-tabs" role="tablist" aria-label="Fotos">
              <button type="button" role="tab" aria-selected={vista === 'subir'} aria-pressed={vista === 'subir'} id="al-tab-subir" onClick={() => setVista('subir')}>
                Subir fotos
              </button>
              <button type="button" role="tab" aria-selected={vista === 'album'} aria-pressed={vista === 'album'} id="al-tab-album" onClick={() => setVista('album')}>
                Álbum ({estado.cuentas._total || 0})
              </button>
            </div>
          )}
          {aviso && (
            <p className="al-ok" role="status">
              {aviso}
            </p>
          )}
          <div hidden={vista !== 'subir'}>
            <Subir
              ninos={ninos}
              fotosDir={fotos}
              asegurarFotos={asegurarFotos}
              api={api}
              carpeta={estado.carpeta}
              onGuardado={(r) => {
                setAviso(`Listo: ${r.nuevas} ${r.nuevas === 1 ? 'foto guardada' : 'fotos guardadas'} en Drive${r.repetidas ? ` (${r.repetidas} ya estaban y no se repitieron)` : ''}.`);
                api({ accion: 'albumEstado' })
                  .then((x) => setEstado((e) => ({ ...e, cuentas: x.cuentas })))
                  .catch(() => null);
                setClave((k) => k + 1);
                if (r.nuevas || r.repetidas) setVista('album');
              }}
            />
          </div>
          {vista === 'album' && estado.carpeta && <Galeria key={clave} ninos={ninos} cuentas={estado.cuentas} api={api} inicial={inicial} onCuentas={(c) => c && setEstado((e) => ({ ...e, cuentas: c }))} />}
        </>
      )}
    </div>
  );
}
