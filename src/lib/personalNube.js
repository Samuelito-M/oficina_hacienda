import { PERSONAL_BASE, normalizarPersonal } from './personal.js';

const K_PENDIENTE = 'oficina-hacienda.personal.pendiente';
const base = new Set(PERSONAL_BASE.map((p) => p.id));

export const paraGuardar = (lista) => lista.map(({ id, nombre, alias, fijo, casa, completo, cedula, hasta, aus, hor }) => ({ id, nombre, alias: alias || [], fijo: !!fijo, casa: casa || '', completo: completo || '', cedula: cedula || '', hasta: hasta || '', ...(aus && aus.length ? { aus } : {}), ...(hor ? { hor } : {}) }));

export const mismaLista = (a, b) => JSON.stringify(paraGuardar(a)) === JSON.stringify(paraGuardar(b));

const tieneDatos = (p) => !base.has(p.id) || !!p.completo || !!p.cedula || !!p.hasta || !!(p.aus && p.aus.length);

export function mezclarPersonal(servidor, local, ganaLocal) {
  const nube = normalizarPersonal(servidor);
  if (ganaLocal) {
    const ids = new Set(local.map((p) => p.id));
    return [...local, ...nube.filter((p) => !ids.has(p.id) && tieneDatos(p))];
  }
  const porId = new Map(local.map((p) => [p.id, p]));
  const out = nube.map((p) => {
    const l = porId.get(p.id);
    if (!l) return p;
    return { ...p, completo: p.completo || l.completo || '', cedula: p.cedula || l.cedula || '', aus: p.aus && p.aus.length ? p.aus : l.aus || [] };
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
