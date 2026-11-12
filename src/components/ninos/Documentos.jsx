import { useState } from 'react';
import JSZip from 'jszip';
import * as PDFLib from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { descargar, MIME, nombreSeguro } from '../../lib/archivos.js';
import { COLUMNAS, filasExport, generarExcelNinos, generarPdfNinos } from '../../lib/exportar.js';
import { generarDirectorio, generarHojasRegalo, generarCumpleMes } from '../../lib/documentos.js';
import { cargarRecursos } from '../../lib/recursos.js';
import { edad } from '../../lib/ninos.js';
import { MESES } from '../../lib/text.js';

const K_COLS = 'oficina-hacienda.ninos.columnas';
const DEF = ['casa', 'cumple', 'edad', 'ropa', 'zapatos'];

function leerCols() {
  try {
    const c = JSON.parse(localStorage.getItem(K_COLS) || 'null');
    if (Array.isArray(c)) return c.filter((k) => COLUMNAS.some((x) => x.k === k));
  } catch {
    return DEF;
  }
  return DEF;
}

const TIPOS = [
  ['lista', 'Lista'],
  ['regalos', 'Hojas de regalos'],
  ['directorio', 'Directorio'],
  ['cumple', 'Cumpleaños del mes']
];

function Idioma({ valor, onCambio, id }) {
  return (
    <div className="seg" role="group" aria-label="Idioma">
      <button type="button" id={`${id}-en`} aria-pressed={valor === 'en'} onClick={() => onCambio('en')}>
        English
      </button>
      <button type="button" id={`${id}-es`} aria-pressed={valor === 'es'} onClick={() => onCambio('es')}>
        Español
      </button>
    </div>
  );
}

export default function Documentos({ lista, todos, casa, filtro, casasData, version, asegurarFotos, onCerrar, onIrCasas }) {
  const [tipo, setTipo] = useState('lista');
  const [cols, setCols] = useState(leerCols);
  const [agrupar, setAgrupar] = useState(true);
  const [idiomaRegalo, setIdiomaRegalo] = useState('en');
  const [idiomaDir, setIdiomaDir] = useState('en');
  const [idiomaCumple, setIdiomaCumple] = useState('es');
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [ocupado, setOcupado] = useState('');
  const [msg, setMsg] = useState('');
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const nuevo = version >= 2;
  const paraDir = todos.filter((n) => !casa || n.casa === casa);
  const paraCumple = todos.filter((n) => !casa || n.casa === casa);
  const cumpleEseMes = paraCumple.filter((n) => +String(n.nacimiento || '').slice(5, 7) === mes + 1).length;

  const cambiarCol = (k, on) => {
    const n = COLUMNAS.map((c) => c.k).filter((x) => (x === k ? on : cols.includes(x)));
    setCols(n);
    try {
      localStorage.setItem(K_COLS, JSON.stringify(n));
    } catch {
      setMsg('');
    }
  };

  const ir = async (que) => {
    setOcupado(que);
    setMsg('');
    try {
      if (que === 'pdf' || que === 'xlsx') {
        const filas = filasExport(lista, (iso) => edad(iso));
        const base = nombreSeguro(`Ninos Hacienda${filtro ? ' - ' + filtro : ''} ${fecha}`);
        if (que === 'pdf') descargar(await generarPdfNinos(filas, cols, { subtitulo: filtro, agrupar: agrupar && !casa }, PDFLib), `${base}.pdf`, MIME.pdf);
        else descargar(await generarExcelNinos(filas, cols, JSZip), `${base}.xlsx`, MIME.xlsx);
      } else {
        const recursos = await cargarRecursos();
        if (que === 'regalos') {
          const fotos = nuevo ? await asegurarFotos(lista.filter((n) => n.conFoto).map((n) => n.id)) : {};
          const out = await generarHojasRegalo({ ninos: lista, fotos, idioma: idiomaRegalo }, PDFLib, fontkit, recursos);
          descargar(out, nombreSeguro(`${idiomaRegalo === 'en' ? 'Gift Info Sheets' : 'Hojas de regalos'}${filtro ? ' - ' + filtro : ''} ${fecha}.pdf`), MIME.pdf);
        }
        if (que === 'directorio') {
          const ids = [...paraDir.filter((n) => n.conFoto).map((n) => n.id), ...casasData.filter((c) => c.conFoto && (!casa || c.casa === casa)).map((c) => `casa:${c.casa}`)];
          const fotos = nuevo ? await asegurarFotos(ids) : {};
          const out = await generarDirectorio({ ninos: paraDir, casas: casasData, fotos, idioma: idiomaDir, soloCasa: casa }, PDFLib, fontkit, recursos);
          descargar(out, nombreSeguro(`${idiomaDir === 'en' ? 'Hacienda of Hope Directory' : 'Directorio Hacienda'}${casa ? ' - ' + casa : ''} ${fecha}.pdf`), MIME.pdf);
        }
        if (que === 'cumple') {
          const delMes = paraCumple.filter((n) => +String(n.nacimiento || '').slice(5, 7) === mes + 1);
          const fotos = nuevo ? await asegurarFotos(delMes.filter((n) => n.conFoto).map((n) => n.id)) : {};
          const out = await generarCumpleMes({ ninos: paraCumple, fotos, mes, anio, idioma: idiomaCumple }, PDFLib, fontkit, recursos);
          descargar(out, nombreSeguro(`Cumpleanos ${MESES[mes]} ${anio}${casa ? ' - ' + casa : ''}.pdf`), MIME.pdf);
        }
      }
      setMsg('Listo, revisa tu carpeta de Descargas.');
    } catch (err) {
      console.error(err);
      setMsg(err && err.message && /niños|casas/.test(err.message) ? err.message : 'No se pudo armar el archivo. Revisa tu internet e intenta otra vez.');
    } finally {
      setOcupado('');
    }
  };

  const boton = (que, texto, deshabilitado = false) => (
    <button type="button" className="mini solid" disabled={deshabilitado || !!ocupado} onClick={() => ir(que)}>
      {ocupado === que ? 'Armando…' : texto}
    </button>
  );

  return (
    <div className="ficha">
      <h4>Documentos</h4>
      <div className="seg seg-wrap" role="group" aria-label="Tipo de documento">
        {TIPOS.map(([k, t]) => (
          <button
            key={k}
            type="button"
            id={`doc-${k}`}
            aria-pressed={tipo === k}
            onClick={() => {
              setTipo(k);
              setMsg('');
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tipo === 'lista' && (
        <>
          <p className="hint">
            Se descargan los {lista.length} {lista.length === 1 ? 'niño' : 'niños'} que se ven ahora{filtro ? ` (${filtro})` : ''}. El nombre siempre sale. Elige qué más quieres:
          </p>
          <div className="opciones">
            {COLUMNAS.map((c) => (
              <label key={c.k} className="opcion">
                <input type="checkbox" id={`col-${c.k}`} checked={cols.includes(c.k)} onChange={(e) => cambiarCol(c.k, e.target.checked)} />
                <span>{c.k === 'cumple' ? 'Fecha de cumpleaños' : c.t}</span>
              </label>
            ))}
          </div>
          <label className="opcion">
            <input type="checkbox" id="col-agrupar" checked={agrupar} onChange={(e) => setAgrupar(e.target.checked)} />
            <span>En el PDF, separar por casa</span>
          </label>
          <div className="row-actions">
            {boton('pdf', 'Descargar PDF', !lista.length)}
            {boton('xlsx', 'Descargar Excel', !lista.length)}
          </div>
        </>
      )}

      {tipo === 'regalos' && (
        <>
          <p className="hint">
            Una hoja por niño, con su foto, edad, tallas, color favorito, pasatiempos y deseos. Salen los {lista.length} niños que se ven ahora{filtro ? ` (${filtro})` : ''}. Lo que falte sale con líneas para escribir a mano. La descripción, el color, los pasatiempos y los deseos se llenan al editar cada niño.
          </p>
          <Idioma valor={idiomaRegalo} onCambio={setIdiomaRegalo} id="reg" />
          <div className="row-actions">{boton('regalos', `Descargar ${lista.length} ${lista.length === 1 ? 'hoja' : 'hojas'}`, !lista.length)}</div>
        </>
      )}

      {tipo === 'directorio' && (
        <>
          <p className="hint">
            El directorio en tamaño postal (5×7), una página por casa{casa ? ` (solo ${casa})` : ''}, con los colores de cada casa, la foto y biografía de los padres de casa y las fotos de los niños. Los niños se ordenan por apellido para que los hermanos queden juntos.
          </p>
          <p className="hint">
            {casasData.length ? `Tienes ${casasData.length} ${casasData.length === 1 ? 'casa' : 'casas'} con datos de padres.` : 'Todavía no hay datos de los padres de casa.'}{' '}
            <button type="button" className="btn-link" onClick={onIrCasas}>
              Editar casas y padres
            </button>
          </p>
          <Idioma valor={idiomaDir} onCambio={setIdiomaDir} id="dir" />
          <div className="row-actions">{boton('directorio', 'Descargar directorio', !paraDir.length)}</div>
        </>
      )}

      {tipo === 'cumple' && (
        <>
          <p className="hint">Una hoja para imprimir con los cumpleaños del mes{casa ? ` de ${casa}` : ''}, ordenados por día, con la edad que cumplen.</p>
          <div className="opciones">
            <select id="cumple-mes" value={mes} onChange={(e) => setMes(+e.target.value)} aria-label="Mes" className="mini">
              {MESES.map((m, i) => (
                <option key={m} value={i}>
                  {m[0].toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
            <select id="cumple-anio" value={anio} onChange={(e) => setAnio(+e.target.value)} aria-label="Año" className="mini">
              {[hoy.getFullYear() - 1, hoy.getFullYear(), hoy.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <Idioma valor={idiomaCumple} onCambio={setIdiomaCumple} id="cum" />
          </div>
          <p className="hint">
            {cumpleEseMes} {cumpleEseMes === 1 ? 'niño cumple' : 'niños cumplen'} años en {MESES[mes]}.
            {paraCumple.some((n) => !n.nacimiento) && ` ${paraCumple.filter((n) => !n.nacimiento).length} no tienen fecha de cumpleaños todavía.`}
          </p>
          <div className="row-actions">{boton('cumple', 'Descargar cumpleaños')}</div>
        </>
      )}

      {!nuevo && tipo !== 'lista' && <p className="hint">Para que salgan las fotos, actualiza el código de Google (Code.gs).</p>}
      <div className="row-actions">
        <button type="button" className="mini" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
      {msg && <p className="hint">{msg}</p>}
    </div>
  );
}
