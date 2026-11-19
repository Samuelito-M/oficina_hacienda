import { CASAS, PERSONAL_BASE, slug } from './personal.js';
import { fold, squash } from './text.js';
import { construirTokenizador, armarResultado } from './horario.js';

export const ON_CALL = 'On Call';
export const PUESTOS = [...CASAS, ON_CALL];
export const COLOR_PUESTO = { 'Casa 1': '#24A9C2', 'Casa 2': '#E44D64', 'Casa 3': '#389B58', 'Casa 4': '#5170FF', 'Casa Esther': '#F39200', [ON_CALL]: '#7E57C2' };
export const CORTO = { 'Casa 1': 'C1', 'Casa 2': 'C2', 'Casa 3': 'C3', 'Casa 4': 'C4', 'Casa Esther': 'Est', [ON_CALL]: 'On call' };
export const DIAS_SEM = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DIAS_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const ROLES = { padre: 'Padre o madre de casa', aux: 'Auxiliar', finde: 'Auxiliar solo de fin de semana' };
export const REGLAS_DESDE = '2026-12';
export const REGLAS_BASE = { findesPadres: 2, findesAux: 3, sinPadres: 2, extraFinde: true, auxMin: { 'Casa 1': 1, 'Casa 2': 0, 'Casa 3': 1, 'Casa 4': 1, 'Casa Esther': 1 } };
const FINDE = [5, 6, 0];
const TODOS = [0, 1, 2, 3, 4, 5, 6];
const sin = (w) => TODOS.filter((x) => x !== w);

export const claveMes = (anio, mes) => `${anio}-${String(mes + 1).padStart(2, '0')}`;
export const partesMes = (clave) => ({ anio: +clave.slice(0, 4), mes: +clave.slice(5, 7) - 1 });
export function moverMes(clave, n) {
  const { anio, mes } = partesMes(clave);
  const d = new Date(anio, mes + n, 1);
  return claveMes(d.getFullYear(), d.getMonth());
}
export const diasDelMes = (anio, mes) => new Date(anio, mes + 1, 0).getDate();

const BASE = [
  { id: 'miguel', rol: 'padre', casas: ['Casa 1'], dias: FINDE },
  { id: 'patricia', rol: 'padre', casas: ['Casa 1'], dias: FINDE },
  { id: 'julian', rol: 'padre', casas: ['Casa 2'], dias: FINDE },
  { id: 'alejandra', rol: 'padre', casas: ['Casa 2'], dias: FINDE },
  { id: 'tania', rol: 'padre', casas: ['Casa 3'], dias: FINDE },
  { id: 'viviana', rol: 'padre', casas: ['Casa 4'], dias: FINDE, oc: true },
  { id: 'devimar', rol: 'padre', casas: ['Casa Esther'], dias: FINDE },
  { id: 'marivid', rol: 'aux', casas: CASAS, pref: 'Casa 3', dias: sin(3) },
  { id: 'marlene', rol: 'aux', casas: CASAS, dias: sin(3) },
  { id: 'wendy', rol: 'aux', casas: CASAS, dias: sin(3) },
  { id: 'myriam', rol: 'aux', casas: ['Casa 2', 'Casa 3', 'Casa Esther'], dias: sin(1) },
  { id: 'mayra', rol: 'aux', casas: CASAS, dias: sin(2) },
  { id: 'dayanith', rol: 'aux', casas: CASAS, dias: sin(2) },
  { id: 'yazmira', rol: 'aux', casas: CASAS, pref: 'Casa 4', dias: sin(4) },
  { id: 'moises', rol: 'finde', casas: CASAS, dias: FINDE },
  { id: 'magali', rol: 'finde', casas: CASAS, dias: FINDE },
  { id: 'yvelice', rol: 'aux', casas: CASAS, dias: TODOS, hasta: '2026-11' },
  { id: 'coro', rol: 'aux', casas: CASAS, dias: TODOS, hasta: '2026-11' }
];

function persona(p) {
  const rol = ROLES[p.rol] ? p.rol : 'aux';
  let casas = Array.isArray(p.casas) ? CASAS.filter((c) => p.casas.includes(c)) : [];
  if (rol === 'padre') casas = casas.slice(0, 1);
  const out = { id: String(p.id), n: String(p.n).trim(), rol, casas, pref: rol !== 'padre' && casas.includes(p.pref) ? p.pref : '', dias: Array.isArray(p.dias) ? TODOS.filter((w) => p.dias.includes(w)) : TODOS, oc: !!p.oc };
  if (typeof p.hasta === 'string' && /^20\d\d-\d\d$/.test(p.hasta)) out.hasta = p.hasta;
  return out;
}

export function configInicial() {
  const nombre = new Map(PERSONAL_BASE.map((p) => [p.id, p.nombre]));
  return { v: 3, personal: BASE.map((p) => persona({ ...p, n: nombre.get(p.id) || p.id })), reglas: JSON.parse(JSON.stringify(REGLAS_BASE)) };
}

function numero(v, base, max) {
  const n = Math.floor(+v);
  return Number.isFinite(n) && n >= 0 ? Math.min(max, n) : base;
}

export function normalizarConfig(c) {
  const base = configInicial();
  if (!c || typeof c !== 'object' || !Array.isArray(c.personal)) return base;
  const validos = c.personal.filter((p) => p && typeof p.id === 'string' && p.id && typeof p.n === 'string' && p.n.trim());
  if (c.v !== 3) {
    const ya = new Set(base.personal.map((p) => p.id));
    const extra = validos.filter((p) => !ya.has(p.id)).map((p) => persona({ id: p.id, n: p.n, rol: 'aux', casas: Array.isArray(p.casas) && p.casas.length ? p.casas : CASAS, dias: p.dias }));
    return { ...base, personal: [...base.personal, ...extra] };
  }
  const r = c.reglas || {};
  const auxMin = {};
  for (const casa of CASAS) auxMin[casa] = numero(r.auxMin && r.auxMin[casa], REGLAS_BASE.auxMin[casa], 4);
  return { v: 3, personal: validos.map(persona), reglas: { findesPadres: numero(r.findesPadres, 2, 5), findesAux: numero(r.findesAux, 3, 5), sinPadres: numero(r.sinPadres, 2, 4), extraFinde: r.extraFinde !== false, auxMin } };
}

export const casasDe = (p) => (p && Array.isArray(p.casas) ? p.casas : []);
export const esDeUnaCasa = (p, k) => !!p && p.rol === 'padre' && casasDe(p)[0] === k;
export const activo = (p, clave) => !!p && (!p.hasta || clave <= p.hasta);
export const activos = (config, clave) => config.personal.filter((p) => activo(p, clave));

export const MAX_NOTA = 200;
export const MAX_OBS = 600;
const limpiarTexto = (t, max) => String(t == null ? '' : t).replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

export function horarioVacio() {
  return { dias: {}, vac: [], fer: [], notas: {}, obs: '' };
}

export function ponerNota(h, d, texto) {
  const t = limpiarTexto(texto, MAX_NOTA);
  const notas = { ...(h.notas || {}) };
  if (t) notas[d] = t;
  else delete notas[d];
  return { ...h, notas };
}

export function ponerObs(h, texto) {
  return { ...h, obs: limpiarTexto(texto, MAX_OBS) };
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
  if (Array.isArray(h.vac)) out.vac = h.vac.filter((v) => v && v.id && +v.de >= 1 && +v.a >= +v.de).map((v) => ({ id: String(v.id), de: +v.de, a: +v.a, ...(typeof v.t === 'string' && v.t ? { t: v.t.slice(0, 5) } : {}) }));
  if (Array.isArray(h.fer)) out.fer = Array.from(new Set(h.fer.map(Number).filter((d) => d >= 1 && d <= 31))).sort((a, b) => a - b);
  if (h.notas && typeof h.notas === 'object') {
    for (const d of Object.keys(h.notas).map(Number).filter((x) => x >= 1 && x <= 31).sort((a, b) => a - b)) {
      const t = limpiarTexto(h.notas[d], MAX_NOTA);
      if (t) out.notas[d] = t;
    }
  }
  out.obs = limpiarTexto(h.obs, MAX_OBS);
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

const esFinde = (w) => w === 5 || w === 6 || w === 0;

export function contexto(clave, horario, config) {
  const { anio, mes } = partesMes(clave);
  const n = diasDelMes(anio, mes);
  const primer = new Date(anio, mes, 1).getDay();
  const wd = (d) => (((d - 1 + primer) % 7) + 7) % 7;
  const porId = new Map(config.personal.map((p) => [p.id, p]));
  const R = config.reglas;
  const finde = (d) => esFinde(wd(d));
  const semanaDe = (d) => Math.floor((d - 1 + primer) / 7);
  const enVac = (id, d) => horario.vac.some((v) => v.id === id && d >= v.de && d <= v.a);
  const donde = (id, d) => CASAS.find((c) => en(horario, d, c).includes(id)) || '';
  const nombre = (id) => (porId.get(id) ? porId.get(id).n : id.charAt(0).toUpperCase() + id.slice(1));
  const esPadre = (id) => porId.get(id)?.rol === 'padre';
  const viernesDe = (d) => d - ((wd(d) + 2) % 7);
  const findes = [];
  for (let d = 1; d <= n; d++) {
    if (!finde(d)) continue;
    const v = viernesDe(d);
    if (!findes.length || findes[findes.length - 1].viernes !== v) findes.push({ viernes: v, dias: [] });
    findes[findes.length - 1].dias.push(d);
  }
  const findeDe = (d) => (finde(d) ? findes.findIndex((f) => f.viernes === viernesDe(d)) : -1);
  const bloque = (d) => {
    const w = wd(d);
    const desde = finde(d) ? viernesDe(d) : d - (w - 1);
    const largo = finde(d) ? 3 : 4;
    const out = [];
    for (let x = Math.max(1, desde); x <= Math.min(n, desde + largo - 1); x++) out.push(x);
    return out;
  };
  const hayPadres = (k, d) => en(horario, d, k).some(esPadre);
  const pide = (k, d) => {
    if (!CASAS.includes(k)) return 0;
    if (!finde(d)) return R.auxMin[k];
    return hayPadres(k, d) ? en(horario, d, k).filter(esPadre).length + R.auxMin[k] : R.sinPadres;
  };
  const revisa = clave >= REGLAS_DESDE;
  const faltaRegla = (k, d) => {
    if (!CASAS.includes(k)) return 0;
    const l = en(horario, d, k);
    if (!finde(d)) return Math.max(0, R.auxMin[k] - l.length);
    return hayPadres(k, d) ? Math.max(0, R.auxMin[k] - l.filter((id) => !esPadre(id)).length) : Math.max(0, R.sinPadres - l.length);
  };
  const falta = (k, d) => (revisa ? faltaRegla(k, d) : 0);
  const findesDe = (id) => findes.filter((f) => f.dias.some((d) => donde(id, d))).length;
  const tope = (p) => (p.rol === 'padre' ? R.findesPadres : R.findesAux + Math.max(0, findes.length - 4));
  const motivo = (id, d, k) => {
    const p = porId.get(id);
    if (!p) return 'no está en el personal';
    if (!activo(p, clave)) return 'ya no trabaja';
    if (enVac(id, d)) return 'no está (ausencia)';
    if (k === ON_CALL) return '';
    const dd = donde(id, d);
    if (!casasDe(p).includes(k)) return casasDe(p).length ? `no va a ${k}` : 'no tiene casas marcadas';
    if (dd && dd !== k) return `ya está en ${dd}`;
    if (!p.dias.includes(wd(d))) return p.rol === 'aux' && !finde(d) ? `descansa los ${DIAS_LARGO[wd(d)]}` : `no trabaja los ${DIAS_LARGO[wd(d)]}`;
    if (finde(d) && !dd) {
      const f = findes[findeDe(d)];
      if (!f.dias.some((x) => donde(id, x)) && findesDe(id) >= tope(p)) return `ya tiene ${tope(p)} fines de semana`;
    }
    return '';
  };
  return { clave, anio, mes, n, wd, revisa, finde, semanaDe, semanas: semanaDe(n) + 1, findes, findeDe, bloque, enVac, donde, pide, falta, faltaRegla, hayPadres, esPadre, findesDe, tope, motivo, nombre, porId, horario, config };
}

export function diasDeSemana(ctx, s) {
  const out = [];
  for (let d = 1; d <= ctx.n; d++) if (ctx.semanaDe(d) === s) out.push(d);
  return out;
}

export function problemas(ctx, semana = null) {
  const out = [];
  const h = ctx.horario;
  const dentro = (d) => semana == null || ctx.semanaDe(d) === semana;
  for (let d = 1; d <= ctx.n; d++) {
    if (!dentro(d)) continue;
    const cuando = `${DIAS_LARGO[ctx.wd(d)]} ${d}`;
    const vistos = {};
    for (const c of CASAS) {
      const f = ctx.falta(c, d);
      if (f > 0) out.push({ tipo: 'falta', d, k: c, n: f, t: `${f === 1 ? 'Falta 1 persona' : `Faltan ${f} personas`} en ${c} el ${cuando}` });
      for (const id of en(h, d, c)) {
        const p = ctx.porId.get(id);
        if (vistos[id]) out.push({ tipo: 'doble', d, k: c, t: `${ctx.nombre(id)} está en ${vistos[id]} y en ${c} el ${cuando}` });
        vistos[id] = c;
        if (ctx.enVac(id, d)) out.push({ tipo: 'vac', d, k: c, t: `${ctx.nombre(id)} no está ese día (ausencia) el ${cuando}` });
        if (!ctx.revisa) continue;
        if (!activo(p, ctx.clave)) out.push({ tipo: 'fuera', d, k: c, t: `${ctx.nombre(id)} ya no trabaja y sale el ${cuando}` });
        else if (!casasDe(p).includes(c)) out.push({ tipo: 'regla', d, k: c, t: `${p.n} no va a ${c} y está ahí el ${cuando}` });
        else if (!p.dias.includes(ctx.wd(d))) out.push({ tipo: 'regla', d, k: c, t: p.rol === 'aux' && !ctx.finde(d) ? `${p.n} trabaja el ${cuando}, su día de descanso` : `${p.n} no trabaja los ${DIAS_LARGO[ctx.wd(d)]} y está el ${d}` });
      }
    }
  }
  for (const p of ctx.revisa ? activos(ctx.config, ctx.clave) : []) {
    const suyos = ctx.findes.filter((f) => f.dias.some((d) => ctx.donde(p.id, d)));
    const max = ctx.tope(p);
    if (suyos.length > max) {
      const d = suyos[max].dias.find((x) => ctx.donde(p.id, x));
      if (dentro(d)) out.push({ tipo: 'regla', d, k: ctx.donde(p.id, d), t: suyos.length === max + 1 ? `${p.n} hace un fin de semana más este mes: ${suyos.length} (lo normal son ${max})` : `${p.n} trabaja ${suyos.length} fines de semana (lo normal son ${max})` });
    }
  }
  return out;
}

export function faltanEnDia(ctx, d) {
  return CASAS.reduce((a, c) => a + ctx.falta(c, d), 0);
}

export function copiarAnterior(clave, anterior, config, base) {
  const { anio, mes } = partesMes(clave);
  const ant = partesMes(moverMes(clave, -1));
  const nAnt = diasDelMes(ant.anio, ant.mes);
  const ferAnt = new Set(anterior.fer || []);
  const ids = new Set(activos(config, clave).map((p) => p.id));
  let h = { dias: {}, vac: base ? base.vac : [], fer: base ? base.fer : [], notas: base && base.notas ? base.notas : {}, obs: base && base.obs ? base.obs : '' };
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
          quitados.push({ id, d, por: 'ya no trabaja' });
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

function finDeMesAnterior(clave, anterior, config) {
  const out = { casa: {}, quien: new Set(), ultimo: null };
  if (!anterior) return out;
  const { anio, mes } = partesMes(moverMes(clave, -1));
  const n = diasDelMes(anio, mes);
  const rol = new Map(config.personal.map((p) => [p.id, p.rol]));
  let d = n;
  while (d >= 1 && !esFinde(new Date(anio, mes, d).getDay())) d--;
  if (d < 1) return out;
  const dias = [];
  while (d >= 1 && esFinde(new Date(anio, mes, d).getDay()) && dias.length < 3) dias.push(d--);
  out.ultimo = dias[0] === n ? n : null;
  for (const x of dias) {
    for (const c of CASAS) {
      for (const id of en(anterior, x, c)) {
        out.quien.add(id);
        if (rol.get(id) === 'padre') out.casa[c] = true;
      }
    }
  }
  return out;
}

function afinidades(fuentes) {
  const a = {};
  for (const f of fuentes) {
    if (!f) continue;
    const { anio, mes } = partesMes(f.clave);
    for (const [d, dia] of Object.entries(f.horario.dias)) {
      const t = esFinde(new Date(anio, mes, +d).getDay()) ? 'f' : 's';
      for (const c of CASAS) for (const id of dia[c] || []) a[`${t}|${id}|${c}`] = (a[`${t}|${id}|${c}`] || 0) + 1;
    }
  }
  return (tipo, id, casa) => {
    let total = 0;
    for (const c of CASAS) total += a[`${tipo}|${id}|${c}`] || 0;
    return total ? (a[`${tipo}|${id}|${casa}`] || 0) / total : 0;
  };
}

function emparejar(puestos, candidatos, costo) {
  const S = puestos.length;
  const tabla = puestos.map((casa) => candidatos.map((p) => costo(p, casa)));
  const vacio = (s) => 1000 + (S - s);
  const orden = tabla.map((fila) => fila.map((c, i) => ({ i, c })).filter((x) => x.c != null).sort((x, y) => x.c - y.c));
  const minimo = tabla.map((fila, s) => Math.min(vacio(s), ...fila.filter((c) => c != null)));
  const resto = new Array(S + 1).fill(0);
  for (let s = S - 1; s >= 0; s--) resto[s] = resto[s + 1] + minimo[s];
  let mejor = Infinity;
  let mejorDe = new Array(S).fill(-1);
  const de = new Array(S).fill(-1);
  const usado = new Array(candidatos.length).fill(false);
  let pasos = 0;
  const ir = (s, total) => {
    if (total + resto[s] >= mejor - 1e-9 || pasos > 400000) return;
    pasos++;
    if (s === S) {
      mejor = total;
      mejorDe = de.slice();
      return;
    }
    for (const { i, c } of orden[s]) {
      if (usado[i]) continue;
      usado[i] = true;
      de[s] = i;
      ir(s + 1, total + c);
      usado[i] = false;
    }
    de[s] = -1;
    ir(s + 1, total + vacio(s));
  };
  ir(0, 0);
  return mejorDe.map((i) => (i < 0 ? null : candidatos[i]));
}

export function sincronizarOnCall(clave, horario, config, anterior) {
  let h = horario;
  const quienes = activos(config, clave).filter((p) => p.oc);
  if (!quienes.length) return h;
  const ctx = contexto(clave, h, config);
  const previo = finDeMesAnterior(clave, anterior, config);
  for (let lunes = 2 - ctx.wd(1); lunes <= ctx.n; lunes += 7) {
    const dias = [lunes, lunes + 1, lunes + 2, lunes + 3].filter((d) => d >= 1 && d <= ctx.n);
    if (!dias.length) continue;
    const antes = [lunes - 3, lunes - 2, lunes - 1];
    const sabemos = antes.some((d) => d >= 1) || !!anterior;
    if (!sabemos) continue;
    for (const p of quienes) {
      const trabajo = antes.some((d) => d >= 1 && ctx.donde(p.id, d)) || (antes[0] < 1 && previo.quien.has(p.id));
      for (const d of dias) {
        const l = en(h, d, ON_CALL);
        if (trabajo && !l.includes(p.id) && !ctx.enVac(p.id, d)) h = poner(h, d, ON_CALL, [...l, p.id]);
        if (!trabajo && l.includes(p.id)) h = poner(h, d, ON_CALL, l.filter((x) => x !== p.id));
      }
    }
  }
  return h;
}

export function armar(clave, horario, config, anterior) {
  let h = horario;
  const nuevos = [];
  const R = config.reglas;
  const gente = activos(config, clave);
  const padres = gente.filter((p) => p.rol === 'padre');
  const auxFinde = gente.filter((p) => p.rol !== 'padre');
  const auxSemana = gente.filter((p) => p.rol === 'aux');
  const previo = finDeMesAnterior(clave, anterior, config);
  const afin = afinidades([anterior && { clave: moverMes(clave, -1), horario: anterior }]);
  let ctx = contexto(clave, h, config);
  const agregar = (d, k, id) => {
    if (en(h, d, k).includes(id)) return;
    h = poner(h, d, k, [...en(h, d, k), id]);
    nuevos.push(`${d}|${k}|${id}`);
    ctx = contexto(clave, h, config);
  };
  const libre = (p, d) => p.dias.includes(ctx.wd(d)) && !ctx.enVac(p.id, d) && !ctx.donde(p.id, d);
  const costoCasa = (p, casa, tipo) => (p.pref === casa ? -3 : 0) - afin(tipo, p.id, casa);

  const grupos = ctx.findes.map((f) => ({ ...f, sigue: f.viernes < 1 }));
  const prendido = {};
  const cuenta = {};
  for (const c of CASAS) cuenta[c] = grupos.filter((g) => !(g.sigue && anterior) && g.dias.some((d) => ctx.hayPadres(c, d))).length;
  for (const c of CASAS) prendido[c] = c in previo.casa ? true : anterior ? false : c === 'Casa 2' || c === 'Casa 4';
  const topeAux = R.findesAux + Math.max(0, grupos.length - 4);
  for (const g of grupos) {
    if (g.sigue && anterior && previo.ultimo) {
      for (const d of g.dias) {
        for (const c of CASAS) {
          if (en(h, d, c).length) continue;
          for (const id of en(anterior, previo.ultimo, c)) {
            const p = ctx.porId.get(id);
            if (activo(p, clave) && !ctx.enVac(id, d) && !ctx.donde(id, d)) agregar(d, c, id);
          }
        }
      }
      for (const c of CASAS) prendido[c] = g.dias.some((d) => ctx.hayPadres(c, d));
      g.copiado = true;
      continue;
    }
    g.estado = {};
    for (const c of CASAS) {
      const suyos = padres.filter((p) => p.casas[0] === c);
      const yaHay = g.dias.some((d) => ctx.hayPadres(c, d));
      const alguien = g.dias.some((d) => en(h, d, c).length);
      let on = yaHay;
      if (!yaHay && !alguien) on = !prendido[c] && cuenta[c] < R.findesPadres && suyos.some((p) => g.dias.some((d) => libre(p, d)));
      if (on) {
        for (const p of suyos) {
          if (!yaHay && ctx.findesDe(p.id) >= R.findesPadres) continue;
          for (const d of g.dias) if (libre(p, d)) agregar(d, c, p.id);
        }
        on = g.dias.some((d) => ctx.hayPadres(c, d));
      }
      if (on && !yaHay) cuenta[c]++;
      prendido[c] = on;
      g.estado[c] = on;
    }
  }

  const porArmar = grupos.filter((g) => !g.copiado);
  for (const g of porArmar) {
    for (const p of auxFinde) {
      const c = g.dias.map((d) => ctx.donde(p.id, d)).find(Boolean);
      if (c) for (const d of g.dias) if (libre(p, d) && ctx.faltaRegla(c, d) > 0) agregar(d, c, p.id);
    }
  }
  const faltaEn = (g, c) => Math.max(...g.dias.map((d) => ctx.faltaRegla(c, d)));
  const puedeIr = (p, g) => !g.dias.some((d) => ctx.donde(p.id, d)) && g.dias.every((d) => libre(p, d) || !p.dias.includes(ctx.wd(d))) && g.dias.some((d) => libre(p, d));
  const demanda = porArmar.reduce((a, g) => a + CASAS.reduce((x, c) => x + faltaEn(g, c), 0), 0);
  const oferta = auxFinde.reduce((a, p) => a + Math.max(0, Math.min(topeAux - ctx.findesDe(p.id), porArmar.filter((g) => puedeIr(p, g)).length)), 0);
  let recorte = R.extraFinde ? 0 : Math.max(0, demanda - oferta);
  for (const g of [...porArmar].reverse()) {
    g.menos = 0;
    if (recorte > 0 && !g.estado['Casa 2'] && faltaEn(g, 'Casa 2') > 1) {
      g.menos = 1;
      recorte--;
    }
  }
  for (const g of porArmar) {
    const quedan = porArmar.length - porArmar.indexOf(g);
    const urgencia = (p) => (topeAux - ctx.findesDe(p.id)) / quedan;
    const candidatos = auxFinde.filter((p) => ctx.findesDe(p.id) < topeAux && puedeIr(p, g));
    const pide = (c) => faltaEn(g, c) - (c === 'Casa 2' ? g.menos : 0);
    const puestos = [];
    const primero = CASAS.filter((c) => pide(c) > 0).sort((a, b) => (g.estado[a] ? 1 : 0) - (g.estado[b] ? 1 : 0) || (a === 'Casa 2') - (b === 'Casa 2'));
    for (const c of primero) puestos.push(c);
    for (const c of primero.filter((x) => x !== 'Casa 2')) for (let i = 1; i < pide(c); i++) puestos.push(c);
    if (primero.includes('Casa 2')) for (let i = 1; i < pide('Casa 2'); i++) puestos.push('Casa 2');
    const giro = (p) => (auxFinde.indexOf(p) + ctx.mes * 3 + grupos.indexOf(g) * 2) % Math.max(1, auxFinde.length);
    const porUrgencia = [...candidatos].sort((a, b) => urgencia(b) - urgencia(a) || giro(a) - giro(b));
    const costoF = (p, casa) => (p.casas.includes(casa) ? costoCasa(p, casa, 'f') - urgencia(p) * 4 + giro(p) * 0.01 : null);
    let grupo = porUrgencia.filter((p, i) => i < puestos.length || urgencia(p) >= 1);
    let elegidos = emparejar(puestos, grupo, costoF);
    if (elegidos.some((p) => !p) && grupo.length < porUrgencia.length) {
      grupo = porUrgencia;
      elegidos = emparejar(puestos, grupo, costoF);
    }
    elegidos.forEach((p, i) => {
      if (!p) return;
      for (const d of g.dias) if (libre(p, d)) agregar(d, puestos[i], p.id);
    });
  }

  const extras = [];
  if (R.extraFinde) {
    const veces = (id) => extras.filter((x) => x.id === id).length;
    for (const g of porArmar) {
      for (const c of [...CASAS].sort((a, b) => (a === 'Casa 2') - (b === 'Casa 2'))) {
        while (faltaEn(g, c) > 0) {
          const cand = auxFinde.filter((p) => p.casas.includes(c) && puedeIr(p, g) && ctx.findesDe(p.id) <= topeAux);
          if (!cand.length) break;
          cand.sort((a, b) => ctx.findesDe(a.id) - ctx.findesDe(b.id) || veces(a.id) - veces(b.id) || costoCasa(a, c, 'f') - costoCasa(b, c, 'f') || auxFinde.indexOf(a) - auxFinde.indexOf(b));
          const p = cand[0];
          for (const d of g.dias) if (libre(p, d)) agregar(d, c, p.id);
          if (ctx.findesDe(p.id) > topeAux) extras.push({ id: p.id, n: p.n, casa: c, dias: g.dias.filter((d) => ctx.donde(p.id, d) === c), total: ctx.findesDe(p.id) });
        }
      }
    }
  }

  let ayer = {};
  for (let d = 1; d <= ctx.n; d++) {
    if (ctx.finde(d)) {
      ayer = {};
      continue;
    }
    const disponibles = () => auxSemana.filter((p) => libre(p, d));
    const costo = (p, casa) => (p.casas.includes(casa) ? costoCasa(p, casa, 's') - (ayer[p.id] === casa ? 0.6 : 0) : null);
    const puestos = [];
    for (const c of CASAS) for (let i = 0; i < ctx.faltaRegla(c, d); i++) puestos.push(c);
    const cand = disponibles();
    emparejar(puestos, cand, costo).forEach((p, i) => p && agregar(d, puestos[i], p.id));
    for (const p of disponibles().sort((a, b) => (b.pref ? 1 : 0) - (a.pref ? 1 : 0) || a.casas.length - b.casas.length)) {
      let mejor = null;
      for (const c of p.casas) {
        const valor = costo(p, c) + en(h, d, c).length * 1.5;
        if (!mejor || valor < mejor.valor) mejor = { c, valor };
      }
      if (mejor) agregar(d, mejor.c, p.id);
    }
    ayer = {};
    for (const c of CASAS) for (const id of en(h, d, c)) ayer[id] = c;
  }

  const antesOC = h;
  h = sincronizarOnCall(clave, h, config, anterior);
  let calls = 0;
  for (let d = 1; d <= ctx.n; d++) {
    for (const id of en(h, d, ON_CALL)) {
      if (!en(antesOC, d, ON_CALL).includes(id)) {
        nuevos.push(`${d}|${ON_CALL}|${id}`);
        calls++;
      }
    }
  }
  return { horario: h, nuevos, casas: nuevos.length - calls, calls, extras };
}

export function ponerEnBloque(ctx, d, k, ids, todo) {
  let h = ctx.horario;
  const dias = todo ? ctx.bloque(d) : [d];
  for (const x of dias) {
    const lista = x === d ? ids : ids.filter((id) => !ctx.enVac(id, x) && (k === ON_CALL || !ctx.donde(id, x) || ctx.donde(id, x) === k));
    h = poner(h, x, k, lista);
  }
  return h;
}

export function darDeBaja(config, horario, id, clave) {
  const cfg = { ...config, personal: config.personal.map((p) => (p.id === id ? { ...p, hasta: moverMes(clave, -1) } : p)) };
  if (!horario) return { config: cfg, horario };
  let h = { ...horario, vac: horario.vac.filter((v) => v.id !== id) };
  for (const [d, dia] of Object.entries(horario.dias)) for (const k of Object.keys(dia)) if (dia[k].includes(id)) h = poner(h, +d, k, dia[k].filter((x) => x !== id));
  return { config: cfg, horario: h };
}

export function reactivar(config, id) {
  return { ...config, personal: config.personal.map((p) => {
    if (p.id !== id) return p;
    const { hasta, ...resto } = p;
    return resto;
  }) };
}

export function idNuevo(config, nombre) {
  const base = slug(nombre);
  let id = base;
  let i = 2;
  while (config.personal.some((p) => p.id === id)) id = `${base}${i++}`;
  return id;
}

export function resumenMes(ctx) {
  return activos(ctx.config, ctx.clave).map((p) => {
    let dias = 0;
    let calls = 0;
    for (let d = 1; d <= ctx.n; d++) {
      if (ctx.donde(p.id, d)) dias++;
      if (en(ctx.horario, d, ON_CALL).includes(p.id)) calls++;
    }
    return { p, dias, fines: ctx.findesDe(p.id), calls };
  });
}

export function desdeExcel(dias, personalAcuerdos, config) {
  const nombreDe = new Map(personalAcuerdos.map((p) => [p.id, p.nombre]));
  let cfg = config;
  let h = horarioVacio();
  const agregados = [];
  const vistas = {};
  const asegurar = (id, nombre, casa) => {
    if (casa !== ON_CALL) (vistas[id] = vistas[id] || new Set()).add(casa);
    if (cfg.personal.some((p) => p.id === id)) return;
    cfg = { ...cfg, personal: [...cfg.personal, { id, n: nombre, rol: 'aux', casas: [], pref: '', dias: TODOS, oc: false, nueva: true }] };
    agregados.push(nombre);
  };
  for (const [d, dia] of Object.entries(dias)) {
    if (!dia) continue;
    const extra = {};
    for (const u of dia.desconocidos || []) {
      const nombre = u.texto.charAt(0).toUpperCase() + u.texto.slice(1);
      const id = slug(u.texto);
      asegurar(id, nombre, u.casa);
      (extra[u.casa] = extra[u.casa] || []).push(id);
    }
    for (const c of CASAS) {
      const ids = [...((dia.casas && dia.casas[c]) || []), ...(extra[c] || [])];
      ids.forEach((id) => asegurar(id, nombreDe.get(id) || id, c));
      if (ids.length) h = poner(h, +d, c, Array.from(new Set(ids)));
    }
    const call = [...(dia.call || []), ...(extra['On Call'] || [])];
    call.forEach((id) => asegurar(id, nombreDe.get(id) || id, ON_CALL));
    if (call.length) h = poner(h, +d, ON_CALL, Array.from(new Set(call)));
  }
  cfg = { ...cfg, personal: cfg.personal.map((p) => {
    if (!p.nueva) return p;
    const { nueva, ...resto } = p;
    return { ...resto, casas: CASAS.filter((c) => vistas[p.id] && vistas[p.id].has(c)) };
  }) };
  return { horario: h, config: cfg, agregados };
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
