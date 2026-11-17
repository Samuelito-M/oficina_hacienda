import { useMemo, useState } from 'react';
import { resumenTallas, tallasViejas, textoTallas, leerSistema, guardarSistema } from '../../lib/tallas.js';
import Sistema from './Sistema.jsx';

function Tabla({ titulo, datos }) {
  return (
    <div className="panel">
      <h3>{titulo}</h3>
      <div className="tbox">
        <table className="tallas">
          <thead>
            <tr>
              <th>Talla</th>
              <th className="n">Niños</th>
              <th>Quiénes</th>
            </tr>
          </thead>
          <tbody>
            {datos.lista.map((g) => (
              <tr key={g.k}>
                <td>
                  <b>{g.talla}</b>
                </td>
                <td className="n">{g.n}</td>
                <td className="hint">{g.nombres.join(', ')}</td>
              </tr>
            ))}
            {datos.sin > 0 && (
              <tr>
                <td className="hint">Sin talla</td>
                <td className="n">{datos.sin}</td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Tallas({ lista, filtro, onEditar, onCerrar }) {
  const [sis, setSis] = useState(() => leerSistema('resumen', 'ambas'));
  const r = useMemo(() => resumenTallas(lista, sis), [lista, sis]);
  const viejas = useMemo(() => tallasViejas(lista), [lista]);
  const [msg, setMsg] = useState('');
  const titulo = `Tallas${filtro ? ` · ${filtro}` : ''} (${lista.length} niños)`;
  const copiar = async () => {
    const t = textoTallas(r, titulo);
    try {
      await navigator.clipboard.writeText(t);
      setMsg('Copiado. Ya puedes pegarlo en WhatsApp o en un correo.');
    } catch {
      setMsg('No se pudo copiar automáticamente. Selecciona el texto de las tablas y cópialo.');
    }
  };
  return (
    <div className="ficha">
      <h4>{titulo}</h4>
      <p className="hint">Cuenta los niños que se ven ahora en la lista. Filtra por casa para ver solo una.</p>
      {viejas.length > 0 && (
        <div className="alert warn">
          <b>
            {viejas.length === 1 ? 'Una talla' : `${viejas.length} tallas`} sin actualizar hace más de 6 meses
          </b>
          <ul className="review">
            {viejas.map((n) => (
              <li key={n.id}>
                {n.nombre}: hace {n.meses} meses.{' '}
                <button type="button" className="btn-link" onClick={() => onEditar(n)}>
                  Actualizar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Sistema
        valor={sis}
        onCambio={(v) => {
          setSis(v);
          guardarSistema('resumen', v);
        }}
        id="sis-res"
      />
      {r.partes.map((p) => (
        <div className="cols" key={p.s}>
          <Tabla titulo={`Ropa · ${p.nombre}`} datos={p.ropa} />
          <Tabla titulo={`Zapatos · ${p.nombre}`} datos={p.zapatos} />
        </div>
      ))}
      <div className="row-actions">
        <button type="button" className="mini solid" onClick={copiar}>
          Copiar resumen
        </button>
        <button type="button" className="mini" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
      {msg && <p className="hint">{msg}</p>}
    </div>
  );
}
