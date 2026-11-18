import { useState } from 'react';
import { NinosError, guardarUrl, guardarSesion, llamar, urlValida } from '../lib/ninos.js';

function Candado() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

const TXT = {
  es: { url: 'La dirección debe ser la de la implementación de Google y terminar en /exec.', falta: 'Escribe la clave.', no: 'No se pudo entrar.', titulo: 'Esta sección tiene clave', dir: 'Dirección de la hoja de Google', conectado: 'Conectado a la hoja de niños.', cambiar: 'Cambiar dirección', clave: 'Clave', entrar: 'Entrar' },
  en: { url: 'The address must be the Google deployment one and end in /exec.', falta: 'Type the password.', no: "Couldn't sign in.", titulo: 'This needs the password', dir: 'Google Sheet address', conectado: 'Connected to the Hacienda sheet.', cambiar: 'Change address', clave: 'Password', entrar: 'Enter' }
};

export default function Entrar({ url, onEntrar, mensaje, texto, idioma = 'es' }) {
  const L = TXT[idioma] || TXT.es;
  const [u, setU] = useState(url);
  const [clave, setClave] = useState('');
  const [cambiarUrl, setCambiarUrl] = useState(!url);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (!urlValida(u)) return setError(L.url);
    if (!clave) return setError(L.falta);
    setCargando(true);
    try {
      const r = await llamar(u, { accion: 'entrar', clave });
      guardarUrl(u);
      guardarSesion(r.token, r.expira);
      setClave('');
      onEntrar({ url: u.trim(), token: r.token, expira: r.expira });
    } catch (err) {
      setError(err instanceof NinosError ? err.message : L.no);
    } finally {
      setCargando(false);
    }
  };
  return (
    <form className="lock" onSubmit={enviar}>
      <div className="lock-ic">
        <Candado />
      </div>
      <h3>{L.titulo}</h3>
      <p className="hint">{texto || 'La información de los niños solo la ven las personas que tienen la clave. Este dispositivo la va a recordar 30 días.'}</p>
      {mensaje && <div className="alert warn">{mensaje}</div>}
      {cambiarUrl ? (
        <label className="campo">
          {L.dir}
          <input id="ninos-url" value={u} onChange={(e) => setU(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" autoComplete="off" spellCheck="false" />
        </label>
      ) : (
        <p className="hint">
          {L.conectado}{' '}
          <button type="button" className="btn-link" onClick={() => setCambiarUrl(true)}>
            {L.cambiar}
          </button>
        </p>
      )}
      <label className="campo">
        {L.clave}
        <input id="ninos-clave" type="password" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="current-password" autoFocus={!cambiarUrl} />
      </label>
      {error && (
        <p className="err-txt" role="alert">
          {error}
        </p>
      )}
      <button className="dl" disabled={cargando}>
        {cargando && <span className="spin" aria-hidden="true" />}
        {L.entrar}
      </button>
    </form>
  );
}
