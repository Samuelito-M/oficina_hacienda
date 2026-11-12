import { useRef, useState } from 'react';
import { prepararFoto } from '../../lib/fotos.js';

export default function Foto({ url, iniciales, puede, guardadoAntes, onSubir, onQuitar, apaisada = false, etiqueta = 'Foto' }) {
  const input = useRef(null);
  const [estado, setEstado] = useState('');
  const [error, setError] = useState('');
  const elegir = async (f) => {
    if (!f) return;
    setError('');
    setEstado('subiendo');
    try {
      const data = await prepararFoto(f, apaisada ? { ancho: 400, alto: 300 } : { ancho: 300, alto: 400 });
      await onSubir(data);
    } catch (e) {
      setError(e.message || 'No se pudo subir la foto.');
    } finally {
      setEstado('');
    }
  };
  return (
    <div className={`foto-box ${apaisada ? 'apaisada' : ''}`}>
      <div className="foto-marco">{url ? <img src={url} alt={etiqueta} /> : <span>{iniciales || '?'}</span>}</div>
      <div className="foto-acciones">
        <b>{etiqueta}</b>
        {!puede && <span className="hint">Actualiza el código de Google para guardar fotos.</span>}
        {puede && !guardadoAntes && <span className="hint">Guarda primero y luego agrega la foto.</span>}
        {puede && guardadoAntes && (
          <div className="row-actions">
            <button type="button" className="mini" disabled={!!estado} onClick={() => input.current && input.current.click()}>
              {estado ? 'Subiendo…' : url ? 'Cambiar foto' : 'Subir foto'}
            </button>
            {url && (
              <button type="button" className="mini danger" disabled={!!estado} onClick={onQuitar}>
                Quitar
              </button>
            )}
          </div>
        )}
        {error && <span className="err-txt">{error}</span>}
        <input
          ref={input}
          type="file"
          hidden
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            e.target.value = '';
            elegir(f);
          }}
        />
      </div>
    </div>
  );
}
