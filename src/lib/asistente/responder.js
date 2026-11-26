import { ON_CALL, en, activos, normalizarConfig, normalizarHorario, contexto, problemas, esOtro, nombreOtro } from '../horarioApp.js';
import { trabajaEn } from '../personal.js';
import { edad, proximoCumple } from '../ninos.js';
import { tallaDe } from '../tallas.js';
import { GUIA, EJEMPLOS, EJEMPLOS_EN } from './guia.js';
import { DIAS_BONITO, DIAS_EN, MESES_P, MESES_EN, fechaBonita, claveDe, finDeSemana, semana, mas, diasDelMes } from './fechas.js';
import { CASAS } from './entender.js';
import { respuestaAusencias } from './ausenciasChat.js';
import { ausenciasDeMes } from '../ausencias.js';
import { findesDePersona, listaNinos, listaPersonal, descargarHorario, conteoFindesChat } from './datosChat.js';
import { equipos, acuerdosDoc, casasDoc, menuDoc, ninosDoc, reporteAus } from './oficinaChat.js';

const ir = (tab, t, extra = {}) => ({ t, ir: tab, ...extra });
const mayus = (s) => s[0].toUpperCase() + s.slice(1);

function textos(lang) {
  const E = lang === 'en';
  const y = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${E ? 'and' : 'y'} ${xs[xs.length - 1]}`);
  const corta = (f) => `${(E ? DIAS_EN : DIAS_BONITO)[f.getDay()].slice(0, 3)} ${f.getDate()}`;
  const mes = (clave) => (E ? `${MESES_EN[+clave.slice(5) - 1]} ${clave.slice(0, 4)}` : `${MESES_P[+clave.slice(5) - 1]} ${clave.slice(0, 4)}`);
  const mesSolo = (clave) => (E ? MESES_EN : MESES_P)[+clave.slice(5) - 1];
  const fecha = (f, hoy) => fechaBonita(f, hoy, lang);
  const cumpleCorto = (iso) => {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    return E ? `${MESES_EN[+m[2] - 1]} ${+m[3]}` : `${+m[3]} de ${MESES_P[+m[2] - 1]}`;
  };
  const del = (a, b) => (E ? `${a} to ${b}` : `${a} al ${b}`);
  return {
    E,
    y,
    corta,
    mes,
    mesSolo,
    fecha,
    del,
    cumpleCorto,
    verHorario: E ? 'See it in Horario' : 'Ver en el Horario',
    irHorario: E ? 'Go to Horario' : 'Ir al Horario',
    abrirNinos: E ? 'Open Niños' : 'Abrir Niños',
    sinHorario: (ms) => (E ? `There is no saved schedule for ${y(ms)} yet.` : `Todavía no hay horario guardado para ${y(ms)}.`),
    faltaHorarioDe: (ms) => (E ? `(No saved schedule for ${y(ms)}.)` : `(No hay horario guardado de ${y(ms)}.)`),
    nadiePuesto: E ? 'nobody assigned' : 'nadie puesto',
    nadieEseDia: E ? 'Nobody is assigned to the houses that day.' : 'Ese día no hay nadie puesto en las casas.',
    nadieEsosDias: E ? 'Nobody is assigned those days.' : 'No hay nadie puesto esos días.',
    onCall: 'On call',
    quienDescansaSug: E ? 'Who has the day off that day?' : '¿Quién descansa ese día?',
    tituloRango: (t, a, b) => `**${t}** (${del(corta(a), corta(b))})`,
    nadieOncall: E ? 'Nobody is on call those days.' : 'Esos días no hay nadie puesto de on call.',
    deOncall: (cuando, quien) => (E ? `On call ${cuando}: **${quien}**` : `De on call ${cuando}: **${quien}**`),
    elDia: (f, hoy) => (E ? `on ${fecha(f, hoy)}` : `el ${fecha(f, hoy)}`),
    delAl: (a, b) => (E ? `from ${corta(a)} to ${corta(b)}` : `del ${corta(a)} al ${corta(b)}`),
    noTrabajan: (xs) => (xs.length ? (E ? `Not working: ${y(xs)}.` : `No trabajan: ${y(xs)}.`) : E ? 'Everyone works that day.' : 'Ese día trabajan todos.'),
    deVacaciones: (xs) => (E ? `On vacation or absent: ${y(xs)}.` : `De vacaciones o ausentes: ${y(xs)}.`),
    feriado: E ? 'That day is marked as a holiday.' : 'Ese día está marcado como feriado.',
    aQuien: (xs) => (E ? `Who do you mean: ${y(xs)}?` : `¿A quién te refieres: ${y(xs)}?`),
    diasDe: (n) => (E ? `What days does ${n} work?` : `¿Qué días trabaja ${n}?`),
    diasDeMes: (n) => (E ? `What days does ${n} work this month?` : `¿Qué días trabaja ${n} este mes?`),
    siTrabaja: (n, cuando, k) => (E ? `Yes, **${n}** works ${cuando} in **${k}**.` : `Sí, **${n}** trabaja ${cuando} en **${k}**.`),
    noTrabajaVac: (n) => (E ? `No, ${n} is on vacation or absent that day.` : `No, ${n} está de vacaciones o ausente ese día.`),
    noTrabaja: (n, cuando) => (E ? `No, **${n}** doesn't work ${cuando}.` : `No, **${n}** no trabaja ${cuando}.`),
    cuandoDia: (f, hoy) => {
      const t = fecha(f, hoy);
      return /^(hoy|mañana|today|tomorrow)/.test(t) ? t : E ? `on ${t}` : `el ${t}`;
    },
    tituloMes: (c) => (E ? `in ${mes(c)}` : `en ${mes(c)}`),
    esosDias: E ? 'those days' : 'esos días',
    sinDias: (n, t) => (E ? `${n} has no days assigned ${t}.` : `${n} no tiene días puestos ${t}.`),
    vacDel: (a, b) => (E ? `On vacation or absent from ${corta(a)} to ${corta(b)}.` : `De vacaciones o ausente: del ${corta(a)} al ${corta(b)}.`),
    resumenDias: (n, t, dias, findes, oc) =>
      E
        ? `**${n}** ${t}: ${dias} ${dias === 1 ? 'day' : 'days'} in houses${findes ? `, ${findes} ${findes === 1 ? 'weekend' : 'weekends'}` : ''}${oc ? ` and ${oc} on call` : ''}.`
        : `**${n}** ${t}: ${dias} ${dias === 1 ? 'día' : 'días'} en casas${findes ? `, ${findes} ${findes === 1 ? 'fin de semana' : 'fines de semana'}` : ''}${oc ? ` y ${oc} de on call` : ''}.`,
    findeDel: (a, b) => (E ? `**Weekend ${del(corta(a), corta(b))}**` : `**Fin de semana del ${corta(a)} al ${corta(b)}**`),
    necesitan: (xs) => (E ? `Need a house change sheet: **${y(xs)}** (their house parents aren't there).` : `Necesitan hoja de cambio de casa: **${y(xs)}** (no están sus padres de casa).`),
    noHaceFalta: E ? 'No house change needed: all house parents are in their houses.' : 'No hace falta cambio de casa: todos los padres de casa están en su casa.',
    conPadres: (xs) => (E ? `With their parents: ${y(xs)}.` : `Con sus padres: ${y(xs)}.`),
    hacerHojas: E ? 'Make the sheets' : 'Hacer las hojas',
    muchos: (n) => (E ? `There are ${n} kids with that name. Please add the last name.` : `Hay ${n} niños con ese nombre. Escribe también el apellido.`),
    sinFecha: (n) => (E ? `I don't have ${n}'s birthday. You can add it in Niños.` : `No tengo la fecha de cumpleaños de ${n}. Puedes ponerla en Niños.`),
    fechaMala: (n) => (E ? `${n}'s birthday is written wrong in Niños.` : `La fecha de cumpleaños de ${n} está mal escrita en Niños.`),
    cumple: (n, anios, cuando, ahora) => (E ? `**${n}** turns ${anios} ${cuando}.${ahora != null ? ` Now ${ahora} years old.` : ''}` : `**${n}** cumple ${anios} años ${cuando}.${ahora != null ? ` Ahora tiene ${ahora}.` : ''}`),
    cuandoCumple: (pc) => (pc.dias === 0 ? (E ? 'today! 🎂' : '¡hoy! 🎂') : pc.dias === 1 ? (E ? 'tomorrow' : 'mañana') : E ? `on ${fecha(pc.fecha)} (in ${pc.dias} days)` : `el ${fecha(pc.fecha)} (faltan ${pc.dias} días)`),
    edad: (n, e, c) => (E ? `**${n}** is ${e} years old (birthday: ${c}).` : `**${n}** tiene ${e} años (cumple el ${c}).`),
    ropa: E ? 'Clothes' : 'Ropa',
    zapatos: E ? 'Shoes' : 'Zapatos',
    noPuesta: E ? 'not entered' : 'no está puesta',
    actualizadas: (t) => (E ? `Sizes updated ${t}.` : `Tallas actualizadas ${t}.`),
    hace: (m) => (m <= 0 ? (E ? 'this month' : 'este mes') : m === 1 ? (E ? '1 month ago' : 'hace 1 mes') : E ? `${m} months ago` : `hace ${m} meses`),
    estaEn: (n, c) => (c ? (E ? `**${n}** is in **${c}**.` : `**${n}** está en **${c}**.`) : E ? `${n} has no house set in Niños.` : `${n} no tiene casa puesta en Niños.`),
    casa: E ? 'House' : 'Casa',
    sinCasa: E ? 'no house' : 'sin casa',
    edadLinea: (e, c) => (E ? `Age: ${e} (birthday: ${c})` : `Edad: ${e} años (cumple el ${c})`),
    sinCumple: E ? 'Birthday: not entered' : 'Cumpleaños: no está puesto',
    sugTalla: (n) => (E ? `What's ${n}'s shoe size?` : `¿Qué talla de zapatos tiene ${n}?`),
    sugCumple: (n) => (E ? `When is ${n}'s birthday?` : `¿Cuándo cumple ${n}?`),
    nadieCumple: (t) => (E ? `No birthdays ${t}.` : `Nadie cumple años ${t}.`),
    cumplesTitulo: (t, n) => (E ? `**Birthdays ${t}** (${n})` : `**Cumpleaños ${t}** (${n})`),
    cumpleLinea: (f, n, a, c) => (E ? `${corta(f)} · ${n} turns ${a}${c ? ` · ${c}` : ''}` : `${corta(f)} · ${n} cumple ${a}${c ? ` · ${c}` : ''}`),
    enMes: (c) => (E ? `in ${mes(c)}` : `en ${mes(c)}`),
    casaNinos: (c, n) => (E ? `**${c}**: ${n} ${n === 1 ? 'kid' : 'kids'}` : `**${c}**: ${n} ${n === 1 ? 'niño' : 'niños'}`),
    totalNinos: (n) => (E ? `There are **${n} kids** in total.` : `Hay **${n} niños** en total.`),
    sinCasaN: (n) => (E ? `No house: ${n}` : `Sin casa: ${n}`),
    noHecho: (c) => (E ? `The **${mes(c)}** schedule isn't done yet.` : `Todavía no está hecho el horario de **${mes(c)}**.`),
    hacerEl: (c) => (E ? `Make ${mesSolo(c)}'s` : `Hacer el de ${mesSolo(c)}`),
    hecho: (c, r) => (E ? `✓ The **${mes(c)}** schedule is saved${r ? `, with ${r} ${r === 1 ? 'thing' : 'things'} to check (marked in green)` : ''}.` : `✓ El horario de **${mes(c)}** ya está guardado${r ? `, con ${r} ${r === 1 ? 'cosa' : 'cosas'} para revisar (marcadas en verde)` : ''}.`),
    abrirlo: E ? 'Open it' : 'Abrirlo',
    llevame: (t) => (E ? `Take me to ${t}` : `Llévame a ${t}`),
    hola: E ? "Hi! 👋 I'm Sam Jr., your Office helper. Ask me who's working, birthdays, sizes, or how to do something in the app." : '¡Hola! 👋 Soy Sam Jr., tu ayudante de la Oficina. Puedes preguntarme quién trabaja, cumpleaños, tallas o cómo hacer algo en la app.',
    gracias: E ? "You're welcome! 😊 I'm here if you need anything else." : '¡Con gusto! 😊 Aquí estoy si necesitas algo más.',
    noEntendi: E ? "I didn't quite get that 🙈. Try asking another way, or tap one of these:" : 'No entendí bien 🙈. Prueba escribirlo de otra forma, o toca una de estas:',
    ejemplos: E ? EJEMPLOS_EN : EJEMPLOS,
    dias: E ? DIAS_EN : DIAS_BONITO
  };
}

export const NECESITA_DATOS = new Set(['quien_trabaja', 'oncall', 'descansan', 'dias_persona', 'cambio_casa', 'cumple_nino', 'edad_nino', 'cumples', 'talla_nino', 'casa_nino', 'nino_info', 'ninos_casa', 'estado_horario', 'aus_persona', 'aus_ahora', 'aus_resumen', 'lista_ninos', 'lista_personal', 'horario_descarga', 'equipos', 'acuerdos_doc', 'pagos_doc', 'casas_doc', 'menu_doc', 'regalos_doc', 'directorio_doc', 'cumple_doc', 'reporte_aus', 'conteo_findes']);

async function horariosDe(fechas, datos) {
  const meses = Array.from(new Set(fechas.map(claveDe)));
  const out = {};
  for (const m of meses) {
    const r = await datos.horario(m);
    const h = r && normalizarHorario(r.horario);
    if (h) h.vac = [...ausenciasDeMes(datos.personal || [], m), ...h.vac.filter((v) => !v.t)];
    out[m] = h && Object.keys(h.dias).length ? { horario: h, config: normalizarConfig(r.config) } : null;
  }
  return out;
}

function nombrador(datos, config) {
  const cfg = new Map((config ? config.personal : []).map((p) => [p.id, p.n]));
  const per = new Map((datos.personal || []).map((p) => [p.id, p.nombre]));
  return (id) => (esOtro(id) ? nombreOtro(id) : cfg.get(id) || per.get(id) || id);
}

const sinHorario = (T, meses) => ({ partes: [{ p: T.sinHorario(meses.map(T.mes)) }], botones: [ir('horario', T.irHorario, { mes: meses[0] })] });

const textoRango = (f, T) => {
  if (!f || !f.texto) return '';
  const mapa = { 'este fin de semana': ['este fin de semana', 'this weekend'], 'el próximo fin de semana': ['el próximo fin de semana', 'next weekend'], 'el fin de semana pasado': ['el fin de semana pasado', 'last weekend'], 'esta semana': ['esta semana', 'this week'], 'la próxima semana': ['la próxima semana', 'next week'], 'la semana pasada': ['la semana pasada', 'last week'], 'este mes': ['este mes', 'this month'] };
  const x = mapa[f.texto];
  return x ? x[T.E ? 1 : 0] : f.texto;
};

async function quienTrabaja(e, datos, T) {
  const hoy = datos.hoy;
  const f = e.fechas || { tipo: 'dia', fechas: [new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())] };
  const dias = f.tipo === 'mes' ? diasDelMes(f.mes).filter((d) => d >= mas(hoy, -1)).slice(0, 7) : f.fechas;
  const hs = await horariosDe(dias, datos);
  const faltan = Object.keys(hs).filter((m) => !hs[m]);
  if (faltan.length === Object.keys(hs).length) return sinHorario(T, faltan);
  const casas = e.casa ? [e.casa] : CASAS;
  const nombreDe = (d) => nombrador(datos, hs[claveDe(d)]?.config);
  const ids = (d, k) => (hs[claveDe(d)] ? en(hs[claveDe(d)].horario, d.getDate(), k) : []);
  const partes = [];
  if (dias.length === 1) {
    const d = dias[0];
    const filas = casas.map((k) => ({ k, n: ids(d, k).map(nombreDe(d)) })).filter((x) => x.n.length || e.casa);
    const oc = ids(d, ON_CALL).map(nombreDe(d));
    partes.push({ p: `**${mayus(T.fecha(d, hoy))}**` });
    if (!filas.length) partes.push({ p: T.nadieEseDia });
    else partes.push({ casas: filas.map((x) => ({ casa: x.k, texto: x.n.length ? T.y(x.n) : T.nadiePuesto })) });
    if (oc.length && !e.casa) partes.push({ p: `${T.onCall}: ${T.y(oc)}` });
  } else {
    const t = textoRango(f, T);
    partes.push({ p: t ? T.tituloRango(mayus(t), dias[0], dias[dias.length - 1]) : `**${T.del(T.corta(dias[0]), T.corta(dias[dias.length - 1]))}**` });
    const filas = [];
    for (const k of casas) {
      const quien = new Map();
      for (const d of dias) for (const id of ids(d, k)) quien.set(id, [...(quien.get(id) || []), d]);
      if (!quien.size) {
        if (e.casa) filas.push({ casa: k, texto: T.nadiePuesto });
        continue;
      }
      const nom = nombreDe(dias[0]);
      const txt = [...quien].map(([id, ds]) => (ds.length === dias.length ? nom(id) : `${nom(id)} (${ds.map((d) => T.dias[d.getDay()].slice(0, 3).toLowerCase()).join(', ')})`));
      filas.push({ casa: k, texto: T.y(txt) });
    }
    partes.push(filas.length ? { casas: filas } : { p: T.nadieEsosDias });
    if (!e.casa) {
      const oc = Array.from(new Set(dias.flatMap((d) => ids(d, ON_CALL).map(nombreDe(d)))));
      if (oc.length) partes.push({ p: `${T.onCall}: ${T.y(oc)}` });
    }
  }
  if (faltan.length) partes.push({ p: T.faltaHorarioDe(faltan.map(T.mes)) });
  return { partes, botones: [ir('horario', T.verHorario, { mes: claveDe(dias[0]) })], sugerencias: dias.length === 1 ? [T.quienDescansaSug] : [] };
}

async function onCall(e, datos, T) {
  const hoy = datos.hoy;
  let dias;
  if (e.fechas && e.fechas.tipo === 'dia') dias = e.fechas.fechas;
  else if (e.fechas && e.fechas.tipo === 'semana') dias = e.fechas.fechas.slice(0, 4);
  else if (e.fechas && e.fechas.tipo === 'finde') dias = [1, 2, 3, 4].map((n) => mas(e.fechas.fechas[2], n));
  else if (e.fechas && e.fechas.tipo === 'mes') dias = diasDelMes(e.fechas.mes);
  else {
    const wd = hoy.getDay();
    const h0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const esta = wd === 5 || wd === 6 || wd === 0 ? [] : semana(hoy).slice(0, 4).filter((d) => d >= h0);
    const hsEsta = esta.length ? await horariosDe(esta, datos) : {};
    const hay = esta.some((d) => hsEsta[claveDe(d)] && en(hsEsta[claveDe(d)].horario, d.getDate(), ON_CALL).length);
    dias = hay ? esta : semana(hoy, 1).slice(0, 4);
  }
  const hs = await horariosDe(dias, datos);
  if (Object.values(hs).every((x) => !x)) return sinHorario(T, Object.keys(hs));
  const grupos = [];
  for (const d of dias) {
    const h = hs[claveDe(d)];
    if (!h) continue;
    const ids = en(h.horario, d.getDate(), ON_CALL);
    if (!ids.length) continue;
    const t = T.y(ids.map(nombrador(datos, h.config)));
    const g = grupos[grupos.length - 1];
    if (g && g.t === t && Math.round((d - g.hasta) / 86400000) <= 4) g.hasta = d;
    else grupos.push({ t, desde: d, hasta: d });
  }
  const boton = [ir('horario', T.verHorario, { mes: claveDe(dias[0]) })];
  if (!grupos.length) return { partes: [{ p: T.nadieOncall }], botones: boton };
  if (grupos.length === 1) {
    const g = grupos[0];
    return { partes: [{ p: T.deOncall(g.desde === g.hasta ? T.elDia(g.desde, hoy) : T.delAl(g.desde, g.hasta), g.t) }], botones: boton };
  }
  return { partes: [{ p: '**On call**' }, { ul: grupos.map((g) => `${g.desde === g.hasta ? T.corta(g.desde) : T.del(T.corta(g.desde), T.corta(g.hasta))}: ${g.t}`) }], botones: boton };
}

async function descansan(e, datos, T) {
  const hoy = datos.hoy;
  const d = e.fechas && e.fechas.fechas ? e.fechas.fechas[0] : new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const hs = await horariosDe([d], datos);
  const h = hs[claveDe(d)];
  if (!h) return sinHorario(T, [claveDe(d)]);
  const clave = claveDe(d);
  const puestos = new Set(Object.values(h.horario.dias[d.getDate()] || {}).flat());
  const vac = (id) => h.horario.vac.some((v) => v.id === id && d.getDate() >= v.de && d.getDate() <= v.a);
  const todos = activos(h.config, clave);
  const libres = todos.filter((p) => !puestos.has(p.id) && !vac(p.id));
  const deVac = todos.filter((p) => vac(p.id));
  const partes = [{ p: `**${mayus(T.fecha(d, hoy))}**` }, { p: T.noTrabajan(libres.map((p) => p.n)) }];
  if (deVac.length) partes.push({ p: T.deVacaciones(deVac.map((p) => p.n)) });
  if (h.horario.fer.includes(d.getDate())) partes.push({ p: T.feriado });
  return { partes, botones: [ir('horario', T.verHorario, { mes: clave })] };
}

function rangos(lista, T) {
  const out = [];
  for (const x of lista) {
    const g = out[out.length - 1];
    if (g && g.k === x.k && Math.round((x.d - g.hasta) / 86400000) === 1) g.hasta = x.d;
    else out.push({ k: x.k, desde: x.d, hasta: x.d });
  }
  return out.map((g) => `${g.desde === g.hasta ? T.corta(g.desde) : T.del(T.corta(g.desde), T.corta(g.hasta))} · ${g.k === ON_CALL ? 'On call' : g.k}`);
}

async function diasPersona(e, datos, T) {
  const hoy = datos.hoy;
  if (e.trabajadores.length > 1) return { partes: [{ p: T.aQuien(e.trabajadores.map((p) => p.n)) }], sugerencias: e.trabajadores.map((p) => T.diasDe(p.n)) };
  const p = e.trabajadores[0];
  const f = e.fechas || { tipo: 'mes', mes: datos.mesActivo || claveDe(hoy), texto: 'este mes' };
  const dias = f.tipo === 'mes' ? diasDelMes(f.mes) : f.fechas;
  const hs = await horariosDe(dias, datos);
  if (Object.values(hs).every((x) => !x)) return sinHorario(T, Object.keys(hs));
  const lista = [];
  const vacs = [];
  for (const d of dias) {
    const h = hs[claveDe(d)];
    if (!h) continue;
    for (const k of [...CASAS, ON_CALL]) if (en(h.horario, d.getDate(), k).includes(p.id)) lista.push({ d, k });
    if (h.horario.vac.some((v) => v.id === p.id && d.getDate() >= v.de && d.getDate() <= v.a)) vacs.push(d);
  }
  const boton = [ir('horario', T.verHorario, { mes: claveDe(dias[0]) })];
  if (dias.length === 1) {
    const x = lista[0];
    const cuando = T.cuandoDia(dias[0], hoy);
    return { partes: [{ p: x ? T.siTrabaja(p.n, cuando, x.k === ON_CALL ? 'On call' : x.k) : vacs.length ? T.noTrabajaVac(p.n) : T.noTrabaja(p.n, cuando) }], botones: boton, sugerencias: [T.diasDeMes(p.n)] };
  }
  const titulo = f.tipo === 'mes' ? T.tituloMes(f.mes) : textoRango(f, T) || T.esosDias;
  if (e.soloFindes) return findesDePersona(p, lista, titulo, T, claveDe(dias[0]));
  if (!lista.length) return { partes: [{ p: T.sinDias(p.n, titulo) }, ...(vacs.length ? [{ p: T.vacDel(vacs[0], vacs[vacs.length - 1]) }] : [])], botones: boton };
  const casasD = lista.filter((x) => x.k !== ON_CALL);
  const findes = new Set(casasD.filter((x) => [5, 6, 0].includes(x.d.getDay())).map((x) => claveDe(x.d) + ':' + finDeSemana(x.d)[0].getDate()));
  const partes = [{ p: T.resumenDias(p.n, titulo, casasD.length, findes.size, lista.length - casasD.length) }, { ul: rangos(lista, T) }];
  if (vacs.length) partes.push({ p: T.vacDel(vacs[0], vacs[vacs.length - 1]) });
  return { partes, botones: boton };
}

function cumpleTexto(n, hoy, T) {
  if (!n.nacimiento) return T.sinFecha(n.nombre);
  const pc = proximoCumple(n.nacimiento, hoy);
  const ed = edad(n.nacimiento, hoy);
  if (!pc) return T.fechaMala(n.nombre);
  return T.cumple(n.nombre, pc.cumple, T.cuandoCumple(pc), pc.dias !== 0 ? ed : null);
}

function tallasTexto(n, prenda, T) {
  const out = [];
  const lang = T.E ? 'en' : 'es';
  if (prenda !== 'zapatos') out.push(`${T.ropa}: ${tallaDe(n, 'ropa', 'ambas', lang) || T.noPuesta}`);
  if (prenda !== 'ropa') out.push(`${T.zapatos}: ${tallaDe(n, 'zapatos', 'ambas', lang) || T.noPuesta}`);
  return out;
}

function mesesDesde(fecha, hoy) {
  const f = new Date(fecha);
  if (isNaN(f)) return null;
  return (hoy.getFullYear() - f.getFullYear()) * 12 + hoy.getMonth() - f.getMonth();
}

async function sobreNinos(e, datos, T) {
  await datos.cargarNinos();
  if (e.ninos.length > 4) return { partes: [{ p: T.muchos(e.ninos.length) }] };
  const lista = e.ninos.map((n) => datos.ninosPorId.get(n.id) || n);
  const hoy = datos.hoy;
  const partes = [];
  for (const n of lista) {
    if (e.tipo === 'cumple_nino') partes.push({ p: cumpleTexto(n, hoy, T) });
    else if (e.tipo === 'edad_nino') {
      const ed = edad(n.nacimiento, hoy);
      partes.push({ p: ed == null ? T.sinFecha(n.nombre) : T.edad(n.nombre, ed, T.cumpleCorto(n.nacimiento)) });
    } else if (e.tipo === 'talla_nino') {
      partes.push({ p: `**${n.nombre}**${n.casa ? ` · ${n.casa}` : ''}` });
      partes.push({ ul: tallasTexto(n, e.prenda, T) });
      const m = n.tallasFecha ? mesesDesde(n.tallasFecha, hoy) : null;
      if (m != null) partes.push({ p: T.actualizadas(T.hace(m)) });
    } else if (e.tipo === 'casa_nino') partes.push({ p: T.estaEn(n.nombre, n.casa) });
    else {
      const ed = edad(n.nacimiento, hoy);
      partes.push({ p: `**${n.nombre}**` });
      partes.push({ ul: [`${T.casa}: ${n.casa || T.sinCasa}`, ed != null ? T.edadLinea(ed, T.cumpleCorto(n.nacimiento)) : T.sinCumple, ...tallasTexto(n, 'ambas', T)] });
    }
  }
  const uno = lista.length === 1 ? lista[0].nombre.split(' ')[0] : '';
  const sug = uno ? [e.tipo !== 'talla_nino' && T.sugTalla(uno), e.tipo !== 'cumple_nino' && T.sugCumple(uno)].filter(Boolean) : [];
  return { partes, botones: [ir('ninos', T.abrirNinos)], sugerencias: sug };
}

async function cumples(e, datos, T) {
  await datos.cargarNinos();
  const hoy = datos.hoy;
  let desde;
  let hasta;
  let titulo;
  const f = e.fechas;
  if (!f || f.tipo === 'mes') {
    const clave = f ? f.mes : claveDe(hoy);
    const ds = diasDelMes(clave);
    desde = ds[0];
    hasta = ds[ds.length - 1];
    titulo = T.enMes(clave);
  } else {
    desde = f.fechas[0];
    hasta = f.fechas[f.fechas.length - 1];
    titulo = textoRango(f, T) || (f.fechas.length === 1 ? T.elDia(desde, hoy) : T.delAl(desde, hasta));
  }
  const lista = [];
  for (const n of datos.ninosLista) {
    const m = String(n.nacimiento || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) continue;
    for (const anio of new Set([desde.getFullYear(), hasta.getFullYear()])) {
      const c = new Date(anio, +m[2] - 1, +m[3]);
      if (c >= desde && c <= hasta) lista.push({ n, c, anios: anio - +m[1] });
    }
  }
  lista.sort((a, b) => a.c - b.c);
  if (!lista.length) return { partes: [{ p: T.nadieCumple(titulo) }], botones: [ir('ninos', T.abrirNinos)] };
  const mesPdf = !f || f.tipo === 'mes' ? (f ? f.mes : claveDe(hoy)) : null;
  const botones = mesPdf ? [{ t: T.E ? 'Download PDF with photos' : 'Descargar PDF con fotos', descarga: { tipo: 'cumple', mes: mesPdf, casa: e.casa || '', idioma: T.E ? 'en' : 'es' } }, ir('ninos', T.abrirNinos)] : [ir('ninos', T.abrirNinos)];
  return { partes: [{ p: T.cumplesTitulo(titulo, lista.length) }, { ul: lista.map((x) => T.cumpleLinea(x.c, x.n.nombre, x.anios, x.n.casa)) }], botones };
}

async function ninosCasa(e, datos, T) {
  await datos.cargarNinos();
  const l = datos.ninosLista;
  if (e.casa) {
    const de = l.filter((n) => n.casa === e.casa).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return { partes: [{ p: T.casaNinos(e.casa, de.length) }, ...(de.length ? [{ ul: de.map((n) => n.nombre) }] : [])], botones: [ir('ninos', T.abrirNinos)] };
  }
  const por = CASAS.map((c) => ({ c, n: l.filter((x) => x.casa === c).length })).filter((x) => x.n);
  const sin = l.filter((x) => !CASAS.includes(x.casa)).length;
  return { partes: [{ p: T.totalNinos(l.length) }, { ul: [...por.map((x) => `${x.c}: ${x.n}`), ...(sin ? [T.sinCasaN(sin)] : [])] }], botones: [ir('ninos', T.abrirNinos)] };
}

async function estadoHorario(e, datos, T) {
  const hoy = datos.hoy;
  const mes = e.fechas && e.fechas.mes ? e.fechas.mes : e.fechas && e.fechas.fechas ? claveDe(e.fechas.fechas[0]) : datos.mesActivo || claveDe(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1));
  const r = await datos.horario(mes);
  const h = r && normalizarHorario(r.horario);
  if (!h || !Object.keys(h.dias).length) return { partes: [{ p: T.noHecho(mes) }], botones: [ir('horario', T.hacerEl(mes), { mes })] };
  let rev = 0;
  try {
    rev = problemas(contexto(mes, h, normalizarConfig(r.config))).length;
  } catch {
    rev = 0;
  }
  return { partes: [{ p: T.hecho(mes, rev) }], botones: [ir('horario', T.abrirlo, { mes })] };
}

const TAB = { horario: ['Horario', 'Horario (Schedule)'], acuerdos: ['Acuerdos', 'Acuerdos (Agreements)'], casas: ['Cambio de casa', 'Cambio de casa (House change)'], menu: ['Menú', 'Menú (Menu)'], ninos: ['Niños', 'Niños (Kids)'], inicio: ['Inicio', 'Inicio (Home)'], control: ['Control de personal', 'Control de personal (Staff control)'] };

export function respuestaGuia(a, otros = [], lang = 'es') {
  const T = textos(lang);
  const v = T.E && a.en ? a.en : a;
  const titulo = (x) => (T.E && x.en ? x.en.titulo : x.titulo);
  return {
    partes: [{ p: `**${v.titulo}**` }, { pasos: v.pasos }],
    botones: a.ir ? [ir(a.ir, T.llevame(TAB[a.ir][T.E ? 1 : 0]))] : [],
    sugerencias: [...otros, ...(a.tambien || []).map((id) => GUIA.find((x) => x.id === id))].filter(Boolean).filter((x, i, l) => l.indexOf(x) === i && x !== a).slice(0, 3).map(titulo)
  };
}

export async function responder(e, datos) {
  const lang = datos.idioma === 'en' ? 'en' : 'es';
  const T = textos(lang);
  switch (e.tipo) {
    case 'saludo':
      return { partes: [{ p: T.hola }], sugerencias: T.ejemplos.slice(0, 4) };
    case 'gracias':
      return { partes: [{ p: T.gracias }] };
    case 'vacio':
      return null;
    case 'guia':
      return respuestaGuia(e.articulo, e.otros, lang);
    case 'quien_trabaja':
      return quienTrabaja(e, datos, T);
    case 'oncall':
      return onCall(e, datos, T);
    case 'descansan':
      return descansan(e, datos, T);
    case 'dias_persona':
      return diasPersona(e, datos, T);
    case 'cambio_casa':
      return casasDoc(e, datos, T);
    case 'cumples':
      return cumples(e, datos, T);
    case 'ninos_casa':
      return ninosCasa(e, datos, T);
    case 'estado_horario':
      return estadoHorario(e, datos, T);
    case 'equipos':
      return equipos(e, datos, T);
    case 'acuerdos_doc':
      return acuerdosDoc(e, datos, T);
    case 'pagos_doc':
      return acuerdosDoc(e, datos, T, true);
    case 'casas_doc':
      return casasDoc(e, datos, T);
    case 'menu_doc':
      return menuDoc(e, datos, T);
    case 'regalos_doc':
    case 'directorio_doc':
    case 'cumple_doc':
      return ninosDoc(e, datos, T);
    case 'reporte_aus':
      return reporteAus(e, datos, T);
    case 'lista_ninos':
      return listaNinos(e, datos, T);
    case 'lista_personal':
      return listaPersonal(e, datos, T);
    case 'horario_descarga':
      return descargarHorario(e, datos, T);
    case 'conteo_findes':
      return conteoFindesChat(e, datos, T);
    case 'aus_persona':
    case 'aus_ahora':
    case 'aus_resumen':
      return respuestaAusencias(e, datos, T);
    case 'cumple_nino':
    case 'edad_nino':
    case 'talla_nino':
    case 'casa_nino':
    case 'nino_info':
      return sobreNinos(e, datos, T);
    default:
      return { partes: [{ p: T.noEntendi }], sugerencias: e.parecidos && e.parecidos.length ? e.parecidos.map((a) => (T.E && a.en ? a.en.titulo : a.titulo)) : T.ejemplos.slice(0, 4) };
  }
}
