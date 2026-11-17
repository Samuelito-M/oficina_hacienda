import { SISTEMAS } from '../../lib/tallas.js';

export default function Sistema({ valor, onCambio, id, etiqueta = 'Tallas' }) {
  return (
    <div className="sistema">
      <span className="hint">{etiqueta}:</span>
      <div className="seg" role="group" aria-label={etiqueta}>
        {SISTEMAS.map(([k, t]) => (
          <button key={k} type="button" id={`${id}-${k}`} aria-pressed={valor === k} onClick={() => onCambio(k)}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
