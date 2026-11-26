import { CASAS, fijoEn } from '../personal.js';
import { armarEquipos, separar, filtrar, cortesDe, resumenGrupo, textoGrupos, sexoDe } from '../equipos.js';
import { edadDe } from '../documentos.js';
import { aAnalisis, normalizarConfig, normalizarHorario } from '../horarioApp.js';
import { acuerdosElegidos, listo, auxConMuchosFindes, TOPE_FINDES_AUX } from '../seleccion.js';
import { hojasDelFinde } from '../casas.js';
import { reporte } from '../ausencias.js';
import { MESES_P, MESES_EN, DIAS_EN, DIAS_BONITO, claveDe, finDeSemana } from './fechas.js';
import { mesPorDefecto } from './datosChat.js';

const nombreMes = (clave, E) => `${(E ? MESES_EN : MESES_P)[+clave.slice(5) - 1]} ${clave.slice(0, 4)}`;
const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const corta = (f, E) => `${(E ? DIAS_EN : DIAS_BONITO)[f.getDay()].slice(0, 3)} ${f.getDate()}`;
const ir = (tab, t, extra = {}) => ({ t, ir: tab, ...extra });
const baja = (t, descarga) => ({ t, descarga });
const NOMBRE_EQUIPO_EN = { Rojo: 'Red', Azul: 'Blue', Verde: 'Green', Amarillo: 'Yellow', Morado: 'Purple', Naranja: 'Orange', Rosado: 'Pink', Celeste: 'Light blue', Café: 'Brown', Gris: 'Gray' };

function nombreGrupo(g, E) {
  if (!E) return g.nombre;
  const m = g.nombre.match(/^Equipo (.+)$/);
  if (m) return `${NOMBRE_EQUIPO_EN[m[1]] || m[1]} team`;
  return g.nombre.replace('Niñas', 'Girls').replace('Niños', 'Boys').replace(/\baños\b/g, 'yrs').replace('Sin edad', 'No age').replace('Sin marcar niño/niña', 'Girl/boy not set');
}

export async function equipos(e, datos, T) {
  const E = T.E;
  const hoy = datos.hoy;
  const todos = await datos.cargarNinos();
  const base = e.casa ? todos.filter((n) => n.casa === e.casa) : todos;
  const juegan = filtrar(base, { sexo: e.sexo || '', desde: e.desde ?? '', hasta: e.hasta ?? '' }, hoy);
  const sinEdad = e.desde != null || e.hasta != null ? base.filter((n) => edadDe(n, hoy) == null).length : 0;
  const sinSexo = e.sexo ? base.filter((n) => !sexoDe(n)).length : 0;
  const quienes = [e.sexo === 'F' ? (E ? 'girls' : 'niñas') : e.sexo === 'M' ? (E ? 'boys' : 'niños') : '', e.casa ? (E ? `from ${e.casa}` : `de ${e.casa}`) : '', e.desde != null && e.hasta != null ? (E ? `${e.desde} to ${e.hasta} years old` : `de ${e.desde} a ${e.hasta} años`) : e.desde != null ? (E ? `${e.desde}+ years old` : `de ${e.desde} años o más`) : e.hasta != null ? (E ? `up to ${e.hasta} years old` : `hasta ${e.hasta} años`) : '']
    .filter(Boolean)
    .join(', ');
  if (juegan.length < 2) {
    const partes = [{ p: E ? `I only found ${juegan.length} ${juegan.length === 1 ? 'child' : 'children'}${quienes ? ` (${quienes})` : ''}, not enough to make ${e.modo === 'grupos' ? 'groups' : 'teams'}.` : `Solo encontré ${juegan.length} ${juegan.length === 1 ? 'niño' : 'niños'}${quienes ? ` (${quienes})` : ''}, no alcanza para armar ${e.modo === 'grupos' ? 'grupos' : 'equipos'}.` }];
    if (sinEdad) partes.push({ p: E ? `${sinEdad} have no birth date, so they can't be filtered by age.` : `${sinEdad} no tienen fecha de nacimiento, así que no entran al filtrar por edad.` });
    return { partes, botones: [ir('ninos', E ? 'Open Niños' : 'Abrir Niños')] };
  }
  let semilla = e.semilla || (Date.now() % 99991) + 1;
  const firma = (gs) => gs.map((g) => g.ninos.map((n) => n.id).sort().join(',')).sort().join('|');
  const armar = (sem) => armarEquipos(juegan, { n: e.n || 2, mezclarSexo: !e.sexo, separarHermanos: true, semilla: sem }, hoy);
  let grupos;
  if (e.modo === 'grupos') grupos = separar(juegan, { porSexo: !!e.porSexo, porEdad: !!e.porEdad, porCasa: !!e.porCasa, cortes: cortesDe('6, 11'), casas: CASAS }, hoy);
  else {
    grupos = armar(semilla);
    for (let i = 0; e.antes && firma(grupos) === e.antes && i < 25; i++) {
      semilla = (semilla * 7919 + 13) % 99991 || 7;
      grupos = armar(semilla);
    }
  }
  const titulo = e.modo === 'grupos' ? 'Grupos' : 'Equipos';
  const detalle = [e.casa || '', e.sexo === 'F' ? 'solo niñas' : e.sexo === 'M' ? 'solo niños' : '', e.desde != null || e.hasta != null ? `de ${e.desde ?? 0} a ${e.hasta ?? '…'} años` : ''].filter(Boolean).join(', ');
  const partes = [{ p: E ? `**${grupos.length} ${e.modo === 'grupos' ? 'groups' : 'teams'}** with ${juegan.length} children${quienes ? ` (${quienes})` : ''}:` : `**${grupos.length} ${e.modo === 'grupos' ? 'grupos' : 'equipos'}** con ${juegan.length} niños${quienes ? ` (${quienes})` : ''}:` }];
  for (const g of grupos) {
    const r = resumenGrupo(g, hoy);
    const info = [E ? `${r.total}` : `${r.total}`, r.F || r.M ? (E ? `${r.F} girls, ${r.M} boys` : `${r.F} niñas, ${r.M} niños`) : '', r.promedio != null ? (E ? `avg age ${r.promedio}` : `edad prom. ${String(r.promedio).replace('.', ',')}`) : ''].filter(Boolean).join(' · ');
    partes.push({ p: `**${nombreGrupo(g, E)}** (${info})` });
    partes.push({ ul: g.ninos.map((n) => `${n.nombre}${edadDe(n, hoy) != null ? ` (${edadDe(n, hoy)})` : ''}${e.casa ? '' : n.casa ? ` · ${n.casa}` : ''}`) });
  }
  if (sinEdad) partes.push({ p: E ? `Note: ${sinEdad} children have no birth date, so they're not included.` : `Ojo: ${sinEdad} niños no tienen fecha de nacimiento, así que no entraron.` });
  if (sinSexo) partes.push({ p: E ? `Note: ${sinSexo} children don't have girl/boy set, so they're not included.` : `Ojo: ${sinSexo} niños no tienen marcado si son niña o niño, así que no entraron.` });
  const desc = { tipo: 'equipos', titulo, subtitulo: detalle, grupos: grupos.map((g) => ({ nombre: g.nombre, color: g.color, ninos: g.ninos.map((n) => n.id) })) };
  const botones = [baja(E ? 'Download PDF' : 'Descargar PDF', desc), { t: E ? 'Copy for WhatsApp' : 'Copiar para WhatsApp', copiar: textoGrupos(grupos, `${titulo}${detalle ? ` (${detalle})` : ''}`, hoy) }];
  if (e.modo !== 'grupos' && juegan.length > (e.n || 2)) botones.push({ t: E ? 'Mix again' : 'Otra mezcla', repetir: { ...e, semilla: (semilla * 7919) % 99991 || 3, antes: firma(grupos) } });
  return { partes, botones };
}

async function analisisDe(mes, datos) {
  const r = await datos.horario(mes);
  const h = r && normalizarHorario(r.horario);
  if (!h || !Object.keys(h.dias).length) return null;
  const an = aAnalisis(mes, h, normalizarConfig(r.config), datos.personal || []);
  an.abrir = (tab, t) => ({ t, preparar: tab, clave: mes, horario: h, config: r.config });
  return an;
}

const sinHorario = (mes, E) => ({ partes: [{ p: E ? `${mayus(nombreMes(mes, E))} doesn't have a schedule saved yet, so I can't make that.` : `${mayus(nombreMes(mes, E))} todavía no tiene horario guardado, así que no puedo armar eso.` }], botones: [ir('horario', E ? 'Make the schedule' : 'Hacer el horario', { mes })] });

function rangoFinde(f, E) {
  return `${corta(f.viernes, E)} – ${corta(f.domingo, E)}`;
}

export async function acuerdosDoc(e, datos, T, soloPagos = false) {
  const E = T.E;
  const mes = mesPorDefecto(e, datos);
  const an = await analisisDe(mes, datos);
  if (!an) return sinHorario(mes, E);
  const of = (datos.oficina && datos.oficina()) || {};
  const personal = datos.personal || [];
  const lista = acuerdosElegidos(an, personal, of.over || {});
  const monto = (of.word && of.word.info && of.word.info.monto) || 60;
  const porPersona = new Map();
  for (const a of lista) {
    if (!porPersona.has(a.persona.id)) porPersona.set(a.persona.id, { p: a.persona, findes: [] });
    porPersona.get(a.persona.id).findes.push(a.finde);
  }
  const faltan = new Set();
  for (const f of an.findes) for (const ids of Object.values(f.casas)) for (const id of ids) {
    const p = personal.find((x) => x.id === id);
    if (p && fijoEn(p, mes) && !listo(p)) faltan.add(p.completo || p.nombre);
  }
  const titulo = nombreMes(mes, E);
  if (!lista.length) {
    const partes = [{ p: E ? `For ${titulo} there are no work agreements to make.` : `Para ${titulo} no hay acuerdos que hacer.` }];
    if (faltan.size) partes.push({ p: E ? `Missing full name or ID number: ${Array.from(faltan).join(', ')}.` : `Les falta el nombre completo o la cédula: ${Array.from(faltan).join(', ')}.` });
    const botones = [an.abrir('acuerdos', E ? 'Open Acuerdos' : 'Abrir Acuerdos')];
    if (faltan.size && !soloPagos && !(of.word && of.word.estado === 'listo')) {
      partes.push({ p: E ? 'Upload **last month’s agreements Word** here 📎: it has their full names and ID numbers, and I’ll make the agreements right away.' : 'Súbeme aquí 📎 el **Word de acuerdos del mes pasado**: trae los nombres completos y las cédulas, y armo los acuerdos enseguida.' });
      botones.unshift({ t: E ? 'Upload last month’s Word' : 'Subir el Word del mes pasado', pedirArchivo: { tipo: 'word', luego: { tipo: 'acuerdos', mes } } });
    }
    return { partes, botones };
  }
  const total = lista.length * monto;
  const partes = [
    { p: E ? `**Work agreements · ${titulo}**: ${lista.length} agreements for ${porPersona.size} people · total **$${total.toLocaleString('en-US')}**` : `**Acuerdos de ${titulo}**: ${lista.length} acuerdos de ${porPersona.size} personas · total **$${total.toLocaleString('en-US')}**` },
    { ul: Array.from(porPersona.values()).map((x) => `**${x.p.nombre}** · ${x.findes.map((f) => rangoFinde(f, E)).join(', ')}`) }
  ];
  const muchos = auxConMuchosFindes(an, personal);
  if (muchos.length) partes.push({ p: E ? `⚠️ Working more than ${TOPE_FINDES_AUX} weekends: ${muchos.map((m) => `**${m.nombre}** (${m.findes.length})`).join(', ')}. Check it’s right.` : `⚠️ Trabajan más de ${TOPE_FINDES_AUX} fines de semana: ${muchos.map((m) => `**${m.nombre}** (${m.findes.length})`).join(', ')}. Revisa que esté bien.` });
  if (faltan.size) partes.push({ p: E ? `Not included because they're missing full name or ID number: ${Array.from(faltan).join(', ')}. Fill it in Acuerdos → Personal.` : `No entran porque les falta el nombre completo o la cédula: ${Array.from(faltan).join(', ')}. Se completa en Acuerdos → Personal.` });
  partes.push({ p: E ? 'Regulars come in automatically; to add or remove extras, open Acuerdos.' : 'Los fijos entran solos; para agregar o quitar extras, ábrelo en Acuerdos.' });
  const botones = [];
  if (!soloPagos) {
    if (of.word && of.word.estado === 'listo') botones.push(baja(E ? 'Download Word' : 'Descargar Word', { tipo: 'acuerdos', mes }));
    else {
      partes.push({ p: E ? 'For the Word I need **last month’s agreements Word** (it has the format and the clauses). Upload it here 📎 and I’ll make it right away.' : 'Para el Word necesito el **Word de acuerdos del mes pasado** (tiene el formato y las cláusulas). Súbelo aquí 📎 y lo armo enseguida.' });
      botones.push({ t: E ? 'Upload last month’s Word' : 'Subir el Word del mes pasado', pedirArchivo: { tipo: 'word', luego: { tipo: 'acuerdos', mes } } });
    }
  }
  botones.push(baja(E ? 'Download payments Excel' : 'Descargar Excel de pagos', { tipo: 'pagos', mes }));
  botones.push(an.abrir('acuerdos', E ? 'Open Acuerdos' : 'Abrir Acuerdos'));
  return { partes, botones };
}

export async function casasDoc(e, datos, T) {
  const E = T.E;
  const hoy = datos.hoy;
  let sab;
  if (e.fechas && e.fechas.fechas && e.fechas.fechas.length) sab = finDeSemana(e.fechas.fechas[0])[1];
  else if (e.fechas && e.fechas.tipo === 'mes') sab = null;
  else sab = finDeSemana(hoy)[1];
  const mes = sab ? claveDe(sab) : mesPorDefecto(e, datos);
  const an = await analisisDe(mes, datos);
  if (!an) return sinHorario(mes, E);
  const of = (datos.oficina && datos.oficina()) || {};
  let fi = sab ? an.findes.findIndex((f) => f.sabado.getDate() === sab.getDate() && f.sabado.getMonth() === sab.getMonth()) : an.findes.findIndex((f) => f.domingo >= new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
  if (fi < 0) fi = sab ? -1 : an.findes.length - 1;
  if (fi < 0) return { partes: [{ p: E ? 'That weekend isn’t in the schedule.' : 'Ese fin de semana no está en el horario.' }], botones: [an.abrir('casas', E ? 'Open Cambio de casa' : 'Abrir Cambio de casa')] };
  const f = an.findes[fi];
  const hojas = hojasDelFinde(f, datos.personal || [], of.marcas || {});
  const marcadas = hojas.filter((h) => h.marcada);
  const finde = rangoFinde(f, E);
  const partes = [{ p: E ? `**House change · ${finde}**` : `**Cambio de casa · ${finde}**` }];
  partes.push({ p: marcadas.length ? (E ? `Houses without their house parents (sheets marked): ${marcadas.map((h) => h.casa).join(', ')}.` : `Casas sin sus padres de casa (hojas marcadas): ${marcadas.map((h) => h.casa).join(', ')}.`) : E ? 'Every house has its house parents this weekend, so no sheet is marked.' : 'Todas las casas tienen a sus padres de casa este fin de semana, así que no hay hojas marcadas.' });
  partes.push({ ul: hojas.map((h) => `${h.casa}: ${h.nombres || '—'}${h.marcada ? (E ? ' ✓ sheet' : ' ✓ hoja') : ''}`) });
  const botones = [];
  const todas = e.todas || !marcadas.length;
  if (marcadas.length && !e.todas) botones.push(baja(E ? `Download PDF (${marcadas.length})` : `Descargar PDF (${marcadas.length})`, { tipo: 'casas', mes, sabado: f.sabado.getDate(), todas: false }));
  if (todas || hojas.length > marcadas.length) botones.push(baja(E ? `PDF of all houses (${hojas.length})` : `PDF de todas las casas (${hojas.length})`, { tipo: 'casas', mes, sabado: f.sabado.getDate(), todas: true }));
  botones.push(an.abrir('casas', E ? 'Open Cambio de casa' : 'Abrir Cambio de casa'));
  return { partes, botones };
}

export function menuDoc(e, datos, T) {
  const E = T.E;
  const of = (datos.oficina && datos.oficina()) || {};
  if (of.menu && of.menu.estado === 'listo') {
    return {
      partes: [{ p: E ? `I have the menu you uploaded (**${of.menu.nombre}**). Here it is, cleaned up: just the menu sheet on one page, with the signatures at the bottom.` : `Tengo el menú que subiste (**${of.menu.nombre}**). Aquí está limpio: solo la hoja del menú en una página, con las firmas abajo.` }],
      botones: [baja(E ? 'Download clean menu' : 'Descargar menú limpio', { tipo: 'menu' }), { t: E ? 'Use another Excel' : 'Usar otro Excel', pedirArchivo: { tipo: 'menu', luego: { tipo: 'menu' } } }]
    };
  }
  return {
    partes: [{ p: E ? 'Upload the **fortnight menu Excel** here 📎 and I’ll give it back ready to sign: no amounts, nothing saying “en casa”, only the menu sheet on one page and the signatures at the bottom, same as the Menú tab.' : 'Súbeme aquí 📎 el **Excel del menú de la quincena** y te lo devuelvo listo para firmar: sin cantidades, sin “en casa”, solo la hoja del menú en una página y las firmas abajo, igual que en la pestaña Menú.' }],
    botones: [{ t: E ? 'Upload the menu Excel' : 'Subir el Excel del menú', pedirArchivo: { tipo: 'menu', luego: { tipo: 'menu' } } }, ir('menu', E ? 'Open Menú' : 'Abrir Menú')]
  };
}

export async function ninosDoc(e, datos, T) {
  const E = T.E;
  const todos = await datos.cargarNinos();
  const lista = e.casa ? todos.filter((n) => n.casa === e.casa) : todos;
  const donde = e.casa ? (E ? ` of ${e.casa}` : ` de ${e.casa}`) : '';
  if (e.tipo === 'cumple_doc') {
    const f = e.fechas;
    const mes = f && f.tipo === 'mes' ? f.mes : f && f.fechas && f.fechas.length ? claveDe(f.fechas[0]) : claveDe(datos.hoy);
    const m = +mes.slice(5) - 1;
    const delMes = lista.filter((n) => +String(n.nacimiento || '').slice(5, 7) === m + 1);
    if (!delMes.length) return { partes: [{ p: E ? `Nobody${donde} has a birthday in ${nombreMes(mes, E)}.` : `Nadie${donde} cumple años en ${nombreMes(mes, E)}.` }] };
    const idioma = e.idiomaDoc || (E ? 'en' : 'es');
    const d = { tipo: 'cumple', mes, casa: e.casa || '', idioma };
    return {
      partes: [{ p: E ? `**Birthdays · ${nombreMes(mes, E)}**${donde}: ${delMes.length}. Here is the PDF with their photos:` : `**Cumpleaños de ${nombreMes(mes, E)}**${donde}: ${delMes.length}. Aquí está el PDF con sus fotos:` }],
      botones: [baja(idioma === 'en' ? (E ? 'Download PDF (English)' : 'Descargar PDF (inglés)') : E ? 'Download PDF (Spanish)' : 'Descargar PDF (español)', d), baja(idioma === 'en' ? (E ? 'In Spanish' : 'En español') : E ? 'In English' : 'En inglés', { ...d, idioma: idioma === 'en' ? 'es' : 'en' })]
    };
  }
  const esRegalo = e.tipo === 'regalos_doc';
  const idioma = e.idiomaDoc || 'en';
  const d = { tipo: esRegalo ? 'regalos' : 'directorio', casa: e.casa || '', idioma };
  const que = esRegalo ? (E ? 'Gift info sheets' : 'Hojas de regalos') : E ? 'Directory' : 'Directorio';
  return {
    partes: [{ p: E ? `**${que}**${donde}: ${lista.length} children, with photos. Here it is:` : `**${que}**${donde}: ${lista.length} niños, con fotos. Aquí está:` }],
    botones: [baja(idioma === 'en' ? (E ? 'Download PDF (English)' : 'Descargar PDF (inglés)') : E ? 'Download PDF (Spanish)' : 'Descargar PDF (español)', d), baja(idioma === 'en' ? (E ? 'In Spanish' : 'En español') : E ? 'In English' : 'En inglés', { ...d, idioma: idioma === 'en' ? 'es' : 'en' })]
  };
}

export function reporteAus(e, datos, T) {
  const E = T.E;
  const f = e.fechas;
  const anio = e.anioAus || (f && f.tipo === 'mes' ? +f.mes.slice(0, 4) : datos.hoy.getFullYear());
  const mes = f && f.tipo === 'mes' ? +f.mes.slice(5) - 1 : null;
  const r = reporte(datos.personal || [], anio, mes);
  const titulo = mes == null ? String(anio) : nombreMes(`${anio}-${String(mes + 1).padStart(2, '0')}`, E);
  const con = r.filas.filter((x) => x.veces);
  const partes = [{ p: E ? `**Staff absence report · ${titulo}**: ${r.total.vac} vacation days and ${r.total.dias - r.total.vac} other absence days (${con.length} people).` : `**Reporte de ausencias · ${titulo}**: ${r.total.vac} días de vacaciones y ${r.total.dias - r.total.vac} días de otras ausencias (${con.length} personas).` }];
  return { partes, botones: [baja(E ? 'Download for Excel' : 'Descargar para Excel', { tipo: 'reporte', anio, mes }), ir('control', E ? 'Open Control de personal' : 'Abrir Control de personal')] };
}
