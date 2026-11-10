import { parseXml, serializeXml, hijos, porTag } from './xml.js';
import { fold } from './text.js';
import { limpiarMenu, ORTOGRAFIA_BASE } from './menuLimpieza.js';

export class MenuError extends Error {}

const S_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const DIAS = /^(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/;
const COMIDAS = ['desayuno', 'colacion', 'almuerzo', 'refrigerio', 'cena'];

const colDe = (ref) => ref.replace(/\d+/g, '');
const colNum = (col) => col.split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);

function resolver(base, target) {
  if (target.startsWith('/')) return target.slice(1);
  const partes = base.split('/').slice(0, -1);
  for (const p of target.split('/')) {
    if (p === '..') partes.pop();
    else if (p !== '.') partes.push(p);
  }
  return partes.join('/');
}

function textoSi(si) {
  return porTag(si, 't').map((t) => t.textContent).join('');
}

function valorCelda(c, compartidos) {
  const t = c.getAttribute('t');
  if (t === 'inlineStr') return porTag(c, 't').map((x) => x.textContent).join('');
  const v = porTag(c, 'v')[0];
  if (!v) return '';
  if (t === 's') return compartidos[+v.textContent] ?? '';
  return v.textContent;
}

export async function leerMenu(data, JSZip) {
  let zip;
  try {
    zip = await JSZip.loadAsync(data, { createFolders: false });
  } catch {
    throw new MenuError('No pude abrir el Excel. Revisa que sea un archivo .xlsx.');
  }
  const wbFile = zip.file('xl/workbook.xml');
  if (!wbFile) throw new MenuError('Este archivo no parece un Excel (.xlsx).');
  const wb = parseXml(await wbFile.async('string'));
  const rels = parseXml(await zip.file('xl/_rels/workbook.xml.rels').async('string'));
  const hojas = porTag(wb, 'sheet').map((s) => ({ nombre: s.getAttribute('name'), rid: s.getAttribute('r:id') }));
  const hoja = hojas.find((h) => fold(h.nombre).trim() === 'meal planner') || hojas[0];
  if (!hoja) throw new MenuError('El Excel no tiene hojas.');
  const rel = porTag(rels, 'Relationship').find((r) => r.getAttribute('Id') === hoja.rid);
  const ruta = resolver('xl/workbook.xml', rel.getAttribute('Target'));
  const sheetFile = zip.file(ruta);
  if (!sheetFile) throw new MenuError('No encontré la hoja del menú dentro del Excel.');
  const doc = parseXml(await sheetFile.async('string'));
  let compartidos = [];
  const ssFile = zip.file('xl/sharedStrings.xml');
  if (ssFile) compartidos = porTag(parseXml(await ssFile.async('string')), 'si').map(textoSi);

  const rows = porTag(doc, 'row');
  let titulo = '';
  let encabezado = null;
  const columnas = {};
  for (const r of rows) {
    const celdas = porTag(r, 'c');
    const vals = celdas.map((c) => ({ c, col: colDe(c.getAttribute('r')), v: valorCelda(c, compartidos) }));
    if (!titulo) {
      const t = vals.find((x) => x.v && x.v.trim());
      if (t && !encabezado) titulo = t.v.trim();
    }
    const enc = vals.filter((x) => COMIDAS.includes(fold(x.v).trim()));
    if (enc.length >= 3) {
      encabezado = r;
      for (const x of enc) columnas[fold(x.v).trim()] = { col: x.col, etiqueta: x.v.trim() };
      break;
    }
  }
  if (!encabezado) throw new MenuError('No encontré la fila con Desayuno, Colación, Almuerzo, Refrigerio y Cena.');
  const ordenComidas = COMIDAS.filter((k) => columnas[k]);
  const ultimaCol = Math.max(...ordenComidas.map((k) => colNum(columnas[k].col)));
  const primeraCol = Math.min(...ordenComidas.map((k) => colNum(columnas[k].col)));
  const filas = [];
  let enDatos = false;
  for (const r of rows) {
    if (r === encabezado) {
      enDatos = true;
      continue;
    }
    if (!enDatos) continue;
    const celdas = porTag(r, 'c');
    const porCol = new Map(celdas.map((c) => [colDe(c.getAttribute('r')), c]));
    const diaCelda = celdas.find((c) => colNum(colDe(c.getAttribute('r'))) < primeraCol && DIAS.test(fold(valorCelda(c, compartidos)).trim()));
    if (!diaCelda) continue;
    const comidas = ordenComidas.map((k) => {
      const c = porCol.get(columnas[k].col) || null;
      return { clave: k, etiqueta: columnas[k].etiqueta, col: columnas[k].col, el: c, valor: c ? valorCelda(c, compartidos) : '', esCena: k === 'cena' };
    });
    const sueltos = celdas.filter((c) => {
      if (colNum(colDe(c.getAttribute('r'))) <= ultimaCol) return false;
      const t = c.getAttribute('t');
      const v = porTag(c, 'v')[0];
      return v && (!t || t === 'n') && v.textContent.trim() !== '';
    });
    filas.push({ fila: r.getAttribute('r'), dia: valorCelda(diaCelda, compartidos), diaEl: diaCelda, comidas, sueltos: sueltos.map((c) => ({ el: c, valor: porTag(c, 'v')[0].textContent })) });
  }
  if (!filas.length) throw new MenuError('No encontré los días del menú (lunes, martes…) en la primera columna.');
  return { zip, ruta, doc, titulo, filas, hoja: hoja.nombre, otrasHojas: hojas.filter((h) => h !== hoja).map((h) => h.nombre), comidas: ordenComidas.map((k) => columnas[k].etiqueta) };
}

export function previsualizarMenu(menu, extra = {}) {
  return limpiarMenu(menu.filas, { ...ORTOGRAFIA_BASE, ...extra });
}

function ponerTexto(doc, c, texto) {
  while (c.firstChild) c.removeChild(c.firstChild);
  c.setAttribute('t', 'inlineStr');
  const is = doc.createElementNS(S_NS, 'is');
  const t = doc.createElementNS(S_NS, 't');
  t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
  t.textContent = texto;
  is.appendChild(t);
  c.appendChild(is);
}

function vaciar(c) {
  while (c.firstChild) c.removeChild(c.firstChild);
  c.removeAttribute('t');
}

export async function generarMenu(menu, resultado) {
  const { zip, ruta, doc } = menu;
  let habiaFormula = false;
  for (const f of resultado.filas) {
    if (f.diaCambio) {
      if (porTag(f.diaEl, 'f').length) habiaFormula = true;
      ponerTexto(doc, f.diaEl, f.diaNuevo);
    }
    for (const c of f.comidas) {
      if (!c.el || !c.cambio) continue;
      if (porTag(c.el, 'f').length) habiaFormula = true;
      ponerTexto(doc, c.el, c.nuevo);
    }
    for (const s of f.sueltos) {
      if (porTag(s.el, 'f').length) habiaFormula = true;
      vaciar(s.el);
    }
  }
  zip.file(ruta, serializeXml(doc), { createFolders: false });
  if (habiaFormula && zip.file('xl/calcChain.xml')) {
    zip.remove('xl/calcChain.xml');
    const ct = parseXml(await zip.file('[Content_Types].xml').async('string'));
    for (const o of porTag(ct, 'Override')) if (o.getAttribute('PartName') === '/xl/calcChain.xml') o.parentNode.removeChild(o);
    zip.file('[Content_Types].xml', serializeXml(ct), { createFolders: false });
    const rels = parseXml(await zip.file('xl/_rels/workbook.xml.rels').async('string'));
    for (const r of porTag(rels, 'Relationship')) if (/calcChain/.test(r.getAttribute('Type') || '')) r.parentNode.removeChild(r);
    zip.file('xl/_rels/workbook.xml.rels', serializeXml(rels), { createFolders: false });
  }
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
