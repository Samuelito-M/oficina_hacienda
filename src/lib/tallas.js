import { fold } from './text.js';

const DIAS_VIEJA = 183;

export const SISTEMAS = [
  ['us', 'Americana'],
  ['ec', 'Ecuador'],
  ['ambas', 'Ambas']
];
export const CAMPO_TALLA = { ropa: { us: 'tallaRopa', ec: 'tallaRopaEC' }, zapatos: { us: 'tallaZapatos', ec: 'tallaZapatosEC' } };
const ETIQUETA = { es: { us: 'Americana', ec: 'Ecuador' }, en: { us: 'US', ec: 'Ecuador' } };
const TODAS = ['tallaRopa', 'tallaZapatos', 'tallaRopaEC', 'tallaZapatosEC'];
const conTallas = (n) => TODAS.some((k) => n[k]);

export function tallaDe(n, tipo, sistema = 'us', idioma = 'es') {
  const us = String(n[CAMPO_TALLA[tipo].us] || '').trim();
  const ec = String(n[CAMPO_TALLA[tipo].ec] || '').trim();
  if (sistema === 'us') return us;
  if (sistema === 'ec') return ec;
  const e = ETIQUETA[idioma] || ETIQUETA.es;
  return [us && `${us} (${e.us})`, ec && `${ec} (${e.ec})`].filter(Boolean).join(' · ');
}

const K_SISTEMA = 'oficina-hacienda.tallas.sistema';
export function leerSistema(donde, porDefecto = 'ambas') {
  try {
    const v = localStorage.getItem(`${K_SISTEMA}.${donde}`);
    if (SISTEMAS.some(([k]) => k === v)) return v;
  } catch {
    return porDefecto;
  }
  return porDefecto;
}
export function guardarSistema(donde, v) {
  try {
    localStorage.setItem(`${K_SISTEMA}.${donde}`, v);
  } catch {
    return;
  }
}

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
    .filter((n) => conTallas(n) && n.tallasFecha && new Date(n.tallasFecha).getTime() < limite)
    .map((n) => ({ ...n, meses: Math.floor((hoy - new Date(n.tallasFecha)) / (30.44 * 86400000)) }))
    .sort((a, b) => b.meses - a.meses);
}

export function esVieja(n, hoy = new Date()) {
  return !!(n.tallasFecha && conTallas(n) && new Date(n.tallasFecha).getTime() < hoy.getTime() - DIAS_VIEJA * 86400000);
}

export function resumenTallas(ninos, sistema = 'us') {
  const uno = (s) => ({ ropa: agrupar(ninos, CAMPO_TALLA.ropa[s]), zapatos: agrupar(ninos, CAMPO_TALLA.zapatos[s]) });
  const partes = sistema === 'ambas' ? ['us', 'ec'] : [sistema];
  return { total: ninos.length, partes: partes.map((s) => ({ s, nombre: ETIQUETA.es[s], ...uno(s) })), ...uno(partes[0]) };
}

export function textoTallas(r, titulo) {
  const linea = (g) => `• ${g.talla}: ${g.n}`;
  const out = [titulo];
  for (const p of r.partes) {
    const cual = r.partes.length > 1 || p.s === 'ec' ? ` (${p.nombre})` : ' (Americana)';
    out.push('', `Tallas de ropa${cual}:`, ...p.ropa.lista.map(linea));
    if (p.ropa.sin) out.push(`• Sin talla: ${p.ropa.sin}`);
    out.push('', `Tallas de zapatos${cual}:`, ...p.zapatos.lista.map(linea));
    if (p.zapatos.sin) out.push(`• Sin talla: ${p.zapatos.sin}`);
  }
  return out.join('\n');
}
