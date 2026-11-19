import { useEffect, useMemo, useState } from 'react';
import Entrar from '../components/Entrar.jsx';
import { leerConexion } from '../lib/ninos.js';
import { MESES } from '../lib/text.js';
import { descargar, MIME } from '../lib/archivos.js';
import { trabajaEn, mesDe } from '../lib/personal.js';
import { TIPOS, MAX_NOTA_AUS, esFecha, diasEntre, agregarAus, quitarAus, reporte, reporteCsv, nombreTipo, cortoTipo, rangoTexto } from '../lib/ausencias.js';

const Cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Control({ personal, setPersonal, nube, avisar }) {
  const [con, setCon] = useState(leerConexion);
  useEffect(() => {
    const f = () => setCon(leerConexion());
    window.addEventListener('oficina-sesion', f);
    return () => window.removeEventListener('oficina-sesion', f);
  }, []);
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState('todo');
  const [abierta, setAbierta] = useState('');
  const [id, setId] = useState('');
  const [tipo, setTipo] = useState('vac');
  const [de, setDe] = useState('');
  const [a, setA] = useState('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');
  const [verTodos, setVerTodos] = useState(false);

  const m = mes === 'todo' ? null : +mes;
  const r = useMemo(() => reporte(personal, anio, m), [personal, anio, m]);
  const finPeriodo = r.a.slice(0, 7);
  const filas = r.filas.filter((f) => {
    const p = personal.find((x) => x.id === f.id);
    return f.veces > 0 || (verTodos && p && trabajaEn(p, finPeriodo));
  });
  const gente = personal.filter((p) => trabajaEn(p, mesDe(hoy)));
  const titulo = m == null ? `Control de personal · año ${anio}` : `Control de personal · ${Cap(MESES[m])} ${anio}`;
  const anios = [];
  for (let y = hoy.getFullYear() + 1; y >= hoy.getFullYear() - 5; y--) anios.push(y);

  if (!con.url || !con.token) {
    return (
      <section className="wrap" aria-labelledby="t-control">
        <div className="intro">
          <h2 id="t-control">Control de personal</h2>
          <p>Aquí ves cuántos días tomó de vacaciones cada persona y cuántos faltó, y por qué. Es información delicada, por eso pide la clave.</p>
        </div>
        <Entrar url={con.url} mensaje="" texto="Usa la misma clave de Niños. Este dispositivo la va a recordar 30 días." onEntrar={(c) => setCon(c)} />
      </section>
    );
  }

  const agregar = () => {
    if (!id) return setError('Escoge a la persona.');
    if (!esFecha(de)) return setError('Escoge la fecha de inicio. Si es un solo día, deja “hasta” vacío.');
    const fin = a || de;
    if (!esFecha(fin) || fin < de) return setError('La fecha final no puede ser antes de la inicial.');
    if (diasEntre(de, fin) > 800) return setError('Ese rango es demasiado largo.');
    setPersonal(agregarAus(personal, id, { t: tipo, de, a: fin, n: nota }));
    setDe('');
    setA('');
    setNota('');
    setError('');
    avisar('Ausencia guardada. Si tocaba trabajar esos días, revisa el horario de ese mes.');
  };

  const bajar = () => {
    descargar(new Blob([reporteCsv({ ...r, filas }, titulo)], { type: 'text/csv;charset=utf-8' }), `${titulo.replace(/[^\wáéíóúñÁÉÍÓÚÑ]+/g, ' ').trim()}.csv`, 'text/csv');
  };

  return (
    <section className="wrap" aria-labelledby="t-control">
      <div className="intro">
        <h2 id="t-control">Control de personal</h2>
        <p>Días de vacaciones tomados y días que faltó cada persona, con el motivo. Los días se cuentan completos, con fines de semana. Todo lo que pones en Horario como ausencia aparece aquí solo.</p>
      </div>

      {nube && nube.estado === 'ok' && nube.version > 0 && nube.version < 8 && (
        <div className="alert warn" id="ct-viejo">
          Falta actualizar el código de Google (versión 8). Hasta entonces las ausencias solo se guardan en este navegador y no se ven en otras computadoras. Los pasos están en el README, en “Actualizar el código de Google”.
        </div>
      )}
      {nube && nube.estado === 'error' && <div className="alert warn">No se pudo conectar con Google. Lo que anotes se guarda en este navegador y se sube cuando vuelva el internet.</div>}

      <div className="ct-filtro">
        <label>
          Año
          <select id="ct-anio" value={anio} onChange={(e) => setAnio(+e.target.value)}>
            {anios.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label>
          Periodo
          <select id="ct-mes" value={mes} onChange={(e) => setMes(e.target.value)}>
            <option value="todo">Todo el año</option>
            {MESES.map((n, i) => (
              <option key={n} value={i}>
                {Cap(n)}
              </option>
            ))}
          </select>
        </label>
        <label className="ct-chk">
          <input type="checkbox" checked={verTodos} onChange={(e) => setVerTodos(e.target.checked)} /> Mostrar también a quien no tiene ausencias
        </label>
      </div>

      <div className="ct-resumen" id="ct-resumen">
        <div>
          <b>{r.total.vac}</b>
          <span>días de vacaciones</span>
        </div>
        <div>
          <b>{r.total.dias - r.total.vac}</b>
          <span>días de ausencia</span>
        </div>
        <div>
          <b>{r.total.med}</b>
          <span>médicas</span>
        </div>
        <div>
          <b>{r.total.fam}</b>
          <span>familiares</span>
        </div>
        <div>
          <b>{r.total.lic}</b>
          <span>licencias</span>
        </div>
      </div>

      <div className="ct-tabla" role="region" aria-label="Reporte por persona" tabIndex={0}>
        <table id="ct-tabla">
          <thead>
            <tr>
              <th>Persona</th>
              <th>Vacaciones</th>
              <th>Médica</th>
              <th>Familiar</th>
              <th>Licencia</th>
              <th>Otro</th>
              <th>Total días</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <FilaPersona key={f.id} f={f} abierta={abierta === f.id} onAbrir={() => setAbierta(abierta === f.id ? '' : f.id)} onQuitar={(d) => setPersonal(quitarAus(personal, f.id, { t: d.t, de: d.completa.de, a: d.completa.a, n: d.n }))} />
            ))}
            {!filas.length && (
              <tr>
                <td colSpan={7} className="hint">
                  Nadie tiene ausencias en este periodo.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <th>Total</th>
              <th>{r.total.vac}</th>
              <th>{r.total.med}</th>
              <th>{r.total.fam}</th>
              <th>{r.total.lic}</th>
              <th>{r.total.otro}</th>
              <th>{r.total.dias}</th>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="hint">Toca el nombre de una persona para ver sus fechas y quitar una ausencia si se anotó mal.</p>
      <div className="ct-acc">
        <button type="button" className="dl ghost" id="ct-csv" onClick={bajar}>
          Descargar para Excel
        </button>
        <button type="button" className="dl ghost" id="ct-imprimir" onClick={() => window.print()}>
          Imprimir
        </button>
      </div>

      <div className="ct-form" id="ct-form">
        <h3>Anotar una ausencia</h3>
        <p className="hint">Sirve para lo que ya pasó o lo que viene. Para el motivo escoge una categoría; en la nota pon algo corto, sin diagnósticos.</p>
        <div className="ct-fila">
          <select id="ct-quien" value={id} onChange={(e) => setId(e.target.value)} aria-label="Persona">
            <option value="">Persona…</option>
            {gente.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <select id="ct-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Motivo">
            {TIPOS.map((t) => (
              <option key={t.k} value={t.k}>
                {t.n}
              </option>
            ))}
          </select>
        </div>
        <div className="ct-fila">
          <label>
            Desde <input id="ct-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </label>
          <label>
            Hasta <input id="ct-a" type="date" value={a} onChange={(e) => setA(e.target.value)} />
          </label>
        </div>
        <div className="ct-fila">
          <input id="ct-nota" type="text" maxLength={MAX_NOTA_AUS} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota (opcional)" aria-label="Nota" />
          <button type="button" className="dl" id="ct-ok" onClick={agregar}>
            Guardar ausencia
          </button>
        </div>
        {error && <p className="ct-err" role="alert">{error}</p>}
      </div>
    </section>
  );
}

function FilaPersona({ f, abierta, onAbrir, onQuitar }) {
  return (
    <>
      <tr className={f.veces ? 'ct-con' : ''}>
        <td>
          <button type="button" className="ct-nombre" onClick={onAbrir} aria-expanded={abierta} disabled={!f.veces}>
            {f.nombre}
          </button>
        </td>
        <td>{f.vac || '–'}</td>
        <td>{f.med || '–'}</td>
        <td>{f.fam || '–'}</td>
        <td>{f.lic || '–'}</td>
        <td>{f.otro || '–'}</td>
        <td>
          <b>{f.dias || '–'}</b>
        </td>
      </tr>
      {abierta && f.detalle.length > 0 && (
        <tr className="ct-det">
          <td colSpan={7}>
            <ul>
              {f.detalle.map((d, i) => (
                <li key={i}>
                  <span>
                    <b>{cortoTipo(d.t)}</b> · {nombreTipo(d.t)} · {rangoTexto(d.de, d.a)} · {d.dias} {d.dias === 1 ? 'día' : 'días'}
                    {d.completa.de !== d.de || d.completa.a !== d.a ? ` (la ausencia completa es del ${rangoTexto(d.completa.de, d.completa.a)})` : ''}
                    {d.n ? ` · ${d.n}` : ''}
                  </span>
                  <button type="button" className="h-x" onClick={() => onQuitar(d)}>
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}
