export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MESES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function fold(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function squash(s) {
  return fold(s).replace(/[^a-z0-9:]/g, '');
}

export function collapse(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

export function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function fechaLarga(d) {
  return `${d.getDate()} de ${MESES[d.getMonth()]} del ${d.getFullYear()}`;
}

export function fechaCorta(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function finDeSemanaCorto(sat) {
  const sun = addDays(sat, 1);
  return sat.getMonth() === sun.getMonth()
    ? `${sat.getDate()}-${sun.getDate()}`
    : `${sat.getDate()} ${MESES3[sat.getMonth()]}-${sun.getDate()} ${MESES3[sun.getMonth()]}`;
}

export function finDeSemanaLargo(sat) {
  const sun = addDays(sat, 1);
  return sat.getMonth() === sun.getMonth()
    ? `Sáb ${sat.getDate()} – Dom ${sun.getDate()} ${MESES3[sat.getMonth()]}`
    : `Sáb ${sat.getDate()} ${MESES3[sat.getMonth()]} – Dom ${sun.getDate()} ${MESES3[sun.getMonth()]}`;
}

export function viernesADomingo(sat) {
  const fri = addDays(sat, -1);
  const sun = addDays(sat, 1);
  return fri.getMonth() === sun.getMonth()
    ? `Vie ${fri.getDate()} – Dom ${sun.getDate()} ${MESES3[fri.getMonth()]}`
    : `Vie ${fri.getDate()} ${MESES3[fri.getMonth()]} – Dom ${sun.getDate()} ${MESES3[sun.getMonth()]}`;
}
