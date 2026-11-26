import { CASAS } from '../personal.js';
import { edad } from '../ninos.js';
import { ON_CALL, activos, normalizarConfig, normalizarHorario, contexto, conteoFindes } from '../horarioApp.js';
import { MESES_P, MESES_EN, DIAS_BONITO, DIAS_EN, claveDe, finDeSemana } from './fechas.js';

const MAX_EN_CHAT = 60;
const ROL = { es: { padre: 'padre/madre de casa', aux: 'auxiliar', finde: 'auxiliar de fin de semana' }, en: { padre: 'house parent', aux: 'assistant', finde: 'weekend assistant' } };
const nombreMes = (clave, E) => `${(E ? MESES_EN : MESES_P)[+clave.slice(5) - 1]} ${clave.slice(0, 4)}`;
const ir = (tab, t, extra = {}) => ({ t, ir: tab, ...extra });
const corta = (f, E) => `${(E ? DIAS_EN : DIAS_BONITO)[f.getDay()].slice(0, 3)} ${f.getDate()}`;
const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const mesPorDefecto = (e, datos) => {
  const f = e.fechas;
  if (f && f.tipo === 'mes') return f.mes;
  if (f && f.fechas && f.fechas.length) return claveDe(f.fechas[0]);
  return datos.mesActivo || claveDe(datos.hoy);
};

export function findesDePersona(p, lista, titulo, T, mes) {
  const E = T.E;
  const grupos = new Map();
  for (const x of lista) {
    if (x.k === ON_CALL || ![5, 6, 0].includes(x.d.getDay())) continue;
    const v = finDeSemana(x.d)[0];
    const llave = v.getTime();
    if (!grupos.has(llave)) grupos.set(llave, { dias: [], casas: new Set() });
    grupos.get(llave).dias.push(x.d);
    grupos.get(llave).casas.add(x.k);
  }
  const items = Array.from(grupos.values())
    .sort((a, b) => a.dias[0] - b.dias[0])
    .map((g) => {
      const ds = g.dias.sort((a, b) => a - b);
      const rango = ds.length > 1 ? `${corta(ds[0], E)} – ${corta(ds[ds.length - 1], E)}` : corta(ds[0], E);
      return `${rango} · ${Array.from(g.casas).join(', ')}`;
    });
  const n = items.length;
  const botones = [ir('horario', E ? 'See the Schedule' : 'Ver el Horario', { mes })];
  if (!n) return { partes: [{ p: E ? `${mayus(titulo)}, **${p.n}** doesn't work any weekend.` : `${mayus(titulo)}, **${p.n}** no trabaja ningún fin de semana.` }], botones };
  return {
    partes: [{ p: E ? `${mayus(titulo)}, **${p.n}** works **${n} ${n === 1 ? 'weekend' : 'weekends'}**:` : `${mayus(titulo)}, **${p.n}** trabaja **${n} ${n === 1 ? 'fin de semana' : 'fines de semana'}**:` }, { ul: items }],
    botones,
    sugerencias: [E ? `What days does ${p.n} work?` : `¿Qué días trabaja ${p.n}?`]
  };
}

function edadTxt(n, E) {
  const a = edad(n.nacimiento);
  if (a == null || a === '') return '';
  return E ? `${a} yrs` : `${a} años`;
}

export async function listaNinos(e, datos, T) {
  const E = T.E;
  const todos = await datos.cargarNinos();
  let l = todos.slice();
  const filtro = [];
  if (e.casa) {
    l = l.filter((n) => n.casa === e.casa);
    filtro.push(e.casa);
  }
  let sinSexo = 0;
  if (e.sexo) {
    sinSexo = l.filter((n) => !n.sexo).length;
    l = l.filter((n) => n.sexo === e.sexo);
  }
  if (e.edadMin != null) l = l.filter((n) => edad(n.nacimiento) != null && edad(n.nacimiento) > e.edadMin);
  if (e.edadMax != null) l = l.filter((n) => edad(n.nacimiento) != null && edad(n.nacimiento) < e.edadMax);
  l.sort((a, b) => (e.casa ? 0 : CASAS.indexOf(a.casa) - CASAS.indexOf(b.casa)) || a.nombre.localeCompare(b.nombre, 'es'));
  const quien = e.sexo === 'F' ? (E ? 'girls' : 'niñas') : e.sexo === 'M' ? (E ? 'boys' : 'niños varones') : E ? 'children' : 'niños';
  const extra = [e.edadMin != null ? (E ? `older than ${e.edadMin}` : `mayores de ${e.edadMin}`) : '', e.edadMax != null ? (E ? `younger than ${e.edadMax}` : `menores de ${e.edadMax}`) : ''].filter(Boolean).join(E ? ' and ' : ' y ');
  const titulo = `${mayus(quien)}${extra ? ` ${extra}` : ''}${e.casa ? (E ? ` in ${e.casa}` : ` de ${e.casa}`) : ''}`;
  if (!l.length) {
    const partes = [{ p: E ? `I didn't find any ${quien}${extra ? ` ${extra}` : ''}${e.casa ? ` in ${e.casa}` : ''}.` : `No encontré ${quien}${extra ? ` ${extra}` : ''}${e.casa ? ` en ${e.casa}` : ''}.` }];
    if (sinSexo) partes.push({ p: E ? `${sinSexo} children don't have girl/boy filled in the list.` : `${sinSexo} niños no tienen puesto si son niña o niño en la lista.` });
    return { partes, botones: [ir('ninos', E ? 'Open Niños' : 'Abrir Niños')] };
  }
  const items = l.slice(0, MAX_EN_CHAT).map((n) => [n.nombre, e.casa ? '' : n.casa, edadTxt(n, E)].filter(Boolean).join(' · '));
  if (l.length > MAX_EN_CHAT) items.push(E ? `…and ${l.length - MAX_EN_CHAT} more (all of them are in the file)` : `…y ${l.length - MAX_EN_CHAT} más (todos van en el archivo)`);
  const partes = [{ p: E ? `**${titulo}**: ${l.length}` : `**${titulo}**: ${l.length}` }, { ul: items }];
  if (sinSexo && e.sexo) partes.push({ p: E ? `Note: ${sinSexo} children don't have girl/boy filled in, so they're not included. You can fill it in Niños.` : `Ojo: ${sinSexo} niños no tienen puesto si son niña o niño, así que no salen aquí. Se puede completar en Niños.` });
  const desc = { tipo: 'ninos', ids: l.map((n) => n.id), titulo, casa: e.casa || '' };
  return {
    partes,
    botones: [
      { t: E ? 'Download Excel' : 'Descargar Excel', descarga: { ...desc, formato: 'xlsx' } },
      { t: E ? 'Download PDF' : 'Descargar PDF', descarga: { ...desc, formato: 'pdf' } }
    ]
  };
}

export async function listaPersonal(e, datos, T) {
  const E = T.E;
  const mes = mesPorDefecto(e, datos);
  const r = await datos.horario(mes);
  const cfg = normalizarConfig(r && r.config);
  let l = activos(cfg, mes);
  if (e.casa) l = l.filter((p) => (p.casas || []).includes(e.casa));
  if (e.rol) l = l.filter((p) => (e.rol === 'aux' ? p.rol !== 'padre' : p.rol === e.rol));
  const completo = new Map((datos.personal || []).map((p) => [p.id, p.completo || '']));
  l.sort((a, b) => (b.rol === 'padre') - (a.rol === 'padre') || a.n.localeCompare(b.n, 'es'));
  const R = ROL[E ? 'en' : 'es'];
  const quien = e.rol === 'padre' ? (E ? 'House parents' : 'Padres de casa') : e.rol === 'aux' ? (E ? 'Assistants' : 'Auxiliares') : E ? 'Staff' : 'Personal';
  const titulo = `${quien}${e.casa ? (E ? ` · ${e.casa}` : ` · ${e.casa}`) : ''} · ${nombreMes(mes, E)}`;
  if (!l.length) return { partes: [{ p: E ? `Nobody matches that in ${nombreMes(mes, E)}.` : `No hay nadie así en ${nombreMes(mes, E)}.` }], botones: [ir('horario', E ? 'Open Personal y reglas' : 'Abrir Personal y reglas', { mes })] };
  const items = l.map((p) => [`**${p.n}**${completo.get(p.id) && completo.get(p.id) !== p.n ? ` (${completo.get(p.id)})` : ''}`, R[p.rol] || '', e.casa ? '' : (p.casas || []).join(', ')].filter(Boolean).join(' · '));
  return {
    partes: [{ p: `**${titulo}**: ${l.length}` }, { ul: items }],
    botones: [{ t: E ? 'Download Excel' : 'Descargar Excel', descarga: { tipo: 'personal', formato: 'xlsx', mes, ids: l.map((p) => p.id), titulo } }]
  };
}

export async function descargarHorario(e, datos, T) {
  const E = T.E;
  const mes = mesPorDefecto(e, datos);
  const r = await datos.horario(mes);
  const h = r && normalizarHorario(r.horario);
  if (!h || !Object.keys(h.dias).length) return { partes: [{ p: E ? `${mayus(nombreMes(mes, E))} doesn't have a schedule yet.` : `${mayus(nombreMes(mes, E))} todavía no tiene horario.` }], botones: [ir('horario', E ? 'Make it' : 'Hacerlo', { mes })] };
  const partes = [{ p: E ? `Here is the schedule for **${nombreMes(mes, E)}**.` : `Aquí tienes el horario de **${nombreMes(mes, E)}**.` }];
  if (r.vivo && r.sinGuardar) partes.push({ p: E ? 'It includes the changes you haven’t saved yet.' : 'Incluye los cambios que todavía no guardaste.' });
  return {
    partes,
    botones: [
      { t: E ? 'Download PDF' : 'Descargar PDF', descarga: { tipo: 'horario', formato: 'pdf', mes } },
      { t: E ? 'Download Excel' : 'Descargar Excel', descarga: { tipo: 'horario', formato: 'xlsx', mes } },
      ir('horario', E ? 'Open it' : 'Abrirlo', { mes })
    ]
  };
}

const DIA_CORTO = { es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };

export async function conteoFindesChat(e, datos, T) {
  const E = T.E;
  const f = e.fechas;
  const mes = f && f.tipo === 'mes' ? f.mes : datos.mesActivo || claveDe(datos.hoy);
  const r = await datos.horario(mes);
  const h = r && normalizarHorario(r.horario);
  if (!h || !Object.keys(h.dias).length) return { partes: [{ p: E ? `${mayus(nombreMes(mes, E))} doesn't have a schedule yet.` : `${mayus(nombreMes(mes, E))} todavía no tiene horario.` }], botones: [ir('horario', E ? 'Make it' : 'Hacerlo', { mes })] };
  const ctx = contexto(mes, h, normalizarConfig(r.config));
  const filas = conteoFindes(ctx);
  const dc = DIA_CORTO[E ? 'en' : 'es'];
  const rango = (dias) => {
    const t = (d) => `${dc[ctx.wd(d)]} ${d}`;
    return dias.length > 1 ? `${t(dias[0])}–${t(dias[dias.length - 1])}` : t(dias[0]);
  };
  const orden = (f) => (f.rol === 'padre' ? 1 : f.rol === 'otro' ? 2 : 0);
  const con = filas.filter((f) => f.findes.length).sort((a, b) => orden(a) - orden(b) || a.n.localeCompare(b.n, 'es'));
  const sin = filas.filter((f) => !f.findes.length && f.rol !== 'otro');
  const linea = (f) => `**${f.n}**: ${f.findes.length} — ${f.findes.map((x) => `${rango(x.dias)} (${x.casas.join(', ')})`).join(' · ')}`;
  const partes = [{ p: E ? `Weekends each person works in **${nombreMes(mes, E)}**:` : `Fines de semana que trabaja cada persona en **${nombreMes(mes, E)}**:` }];
  if (con.length) partes.push({ ul: con.map(linea) });
  else partes.push({ p: E ? 'Nobody has weekends in the schedule yet.' : 'Nadie tiene fines de semana puestos todavía.' });
  if (sin.length) partes.push({ p: E ? `No weekends: ${sin.map((f) => f.n).join(', ')}.` : `No trabajan fines de semana: ${sin.map((f) => f.n).join(', ')}.` });
  if (r.vivo && r.sinGuardar) partes.push({ p: E ? 'It includes the changes you haven’t saved yet.' : 'Incluye los cambios que todavía no guardaste.' });
  const texto = [`${E ? 'Weekends' : 'Fines de semana'} · ${nombreMes(mes, E)}`, ...con.map((f) => linea(f).replace(/\*\*/g, '')), ...(sin.length ? [`${E ? 'No weekends' : 'No trabajan fines de semana'}: ${sin.map((f) => f.n).join(', ')}`] : [])].join('\n');
  return {
    partes,
    botones: [{ t: E ? 'Copy' : 'Copiar', copiar: texto }, ir('horario', E ? 'See the Schedule' : 'Ver el Horario', { mes })],
    sugerencias: con.length ? [E ? `How many weekends does ${con[0].n} work?` : `¿Qué fines de semana trabaja ${con[0].n}?`] : []
  };
}
