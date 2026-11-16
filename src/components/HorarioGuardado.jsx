import { useState } from 'react';
import { leerConexion, llamar } from '../lib/ninos.js';
import { MESES } from '../lib/text.js';
import { partesMes } from '../lib/horarioApp.js';

const nombre = (clave) => {
  const { anio, mes } = partesMes(clave);
  return `${MESES[mes][0].toUpperCase()}${MESES[mes].slice(1)} ${anio}`;
};

export default function HorarioGuardado({ onElegir }) {
  const [estado, setEstado] = useState('');
  const [meses, setMeses] = useState([]);
  const [msg, setMsg] = useState('');
  const abrir = async () => {
    const c = leerConexion();
    if (!c.url || !c.token) {
      setMsg('Primero entra con la clave en la pestaña Horario.');
      return;
    }
    setEstado('cargando');
    setMsg('');
    try {
      const r = await llamar(c.url, { accion: 'horarios', token: c.token });
      setMeses(r.meses || []);
      setEstado('lista');
      if (!(r.meses || []).length) setMsg('Todavía no hay horarios guardados en la pestaña Horario.');
    } catch (err) {
      setEstado('');
      setMsg(err.codigo === 'sesion' ? 'Vuelve a entrar con la clave en la pestaña Horario.' : err.message === 'Acción desconocida.' ? 'Falta actualizar el código de Google (Code.gs).' : 'No se pudo leer. Revisa tu internet.');
    }
  };
  const elegir = async (mes) => {
    const c = leerConexion();
    setEstado('cargando');
    try {
      const r = await llamar(c.url, { accion: 'horario', mes, token: c.token });
      onElegir(mes, r.datos.horario, r.datos.config);
      setEstado('');
      setMeses([]);
    } catch (err) {
      setEstado('lista');
      setMsg('No se pudo leer ese mes. Intenta otra vez.');
    }
  };
  return (
    <div className="h-usar">
      {estado !== 'lista' && (
        <button type="button" className="btn-link" id="usar-horario-app" disabled={estado === 'cargando'} onClick={abrir}>
          {estado === 'cargando' ? 'Buscando…' : 'o usa el horario guardado en la pestaña Horario'}
        </button>
      )}
      {estado === 'lista' && meses.length > 0 && (
        <>
          <span className="hint">¿Qué mes?</span>
          {meses.slice(0, 6).map((m) => (
            <button key={m.mes} type="button" className="mini" data-mes={m.mes} onClick={() => elegir(m.mes)}>
              {nombre(m.mes)}
            </button>
          ))}
        </>
      )}
      {msg && <span className="hint">{msg}</span>}
    </div>
  );
}
