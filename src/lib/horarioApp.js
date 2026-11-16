import { CASAS, PERSONAL_BASE, slug } from './personal.js';
import { fold, squash } from './text.js';
import { construirTokenizador, armarResultado } from './horario.js';

export const ON_CALL = 'On Call';
export const PUESTOS = [...CASAS, ON_CALL];
export const COLOR_PUESTO = { 'Casa 1': '#24A9C2', 'Casa 2': '#E44D64', 'Casa 3': '#389B58', 'Casa 4': '#5170FF', 'Casa Esther': '#F39200', [ON_CALL]: '#7E57C2' };
export const CORTO = { 'Casa 1': 'C1', 'Casa 2': 'C2', 'Casa 3': 'C3', 'Casa 4': 'C4', 'Casa Esther': 'Est', [ON_CALL]: 'On call' };
export const DIAS_SEM = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DIAS_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const semana7 = (entre, fin) => [fin, entre, entre, entre, entre, fin, fin];
export const NEC_BASE = { 'Casa 1': semana7(1, 2), 'Casa 2': semana7(1, 2), 'Casa 3': semana7(2, 2), 'Casa 4': semana7(1, 2), 'Casa Esther': semana7(1, 1) };
export const MAX_SEMANA = 5;

export const claveMes = (anio, mes) => `${anio}-${String(mes + 1).padStart(2, '0')}`;
export const partesMes = (clave) => ({ anio: +clave.slice(0, 4), mes: +clave.slice(5, 7) - 1 });
export function moverMes(clave, n) {
  const { anio, mes } = partesMes(clave);
  const d = new Date(anio, mes + n, 1);
  return claveMes(d.getFullYear(), d.getMonth());
}
export const diasDelMes = (anio, mes) => new Date(anio, mes + 1, 0).getDate();

export function configInicial() {
  return {
    personal: PERSONAL_BASE.filter((p) => !['jauna', 'fredy', 'ingrit'].includes(p.id)).map((p) => ({ id: p.id, n: p.nombre, casas: p.fijo ? [p.casa] : null, dias: p.fijo ? [0, 5, 6] : [0, 1, 2, 3, 4, 5, 6], oc: false })),
    nec: JSON.parse(JSON.stringify(NEC_BASE))
  };
}

export function normalizarConfig(c) {
  const base = configInicial();
  if (!c || typeof c !== 'object') return base;
  const personal = Array.isArray(c.personal)
    ? c.personal
        .filter((p) => p && typeof p.id === 'string' && p.id && typeof p.n === 'string' && p.n.trim())
        .map((p) => ({ id: p.id, n: p.n.trim(), casas: Array.isArray(p.casas) ? CASAS.filter((c) => p.casas.includes(c)) : CASAS.includes(p.padre) ? [p.padre] : null, dias: Array.isArray(p.dias) ? p.dias.filter((d) => d >= 0 && d <= 6) : [0, 1, 2, 3, 4, 5, 6], oc: !!p.oc }))
    : base.personal;
  const nec = {};
  for (const casa of CASAS) {
    let v = c.nec && Array.isArray(c.nec[casa]) ? c.nec[casa] : base.nec[casa];
    if (v.length === 2) v = semana7(v[0], v[1]);
    nec[casa] = [0, 1, 2, 3, 4, 5, 6].map((w) => Math.max(0, Math.min(6, Math.floor(+v[w]) || 0)));
  }
  return c.v === 2 ? { v: 2, personal, nec } : { personal, nec };
}

export const casasDe = (p) => (p && Array.isArray(p.casas) ? p.casas : []);
export const esDeUnaCasa = (p, k) => casasDe(p).length === 1 && casasDe(p)[0] === k;

export function asignarCasas(config, fuentes, tambienVacias = false) {
  const casas = {};
  const dias = {};
  const minimo = {};
  let hayDatos = false;
  for (const [fi, f] of fuentes.entries()) {
    if (!f || !f.horario) continue;
    const { anio, mes } = partesMes(f.clave);
    const fer = new Set(f.horario.fer || []);
    for (const [d, dia] of Object.entries(f.horario.dias)) {
      const w = new Date(anio, mes, +d).getDay();
      for (const c of CASAS) {
        const k = `${c}|${w}`;
        const cuantos = (dia[c] || []).length;
        minimo[k] = k in minimo ? Math.min(minimo[k], cuantos) : cuantos;
        for (const id of dia[c] || []) {
          hayDatos = true;
          (casas[id] = casas[id] || new Set()).add(c);
          if (!fer.has(+d)) {
            dias[id] = dias[id] || {};
            const kd = `${fi}|${w}`;
            dias[id][kd] = (dias[id][kd] || 0) + 1;
            if (dias[id][kd] >= 2) dias[id][w] = true;
          }
        }
      }
    }
  }
  const vistas = (id) => CASAS.filter((c) => casas[id] && casas[id].has(c));
  if (config.v !== 2 && hayDatos) {
    const nec = {};
    for (const c of CASAS) nec[c] = [0, 1, 2, 3, 4, 5, 6].map((w) => (`${c}|${w}` in minimo ? minimo[`${c}|${w}`] : config.nec[c][w]));
    return {
      ...config,
      v: 2,
      nec,
      personal: config.personal.map((p) => ({
        ...p,
        casas: CASAS.filter((c) => (p.casas || []).includes(c) || (casas[p.id] && casas[p.id].has(c))),
        dias: [0, 1, 2, 3, 4, 5, 6].filter((w) => (casas[p.id] ? !!(dias[p.id] && dias[p.id][w] === true) : p.dias.includes(w)) || (casas[p.id] && p.casas && p.casas.length === 1 && p.dias.includes(w)))
      }))
    };
  }
  const falta = (p) => p.casas == null || (tambienVacias && !p.casas.length);
  if (!config.personal.some(falta)) return config;
  return { ...config, personal: config.personal.map((p) => (falta(p) ? { ...p, casas: vistas(p.id) } : p)) };
}

export function horarioVacio() {
  return { dias: {}, vac: [], fer: [] };
}

export function normalizarHorario(h) {
  if (!h || typeof h !== 'object') return null;
  const out = horarioVacio();
  if (h.dias && typeof h.dias === 'object') {
    for (const [d, v] of Object.entries(h.dias)) {
      if (!(+d >= 1 && +d <= 31) || !v || typeof v !== 'object') continue;
      const dia = {};
      for (const k of PUESTOS) if (Array.isArray(v[k]) && v[k].length) dia[k] = Array.from(new Set(v[k].map(String)));
      if (Object.keys(dia).length) out.dias[+d] = dia;
    }
  }
  if (Array.isArray(h.vac)) out.vac = h.vac.filter((v) => v && v.id && +v.de >= 1 && +v.a >= +v.de).map((v) => ({ id: String(v.id), de: +v.de, a: +v.a }));
  if (Array.isArray(h.fer)) out.fer = Array.from(new Set(h.fer.map(Number).filter((d) => d >= 1 && d <= 31))).sort((a, b) => a - b);
  return out;
}

export const en = (h, d, k) => (h.dias[d] && h.dias[d][k]) || [];

export function poner(h, d, k, ids) {
  const dias = { ...h.dias };
  const dia = { ...(dias[d] || {}) };
  if (ids.length) dia[k] = ids;
  else delete dia[k];
  if (Object.keys(dia).length) dias[d] = dia;
  else delete dias[d];
  return { ...h, dias };
}

export function contexto(clave, horario, config) {
  const { anio, mes } = partesMes(clave);
  const n = diasDelMes(anio, mes);
  const primer = new Date(anio, mes, 1).getDay();
  const wd = (d) => new Date(anio, mes, d).getDay();
  const fer = new Set(horario.fer);
  const porId = new Map(config.personal.map((p) => [p.id, p]));
  const finde = (d) => {
    const w = wd(d);
    return w === 0 || w >= 5 || fer.has(d);
  };
  const semanaDe = (d) => Math.floor((d - 1 + primer) / 7);
  const enVac = (id, d) => horario.vac.some((v) => v.id === id && d >= v.de && d <= v.a);
  const donde = (id, d) => CASAS.find((c) => en(horario, d, c).includes(id)) || '';
  const necesita = (k, d) => (config.nec[k] ? config.nec[k][wd(d)] : 0);
  const diasEnSemana = (id, s) => {
    let c = 0;
    for (let d = 1; d <= n; d++) if (semanaDe(d) === s && donde(id, d)) c++;
    return c;
  };
  const nombre = (id) => (porId.get(id) ? porId.get(id).n : id);
  const motivo = (id, d, k) => {
    const p = porId.get(id);
    if (!p) return 'ya no está en el personal';
    if (enVac(id, d)) return 'está de vacaciones';
    if (k === ON_CALL) return '';
    const dd = donde(id, d);
    if (dd && dd !== k) return `ya está en ${dd}`;
    if (!casasDe(p).includes(k)) return casasDe(p).length ? `no va a ${k}` : 'no tiene casas marcadas';
    if (!p.dias.includes(wd(d)) && !(fer.has(d) && casasDe(p).length === 1)) return `no trabaja los ${DIAS_LARGO[wd(d)]}`;
    if (!dd && diasEnSemana(id, semanaDe(d)) >= MAX_SEMANA) return `ya tiene ${MAX_SEMANA} días esa semana`;
    return '';
  };
  const semanaLaboral = (d) => {
    const desde = d - ((wd(d) + 6) % 7);
    const out = [];
    for (let x = Math.max(1, desde); x <= Math.min(n, desde + 6); x++) out.push(x);
    return out;
  };
  return { clave, anio, mes, n, wd, finde, semanaDe, semanaLaboral, semanas: semanaDe(n) + 1, enVac, donde, necesita, motivo, nombre, porId, horario, config };
}

export function diasDeSemana(ctx, s) {
  const out = [];
  for (let d = 1; d <= ctx.n; d++) if (ctx.semanaDe(d) === s) out.push(d);
  return out;
}

export function problemas(ctx, semana = null) {
  const out = [];
  const h = ctx.horario;
  for (let d = 1; d <= ctx.n; d++) {
    if (semana != null && ctx.semanaDe(d) !== semana) continue;
    const cuando = `${DIAS_LARGO[ctx.wd(d)]} ${d}`;
    const vistos = {};
    for (const c of CASAS) {
      const f = ctx.necesita(c, d) - en(h, d, c).length;
      if (f > 0) out.push({ tipo: 'falta', d, k: c, n: f, t: `${f === 1 ? 'Falta 1 persona' : `Faltan ${f} personas`} en ${c} el ${cuando}` });
      for (const id of en(h, d, c)) {
        if (vistos[id]) out.push({ tipo: 'doble', d, k: c, t: `${ctx.nombre(id)} está en ${vistos[id]} y en ${c} el ${cuando}` });
        vistos[id] = c;
        if (ctx.enVac(id, d)) out.push({ tipo: 'vac', d, k: c, t: `${ctx.nombre(id)} está de vacaciones el ${cuando}` });
        if (!ctx.porId.has(id)) out.push({ tipo: 'fuera', d, k: c, t: `${ctx.nombre(id)} ya no está en el personal y sale el ${cuando}` });
      }
    }
  }
  return out;
}

export function faltanEnDia(ctx, d) {
  return CASAS.reduce((a, c) => a + Math.max(0, ctx.necesita(c, d) - en(ctx.horario, d, c).length), 0);
}

export function copiarAnterior(clave, anterior, config, base) {
  const { anio, mes } = partesMes(clave);
  const ant = partesMes(moverMes(clave, -1));
  const nAnt = diasDelMes(ant.anio, ant.mes);
  const ferAnt = new Set(anterior.fer || []);
  const ids = new Set(config.personal.map((p) => p.id));
  let h = { dias: {}, vac: base ? base.vac : [], fer: base ? base.fer : [] };
  const quitados = [];
  const n = diasDelMes(anio, mes);
  const filaDe = (a, m, d) => Math.floor((d - 1 + new Date(a, m, 1).getDay()) / 7);
  const tabla = {};
  for (let x = 1; x <= nAnt; x++) {
    const wx = new Date(ant.anio, ant.mes, x).getDay();
    if ((ferAnt.has(x) && wx >= 1 && wx <= 4) || !CASAS.some((c) => en(anterior, x, c).length)) continue;
    tabla[`${filaDe(ant.anio, ant.mes, x)}|${wx}`] = x;
  }
  const saltos = [0, -2, 2, -4, 4, -1, 1, -3, 3, -5, 5];
  for (let d = 1; d <= n; d++) {
    const w = new Date(anio, mes, d).getDay();
    const fila = filaDe(anio, mes, d);
    let src = null;
    for (const s of saltos) {
      const x = tabla[`${fila + s}|${w}`];
      if (x != null) {
        src = x;
        break;
      }
    }
    if (src == null) continue;
    for (const p of PUESTOS) {
      const lista = [];
      for (const id of en(anterior, src, p)) {
        if (!ids.has(id)) {
          quitados.push({ id, d, por: 'ya no está en el personal' });
          continue;
        }
        if (h.vac.some((v) => v.id === id && d >= v.de && d <= v.a)) {
          quitados.push({ id, d, por: 'vacaciones' });
          continue;
        }
        lista.push(id);
      }
      if (lista.length) h = poner(h, d, p, lista);
    }
  }
  return { horario: h, quitados };
}

export function resumirQuitados(quitados, nombre) {
  const g = {};
  for (const q of quitados) (g[`${q.id}|${q.por}`] = g[`${q.id}|${q.por}`] || []).push(q.d);
  return Object.entries(g).map(([k, ds]) => {
    const [id, por] = k.split('|');
    ds.sort((a, b) => a - b);
    return `Quité a ${nombre(id)} ${ds.length > 1 ? `del ${ds[0]} al ${ds[ds.length - 1]}` : `el ${ds[0]}`} (${por})`;
  });
}

export function completar(clave, horario, config, azar = Math.random) {
  let h = horario;
  const nuevos = [];
  let casas = 0;
  let calls = 0;
  const { anio, mes } = partesMes(clave);
  const n = diasDelMes(anio, mes);
  const usados = {};
  let ctx = contexto(clave, h, config);
  for (const p of config.personal) {
    usados[p.id] = 0;
    for (let d = 1; d <= n; d++) if (ctx.donde(p.id, d)) usados[p.id]++;
  }
  const agregar = (d, k, id) => {
    h = poner(h, d, k, [...en(h, d, k), id]);
    nuevos.push(`${d}|${k}|${id}`);
    ctx = contexto(clave, h, config);
  };
  for (let d = 1; d <= n; d++) {
    for (const p of config.personal.filter((x) => casasDe(x).length === 1)) {
      const suya = p.casas[0];
      if (!ctx.donde(p.id, d) && !ctx.motivo(p.id, d, suya) && en(h, d, suya).length < ctx.necesita(suya, d)) {
        agregar(d, suya, p.id);
        usados[p.id]++;
        casas++;
      }
    }
    for (const c of CASAS) {
      while (en(h, d, c).length < ctx.necesita(c, d)) {
        const cand = config.personal.filter((p) => !ctx.donde(p.id, d) && !ctx.motivo(p.id, d, c));
        if (!cand.length) break;
        const peso = new Map(cand.map((p) => [p.id, usados[p.id] + (azar() - 0.5) * 0.8]));
        cand.sort((a, b) => peso.get(a.id) - peso.get(b.id));
        agregar(d, c, cand[0].id);
        usados[cand[0].id]++;
        casas++;
      }
    }
  }
  const oc = config.personal.filter((p) => p.oc);
  let i = 0;
  for (let d = 1; d <= n; d = ctx.semanaLaboral(d).slice(-1)[0] + 1) {
    const dias = ctx.semanaLaboral(d);
    const vacios = dias.filter((x) => !en(h, x, ON_CALL).length);
    if (!vacios.length) continue;
    const puesto = dias.map((x) => en(h, x, ON_CALL)).find((l) => l.length);
    let ids = puesto ? puesto.filter((id) => ctx.porId.has(id)) : [];
    if (!ids.length) {
      if (!oc.length) continue;
      const libres = (p) => vacios.filter((x) => !ctx.enVac(p.id, x)).length;
      let mejor = null;
      for (let t = 0; t < oc.length; t++) {
        const p = oc[(i + t) % oc.length];
        if (!mejor || libres(p) > libres(mejor.p)) mejor = { p, t };
        if (libres(p) === vacios.length) break;
      }
      if (!libres(mejor.p)) continue;
      ids = [mejor.p.id];
      i = (i + mejor.t + 1) % oc.length;
    }
    for (const x of vacios) {
      const ok = ids.filter((id) => !ctx.enVac(id, x));
      for (const id of ok) {
        agregar(x, ON_CALL, id);
      }
      if (ok.length) calls++;
    }
  }
  return { horario: h, nuevos, casas, calls };
}

export function ponerOnCall(ctx, d, ids, todaLaSemana) {
  let h = ctx.horario;
  const dias = todaLaSemana ? ctx.semanaLaboral(d) : [d];
  for (const x of dias) h = poner(h, x, ON_CALL, x === d ? ids : ids.filter((id) => !ctx.enVac(id, x)));
  return h;
}

export function quitarPersona(horario, id) {
  let h = { ...horario, vac: horario.vac.filter((v) => v.id !== id) };
  for (const [d, dia] of Object.entries(horario.dias)) for (const k of Object.keys(dia)) if (dia[k].includes(id)) h = poner(h, +d, k, dia[k].filter((x) => x !== id));
  return h;
}

export function idNuevo(config, nombre) {
  const base = slug(nombre);
  let id = base;
  let i = 2;
  while (config.personal.some((p) => p.id === id)) id = `${base}${i++}`;
  return id;
}

export function resumenMes(ctx) {
  return ctx.config.personal.map((p) => {
    let dias = 0;
    let fines = 0;
    let calls = 0;
    for (let d = 1; d <= ctx.n; d++) {
      if (ctx.donde(p.id, d)) {
        dias++;
        if (ctx.finde(d)) fines++;
      }
      if (en(ctx.horario, d, ON_CALL).includes(p.id)) calls++;
    }
    return { p, dias, fines, calls };
  });
}

export function desdeExcel(dias, personalAcuerdos, config, clave, fer = []) {
  const nombreDe = new Map(personalAcuerdos.map((p) => [p.id, p.nombre]));
  let cfg = config;
  let h = horarioVacio();
  const agregados = [];
  const asegurar = (id, nombre) => {
    if (cfg.personal.some((p) => p.id === id)) return;
    cfg = { ...cfg, personal: [...cfg.personal, { id, n: nombre, casas: null, dias: [0, 1, 2, 3, 4, 5, 6], oc: false }] };
    agregados.push(nombre);
  };
  for (const [d, dia] of Object.entries(dias)) {
    if (!dia) continue;
    const extra = {};
    for (const u of dia.desconocidos || []) {
      const nombre = u.texto.charAt(0).toUpperCase() + u.texto.slice(1);
      const id = slug(u.texto);
      asegurar(id, nombre);
      (extra[u.casa] = extra[u.casa] || []).push(id);
    }
    for (const c of CASAS) {
      const ids = [...((dia.casas && dia.casas[c]) || []), ...(extra[c] || [])];
      ids.forEach((id) => asegurar(id, nombreDe.get(id) || id));
      if (ids.length) h = poner(h, +d, c, Array.from(new Set(ids)));
    }
    const call = [...(dia.call || []), ...(extra['On Call'] || [])];
    call.forEach((id) => asegurar(id, nombreDe.get(id) || id));
    if (call.length) h = poner(h, +d, ON_CALL, Array.from(new Set(call)));
  }
  return { horario: h, config: asignarCasas(cfg, [{ clave, horario: { ...h, fer } }], true), agregados };
}

export function aAnalisis(clave, horario, config, personalAcuerdos) {
  const { anio, mes } = partesMes(clave);
  const n = diasDelMes(anio, mes);
  const ids = new Set(personalAcuerdos.map((p) => p.id));
  const tokenizar = construirTokenizador(personalAcuerdos);
  const nombre = new Map(config.personal.map((p) => [p.id, p.n]));
  const cache = new Map();
  const resolver = (id) => {
    if (ids.has(id)) return id;
    if (!cache.has(id)) {
      const r = tokenizar(squash(nombre.get(id) || id));
      cache.set(id, r.ids.length === 1 && !r.desconocidos.length ? r.ids[0] : null);
    }
    return cache.get(id);
  };
  const dias = {};
  for (let d = 1; d <= n; d++) {
    const casas = {};
    const call = [];
    const desconocidos = [];
    const textos = [];
    for (const k of PUESTOS) {
      const lista = en(horario, d, k);
      if (!lista.length) continue;
      textos.push(`${k}: ${lista.map((id) => nombre.get(id) || id).join('-')}`);
      for (const id of lista) {
        const r = resolver(id);
        if (!r) desconocidos.push({ casa: k, texto: fold(nombre.get(id) || id).replace(/[^a-z]/g, '') });
        else if (k === ON_CALL) call.push(r);
        else (casas[k] = casas[k] || []).push(r);
      }
    }
    dias[d] = { texto: textos.join(' | '), casas, call, desconocidos };
  }
  return armarResultado(mes, anio, dias);
}
