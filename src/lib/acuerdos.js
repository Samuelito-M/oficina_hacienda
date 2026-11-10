import { MESES, fold, collapse, fechaLarga, addDays } from './text.js';
import { parseXml, serializeXml, hijos, porTag, hijo, textoParrafo, reemplazarEnParrafo, W_NS } from './xml.js';
import { cedulaValida } from './personal.js';

export class WordError extends Error {}

const TITULO = /^(ACUERDO DE TRABAJO|ACUERDO DE SERVICIOS|ACUERDO|ADENDUM|ADENDA|CONTRATO)\b/;
const FECHA = new RegExp(`\\b(\\d{1,2})\\s+de\\s+(${MESES.join('|')}|setiembre)\\s+del?\\s+(\\d{4})\\b`, 'gi');
const SENOR = /se(?:ñ|n)or\s*\(\s*a\s*\)\s*/i;

function fechaDe(m) {
  const mes = fold(m[2]) === 'setiembre' ? 8 : MESES.indexOf(fold(m[2]));
  return new Date(+m[3], mes, +m[1]);
}

function analizarBloque(nodos) {
  const parrafos = nodos.flatMap((n) => (n.nodeName === 'w:p' ? [n] : porTag(n, 'w:p')));
  const textos = parrafos.map(textoParrafo);
  const titulo = collapse(textos.find((t) => t.trim()) || '');
  let completo = '';
  let cedula = '';
  for (const t of textos) {
    const s = t.search(SENOR);
    if (s < 0) continue;
    const despues = t.slice(s).replace(SENOR, '');
    const m = despues.match(/^(.*?)\s*C\s*\.?\s*C\s*\.?\s*:?\s*(\d{10})/);
    if (m) {
      completo = collapse(m[1]).replace(/[,.;]+$/, '');
      cedula = m[2];
    }
    break;
  }
  let sabado = null;
  let domingo = null;
  for (const t of textos) {
    const tt = fold(t).trim();
    FECHA.lastIndex = 0;
    const m = FECHA.exec(t);
    if (!m) continue;
    if (tt.startsWith('sabado') && !sabado) sabado = fechaDe(m);
    if (tt.startsWith('domingo') && !domingo) domingo = fechaDe(m);
  }
  const esFinde = /^ACUERDO DE TRABAJO/.test(titulo.toUpperCase()) && !!sabado && !!domingo && !!completo;
  return { nodos, titulo, completo, cedula, sabado, domingo, esFinde };
}

export async function leerWord(data, JSZip) {
  let zip;
  try {
    zip = await JSZip.loadAsync(data, { createFolders: false });
  } catch {
    throw new WordError('No pude abrir el Word. Revisa que sea un archivo .docx (no .doc ni PDF).');
  }
  const f = zip.file('word/document.xml');
  if (!f) throw new WordError('Este archivo no parece un Word (.docx).');
  const doc = parseXml(await f.async('string'));
  const body = doc.getElementsByTagName('w:body')[0];
  if (!body) throw new WordError('El Word no tiene contenido.');
  const preambulo = [];
  const bloques = [];
  let actual = null;
  let sectPr = null;
  for (const n of hijos(body)) {
    if (n.nodeName === 'w:sectPr') {
      sectPr = n;
      continue;
    }
    const esTitulo = n.nodeName === 'w:p' && TITULO.test(collapse(textoParrafo(n)).toUpperCase());
    if (esTitulo) {
      actual = [n];
      bloques.push(actual);
    } else if (actual) actual.push(n);
    else preambulo.push(n);
  }
  const analizados = bloques.map(analizarBloque);
  const personas = [];
  for (const b of analizados) {
    if (b.completo && cedulaValida(b.cedula) && !personas.some((p) => p.cedula === b.cedula)) personas.push({ completo: b.completo, cedula: b.cedula });
  }
  const plantilla = analizados.find((b) => b.esFinde);
  if (!plantilla) throw new WordError('No encontré ningún acuerdo de fin de semana en el Word para usar de modelo.');
  const plantillaTextos = plantilla.nodos.flatMap((n) => (n.nodeName === 'w:p' ? [n] : porTag(n, 'w:p'))).map(textoParrafo);
  const mm = plantillaTextos.join(' ').match(/\$\s*(\d+(?:[.,]\d+)?)/);
  const monto = mm ? Number(mm[1].replace(',', '.')) : 60;
  return { zip, doc, body, preambulo, bloques: analizados, sectPr, personas, plantilla, plantillaTextos, monto };
}

function nuevoId(usados) {
  let id;
  do {
    id = Math.floor(Math.random() * 0x7fffffff).toString(16).toUpperCase().padStart(8, '0');
  } while (usados.has(id));
  usados.add(id);
  return id;
}

function ponerSaltoAntes(p, poner) {
  let pPr = hijo(p, 'w:pPr');
  const existente = pPr && hijo(pPr, 'w:pageBreakBefore');
  if (!poner) {
    if (existente) pPr.removeChild(existente);
    return;
  }
  if (existente) {
    existente.removeAttribute('w:val');
    return;
  }
  const doc = p.ownerDocument;
  if (!pPr) {
    pPr = doc.createElementNS(W_NS, 'w:pPr');
    p.insertBefore(pPr, p.firstChild);
  }
  const el = doc.createElementNS(W_NS, 'w:pageBreakBefore');
  let ref = null;
  for (const c of hijos(pPr)) {
    if (!['w:pStyle', 'w:keepNext', 'w:keepLines'].includes(c.nodeName)) {
      ref = c;
      break;
    }
  }
  pPr.insertBefore(el, ref);
}

function primerParrafo(nodos) {
  for (const n of nodos) {
    if (n.nodeName === 'w:p') return n;
    const p = porTag(n, 'w:p')[0];
    if (p) return p;
  }
  return null;
}

function mesAnterior(mes, anio) {
  return mes === 0 ? { mes: 11, anio: anio - 1 } : { mes: mes - 1, anio };
}

export function bloquesQueSeQuedan(word, mes, anio) {
  const ant = mesAnterior(mes, anio);
  return word.bloques.filter((b) => {
    if (!b.esFinde) return true;
    const m = b.sabado.getMonth();
    const y = b.sabado.getFullYear();
    return !((m === mes && y === anio) || (m === ant.mes && y === ant.anio));
  });
}

export async function generarWord(word, acuerdos, { mes, anio, mantenerViejos = true }) {
  const { zip, doc, body, preambulo, sectPr, plantilla } = word;
  const usados = new Set();
  for (const p of porTag(doc, 'w:p')) {
    const a = p.getAttribute('w14:paraId');
    const b = p.getAttribute('w14:textId');
    if (a) usados.add(a.toUpperCase());
    if (b) usados.add(b.toUpperCase());
  }

  let numDoc = null;
  let numRoot = null;
  const numFile = zip.file('word/numbering.xml');
  if (numFile) {
    numDoc = parseXml(await numFile.async('string'));
    numRoot = numDoc.documentElement;
  }
  const nums = numRoot ? porTag(numRoot, 'w:num') : [];
  let maxNum = nums.reduce((m, n) => Math.max(m, +n.getAttribute('w:numId') || 0), 0);
  const numPorId = new Map(nums.map((n) => [n.getAttribute('w:numId'), n]));

  const nuevos = [];
  for (const a of acuerdos) {
    if (!a.completo || !cedulaValida(a.cedula)) throw new WordError(`Falta el nombre completo o la cédula de ${a.completo || 'una persona'}.`);
    const sab = a.sabado;
    const dom = addDays(sab, 1);
    const clon = plantilla.nodos.map((n) => n.cloneNode(true));
    for (const n of clon) {
      for (const tag of ['w:bookmarkStart', 'w:bookmarkEnd', 'w:commentRangeStart', 'w:commentRangeEnd', 'w:commentReference', 'w:proofErr']) {
        for (const el of porTag(n, tag)) el.parentNode.removeChild(el);
      }
    }
    const parrafos = clon.flatMap((n) => (n.nodeName === 'w:p' ? [n] : porTag(n, 'w:p')));
    for (const p of parrafos) {
      if (p.getAttribute('w14:paraId')) p.setAttribute('w14:paraId', nuevoId(usados));
      if (p.getAttribute('w14:textId')) p.setAttribute('w14:textId', nuevoId(usados));
      let t = textoParrafo(p);
      const esDomingo = fold(t).trim().startsWith('domingo');
      const fechas = [];
      FECHA.lastIndex = 0;
      let m;
      while ((m = FECHA.exec(t))) fechas.push({ i: m.index, f: m.index + m[0].length });
      for (const x of fechas.reverse()) reemplazarEnParrafo(p, x.i, x.f, fechaLarga(esDomingo ? dom : sab));
      t = textoParrafo(p);
      const s = t.search(SENOR);
      if (s >= 0) {
        const ini = s + t.slice(s).match(SENOR)[0].length;
        const resto = t.slice(ini);
        const mm = resto.match(/^(.*?)\s*C\s*\.?\s*C\s*\.?\s*:?\s*(\d{10})/);
        if (mm) {
          const fin = ini + mm[0].length;
          const sigue = t[fin];
          const texto = `${a.completo} CC. ${a.cedula}` + (sigue && /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(sigue) ? ' ' : '');
          reemplazarEnParrafo(p, ini, fin, texto);
        }
      }
    }
    if (numRoot) {
      const mapa = new Map();
      for (const el of clon.flatMap((n) => porTag(n, 'w:numId'))) {
        const viejo = el.getAttribute('w:val');
        if (!viejo || viejo === '0') continue;
        if (!mapa.has(viejo)) {
          const orig = numPorId.get(viejo);
          if (!orig) continue;
          const copia = orig.cloneNode(true);
          maxNum += 1;
          copia.setAttribute('w:numId', String(maxNum));
          copia.removeAttribute('w16cid:durableId');
          for (const lo of porTag(copia, 'w:lvlOverride')) copia.removeChild(lo);
          const lo = numDoc.createElementNS(W_NS, 'w:lvlOverride');
          lo.setAttribute('w:ilvl', '0');
          const so = numDoc.createElementNS(W_NS, 'w:startOverride');
          so.setAttribute('w:val', '1');
          lo.appendChild(so);
          copia.appendChild(lo);
          const ultimoNum = porTag(numRoot, 'w:num').pop();
          if (ultimoNum && ultimoNum.nextSibling) numRoot.insertBefore(copia, ultimoNum.nextSibling);
          else numRoot.appendChild(copia);
          mapa.set(viejo, String(maxNum));
        }
        el.setAttribute('w:val', mapa.get(viejo));
      }
    }
    nuevos.push(clon);
  }

  const viejos = mantenerViejos ? bloquesQueSeQuedan(word, mes, anio).map((b) => b.nodos) : [];
  const todos = [...nuevos, ...viejos];
  if (!todos.length) throw new WordError('No hay acuerdos para poner en el Word.');

  while (body.firstChild) body.removeChild(body.firstChild);
  for (const n of preambulo) body.appendChild(n);
  todos.forEach((nodos, i) => {
    const p = primerParrafo(nodos);
    if (p) ponerSaltoAntes(p, i > 0 || preambulo.some((n) => textoParrafo(n).trim()));
    for (const n of nodos) body.appendChild(n);
  });
  if (sectPr) body.appendChild(sectPr);

  zip.file('word/document.xml', serializeXml(doc), { createFolders: false });
  if (numDoc) zip.file('word/numbering.xml', serializeXml(numDoc), { createFolders: false });
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
