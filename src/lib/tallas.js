import { fold } from './text.js';

const DIAS_VIEJA = 183;

function clave(t) {
  return fold(t).replace(/\s+/g, ' ').trim();
}

function categoria(k) {
  if (/\bt\b|\d\s*t$|toddler|bebe|nino peque/.test(k)) return 0;
  if (/youth|juvenil|nino|nina|kid/.test(k)) return 1;
  if (/women|mujer|dama/.test(k)) return 2;
  if (/\bmen\b|hombre|caballero/.test(k)) return 3;
  return 4;
}

function numero(k) {
  const m = k.match(/(\d+(?:[.,]\d+)?)/);
  if (m) return Number(m[1].replace(',', '.'));
  const letras = ['xxs', 'xs', 's', 'small', 'm', 'medium', 'l', 'large', 'xl', 'xxl'];
  const l = letras.findIndex((x) => new RegExp(`\\b${x}\\b`).test(k));
  return l >= 0 ? 100 + l : 999;
}

function agrupar(ninos, campo) {
  const m = new Map();
  let sin = 0;
  for (const n of ninos) {
    const t = String(n[campo] || '').trim();
    if (!t) {
      sin++;
      continue;
    }
    const k = clave(t);
    if (!m.has(k)) m.set(k, { talla: t, formas: {}, nombres: [] });
    const g = m.get(k);
    g.formas[t] = (g.formas[t] || 0) + 1;
    g.nombres.push(n.nombre);
  }
  const lista = Array.from(m.entries()).map(([k, g]) => ({
    k,
    talla: Object.entries(g.formas).sort((a, b) => b[1] - a[1])[0][0],
    n: g.nombres.length,
    nombres: g.nombres.sort((a, b) => a.localeCompare(b, 'es'))
  }));
  lista.sort((a, b) => categoria(a.k) - categoria(b.k) || numero(a.k) - numero(b.k) || a.k.localeCompare(b.k));
  return { lista, sin };
}

export function tallasViejas(ninos, hoy = new Date()) {
  const limite = hoy.getTime() - DIAS_VIEJA * 86400000;
  return ninos
    .filter((n) => (n.tallaRopa || n.tallaZapatos) && n.tallasFecha && new Date(n.tallasFecha).getTime() < limite)
    .map((n) => ({ ...n, meses: Math.floor((hoy - new Date(n.tallasFecha)) / (30.44 * 86400000)) }))
    .sort((a, b) => b.meses - a.meses);
}

export function esVieja(n, hoy = new Date()) {
  return !!(n.tallasFecha && (n.tallaRopa || n.tallaZapatos) && new Date(n.tallasFecha).getTime() < hoy.getTime() - DIAS_VIEJA * 86400000);
}

export function resumenTallas(ninos) {
  return { ropa: agrupar(ninos, 'tallaRopa'), zapatos: agrupar(ninos, 'tallaZapatos'), total: ninos.length };
}

export function textoTallas(r, titulo) {
  const linea = (g) => `• ${g.talla}: ${g.n}`;
  const partes = [titulo, '', 'Tallas de ropa:', ...r.ropa.lista.map(linea)];
  if (r.ropa.sin) partes.push(`• Sin talla: ${r.ropa.sin}`);
  partes.push('', 'Tallas de zapatos:', ...r.zapatos.lista.map(linea));
  if (r.zapatos.sin) partes.push(`• Sin talla: ${r.zapatos.sin}`);
  return partes.join('\n');
}
