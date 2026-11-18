import { plano, palabras, parecida, distancia, tiene, VACIAS } from './texto.js';
import { leerFechas } from './fechas.js';
import { GUIA } from './guia.js';

const CASAS = ['Casa 1', 'Casa 2', 'Casa 3', 'Casa 4', 'Casa Esther'];

const COMUNES = new Set(
  'casa casas esther trabaja trabajan trabajar trabajo turno turnos toca tocan quien quienes cuando cuanto cuantos cuantas donde esta estan hay talla tallas zapatos ropa cumple edad anos tiene tienen nino ninos dia dias semana mes finde hoy manana ayer lunes martes miercoles jueves viernes sabado domingo enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre oncall descansa descansan descanso libre libres horario acuerdos acuerdo cambiocasa padresdecasa como hago hacer puedo se va van queda quedan cubre necesitan necesita ver dime saber listo hecho falta proximo proxima siguiente pasado este esta estos otro cual cuales numero mide calza viste nacio nacimiento todos todas foto fotos menu regalo regalos pdf excel word guardar armar copiar borrar quitar agregar poner cambiar en de del el la los las y o que para con por sin le les lo su sus mi'.split(' ')
);

export function leerCasa(texto) {
  const s = plano(texto);
  if (/\bcasa esther\b/.test(s)) return 'Casa Esther';
  const m = s.match(/\bcasa\s+([1-4])\b/);
  return m ? `Casa ${m[1]}` : '';
}

const partes = (nombre) => plano(nombre).split(' ').filter((p) => p.length >= 2);

function parecidaNombre(p, n) {
  if (p === n) return 2;
  if (p.length < 3 || n.length < 3) return 0;
  if (p[0] !== n[0]) return 0;
  const d = distancia(p, n);
  if (n.length <= 5) return d <= 1 ? 1 : 0;
  return d <= 1 || (d === 2 && (n.length >= 8 || p[p.length - 1] === n[n.length - 1])) ? 1 : 0;
}

export function buscarNombres(texto, lista, campo = 'nombre') {
  const ps = palabras(texto).filter((p) => !COMUNES.has(p) && !VACIAS.has(p) && !/^\d+$/.test(p));
  if (!ps.length) return [];
  const out = [];
  for (const x of lista) {
    const np = partes(x[campo]);
    if (!np.length) continue;
    let puntos = 0;
    let primero = 0;
    np.forEach((n, i) => {
      let mejor = 0;
      for (const p of ps) mejor = Math.max(mejor, parecidaNombre(p, n));
      if (mejor) {
        puntos += mejor + (i === 0 ? 1 : 0);
        if (i === 0) primero = mejor;
      }
    });
    if (puntos && (primero || puntos >= 3)) out.push({ x, puntos });
  }
  if (!out.length) return [];
  const max = Math.max(...out.map((o) => o.puntos));
  return out.filter((o) => o.puntos === max).map((o) => o.x);
}

export function buscarGuia(texto) {
  const ps = palabras(texto).filter((p) => !VACIAS.has(p) && p !== 'como' && p !== 'hago' && p !== 'puedo');
  const puntos = GUIA.map((a) => {
    let n = 0;
    for (const [k, w] of Object.entries(a.claves)) if (ps.some((p) => parecida(p, k))) n += w;
    return { a, n };
  })
    .filter((x) => x.n > 0)
    .sort((x, y) => y.n - x.n);
  return puntos;
}

const PREGUNTA_COMO = ['como', 'hago', 'hacer', 'puedo', 'pasos', 'funciona', 'sirve', 'manera', 'forma', 'donde', 'tengo que', 'se hace', 'ensename', 'explicame', 'instrucciones'];

function seguimiento(contexto, s, sinVacias, conIntencion, ent) {
  if (!contexto || !contexto.tipo || ['guia', 'no_entendi', 'saludo', 'gracias', 'vacio'].includes(contexto.tipo)) return null;
  if (conIntencion && !/^y\b/.test(s)) return null;
  if (!/^y\b/.test(s) && sinVacias.length > 4) return null;
  const { fechas, casa, trabajadores: trab, ninos: nin } = ent;
  if (!(fechas || casa || trab.length || nin.length)) return null;
  const previo = contexto;
  const usaNino = ['talla_nino', 'cumple_nino', 'edad_nino', 'casa_nino', 'nino_info'].includes(previo.tipo);
  const usaTrab = previo.tipo === 'dias_persona';
  if (usaNino && !nin.length) return null;
  if (!usaNino && !usaTrab && !(fechas || casa)) return null;
  if (usaTrab && !(trab.length || fechas)) return null;
  return {
    ...previo,
    fechas: fechas || previo.fechas,
    casa: casa || (fechas && previo.tipo === 'quien_trabaja' ? previo.casa : ''),
    trabajadores: trab.length ? trab : previo.trabajadores,
    ninos: nin.length ? nin : previo.ninos,
    seguimiento: true
  };
}

export function entender(texto, { hoy = new Date(), trabajadores = [], ninos = [], contexto = null, idioma = 'es' } = {}) {
  const s = plano(texto);
  const ps = palabras(texto);
  if (!ps.length) return { tipo: 'vacio' };
  const sinVacias = ps.filter((p) => !VACIAS.has(p));
  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|que tal)( .*)?$/.test(s) && sinVacias.length <= 1) return { tipo: 'saludo' };
  if (/^(gracias|muchas gracias|ok|okey|listo|perfecto|genial|vale|chevere|bien|super)( .*)?$/.test(s) && sinVacias.length <= 2) return { tipo: 'gracias' };

  const exacto = GUIA.find((a) => plano(a.titulo) === s || (a.en && plano(a.en.titulo) === s));
  if (exacto) return { tipo: 'guia', articulo: exacto, otros: [] };
  const fechas = leerFechas(texto, hoy, idioma);
  const casa = leerCasa(texto);
  const trab = buscarNombres(texto, trabajadores, 'n');
  const nin = buscarNombres(texto, ninos, 'nombre');
  const como = tiene(ps, ...PREGUNTA_COMO) && !tiene(ps, 'quien', 'quienes', 'cuando', 'cuantos', 'cuantas');

  const ent = { fechas, casa, trabajadores: trab, ninos: nin };
  const r = (tipo, extra = {}) => ({ tipo, ...ent, ...extra });

  const hayTalla = tiene(ps, 'talla', 'tallas', 'zapatos', 'ropa', 'mide', 'viste', 'calza');
  const hayCumple = tiene(ps, 'cumple', 'nacio', 'nacimiento') || /\bfecha de nacimiento\b/.test(s);
  const hayEdad = /\b(edad|cuantos anos|que anos|anos tiene|anos cumple)\b/.test(s);
  const hayOncall = /\boncall\b/.test(s);
  const hayDescanso = tiene(ps, 'descansa', 'descansan', 'descanso', 'franco', 'libres') || /\b(esta|estan|queda|quedan)\s+libres?\b|\bno trabaja/.test(s);
  const hayCambio = /\bcambiocasa\b/.test(s);
  const hayTrabajo = tiene(ps, 'trabaja', 'trabajan', 'trabajo', 'turno', 'turnos', 'toca', 'tocan', 'cubre', 'cubren') || /\b(quien|quienes)\s+(esta|estan|va|van|hay|queda|quedan|cuida|cuidan)\b/.test(s) || /\bque dias\b|\bcuando (le )?toca\b|\bhorario de\b/.test(s);
  const hayEstadoHorario = /\bhorario\b/.test(s) && /\b(listo|hecho|falta|terminado|armado|guardado|ya esta|existe)\b/.test(s) && !como;
  const hayNinosCasa = /\bninos\b/.test(s) && (casa || /\bcuantos\b/.test(s)) && !hayTalla && !hayCumple;
  const hayCasaDe = /\b(en )?que casa\b|\bde que casa\b|\bdonde (esta|vive)\b/.test(s);

  const conIntencion = hayTalla || hayCumple || hayEdad || hayOncall || hayDescanso || hayCambio || hayTrabajo || hayEstadoHorario || hayNinosCasa || hayCasaDe || como;
  const seguir = seguimiento(contexto, s, sinVacias, conIntencion, ent);
  if (seguir) return seguir;

  if (!como || nin.length || trab.length) {
    if (hayTalla && nin.length) return r('talla_nino', { prenda: tiene(ps, 'zapatos') && !tiene(ps, 'ropa') ? 'zapatos' : tiene(ps, 'ropa') && !tiene(ps, 'zapatos') ? 'ropa' : 'ambas' });
    if ((hayCumple || hayEdad) && nin.length) return r(hayEdad && !hayCumple ? 'edad_nino' : 'cumple_nino');
    if (hayCumple && !como) return r('cumples');
    if (hayCasaDe && nin.length && !trab.length) return r('casa_nino');
    if (hayOncall && !como) return r('oncall');
    if (hayCambio && !como && !tiene(ps, 'hojas', 'hoja', 'imprimir', 'imprimo')) return r('cambio_casa');
    if (hayDescanso && !como && !trab.length) return r('descansan');
    if (hayNinosCasa) return r('ninos_casa');
    if (hayEstadoHorario) return r('estado_horario');
    if (trab.length && (hayTrabajo || hayDescanso || fechas || casa || !nin.length) && !como) return r('dias_persona');
    if (hayTrabajo && (fechas || casa) && !como) return r('quien_trabaja');
    if (/\b(quien|quienes)\b/.test(s) && (fechas || casa) && !como) return r('quien_trabaja');
    if (nin.length && !como && !trab.length) return r('nino_info');
  }

  const g = buscarGuia(texto);
  if (g.length && g[0].n >= 3) return { tipo: 'guia', articulo: g[0].a, otros: g.slice(1, 3).filter((x) => x.n >= Math.max(3, g[0].n - 2)).map((x) => x.a) };
  if (hayTalla) return { tipo: 'guia', articulo: GUIA.find((a) => a.id === 'tallas'), otros: [] };
  if (hayCumple) return r('cumples');
  if (hayTrabajo || hayCasaDe) return r('quien_trabaja');
  return { tipo: 'no_entendi', parecidos: g.slice(0, 3).map((x) => x.a) };
}

export { CASAS };
