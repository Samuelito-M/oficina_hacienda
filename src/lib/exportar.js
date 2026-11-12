import { MESES, fold } from './text.js';

export const COLUMNAS = [
  { k: 'casa', t: 'Casa', w: 70 },
  { k: 'cumple', t: 'Cumpleaños', w: 92 },
  { k: 'edad', t: 'Edad', w: 34 },
  { k: 'ropa', t: 'Talla de ropa', w: 70 },
  { k: 'zapatos', t: 'Talla de zapatos', w: 74 },
  { k: 'notas', t: 'Notas', w: 0 }
];

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

function partesIso(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}

export function fechaTexto(iso) {
  const p = partesIso(iso);
  return p ? `${p.d} de ${MESES[p.m - 1]} de ${p.y}` : '';
}

export function filasExport(ninos, edadDe) {
  return ninos.map((n) => ({ nombre: n.nombre, casa: n.casa || '', nacimiento: n.nacimiento || '', cumple: fechaTexto(n.nacimiento), edad: edadDe(n.nacimiento), ropa: n.tallaRopa || '', zapatos: n.tallaZapatos || '', notas: n.notas || '' }));
}

function colLetra(i) {
  let s = '';
  i += 1;
  while (i > 0) {
    const r = (i - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

function serial(iso) {
  const p = partesIso(iso);
  if (!p) return null;
  return Math.round((Date.UTC(p.y, p.m - 1, p.d) - Date.UTC(1899, 11, 30)) / 86400000);
}

export async function generarExcelNinos(filas, columnas, JSZip) {
  const cols = [{ k: 'nombre', t: 'Nombre' }, ...COLUMNAS.filter((c) => columnas.includes(c.k))];
  const anchos = { nombre: 28, casa: 14, cumple: 16, edad: 8, ropa: 16, zapatos: 16, notas: 40 };
  const celdaTexto = (ref, v, s = 0) => `<c r="${ref}" t="inlineStr"${s ? ` s="${s}"` : ''}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  const filasXml = [];
  filasXml.push(`<row r="1">${cols.map((c, i) => celdaTexto(`${colLetra(i)}1`, c.t, 1)).join('')}</row>`);
  filas.forEach((f, ri) => {
    const r = ri + 2;
    const celdas = cols
      .map((c, i) => {
        const ref = `${colLetra(i)}${r}`;
        if (c.k === 'cumple') {
          const s = serial(f.nacimiento);
          return s == null ? '' : `<c r="${ref}" s="2"><v>${s}</v></c>`;
        }
        if (c.k === 'edad') return f.edad == null ? '' : `<c r="${ref}"><v>${f.edad}</v></c>`;
        const v = f[c.k];
        return v ? celdaTexto(ref, v) : '';
      })
      .join('');
    filasXml.push(`<row r="${r}">${celdas}</row>`);
  });
  const ultima = `${colLetra(cols.length - 1)}${Math.max(1, filas.length + 1)}`;
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${ultima}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${anchos[c.k]}" customWidth="1"/>`).join('')}</cols><sheetData>${filasXml.join('')}</sheetData><autoFilter ref="A1:${ultima}"/><pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/></worksheet>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF7A45C9"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`, { createFolders: false });
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`, { createFolders: false });
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Niños" sheetId="1" r:id="rId1"/></sheets></workbook>`, { createFolders: false });
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`, { createFolders: false });
  zip.file('xl/worksheets/sheet1.xml', sheet, { createFolders: false });
  zip.file('xl/styles.xml', styles, { createFolders: false });
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function seguro(s) {
  return Array.from(String(s ?? ''))
    .map((c) => (c.charCodeAt(0) < 256 || '–—‘’“”•…€'.includes(c) ? c : fold(c).replace(/[^\x20-\x7e]/g, '')))
    .join('')
    .replace(/[\u0000-\u001f]/g, ' ');
}

export async function generarPdfNinos(filas, columnas, { titulo = 'Niños de la Hacienda', subtitulo = '', agrupar = true } = {}, PDFLib) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const cols = [{ k: 'nombre', t: 'Nombre', w: 0 }, ...COLUMNAS.filter((c) => columnas.includes(c.k) && !(agrupar && c.k === 'casa'))];
  const conNotas = cols.some((c) => c.k === 'notas');
  const tam = conNotas ? [841.89, 595.28] : [595.28, 841.89];
  const pdf = await PDFDocument.create();
  pdf.setTitle(titulo);
  pdf.setCreator('Oficina Hacienda');
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const tinta = rgb(0.18, 0.2, 0.22);
  const gris = rgb(0.45, 0.46, 0.47);
  const linea = rgb(0.86, 0.85, 0.82);
  const morado = rgb(0.48, 0.27, 0.79);
  const suave = rgb(0.95, 0.93, 0.99);
  const M = 40;
  const ancho = tam[0] - 2 * M;
  const fijos = cols.filter((c) => c.w).reduce((s, c) => s + c.w, 0);
  const flex = cols.filter((c) => !c.w);
  const libre = Math.max(120, ancho - fijos);
  const anchoNombre = conNotas ? Math.min(190, libre * 0.4) : libre;
  const anchos = cols.map((c) => (c.k === 'nombre' ? anchoNombre : c.k === 'notas' ? libre - anchoNombre : c.w));
  if (!flex.length) anchos[0] = ancho - fijos;
  const xs = anchos.reduce((a, w, i) => (a.push(a[i] + w), a), [M]);
  const ALTO = 18;
  const hoy = new Date();
  const fechaHoy = `${hoy.getDate()} de ${MESES[hoy.getMonth()]} de ${hoy.getFullYear()}`;
  let page;
  let y;
  let n = 0;
  const recortar = (t, f, s, max) => {
    let str = seguro(t);
    if (f.widthOfTextAtSize(str, s) <= max) return str;
    while (str.length > 1 && f.widthOfTextAtSize(str + '…', s) > max) str = str.slice(0, -1);
    return str + '…';
  };
  const encabezadoTabla = () => {
    page.drawRectangle({ x: M, y: y - ALTO, width: ancho, height: ALTO, color: morado });
    cols.forEach((c, i) => page.drawText(recortar(c.t, bold, 8.5, anchos[i] - 8), { x: xs[i] + 5, y: y - ALTO + 6, size: 8.5, font: bold, color: rgb(1, 1, 1) }));
    y -= ALTO;
  };
  const nuevaPagina = (conEncabezado = true) => {
    page = pdf.addPage(tam);
    n++;
    y = tam[1] - M;
    if (n === 1) {
      page.drawText(seguro(titulo), { x: M, y: y - 16, size: 18, font: bold, color: tinta });
      y -= 24;
      page.drawText(seguro(`${subtitulo ? subtitulo + ' · ' : ''}${filas.length} ${filas.length === 1 ? 'persona' : 'personas'} · ${fechaHoy}`), { x: M, y: y - 10, size: 9.5, font: reg, color: gris });
      y -= 26;
    }
    if (conEncabezado) encabezadoTabla();
  };
  const fila = (f, par) => {
    if (y - ALTO < M + 14) nuevaPagina();
    if (par) page.drawRectangle({ x: M, y: y - ALTO, width: ancho, height: ALTO, color: suave });
    cols.forEach((c, i) => {
      const v = c.k === 'edad' ? (f.edad == null ? '' : String(f.edad)) : f[c.k];
      if (v === '' || v == null) return;
      const fnt = c.k === 'nombre' ? bold : reg;
      page.drawText(recortar(v, fnt, 9, anchos[i] - 8), { x: xs[i] + 5, y: y - ALTO + 6, size: 9, font: fnt, color: tinta });
    });
    page.drawLine({ start: { x: M, y: y - ALTO }, end: { x: M + ancho, y: y - ALTO }, thickness: 0.5, color: linea });
    y -= ALTO;
  };
  if (agrupar) {
    const grupos = new Map();
    for (const f of filas) {
      const g = f.casa || 'Sin casa';
      if (!grupos.has(g)) grupos.set(g, []);
      grupos.get(g).push(f);
    }
    nuevaPagina(false);
    for (const [g, lista] of grupos) {
      if (y - 28 - ALTO * 2 < M + 14) nuevaPagina(false);
      y -= 8;
      page.drawText(seguro(`${g} · ${lista.length}`), { x: M, y: y - 12, size: 12, font: bold, color: morado });
      y -= 20;
      encabezadoTabla();
      lista.forEach((f, i) => fila(f, i % 2 === 1));
      y -= 6;
    }
  } else {
    nuevaPagina(true);
    filas.forEach((f, i) => fila(f, i % 2 === 1));
  }
  const paginas = pdf.getPages();
  paginas.forEach((p, i) => p.drawText(`${i + 1} / ${paginas.length}`, { x: tam[0] - M - 30, y: 22, size: 8, font: reg, color: gris }));
  return pdf.save();
}