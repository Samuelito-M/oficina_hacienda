// Uso: node test/menuHoja.test.mjs "<menu.xlsx>"
// Comprueba que el menú limpio sale con una sola hoja (la del menú), las firmas abajo,
// sin cantidades ni "en casa", y listo para imprimir en una página.
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import JSZip from 'jszip';
import fs from 'fs';
globalThis.DOMParser = DOMParser;
globalThis.XMLSerializer = XMLSerializer;
const { leerMenu, previsualizarMenu, generarMenu, FIRMA_COORDINADORA, FIRMA_DOCTOR } = await import('../src/lib/menu.js');
const { limpiarCelda } = await import('../src/lib/menuLimpieza.js');

let fallas = 0;
const ok = (c, m) => {
  console.log(c ? '✓' : '✗', m);
  if (!c) fallas++;
};

// 1. Limpieza de texto
const casos = [
  ['carne frita con menestra lenteja y ensalada 3.5 libras de carne fileteada', 'carne frita con menestra lenteja y ensalada'],
  ['arroz con huevo frito y ensalada 1 huevo por chico', 'arroz con huevo frito y ensalada'],
  ['sopa de quinoa con un pollo entero', 'sopa de quinoa con pollo'],
  ['sanduche de mortadela -pan en casa', 'sanduche de mortadela'],
  ['pan hecho en casa con mermelada', 'pan con mermelada'],
  ['Pan casero con queso', 'pan con queso'],
  ['galletas hechas en casa', 'galletas'],
  ['yogurt en casa', 'yogurt'],
  ['arroz con 2 tazas de leche', 'arroz con leche'],
  ['arroz con leche 2 litros de leche', 'arroz con leche'],
  ['batido de frutilla 3 tazas', 'batido de frutilla'],
  ['sopa de fideo media libra de fideo', 'sopa de fideo'],
  ['mote con chicharron 4Lb y ensalada', 'mote con chicharron y ensalada'],
  ['seco de pollo, 3 kg', 'seco de pollo'],
  ['huevos x2', 'huevos'],
  ['jugo de naranja 1 funda', 'jugo de naranja'],
  ['arroz con pollo 1 pollo por casa', 'arroz con pollo'],
  ['tortillas (10) con queso', 'tortillas con queso'],
  ['encebollado de pescado 4 libras de pescado', 'encebollado de pescado']
];
for (const [a, b] of casos) {
  const r = limpiarCelda(a).valor;
  ok(r === b, `“${a}” → “${r}”`);
}

async function hojaDe(bytes) {
  const z = await JSZip.loadAsync(bytes);
  const wb = await z.file('xl/workbook.xml').async('string');
  const hojas = wb.match(/<sheet [^>]*>/g) || [];
  const rels = await z.file('xl/_rels/workbook.xml.rels').async('string');
  const rid = hojas[0].match(/r:id="([^"]+)"/)[1];
  const destino = rels.match(new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="${rid}"`));
  const ruta = 'xl/' + (destino[1] || destino[2]).replace(/^\/?xl\//, '');
  const sheet = await z.file(ruta).async('string');
  const ss = z.file('xl/sharedStrings.xml') ? await z.file('xl/sharedStrings.xml').async('string') : '';
  return { z, wb, hojas, sheet, ss, archivos: Object.keys(z.files).filter((f) => !z.files[f].dir) };
}

const textoDe = (h) => {
  const sis = (h.ss.match(/<si>[\s\S]*?<\/si>/g) || []).map((si) => (si.match(/<t[^>]*>([^<]*)<\/t>/g) || []).map((t) => t.replace(/<[^>]+>/g, '')).join(''));
  const celdas = {};
  for (const m of h.sheet.matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const [, ref, attrs, cuerpo = ''] = m;
    let v = '';
    if (/t="s"/.test(attrs)) v = sis[+(cuerpo.match(/<v>([^<]*)<\/v>/) || [])[1]] || '';
    else if (/t="inlineStr"/.test(attrs)) v = (cuerpo.match(/<t[^>]*>([^<]*)<\/t>/g) || []).map((t) => t.replace(/<[^>]+>/g, '')).join('');
    else v = (cuerpo.match(/<v>([^<]*)<\/v>/) || [])[1] || '';
    celdas[ref] = v;
  }
  return celdas;
};

async function revisar(nombre, bytes, { conFirmasViejas }) {
  console.log(`\n== ${nombre}`);
  const m = await leerMenu(bytes, JSZip);
  const r = previsualizarMenu(m);
  const out = await generarMenu(m, r);
  const h = await hojaDe(out);
  ok(h.hojas.length === 1 && /name="Meal Planner"/.test(h.hojas[0]), 'queda una sola hoja y es la del menú');
  ok(!h.archivos.some((f) => /worksheets\/sheet[2-9]|drawings\//.test(f)), 'se borraron las otras hojas y sus dibujos: ' + h.archivos.filter((f) => /worksheets|drawings/.test(f)).join(', '));
  ok(/_xlnm\.Print_Area/.test(h.wb) && /fitToPage="1"/.test(h.sheet) && /fitToHeight="1"/.test(h.sheet), 'imprime en una sola página');
  ok(!/Shopping|Meal Planner \(2\)/.test(h.ss), 'no quedan textos de las otras hojas');
  const c = textoDe(h);
  const comidas = Object.entries(c).filter(([ref]) => {
    const fila = +ref.replace(/\D/g, '');
    return fila > 2 && fila <= m.ultimaFila && !/^A/.test(ref);
  });
  const conNumero = comidas.filter(([, v]) => /\d/.test(v));
  ok(!conNumero.length, 'ninguna comida con números: ' + conNumero.map(([k, v]) => `${k}=${v}`).join(' | '));
  const conCasa = comidas.filter(([, v]) => /en casa|caser[oa]/i.test(v));
  ok(!conCasa.length, 'nada dice “en casa”: ' + conCasa.map(([k, v]) => `${k}=${v}`).join(' | '));
  const fuera = Object.entries(c).filter(([ref, v]) => /^[G-Z]/.test(ref) && v.trim());
  ok(!fuera.length, 'nada escrito a la derecha del menú');
  const abajo = Object.entries(c).filter(([ref, v]) => +ref.replace(/\D/g, '') > m.ultimaFila && v.trim());
  const textos = abajo.map(([, v]) => v);
  ok(textos.filter((t) => /^_+$/.test(t)).length === 2, 'dos líneas para firmar');
  ok(textos.some((t) => /Reeger/.test(t)), 'firma de la coordinadora: ' + textos.join(' | '));
  ok(textos.some((t) => /coordinador/i.test(t)), 'dice coordinadora');
  if (conFirmasViejas) ok(textos.includes('Dr. Carlos Guerrero'), 'respeta el nombre del doctor que ya estaba');
  else ok(textos.includes(FIRMA_DOCTOR) && textos.includes(FIRMA_COORDINADORA), 'sin firmas en el Excel, las pone igual');
  ok(abajo.every(([ref]) => +ref.replace(/\D/g, '') <= m.ultimaFila + 5), 'las firmas van justo debajo del menú');
  const ultimaRef = Math.max(...Object.keys(c).map((k) => +k.replace(/\D/g, '')));
  ok(new RegExp(`\\$A\\$1:\\$F\\$${ultimaRef}<`).test(h.wb), 'el área de impresión llega hasta las firmas');
  return out;
}

const original = fs.readFileSync(process.argv[2]);
await revisar('Menú como llega', original, { conFirmasViejas: true });

// 2. Variante: la hoja del menú no es la primera, sin firmas, con “hecho en casa” y notas a la derecha
const z = await JSZip.loadAsync(original);
let wb = await z.file('xl/workbook.xml').async('string');
const hojas = wb.match(/<sheet [^>]*\/>/g);
wb = wb.replace(/<sheets>[\s\S]*<\/sheets>/, `<sheets>${hojas[3]}${hojas[1]}${hojas[0]}${hojas[2]}</sheets>`);
z.file('xl/workbook.xml', wb);
let s1 = await z.file('xl/worksheets/sheet1.xml').async('string');
s1 = s1.replace(/<row r="(19|2\d)"[\s\S]*?<\/row>/g, (fila) => fila.replace(/<c ([^>]*?) t="s"([^>]*)>[\s\S]*?<\/c>/g, '<c $1$2/>'));
const ponerCelda = (xml, ref, texto) => {
  const nueva = (attrs) => `<c r="${ref}"${attrs.replace(/\s*t="[^"]*"/, '')} t="inlineStr"><is><t>${texto}</t></is></c>`;
  const lleno = new RegExp(`<c r="${ref}"([^>]*?)(?<!\\/)>(?:(?!<\\/c>)[\\s\\S])*<\\/c>`);
  const vacio = new RegExp(`<c r="${ref}"([^>]*?)\\/>`);
  if (lleno.test(xml)) return xml.replace(lleno, (_, a) => nueva(a));
  return xml.replace(vacio, (_, a) => nueva(a));
};
s1 = ponerCelda(s1, 'C4', 'pan hecho en casa con 2 tazas de leche');
s1 = ponerCelda(s1, 'G5', '3 libras');
z.file('xl/worksheets/sheet1.xml', s1);
const variante = await z.generateAsync({ type: 'uint8array' });
const out2 = await revisar('Menú en otro orden y sin firmas', variante, { conFirmasViejas: false });
if (process.argv[3]) fs.writeFileSync(process.argv[3], out2);

console.log(fallas ? `\n${fallas} FALLAS` : '\nTodo bien');
process.exit(fallas ? 1 : 0);
