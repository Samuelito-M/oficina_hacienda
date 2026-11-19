import { reporte, periodoDe, fechaCorta } from '../ausencias.js';
import { MESES_P, MESES_EN } from './fechas.js';

const pad = (n) => String(n).padStart(2, '0');
const iso = (f) => `${f.getFullYear()}-${pad(f.getMonth() + 1)}-${pad(f.getDate())}`;
const NOMBRE = {
  es: { vac: 'vacaciones', med: 'médica', fam: 'familiar', lic: 'licencia', otro: 'otro motivo' },
  en: { vac: 'vacation', med: 'medical', fam: 'family', lic: 'leave', otro: 'other reason' }
};
const dias = (n, E) => `${n} ${E ? (n === 1 ? 'day' : 'days') : n === 1 ? 'día' : 'días'}`;
const boton = (T) => ({ t: T.E ? 'Open Control de personal (Staff control)' : 'Abrir Control de personal', ir: 'control' });

function periodo(e, hoy) {
  const f = e.fechas;
  const anio = e.anioAus || hoy.getFullYear();
  if (f && f.tipo === 'mes') return { anio, mes: +f.mes.slice(5, 7) - 1 };
  return { anio, mes: null };
}

const tituloPeriodo = (p, E) => (p.mes == null ? String(p.anio) : `${(E ? MESES_EN : MESES_P)[p.mes]} ${p.anio}`);

function fechaLarga(s, E) {
  const m = +s.slice(5, 7) - 1;
  return E ? `${MESES_EN[m].slice(0, 3)} ${+s.slice(8, 10)}, ${s.slice(0, 4)}` : fechaCorta(s);
}
const rango = (de, a, E) => (de === a ? fechaLarga(de, E) : E ? `${fechaLarga(de, true)} to ${fechaLarga(a, true)}` : `${fechaLarga(de, false)} al ${fechaLarga(a, false)}`);

function desglose(f, E) {
  const N = NOMBRE[E ? 'en' : 'es'];
  const partes = [];
  for (const k of ['vac', 'med', 'fam', 'lic', 'otro']) if (f[k]) partes.push(`${dias(f[k], E)} ${E ? '·' : '·'} ${N[k]}`);
  return partes;
}

function personaAus(e, datos, T) {
  const E = T.E;
  const N = NOMBRE[E ? 'en' : 'es'];
  if (e.trabajadores.length > 1) return { partes: [{ p: T.aQuien(e.trabajadores.map((p) => p.n)) }], sugerencias: e.trabajadores.map((p) => (E ? `How many days did ${p.n} miss?` : `¿Cuántos días faltó ${p.n}?`)) };
  const t = e.trabajadores[0];
  const p = (datos.personal || []).find((x) => x.id === t.id);
  const per = periodo(e, datos.hoy);
  if (!p) return { partes: [{ p: E ? `I can't find ${t.n} in the staff list.` : `No encuentro a ${t.n} en la lista de personal.` }] };
  const f = reporte([p], per.anio, per.mes).filas[0];
  const titulo = tituloPeriodo(per, E);
  if (!f || !f.veces) return { partes: [{ p: E ? `**${p.nombre}** has no absences or vacations recorded in ${titulo}.` : `**${p.nombre}** no tiene ausencias ni vacaciones anotadas en ${titulo}.` }], botones: [boton(T)] };
  const fuera = f.dias - f.vac;
  const resumen = E
    ? `**${p.nombre}** in ${titulo}: **${dias(f.vac, true)}** of vacation and **${dias(fuera, true)}** of other absence (${dias(f.dias, true)} total).`
    : `**${p.nombre}** en ${titulo}: **${dias(f.vac, false)}** de vacaciones y **${dias(fuera, false)}** de otras ausencias (${dias(f.dias, false)} en total).`;
  const lista = f.detalle.map((d) => `${rango(d.de, d.a, E)} · ${N[d.t]} · ${dias(d.dias, E)}${d.n ? ` · ${d.n}` : ''}`);
  return { partes: [{ p: resumen }, { ul: lista }], botones: [boton(T)] };
}

function quienAusente(e, datos, T) {
  const E = T.E;
  const N = NOMBRE[E ? 'en' : 'es'];
  const hoy = datos.hoy;
  const f = e.fechas;
  let de;
  let a;
  let cuando;
  if (f && f.tipo === 'mes') {
    const pr = periodoDe(+f.mes.slice(0, 4), +f.mes.slice(5, 7) - 1);
    de = pr.de;
    a = pr.a;
    cuando = E ? `in ${tituloPeriodo({ anio: +f.mes.slice(0, 4), mes: +f.mes.slice(5, 7) - 1 }, true)}` : `en ${tituloPeriodo({ anio: +f.mes.slice(0, 4), mes: +f.mes.slice(5, 7) - 1 }, false)}`;
  } else if (f && f.fechas && f.fechas.length) {
    de = iso(f.fechas[0]);
    a = iso(f.fechas[f.fechas.length - 1]);
    cuando = f.fechas.length === 1 ? T.cuandoDia(f.fechas[0], hoy) : E ? `${f.texto || 'in that period'}` : `${f.texto || 'en ese periodo'}`;
  } else {
    de = a = iso(hoy);
    cuando = E ? 'today' : 'hoy';
  }
  const quienes = [];
  for (const p of datos.personal || []) for (const x of p.aus || []) if (x.de <= a && x.a >= de) quienes.push({ p, x });
  quienes.sort((q, r) => (q.p.nombre < r.p.nombre ? -1 : 1));
  if (!quienes.length) return { partes: [{ p: E ? `Nobody has an absence or vacation recorded ${cuando}.` : `Nadie tiene ausencias ni vacaciones anotadas ${cuando}.` }], botones: [boton(T)] };
  return {
    partes: [{ p: E ? `Absent ${cuando}:` : `Ausentes ${cuando}:` }, { ul: quienes.map(({ p, x }) => `**${p.nombre}** · ${N[x.t]} · ${E ? 'from' : 'del'} ${rango(x.de, x.a, E)}${x.n ? ` · ${x.n}` : ''}`) }],
    botones: [boton(T)]
  };
}

function resumenAus(e, datos, T) {
  const E = T.E;
  const per = periodo(e, datos.hoy);
  const r = reporte(datos.personal || [], per.anio, per.mes);
  const titulo = tituloPeriodo(per, E);
  if (!r.total.veces) return { partes: [{ p: E ? `Nobody has absences or vacations recorded in ${titulo}.` : `Nadie tiene ausencias ni vacaciones anotadas en ${titulo}.` }], botones: [boton(T)] };
  const fuera = r.total.dias - r.total.vac;
  const top = r.filas.filter((f) => f.veces).slice(0, 5);
  const partes = [
    { p: E ? `**${titulo}**: ${dias(r.total.vac, true)} of vacation and ${dias(fuera, true)} of other absence (medical ${r.total.med}, family ${r.total.fam}, leave ${r.total.lic}, other ${r.total.otro}).` : `**${titulo}**: ${dias(r.total.vac, false)} de vacaciones y ${dias(fuera, false)} de otras ausencias (médicas ${r.total.med}, familiares ${r.total.fam}, licencias ${r.total.lic}, otras ${r.total.otro}).` },
    { ul: top.map((f) => `**${f.nombre}** · ${dias(f.dias, E)} (${desglose(f, E).join(', ')})`) }
  ];
  return { partes, botones: [boton(T)] };
}

export function respuestaAusencias(e, datos, T) {
  if (e.tipo === 'aus_persona') return personaAus(e, datos, T);
  if (e.tipo === 'aus_ahora') return quienAusente(e, datos, T);
  return resumenAus(e, datos, T);
}
