import { useMemo, useState } from 'react';
import { finDeSemanaCorto, capitalize } from '../lib/text.js';
import { nuevaPersona } from '../lib/personal.js';

function Fila({ u, personal, setPersonal }) {
  const [destino, setDestino] = useState('__nueva');
  const [nombre, setNombre] = useState(capitalize(u.texto));
  return (
    <li className="unk">
      <b>“{u.texto}”</b> en {u.donde.join(', ')}.
      <select value={destino} onChange={(e) => setDestino(e.target.value)} aria-label={`Quién es ${u.texto}`} className="mini">
        <option value="__nueva">Es una persona nueva</option>
        {personal.map((p) => (
          <option key={p.id} value={p.id}>
            Es {p.nombre} escrito de otra forma
          </option>
        ))}
      </select>
      {destino === '__nueva' && <input className="mini" value={nombre} onChange={(e) => setNombre(e.target.value)} aria-label="Nombre como se muestra" />}
      <button
        className="mini solid"
        onClick={() => {
          if (destino === '__nueva') {
            if (!nombre.trim()) return;
            setPersonal([...personal, nuevaPersona(personal, nombre, [u.texto])]);
          } else {
            setPersonal(personal.map((p) => (p.id === destino ? { ...p, alias: Array.from(new Set([...(p.alias || []), u.texto])) } : p)));
          }
        }}
      >
        Guardar
      </button>
    </li>
  );
}

export default function Desconocidos({ analisis, personal, setPersonal }) {
  const items = useMemo(() => {
    const m = new Map();
    for (const f of analisis.findes) {
      for (const d of f.desconocidos) {
        if (!m.has(d.texto)) m.set(d.texto, { texto: d.texto, donde: [] });
        m.get(d.texto).donde.push(`${d.casa} (${finDeSemanaCorto(f.sabado)})`);
      }
    }
    return Array.from(m.values());
  }, [analisis]);
  if (!items.length) return null;
  return (
    <div className="alert warn" role="status">
      <b>Hay {items.length === 1 ? 'un nombre que no conozco' : `${items.length} nombres que no conozco`} en los fines de semana</b>
      <span>Dime quién es y lo guardo para siempre. Mientras tanto no aparece en los acuerdos ni en los cambios de casa.</span>
      <ul className="review">
        {items.map((u) => (
          <Fila key={u.texto} u={u} personal={personal} setPersonal={setPersonal} />
        ))}
      </ul>
    </div>
  );
}
