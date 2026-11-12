import { useState } from 'react';
import Foto from './Foto.jsx';
import { COLORES_CASA } from '../../lib/documentos.js';

function Tarjeta({ casa, datos, foto, puede, onGuardar, onFoto, onQuitarFoto, guardando }) {
  const [padres, setPadres] = useState(datos?.padres || '');
  const [bio, setBio] = useState(datos?.bio || '');
  const [ok, setOk] = useState('');
  const cambio = padres !== (datos?.padres || '') || bio !== (datos?.bio || '');
  return (
    <div className="casa-card" style={{ '--casa': COLORES_CASA[casa] || 'var(--accent)' }}>
      <h4>{casa}</h4>
      <Foto url={foto} iniciales={casa.replace('Casa ', '')} puede={puede} guardadoAntes={!!datos} apaisada etiqueta="Foto de los padres de casa" onSubir={onFoto} onQuitar={onQuitarFoto} />
      {puede && !datos && <p className="hint">Guarda los nombres primero para poder subir la foto.</p>}
      <label className="campo">
        Padres de casa
        <input value={padres} onChange={(e) => setPadres(e.target.value)} placeholder="Ej. Miguel y Paty" disabled={!puede} />
      </label>
      <label className="campo">
        Biografía (sale en el directorio)
        <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Ej. Miguel and Patty have been serving as house parents at HOH since 2017…" disabled={!puede} />
      </label>
      <div className="row-actions">
        <button
          type="button"
          className="mini solid"
          disabled={!puede || guardando || (!cambio && !!datos)}
          onClick={async () => {
            setOk('');
            if (await onGuardar({ casa, padres, bio })) setOk('Guardado.');
          }}
        >
          Guardar
        </button>
        {ok && <span className="hint">{ok}</span>}
      </div>
    </div>
  );
}

export default function Casas({ casas, casasData, fotos, puede, guardando, onGuardar, onFoto, onQuitarFoto, onCerrar }) {
  const porCasa = new Map(casasData.map((c) => [c.casa, c]));
  return (
    <div className="ficha">
      <h4>Casas y padres de casa</h4>
      <p className="hint">Esto sale en la primera página de cada casa en el directorio. Escribe la biografía en el idioma en que vas a sacar el directorio.</p>
      {!puede && <div className="alert warn">Para guardar casas y fotos, primero actualiza el código de Google (Code.gs) con la versión nueva.</div>}
      <div className="casas-grid">
        {casas.map((c) => (
          <Tarjeta
            key={c + (porCasa.get(c)?.actualizado || '')}
            casa={c}
            datos={porCasa.get(c)}
            foto={fotos[`casa:${c}`]}
            puede={puede}
            guardando={guardando}
            onGuardar={onGuardar}
            onFoto={(data) => onFoto(c, data)}
            onQuitarFoto={() => onQuitarFoto(c)}
          />
        ))}
      </div>
      <div className="row-actions">
        <button type="button" className="mini" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
