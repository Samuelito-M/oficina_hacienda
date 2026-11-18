import { plano } from './texto.js';

export const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
export const DIAS_BONITO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const MESES_P = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const dia0 = (f) => new Date(f.getFullYear(), f.getMonth(), f.getDate());
export const mas = (f, n) => new Date(f.getFullYear(), f.getMonth(), f.getDate() + n);
const pad = (n) => String(n).padStart(2, '0');
export const claveDe = (f) => `${f.getFullYear()}-${pad(f.getMonth() + 1)}`;
export const mismoDia = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const DIAS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MESES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function fechaBonita(f, hoy, idioma = 'es') {
  const h = hoy ? dia0(hoy) : null;
  if (idioma === 'en') {
    const base = `${DIAS_EN[f.getDay()]}, ${MESES_EN[f.getMonth()]} ${f.getDate()}`;
    if (h && mismoDia(f, h)) return `today, ${base}`;
    if (h && mismoDia(f, mas(h, 1))) return `tomorrow, ${base}`;
    return base;
  }
  const base = `${DIAS_BONITO[f.getDay()]} ${f.getDate()} de ${MESES_P[f.getMonth()]}`;
  if (h && mismoDia(f, h)) return `hoy ${base}`;
  if (h && mismoDia(f, mas(h, 1))) return `mañana ${base}`;
  return base;
}

export function finDeSemana(hoy, salto = 0) {
  const h = dia0(hoy);
  const wd = h.getDay();
  const vie = wd === 5 ? h : wd === 6 ? mas(h, -1) : wd === 0 ? mas(h, -2) : mas(h, (5 - wd + 7) % 7);
  const v = mas(vie, salto * 7);
  return [v, mas(v, 1), mas(v, 2)];
}

export function semana(hoy, salto = 0) {
  const h = dia0(hoy);
  const lunes = mas(h, -((h.getDay() + 6) % 7) + salto * 7);
  return Array.from({ length: 7 }, (_, i) => mas(lunes, i));
}

const MES_RX = new RegExp(`\\b(${MESES_P.join('|')}|setiembre)\\b`);
const numMes = (m) => (m === 'setiembre' ? 8 : MESES_P.indexOf(m));

function anioPara(mes, hoy) {
  const y = hoy.getFullYear();
  return mes < hoy.getMonth() - 2 ? y + 1 : y;
}

export function leerFechas(texto, hoy, idioma = 'es') {
  const s = ` ${plano(texto)} `;
  const h = dia0(hoy);
  const proximo = /\b(proximo|proxima|siguiente|que viene|otro|otra)\b/.test(s);
  if (/\bpasadomanana\b/.test(s)) return { tipo: 'dia', fechas: [mas(h, 2)], texto: 'pasado mañana' };
  if (/\bmanana\b/.test(s) && !/\bpor la manana\b|\ben la manana\b/.test(s)) return { tipo: 'dia', fechas: [mas(h, 1)], texto: 'mañana' };
  if (/\bhoy\b/.test(s)) return { tipo: 'dia', fechas: [h], texto: 'hoy' };
  if (/\bayer\b/.test(s)) return { tipo: 'dia', fechas: [mas(h, -1)], texto: 'ayer' };
  for (const x of s.matchAll(/\b(\d{1,2})\s*(?:\/|-|de|\s)\s*(\d{1,2}|[a-z]+)\b/g)) {
    const num = /^\d+$/.test(x[2]);
    if (!num && !MES_RX.test(` ${x[2]} `)) continue;
    if (num && !/[/-]/.test(x[0])) continue;
    let d = +x[1];
    let mes = num ? +x[2] - 1 : numMes(x[2]);
    if (num && (idioma === 'en' ? +x[1] <= 12 : mes > 11 && +x[1] <= 12)) {
      d = +x[2];
      mes = +x[1] - 1;
    }
    if (mes >= 0 && mes < 12 && d >= 1 && d <= 31) {
      const f = new Date(anioPara(mes, h), mes, d);
      if (f.getMonth() === mes) return { tipo: 'dia', fechas: [f] };
    }
  }
  let m = s.match(new RegExp(`\\b(${MESES_P.join('|')}|setiembre)\\s+(\\d{1,2})\\b`));
  if (m) {
    const mes = numMes(m[1]);
    const f = new Date(anioPara(mes, h), mes, +m[2]);
    if (f.getMonth() === mes) return { tipo: 'dia', fechas: [f] };
  }
  m = s.match(/\b(?:el|dia|del)\s+(\d{1,2})\b(?!\s*(?:anos|de\s+edad))/);
  if (m && +m[1] >= 1 && +m[1] <= 31) {
    let f = new Date(h.getFullYear(), h.getMonth(), +m[1]);
    if (f < mas(h, -7)) f = new Date(h.getFullYear(), h.getMonth() + 1, +m[1]);
    return { tipo: 'dia', fechas: [f] };
  }
  if (/\bfinde\b/.test(s)) {
    const salto = /\b(proximo|siguiente|que viene|otro)\s+finde\b|\bfinde\s+(que viene|siguiente|proximo)\b/.test(s) ? 1 : /\b(pasado|anterior)\b/.test(s) ? -1 : 0;
    return { tipo: 'finde', fechas: finDeSemana(h, salto), texto: salto === 1 ? 'el próximo fin de semana' : salto === -1 ? 'el fin de semana pasado' : 'este fin de semana' };
  }
  for (let i = 0; i < 7; i++) {
    if (new RegExp(`\\b${DIAS[i]}\\b`).test(s)) {
      let n = (i - h.getDay() + 7) % 7;
      if (proximo && new RegExp(`\\b(proximo|siguiente|otro)\\s+${DIAS[i]}\\b|\\b${DIAS[i]}\\s+(que viene|siguiente|proximo)\\b`).test(s) && n === 0) n = 7;
      if (/\bpasado\b/.test(s) && new RegExp(`\\b${DIAS[i]}\\s+pasado\\b`).test(s)) n = n === 0 ? -7 : n - 7;
      return { tipo: 'dia', fechas: [mas(h, n)] };
    }
  }
  if (/\bsemana\b/.test(s)) {
    const salto = /\b(proxima|siguiente|que viene|otra)\s+semana\b|\bsemana\s+(que viene|siguiente|proxima)\b/.test(s) ? 1 : /\bsemana\s+pasada\b/.test(s) ? -1 : 0;
    return { tipo: 'semana', fechas: semana(h, salto), texto: salto === 1 ? 'la próxima semana' : salto === -1 ? 'la semana pasada' : 'esta semana' };
  }
  m = s.match(MES_RX);
  if (m) {
    const mes = numMes(m[1]);
    return { tipo: 'mes', mes: `${anioPara(mes, h)}-${pad(mes + 1)}`, texto: `en ${MESES_P[mes]}` };
  }
  if (/\b(proximo|siguiente)\s+mes\b|\bmes\s+que\s+viene\b/.test(s)) {
    const f = new Date(h.getFullYear(), h.getMonth() + 1, 1);
    return { tipo: 'mes', mes: claveDe(f), texto: `en ${MESES_P[f.getMonth()]}` };
  }
  if (/\b(este|del)\s+mes\b|\bmes\s+actual\b/.test(s)) return { tipo: 'mes', mes: claveDe(h), texto: 'este mes' };
  if (/\bmes\s+pasado\b/.test(s)) {
    const f = new Date(h.getFullYear(), h.getMonth() - 1, 1);
    return { tipo: 'mes', mes: claveDe(f), texto: `en ${MESES_P[f.getMonth()]}` };
  }
  return null;
}

export function diasDelMes(clave) {
  const [y, m] = clave.split('-').map(Number);
  const n = new Date(y, m, 0).getDate();
  return Array.from({ length: n }, (_, i) => new Date(y, m - 1, i + 1));
}
