import { filasExport, generarExcelNinos, generarPdfNinos } from '../exportar.js';
import { edad } from '../ninos.js';
import { crearExcel } from '../excel.js';
import { generarExcelHorario, generarPdfHorario } from '../horarioExport.js';
import { normalizarConfig, normalizarHorario, activos, ROLES, DIAS_SEM } from '../horarioApp.js';
import { ausenciasDeMes } from '../ausencias.js';
import { MIME, nombreSeguro } from '../archivos.js';
import { MESES, fechaCorta } from '../text.js';
import { generarPdfGrupos } from '../equipos.js';
import { leerWord, generarWord } from '../acuerdos.js';
import { generarExcelPagos } from '../pagos.js';
import { generarCambiosDeCasa, hojasDelFinde } from '../casas.js';
import { leerMenu, previsualizarMenu, generarMenu } from '../menu.js';
import { generarHojasRegalo, generarDirectorio, generarCumpleMes } from '../documentos.js';
import { acuerdosElegidos } from '../seleccion.js';
import { aAnalisis } from '../horarioApp.js';
import { reporte, reporteCsv } from '../ausencias.js';

const COLS_NINOS = ['casa', 'cumple', 'edad', 'ropa', 'zapatos'];
const hoyTexto = () => {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
};

async function analisisDe(mes, horario, personal) {
  const r = await horario(mes);
  const h = r && normalizarHorario(r.horario);
  if (!h || !Object.keys(h.dias).length) throw new Error('sin-horario');
  return aAnalisis(mes, h, normalizarConfig(r.config), personal);
}

async function fotosDe(ids, api) {
  const out = {};
  const lista = Array.from(new Set(ids));
  for (let i = 0; i < lista.length; i += 20) {
    const parte = lista.slice(i, i + 20);
    const r = await api({ accion: 'fotos', ids: parte });
    for (const id of parte) out[id] = (r.fotos && r.fotos[id]) || '';
  }
  return out;
}

export async function crearDescarga(d, { cargarNinos, horario, personal = [], libs, oficina = {}, api, cargarCasas }) {
  const { JSZip, PDFLib, fontkit, cargarRecursos } = libs;
  if (d.tipo === 'equipos') {
    const todos = await cargarNinos();
    const porId = new Map(todos.map((n) => [n.id, n]));
    const grupos = d.grupos.map((g) => ({ ...g, ninos: g.ninos.map((id) => porId.get(id)).filter(Boolean) }));
    const hoy = new Date();
    const fecha = hoy.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
    const bytes = await generarPdfGrupos(grupos, { titulo: d.titulo, subtitulo: [d.subtitulo, fecha].filter(Boolean).join(' · ') }, PDFLib, fontkit, await cargarRecursos());
    return { bytes, nombre: `${nombreSeguro(`${d.titulo} Hacienda ${hoyTexto()}`)}.pdf`, mime: MIME.pdf };
  }
  if (d.tipo === 'acuerdos' || d.tipo === 'pagos') {
    const an = await analisisDe(d.mes, horario, personal);
    const lista = acuerdosElegidos(an, personal, oficina.over || {});
    if (!lista.length) throw new Error('sin-acuerdos');
    const mesTxt = `${MESES[an.mes].toUpperCase()} ${an.anio}`;
    if (d.tipo === 'pagos') {
      const monto = (oficina.word && oficina.word.info && oficina.word.info.monto) || 60;
      return { bytes: await generarExcelPagos(lista, monto, JSZip), nombre: nombreSeguro(`PAGOS ACUERDOS ${mesTxt}.xlsx`), mime: MIME.xlsx };
    }
    const bytesWord = d.wordBytes || (oficina.word && oficina.word.bytes);
    if (!bytesWord) throw new Error('sin-word');
    const w = await leerWord(bytesWord.slice(), JSZip);
    const out = await generarWord(w, lista.map((a) => ({ completo: a.completo, cedula: a.cedula, sabado: a.sabado })), { mes: an.mes, anio: an.anio, mantenerViejos: oficina.mantener !== false, porPersona: oficina.porPersona !== false });
    return { bytes: out, nombre: nombreSeguro(`ACUERDOS DE TRABAJO ${mesTxt}.docx`), mime: MIME.docx };
  }
  if (d.tipo === 'casas') {
    const an = await analisisDe(d.mes, horario, personal);
    const f = an.findes.find((x) => x.sabado.getDate() === d.sabado);
    if (!f) throw new Error('sin-finde');
    const hojas = hojasDelFinde(f, personal, oficina.marcas || {});
    const elegidas = d.todas ? hojas : hojas.filter((h) => h.marcada);
    if (!elegidas.length) throw new Error('sin-hojas');
    return { bytes: await generarCambiosDeCasa(elegidas, PDFLib), nombre: nombreSeguro(`CAMBIO DE CASA ${fechaCorta(f.viernes).replace(/\//g, '-')}.pdf`), mime: MIME.pdf };
  }
  if (d.tipo === 'menu') {
    const bytesMenu = d.menuBytes || (oficina.menu && oficina.menu.bytes);
    if (!bytesMenu) throw new Error('sin-menu');
    const m = await leerMenu(bytesMenu.slice(), JSZip);
    const r = previsualizarMenu(m, oficina.dicExtra || {});
    const base = String(d.nombre || (oficina.menu && oficina.menu.nombre) || 'Menu').replace(/\.xlsx$/i, '');
    return { bytes: await generarMenu(m, r), nombre: nombreSeguro(`${base} - limpio.xlsx`), mime: MIME.xlsx };
  }
  if (d.tipo === 'regalos' || d.tipo === 'directorio' || d.tipo === 'cumple') {
    const todos = await cargarNinos();
    const ninos = d.casa ? todos.filter((n) => n.casa === d.casa) : todos;
    const recursos = await cargarRecursos();
    const casaTxt = d.casa ? ` - ${d.casa}` : '';
    if (d.tipo === 'regalos') {
      const fotos = await fotosDe(ninos.filter((n) => n.conFoto).map((n) => n.id), api);
      const bytes = await generarHojasRegalo({ ninos, fotos, idioma: d.idioma, sistema: 'us' }, PDFLib, fontkit, recursos);
      return { bytes, nombre: nombreSeguro(`${d.idioma === 'en' ? 'Gift Info Sheets' : 'Hojas de regalos'}${casaTxt} ${hoyTexto()}.pdf`), mime: MIME.pdf };
    }
    if (d.tipo === 'directorio') {
      const casas = cargarCasas ? await cargarCasas() : [];
      const ids = [...ninos.filter((n) => n.conFoto).map((n) => n.id), ...casas.filter((c) => c.conFoto && (!d.casa || c.casa === d.casa)).map((c) => `casa:${c.casa}`)];
      const fotos = await fotosDe(ids, api);
      const bytes = await generarDirectorio({ ninos, casas, fotos, idioma: d.idioma, soloCasa: d.casa || '' }, PDFLib, fontkit, recursos);
      return { bytes, nombre: nombreSeguro(`${d.idioma === 'en' ? 'Hacienda of Hope Directory' : 'Directorio Hacienda'}${casaTxt} ${hoyTexto()}.pdf`), mime: MIME.pdf };
    }
    const mes = +d.mes.slice(5) - 1;
    const anio = +d.mes.slice(0, 4);
    const delMes = ninos.filter((n) => +String(n.nacimiento || '').slice(5, 7) === mes + 1);
    const fotos = await fotosDe(delMes.filter((n) => n.conFoto).map((n) => n.id), api);
    const bytes = await generarCumpleMes({ ninos, fotos, mes, anio, idioma: d.idioma }, PDFLib, fontkit, recursos);
    return { bytes, nombre: nombreSeguro(`Cumpleanos ${MESES[mes]} ${anio}${casaTxt}.pdf`), mime: MIME.pdf };
  }
  if (d.tipo === 'reporte') {
    const r = reporte(personal, d.anio, d.mes);
    const titulo = d.mes == null ? `Control de personal · año ${d.anio}` : `Control de personal · ${MESES[d.mes]} ${d.anio}`;
    return { bytes: new TextEncoder().encode(reporteCsv({ ...r, filas: r.filas.filter((f) => f.veces) }, titulo)), nombre: `${nombreSeguro(titulo.replace('·', '-'))}.csv`, mime: 'text/csv;charset=utf-8' };
  }
  if (d.tipo === 'ninos') {
    const todos = await cargarNinos();
    const ids = new Set(d.ids || []);
    const lista = todos.filter((n) => ids.has(n.id));
    const filas = filasExport(lista, (iso) => edad(iso));
    const nombre = nombreSeguro(`${d.titulo || 'Ninos'} ${hoyTexto()}`);
    if (d.formato === 'pdf') return { bytes: await generarPdfNinos(filas, COLS_NINOS, { subtitulo: d.titulo || '', agrupar: !d.casa }, PDFLib), nombre: `${nombre}.pdf`, mime: MIME.pdf };
    return { bytes: await generarExcelNinos(filas, COLS_NINOS, JSZip), nombre: `${nombre}.xlsx`, mime: MIME.xlsx };
  }
  if (d.tipo === 'personal') {
    const r = await horario(d.mes);
    const cfg = normalizarConfig(r && r.config);
    const ids = new Set(d.ids || []);
    const completo = new Map(personal.map((p) => [p.id, p.completo || '']));
    const lista = activos(cfg, d.mes).filter((p) => ids.has(p.id));
    const filas = lista.map((p) => [p.n, completo.get(p.id) || '', ROLES[p.rol] || '', (p.casas || []).join(', '), (p.dias || []).map((x) => DIAS_SEM[x]).join(' '), p.oc ? 'Sí' : '']);
    const bytes = await crearExcel(
      [
        {
          nombre: 'Personal',
          columnas: [
            { t: 'Nombre', w: 18 },
            { t: 'Nombre completo', w: 32 },
            { t: 'Tipo', w: 28 },
            { t: 'Casas', w: 40 },
            { t: 'Días que trabaja', w: 30 },
            { t: 'On call', w: 9 }
          ],
          filas
        }
      ],
      JSZip
    );
    return { bytes, nombre: `${nombreSeguro(d.titulo || 'Personal')}.xlsx`, mime: MIME.xlsx };
  }
  if (d.tipo === 'horario') {
    const r = await horario(d.mes);
    const h = r && normalizarHorario(r.horario);
    if (!h) throw new Error('sin-horario');
    if (!r.vivo) h.vac = [...ausenciasDeMes(personal, d.mes), ...h.vac.filter((v) => !v.t)];
    const cfg = normalizarConfig(r.config);
    const base = nombreSeguro(`HORARIO ${MESES[+d.mes.slice(5) - 1].toUpperCase()} ${d.mes.slice(0, 4)}`);
    if (d.formato === 'pdf') return { bytes: await generarPdfHorario(d.mes, h, cfg, PDFLib, fontkit, await cargarRecursos()), nombre: `${base}.pdf`, mime: MIME.pdf };
    return { bytes: await generarExcelHorario(d.mes, h, cfg, JSZip), nombre: `${base}.xlsx`, mime: MIME.xlsx };
  }
  throw new Error('tipo');
}
