import { CASAS } from './personal.js';
import {
  PUESTOS,
  ON_CALL,
  en,
  poner,
  contexto,
  partesMes,
  diasDelMes,
  ponerTurnos,
  turnoDe,
  ponerNota,
  sincronizarOnCall,
  marcarOcManual,
  esOtro,
  idOtro
} from './horarioApp.js';

const DIA_CORTO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export function rangos(dias) {
  const l = Array.from(new Set(dias)).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < l.length; i++) {
    let j = i;
    while (j + 1 < l.length && l[j + 1] === l[j] + 1) j++;
    out.push(j > i + 1 ? `${l[i]} al ${l[j]}` : j === i + 1 ? `${l[i]} y ${l[j]}` : `${l[i]}`);
    i = j;
  }
  if (out.length <= 1) return out[0] || '';
  return `${out.slice(0, -1).join(', ')} y ${out[out.length - 1]}`;
}

export const diaCorto = (clave, d) => {
  const { anio, mes } = partesMes(clave);
  return `${DIA_CORTO[new Date(anio, mes, d).getDay()]} ${d}`;
};

function quitarDe(h, d, id, puestos) {
  let x = h;
  for (const k of puestos) {
    const l = en(x, d, k);
    if (l.includes(id)) x = poner(x, d, k, l.filter((y) => y !== id));
  }
  return x;
}

export function planAccion(a, { clave, horario, config, anterior = null }) {
  const { anio, mes } = partesMes(clave);
  const n = diasDelMes(anio, mes);
  const todos = Array.from({ length: n }, (_, i) => i + 1);
  const dias = (a.dias && a.dias.length ? a.dias : todos).filter((d) => d >= 1 && d <= n);
  const base = horario || { dias: {}, vac: [], fer: [], notas: {}, obs: '' };
  const ctx = contexto(clave, base, config);
  const nombre = (id) => ctx.nombre(id);
  let h = base;
  const hechos = [];
  const saltados = [];
  const casasOk = (k) => (k ? [k] : CASAS);

  if (a.tipo === 'turno') {
    for (const d of dias) {
      for (const k of casasOk(a.casa)) {
        if (!en(h, d, k).includes(a.id)) continue;
        const actual = { ...((h.tur && h.tur[d] && h.tur[d][k]) || {}) };
        if ((actual[a.id] || '') === (a.turno || '')) continue;
        if (a.turno) actual[a.id] = a.turno;
        else delete actual[a.id];
        h = ponerTurnos(h, d, k, actual);
        hechos.push(d);
      }
    }
    if (!hechos.length) {
      const trabaja = dias.some((d) => CASAS.some((k) => en(base, d, k).includes(a.id)));
      return { error: trabaja ? 'ya' : 'no-trabaja' };
    }
  } else if (a.tipo === 'quitar') {
    const puestos = a.casa ? [a.casa] : PUESTOS;
    for (const d of dias) {
      if (!puestos.some((k) => en(h, d, k).includes(a.id))) continue;
      if (puestos.includes(ON_CALL) && en(h, d, ON_CALL).includes(a.id)) h = marcarOcManual(h, [d], true);
      h = quitarDe(h, d, a.id, puestos);
      hechos.push(d);
    }
    if (!hechos.length) return { error: 'no-trabaja' };
  } else if (a.tipo === 'poner') {
    if (!a.casa) return { error: 'falta-casa' };
    for (const d of dias) {
      if (ctx.enVac(a.id, d)) {
        saltados.push({ d, por: 'ausente' });
        continue;
      }
      if (en(h, d, a.casa).includes(a.id)) continue;
      if (a.casa === ON_CALL) {
        h = marcarOcManual(poner(h, d, ON_CALL, a.solo ? [a.id] : [...en(h, d, ON_CALL), a.id]), [d], true);
      } else {
        h = quitarDe(h, d, a.id, CASAS);
        h = poner(h, d, a.casa, [...en(h, d, a.casa), a.id]);
        if (a.turno) h = ponerTurnos(h, d, a.casa, { ...((h.tur && h.tur[d] && h.tur[d][a.casa]) || {}), [a.id]: a.turno });
      }
      hechos.push(d);
    }
    if (!hechos.length) return { error: saltados.length ? 'ausente' : 'ya' };
  } else if (a.tipo === 'reemplazar' || a.tipo === 'intercambiar') {
    const puestos = a.casa ? [a.casa] : PUESTOS;
    for (const d of dias) {
      const dondeA = puestos.filter((k) => en(h, d, k).includes(a.id));
      const dondeB = a.tipo === 'intercambiar' ? puestos.filter((k) => en(h, d, k).includes(a.id2)) : [];
      if (!dondeA.length && !dondeB.length) continue;
      if (dondeA.length && ctx.enVac(a.id2, d)) {
        saltados.push({ d, por: 'ausente' });
        continue;
      }
      if (a.tipo === 'intercambiar' && dondeB.length && ctx.enVac(a.id, d)) {
        saltados.push({ d, por: 'ausente' });
        continue;
      }
      let x = h;
      const turA = {};
      const turB = {};
      for (const k of dondeA) turA[k] = turnoDe(x, d, k, a.id);
      for (const k of dondeB) turB[k] = turnoDe(x, d, k, a.id2);
      if (a.tipo === 'reemplazar') x = quitarDe(x, d, a.id2, CASAS.filter((k) => !dondeA.includes(k)));
      for (const k of dondeA) x = poner(x, d, k, en(x, d, k).map((y) => (y === a.id ? a.id2 : y)).filter((y, i, l) => l.indexOf(y) === i));
      for (const k of dondeB) x = poner(x, d, k, en(x, d, k).map((y) => (y === a.id2 ? a.id : y)).filter((y, i, l) => l.indexOf(y) === i));
      for (const k of dondeA) if (turA[k]) x = ponerTurnos(x, d, k, { ...((x.tur && x.tur[d] && x.tur[d][k]) || {}), [a.id2]: turA[k] });
      for (const k of dondeB) if (turB[k]) x = ponerTurnos(x, d, k, { ...((x.tur && x.tur[d] && x.tur[d][k]) || {}), [a.id]: turB[k] });
      if (dondeA.includes(ON_CALL) || dondeB.includes(ON_CALL)) x = marcarOcManual(x, [d], true);
      h = x;
      hechos.push(d);
    }
    if (!hechos.length) return { error: saltados.length ? 'ausente' : 'no-trabaja' };
  } else if (a.tipo === 'oncall_auto') {
    h = marcarOcManual(h, dias, false);
    hechos.push(...dias);
  } else if (a.tipo === 'feriado' || a.tipo === 'quitar_feriado') {
    const fer = new Set(h.fer || []);
    for (const d of dias) {
      if (a.tipo === 'feriado' ? fer.has(d) : !fer.has(d)) continue;
      if (a.tipo === 'feriado') fer.add(d);
      else fer.delete(d);
      hechos.push(d);
    }
    if (!hechos.length) return { error: 'ya' };
    h = { ...h, fer: Array.from(fer).sort((x, y) => x - y) };
  } else if (a.tipo === 'nota' || a.tipo === 'quitar_nota') {
    for (const d of dias) {
      const antes = (h.notas && h.notas[d]) || '';
      const despues = a.tipo === 'nota' ? (a.texto || '').trim() : '';
      if (antes === despues) continue;
      h = ponerNota(h, d, despues);
      hechos.push(d);
    }
    if (!hechos.length) return { error: a.tipo === 'nota' ? 'ya' : 'sin-nota' };
  } else if (a.tipo === 'ausencia') {
    for (const d of dias) {
      if (!PUESTOS.some((k) => en(h, d, k).includes(a.id))) continue;
      h = quitarDe(h, d, a.id, PUESTOS);
      hechos.push(d);
    }
  } else return { error: 'tipo' };

  if (!['feriado', 'quitar_feriado', 'nota', 'quitar_nota', 'turno'].includes(a.tipo)) h = sincronizarOnCall(clave, h, config, anterior);
  return { horario: h, dias: hechos, saltados, nombre };
}

export function nuevaPersonaOtro(nombre) {
  return idOtro(nombre);
}

export { esOtro };
