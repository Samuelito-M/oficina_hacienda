import { useEffect, useMemo, useState } from 'react';
import * as PDFLib from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { descargar, MIME, nombreSeguro } from '../../lib/archivos.js';
import { cargarRecursos } from '../../lib/recursos.js';
import { edadDe } from '../../lib/documentos.js';
import { armarEquipos, separar, filtrar, cortesDe, rangos, sexoDe, resumenGrupo, textoResumen, textoGrupos, generarPdfGrupos, MAX_EQUIPOS } from '../../lib/equipos.js';

function Marcar({ lista, guardando, onGuardar, onCerrar }) {
  const [elegidos, setElegidos] = useState(() => Object.fromEntries(lista.map((n) => [n.id, sexoDe(n)])));
  const cambios = lista.filter((n) => elegidos[n.id] !== sexoDe(n));
  const boton = (n, s, t) => (
    <button type="button" aria-pressed={elegidos[n.id] === s} onClick={() => setElegidos((e) => ({ ...e, [n.id]: e[n.id] === s ? '' : s }))}>
      {t}
    </button>
  );
  return (
    <div className="marcar">
      <p className="hint">Toca Niña o Niño en cada uno y al final dale Guardar. Solo se guarda esto, lo demás no cambia.</p>
      <ul className="marcar-lista">
        {lista.map((n) => (
          <li key={n.id}>
            <span>
              {n.nombre}
              {n.casa && <span className="hint"> · {n.casa}</span>}
            </span>
            <div className="seg" role="group" aria-label={`Niña o niño: ${n.nombre}`}>
              {boton(n, 'F', 'Niña')}
              {boton(n, 'M', 'Niño')}
            </div>
          </li>
        ))}
      </ul>
      <div className="row-actions">
        <button type="button" className="mini solid" disabled={!cambios.length || guardando} onClick={() => onGuardar(cambios.map((n) => ({ id: n.id, sexo: elegidos[n.id] })))}>
          {guardando ? 'Guardando…' : `Guardar${cambios.length ? ` (${cambios.length})` : ''}`}
        </button>
        <button type="button" className="mini" onClick={onCerrar}>
          Listo
        </button>
      </div>
    </div>
  );
}

export default function Equipos({ lista, casas, filtro, version, guardando, onMarcarSexos, onCerrar }) {
  const [modo, setModo] = useState('equipos');
  const [sexo, setSexo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [fuera, setFuera] = useState([]);
  const [cuantos, setCuantos] = useState(2);
  const [mezclarSexo, setMezclarSexo] = useState(true);
  const [separarHermanos, setSepararHermanos] = useState(true);
  const [semilla, setSemilla] = useState(() => (Date.now() % 99991) + 1);
  const [porSexo, setPorSexo] = useState(true);
  const [porEdad, setPorEdad] = useState(false);
  const [porCasa, setPorCasa] = useState(false);
  const [cortesTxt, setCortesTxt] = useState('6, 11');
  const [marcando, setMarcando] = useState(false);
  const [elegido, setElegido] = useState('');
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const sinMarcar = lista.filter((n) => !sexoDe(n));
  const sinEdad = lista.filter((n) => edadDe(n) == null);
  const cortes = cortesDe(cortesTxt);
  const juegan = useMemo(() => filtrar(lista, { sexo, desde, hasta, fuera }), [lista, sexo, desde, hasta, fuera]);
  const quitados = lista.filter((n) => fuera.includes(n.id));

  const base = useMemo(() => {
    if (!juegan.length) return [];
    if (modo === 'equipos') return armarEquipos(juegan, { n: cuantos, mezclarSexo, separarHermanos, semilla });
    return separar(juegan, { porSexo, porEdad, porCasa, cortes, casas });
  }, [juegan, modo, cuantos, mezclarSexo, separarHermanos, semilla, porSexo, porEdad, porCasa, cortesTxt, casas]);

  const [grupos, setGrupos] = useState(base);
  useEffect(() => {
    setGrupos(base);
    setElegido('');
  }, [base]);

  const mover = (destino) => {
    setGrupos((gs) => {
      const nino = gs.flatMap((g) => g.ninos).find((n) => n.id === elegido);
      if (!nino) return gs;
      return gs.map((g, i) => {
        const sin = g.ninos.filter((n) => n.id !== elegido);
        return i === destino ? { ...g, ninos: [...sin, nino].sort((a, b) => (edadDe(a) ?? 99) - (edadDe(b) ?? 99) || a.nombre.localeCompare(b.nombre, 'es')) } : { ...g, ninos: sin };
      });
    });
    setElegido('');
  };

  const titulo = modo === 'equipos' ? 'Equipos' : 'Grupos';
  const detalle = [
    filtro,
    sexo === 'F' ? 'solo niñas' : sexo === 'M' ? 'solo niños' : '',
    desde !== '' || hasta !== '' ? `de ${desde || 0} a ${hasta || '…'} años` : ''
  ]
    .filter(Boolean)
    .join(', ');

  const copiar = async () => {
    const t = textoGrupos(grupos, `${titulo}${detalle ? ` (${detalle})` : ''}`);
    try {
      await navigator.clipboard.writeText(t);
      setMsg('Copiado. Ya lo puedes pegar en WhatsApp.');
    } catch {
      setMsg('No se pudo copiar en este navegador.');
    }
  };

  const pdf = async () => {
    setOcupado(true);
    setMsg('');
    try {
      const recursos = await cargarRecursos();
      const hoy = new Date();
      const fecha = hoy.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
      const out = await generarPdfGrupos(grupos, { titulo, subtitulo: [detalle, fecha].filter(Boolean).join(' · ') }, PDFLib, fontkit, recursos);
      const f = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
      descargar(out, nombreSeguro(`${titulo} Hacienda ${f}.pdf`), MIME.pdf);
      setMsg('Listo, revisa tu carpeta de Descargas.');
    } catch (err) {
      console.error(err);
      setMsg('No se pudo armar el PDF. Intenta otra vez.');
    } finally {
      setOcupado(false);
    }
  };

  const numero = (v) => (v === '' ? '' : String(Math.max(0, Math.min(25, Math.floor(+v) || 0))));

  return (
    <div className="ficha">
      <h4>Equipos y grupos</h4>

      {sinMarcar.length > 0 && !marcando && (
        <div className="alert warn">
          <b>
            {sinMarcar.length} {sinMarcar.length === 1 ? 'niño no tiene marcado' : 'niños no tienen marcado'} si es niño o niña
          </b>
          <span>
            Para separar por niños y niñas o mezclarlos parejo, márcalos una vez.{' '}
            {version >= 3 ? (
              <button type="button" className="btn-link" onClick={() => setMarcando(true)}>
                Marcar ahora
              </button>
            ) : (
              'Primero actualiza el código de Google (Code.gs).'
            )}
          </span>
        </div>
      )}
      {marcando && (
        <Marcar
          lista={sinMarcar.length ? sinMarcar : lista}
          guardando={guardando}
          onCerrar={() => setMarcando(false)}
          onGuardar={async (cambios) => {
            if (await onMarcarSexos(cambios)) setMarcando(false);
          }}
        />
      )}

      <fieldset className="grupo-op">
        <legend>¿Quiénes participan?</legend>
        <div className="opciones">
          <div className="seg" role="group" aria-label="Niños o niñas">
            {[
              ['', 'Todos'],
              ['F', 'Solo niñas'],
              ['M', 'Solo niños']
            ].map(([k, t]) => (
              <button key={k || 'todos'} type="button" id={`eq-sexo-${k || 'todos'}`} aria-pressed={sexo === k} onClick={() => setSexo(k)}>
                {t}
              </button>
            ))}
          </div>
          <label className="edad-rango">
            Edad de
            <input id="eq-desde" type="number" inputMode="numeric" min="0" max="25" value={desde} onChange={(e) => setDesde(numero(e.target.value))} placeholder="0" />
            a
            <input id="eq-hasta" type="number" inputMode="numeric" min="0" max="25" value={hasta} onChange={(e) => setHasta(numero(e.target.value))} placeholder="18" />
            años
          </label>
        </div>
        <details className="sub">
          <summary>
            Quitar a quien no está{quitados.length ? ` (${quitados.length} fuera)` : ''}
          </summary>
          <p className="hint">Toca un nombre para sacarlo o volverlo a poner.</p>
          <div className="chips">
            {lista.map((n) => {
              const out = fuera.includes(n.id);
              return (
                <button key={n.id} type="button" className={`chip${out ? ' miss' : ''}`} aria-pressed={!out} onClick={() => setFuera((f) => (out ? f.filter((x) => x !== n.id) : [...f, n.id]))}>
                  {n.nombre}
                </button>
              );
            })}
          </div>
        </details>
        <p className="hint">
          Participan <b>{juegan.length}</b> de {lista.length}
          {filtro ? ` (${filtro})` : ''}.{(desde !== '' || hasta !== '') && sinEdad.length > 0 && ` ${sinEdad.length} sin edad no entran.`}
        </p>
      </fieldset>

      <div className="seg" role="group" aria-label="Qué hacer">
        <button type="button" id="eq-modo-equipos" aria-pressed={modo === 'equipos'} onClick={() => setModo('equipos')}>
          Hacer equipos parejos
        </button>
        <button type="button" id="eq-modo-separar" aria-pressed={modo === 'separar'} onClick={() => setModo('separar')}>
          Separar en grupos
        </button>
      </div>

      {modo === 'equipos' ? (
        <div className="opciones">
          <label className="edad-rango">
            Número de equipos
            <span className="contador">
              <button type="button" className="mini" aria-label="Menos equipos" disabled={cuantos <= 2} onClick={() => setCuantos((c) => Math.max(2, c - 1))}>
                −
              </button>
              <b id="eq-cuantos">{cuantos}</b>
              <button type="button" className="mini" aria-label="Más equipos" disabled={cuantos >= MAX_EQUIPOS} onClick={() => setCuantos((c) => Math.min(MAX_EQUIPOS, c + 1))}>
                +
              </button>
            </span>
          </label>
          <label className="opcion">
            <input type="checkbox" id="eq-mezclar" checked={mezclarSexo} onChange={(e) => setMezclarSexo(e.target.checked)} />
            <span>Repartir niños y niñas parejo</span>
          </label>
          <label className="opcion">
            <input type="checkbox" id="eq-hermanos" checked={separarHermanos} onChange={(e) => setSepararHermanos(e.target.checked)} />
            <span>Separar hermanos</span>
          </label>
          <button type="button" className="mini solid" id="eq-mezclar-otra" disabled={juegan.length < 2} onClick={() => setSemilla((s) => (s * 7919 + 13) % 99991 || 1)}>
            Mezclar otra vez
          </button>
        </div>
      ) : (
        <div className="opciones">
          <span className="hint">Separar por:</span>
          <label className="opcion">
            <input type="checkbox" id="eq-por-sexo" checked={porSexo} onChange={(e) => setPorSexo(e.target.checked)} />
            <span>Niñas y niños</span>
          </label>
          <label className="opcion">
            <input type="checkbox" id="eq-por-edad" checked={porEdad} onChange={(e) => setPorEdad(e.target.checked)} />
            <span>Edad</span>
          </label>
          <label className="opcion">
            <input type="checkbox" id="eq-por-casa" checked={porCasa} onChange={(e) => setPorCasa(e.target.checked)} />
            <span>Casa</span>
          </label>
          {porEdad && (
            <label className="edad-rango">
              Cortar en
              <input id="eq-cortes" value={cortesTxt} onChange={(e) => setCortesTxt(e.target.value)} placeholder="6, 11" />
              <span className="hint">= {rangos(cortes).map((r) => r.nombre).join(' / ')}</span>
            </label>
          )}
        </div>
      )}

      {grupos.length > 0 ? (
        <>
          <p className="hint">{elegido ? 'Ahora toca “Mover aquí” en el grupo al que lo quieres pasar.' : 'Si quieres cambiar a alguien de grupo, toca su nombre.'}</p>
          <div className="eq-grid">
            {grupos.map((g, i) => {
              const r = resumenGrupo(g);
              const tieneElegido = g.ninos.some((n) => n.id === elegido);
              return (
                <section key={g.nombre + i} className="eq-card" style={{ '--c': g.color }}>
                  <header>
                    <b>{g.nombre}</b>
                    <span>{r.total}</span>
                  </header>
                  <p className="hint">{textoResumen(r)}</p>
                  <ol>
                    {g.ninos.map((n) => {
                      const e = edadDe(n);
                      const s = sexoDe(n);
                      return (
                        <li key={n.id}>
                          <button type="button" className={`eq-nino${elegido === n.id ? ' on' : ''}`} onClick={() => setElegido(elegido === n.id ? '' : n.id)}>
                            <span className={`sx ${s === 'F' ? 'f' : s === 'M' ? 'm' : ''}`} aria-label={s === 'F' ? 'niña' : s === 'M' ? 'niño' : 'sin marcar'} />
                            <span className="nm">{n.nombre}</span>
                            {e != null && <span className="ed">{e}</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                  {elegido && !tieneElegido && (
                    <button type="button" className="mini solid mover" onClick={() => mover(i)}>
                      Mover aquí
                    </button>
                  )}
                </section>
              );
            })}
          </div>
          <div className="row-actions">
            <button type="button" className="mini solid" id="eq-pdf" disabled={ocupado} onClick={pdf}>
              {ocupado ? 'Armando…' : 'Descargar PDF'}
            </button>
            <button type="button" className="mini" id="eq-copiar" onClick={copiar}>
              Copiar para WhatsApp
            </button>
            <button type="button" className="mini" onClick={onCerrar}>
              Cerrar
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="hint">No hay niños con esos filtros.</p>
          <div className="row-actions">
            <button type="button" className="mini" onClick={onCerrar}>
              Cerrar
            </button>
          </div>
        </>
      )}
      {msg && <p className="hint">{msg}</p>}
    </div>
  );
}
