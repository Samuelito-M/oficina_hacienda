export const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
export const W14_NS = 'http://schemas.microsoft.com/office/word/2010/wordml';

export function parseXml(texto) {
  const doc = new DOMParser().parseFromString(String(texto).replace(/^\uFEFF/, ''), 'application/xml');
  const err = doc.getElementsByTagName('parsererror')[0];
  if (err) throw new Error('XML dañado: ' + (err.textContent || '').slice(0, 120));
  return doc;
}

export function serializeXml(doc) {
  const s = new XMLSerializer().serializeToString(doc).replace(/^\uFEFF/, '').replace(/^\s*<\?xml[^>]*\?>\s*/, '');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + s;
}

export function hijos(el) {
  const out = [];
  for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1) out.push(n);
  return out;
}

export function porTag(el, tag) {
  return Array.from(el.getElementsByTagName(tag));
}

export function hijo(el, tag) {
  for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && n.nodeName === tag) return n;
  return null;
}

export function textoParrafo(p) {
  return porTag(p, 'w:t').map((t) => t.textContent).join('');
}

export function reemplazarEnParrafo(p, inicio, fin, nuevo) {
  const nodos = porTag(p, 'w:t');
  let pos = 0;
  let puesto = false;
  for (const t of nodos) {
    const txt = t.textContent;
    const a = pos;
    const b = pos + txt.length;
    pos = b;
    const toca = fin > inicio ? b > inicio && a < fin : !puesto && inicio >= a && inicio <= b;
    if (!toca) continue;
    const li = Math.max(0, inicio - a);
    const lf = Math.max(li, Math.min(txt.length, fin - a));
    t.textContent = txt.slice(0, li) + (puesto ? '' : nuevo) + txt.slice(lf);
    t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
    puesto = true;
  }
  return puesto;
}
