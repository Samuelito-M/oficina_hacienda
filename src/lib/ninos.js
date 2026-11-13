import { MESES, fold } from './text.js';
import { parseXml, porTag } from './xml.js';

export class NinosError extends Error {
  constructor(mensaje, codigo = '') {
    super(mensaje);
    this.codigo = codigo;
  }
}

const K_URL = 'oficina-hacienda.ninos.url';
const K_SESION = 'oficina-hacienda.ninos.sesion';

const RE_URL = /^https:\/\/script\.google\.com\/(?:a\/macros\/[^/]+\/|a\/[^/]+\/macros\/|macros\/)s\/([A-Za-z0-9_-]+)\/exec\/?(?:\?.*)?$/;

export function urlValida(u) {
  return RE_URL.test(String(u || '').trim());
}

export function urlGeneral(u) {
  const t = String(u || '').trim();
  const m = t.match(RE_URL);
  return m ? `https://script.google.com/macros/s/${m[1]}/exec` : t;
}

export function leerConexion() {
  let url = '';
  let token = '';
  let expira = 0;
  try {
    url = localStorage.getItem(K_URL) || '';
    const s = JSON.parse(localStorage.getItem(K_SESION) || 'null');
    if (s && s.token && s.expira > Date.now()) {
      token = s.token;
      expira = s.expira;
    }
  } catch {
    url = url || '';
  }
  return { url, token, expira };
}

export function guardarUrl(url) {
  try {
    localStorage.setItem(K_URL, url.trim());
  } catch {
    return false;
  }
  return true;
}

export function guardarSesion(token, expira) {
  try {
    localStorage.setItem(K_SESION, JSON.stringify({ token, expira }));
  } catch {
    return false;
  }
  return true;
}

export function borrarSesion() {
  try {
    localStorage.removeItem(K_SESION);
  } catch {
    return false;
  }
  return true;
}

export function borrarUrl() {
  try {
    localStorage.removeItem(K_URL);
    localStorage.removeItem(K_SESION);
  } catch {
    return false;
  }
  return true;
}

async function intentar(url, datos) {
  let r;
  try {
    r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(datos), redirect: 'follow' });
  } catch {
    throw new NinosError('No pude conectar con la hoja de Google. Revisa tu internet y que la implementación tenga acceso "Cualquier persona".', 'red');
  }
  if (!r.ok) throw new NinosError('La hoja de Google no respondió bien. Revisa que la dirección sea la correcta.', 'red');
  let j;
  try {
    j = await r.json();
  } catch {
    throw new NinosError('Google pidió iniciar sesión en vez de responder. En la implementación, "Quién tiene acceso" debe ser "Cualquier persona".', 'url');
  }
  if (!j || typeof j !== 'object') throw new NinosError('Respuesta extraña de la hoja de Google.', 'url');
  if (!j.ok) {
    if (j.error === 'sesion') throw new NinosError(j.mensaje || 'Vuelve a escribir la clave.', 'sesion');
    throw new NinosError(j.mensaje || j.error || 'No se pudo completar.', j.error || '');
  }
  return j;
}

export async function llamar(url, datos) {
  const opciones = Array.from(new Set([urlGeneral(url), String(url || '').trim()]));
  let ultimo;
  for (const u of opciones) {
    try {
      return await intentar(u, datos);
    } catch (err) {
      if (!(err instanceof NinosError) || (err.codigo !== 'url' && err.codigo !== 'red')) throw err;
      ultimo = err;
    }
  }
  throw ultimo;
}

const pad = (n) => String(n).padStart(2, '0');

export function aISO(y, m, d) {
  const f = new Date(y, m - 1, d);
  if (f.getFullYear() !== y || f.getMonth() !== m - 1 || f.getDate() !== d) return '';
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function leerFecha(v) {
  if (v == null) return '';
  if (typeof v === 'number' || /^\d{4,5}(\.\d+)?$/.test(String(v).trim())) {
    const n = Math.floor(Number(v));
    if (n > 3000 && n < 80000) {
      const f = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
      return aISO(f.getUTCFullYear(), f.getUTCMonth() + 1, f.getUTCDate());
    }
    return '';
  }
  const s = fold(String(v)).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return aISO(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/);
  if (m) {
    let y = +m[3];
    if (y < 100) y += y > 40 ? 1900 : 2000;
    return aISO(y, +m[2], +m[1]);
  }
  m = s.match(/^(\d{1,2})\s*(?:de\s+)?([a-z]+)\.?\s*(?:de\s+|del\s+)?(\d{4})$/);
  if (m) {
    const mes = MESES.findIndex((x) => x.startsWith(m[2].slice(0, 3)));
    if (mes >= 0) return aISO(+m[3], mes + 1, +m[1]);
  }
  return '';
}

export function partes(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}

export function edad(iso, hoy = new Date()) {
  const p = partes(iso);
  if (!p) return null;
  let e = hoy.getFullYear() - p.y;
  if (hoy.getMonth() + 1 < p.m || (hoy.getMonth() + 1 === p.m && hoy.getDate() < p.d)) e--;
  return e >= 0 ? e : null;
}

function fechaCumple(p, y) {
  if (p.m === 2 && p.d === 29 && new Date(y, 1, 29).getMonth() !== 1) return new Date(y, 1, 28);
  return new Date(y, p.m - 1, p.d);
}

export function proximoCumple(iso, hoy = new Date()) {
  const p = partes(iso);
  if (!p) return null;
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  let f = fechaCumple(p, base.getFullYear());
  if (f < base) f = fechaCumple(p, base.getFullYear() + 1);
  const dias = Math.round((f - base) / 86400000);
  return { fecha: f, dias, cumple: f.getFullYear() - p.y };
}

export function cumpleCorto(iso) {
  const p = partes(iso);
  return p ? `${p.d} de ${MESES[p.m - 1]}` : '';
}

const colDe = (ref) => ref.replace(/\d+/g, '');

function resolver(base, target) {
  if (target.startsWith('/')) return target.slice(1);
  const ps = base.split('/').slice(0, -1);
  for (const p of target.split('/')) {
    if (p === '..') ps.pop();
    else if (p !== '.') ps.push(p);
  }
  return ps.join('/');
}

const CAMPOS = [
  ['sexo', /^(sexo|genero|nino o nina|nina o nino|hombre o mujer)/],
  ['apellido', /apellido/],
  ['nombre', /nombre|nino|nina|estudiante/],
  ['casa', /casa|hogar/],
  ['nacimiento', /nacimiento|cumple|fecha|nacio/],
  ['edad', /^edad/],
  ['tallaZapatos', /zapato|calzado|pie/],
  ['tallaRopa', /ropa|camiseta|camisa|pantalon|talla/],
  ['notas', /nota|observ|comentario/]
];

export function leerSexo(v) {
  const t = fold(String(v ?? '')).trim();
  if (/^(f|femenino|mujer|nina|girl|female)\b/.test(t)) return 'F';
  if (/^(m|masculino|hombre|nino|boy|male|varon)\b/.test(t)) return 'M';
  return '';
}

export async function leerListaExcel(data, JSZip) {
  let zip;
  try {
    zip = await JSZip.loadAsync(data, { createFolders: false });
  } catch {
    throw new NinosError('No pude abrir el Excel. Revisa que sea .xlsx.');
  }
  const wbF = zip.file('xl/workbook.xml');
  if (!wbF) throw new NinosError('Este archivo no parece un Excel (.xlsx).');
  const wb = parseXml(await wbF.async('string'));
  const rels = parseXml(await zip.file('xl/_rels/workbook.xml.rels').async('string'));
  let compartidos = [];
  const ss = zip.file('xl/sharedStrings.xml');
  if (ss) compartidos = porTag(parseXml(await ss.async('string')), 'si').map((si) => porTag(si, 't').map((t) => t.textContent).join(''));
  for (const s of porTag(wb, 'sheet')) {
    const rel = porTag(rels, 'Relationship').find((r) => r.getAttribute('Id') === s.getAttribute('r:id'));
    if (!rel) continue;
    const f = zip.file(resolver('xl/workbook.xml', rel.getAttribute('Target')));
    if (!f) continue;
    const doc = parseXml(await f.async('string'));
    const filas = porTag(doc, 'row').map((r) =>
      Object.fromEntries(
        porTag(r, 'c').map((c) => {
          const t = c.getAttribute('t');
          const v = porTag(c, 'v')[0];
          let val = '';
          if (t === 'inlineStr') val = porTag(c, 't').map((x) => x.textContent).join('');
          else if (v) val = t === 's' ? compartidos[+v.textContent] ?? '' : t === 'str' || t === 'b' ? v.textContent : Number(v.textContent);
          return [colDe(c.getAttribute('r')), val];
        })
      )
    );
    const iEnc = filas.findIndex((f) => Object.values(f).some((v) => /nombre/.test(fold(v))));
    if (iEnc < 0) continue;
    const mapa = {};
    for (const [col, v] of Object.entries(filas[iEnc])) {
      const h = fold(v).trim();
      const campo = CAMPOS.find(([, re]) => re.test(h));
      if (campo && !Object.values(mapa).includes(campo[0])) mapa[col] = campo[0];
    }
    const ninos = [];
    for (const f of filas.slice(iEnc + 1)) {
      const o = {};
      for (const [col, campo] of Object.entries(mapa)) o[campo] = f[col];
      const nombre = [o.nombre, o.apellido].map((x) => String(x ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ');
      if (!nombre) continue;
      const crudo = o.nacimiento;
      const nacimiento = leerFecha(crudo);
      ninos.push({
        nombre,
        casa: String(o.casa ?? '').trim(),
        nacimiento,
        fechaDudosa: crudo !== undefined && crudo !== '' && !nacimiento ? String(crudo) : '',
        tallaRopa: String(o.tallaRopa ?? '').trim(),
        tallaZapatos: String(o.tallaZapatos ?? '').trim(),
        notas: String(o.notas ?? '').trim(),
        sexo: leerSexo(o.sexo)
      });
    }
    if (ninos.length) return { hoja: s.getAttribute('name'), ninos, columnas: Object.values(mapa) };
  }
  throw new NinosError('No encontré una columna "Nombre" en el Excel.');
}
