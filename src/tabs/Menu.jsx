import { useState } from 'react';
import Subir from '../components/Subir.jsx';
import { ORTOGRAFIA_BASE } from '../lib/menuLimpieza.js';

const BAJAR = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4v11" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 20h14" />
  </svg>
);

const limpia = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

export default function Menu({ menu, resultado, dicExtra, setDicExtra, onMenu, onDescargar, generando }) {
  const [original, setOriginal] = useState(false);
  const [mal, setMal] = useState('');
  const [bien, setBien] = useState('');
  const [msg, setMsg] = useState('');
  const info = menu.info;
  const cambiadas = resultado ? resultado.filas.reduce((n, f) => n + f.comidas.filter((c) => c.cambio).length, 0) : 0;
  const revisar = resultado ? resultado.filas.flatMap((f) => f.comidas.filter((c) => c.revisar).map((c) => ({ dia: f.diaNuevo, comida: c.etiqueta, texto: c.nuevo }))) : [];
  const c = resultado?.conteo;

  return (
    <section className="wrap" aria-labelledby="t-menu">
      <div className="intro">
        <h2 id="t-menu">Menú del nutricionista</h2>
        <p>Sube el menú como lo llena cocina. La app quita las cantidades, pone la bebida en las cenas, corrige la ortografía y te devuelve el mismo Excel listo para firmar.</p>
      </div>
      <div className="uploads">
        <Subir etiqueta="Menú de la quincena" tipo="xlsx" estado={menu} onArchivo={onMenu} ayuda="El Excel del menú (.xlsx)" />
      </div>
      {!info && menu.estado !== 'error' && (
        <div className="empty">
          <b>Sube el menú para empezar</b>
          Solo se cambia la hoja “Meal Planner”. Las demás hojas, colores y firmas se quedan igual.
        </div>
      )}
      {info && resultado && (
        <>
          <div className="result">
            <div className="what">
              <small>Listo para descargar</small>
              <strong>{info.titulo || 'Menú'}</strong>
            </div>
            <div className="stats">
              <div className="stat">
                <b>{cambiadas}</b>
                <span>Celdas cambiadas</span>
              </div>
              <div className="stat">
                <b>{revisar.length}</b>
                <span>Para revisar</span>
              </div>
            </div>
            <button className="dl" disabled={generando} onClick={onDescargar}>
              {generando ? <span className="spin" aria-hidden="true" /> : BAJAR}
              Descargar Excel
            </button>
          </div>
          <div className="counts">
            {[
              [c.cantidad, 'cantidades quitadas'],
              [c.bebida, 'bebidas en la cena'],
              [c.ortografia, 'palabras corregidas'],
              [c.sueltos, 'números sueltos borrados']
            ].map(([n, l]) => (
              <span className="cnt" key={l}>
                <b>{n}</b> {l}
              </span>
            ))}
          </div>
          {revisar.length > 0 && (
            <div className="alert warn">
              <b>Revisa {revisar.length === 1 ? 'esta celda' : 'estas celdas'} antes de mandar a firmar</b>
              <span>Todavía tienen números que no supe si son cantidades:</span>
              <ul className="review">
                {revisar.map((r, i) => (
                  <li key={i}>
                    {r.dia}, {r.comida.toLowerCase()}: “{r.texto}”
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="panel">
            <div className="menu-tools">
              <h3>Hoja “{info.hoja}”</h3>
              <div className="seg" role="group" aria-label="Ver menú">
                <button aria-pressed={!original} onClick={() => setOriginal(false)}>
                  Limpio
                </button>
                <button aria-pressed={original} onClick={() => setOriginal(true)}>
                  Como llegó
                </button>
              </div>
            </div>
            <div className="tbox">
              <table className="menu">
                <thead>
                  <tr>
                    <th>Día</th>
                    {info.comidas.map((x) => (
                      <th key={x}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultado.filas.map((f) => (
                    <tr key={f.fila}>
                      <td>
                        {original ? limpia(f.dia) : f.diaNuevo}
                        {original && f.sueltos.length > 0 && <span className="tag">{f.sueltos.map((s) => s.valor).join(' ')}</span>}
                      </td>
                      {f.comidas.map((cc) => {
                        const txt = original ? limpia(cc.valor) : cc.nuevo;
                        return (
                          <td key={cc.col} className={`${cc.cambio ? 'chg' : ''} ${/^(no|colegio)$/i.test(txt) ? 'muted' : ''}`}>
                            {txt}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint">Las celdas con punto de color son las que cambió la app.</p>
          </div>
          <div className="cols">
            <div className="panel">
              <h3>Palabras que corrige</h3>
              <p className="hint">Cuando cocina escriba algo mal y la app no lo corrija, agrégalo aquí una vez y queda guardado.</p>
              <div className="dict">
                {Object.entries(dicExtra).map(([a, b]) => (
                  <span key={'x' + a}>
                    <i>{a}</i> → {b}
                    <button aria-label={`Quitar ${a}`} onClick={() => {
                      const n = { ...dicExtra };
                      delete n[a];
                      setDicExtra(n);
                    }}>
                      ×
                    </button>
                  </span>
                ))}
                {Object.entries(ORTOGRAFIA_BASE)
                  .filter(([a]) => !(a in dicExtra))
                  .map(([a, b]) => (
                    <span key={a}>
                      <i>{a}</i> → {b}
                    </span>
                  ))}
              </div>
              <form
                className="dict-add"
                onSubmit={(e) => {
                  e.preventDefault();
                  const a = mal.trim().toLowerCase();
                  const b = bien.trim().toLowerCase();
                  if (!a || !b || /\s/.test(a)) return setMsg('Escribe una sola palabra mal escrita y cómo va.');
                  setDicExtra({ ...dicExtra, [a]: b });
                  setMal('');
                  setBien('');
                  setMsg(`Listo: “${a}” ahora se corrige a “${b}”.`);
                }}
              >
                <input value={mal} onChange={(e) => setMal(e.target.value)} placeholder="Mal escrito, ej. arros" aria-label="Palabra mal escrita" />
                <input value={bien} onChange={(e) => setBien(e.target.value)} placeholder="Correcto, ej. arroz" aria-label="Palabra correcta" />
                <button>Agregar</button>
              </form>
              {msg && <p className="hint">{msg}</p>}
            </div>
            <div className="panel">
              <h3>Lo que no se toca</h3>
              <ul className="keep">
                {info.otrasHojas.length > 0 && <li>Las hojas {info.otrasHojas.map((h) => `“${h}”`).join(', ')}</li>}
                <li>Colores, tamaños de letra y bordes</li>
                <li>El título y las firmas</li>
                <li>Sopas, cremas y consomés se quedan sin bebida</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
