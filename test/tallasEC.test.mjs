import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import JSZip from 'jszip';
import fs from 'fs';
import * as PDFLib from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { execFileSync } from 'child_process';
globalThis.DOMParser = DOMParser; globalThis.XMLSerializer = XMLSerializer;
const T = await import('../src/lib/tallas.js');
const E = await import('../src/lib/exportar.js');
const D = await import('../src/lib/documentos.js');
const N = await import('../src/lib/ninos.js');
const ok = (c, m) => { console.log((c ? 'ok - ' : 'FALLA - ') + m); if (!c) process.exitCode = 1; };
const out = process.argv[2];
const ninos = [
  { id: 'a', nombre: 'Pablo Espinoza', casa: 'Casa 2', nacimiento: '2015-03-02', tallaRopa: '14 youth', tallaZapatos: '4 youth', tallaRopaEC: '12', tallaZapatosEC: '35', colorFavorito: 'Azul', deseos: 'Pelota' },
  { id: 'b', nombre: 'Mia', casa: 'Casa 1', nacimiento: '2019-07-10', tallaRopa: '5T', tallaZapatos: '12 Toddler', tallaRopaEC: '', tallaZapatosEC: '29' },
  { id: 'c', nombre: 'Gael Tupay', casa: 'Casa 3', nacimiento: '2012-01-20', tallaRopa: '', tallaZapatos: '', tallaRopaEC: '14', tallaZapatosEC: '38' }
];
ok(T.tallaDe(ninos[0], 'ropa', 'us') === '14 youth' && T.tallaDe(ninos[0], 'ropa', 'ec') === '12', 'talla americana y Ecuador por separado');
ok(T.tallaDe(ninos[0], 'zapatos', 'ambas') === '4 youth (Americana) · 35 (Ecuador)' && T.tallaDe(ninos[0], 'zapatos', 'ambas', 'en') === '4 youth (US) · 35 (Ecuador)', 'ambas: ' + T.tallaDe(ninos[0], 'zapatos', 'ambas'));
ok(T.tallaDe(ninos[1], 'ropa', 'ambas') === '5T (Americana)' && T.tallaDe(ninos[2], 'ropa', 'ambas') === '14 (Ecuador)', 'ambas con una sola talla no deja huecos');
const r = T.resumenTallas(ninos, 'ambas');
ok(r.partes.length === 2 && r.partes[1].zapatos.lista.length === 3 && r.partes[0].zapatos.sin === 1, 'resumen con las dos tallas');
ok(T.resumenTallas(ninos, 'ec').partes.length === 1 && T.resumenTallas(ninos, 'ec').ropa.lista.map((g) => g.talla).join() === '12,14', 'resumen solo Ecuador');
const txt = T.textoTallas(r, 'Tallas');
ok(/Tallas de ropa \(Americana\)/.test(txt) && /Tallas de zapatos \(Ecuador\):\n• 29: 1/.test(txt), 'el texto para WhatsApp dice qué talla es');
ok(T.esVieja({ tallaRopaEC: '12', tallasFecha: '2025-01-01' }), 'una talla Ecuador vieja también se marca para revisar');
// lista Excel
const filas = E.filasExport(ninos, () => 9);
for (const s of ['us', 'ec', 'ambas']) {
  const x = await E.generarExcelNinos(filas, ['casa', 'ropa', 'zapatos'], JSZip, s);
  fs.writeFileSync(`${out}/lista-${s}.xlsx`, x);
}
const leer = (f) => JSON.parse(execFileSync('python3', ['-c', `import openpyxl,json;ws=openpyxl.load_workbook('${f}').active;print(json.dumps([[c for c in r] for r in ws.iter_rows(values_only=True)]))`]).toString());
const us = leer(`${out}/lista-us.xlsx`), ec = leer(`${out}/lista-ec.xlsx`), am = leer(`${out}/lista-ambas.xlsx`);
ok(us[0].join('|') === 'Nombre|Casa|Ropa (Americana)|Zapatos (Americana)' && us[1][2] === '14 youth', 'Excel americana: ' + us[0].join(', '));
ok(ec[0].join('|') === 'Nombre|Casa|Ropa (Ecuador)|Zapatos (Ecuador)' && ec[1][3] === '35', 'Excel Ecuador');
ok(am[0].join('|') === 'Nombre|Casa|Ropa Americana|Ropa Ecuador|Zapato Americano|Zapato Ecuador' && am[1].slice(2).join('|') === '14 youth|12|4 youth|35', 'Excel ambas: 4 columnas separadas');
// lista PDF
for (const s of ['us', 'ambas']) fs.writeFileSync(`${out}/lista-${s}.pdf`, await E.generarPdfNinos(filas, ['casa', 'cumple', 'edad', 'ropa', 'zapatos'], { sistema: s, agrupar: false }, PDFLib));
const t1 = execFileSync('pdftotext', ['-layout', `${out}/lista-ambas.pdf`, '-']).toString();
ok(/Ropa Americana/.test(t1) && /Zapato Ecuador/.test(t1) && /14 youth\s+12\s+4 youth\s+35/.test(t1), 'PDF lista con ambas tallas, sin cortar los títulos');
ok(execFileSync('pdfinfo', [`${out}/lista-ambas.pdf`]).toString().includes('841.89 x 595.28'), 'PDF con ambas tallas sale horizontal para que quepa');
// hojas de regalos
const recursos = { normal: fs.readFileSync('node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff'), bold: fs.readFileSync('node_modules/@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff'), mano: fs.readFileSync('src/assets/mano.png'), esther: fs.readFileSync('src/assets/casa-esther.png') };
const hoja = async (s, idioma) => { const f = `${out}/regalo-${s}-${idioma}.pdf`; fs.writeFileSync(f, await D.generarHojasRegalo({ ninos: [ninos[0]], idioma, sistema: s }, PDFLib, fontkit, recursos)); return execFileSync('pdftotext', [f, '-']).toString().replace(/\s+/g, ' '); };
const en_us = await hoja('us', 'en'), en_ec = await hoja('ec', 'en'), en_am = await hoja('ambas', 'en'), es_us = await hoja('us', 'es'), es_am = await hoja('ambas', 'es');
ok(/CLOTHING SIZES: 14 youth SHOE SIZE: 4 youth/.test(en_us) || (en_us.includes('14 youth') && !en_us.includes('(US)') && !en_us.includes('35')), 'hoja en inglés, americana: solo "14 youth" y "4 youth"');
ok(en_ec.includes('12 (Ecuador)') && en_ec.includes('35 (Ecuador)') && !en_ec.includes('youth'), 'hoja en inglés, Ecuador: dice "(Ecuador)" para que no se confundan');
ok(en_am.includes('14 youth (US)') && en_am.includes('12 (Ecuador)'), 'hoja en inglés, ambas');
ok(es_us.includes('14 youth (Americana)') && es_am.includes('35 (Ecuador)'), 'hoja en español marca la americana');
// importar excel con columnas de Ecuador
const zip = new JSZip();
const cel = (r, c, v) => `<c r="${c}${r}" t="inlineStr"><is><t>${v}</t></is></c>`;
const filasX = [['Nombre', 'Casa', 'Talla ropa', 'Talla ropa Ecuador', 'Talla zapatos americana', 'Zapatos Ecuador'], ['Ana Prueba', 'Casa 1', '10 youth', '10', '3 youth', '34']];
zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
zip.file('xl/workbook.xml', '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="N" sheetId="1" r:id="rId1"/></sheets></workbook>');
zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
zip.file('xl/worksheets/sheet1.xml', `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${filasX.map((f, i) => `<row r="${i + 1}">${f.map((v, j) => cel(i + 1, 'ABCDEF'[j], v)).join('')}</row>`).join('')}</sheetData></worksheet>`);
const xb = await zip.generateAsync({ type: 'uint8array' });
fs.writeFileSync(`${out}/importar-ec.xlsx`, xb);
const imp = await N.leerListaExcel(xb, JSZip);
const a = (imp.ninos || imp)[0];
ok(a && a.tallaRopa === '10 youth' && a.tallaRopaEC === '10' && a.tallaZapatos === '3 youth' && a.tallaZapatosEC === '34', 'importar Excel reconoce las columnas de Ecuador y americanas: ' + JSON.stringify(a && { r: a.tallaRopa, rEC: a.tallaRopaEC, z: a.tallaZapatos, zEC: a.tallaZapatosEC }));
const real = await N.leerListaExcel(fs.readFileSync('/home/claude/ninos/Lista de niños Hacienda.xlsx'), JSZip);
const rn = (real.ninos || real);
ok(rn.length === 43 && rn.some((n) => n.tallaRopa === '14 youth') && rn.every((n) => !n.tallaRopaEC), 'la lista de siempre se sigue importando como talla americana');
for (const s of ['us', 'ec']) {
  const f = `${out}/lista-${s}-casas.pdf`;
  fs.writeFileSync(f, await E.generarPdfNinos(filas, ['casa', 'cumple', 'edad', 'ropa', 'zapatos'], { sistema: s, agrupar: true }, PDFLib));
  const t = execFileSync('pdftotext', ['-layout', f, '-']).toString();
  ok(!t.includes('…') && (s === 'us' ? /Ropa \(Americana\)\s+Zapatos \(Americana\)/ : /Ropa \(Ecuador\)\s+Zapatos \(Ecuador\)/).test(t), `PDF por casa (${s}): títulos completos`);
}
