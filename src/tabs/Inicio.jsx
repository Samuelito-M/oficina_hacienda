import { useEffect, useMemo, useState } from 'react';
import Entrar from '../components/Entrar.jsx';
import { borrarSesion, leerConexion, llamar } from '../lib/ninos.js';
import { mesHoy } from '../lib/personal.js';
import { resumenInicio } from '../lib/inicio.js';
import { MESES, viernesADomingo } from '../lib/text.js';
import { COLOR_PUESTO } from '../lib/horarioApp.js';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const cuando = (c) => (c.falta === 0 ? 'hoy' : c.falta === 1 ? 'mañana' : `el ${DIAS[c.fecha.getDay()]} ${c.fecha.getDate()} de ${MESES[c.fecha.getMonth()]}`);
const lista = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);

function Tarjeta({ id, titulo, icono, children, tono }) {
  return (
    <section className={`ini-card${tono ? ` ${tono}` : ''}`} id={id} aria-labelledby={`${id}-t`}>
      <h3 id={`${id}-t`}>
        <span aria-hidden="true">{icono}</span>
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Instalar() {
  const [prompt, setPrompt] = useState(() => (typeof window !== 'undefined' ? window.__instalar || null : null));
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const f = () => setPrompt(window.__instalar || null);
    window.addEventListener('oficina-instalable', f);
    return () => window.removeEventListener('oficina-instalable', f);
  }, []);
  let app = false;
  try {
    app = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  } catch {
    app = false;
  }
  if (app || listo) return null;
  if (prompt)
    return (
      <button
        type="button"
        className="btn-link ini-instalar"
        id="ini-instalar"
        onClick={async () => {
          prompt.prompt();
          try {
            await prompt.userChoice;
          } catch {
            return;
          }
          window.__instalar = null;
          setListo(true);
        }}
      >
        📱 Instalar la app en este dispositivo
      </button>
    );
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  return (
    <p className="ini-instalar" id="ini-instalar">
      📱 {ios ? 'Para tenerla como app en el iPhone: toca Compartir (el cuadrito con la flecha) y luego “Agregar a inicio”.' : 'Para tenerla como app en el celular: en Android, abre esta página en Chrome, toca ⋮ y luego “Instalar app”. En iPhone, Compartir y “Agregar a inicio”.'}
    </p>
  );
}

export default function Inicio({ personal, onHorarioApp, irAHorario }) {
  const [con, setCon] = useState(leerConexion);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState('');
  const [datos, setDatos] = useState(null);
  const [mensajeClave, setMensajeClave] = useState('');
  const mes = mesHoy();

  useEffect(() => {
    const f = () => setCon(leerConexion());
    window.addEventListener('oficina-sesion', f);
    return () => window.removeEventListener('oficina-sesion', f);
  }, []);

  useEffect(() => {
    if (!con.token) return;
    let vivo = true;
    setEstado('cargando');
    llamar(con.url, { accion: 'inicio', mes, token: con.token })
      .then((r) => {
        if (!vivo) return;
        setDatos(r.datos);
        setEstado('listo');
      })
      .catch((err) => {
        if (!vivo) return;
        if (err.codigo === 'sesion') {
          setMensajeClave(err.message);
          borrarSesion();
          return;
        }
        setError(err.message === 'Acción desconocida.' ? 'viejo' : err.message || 'No se pudo cargar.');
        setEstado('error');
      });
    return () => {
      vivo = false;
    };
  }, [con.token, con.url, mes]);

  const r = useMemo(() => (datos ? resumenInicio({ hoy: new Date(), mes, ...datos, personal }) : null), [datos, personal, mes]);

  const intro = (
    <div className="intro">
      <h2 id="t-inicio">Esta semana</h2>
      <p>Lo que toca hacer en la oficina, en un solo lugar.</p>
    </div>
  );

  if (!con.token)
    return (
      <section className="wrap" aria-labelledby="t-inicio">
        {intro}
        <Entrar url={con.url} mensaje={mensajeClave} texto="Con la misma clave de Niños y Horario. Este dispositivo la va a recordar 30 días." onEntrar={(c) => setCon(c)} />
        <Instalar />
      </section>
    );

  if (estado === 'error')
    return (
      <section className="wrap" aria-labelledby="t-inicio">
        {intro}
        <div className="alert warn">{error === 'viejo' ? 'Para ver el Inicio falta actualizar el código de Google a la versión 6. Las demás pestañas funcionan normal.' : error}</div>
      </section>
    );

  if (!r)
    return (
      <section className="wrap" aria-labelledby="t-inicio">
        {intro}
        <p className="hint">Cargando…</p>
      </section>
    );

  const { finde, acuerdos, cumples, siguiente, copia } = r;
  const preparar = (tab) => {
    const clave = finde.mesFinde;
    if (finde.horario) onHorarioApp(clave, finde.horario, r.config);
    location.hash = `#${tab}`;
  };
  const rango = viernesADomingo(finde.sabado);

  return (
    <section className="wrap ini" aria-labelledby="t-inicio">
      {intro}
      <div className="ini-grid">
        <Tarjeta id="ini-finde" icono="🏠" titulo="Este fin de semana">
          <p className="ini-fecha">{rango}</p>
          {!finde.conHorario || !finde.casas.length ? (
            <>
              <p>Todavía no hay horario guardado para este fin de semana.</p>
              <button type="button" className="ini-btn" onClick={() => irAHorario(finde.mesFinde)}>
                Ir al horario
              </button>
            </>
          ) : (
            <>
              <ul className="ini-casas">
                {finde.casas.map((c) => (
                  <li key={c.casa}>
                    <i style={{ background: COLOR_PUESTO[c.casa] }} />
                    <b>{c.casa}</b>
                    <span>{lista(c.nombres)}</span>
                  </li>
                ))}
              </ul>
              {finde.oncall.length > 0 && <p className="hint">On call de viernes a jueves: {lista(finde.oncall)}</p>}
            </>
          )}
        </Tarjeta>

        {finde.conHorario && finde.casas.length > 0 && (
          <Tarjeta id="ini-acuerdos" icono="📝" titulo="Acuerdos de este fin de semana" tono={acuerdos.faltanCedula.length ? 'pend' : ''}>
            <p>
              {acuerdos.personas.length} {acuerdos.personas.length === 1 ? 'persona trabaja' : 'personas trabajan'}: {acuerdos.personas.filter((p) => p.fijo).length} fijos y {acuerdos.personas.filter((p) => !p.fijo).length} que pueden llevar acuerdo extra.
            </p>
            {acuerdos.faltanCedula.length > 0 && <p className="ini-pend">Falta la cédula de {lista(acuerdos.faltanCedula)}. Ponla en Acuerdos → Personal.</p>}
            <button type="button" className="ini-btn" id="ini-hacer-acuerdos" onClick={() => preparar('acuerdos')}>
              Hacer los acuerdos
            </button>
          </Tarjeta>
        )}

        {finde.conHorario && finde.casas.length > 0 && (
          <Tarjeta id="ini-cambio" icono="🔁" titulo="Cambio de casa" tono={finde.cambios.length ? 'pend' : 'bien'}>
            {finde.cambios.length ? (
              <p>
                {finde.cambios.length === 1 ? 'Necesita hoja de cambio de casa:' : 'Necesitan hoja de cambio de casa:'} <b>{lista(finde.cambios)}</b>. Ahí no están los padres de casa.
              </p>
            ) : (
              <p>✓ Este fin de semana todos los padres de casa están en su casa. No hace falta cambio de casa.</p>
            )}
            {finde.cambios.length > 0 && (
              <button type="button" className="ini-btn" id="ini-hacer-cambio" onClick={() => preparar('casas')}>
                Hacer las hojas
              </button>
            )}
          </Tarjeta>
        )}

        <Tarjeta id="ini-cumples" icono="🎂" titulo="Cumpleaños de los niños">
          {cumples.length ? (
            <ul className="ini-cumples">
              {cumples.map((c) => (
                <li key={c.nombre + c.fecha} className={c.falta === 0 ? 'hoy' : ''}>
                  <b>{c.nombre}</b> cumple {c.edad} {cuando(c)}
                  {c.casa && <span className="hint"> · {c.casa}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p>Nadie cumple años en las próximas dos semanas.</p>
          )}
        </Tarjeta>

        <Tarjeta id="ini-horario" icono="📅" titulo="Horario" tono={!siguiente.hecho && siguiente.urgente ? 'pend' : ''}>
          {r.mes.hecho ? (
            <p>
              ✓ {r.mes.nombre[0].toUpperCase() + r.mes.nombre.slice(1)} está guardado
              {r.mes.revisar > 0 ? ` · ${r.mes.revisar} ${r.mes.revisar === 1 ? 'cosa' : 'cosas'} para revisar` : ''}.
            </p>
          ) : (
            <p>{r.mes.nombre[0].toUpperCase() + r.mes.nombre.slice(1)} todavía no tiene horario guardado.</p>
          )}
          {siguiente.hecho ? (
            <p>✓ {siguiente.nombre[0].toUpperCase() + siguiente.nombre.slice(1)} ya está hecho.</p>
          ) : (
            <>
              <p className={siguiente.urgente ? 'ini-pend' : ''}>Falta hacer el horario de {siguiente.nombre}.</p>
              <button type="button" className="ini-btn" id="ini-hacer-horario" onClick={() => irAHorario(siguiente.clave)}>
                Hacer el de {siguiente.nombre.split(' ')[0]}
              </button>
            </>
          )}
        </Tarjeta>
      </div>
      <p className={`ini-copia${copia.dias == null || copia.dias > 9 ? ' mal' : ''}`} id="ini-copia">
        {copia.dias == null
          ? '🛟 La copia de seguridad semanal todavía no está activada en la hoja de Google.'
          : copia.dias > 9
            ? `🛟 La última copia de seguridad fue hace ${copia.dias} días. Revisa que la copia semanal siga activada.`
            : `🛟 Copia de seguridad al día (la última fue ${copia.dias === 0 ? 'hoy' : copia.dias === 1 ? 'ayer' : `hace ${copia.dias} días`}).`}
      </p>
      <Instalar />
    </section>
  );
}
