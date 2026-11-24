import { filasExport, generarExcelNinos, generarPdfNinos } from '../exportar.js';
import { edad } from '../ninos.js';
import { crearExcel } from '../excel.js';
import { generarExcelHorario, generarPdfHorario } from '../horarioExport.js';
import { normalizarConfig, normalizarHorario, activos, ROLES, DIAS_SEM } from '../horarioApp.js';
import { ausenciasDeMes } from '../ausencias.js';
import { MIME, nombreSeguro } from '../archivos.js';
import { MESES } from '../text.js';

const COLS_NINOS = ['casa', 'cumple', 'edad', 'ropa', 'zapatos'];
const hoyTexto = () => {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
};

export async function crearDescarga(d, { cargarNinos, horario, personal = [], libs }) {
  const { JSZip, PDFLib, fontkit, cargarRecursos } = libs;
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
