import { useRef, useState } from 'react';
import { CASAS, PERSONAL_BASE, cedulaValida, normalizarPersonal, nuevaPersona } from '../lib/personal.js';
import { squash } from '../lib/text.js';
import { descargar, leerBytes } from '../lib/archivos.js';

function Celda({ valor, onCambio, ...rest }) {
  const [v, setV] = useState(valor);
  const [prev, setPrev] = useState(valor);
  if (valor !== prev) {
    setPrev(valor);
    setV(valor);
  }
  return <input value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== valor && onCambio(v)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} {...rest} />;
}

export default function Personal({ personal, setPersonal }) {
  const [msg, setMsg] = useState('');
  const [borrar, setBorrar] = useState(null);
  const archivo = useRef(null);
  const base = new Set(PERSONAL_BASE.map((p) => p.id));
  const cambiar = (id, cambios) => setPersonal(personal.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
  const conCedula = personal.filter((p) => cedulaValida(p.cedula)).length;
  return (
    <details className="box">
      <summary>
        Personal <span>{personal.length} personas · {conCedula} con cédula guardada</span>
      </summary>
      <div className="box-body">
        <p className="hint">
          Esto se guarda en este navegador. El nombre corto es como sale en el horario. Si en el horario lo escriben de otra forma, agrégala en “Otras formas”, separadas por coma. Los fijos llevan acuerdo automático y los padres de casa deciden qué casas necesitan cambio de casa.
        </p>
        <div className="tbox">
          <table className="ptable">
            <thead>
              <tr>
                <th>Nombre corto</th>
                <th>Otras formas</th>
                <th>Apellidos y nombres</th>
                <th>Cédula</th>
                <th>Fijo</th>
                <th>Padre o madre de</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {personal.map((p) => (
                <tr key={p.id}>
                  <td style={{ minWidth: 110 }}>
                    <Celda valor={p.nombre} onCambio={(v) => v.trim() && cambiar(p.id, { nombre: v.trim() })} aria-label="Nombre corto" />
                  </td>
                  <td style={{ minWidth: 140 }}>
                    <Celda
                      valor={(p.alias || []).join(', ')}
                      onCambio={(v) => cambiar(p.id, { alias: Array.from(new Set(v.split(',').map(squash).filter(Boolean))) })}
                      aria-label="Otras formas de escribirlo"
                    />
                  </td>
                  <td style={{ minWidth: 190 }}>
                    <Celda valor={p.completo || ''} onCambio={(v) => cambiar(p.id, { completo: v.replace(/\s+/g, ' ').trim() })} aria-label="Apellidos y nombres" placeholder="Como va en el acuerdo" />
                  </td>
                  <td style={{ minWidth: 120 }}>
                    <Celda
                      valor={p.cedula || ''}
                      className={p.cedula && !cedulaValida(p.cedula) ? 'mono bad' : 'mono'}
                      onCambio={(v) => {
                        const c = v.replace(/\D/g, '');
                        if (c && !cedulaValida(c)) setMsg(`La cédula de ${p.nombre} debe tener 10 números.`);
                        else setMsg('');
                        cambiar(p.id, { cedula: c });
                      }}
                      inputMode="numeric"
                      aria-label="Cédula"
                    />
                  </td>
                  <td>
                    <input type="checkbox" checked={!!p.fijo} onChange={(e) => cambiar(p.id, { fijo: e.target.checked })} aria-label={`${p.nombre} es fijo`} />
                  </td>
                  <td style={{ minWidth: 120 }}>
                    <select value={p.casa || ''} onChange={(e) => cambiar(p.id, { casa: e.target.value })} aria-label={`Casa de ${p.nombre}`}>
                      <option value="">—</option>
                      {CASAS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {!base.has(p.id) &&
                      (borrar === p.id ? (
                        <span className="row-actions">
                          <button
                            className="mini danger"
                            onClick={() => {
                              setPersonal(personal.filter((x) => x.id !== p.id));
                              setBorrar(null);
                            }}
                          >
                            Sí, quitar
                          </button>
                          <button className="mini" onClick={() => setBorrar(null)}>
                            No
                          </button>
                        </span>
                      ) : (
                        <button className="mini" onClick={() => setBorrar(p.id)}>
                          Quitar
                        </button>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {msg && <p className="hint" style={{ color: '#b3261e' }}>{msg}</p>}
        <div className="row-actions">
          <button className="mini solid" onClick={() => setPersonal([...personal, nuevaPersona(personal, `Persona ${personal.length + 1}`)])}>
            Agregar persona
          </button>
          <button
            className="mini"
            onClick={() => {
              const hoy = new Date();
              descargar(new TextEncoder().encode(JSON.stringify(personal, null, 2)), `Personal Hacienda ${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}.json`, 'application/json');
              setMsg('Copia guardada en tu carpeta de Descargas.');
            }}
          >
            Guardar copia
          </button>
          <button className="mini" onClick={() => archivo.current && archivo.current.click()}>
            Cargar copia
          </button>
          <input
            ref={archivo}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files && e.target.files[0];
              e.target.value = '';
              if (!f) return;
              try {
                const datos = JSON.parse(new TextDecoder().decode(await leerBytes(f)));
                if (!Array.isArray(datos)) throw new Error();
                setPersonal(normalizarPersonal(datos));
                setMsg('Copia cargada.');
              } catch {
                setMsg('Ese archivo no es una copia del personal.');
              }
            }}
          />
        </div>
      </div>
    </details>
  );
}
