import { useState } from 'react';
import { CASAS } from '../../lib/personal.js';
import { fold, MESES } from '../../lib/text.js';
import { ninosDeFoto } from '../../lib/emparejar.js';

export const MAX_LOTE = 60;
export const fechaBonita = (f) => {
  const m = String(f || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${+m[3]} de ${MESES[+m[2] - 1]} de ${m[1]}` : '';
};

export function ordenarPorCasa(ninos) {
  const grupos = new Map();
  for (const c of [...CASAS, '']) grupos.set(c, []);
  for (const n of ninos) {
    const c = CASAS.includes(n.casa) ? n.casa : '';
    grupos.get(c).push(n);
  }
  for (const l of grupos.values()) l.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return [...grupos].filter(([, l]) => l.length);
}

export function ElegirNino({ ninos, titulo, actual, enFoto, onElegir, onIgnorar, onQuitar, onCerrar, multiple, inicial, onListo }) {
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

export function FotoRevisar({ f, porId, onCara, onAgregar, onQuitarExtra, onOmitir }) {
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


export async function cargarReferencias({ ninos, fotosDir, asegurarFotos, api, avance, cargarCaras, referenciasDe, sinCaraEnDirectorio }) {
  avance('Bajando el programa que reconoce caras (solo la primera vez, puede tardar un minuto)…');
  await cargarCaras(avance);
  avance('Trayendo las fotos del directorio…');
  const dir = await asegurarFotos(ninos.filter((n) => n.conFoto).map((n) => n.id));
  let aprendidas = {};
  try {
    aprendidas = (await api({ accion: 'caras' })).caras || {};
  } catch {
    aprendidas = {};
  }
  const refs = await referenciasDe(ninos, dir || fotosDir, aprendidas, avance);
  const sinRef = { malas: sinCaraEnDirectorio(ninos).filter((n) => !(aprendidas[n.id] || []).length), sinFoto: ninos.filter((n) => !n.conFoto && !(aprendidas[n.id] || []).length) };
  return { refs, sinRef };
}

export function AvisoSinRef({ sinRef }) {
  if (!sinRef || (!sinRef.malas.length && !sinRef.sinFoto.length)) return null;
  const n = sinRef.malas.length + sinRef.sinFoto.length;
  return (
    <details className="al-aviso">
      <summary>
        {n} {n === 1 ? 'niño todavía no se puede reconocer solo' : 'niños todavía no se pueden reconocer solos'}
      </summary>
      {sinRef.malas.length > 0 && <p>No se ve bien la cara en la foto del directorio de: {sinRef.malas.map((x) => x.nombre).join(', ')}. Cámbiala por una foto de frente y con buena luz.</p>}
      {sinRef.sinFoto.length > 0 && <p>No tienen foto en el directorio: {sinRef.sinFoto.map((x) => x.nombre).join(', ')}.</p>}
      <p className="hint">Mientras tanto, agrégalos a mano con “+ Agregar niño”. Cuando corriges una cara, la app aprende y la próxima vez los reconoce.</p>
    </details>
  );
}

export async function subirConReintentos(api, datos, intentos = 4) {
  let ultimo;
  for (let i = 0; i < intentos; i++) {
    try {
      return await api(datos);
    } catch (err) {
      if (err.codigo === 'sesion' || err.codigo === 'sinCarpeta' || err.codigo === 'foto') throw err;
      ultimo = err;
      await new Promise((r) => setTimeout(r, [800, 2500, 6000, 12000][i]));
    }
  }
  throw ultimo;
}
