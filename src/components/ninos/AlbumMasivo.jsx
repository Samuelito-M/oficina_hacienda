import { useEffect, useMemo, useRef, useState } from 'react';
import Ventana from '../Ventana.jsx';
import { ElegirNino, FotoRevisar, AvisoSinRef, cargarReferencias, subirConReintentos } from './AlbumPartes.jsx';
import { cargarCaras, detectar, referenciasDe, sinCaraEnDirectorio } from '../../lib/caras.js';
import { emparejar, ninosDeFoto, carasParaAprender } from '../../lib/emparejar.js';
import { prepararFoto } from '../../lib/fotosAlbum.js';
import { leerZip, esZip, esFoto } from '../../lib/zipLector.js';

const K_AVANCE = 'oficina-hacienda.album.masivo.';
const POR_PAGINA = 30;

function cargarHechos(firma) {
  try {
    const t = JSON.parse(localStorage.getItem(K_AVANCE + firma) || 'null');
    if (Array.isArray(t)) return { hechos: new Set(t), c: {} };
    return { hechos: new Set((t && t.h) || []), c: (t && t.c) || {} };
  } catch {
    return { hechos: new Set(), c: {} };
  }
}

function guardarHechos(firma, set, c) {
  try {
    localStorage.setItem(K_AVANCE + firma, JSON.stringify({ h: [...set], c: { guardadas: c.guardadas, repetidas: c.repetidas, ilegibles: c.ilegibles } }));
  } catch {
    return;
  }
}

function borrarHechos(firma) {
  try {
    localStorage.removeItem(K_AVANCE + firma);
  } catch {
    return;
  }
}

function firmaDe(archivos) {
  const t = archivos.map((f) => `${f.name}:${f.size}:${f.lastModified}`).join('|');
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  return `${archivos.length}-${(h >>> 0).toString(36)}`;
}

const minutos = (ms) => {
  const m = Math.round(ms / 60000);
  return m < 1 ? 'menos de un minuto' : m === 1 ? '1 minuto' : m < 60 ? `${m} minutos` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

export default function Masivo({ archivos, ninos, fotosDir, asegurarFotos, api, onTerminar, onCancelar }) {
  const [fase, setFase] = useState('preparando');
  const [msg, setMsg] = useState('Abriendo las fotos…');
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [cuenta, setCuenta] = useState({ hechas: 0, guardadas: 0, repetidas: 0, ilegibles: 0, antes: 0 });
  const [pend, setPend] = useState([]);
  const [filtro, setFiltro] = useState('dudas');
  const [pagina, setPagina] = useState(1);
  const [sinNadie, setSinNadie] = useState('sinOrdenar');
  const [elegir, setElegir] = useState(null);
  const [sinRef, setSinRef] = useState(null);
  const [actual, setActual] = useState('');
  const [resto, setResto] = useState('');
  const fuentes = useRef([]);
  const refs = useRef(null);
  const pausar = useRef(false);
  const hechos = useRef(new Set());
  const enRevision = useRef(new Set());
  const firma = useMemo(() => firmaDe(archivos), [archivos]);
  const porId = useMemo(() => new Map(ninos.map((n) => [n.id, n])), [ninos]);
  const despierta = useRef(null);
  const cuentaRef = useRef({ guardadas: 0, repetidas: 0, ilegibles: 0 });
  const sumar = (d) => {
    const c = cuentaRef.current;
    cuentaRef.current = { guardadas: c.guardadas + (d.guardadas || 0), repetidas: c.repetidas + (d.repetidas || 0), ilegibles: c.ilegibles + (d.ilegibles || 0) };
    setCuenta((x) => ({ ...x, ...cuentaRef.current, hechas: x.hechas + (d.hechas || 0) }));
  };

  const trabajando = fase === 'procesando' || fase === 'guardando';
  useEffect(() => {
    if (!trabajando) return;
    const aviso = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', aviso);
    (async () => {
      try {
        if (navigator.wakeLock) despierta.current = await navigator.wakeLock.request('screen');
      } catch {
        despierta.current = null;
      }
    })();
    return () => {
      window.removeEventListener('beforeunload', aviso);
      try {
        despierta.current && despierta.current.release();
      } catch {
        despierta.current = null;
      }
    };
  }, [trabajando]);

  const datosSubida = (prep, ids) => ({ accion: 'albumSubir', foto: prep.foto, mini: prep.mini, fecha: prep.fecha, nombre: prep.nombre, huella: prep.huella, ninos: ids });

  const marcar = (i) => {
    hechos.current.add(i);
    guardarHechos(firma, hechos.current, cuentaRef.current);
  };

  const recorrer = async () => {
    setFase('procesando');
    setError('');
    pausar.current = false;
    let anterior = Promise.resolve();
    let fallo = null;
    const t0 = Date.now();
    let hechasAhora = 0;
    const lista = fuentes.current;
    const faltan = lista.filter((x) => !hechos.current.has(x.i) && !enRevision.current.has(x.i)).length;
    for (const x of lista) {
      if (pausar.current || fallo) break;
      if (hechos.current.has(x.i) || enRevision.current.has(x.i)) continue;
      setActual(x.nombre);
      try {
        const prep = await prepararFoto(await x.obtener());
        const det = await detectar(prep.canvas);
        prep.canvas = null;
        const m = emparejar(det, refs.current);
        const caras = det.map((c, k) => ({ ...c, ...m[k] }));
        const seguros = Array.from(new Set(caras.filter((c) => c.nivel === 'seguro').map((c) => c.id)));
        const dudosas = caras.some((c) => c.nivel === 'quizas');
        if (seguros.length && !dudosas) {
          await anterior;
          if (fallo) break;
          anterior = subirConReintentos(api, datosSubida(prep, seguros))
            .then((r) => {
              sumar({ hechas: 1, guardadas: r.repetida ? 0 : 1, repetidas: r.repetida ? 1 : 0 });
              marcar(x.i);
            })
            .catch((err) => {
              fallo = err;
            });
        } else {
          enRevision.current.add(x.i);
          setPend((p) => [...p, { key: `m${x.i}`, i: x.i, prep: { foto: prep.mini, nombre: prep.nombre, fecha: prep.fecha, fechaDeCamara: prep.fechaDeCamara }, caras, extra: [], omitir: false, nadie: !caras.some((c) => c.id) }]);
          sumar({ hechas: 1 });
        }
      } catch {
        sumar({ hechas: 1, ilegibles: 1 });
        marcar(x.i);
      }
      hechasAhora++;
      const pasado = Date.now() - t0;
      if (hechasAhora >= 3) setResto(minutos((pasado / hechasAhora) * (faltan - hechasAhora)));
    }
    await anterior;
    setActual('');
    if (fallo) {
      setError(fallo.codigo === 'sesion' || fallo.codigo === 'sinCarpeta' ? fallo.message : `No se pudo subir a Drive (${fallo.message || 'sin internet'}). Revisa el internet y toca Seguir: continúa donde quedó.`);
      setFase('pausado');
      return;
    }
    if (pausar.current) {
      setFase('pausado');
      return;
    }
    setFase('revisar');
  };

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const lista = [];
        for (const f of archivos) {
          if (esZip(f)) {
            setMsg(`Abriendo ${f.name}…`);
            const z = await leerZip(f);
            for (const e of z.entradas) lista.push({ nombre: e.ruta, obtener: () => z.archivo(e) });
          } else if (esFoto(f)) lista.push({ nombre: f.webkitRelativePath || f.name, obtener: async () => f });
        }
        lista.forEach((x, i) => (x.i = i));
        if (!lista.length) throw new Error('No encontré fotos (JPG o PNG) en lo que elegiste.');
        fuentes.current = lista;
        const previo = cargarHechos(firma);
        hechos.current = previo.hechos;
        cuentaRef.current = { guardadas: previo.c.guardadas || 0, repetidas: previo.c.repetidas || 0, ilegibles: previo.c.ilegibles || 0 };
        const antes = lista.filter((x) => hechos.current.has(x.i)).length;
        if (!vivo) return;
        setTotal(lista.length);
        setCuenta({ ...cuentaRef.current, hechas: antes, antes });
        const r = await cargarReferencias({ ninos, fotosDir, asegurarFotos, api, avance: setMsg, cargarCaras, referenciasDe, sinCaraEnDirectorio });
        if (!vivo) return;
        refs.current = r.refs;
        setSinRef(r.sinRef);
        setMsg('');
        recorrer();
      } catch (err) {
        if (vivo) {
          setError(err.message);
          setFase('error');
        }
      }
    })();
    return () => {
      vivo = false;
      pausar.current = true;
    };
  }, []);

  const cambiar = (key, fn) => setPend((l) => l.map((f) => (f.key === key ? fn(f) : f)));
  const dudas = pend.filter((f) => !f.nadie);
  const nadie = pend.filter((f) => f.nadie);
  const vistos = filtro === 'dudas' ? dudas : nadie;
  const aGuardar = pend.filter((f) => !f.omitir && (ninosDeFoto(f).length || sinNadie === 'sinOrdenar'));
  const [guardando, setGuardando] = useState(null);

  const guardarRevisadas = async () => {
    setFase('guardando');
    setError('');
    const lista = aGuardar;
    let n = 0;
    const listos = [];
    for (const f of lista) {
      n++;
      setGuardando({ i: n, n: lista.length });
      try {
        const prep = await prepararFoto(await fuentes.current[f.i].obtener());
        prep.canvas = null;
        const r = await subirConReintentos(api, datosSubida(prep, ninosDeFoto(f)));
        sumar({ guardadas: r.repetida ? 0 : 1, repetidas: r.repetida ? 1 : 0 });
        marcar(f.i);
        listos.push(f);
      } catch (err) {
        setGuardando(null);
        setPend((p) => p.filter((x) => !listos.includes(x)));
        setError(`${err.codigo === 'sesion' || err.codigo === 'sinCarpeta' ? err.message : `No se pudo subir a Drive (${err.message || 'sin internet'}).`} Lo que ya se guardó queda guardado; toca Guardar otra vez para seguir.`);
        setFase('revisar');
        return;
      }
    }
    try {
      const aprender = carasParaAprender(listos, refs.current || new Map());
      if (aprender.length) await api({ accion: 'guardarCaras', nuevas: aprender });
    } catch {
      refs.current = refs.current || null;
    }
    for (const f of pend) if (!aGuardar.includes(f)) marcar(f.i);
    setGuardando(null);
    setPend([]);
    setFase('listo');
    borrarHechos(firma);
  };

  const pct = total ? Math.round((cuenta.hechas / total) * 100) : 0;
  const fotoElegir = elegir && pend.find((f) => f.key === elegir.key);

  return (
    <div className="al-masivo" id="al-masivo">
      <div className="al-masivo-cab">
        <h4>{archivos.length === 1 && esZip(archivos[0]) ? archivos[0].name : `${total || archivos.length} fotos`}</h4>
        {!trabajando && fase !== 'listo' && (
          <button type="button" className="mini" onClick={onCancelar}>
            Cerrar
          </button>
        )}
      </div>
      {msg && (
        <p className="al-msg" role="status">
          <span className="spin" aria-hidden="true" /> {msg}
        </p>
      )}
      {error && <p className="al-error">{error}</p>}
      <AvisoSinRef sinRef={sinRef} />

      {total > 0 && (
        <div className="al-avance" role="status" aria-live="polite">
          <div className="al-barra-avance" aria-hidden="true">
            <i style={{ width: `${pct}%` }} />
          </div>
          <p>
            <b>
              {cuenta.hechas} de {total}
            </b>{' '}
            revisadas · <b>{cuenta.guardadas}</b> guardadas solas en Drive · <b>{pend.length}</b> para que revises
            {cuenta.repetidas > 0 && ` · ${cuenta.repetidas} ya estaban`}
            {cuenta.ilegibles > 0 && ` · ${cuenta.ilegibles} no se pudieron abrir`}
          </p>
          {cuenta.antes > 0 && fase === 'procesando' && <p className="hint">Ya habías avanzado {cuenta.antes} de estas fotos antes; sigo con el resto.</p>}
          {fase === 'procesando' && (
            <p className="hint">
              {actual ? `Ahora: ${actual}` : ''}
              {resto ? ` · Falta más o menos ${resto}` : ''}. No cierres esta pestaña; puedes usar otras.
            </p>
          )}
        </div>
      )}

      {fase === 'procesando' && (
        <div className="row-actions">
          <button
            type="button"
            className="mini"
            id="al-pausar"
            onClick={() => {
              pausar.current = true;
              setMsg('Pausando después de esta foto…');
            }}
          >
            Pausar
          </button>
        </div>
      )}
      {fase === 'pausado' && (
        <div className="row-actions">
          <button
            type="button"
            className="mini solid"
            id="al-seguir"
            onClick={() => {
              setMsg('');
              recorrer();
            }}
          >
            Seguir
          </button>
          {pend.length > 0 && (
            <button type="button" className="mini" onClick={() => setFase('revisar')}>
              Revisar las {pend.length} apartadas ahora
            </button>
          )}
        </div>
      )}

      {fase === 'listo' && (
        <p className="al-ok" id="al-masivo-listo">
          ¡Listo! {cuenta.guardadas === 1 ? 'Se guardó 1 foto' : `Se guardaron ${cuenta.guardadas} fotos`} en Drive{cuenta.repetidas ? ` (${cuenta.repetidas} ya estaban)` : ''}
          {cuenta.ilegibles ? `. ${cuenta.ilegibles} no se pudieron abrir` : ''}.{' '}
          <button type="button" className="btn-link" onClick={() => onTerminar(cuenta)}>
            Ver el álbum
          </button>
        </p>
      )}

      {(fase === 'revisar' || fase === 'guardando') && (
        <div className="al-revisar">
          {pend.length === 0 ? (
            <p className="al-ok">No quedó nada para revisar: todas se guardaron solas. 🎉</p>
          ) : (
            <>
              <h4>Revisa las que la app apartó</h4>
              <div className="seg al-tabs" role="tablist">
                <button type="button" role="tab" aria-pressed={filtro === 'dudas'} aria-selected={filtro === 'dudas'} id="al-ver-dudas" onClick={() => (setFiltro('dudas'), setPagina(1))}>
                  No está segura ({dudas.length})
                </button>
                <button type="button" role="tab" aria-pressed={filtro === 'nadie'} aria-selected={filtro === 'nadie'} id="al-ver-nadie" onClick={() => (setFiltro('nadie'), setPagina(1))}>
                  No reconoció a nadie ({nadie.length})
                </button>
              </div>
              {filtro === 'nadie' && nadie.length > 0 && (
                <fieldset className="al-nadie">
                  <legend>Las fotos donde no reconoció a nadie y no les pongas un niño:</legend>
                  <label>
                    <input type="radio" name="al-nadie" checked={sinNadie === 'sinOrdenar'} onChange={() => setSinNadie('sinOrdenar')} /> Guardarlas en “Sin ordenar” (las ordenas después en el Álbum)
                  </label>
                  <label>
                    <input type="radio" name="al-nadie" id="al-nadie-no" checked={sinNadie === 'no'} onChange={() => setSinNadie('no')} /> No subirlas
                  </label>
                </fieldset>
              )}
              <p className="hint">Toca una cara o un nombre para corregirlo. Lo que no toques se guarda como está.</p>
              <div className="al-lote">
                {vistos.slice(0, pagina * POR_PAGINA).map((f) => (
                  <FotoRevisar
                    key={f.key}
                    f={f}
                    porId={porId}
                    onCara={(i) => setElegir({ key: f.key, i })}
                    onAgregar={() => setElegir({ key: f.key, i: -1 })}
                    onQuitarExtra={(id) => cambiar(f.key, (x) => ({ ...x, extra: x.extra.filter((y) => y !== id) }))}
                    onOmitir={(v) => cambiar(f.key, (x) => ({ ...x, omitir: v }))}
                  />
                ))}
              </div>
              {vistos.length > pagina * POR_PAGINA && (
                <button type="button" className="dl ghost" onClick={() => setPagina((p) => p + 1)}>
                  Ver {Math.min(POR_PAGINA, vistos.length - pagina * POR_PAGINA)} más
                </button>
              )}
            </>
          )}
          {pend.length > 0 && (
            <div className="al-barra">
              <button type="button" className="dl" id="al-guardar-revisadas" disabled={fase === 'guardando' || !aGuardar.length} onClick={guardarRevisadas}>
                {guardando ? `Guardando ${guardando.i} de ${guardando.n}…` : `Guardar en Drive (${aGuardar.length})`}
              </button>
              <span className="hint">{pend.length - aGuardar.length > 0 ? `${pend.length - aGuardar.length} no se van a subir.` : ''}</span>
            </div>
          )}
          {pend.length === 0 && fase === 'revisar' && (
            <button type="button" className="dl" onClick={() => (setFase('listo'), borrarHechos(firma))}>
              Terminar
            </button>
          )}
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
              else
                cambiar(fotoElegir.key, (f) => ({
                  ...f,
                  caras: f.caras.map((c, k) => (k === elegir.i ? { ...c, id, nivel: 'seguro', ignorar: false, corregida: true } : c.id === id ? { ...c, id: '', nivel: 'nadie' } : c)),
                  extra: (f.extra || []).filter((x) => x !== id)
                }));
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
