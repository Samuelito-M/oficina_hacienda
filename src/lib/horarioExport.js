import { CASAS } from './personal.js';
import { MESES } from './text.js';
import { PUESTOS, ON_CALL, COLOR_PUESTO, CORTO, en, partesMes, diasDelMes } from './horarioApp.js';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

const ETIQUETA = { 'Casa 1': 'Casa1', 'Casa 2': 'Casa2', 'Casa 3': 'Casa3', 'Casa 4': 'Casa4', 'Casa Esther': 'CasaEst', [ON_CALL]: 'On call' };
const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];

function semanas(anio, mes) {
  const n = diasDelMes(anio, mes);
  const out = [];
  let fila = new Array(7).fill(null);
  for (let d = 1; d <= n; d++) {
    const w = new Date(anio, mes, d).getDay();
    fila[w] = d;
    if (w === 6 || d === n) {
      out.push(fila);
      fila = new Array(7).fill(null);
    }
  }
  return out;
}

export function tituloHorario(clave) {
  const { anio, mes } = partesMes(clave);
  return `Horario ${MESES[mes].toUpperCase()} ${anio}`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="5"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="18"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="13"/><name val="Calibri"/></font><font><b/><sz val="13"/><color rgb="FFB26A00"/><name val="Calibri"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2F3437"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEFEEE9"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF3DD"/></patternFill></fill></fills><borders count="4"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF8A8A8A"/></left><right style="thin"><color rgb="FF8A8A8A"/></right><top style="thin"><color rgb="FF8A8A8A"/></top><bottom style="thin"><color rgb="FF8A8A8A"/></bottom><diagonal/></border><border><left style="thin"><color rgb="FF8A8A8A"/></left><right style="thin"><color rgb="FF8A8A8A"/></right><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF8A8A8A"/></left><right style="thin"><color rgb="FF8A8A8A"/></right><top/><bottom style="thin"><color rgb="FF8A8A8A"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf><xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="3" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

export async function generarExcelHorario(clave, horario, config, JSZip) {
  const { anio, mes } = partesMes(clave);
  const nombre = new Map(config.personal.map((p) => [p.id, p.n]));
  const fer = new Set(horario.fer);
  const filas = [];
  const c = (ref, texto, s) => `<c r="${ref}" t="inlineStr" s="${s}"><is><t xml:space="preserve">${esc(texto)}</t></is></c>`;
  filas.push(`<row r="1" ht="30" customHeight="1">${c('A1', tituloHorario(clave), 1)}</row>`);
  filas.push(`<row r="2" ht="20" customHeight="1">${DIAS.map((d, i) => c(`${COLS[i]}2`, d, 2)).join('')}</row>`);
  let r = 3;
  for (const sem of semanas(anio, mes)) {
    filas.push(`<row r="${r}" ht="20" customHeight="1">${sem.map((d, i) => c(`${COLS[i]}${r}`, d == null ? '' : fer.has(d) ? `FERIADO ${d}` : String(d), d != null && fer.has(d) ? 4 : 3)).join('')}</row>`);
    r++;
    const hayVac = sem.some((d) => d != null && horario.vac.some((v) => d >= v.de && d <= v.a));
    const lineas = [...PUESTOS, ...(hayVac ? ['vac'] : [])];
    lineas.forEach((k, li) => {
      const ultimo = li === lineas.length - 1;
      filas.push(
        `<row r="${r}">${sem
          .map((d, i) => {
            let t = '';
            if (d != null) {
              if (k === 'vac') {
                const vs = horario.vac.filter((v) => d >= v.de && d <= v.a).map((v) => nombre.get(v.id) || v.id);
                t = vs.length ? `VACACIÓN ${vs.join('-')}` : '';
              } else {
                const ids = en(horario, d, k);
                t = k === ON_CALL && !ids.length ? '' : `${ETIQUETA[k]}: ${ids.map((id) => nombre.get(id) || id).join('-')}`;
              }
            }
            return c(`${COLS[i]}${r}`, t, ultimo ? 6 : 5);
          })
          .join('')}</row>`
      );
      r++;
    });
  }
  const hoja = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:G${r - 1}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="16"/><cols><col min="1" max="7" width="27" customWidth="1"/></cols><sheetData>${filas.join('')}</sheetData><mergeCells count="1"><mergeCell ref="A1:G1"/></mergeCells><pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="1"/></worksheet>`;
  const zip = new JSZip();
  const o = { createFolders: false };
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`, o);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`, o);
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(MESES[mes].toUpperCase())}" sheetId="1" r:id="rId1"/></sheets></workbook>`, o);
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`, o);
  zip.file('xl/worksheets/sheet1.xml', hoja, o);
  zip.file('xl/styles.xml', STYLES, o);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function rgb(PDFLib, hex) {
  const h = hex.replace('#', '');
  return PDFLib.rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255);
}

function partir(texto, font, size, max) {
  const out = [];
  let linea = '';
  for (const palabra of texto.split(' ')) {
    const prueba = linea ? `${linea} ${palabra}` : palabra;
    if (font.widthOfTextAtSize(prueba, size) <= max || !linea) linea = prueba;
    else {
      out.push(linea);
      linea = palabra;
    }
  }
  if (linea) out.push(linea);
  return out;
}

export async function generarPdfHorario(clave, horario, config, PDFLib, fontkit, recursos) {
  const { anio, mes } = partesMes(clave);
  const nombre = new Map(config.personal.map((p) => [p.id, p.n]));
  const fer = new Set(horario.fer);
  const pdf = await PDFLib.PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const R = await pdf.embedFont(recursos.normal, { subset: true });
  const B = await pdf.embedFont(recursos.bold, { subset: true });
  const W = 792;
  const H = 612;
  const M = 24;
  const page = pdf.addPage([W, H]);
  const tinta = PDFLib.rgb(0.12, 0.14, 0.18);
  const gris = PDFLib.rgb(0.45, 0.47, 0.5);
  const linea = PDFLib.rgb(0.78, 0.77, 0.74);
  const blanco = PDFLib.rgb(1, 1, 1);
  const titulo = `Horario ${MESES[mes][0].toUpperCase()}${MESES[mes].slice(1)} ${anio}`;
  page.drawText(titulo, { x: M, y: H - M - 18, size: 20, font: B, color: tinta });
  const leyenda = 'Hacienda of Hope';
  page.drawText(leyenda, { x: W - M - R.widthOfTextAtSize(leyenda, 10), y: H - M - 14, size: 10, font: R, color: gris });
  const sems = semanas(anio, mes);
  const top = H - M - 34;
  const cabH = 16;
  const colW = (W - 2 * M) / 7;
  const filaH = (top - cabH - M) / sems.length;
  ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].forEach((d, i) => {
    page.drawRectangle({ x: M + i * colW, y: top - cabH, width: colW, height: cabH, color: tinta });
    page.drawText(d, { x: M + i * colW + 6, y: top - cabH + 4.5, size: 8.5, font: B, color: blanco });
  });
  const size = sems.length >= 6 ? 6.6 : 7.4;
  const paso = size + 2.1;
  sems.forEach((sem, si) => {
    const yTop = top - cabH - si * filaH;
    sem.forEach((d, i) => {
      const x = M + i * colW;
      page.drawRectangle({ x, y: yTop - filaH, width: colW, height: filaH, borderColor: linea, borderWidth: 0.7, color: d == null ? PDFLib.rgb(0.96, 0.955, 0.94) : fer.has(d) ? PDFLib.rgb(1, 0.97, 0.9) : blanco });
      if (d == null) return;
      page.drawText(String(d), { x: x + 5, y: yTop - 13, size: 11.5, font: B, color: tinta });
      if (fer.has(d)) page.drawText('FERIADO', { x: x + 5 + B.widthOfTextAtSize(String(d), 11.5) + 5, y: yTop - 12, size: 6.5, font: B, color: PDFLib.rgb(0.7, 0.42, 0) });
      let y = yTop - 13 - paso - 2;
      const minY = yTop - filaH + 3;
      for (const k of PUESTOS) {
        const ids = en(horario, d, k);
        if (k === ON_CALL && !ids.length) continue;
        if (y < minY) break;
        const et = CORTO[k];
        const etW = k === ON_CALL ? 26 : 15;
        page.drawRectangle({ x: x + 4, y: y - 1.6, width: etW, height: size + 1.6, color: rgb(PDFLib, COLOR_PUESTO[k]) });
        const es = size - 1.4;
        page.drawText(et, { x: x + 4 + (etW - B.widthOfTextAtSize(et, es)) / 2, y: y + 0.2, size: es, font: B, color: blanco });
        const texto = ids.map((id) => nombre.get(id) || id).join(', ');
        const lineas = texto ? partir(texto, R, size, colW - etW - 12) : [''];
        for (const l of lineas) {
          if (y < minY) break;
          page.drawText(l, { x: x + 4 + etW + 4, y, size, font: R, color: tinta });
          y -= paso;
        }
        y -= 1.2;
      }
      const vs = horario.vac.filter((v) => d >= v.de && d <= v.a).map((v) => nombre.get(v.id) || v.id);
      if (vs.length && y >= minY) page.drawText(partir(`Vacación: ${vs.join(', ')}`, R, size - 0.8, colW - 10)[0], { x: x + 4, y, size: size - 0.8, font: R, color: gris });
    });
  });
  return pdf.save();
}

export const CASAS_EXPORT = CASAS;
