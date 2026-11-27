import { buscarNombres, leerCasa } from './entender.js';
import { claveDe } from './fechas.js';
import { CASAS } from '../personal.js';
import { ON_CALL, partesMes, diasDelMes, normalizarConfig, normalizarHorario, idOtro, esOtro, nombreOtro, contexto } from '../horarioApp.js';
import { planAccion, rangos } from '../accionesHorario.js';
import { ausenciasDeMes, TIPOS } from '../ausencias.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_EN = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const DIAS_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const bajo = (t) =>
  String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!]/g, ' ')
    .replace(/\b(\d{1,2})(st|nd|rd|th|ro|do|vo|to)\b/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

const VERBO_PONER = /\b(dale|dales|darle|dele|des|pon|ponle|ponla|ponlo|ponme|poner|ponerle|ponerla|ponerlo|ponga|pongan|pongas|pongamos|pongale|ponles|agregue|agregues|agreguen|agrega|agregale|agregar|anades|anada|metas|meta|asignes|asigne|marques|marque|marquen|registra|registrar|registre|registres|anota|anotar|anote|anotes|apunta|apuntar|apunte|haz|hazlo|hacer|haga|hagas|deje|dejes|agrega|agregale|agregar|anade|anadele|anadir|mete|metele|meter|asigna|asignale|asignar|marca|marcale|marcar|deja|dejale|dejar|put|add|assign|set|mark|make)\b/;
const VERBO_QUITAR = /\b(quites|quite|quiten|quitarle|saques|saque|borres|borre|elimines|elimine|quita|quitale|quitar|quitala|quitalo|saca|sacale|sacar|sacala|sacalo|borra|borrale|borrar|elimina|eliminar|eliminala|eliminalo|remove|delete|take)\b/;
const VERBO_CAMBIAR = /\b(cambies|cambie|cambien|cambiarle|reemplaces|reemplace|cambia|cambiale|cambiar|reemplaza|reemplazar|reemplazala|reemplazalo|sustituye|sustituir|swap|replace|change)\b/;
const VERBO_INTER = /\b(intercambia|intercambiar|intercambialos|swap)\b/;
const VERBO_MOVER = /\b(muevas|mueva|pases|pase|mueve|mover|muevela|muevelo|pasa|pasala|pasalo|pasar|manda|mandala|mandalo|move)\b/;
const PIDE = /^(por favor |porfa |sam |jr |sam jr |oye |hola |puedes |podrias |me puedes |me podrias |quiero que |quisiera que |necesito que |me gustaria que |hay que |tienes que |please |can you |could you |i want you to |i need you to )+/;

function turnoDeTexto(s) {
  if (/\b(a\.?\s?m\.?|am)\b|\b(en|por|de) la manana\b|\bmorning\b|\bmatutino\b/.test(s)) return 'am';
  if (/\b(p\.?\s?m\.?|pm)\b|\b(en|por|de) la tarde\b|\bafternoon\b|\bvespertino\b/.test(s)) return 'pm';
  return '';
}

function ordenNombres(s, lista) {
  const pos = (x) => {
    const partes = bajo(x.n).split(' ').filter((p) => p.length >= 2);
    let mejor = Infinity;
    for (const p of partes) {
      const i = s.search(new RegExp(`\\b${p.slice(0, Math.max(3, p.length - 1))}`));
      if (i >= 0) mejor = Math.min(mejor, i);
    }
    return mejor;
  };
  return lista.map((x) => ({ x, i: pos(x) })).sort((a, b) => a.i - b.i).map((o) => o.x);
}

function nombreSuelto(original, s) {
  const m = s.match(/\b(?:pon|ponle|ponme|deja|dejale|asigna|asignale|pongan|put|make|set)\s+(?:a\s+)?([a-zñ]+(?:\s+(?!de\b|en\b|como\b|para\b)[a-zñ]+)?)\s+(?:de|en|como|para|on|as)\s+(?:oncall|llamada|guardia|turno de llamada)\b/);
  if (!m) return '';
  const crudo = String(original);
  const i = bajo(crudo).indexOf(m[1]);
  const txt = i >= 0 ? crudo.slice(i, i + m[1].length) : m[1];
  return txt.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function entenderAccion(texto, { trabajadores = [], ocDef = '' } = {}) {
  const s0 = bajo(texto);
  let s = s0.replace(PIDE, '').replace(/\bon call\b/g, 'oncall');
  const nombres1 = trabajadores.map((p) => bajo(p.n).split(' ')[0]).filter((x) => x.length >= 3);
  if (/^que\s/.test(s) && (nombres1.some((n) => s.startsWith(`que ${n}`)) || /^que (el|la|los|las) \d/.test(s) || /^que [a-z]+ (este|sea|quede|trabaje|vaya|cubra|haga) /.test(s))) s = s.slice(4);
  if (/^(como|donde|cuando|cuantos|cuantas|que|cual|quien|quienes|por que|porque|how|where|when|what|who|which|why)\b/.test(s)) return null;
  if (/\b(como|donde)\s+(se|puedo|hago|le|lo|la)\b/.test(s)) return null;
  const pregunta = /\?/.test(String(texto));
  const casa = leerCasa(texto);
  const oncall = /\boncall\b|\bde llamada\b|\bde guardia\b/.test(s);
  const trab = ordenNombres(s, buscarNombres(texto, trabajadores, 'n'));
  const turno = turnoDeTexto(s);
  const verboPoner = VERBO_PONER.test(s);
  const verboQuitar = VERBO_QUITAR.test(s);
  const verboCambiar = VERBO_CAMBIAR.test(s);
  const verboInter = VERBO_INTER.test(s) || (/\bcambia\b/.test(s) && /\bcon\b/.test(s) && trab.length >= 2 && !/\bpor\b/.test(s));
  const verboMover = VERBO_MOVER.test(s);
  const algunVerbo = verboPoner || verboQuitar || verboCambiar || verboInter || verboMover;
  const comienzo = (re) => re.test(s.split(' ').slice(0, 3).join(' '));
  if (pregunta && ![VERBO_PONER, VERBO_QUITAR, VERBO_CAMBIAR, VERBO_INTER, VERBO_MOVER, /^(guarda|arma|completa|deshaz|marca)\b/].some(comienzo)) return null;

  if (/^(guarda|guardar|guardalo|guardala|save)\b/.test(s) && !trab.length && !/\bnota\b/.test(s)) return { tipo: 'guardar' };
  if (/^(deshaz|deshacer|undo)\b/.test(s)) return { tipo: 'deshacer' };
  if (/^(arma|armar|armame|completa|completar|completame|llena|llenar|haz|hazme|genera|crea|build|make|fill)\b/.test(s) && (/\bhorario\b|\bschedule\b|\bmes\b/.test(s) || /^(arma|armar|armame|completa|completar|llena|haz|hazme|build|make|fill)\s+(el\s+de\s+|de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/.test(s)) && !trab.length && !/\b(equipos?|grupos?|acuerdos?|menu|documento|pdf|excel)\b/.test(s)) return { tipo: 'armar' };

  const conFecha = /\b\d{1,2}\b|\bhoy\b|\bmanana\b|\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b|\btoday\b|\btomorrow\b/.test(s);
  if (/\b(feriados?|festivos?|holidays?|dia libre para todos)\b/.test(s) && !trab.length && (algunVerbo || conFecha || /\b(es|sea|sera|son|sean|seran|is|be)\s+(an?\s+)?(un\s+)?(dia\s+)?(feriado|festivo|holiday)/.test(s))) {
    const quitar = verboQuitar || /\b(ya no es|no es|no sea|no sera|no son|ya no son)\b/.test(s);
    return { tipo: quitar ? 'quitar_feriado' : 'feriado' };
  }

  if (((/\bnota\b|\bnote\b/.test(s) && (algunVerbo || /^(escribe|anota|apunta)\b/.test(s))) || (/^(anota|apunta|escribe|anade|agrega)\b/.test(s) && conFecha && /:/.test(String(texto)) && !trab.length)) && !/\bnino\b/.test(s)) {
    if (verboQuitar) return { tipo: 'quitar_nota' };
    const crudo = String(texto);
    const m = crudo.match(/:\s*(.+)$/) || crudo.match(/\bque diga\s+(.+)$/i) || crudo.match(/\bdiciendo\s+(.+)$/i) || crudo.match(/["“”]([^"“”]+)["“”]/);
    return { tipo: 'nota', texto: m ? m[1].trim().replace(/["“”]+$/g, '') : '' };
  }

  if (oncall && /\b(automatic|automatico|automatica|regla|por defecto|normal|como estaba)\b/.test(s)) return { tipo: 'oncall_auto' };

  const ausTipo = /\bvacacion(es)?\b|\bvacation\b/.test(s) ? 'vac' : /\b(enferm[oa]|medic[oa]|cita medica|hospital|sick)\b/.test(s) ? 'med' : /\b(familiar|familia|calamidad|luto|funeral)\b/.test(s) ? 'fam' : /\b(licencia|maternidad|paternidad)\b/.test(s) ? 'lic' : /\b(permiso|falta|ausente|no viene|no va a venir|no puede venir)\b/.test(s) ? 'otro' : '';
  if (ausTipo && trab.length === 1 && !/\b(cuant|cuando|tomo|tomado|tuvo)\b/.test(s) && (algunVerbo || /\b(esta|estara|va a estar|sale|se va|tiene|tendra|estuvo)\b/.test(s) || /\bno (viene|va a venir|puede venir)\b/.test(s))) {
    const crudo = String(texto);
    const m = crudo.match(/:\s*(.+)$/);
    return { tipo: 'ausencia', id: trab[0].id, t: ausTipo, nota: m ? m[1].trim().slice(0, 60) : '' };
  }

  const cubre = s.match(/\b(?:cubre|cubra|cubrir|cubrira|reemplaza|reemplace|reemplazara)\s+a\s+([a-z]+)/);
  if (trab.length >= 2 && cubre && !verboCambiar) {
    const x = trab.find((t) => bajo(t.n).startsWith(cubre[1].slice(0, 3)));
    const y = trab.find((t) => t !== x);
    if (x && y) return { tipo: 'reemplazar', id: x.id, id2: y.id, casa: oncall ? ON_CALL : casa };
  }
  if (trab.length >= 2 && !algunVerbo && /\b(en lugar de|en vez de|instead of)\b/.test(s)) {
    const enLugar = s.match(/\b(?:en lugar de|en vez de|instead of)\s+(?:a\s+)?([a-z]+)/);
    const x = trab.find((t) => bajo(t.n).startsWith(enLugar[1].slice(0, 3)));
    const y = trab.find((t) => t !== x);
    if (x && y) return { tipo: 'reemplazar', id: x.id, id2: y.id, casa: oncall ? ON_CALL : casa };
  }
  if (trab.length === 1 && !algunVerbo && !pregunta && conFecha && /\b(ya no|no)\s+(trabaja|trabajara|va a trabajar|trabajar|entra|va)\b/.test(s) && !casa) return { tipo: 'quitar', id: trab[0].id, casa: oncall ? ON_CALL : '' };
  if (trab.length === 1 && !algunVerbo && !pregunta && conFecha && casa && /\b(va|vaya|ira|esta|este|estara|queda|quede|trabaja|trabaje|trabajara|entra|entre)\s+(a|en)\s+(la\s+)?casa\b/.test(s)) return { tipo: 'poner', id: trab[0].id, casa, turno };
  if (oncall && !algunVerbo && !pregunta && conFecha && !/\b(automatic|automatico|regla|por defecto)\b/.test(s)) {
    const m = s.match(/^([a-z]+(?:\s+(?!esta\b|este\b|estara\b|queda\b|quede\b|va\b|de\b|en\b)[a-z]+)?)\s+(?:esta\s+|este\s+|estara\s+|queda\s+|quede\s+|va\s+)?(?:de\s+|en\s+)?oncall\b/);
    if (trab.length === 1 && m && bajo(trab[0].n).startsWith(m[1].split(' ')[0].slice(0, 3))) return { tipo: 'poner', id: trab[0].id, casa: ON_CALL, solo: true };
    if (!trab.length && m && !/^(el|la|los|las|hoy|manana|quien|que)\b/.test(m[1])) {
      const crudo = String(texto);
      const i = bajo(crudo).indexOf(m[1]);
      const n = (i >= 0 ? crudo.slice(i, i + m[1].length) : m[1]).replace(/\b\w/g, (c) => c.toUpperCase());
      return { tipo: 'poner', id: idOtro(n), casa: ON_CALL, solo: true };
    }
  }

  if (verboInter && trab.length >= 2) return { tipo: 'intercambiar', id: trab[0].id, id2: trab[1].id, casa: oncall ? ON_CALL : casa };
  if ((verboCambiar || verboPoner) && trab.length >= 2 && /\b(por|en lugar de|en vez de|instead of|with|for)\b/.test(s)) {
    const enLugar = s.match(/\b(?:en lugar de|en vez de|instead of)\s+(?:a\s+)?([a-z]+)/);
    let [x, y] = trab;
    if (enLugar && bajo(x.n).startsWith(enLugar[1].slice(0, 3))) [x, y] = [y, x];
    if (enLugar && !bajo(x.n).startsWith(enLugar[1].slice(0, 3)) && !bajo(y.n).startsWith(enLugar[1].slice(0, 3))) return null;
    if (enLugar) return { tipo: 'reemplazar', id: y.id === x.id ? x.id : y.id, id2: x.id, casa: oncall ? ON_CALL : casa };
    return { tipo: 'reemplazar', id: x.id, id2: y.id, casa: oncall ? ON_CALL : casa };
  }

  if (trab.length === 1 && !oncall && (turno || (/\bturno\b/.test(s) && (verboQuitar || /\bsin turno\b/.test(s))))) {
    if (verboQuitar || /\bsin (turno|am|pm)\b/.test(s)) return { tipo: 'turno', id: trab[0].id, turno: '', casa };
    if ((verboPoner || verboMover) && casa && /\b(en|a)\s+(la\s+)?casa\b/.test(s)) return { tipo: 'poner', id: trab[0].id, casa, turno };
    return { tipo: 'turno', id: trab[0].id, turno, casa };
  }

  if (trab.length === 1 || (oncall && (verboPoner || verboCambiar))) {
    const id = trab.length ? trab[0].id : (() => {
      const n = nombreSuelto(texto, s);
      if (!n) return '';
      return idOtro(n);
    })();
    if (!id) return trab.length ? null : { tipo: 'falta-nombre' };
    if (verboQuitar && (comienzo(VERBO_QUITAR) || !verboPoner)) return { tipo: 'quitar', id, casa: oncall ? ON_CALL : casa };
    if (oncall && (verboPoner || verboCambiar)) return { tipo: 'poner', id, casa: ON_CALL, solo: true };
    if ((verboPoner || verboMover || verboCambiar) && casa) return { tipo: 'poner', id, casa, turno };
    if ((verboPoner || verboMover) && !casa && /\b(en|a)\s+(la\s+)?casa\b/.test(s)) return { tipo: 'poner', id, casa: '' };
  }
  if (trab.length === 0 && verboQuitar && /\bhorario\b/.test(s) && !/\bnota|feriado|oncall\b/.test(s)) return null;
  return null;
}

export function pareceOrden(texto, { trabajadores = [] } = {}) {
  const s = bajo(texto).replace(PIDE, '').replace(/\bon call\b/g, 'oncall');
  if (/\?/.test(String(texto)) || /^(como|donde|cuando|cuantos|cuantas|que|cual|quien|quienes|por que|how|where|when|what|who|which|why)\b/.test(s)) return false;
  const inicio = s.split(' ').slice(0, 2).join(' ');
  if (![VERBO_PONER, VERBO_QUITAR, VERBO_CAMBIAR, VERBO_INTER, VERBO_MOVER].some((re) => re.test(inicio))) return false;
  if (/\b(equipos?|grupos?|acuerdos?|pagos?|menu|ninos?|ninas?|lista|pdf|excel|word|documentos?|regalos?|directorio|cumple|fotos?|album|tallas?|personal y reglas)\b/.test(s)) return false;
  return /\b(casa|horario|oncall|feriados?|nota|turno|am|pm|manana|tarde|dia|dias|semana|fin de semana|finde)\b/.test(s) || buscarNombres(texto, trabajadores, 'n').length > 0;
}

function anioPara(mes, hoy) {
  const y = hoy.getFullYear();
  return mes < hoy.getMonth() - 2 ? y + 1 : y;
}

export function mesDeTexto(texto, hoy) {
  const s = ` ${bajo(texto)} `;
  for (let i = 0; i < 12; i++) {
    if (new RegExp(`\\b(${MESES[i]}|${MESES_EN[i]})\\b`).test(s) || (i === 8 && /\bsetiembre\b/.test(s))) return `${anioPara(i, hoy)}-${String(i + 1).padStart(2, '0')}`;
  }
  if (/\b(proximo|siguiente)\s+mes\b|\bmes que viene\b|\bnext month\b/.test(s)) return claveDe(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1));
  if (/\beste mes\b|\bthis month\b/.test(s)) return claveDe(hoy);
  return '';
}

export function diasDeTexto(texto, clave, hoy = new Date()) {
  const { anio, mes } = partesMes(clave);
  const n = diasDelMes(anio, mes);
  const wd = (d) => new Date(anio, mes, d).getDay();
  let s = ` ${bajo(texto)} `
    .replace(/\bcasa\s+[1-4]\b/g, ' ')
    .replace(/\b20\d\d\b/g, ' ')
    .replace(/\b\d{1,2}\s*(?:am|pm|a\.?\s?m\.?|p\.?\s?m\.?)\b/g, ' ')
    .replace(/:.*$/, ' ');
  const todos = Array.from({ length: n }, (_, i) => i + 1);
  const valido = (d) => d >= 1 && d <= n;
  const viernes = (d) => d - ((wd(d) + 2) % 7);
  const finde = (w) => w === 5 || w === 6 || w === 0;
  const out = new Set();
  let algo = false;
  const rango = s.match(/\b(?:del|desde el|desde|entre el|entre|from)\s+(\d{1,2})\s+(?:al|hasta el|hasta|y el|a|to|until|through)\s+(\d{1,2})\b/) || s.match(/\b(\d{1,2})\s*(?:-|al|a)\s*(\d{1,2})\s+de\s+[a-z]+/);
  if (rango) {
    const [x, y] = [+rango[1], +rango[2]].sort((p, q) => p - q);
    for (let d = x; d <= y; d++) if (valido(d)) out.add(d);
    algo = true;
    s = s.replace(rango[0], ' ');
  }
  const findeDe = s.match(/\b(?:fin de semana|finde|weekend)\s+(?:del|de|of the)\s+(\d{1,2})\b/);
  if (findeDe) {
    const v = viernes(+findeDe[1]);
    for (let d = v; d <= v + 2; d++) if (valido(d)) out.add(d);
    algo = true;
    s = s.replace(findeDe[0], ' ');
  }
  const semanaDe = s.match(/\bsemana\s+(?:del|de)\s+(\d{1,2})\b|\bweek of (?:the )?(\d{1,2})\b/);
  if (semanaDe) {
    const d0 = +(semanaDe[1] || semanaDe[2]);
    const lunes = d0 - ((wd(d0) + 6) % 7);
    for (let d = lunes; d <= lunes + 6; d++) if (valido(d)) out.add(d);
    algo = true;
    s = s.replace(semanaDe[0], ' ');
  }
  if (/\b(los|todos los|todas las|every)\s+(fines de semana|findes|weekends)\b|\bfines de semana\b|\bcada fin de semana\b/.test(s) && !findeDe) {
    for (const d of todos) if (finde(wd(d))) out.add(d);
    algo = true;
  }
  if (/\bentre semana\b|\bde lunes a jueves\b|\bweekdays\b/.test(s)) {
    const base = out.size ? Array.from(out) : todos;
    out.clear();
    for (const d of base) if (!finde(wd(d))) out.add(d);
    algo = true;
  }
  for (let i = 0; i < 7; i++) {
    const plural = new RegExp(`\\b(los|todos los|cada|every)\\s+(${DIAS[i]}s?|${DIAS_EN[i]}s?)\\b|\\b${DIAS_EN[i]}s\\b`);
    if (plural.test(s) || (i !== 3 && i !== 2 && i !== 1 && new RegExp(`\\b${DIAS[i]}s\\b`).test(s))) {
      for (const d of todos) if (wd(d) === i) out.add(d);
      algo = true;
      s = s.replace(plural, ' ');
    }
  }
  const lista = [];
  for (const m of s.matchAll(/\b(\d{1,2})\b/g)) {
    const d = +m[1];
    const antes = s.slice(Math.max(0, m.index - 14), m.index);
    if (/\b(equipos?|personas?|dias de|cada)\s*$/.test(antes)) continue;
    if (valido(d)) lista.push(d);
  }
  if (lista.length) {
    for (const d of lista) out.add(d);
    algo = true;
  }
  if (!lista.length && !algo) {
    for (let i = 0; i < 7; i++) {
      if (new RegExp(`\\b(el|este|el proximo|este proximo|this|on)\\s+(${DIAS[i]}|${DIAS_EN[i]})\\b`).test(s) || new RegExp(`\\b${DIAS[i]}\\b`).test(s)) {
        const hoyMes = hoy.getFullYear() === anio && hoy.getMonth() === mes ? hoy.getDate() : 1;
        const d = todos.find((x) => x >= hoyMes && wd(x) === i) || todos.find((x) => wd(x) === i);
        if (d) {
          if (finde(i) && /\bfin de semana\b|\bfinde\b/.test(s)) {
            const v = viernes(d);
            for (let x = v; x <= v + 2; x++) if (valido(x)) out.add(x);
          } else out.add(d);
          algo = true;
        }
        break;
      }
    }
  }
  if (!algo && /\bhoy\b|\btoday\b/.test(s) && hoy.getFullYear() === anio && hoy.getMonth() === mes) {
    out.add(hoy.getDate());
    algo = true;
  }
  if (!algo && /\bmanana\b|\btomorrow\b/.test(s) && !/\b(por|en|de) la manana\b/.test(s)) {
    const m = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
    if (m.getFullYear() === anio && m.getMonth() === mes) {
      out.add(m.getDate());
      algo = true;
    }
  }
  if (!algo && /\b(este fin de semana|este finde|this weekend)\b/.test(s)) {
    const hoyD = hoy.getFullYear() === anio && hoy.getMonth() === mes ? hoy.getDate() : 1;
    const d = todos.find((x) => x >= hoyD && finde(wd(x)));
    if (d) {
      const v = viernes(d);
      for (let x = v; x <= v + 2; x++) if (valido(x)) out.add(x);
      algo = true;
    }
  }
  if (!algo && /\b(esta semana|this week)\b/.test(s) && hoy.getFullYear() === anio && hoy.getMonth() === mes) {
    const lunes = hoy.getDate() - ((hoy.getDay() + 6) % 7);
    for (let d = lunes; d <= lunes + 6; d++) if (valido(d)) out.add(d);
    algo = true;
  }
  return algo ? Array.from(out).sort((a, b) => a - b) : null;
}

const NOMBRE_MES = (clave, E) => {
  const { anio, mes } = partesMes(clave);
  const m = E ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][mes] : MESES[mes];
  return `${m} ${anio}`;
};

export async function responderAccion(e, datos, T) {
  const E = T.E;
  const a0 = e.accion;
  const hoy = datos.hoy || new Date();
  let mes = mesDeTexto(e.texto || '', hoy) || datos.mesHorario || datos.mesActivo || '';
  if (!mes) {
    mes = claveDe(hoy);
    const ds = diasDeTexto(e.texto || '', mes, hoy);
    if (ds && ds.length && ds.every((d) => d < hoy.getDate())) mes = claveDe(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1));
  }
  const ir = { t: E ? 'See the Schedule' : 'Ver el Horario', ir: 'horario', mes };
  if (a0.tipo === 'no-entendi')
    return {
      partes: [
        { p: E ? 'I want to do it, but I didn’t understand exactly what to change. Write it like one of these:' : 'Quiero hacerlo, pero no entendí bien qué cambiar. Escríbelo como alguno de estos:' },
        { ul: E ? ['Put Wendy on AM every day she works', 'Remove Mayra on the 15th', 'Replace Mayra with Wendy on the 20th', 'Put Wendy in Casa 2 from the 14th to the 17th', 'Put Jauna on call on the 22nd', 'Mark the 25th as a holiday', 'Put a note on the 24th: Christmas dinner'] : ['Pon a Wendy AM todos los días que le toca', 'Quita a Mayra del 15', 'Cambia a Mayra por Wendy el 20', 'Pon a Wendy en Casa 2 del 14 al 17', 'Pon a Jauna de on call el 22', 'Marca el 25 como feriado', 'Pon una nota el 24: cena de Navidad'] }
      ]
    };
  if (a0.tipo === 'falta-nombre') return { partes: [{ p: E ? 'Who should I put? Write the name, for example: “put Jauna on call on the 20th”.' : '¿A quién pongo? Escribe el nombre, por ejemplo: “pon a Jauna de on call el 20”.' }] };
  if (a0.tipo === 'guardar') return { partes: [{ p: E ? `Saving the schedule for **${NOMBRE_MES(mes, E)}**…` : `Guardando el horario de **${NOMBRE_MES(mes, E)}**…` }], hacerYa: { tipo: 'guardar', mes } };
  if (a0.tipo === 'deshacer') return { partes: [{ p: E ? 'Undoing the last thing I changed…' : 'Deshaciendo lo último que cambié…' }], hacerYa: { tipo: 'deshacer', mes } };
  const r = await datos.horario(mes);
  const config = normalizarConfig(r && r.config);
  const hCrudo = normalizarHorario(r && r.horario);
  const tiene = !!hCrudo && Object.keys(hCrudo.dias).length > 0;
  if (a0.tipo === 'armar') {
    if (tiene) return { partes: [{ p: E ? `**${NOMBRE_MES(mes, E)}** already has a schedule. I’ll fill in only the empty spots, following the rules.` : `**${NOMBRE_MES(mes, E)}** ya tiene horario. Voy a completar solo lo que falta, con las reglas.` }], hacerYa: { tipo: 'armar', mes } };
    return { partes: [{ p: E ? `Building the schedule for **${NOMBRE_MES(mes, E)}** with the rules…` : `Armando el horario de **${NOMBRE_MES(mes, E)}** con las reglas…` }], hacerYa: { tipo: 'armar', mes } };
  }
  if (!tiene && (a0.tipo === 'feriado' || a0.tipo === 'quitar_feriado')) {
    const ds = diasDeTexto(e.texto || '', mes, hoy);
    if (!ds) return { partes: [{ p: E ? 'Which day? For example: “mark the 25th as a holiday”.' : '¿Qué día? Por ejemplo: “marca el 25 como feriado”.' }] };
    const txt = a0.tipo === 'feriado' ? (E ? `I marked ${rangos(ds)} as a holiday (${NOMBRE_MES(mes, E)}). It’s saved, so when you build the schedule nobody will be placed as if it were a normal day.` : `Marqué ${ds.length === 1 ? `el ${ds[0]}` : `los días ${rangos(ds)}`} como feriado (${NOMBRE_MES(mes, E)}). Ya quedó guardado; cuando armes el horario la app lo tiene en cuenta.`) : E ? `I removed the holiday on ${rangos(ds)}.` : `Quité el feriado ${ds.length === 1 ? `del ${ds[0]}` : `de los días ${rangos(ds)}`}.`;
    return { partes: [{ p: txt }], hacerYa: { tipo: a0.tipo, mes, dias: ds, sinHorario: true } };
  }
  if (!tiene && a0.tipo !== 'ausencia') return { partes: [{ p: E ? `**${NOMBRE_MES(mes, E)}** doesn’t have a schedule yet. Want me to build it? Say “build the schedule for ${NOMBRE_MES(mes, E)}”.` : `**${NOMBRE_MES(mes, E)}** todavía no tiene horario. ¿Lo armo? Dime “arma el horario de ${MESES[partesMes(mes).mes]}”.` }], botones: [ir] };
  const dias = diasDeTexto(e.texto || '', mes, hoy);
  const h = { ...(hCrudo || { dias: {}, vac: [], fer: [], notas: {}, obs: '' }), vac: ausenciasDeMes(datos.personal || [], mes) };
  const ctx = contexto(mes, h, config);
  const nom = (id) => (esOtro(id) ? nombreOtro(id) : ctx.nombre(id));
  const a = { ...a0, mes, dias };
  const cuando = (ds) => (ds && ds.length ? (E ? `on ${rangos(ds).replace(/ al /g, '–').replace(/ y /g, ' and ')}` : ds.length === 1 ? `el ${ds[0]}` : `los días ${rangos(ds)}`) : '');
  const enMes = E ? `in **${NOMBRE_MES(mes, E)}**` : `de **${NOMBRE_MES(mes, E)}**`;
  if (['quitar', 'reemplazar', 'intercambiar', 'ausencia'].includes(a.tipo) && !dias && a.tipo !== 'quitar') {
    if (a.tipo === 'ausencia') return { partes: [{ p: E ? `Which days? For example: “${nom(a.id)} is on vacation from the 20th to the 24th”.` : `¿Qué días? Por ejemplo: “${nom(a.id)} está de vacaciones del 20 al 24”.` }] };
  }
  if (a.tipo === 'nota' && !a.texto) return { partes: [{ p: E ? 'What should the note say? For example: “put a note on the 24th: Christmas dinner”.' : '¿Qué digo en la nota? Por ejemplo: “pon una nota el 24: cena de Navidad”.' }] };
  if ((a.tipo === 'nota' || a.tipo === 'feriado' || a.tipo === 'quitar_feriado' || a.tipo === 'quitar_nota') && !dias) return { partes: [{ p: E ? 'Which day? For example: “mark the 25th as a holiday”.' : '¿Qué día? Por ejemplo: “marca el 25 como feriado”.' }] };
  if (a.tipo === 'poner' && a.turno && !dias && a.casa !== ON_CALL) {
    a.tipo = 'turno';
  }
  if (a.tipo === 'poner' && !a.casa) return { partes: [{ p: E ? `In which house do I put ${nom(a.id)}?` : `¿En qué casa pongo a ${nom(a.id)}?` }] };
  if (a.tipo === 'poner' && !dias) return { partes: [{ p: E ? `Which days do I put ${nom(a.id)} in ${a.casa === ON_CALL ? 'on call' : a.casa}? For example: “on the 15th” or “from the 20th to the 24th”.` : `¿Qué días pongo a ${nom(a.id)} ${a.casa === ON_CALL ? 'de on call' : `en ${a.casa}`}? Por ejemplo: “el 15” o “del 20 al 24”.` }] };
  if (a.tipo === 'ausencia') {
    if (!dias) return { partes: [{ p: E ? `Which days? For example: “${nom(a.id)} is on vacation from the 20th to the 24th”.` : `¿Qué días? Por ejemplo: “${nom(a.id)} está de vacaciones del 20 al 24”.` }] };
    const tipoTxt = (TIPOS.find((x) => x.k === a.t) || TIPOS[4]).n.toLowerCase();
    const plan = planAccion(a, { clave: mes, horario: h, config, anterior: r && r.anterior ? normalizarHorario(r.anterior) : null });
    const ds = [Math.min(...dias), Math.max(...dias)];
    const partes = [{ p: E ? `I’ll record an absence for **${nom(a.id)}** (${tipoTxt}) ${cuando(ds[0] === ds[1] ? [ds[0]] : [ds[0], ds[1]].length ? Array.from({ length: ds[1] - ds[0] + 1 }, (_, i) => ds[0] + i) : [])} ${enMes}.` : `Voy a anotar una ausencia de **${nom(a.id)}** (${tipoTxt}) ${cuando(Array.from({ length: ds[1] - ds[0] + 1 }, (_, i) => ds[0] + i))} ${enMes}.` }];
    if (plan.dias && plan.dias.length) partes.push({ p: E ? `I’ll also take her/him off the schedule those days (${rangos(plan.dias)}).` : `También la quito del horario esos días (${rangos(plan.dias)}).` });
    partes.push({ p: E ? 'This is saved in Control de personal. Should I do it?' : 'Esto queda guardado en Control de personal. ¿Lo hago?' });
    return { partes, botones: [{ t: E ? 'Yes, do it' : 'Sí, hazlo', hacer: { ...a, dias: Array.from({ length: ds[1] - ds[0] + 1 }, (_, i) => ds[0] + i), listo: E ? `Done ✅. I recorded the absence for ${nom(a.id)} (${tipoTxt}) and took her/him off those days. Remember to tap Save in Horario.` : `Listo ✅. Anoté la ausencia de ${nom(a.id)} (${tipoTxt}) y la quité de esos días. Recuerda tocar Guardar en Horario.` } }, ir] };
  }
  const plan = planAccion(a, { clave: mes, horario: h, config, anterior: r && r.anterior ? normalizarHorario(r.anterior) : null });
  if (plan.error) {
    const msg = {
      'no-trabaja': E ? `${nom(a.id)} doesn’t work ${dias ? cuando(dias) : 'any day'} ${enMes}${a.casa ? ` in ${a.casa === ON_CALL ? 'on call' : a.casa}` : ''}.` : `${nom(a.id)} no trabaja ${dias ? cuando(dias) : 'ningún día'} ${enMes}${a.casa ? ` en ${a.casa === ON_CALL ? 'on call' : a.casa}` : ''}.`,
      ya: E ? 'That’s already that way, nothing to change.' : 'Eso ya está así, no hay nada que cambiar.',
      ausente: E ? `${nom(a.id2 || a.id)} is absent those days, so I didn’t put her/him.` : `${nom(a.id2 || a.id)} está ausente esos días, así que no la puse.`,
      'sin-nota': E ? 'That day has no note.' : 'Ese día no tiene nota.',
      'falta-casa': E ? `In which house?` : '¿En qué casa?'
    }[plan.error];
    return { partes: [{ p: msg || (E ? 'I couldn’t do that.' : 'No pude hacer eso.') }], botones: [ir] };
  }
  const d = plan.dias;
  const nd = d.length;
  const t = (es, en) => (E ? en : es);
  const diasTxt = nd === 1 ? t(`el ${d[0]}`, `on the ${d[0]}`) : t(`en ${nd} días (${rangos(d)})`, `on ${nd} days (${rangos(d)})`);
  const lugar = a.casa === ON_CALL ? 'on call' : a.casa || '';
  let texto;
  if (a.tipo === 'turno') texto = a.turno ? t(`Puse **${a.turno.toUpperCase()}** a **${nom(a.id)}** ${diasTxt}${a.casa ? ` en ${a.casa}` : ''}.`, `I put **${a.turno.toUpperCase()}** for **${nom(a.id)}** ${diasTxt}${a.casa ? ` in ${a.casa}` : ''}.`) : t(`Quité el AM/PM de **${nom(a.id)}** ${diasTxt}.`, `I removed the AM/PM for **${nom(a.id)}** ${diasTxt}.`);
  else if (a.tipo === 'quitar') texto = t(`Quité a **${nom(a.id)}**${lugar ? ` de ${lugar}` : ' del horario'} ${diasTxt}.`, `I took **${nom(a.id)}** off${lugar ? ` ${lugar}` : ' the schedule'} ${diasTxt}.`);
  else if (a.tipo === 'poner') texto = t(`Puse a **${nom(a.id)}** ${a.casa === ON_CALL ? 'de on call' : `en ${a.casa}`}${a.turno ? ` (${a.turno.toUpperCase()})` : ''} ${diasTxt}.`, `I put **${nom(a.id)}** ${a.casa === ON_CALL ? 'on call' : `in ${a.casa}`}${a.turno ? ` (${a.turno.toUpperCase()})` : ''} ${diasTxt}.`);
  else if (a.tipo === 'reemplazar') texto = t(`Cambié a **${nom(a.id)}** por **${nom(a.id2)}**${lugar ? ` en ${lugar}` : ''} ${diasTxt}.`, `I replaced **${nom(a.id)}** with **${nom(a.id2)}**${lugar ? ` in ${lugar}` : ''} ${diasTxt}.`);
  else if (a.tipo === 'intercambiar') texto = t(`Intercambié a **${nom(a.id)}** y **${nom(a.id2)}** ${diasTxt}.`, `I swapped **${nom(a.id)}** and **${nom(a.id2)}** ${diasTxt}.`);
  else if (a.tipo === 'oncall_auto') texto = t(`El on call ${diasTxt} quedó otra vez automático (la regla de Viviana y ${config.reglas.ocDef || 'el on call por defecto'}).`, `On call ${diasTxt} is automatic again.`);
  else if (a.tipo === 'feriado') texto = t(`Marqué ${nd === 1 ? `el ${d[0]}` : `los días ${rangos(d)}`} como feriado.`, `I marked ${rangos(d)} as a holiday.`);
  else if (a.tipo === 'quitar_feriado') texto = t(`Quité el feriado ${nd === 1 ? `del ${d[0]}` : `de los días ${rangos(d)}`}.`, `I removed the holiday on ${rangos(d)}.`);
  else if (a.tipo === 'nota') texto = t(`Puse la nota “${a.texto}” ${diasTxt}.`, `I added the note “${a.texto}” ${diasTxt}.`);
  else if (a.tipo === 'quitar_nota') texto = t(`Quité la nota ${diasTxt}.`, `I removed the note ${diasTxt}.`);
  const partes = [{ p: `${texto} ${t(`(${NOMBRE_MES(mes, E)})`, `(${NOMBRE_MES(mes, E)})`)}` }];
  if (plan.saltados && plan.saltados.length) partes.push({ p: t(`No la puse ${rangos(plan.saltados.map((x) => x.d))} porque está ausente.`, `Skipped ${rangos(plan.saltados.map((x) => x.d))} because she/he is absent.`) });
  partes.push({ p: t('Todavía no está guardado: revisa y toca **Guardar** cuando esté bien.', 'It isn’t saved yet: check it and tap **Save** when it looks right.') });
  return { partes, hacerYa: a };
}

export function textoResultadoAccion(res, a, E) {
  if (res.ok) return null;
  const m = {
    sucio: E ? 'The schedule open in Horario has unsaved changes from another month. Save or undo them first.' : 'En Horario hay cambios sin guardar de otro mes. Primero guárdalos o deshazlos.',
    sesion: E ? 'Open Horario and type the password first.' : 'Primero abre Horario y escribe la clave.',
    'sin-horario': E ? 'That month has no schedule yet.' : 'Ese mes todavía no tiene horario.',
    'nada-que-deshacer': E ? 'There’s nothing of mine to undo.' : 'No hay nada mío que deshacer.',
    'no-guardado': E ? 'I couldn’t save. Check the internet and try again.' : 'No pude guardar. Revisa el internet e intenta otra vez.'
  };
  return m[res.error] || (E ? 'I couldn’t do it. Open Horario and try again.' : 'No pude hacerlo. Abre Horario e intenta otra vez.');
}

export { CASAS };
