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
    const sueltos = celdas.filter((c) => colNum(colDe(c.getAttribute('r'))) > ultimaCol && String(valorCelda(c, compartidos)).trim() !== '');
    filas.push({ fila: r.getAttribute('r'), dia: valorCelda(diaCelda, compartidos), diaEl: diaCelda, comidas, sueltos: sueltos.map((c) => ({ el: c, valor: String(valorCelda(c, compartidos)).trim() })) });
  }
  if (!filas.length) throw new MenuError('No encontré los días del menú (lunes, martes…) en la primera columna.');
  const ultimaFila = Math.max(...filas.map((f) => +f.fila));
  const debajo = [];
  for (const r of rows) {
    const n = +r.getAttribute('r');
    if (n <= ultimaFila) continue;
    for (const c of porTag(r, 'c')) {
      const v = String(valorCelda(c, compartidos)).replace(/\s+/g, ' ').trim();
      if (v && !/^_+$/.test(v)) debajo.push({ fila: n, col: colDe(c.getAttribute('r')), v });
    }
  }
  return {
    zip,
    ruta,
    doc,
    titulo,
    filas,
    hoja: hoja.nombre,
    hojaRid: hoja.rid,
    otrasHojas: hojas.filter((h) => h !== hoja).map((h) => h.nombre),
    comidas: ordenComidas.map((k) => columnas[k].etiqueta),
    columnas: ordenComidas.map((k) => columnas[k].col),
    colDia: colDe(filas[0].diaEl.getAttribute('r')),
    ultimaFila,
    firmas: leerFirmas(debajo)
  };
}

export const FIRMA_COORDINADORA = 'Jauna Reeger';
export const CARGO_COORDINADORA = 'Coordinadora';
export const FIRMA_DOCTOR = 'Doctor(a)';

function leerFirmas(debajo) {
  const k = (x) => fold(x.v).trim();
  const nombre = debajo.find((x) => /reeger/.test(k(x)));
  const cargo = debajo.find((x) => /coordinador/.test(k(x)));
  const doctor = debajo.find((x) => /^dra?\.?\s|^doctor|^dr\.?$/.test(k(x)));
  const cargoDoc = doctor && debajo.find((x) => x.col === doctor.col && x.fila === doctor.fila + 1);
  return {
    coordinadora: nombre ? nombre.v : FIRMA_COORDINADORA,
    cargo: cargo ? cargo.v : CARGO_COORDINADORA,
    doctor: doctor ? doctor.v : FIRMA_DOCTOR,
    cargoDoctor: cargoDoc ? cargoDoc.v : ''
  };
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

const ORDEN_HOJA = ['sheetPr', 'dimension', 'sheetViews', 'sheetFormatPr', 'cols', 'sheetData', 'sheetCalcPr', 'sheetProtection', 'protectedRanges', 'scenarios', 'autoFilter', 'sortState', 'dataConsolidate', 'customSheetViews', 'mergeCells', 'phoneticPr', 'conditionalFormatting', 'dataValidations', 'hyperlinks', 'printOptions', 'pageMargins', 'pageSetup', 'headerFooter', 'rowBreaks', 'colBreaks', 'customProperties', 'cellWatches', 'ignoredErrors', 'smartTags', 'drawing', 'legacyDrawing', 'legacyDrawingHF', 'drawingHF', 'picture', 'oleObjects', 'controls', 'webPublishItems', 'tableParts', 'extLst'];
const ORDEN_LIBRO = ['fileVersion', 'fileSharing', 'workbookPr', 'workbookProtection', 'bookViews', 'sheets', 'functionGroups', 'externalReferences', 'definedNames', 'calcPr', 'oleSize', 'customWorkbookViews', 'pivotCaches', 'smartTagPr', 'smartTagTypes', 'webPublishing', 'fileRecoveryPr', 'webPublishObjects', 'extLst'];
const local = (el) => el.localName || el.nodeName.replace(/^.*:/, '');
const letraCol = (n) => {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

function hijoLocal(el, nombre) {
  for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && local(n) === nombre) return n;
  return null;
}

function ponerEnOrden(padre, el, orden) {
  const yo = orden.indexOf(local(el));
  for (let n = padre.firstChild; n; n = n.nextSibling) {
    if (n.nodeType !== 1) continue;
    const i = orden.indexOf(local(n));
    if (i > yo) {
      padre.insertBefore(el, n);
      return el;
    }
  }
  padre.appendChild(el);
  return el;
}

function asegurar(doc, padre, nombre, orden) {
  return hijoLocal(padre, nombre) || ponerEnOrden(padre, doc.createElementNS(S_NS, nombre), orden);
}

const rangoFilas = (ref) => {
  const m = String(ref).match(/^[A-Z]+(\d+)(?::[A-Z]+(\d+))?$/);
  return m ? [+m[1], +(m[2] || m[1])] : [0, 0];
};

async function leerXml(zip, ruta) {
  const f = zip.file(ruta);
  return f ? parseXml(await f.async('string')) : null;
}

function estilosFirma(estilos, xfBase) {
  if (!estilos) return { normal: 0, negrita: 0, sz: 11, sz0: 11 };
  const fonts = porTag(estilos, 'fonts')[0];
  const xfs = porTag(estilos, 'cellXfs')[0];
  const listaFonts = hijos(fonts);
  const listaXf = hijos(xfs);
  const base = listaXf[xfBase] || listaXf[0];
  const fontId = base ? +(base.getAttribute('fontId') || 0) : 0;
  const tam = (f) => {
    const sz = f && hijoLocal(f, 'sz');
    return sz ? +sz.getAttribute('val') || 11 : 11;
  };
  const fuente = listaFonts[fontId] || listaFonts[0];
  const negrita = fuente.cloneNode(true);
  for (const b of hijos(negrita)) if (local(b) === 'b') negrita.removeChild(b);
  negrita.insertBefore(estilos.createElementNS(S_NS, 'b'), negrita.firstChild);
  fonts.appendChild(negrita);
  fonts.setAttribute('count', String(listaFonts.length + 1));
  const nuevoXf = (fid) => {
    const xf = estilos.createElementNS(S_NS, 'xf');
    for (const [k, v] of [['numFmtId', '0'], ['fontId', String(fid)], ['fillId', '0'], ['borderId', '0'], ['xfId', '0'], ['applyFont', '1'], ['applyAlignment', '1']]) xf.setAttribute(k, v);
    const al = estilos.createElementNS(S_NS, 'alignment');
    al.setAttribute('horizontal', 'center');
    al.setAttribute('vertical', 'center');
    al.setAttribute('wrapText', '1');
    xf.appendChild(al);
    xfs.appendChild(xf);
    return hijos(xfs).length - 1;
  };
  const normal = nuevoXf(fontId);
  const fuerte = nuevoXf(listaFonts.length);
  xfs.setAttribute('count', String(hijos(xfs).length));
  return { normal, negrita: fuerte, tam: (s) => tam(listaFonts[+((listaXf[s] || base || {}).getAttribute?.('fontId') || 0)]), sz0: tam(listaFonts[0]) };
}

function anchoColumnas(doc) {
  const fmt = porTag(doc, 'sheetFormatPr')[0];
  const def = fmt && fmt.getAttribute('defaultColWidth') ? +fmt.getAttribute('defaultColWidth') : 8.43;
  const cols = porTag(doc, 'col').map((c) => ({ min: +c.getAttribute('min'), max: +c.getAttribute('max'), w: +c.getAttribute('width') || def }));
  return (n) => (cols.find((c) => n >= c.min && n <= c.max) || { w: def }).w;
}

function lineas(texto, chars) {
  let n = 0;
  for (const parte of String(texto || '').split(/\n/)) {
    let largo = 0;
    n++;
    for (const w of parte.split(/\s+/).filter(Boolean)) {
      if (!largo) largo = w.length;
      else if (largo + 1 + w.length <= chars) largo += 1 + w.length;
      else {
        n++;
        largo = w.length;
      }
      while (largo > chars) {
        n++;
        largo -= chars;
      }
    }
  }
  return Math.max(1, n);
}

function nuevaCelda(doc, ref, texto, estilo) {
  const c = doc.createElementNS(S_NS, 'c');
  c.setAttribute('r', ref);
  c.setAttribute('s', String(estilo));
  if (texto) ponerTexto(doc, c, texto);
  return c;
}

function nuevaFila(doc, n, alto, celdas) {
  const r = doc.createElementNS(S_NS, 'row');
  r.setAttribute('r', String(n));
  r.setAttribute('ht', String(alto));
  r.setAttribute('customHeight', '1');
  for (const c of celdas) r.appendChild(c);
  return r;
}

const comillas = (nombre) => `'${String(nombre).replace(/'/g, "''")}'`;
const mencionaHoja = (texto, nombre) => texto.includes(`${comillas(nombre)}!`) || (/^[A-Za-z_][\w.]*$/.test(nombre) && new RegExp(`(^|[^\\w.'])${nombre.replace(/\./g, '\\.')}!`).test(texto));

async function podarPartes(zip) {
  const vivos = new Set(['[Content_Types].xml']);
  const relsDe = (p) => (p ? `${p.slice(0, p.lastIndexOf('/') + 1)}_rels/${p.slice(p.lastIndexOf('/') + 1)}.rels` : '_rels/.rels');
  const pila = [''];
  const vistos = new Set();
  while (pila.length) {
    const parte = pila.pop();
    if (vistos.has(parte)) continue;
    vistos.add(parte);
    if (parte) vivos.add(parte);
    const rp = relsDe(parte);
    const rels = await leerXml(zip, rp);
    if (!rels) continue;
    vivos.add(rp);
    for (const r of porTag(rels, 'Relationship')) {
      if (r.getAttribute('TargetMode') === 'External') continue;
      const destino = resolver(parte || '_', r.getAttribute('Target') || '');
      if (zip.file(destino)) pila.push(destino);
    }
  }
  const quitadas = [];
  zip.forEach((ruta, f) => {
    if (!f.dir && !vivos.has(ruta)) quitadas.push(ruta);
  });
  for (const r of quitadas) zip.remove(r);
  const ct = await leerXml(zip, '[Content_Types].xml');
  if (ct) {
    for (const o of porTag(ct, 'Override')) if (!zip.file(String(o.getAttribute('PartName') || '').replace(/^\//, ''))) o.parentNode.removeChild(o);
    zip.file('[Content_Types].xml', serializeXml(ct), { createFolders: false });
  }
  return quitadas;
}

async function soloLaHojaDelMenu(zip, menu, filaFin, colFin) {
  const wb = await leerXml(zip, 'xl/workbook.xml');
  const rels = await leerXml(zip, 'xl/_rels/workbook.xml.rels');
  const sheets = porTag(wb, 'sheet');
  const otras = sheets.filter((s) => s.getAttribute('r:id') !== menu.hojaRid);
  const nombresOtras = otras.map((s) => s.getAttribute('name'));
  const indice = sheets.findIndex((s) => s.getAttribute('r:id') === menu.hojaRid);
  const ridsOtras = new Set(otras.map((s) => s.getAttribute('r:id')));
  for (const s of otras) s.parentNode.removeChild(s);
  for (const r of porTag(rels, 'Relationship')) if (ridsOtras.has(r.getAttribute('Id')) || /calcChain/.test(r.getAttribute('Type') || '')) r.parentNode.removeChild(r);
  const raiz = wb.documentElement;
  for (const v of porTag(wb, 'workbookView')) {
    v.removeAttribute('activeTab');
    v.removeAttribute('firstSheet');
  }
  let dn = hijoLocal(raiz, 'definedNames');
  if (dn) {
    for (const d of hijos(dn)) {
      const ls = d.getAttribute('localSheetId');
      const nombre = d.getAttribute('name') || '';
      if ((ls != null && ls !== '' && +ls !== indice) || nombresOtras.some((h) => mencionaHoja(d.textContent || '', h)) || /^_xlnm\.(print_area|print_titles)$/i.test(nombre)) dn.removeChild(d);
      else if (ls != null && ls !== '') d.setAttribute('localSheetId', '0');
    }
  } else dn = ponerEnOrden(raiz, wb.createElementNS(S_NS, 'definedNames'), ORDEN_LIBRO);
  const area = wb.createElementNS(S_NS, 'definedName');
  area.setAttribute('name', '_xlnm.Print_Area');
  area.setAttribute('localSheetId', '0');
  area.textContent = `${comillas(menu.hoja)}!$A$1:$${colFin}$${filaFin}`;
  dn.appendChild(area);
  zip.file('xl/workbook.xml', serializeXml(wb), { createFolders: false });
  zip.file('xl/_rels/workbook.xml.rels', serializeXml(rels), { createFolders: false });
  const app = await leerXml(zip, 'docProps/app.xml');
  if (app) {
    const titulos = porTag(app, 'TitlesOfParts')[0];
    const vec = titulos && hijos(titulos)[0];
    if (vec) {
      while (vec.firstChild) vec.removeChild(vec.firstChild);
      const l = app.createElementNS('http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes', 'vt:lpstr');
      l.textContent = menu.hoja;
      vec.appendChild(l);
      vec.setAttribute('size', '1');
    }
    const pares = porTag(app, 'HeadingPairs')[0];
    const vp = pares && hijos(pares)[0];
    if (vp) {
      const vars = hijos(vp);
      vars.slice(2).forEach((v) => vp.removeChild(v));
      const num = vars[1] && hijos(vars[1])[0];
      if (num) num.textContent = '1';
      vp.setAttribute('size', String(Math.min(2, vars.length)));
    }
    zip.file('docProps/app.xml', serializeXml(app), { createFolders: false });
  }
  return nombresOtras;
}

async function compactarTextos(zip, doc) {
  const ss = await leerXml(zip, 'xl/sharedStrings.xml');
  if (!ss) return;
  const lista = porTag(ss, 'si');
  const nuevo = new Map();
  const usados = [];
  for (const c of porTag(doc, 'c')) {
    if (c.getAttribute('t') !== 's') continue;
    const v = porTag(c, 'v')[0];
    const i = v ? +v.textContent : NaN;
    if (!lista[i]) continue;
    if (!nuevo.has(i)) {
      nuevo.set(i, usados.length);
      usados.push(lista[i]);
    }
    v.textContent = String(nuevo.get(i));
  }
  const raiz = ss.documentElement;
  for (const si of lista) raiz.removeChild(si);
  for (const si of usados) raiz.appendChild(si);
  raiz.setAttribute('count', String(usados.length));
  raiz.setAttribute('uniqueCount', String(usados.length));
  zip.file('xl/sharedStrings.xml', serializeXml(ss), { createFolders: false });
}

function mejorOrientacion(doc, ancho, ultimaCol, filaFin) {
  let w = 0;
  for (let i = 1; i <= ultimaCol; i++) w += (ancho(i) * 7 + 5) * 0.75;
  const fmt = porTag(doc, 'sheetFormatPr')[0];
  const def = (fmt && +fmt.getAttribute('defaultRowHeight')) || 15;
  const altos = new Map(porTag(doc, 'row').map((r) => [+r.getAttribute('r'), +r.getAttribute('ht') || def]));
  let h = 0;
  for (let i = 1; i <= filaFin; i++) h += altos.get(i) || def;
  const m = porTag(doc, 'pageMargins')[0];
  const mg = (k, d) => (m && m.getAttribute(k) != null ? +m.getAttribute(k) : d) * 72;
  const libreW = (lado) => lado - mg('left', 0.7) - mg('right', 0.7);
  const libreH = (lado) => lado - mg('top', 0.75) - mg('bottom', 0.75) - 20;
  const escala = (pw, ph) => Math.min(1, libreW(pw) / w, libreH(ph) / h);
  return escala(612, 792) > escala(792, 612) * 1.1 ? 'portrait' : 'landscape';
}

export async function generarMenu(menu, resultado) {
  const { zip, ruta, doc } = menu;
  for (const f of resultado.filas) {
    if (f.diaCambio) ponerTexto(doc, f.diaEl, f.diaNuevo);
    for (const c of f.comidas) {
      if (!c.el || (!c.cambio && c.nuevo === String(c.valor ?? ''))) continue;
      ponerTexto(doc, c.el, c.nuevo);
    }
    for (const s of f.sueltos) vaciar(s.el);
  }
  const ws = doc.documentElement;
  const sheetData = porTag(doc, 'sheetData')[0];
  const ultima = menu.ultimaFila || Math.max(...resultado.filas.map((f) => +f.fila));
  for (const r of porTag(doc, 'row')) if (+r.getAttribute('r') > ultima) r.parentNode.removeChild(r);
  const merges = hijoLocal(ws, 'mergeCells') || asegurar(doc, ws, 'mergeCells', ORDEN_HOJA);
  for (const m of hijos(merges)) {
    const [a, b] = rangoFilas(m.getAttribute('ref'));
    if (b > ultima || a > ultima) merges.removeChild(m);
  }
  for (const b of ['rowBreaks', 'colBreaks']) {
    const el = hijoLocal(ws, b);
    if (el) ws.removeChild(el);
  }

  const estilosDoc = await leerXml(zip, 'xl/styles.xml');
  const primeraDia = resultado.filas[0];
  const st = estilosFirma(estilosDoc, +(primeraDia.diaEl.getAttribute('s') || 0));
  if (estilosDoc) zip.file('xl/styles.xml', serializeXml(estilosDoc), { createFolders: false });

  const ancho = anchoColumnas(doc);
  for (const f of resultado.filas) {
    const r = porTag(doc, 'row').find((x) => x.getAttribute('r') === String(f.fila));
    if (!r) continue;
    const celdas = [{ el: f.diaEl, t: f.diaNuevo }, ...f.comidas.filter((c) => c.el).map((c) => ({ el: c.el, t: c.cambio ? c.nuevo : c.valor }))];
    let alto = 0;
    for (const c of celdas) {
      const sz = st.tam ? st.tam(+(c.el.getAttribute('s') || 0)) : 11;
      const chars = Math.max(4, Math.floor((ancho(colNum(colDe(c.el.getAttribute('r')))) * (st.sz0 || 11)) / sz * 0.95));
      alto = Math.max(alto, lineas(c.t, chars) * Math.ceil(sz * 1.35) + 8);
    }
    alto = Math.max(alto, 30);
    const antes = +r.getAttribute('ht') || 0;
    if (!antes || alto < antes) {
      r.setAttribute('ht', String(alto));
      r.setAttribute('customHeight', '1');
    }
  }

  const cols = menu.columnas || [];
  const nums = cols.map(colNum).sort((a, b) => a - b);
  const colFin = letraCol(nums[nums.length - 1] || 6);
  const izq = nums.length >= 4 ? [nums[0], nums[1]] : [nums[0]];
  const der = nums.length >= 4 ? [nums[nums.length - 2], nums[nums.length - 1]] : [nums[nums.length - 1]];
  const fir = menu.firmas || leerFirmas([]);
  const linea = '______________________________';
  const filasFirma = [
    [ultima + 1, 18, null],
    [ultima + 2, 34, null],
    [ultima + 3, 18, [linea, linea], st.normal],
    [ultima + 4, 18, [fir.coordinadora, fir.doctor], st.negrita],
    [ultima + 5, 30, [fir.cargo, fir.cargoDoctor], st.normal]
  ];
  for (const [n, alto, textos, estilo] of filasFirma) {
    const celdas = [];
    if (textos) {
      [izq, der].forEach((grupo, i) => {
        grupo.forEach((col, j) => celdas.push(nuevaCelda(doc, `${letraCol(col)}${n}`, j === 0 ? textos[i] : '', estilo)));
        if (grupo.length > 1) {
          const m = doc.createElementNS(S_NS, 'mergeCell');
          m.setAttribute('ref', `${letraCol(grupo[0])}${n}:${letraCol(grupo[grupo.length - 1])}${n}`);
          merges.appendChild(m);
        }
      });
      celdas.sort((a, b) => colNum(colDe(a.getAttribute('r'))) - colNum(colDe(b.getAttribute('r'))));
    }
    sheetData.appendChild(nuevaFila(doc, n, alto, celdas));
  }
  const filaFin = ultima + 5;
  if (hijos(merges).length) merges.setAttribute('count', String(hijos(merges).length));
  else ws.removeChild(merges);

  const dim = hijoLocal(ws, 'dimension');
  if (dim) dim.setAttribute('ref', `A1:${colFin}${filaFin}`);
  for (const v of porTag(doc, 'sheetView')) {
    v.removeAttribute('topLeftCell');
    v.setAttribute('tabSelected', '1');
    for (const p of porTag(v, 'pane')) p.removeAttribute('topLeftCell');
  }
  const sheetPr = asegurar(doc, ws, 'sheetPr', ORDEN_HOJA);
  const psp = hijoLocal(sheetPr, 'pageSetUpPr') || sheetPr.appendChild(doc.createElementNS(S_NS, 'pageSetUpPr'));
  psp.setAttribute('fitToPage', '1');
  const po = asegurar(doc, ws, 'printOptions', ORDEN_HOJA);
  po.setAttribute('horizontalCentered', '1');
  const ps = asegurar(doc, ws, 'pageSetup', ORDEN_HOJA);
  ps.setAttribute('orientation', mejorOrientacion(doc, ancho, colNum(colFin), filaFin));
  ps.setAttribute('fitToWidth', '1');
  ps.setAttribute('fitToHeight', '1');

  const otras = await soloLaHojaDelMenu(zip, menu, filaFin, colFin);
  for (const fo of porTag(doc, 'f')) {
    if (otras.some((h) => mencionaHoja(fo.textContent || '', h))) fo.parentNode.removeChild(fo);
  }
  await compactarTextos(zip, doc);
  zip.file(ruta, serializeXml(doc), { createFolders: false });
  await podarPartes(zip);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
