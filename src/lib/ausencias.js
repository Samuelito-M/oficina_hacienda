import { MESES } from './text.js';

export const TIPOS = [
  { k: 'vac', n: 'Vacaciones', corto: 'Vacaciones' },
  { k: 'med', n: 'Enfermedad o emergencia médica', corto: 'Médica' },
  { k: 'fam', n: 'Emergencia familiar', corto: 'Familiar' },
  { k: 'lic', n: 'Licencia (maternidad o paternidad)', corto: 'Licencia' },
  { k: 'otro', n: 'Otro motivo', corto: 'Otro' }
];

export const MAX_NOTA_AUS = 60;
export const MAX_AUS = 120;

const esTipo = (t) => TIPOS.some((x) => x.k === t);
export const nombreTipo = (t) => (TIPOS.find((x) => x.k === t) || TIPOS[4]).n;
export const cortoTipo = (t) => (TIPOS.find((x) => x.k === t) || TIPOS[4]).corto;

export const esFecha = (f) => {
  if (typeof f !== 'string' || !/^20\d\d-\d\d-\d\d$/.test(f)) return false;
  const d = new Date(Date.UTC(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10)));
  return d.toISOString().slice(0, 10) === f;
};

const num = (f) => Date.UTC(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10)) / 86400000;
export const diasEntre = (de, a) => num(a) - num(de) + 1;
const ultimoDia = (anio, mes) => new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
const iso = (anio, mes, d) => `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export function limpiarAus(lista) {
  if (!Array.isArray(lista)) return [];
  const out = [];
  for (const x of lista) {
    if (!x || !esFecha(x.de) || !esFecha(x.a) || x.a < x.de) continue;
    if (diasEntre(x.de, x.a) > 800) continue;
    out.push({ t: esTipo(x.t) ? x.t : 'otro', de: x.de, a: x.a, ...(typeof x.n === 'string' && x.n.trim() ? { n: x.n.trim().slice(0, MAX_NOTA_AUS) } : {}) });
  }
  out.sort((p, q) => (p.de < q.de ? -1 : p.de > q.de ? 1 : p.a < q.a ? -1 : p.a > q.a ? 1 : 0));
  return out.slice(0, MAX_AUS);
}

const igual = (p, q) => p.t === q.t && p.de === q.de && p.a === q.a && (p.n || '') === (q.n || '');

export function agregarAus(lista, id, aus) {
  const nueva = limpiarAus([aus])[0];
  if (!nueva) return lista;
  return lista.map((p) => (p.id === id ? (((p.aus || []).some((x) => igual(x, nueva))) ? p : { ...p, aus: limpiarAus([...(p.aus || []), nueva]) }) : p));
}

export function quitarAus(lista, id, aus) {
  return lista.map((p) => (p.id === id ? { ...p, aus: (p.aus || []).filter((x) => !igual(x, aus)) } : p));
}

export function cambiarAus(lista, id, antes, despues) {
  return agregarAus(quitarAus(lista, id, antes), id, despues);
}

export function ausenciasDeMes(lista, clave) {
  const anio = +clave.slice(0, 4);
  const mes = +clave.slice(5, 7) - 1;
  const n = ultimoDia(anio, mes);
  const ini = iso(anio, mes, 1);
  const fin = iso(anio, mes, n);
  const out = [];
  for (const p of lista) {
    for (const x of p.aus || []) {
      if (x.a < ini || x.de > fin) continue;
      const de = x.de < ini ? 1 : +x.de.slice(8, 10);
      const a = x.a > fin ? n : +x.a.slice(8, 10);
      out.push({ id: p.id, de, a, t: x.t });
    }
  }
  out.sort((p, q) => p.de - q.de || p.a - q.a || (p.id < q.id ? -1 : 1));
  return out;
}

export function migrarVac(lista, clave, vac) {
  const anio = +clave.slice(0, 4);
  const mes = +clave.slice(5, 7) - 1;
  let r = lista;
  for (const v of vac) {
    if (!v || !v.id || !(+v.de >= 1) || !(+v.a >= +v.de)) continue;
    if (!r.some((p) => p.id === v.id)) continue;
    r = agregarAus(r, v.id, { t: 'vac', de: iso(anio, mes, +v.de), a: iso(anio, mes, +v.a) });
  }
  return r;
}

const dentro = (x, de, a) => {
  const d1 = x.de < de ? de : x.de;
  const d2 = x.a > a ? a : x.a;
  return d2 >= d1 ? diasEntre(d1, d2) : 0;
};

export function periodoDe(anio, mes) {
  if (mes == null) return { de: `${anio}-01-01`, a: `${anio}-12-31` };
  return { de: iso(anio, mes, 1), a: iso(anio, mes, ultimoDia(anio, mes)) };
}

export function reporte(lista, anio, mes, opciones = {}) {
  const { de, a } = periodoDe(anio, mes);
  const filas = [];
  const total = { vac: 0, med: 0, fam: 0, lic: 0, otro: 0, dias: 0, veces: 0 };
  for (const p of lista) {
    if (opciones.soloActivos && p.hasta && p.hasta < de.slice(0, 7)) continue;
    const f = { id: p.id, nombre: p.nombre, vac: 0, med: 0, fam: 0, lic: 0, otro: 0, dias: 0, veces: 0, detalle: [] };
    for (const x of p.aus || []) {
      const d = dentro(x, de, a);
      if (!d) continue;
      const t = esTipo(x.t) ? x.t : 'otro';
      f[t] += d;
      f.dias += d;
      f.veces += 1;
      f.detalle.push({ t, de: x.de < de ? de : x.de, a: x.a > a ? a : x.a, dias: d, n: x.n || '', completa: { de: x.de, a: x.a } });
    }
    if (!f.veces && opciones.soloConAusencias) continue;
    for (const k of ['vac', 'med', 'fam', 'lic', 'otro', 'dias', 'veces']) total[k] += f[k];
    filas.push(f);
  }
  filas.sort((p, q) => q.dias - p.dias || (p.nombre < q.nombre ? -1 : 1));
  return { de, a, filas, total };
}

export const fechaCorta = (f) => `${+f.slice(8, 10)} ${MESES[+f.slice(5, 7) - 1].slice(0, 3)} ${f.slice(0, 4)}`;
export const rangoTexto = (de, a) => (de === a ? fechaCorta(de) : `${fechaCorta(de)} al ${fechaCorta(a)}`);

const csvCelda = (v) => {
  const s = String(v == null ? '' : v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function reporteCsv(r, titulo) {
  const filas = [[titulo], [], ['Persona', 'Vacaciones', 'Médica', 'Familiar', 'Licencia', 'Otro', 'Total días', 'Veces']];
  for (const f of r.filas) filas.push([f.nombre, f.vac, f.med, f.fam, f.lic, f.otro, f.dias, f.veces]);
  filas.push(['TOTAL', r.total.vac, r.total.med, r.total.fam, r.total.lic, r.total.otro, r.total.dias, r.total.veces]);
  filas.push([]);
  filas.push(['Detalle'], ['Persona', 'Motivo', 'Desde', 'Hasta', 'Días', 'Nota']);
  for (const f of r.filas) for (const d of f.detalle) filas.push([f.nombre, nombreTipo(d.t), d.de, d.a, d.dias, d.n]);
  return '﻿' + filas.map((x) => x.map(csvCelda).join(';')).join('\r\n');
}
