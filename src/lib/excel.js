const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

export function colLetra(i) {
  let s = '';
  i += 1;
  while (i > 0) {
    const r = (i - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

export function serialFecha(v) {
  let y;
  let m;
  let d;
  if (v instanceof Date) {
    y = v.getFullYear();
    m = v.getMonth() + 1;
    d = v.getDate();
  } else {
    const x = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!x) return null;
    y = +x[1];
    m = +x[2];
    d = +x[3];
  }
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
}

const ESTILO = { texto: 0, encabezado: 1, fecha: 2, dinero: 3, total: 4, totalDinero: 5, numero: 0 };

function celda(ref, v, tipo, total) {
  if (v == null || v === '') return '';
  if (tipo === 'fecha') {
    const s = serialFecha(v);
    return s == null ? `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>` : `<c r="${ref}" s="2"><v>${s}</v></c>`;
  }
  if (tipo === 'numero' || tipo === 'dinero') {
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    const s = tipo === 'dinero' ? (total ? 5 : 3) : total ? 4 : 0;
    return `<c r="${ref}"${s ? ` s="${s}"` : ''}><v>${n}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"${total ? ' s="4"' : ''}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
}

function hojaXml(h) {
  const n = h.columnas.length;
  const filas = [];
  filas.push(`<row r="1">${h.columnas.map((c, i) => `<c r="${colLetra(i)}1" t="inlineStr" s="1"><is><t xml:space="preserve">${esc(c.t)}</t></is></c>`).join('')}</row>`);
  h.filas.forEach((f, ri) => {
    const r = ri + 2;
    filas.push(`<row r="${r}">${h.columnas.map((c, i) => celda(`${colLetra(i)}${r}`, f[i], c.tipo, false)).join('')}</row>`);
  });
  let ultimaFila = h.filas.length + 1;
  if (h.total) {
    ultimaFila += 1;
    filas.push(`<row r="${ultimaFila}">${h.columnas.map((c, i) => celda(`${colLetra(i)}${ultimaFila}`, h.total[i], c.tipo, true)).join('')}</row>`);
  }
  const ref = `A1:${colLetra(n - 1)}${Math.max(1, h.filas.length + 1)}`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${colLetra(n - 1)}${Math.max(1, ultimaFila)}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${h.columnas.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.w || 14}" customWidth="1"/>`).join('')}</cols><sheetData>${filas.join('')}</sheetData>${h.filtro === false ? '' : `<autoFilter ref="${ref}"/>`}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/></worksheet>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="&quot;$&quot;#,##0.00"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2F3437"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top style="thin"><color auto="1"/></top><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left"/></xf><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/><xf numFmtId="165" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

export async function crearExcel(hojas, JSZip) {
  const nombres = hojas.map((h, i) => String(h.nombre || `Hoja${i + 1}`).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || `Hoja${i + 1}`);
  const zip = new JSZip();
  const o = { createFolders: false };
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`, o);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`, o);
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${nombres.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`, o);
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`, o);
  hojas.forEach((h, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, hojaXml(h), o));
  zip.file('xl/styles.xml', STYLES, o);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
