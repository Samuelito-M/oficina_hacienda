import { useCallback, useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import * as PDFLib from 'pdf-lib';
import pdfjs from './lib/pdfjs.js';
import Acuerdos from './tabs/Acuerdos.jsx';
import Casas from './tabs/Casas.jsx';
import Menu from './tabs/Menu.jsx';
import Ninos from './tabs/Ninos.jsx';
import { leerItemsPdf, analizarHorario, HorarioError } from './lib/horario.js';
import { leerWord, generarWord, bloquesQueSeQuedan, WordError } from './lib/acuerdos.js';
import { generarCambiosDeCasa } from './lib/casas.js';
import { leerMenu, previsualizarMenu, generarMenu, MenuError } from './lib/menu.js';
import { cargarPersonal, guardarPersonal, fusionarPersonas } from './lib/personal.js';
import { descargar, abrirPdf, extension, leerBytes, MIME, nombreSeguro } from './lib/archivos.js';
import { MESES, fechaCorta } from './lib/text.js';

const TABS = ['acuerdos', 'casas', 'menu', 'ninos'];
const DIC_KEY = 'oficina-hacienda.diccionario.v1';
const VERSION = '1.1';

function leerTab() {
  const h = (location.hash || '').replace('#', '');
  return TABS.includes(h) ? h : 'acuerdos';
}

function cargarDic() {
  try {
    const d = JSON.parse(localStorage.getItem(DIC_KEY) || '{}');
    return d && typeof d === 'object' && !Array.isArray(d) ? d : {};
  } catch {
    return {};
  }
}

const mensaje = (e, defecto) => (e instanceof HorarioError || e instanceof WordError || e instanceof MenuError ? e.message : defecto);

export default function App() {
  const [tab, setTab] = useState(leerTab);
  const [personal, setPersonalState] = useState(cargarPersonal);
  const [horario, setHorario] = useState({ estado: 'vacio' });
  const [word, setWord] = useState({ estado: 'vacio' });
  const [menu, setMenu] = useState({ estado: 'vacio' });
  const [over, setOver] = useState({});
  const [marcas, setMarcas] = useState({});
  const [mantener, setMantener] = useState(true);
  const [dicExtra, setDicExtraState] = useState(cargarDic);
  const [generando, setGenerando] = useState('');
  const [aviso, setAviso] = useState('');
  const [toast, setToast] = useState('');
  const [guardadoOk, setGuardadoOk] = useState(true);

  useEffect(() => {
    const f = () => setTab(leerTab());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  useEffect(() => {
    document.body.dataset.tab = tab;
  }, [tab]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const setPersonal = useCallback((lista) => {
    setPersonalState(lista);
    setGuardadoOk(guardarPersonal(lista));
  }, []);
  const setDicExtra = (d) => {
    setDicExtraState(d);
    try {
      localStorage.setItem(DIC_KEY, JSON.stringify(d));
    } catch {
      setGuardadoOk(false);
    }
  };

  const llaveTokens = personal.map((p) => p.id + ':' + (p.alias || []).join(',')).join('|');
  const { analisis, errorAnalisis } = useMemo(() => {
    if (!horario.pdf) return { analisis: null, errorAnalisis: '' };
    try {
      return { analisis: analizarHorario(horario.pdf, personal, horario.nombre), errorAnalisis: '' };
    } catch (e) {
      console.error(e);
      return { analisis: null, errorAnalisis: mensaje(e, 'Este PDF no tiene la forma del horario mensual.') };
    }
  }, [horario.pdf, horario.nombre, llaveTokens]);

  useEffect(() => {
    if (!horario.pdf) return;
    if (analisis) {
      const personas = new Set();
      analisis.findes.forEach((f) => Object.values(f.casas).forEach((ids) => ids.forEach((i) => personas.add(i))));
      setHorario((h) => ({ ...h, estado: 'listo', detalle: `${MESES[analisis.mes][0].toUpperCase() + MESES[analisis.mes].slice(1)} ${analisis.anio}: ${analisis.findes.length} fines de semana, ${personas.size} personas` }));
    } else if (errorAnalisis) setHorario((h) => ({ ...h, estado: 'error', error: 'No tiene la forma del horario' }));
  }, [analisis, errorAnalisis]);

  const onHorario = async (file) => {
    if (extension(file.name) !== 'pdf') {
      setHorario({ estado: 'error', nombre: file.name, error: 'Aquí va el horario en PDF.' });
      return;
    }
    setHorario({ estado: 'cargando', nombre: file.name });
    try {
      const bytes = await leerBytes(file);
      const pdf = await leerItemsPdf(bytes, pdfjs);
      setOver({});
      setMarcas({});
      setHorario({ estado: 'cargando', nombre: file.name, pdf });
    } catch (e) {
      console.error(e);
      setHorario({ estado: 'error', nombre: file.name, error: mensaje(e, 'No pude abrir este PDF.') });
    }
  };

  const onWord = async (file) => {
    if (extension(file.name) !== 'docx') {
      setWord({ estado: 'error', nombre: file.name, error: extension(file.name) === 'doc' ? 'Guárdalo como .docx en Word y vuelve a subirlo.' : 'Aquí va el Word de acuerdos (.docx).' });
      return;
    }
    setWord({ estado: 'cargando', nombre: file.name });
    try {
      const bytes = await leerBytes(file);
      const w = await leerWord(bytes.slice(), JSZip);
      const { lista, agregadas } = fusionarPersonas(personal, w.personas);
      setPersonal(lista);
      const info = {
        personas: w.personas.length,
        bloques: w.bloques.length,
        monto: w.monto,
        plantillaTextos: w.plantillaTextos,
        quedanPara: (mes, anio) => bloquesQueSeQuedan(w, mes, anio).length
      };
      setWord({ estado: 'listo', nombre: file.name, bytes, info, detalle: `${w.bloques.length} acuerdos, ${w.personas.length} personas con cédula` });
      if (agregadas) setAviso(`Encontré ${agregadas === 1 ? 'una persona nueva' : `${agregadas} personas nuevas`} en el Word. Revisa su nombre corto en Personal para que la app la reconozca en el horario.`);
      else setAviso('');
    } catch (e) {
      console.error(e);
      setWord({ estado: 'error', nombre: file.name, error: mensaje(e, 'No pude leer este Word.') });
    }
  };

  const onDescargarWord = async (lista) => {
    if (!analisis || !word.bytes) return;
    setGenerando('word');
    try {
      const w = await leerWord(word.bytes.slice(), JSZip);
      const out = await generarWord(w, lista.map((a) => ({ completo: a.completo, cedula: a.cedula, sabado: a.sabado })), { mes: analisis.mes, anio: analisis.anio, mantenerViejos: mantener });
      descargar(out, nombreSeguro(`ACUERDOS DE TRABAJO ${MESES[analisis.mes].toUpperCase()} ${analisis.anio}.docx`), MIME.docx);
      setToast(`Listo: se descargó el Word con ${lista.length} acuerdos.`);
    } catch (e) {
      console.error(e);
      setToast(mensaje(e, 'No pude armar el Word. Prueba otra vez con el Word original del mes pasado.'));
    } finally {
      setGenerando('');
    }
  };

  const onPdf = async (hojas, f, modo) => {
    setGenerando('pdf');
    try {
      const out = await generarCambiosDeCasa(hojas, PDFLib);
      const nombre = nombreSeguro(`CAMBIO DE CASA ${fechaCorta(f.viernes).replace(/\//g, '-')}.pdf`);
      if (modo === 'imprimir') {
        if (!abrirPdf(out, nombre)) setToast('Tu navegador no dejó abrir otra pestaña, así que el PDF se descargó. Ábrelo e imprímelo desde ahí.');
      } else {
        descargar(out, nombre, MIME.pdf);
        setToast(`Listo: se descargó el PDF con ${hojas.length} ${hojas.length === 1 ? 'hoja' : 'hojas'}.`);
      }
    } catch (e) {
      console.error(e);
      setToast('No pude armar el PDF. Intenta otra vez.');
    } finally {
      setGenerando('');
    }
  };

  const onMenu = async (file) => {
    if (extension(file.name) !== 'xlsx') {
      setMenu({ estado: 'error', nombre: file.name, error: extension(file.name) === 'xls' ? 'Guárdalo como .xlsx en Excel y vuelve a subirlo.' : 'Aquí va el menú en Excel (.xlsx).' });
      return;
    }
    setMenu({ estado: 'cargando', nombre: file.name });
    try {
      const bytes = await leerBytes(file);
      const m = await leerMenu(bytes.slice(), JSZip);
      setMenu({ estado: 'listo', nombre: file.name, bytes, info: m, detalle: `${m.filas.length} días, ${m.filas.length * m.comidas.length} comidas` });
    } catch (e) {
      console.error(e);
      setMenu({ estado: 'error', nombre: file.name, error: mensaje(e, 'No pude leer este Excel.') });
    }
  };

  const resultadoMenu = useMemo(() => (menu.info ? previsualizarMenu(menu.info, dicExtra) : null), [menu.info, dicExtra]);

  const onDescargarMenu = async () => {
    if (!menu.bytes) return;
    setGenerando('menu');
    try {
      const m = await leerMenu(menu.bytes.slice(), JSZip);
      const r = previsualizarMenu(m, dicExtra);
      const out = await generarMenu(m, r);
      const base = menu.nombre.replace(/\.xlsx$/i, '');
      descargar(out, nombreSeguro(`${base} - limpio.xlsx`), MIME.xlsx);
      setToast('Listo: se descargó el menú limpio.');
    } catch (e) {
      console.error(e);
      setToast(mensaje(e, 'No pude armar el Excel. Intenta otra vez con el archivo original.'));
    } finally {
      setGenerando('');
    }
  };

  return (
    <>
      <header>
        <div className="wrap">
          <div className="brand">
            <div className="mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11.5 12 4l9 7.5" />
                <path d="M5.5 10v9.5h13V10" />
                <path d="M10 19.5v-5h4v5" />
              </svg>
            </div>
            <div>
              <h1>Hacienda of Hope</h1>
              <p>Oficina · acuerdos, cambios de casa, menú y niños</p>
            </div>
          </div>
          <nav aria-label="Herramientas">
            {[
              ['acuerdos', 'Acuerdos'],
              ['casas', 'Cambio de casa'],
              ['menu', 'Menú'],
              ['ninos', 'Niños']
            ].map(([k, l]) => (
              <a key={k} href={`#${k}`} id={`tab-${k}`} aria-current={tab === k ? 'page' : undefined}>
                {l}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main>
        {!guardadoOk && (
          <div className="wrap" style={{ paddingBlock: '12px 0' }}>
            <div className="alert warn">Este navegador no deja guardar datos (quizás es una ventana privada). La app funciona, pero el personal y las cédulas nuevas no se van a guardar para la próxima vez.</div>
          </div>
        )}
        {tab === 'acuerdos' && (
          <Acuerdos
            horario={horario}
            analisis={analisis}
            errorAnalisis={errorAnalisis}
            word={word}
            personal={personal}
            setPersonal={setPersonal}
            over={over}
            setOver={setOver}
            onHorario={onHorario}
            onWord={onWord}
            onDescargar={onDescargarWord}
            generando={generando === 'word'}
            mantener={mantener}
            setMantener={setMantener}
            aviso={aviso}
          />
        )}
        {tab === 'casas' && <Casas horario={horario} analisis={analisis} errorAnalisis={errorAnalisis} personal={personal} marcas={marcas} setMarcas={setMarcas} onHorario={onHorario} onPdf={onPdf} generando={generando === 'pdf'} />}
        {tab === 'ninos' && <Ninos />}
        {tab === 'menu' && <Menu menu={menu} resultado={resultadoMenu} dicExtra={dicExtra} setDicExtra={setDicExtra} onMenu={onMenu} onDescargar={onDescargarMenu} generando={generando === 'menu'} />}
        <div className="wrap" style={{ paddingBlock: '0 32px' }}>
          <p className="foot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            {tab === 'ninos' ? 'La lista de niños se guarda en la hoja de Google de Hacienda y necesita internet y clave.' : 'Los archivos se leen en este navegador y no se suben a ningún servidor. Funciona sin internet.'} <span className="ver">Versión {VERSION}</span>
          </p>
        </div>
      </main>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
