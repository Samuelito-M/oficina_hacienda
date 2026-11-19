import { PERSONAL_BASE, normalizarPersonal } from './personal.js';
import { unirAus } from './ausencias.js';

const K_PENDIENTE = 'oficina-hacienda.personal.pendiente';
const K_QUITADAS = 'oficina-hacienda.ausencias.quitadas';
const base = new Set(PERSONAL_BASE.map((p) => p.id));

export const paraGuardar = (lista) => lista.map(({ id, nombre, alias, fijo, casa, completo, cedula, hasta, aus, hor }) => ({ id, nombre, alias: alias || [], fijo: !!fijo, casa: casa || '', completo: completo || '', cedula: cedula || '', hasta: hasta || '', ...(aus && aus.length ? { aus } : {}), ...(hor ? { hor } : {}) }));

export const mismaLista = (a, b) => JSON.stringify(paraGuardar(a)) === JSON.stringify(paraGuardar(b));

const tieneDatos = (p) => !base.has(p.id) || !!p.completo || !!p.cedula || !!p.hasta || !!(p.aus && p.aus.length);

export function mezclarPersonal(servidor, local, ganaLocal, opciones = {}) {
  const nube = normalizarPersonal(servidor);
  const sin = opciones.quitadas || new Set();
  if (ganaLocal) {
    const ids = new Set(local.map((p) => p.id));
    const nubePorId = new Map(nube.map((p) => [p.id, p]));
    const unidos = local.map((l) => {
      const n = nubePorId.get(l.id);
      if (!n || !n.aus || !n.aus.length) return l;
      const aus = unirAus(l.aus, n.aus, sin, l.id);
      return aus.length === (l.aus || []).length ? l : { ...l, aus };
    });
    return [...unidos, ...nube.filter((p) => !ids.has(p.id) && tieneDatos(p))];
  }
  const porId = new Map(local.map((p) => [p.id, p]));
  const out = nube.map((p) => {
    const l = porId.get(p.id);
    if (!l) return p;
    return { ...p, completo: p.completo || l.completo || '', cedula: p.cedula || l.cedula || '', aus: opciones.ausSoloLocal ? l.aus || [] : p.aus || [] };
  });
  const ids = new Set(out.map((p) => p.id));
  for (const p of local) if (!ids.has(p.id) && tieneDatos(p)) out.push(p);
  return out;
}

export function marcarPendiente(si) {
  try {
    if (si) localStorage.setItem(K_PENDIENTE, '1');
    else localStorage.removeItem(K_PENDIENTE);
  } catch {
    return false;
  }
  return true;
}

export function hayPendiente() {
  try {
    return localStorage.getItem(K_PENDIENTE) === '1';
  } catch {
    return false;
  }
}

export function leerQuitadas() {
  try {
    const v = JSON.parse(localStorage.getItem(K_QUITADAS) || '[]');
    return new Set(Array.isArray(v) ? v : []);
  } catch {
    return new Set();
  }
}

export function anotarQuitadas(llaves) {
  if (!llaves.length) return;
  try {
    const s = leerQuitadas();
    for (const k of llaves) s.add(k);
    localStorage.setItem(K_QUITADAS, JSON.stringify(Array.from(s).slice(-500)));
  } catch {
    return;
  }
}

export function limpiarQuitadas() {
  try {
    localStorage.removeItem(K_QUITADAS);
  } catch {
    return;
  }
}
