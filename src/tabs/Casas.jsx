import { useMemo, useState } from 'react';
import Subir from '../components/Subir.jsx';
import { SECCIONES } from '../lib/casas.js';
import { claveFinde } from '../lib/seleccion.js';
import { fechaCorta, viernesADomingo } from '../lib/text.js';

const BAJAR = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4v11" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 20h14" />
  </svg>
);

export function hojasDelFinde(f, personal, marcas) {
  const porId = new Map(personal.map((p) => [p.id, p]));
  return Object.keys(f.casas).map((casa) => {
    const ids = (f.casasSabado[casa] && f.casasSabado[casa].length ? f.casasSabado[casa] : f.casas[casa]) || [];
    const padres = personal.filter((p) => p.casa === casa);
    const estan = ids.filter((id) => padres.some((p) => p.id === id));
    const k = `${claveFinde(f)}|${casa}`;
    const marcada = k in marcas ? marcas[k] : estan.length === 0;
    return { casa, k, ids, nombres: ids.map((id) => porId.get(id)?.nombre || id).join(' - '), estan: estan.map((id) => porId.get(id)?.nombre || id), padres, marcada, viernes: f.viernes, domingo: f.domingo };
  });
}

function Hoja({ h }) {
  const vacias = (n, p) => Array.from({ length: n }, (_, i) => (
    <tr className="blank" key={p + i}>
      <td colSpan={4} />
    </tr>
  ));
  return (
    <article className="sheet">
      <table>
        <colgroup>
          <col style={{ width: '44%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '18%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td colSpan={2} className="t">
              CAMBIO DE CASA
            </td>
            <td className="c fill">{fechaCorta(h.viernes)}</td>
            <td className="c fill">{fechaCorta(h.domingo)}</td>
          </tr>
          <tr className="sec">
            <td>
              CASA # <span className="fill">{h.casa.replace(/^Casa\s+/i, '')}</span>
            </td>
            <td className="fill">{h.nombres}</td>
            <td className="c">Viernes</td>
            <td className="c">domingo</td>
          </tr>
          {SECCIONES.map(([sec, items]) => [
            <tr className="sec" key={sec}>
              <td colSpan={2}>{sec}</td>
              <td className="sl">////////////////</td>
              <td className="sl">////////////////</td>
            </tr>,
            ...items.map((it, i) =>
              it === '@fruta' ? (
                <tr key={sec + i}>
                  <td className="r">Frutas entregadas</td>
                  <td className="r">entregado:</td>
                  <td />
                  <td className="r">recibo :</td>
                </tr>
              ) : (
                <tr key={sec + i}>
                  <td colSpan={2}>{it}</td>
                  <td />
                  <td />
                </tr>
              )
            )
          ])}
          <tr className="sec">
            <td colSpan={4}>Indicaciones:</td>
          </tr>
          {vacias(5, 'a')}
          <tr className="sec">
            <td colSpan={4}>indicaciones Domingo:</td>
          </tr>
          {vacias(4, 'b')}
          <tr className="sign">
            <td colSpan={4}>Entrega Tutor 1: __________________ Recibe Tutor 2.______________________</td>
          </tr>
          <tr className="sign">
            <td colSpan={4}>Entrega Tutor 2: __________________ Recibe Tutor 1.______________________</td>
          </tr>
        </tbody>
      </table>
    </article>
  );
}

export default function Casas({ horario, analisis, errorAnalisis, personal, marcas, setMarcas, onHorario, onPdf, generando }) {
  const hoy = new Date();
  const inicial = useMemo(() => {
    if (!analisis) return 0;
    const i = analisis.findes.findIndex((f) => f.domingo >= new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
    return i < 0 ? analisis.findes.length - 1 : i;
  }, [analisis]);
  const [elegido, setElegido] = useState(null);
  const [ver, setVer] = useState(null);
  const fi = analisis ? Math.min(elegido ?? inicial, analisis.findes.length - 1) : 0;
  const f = analisis ? analisis.findes[fi] : null;
  const hojas = f ? hojasDelFinde(f, personal, marcas) : [];
  const marcadas = hojas.filter((h) => h.marcada);
  const vista = hojas.find((h) => h.casa === ver) || marcadas[0] || hojas[0];

  return (
    <section className="wrap" aria-labelledby="t-casas">
      <div className="intro">
        <h2 id="t-casas">Cambio de casa</h2>
        <p>Sale del mismo horario de los acuerdos. La app arma las casas de cada fin de semana; ya vienen marcadas las que no tienen a sus padres de casa. Marca o desmarca las que quieras imprimir.</p>
      </div>
      <div className="uploads">
        <Subir etiqueta="Horario del mes" tipo="pdf" estado={horario} onArchivo={onHorario} ayuda="El mismo PDF que usas en Acuerdos" />
      </div>
      {errorAnalisis && (
        <div className="alert bad" role="alert">
          <b>No pude leer el horario</b>
          <span>{errorAnalisis}</span>
        </div>
      )}
      {!analisis && !errorAnalisis && (
        <div className="empty">
          <b>Sube el horario para empezar</b>
          Si ya lo subiste en Acuerdos, aparece aquí solo.
        </div>
      )}
      {analisis && f && (
        <>
          <div className="panel">
            <h3>Fin de semana</h3>
            <div className="wkpick" role="group" aria-label="Elegir fin de semana">
              {analisis.findes.map((x, i) => {
                const n = hojasDelFinde(x, personal, marcas).filter((h) => h.marcada).length;
                return (
                  <button
                    key={claveFinde(x)}
                    aria-pressed={i === fi}
                    onClick={() => {
                      setElegido(i);
                      setVer(null);
                    }}
                  >
                    {viernesADomingo(x.sabado)}
                    <small>
                      {n} {n === 1 ? 'hoja marcada' : 'hojas marcadas'}
                    </small>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="result">
            <div className="what">
              <small>Hojas para</small>
              <strong>{viernesADomingo(f.sabado).replace('Vie', 'Viernes').replace('Dom', 'domingo')}</strong>
            </div>
            <div className="stats">
              <div className="stat">
                <b>{marcadas.length}</b>
                <span>Hojas marcadas</span>
              </div>
            </div>
            <div className="btns">
              <button className="dl ghost" disabled={!marcadas.length || generando} onClick={() => onPdf(marcadas, f, 'imprimir')}>
                Imprimir
              </button>
              <button className="dl" disabled={!marcadas.length || generando} onClick={() => onPdf(marcadas, f, 'descargar')}>
                {generando ? <span className="spin" aria-hidden="true" /> : BAJAR}
                Descargar PDF
              </button>
            </div>
          </div>
          <div className="cols">
            <div className="panel">
              <h3>Casas</h3>
              {!hojas.length && <p className="hint">No encontré casas para este fin de semana en el horario.</p>}
              <div className="hlist">
                {hojas.map((h) => {
                  const id = `cm-${fi}-${h.casa.replace(/\s/g, '')}`;
                  return (
                    <div className={`hc ${vista && h.casa === vista.casa ? 'cur' : ''}`} key={h.casa}>
                      <input
                        type="checkbox"
                        id={id}
                        checked={h.marcada}
                        onChange={(e) => {
                          setMarcas({ ...marcas, [h.k]: e.target.checked });
                          setVer(h.casa);
                        }}
                        aria-label={`Imprimir ${h.casa}`}
                      />
                      <label className="who" htmlFor={id}>
                        <b>{h.casa}</b>
                        <span>{h.nombres || 'Sin nombres en el horario'}</span>
                      </label>
                      {h.estan.length ? <span className="pill home">Está {h.estan.join(' y ')}</span> : <span className="pill away">{h.padres.length ? 'Sin padres de casa' : 'Sin padres asignados'}</span>}
                      <button className="see" onClick={() => setVer(h.casa)}>
                        Ver hoja
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="padres">
                <b>Padres de casa:</b>{' '}
                {Array.from(new Set(personal.filter((p) => p.casa).map((p) => p.casa)))
                  .map((c) => `${personal.filter((p) => p.casa === c).map((p) => p.nombre).join(' y ')} (${c})`)
                  .join(' · ') || 'ninguno. Asígnalos en Personal, en la pestaña Acuerdos.'}
              </div>
            </div>
            <div className="panel">
              <h3>Vista previa</h3>
              {vista && (
                <div className="sheet-wrap">
                  <Hoja h={vista} />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
