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

  if (/\b(que (puedes|sabes) hacer|que haces|what can you do|what do you do|what can you help)\b/.test(String(texto).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) return { tipo: 'guia', articulo: GUIA.find((g) => g.id === 'samjr'), otros: [] };
  const exacto = GUIA.find((a) => plano(a.titulo) === s || (a.en && plano(a.en.titulo) === s));
  if (exacto) return { tipo: 'guia', articulo: exacto, otros: [] };
  let fechas = leerFechas(texto, hoy, idioma);
  if (/\bcuant|\bhow many\b|\bconteo\b|\bweekend count\b/i.test(plano(texto)) && /\bfin(es)? de semana\b|\bfindes?\b|\bweekends?\b/i.test(String(texto).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) {
    fechas = leerFechas(String(texto).replace(/\bfin(es)? de semana\b|\bfindes?\b|\bweekends?\b/gi, ' '), hoy, idioma);
  }
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
  const hayAus = tiene(ps, 'vacaciones', 'vacacion', 'faltado', 'falto', 'faltaron', 'faltas', 'ausente', 'ausentes', 'ausencia', 'ausencias', 'licencia', 'licencias', 'maternidad', 'paternidad', 'enfermo', 'enferma', 'tomo', 'tomado', 'tomaron', 'permiso', 'permisos');
  const hayAusAhora = tiene(ps, 'vacaciones', 'vacacion', 'ausente', 'ausentes', 'licencia', 'licencias', 'permiso', 'enfermo', 'enferma', 'maternidad', 'falto', 'faltado');
  const dondeVer = tiene(ps, 'donde', 'pestana', 'reporte', 'reportes');
  const anioAus = (() => {
    const m = s.match(/\b(20\d\d)\b/);
    if (m) return +m[1];
    if (/\bano (pasado|anterior)\b|\bpasado ano\b/.test(s)) return hoy.getFullYear() - 1;
    return 0;
  })();
  const hayCasaDe = /\b(en )?que casa\b|\bde que casa\b|\bdonde (esta|vive)\b/.test(s);

  const palabraNinos = /\b(ninos|ninas|nina|chicos|chicas|varones|nenas|nenes|mujercitas)\b/.test(s);
  const crudo = String(texto).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const sexo = /\b(ninas|nina|chicas|nenas|mujeres|mujercitas|girls?)\b/.test(crudo) ? 'F' : /\b(varones|varon|varoncitos|nenes|hombres|hombrecitos|boys?)\b/.test(crudo) ? 'M' : '';
  const pideLista = tiene(ps, 'lista', 'listado', 'nombres', 'descargar', 'descarga', 'bajar', 'excel', 'pdf', 'dame', 'damelos', 'pasame', 'manda', 'mandame', 'todos', 'todas', 'cuales', 'quienes', 'imprimir', 'muestrame', 'ensename', 'ver') || /\b(cuantas|cuantos)\b/.test(s);
  const edadMin = (s.match(/\bmayores de (\d{1,2})\b/) || s.match(/\b(?:older than|over) (\d{1,2})\b/) || [])[1];
  const edadMax = (s.match(/\bmenores de (\d{1,2})\b/) || s.match(/\b(?:younger than|under) (\d{1,2})\b/) || [])[1];
  const hayListaNinos = palabraNinos && (pideLista || !!sexo || edadMin || edadMax) && !hayTalla && !hayCumple && !nin.length && (!!sexo || !!edadMin || !!edadMax || tiene(ps, 'lista', 'listado', 'descargar', 'descarga', 'excel', 'pdf', 'bajar', 'imprimir', 'nombres', 'todos', 'todas', 'cuales', 'quienes'));
  const palabraPersonal = /\b(personal|trabajadores|trabajadoras|empleados|auxiliares|padresdecasa|padres de casa|staff)\b/.test(s);
  const hayListaPersonal = palabraPersonal && !tiene(ps, 'agregar', 'agrego', 'pongo', 'poner', 'anadir', 'anado', 'meto', 'quitar', 'quito', 'cambiar', 'cambio') && tiene(ps, 'lista', 'listado', 'nombres', 'descargar', 'descarga', 'excel', 'bajar', 'dame', 'quienes', 'cuales', 'todos', 'muestrame', 'pasame', 'imprimir') && !trab.length;
  const rolPedido = /\bpadresdecasa\b|\bpadres de casa\b|\bpadres\b/.test(s) ? 'padre' : /\bauxiliares\b/.test(s) ? 'aux' : '';
  const hayDescargaHorario = /\bhorario\b/.test(s) && tiene(ps, 'descargar', 'descarga', 'bajar', 'pdf', 'excel', 'imprimir', 'dame', 'mandame', 'pasame', 'manda', 'archivo') && !trab.length;
  const hayFinde = tiene(ps, 'finde', 'findes', 'fines');
  const comoReal = /\b(como|donde|pasos|funciona|instrucciones|explicame|ensename|manera|forma|se hace)\b/.test(s) || /^(how|where)\b/.test(crudo);
  const NUM = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const aNum = (t) => (t in NUM ? NUM[t] : +t);
  const mCuantos = crudo.match(/\b(\d{1,2}|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|two|three|four|five|six|seven|eight|nine|ten)\s+(?:equipos?|grupos?|teams?|groups?)\b/);
  const mRango = crudo.match(/\b(?:de|entre|edad(?:es)?|ages?|from)\s*(\d{1,2})\s*(?:a|y|hasta|-|to|and|al)\s*(\d{1,2})\b/);
  const porEdad = /\bpor edad(es)?\b|\bby age\b/.test(crudo);
  const porCasaG = /\bpor casas?\b|\bby house\b/.test(crudo);
  const porSexoG = /\bpor (sexo|genero)\b|\bby (gender|sex)\b|\bninos y ninas (separados|aparte)\b|\bboys and girls (separate|apart)\b/.test(crudo);
  const hayEquipos = !comoReal && (/\b(equipos?|teams?)\b/.test(crudo) || (/\b(grupos?|groups?)\b/.test(crudo) && (palabraNinos || porEdad || porCasaG || porSexoG || !!mCuantos || /\b(divid|separ|arm|haz|hazme|make|split)/.test(crudo))));
  const pideDoc = tiene(ps, 'dame', 'pasame', 'mandame', 'manda', 'descargar', 'descarga', 'bajar', 'imprimir', 'imprime', 'genera', 'generar', 'haz', 'hazme', 'saca', 'sacame', 'necesito', 'quiero', 'prepara', 'preparame', 'arma', 'armame', 'documento', 'archivo', 'word', 'pdf', 'excel', 'hojas', 'hoja', 'send', 'make', 'get') || /\b(dame|pasame|hazme|sacame|mandame|preparame|armame)\b/.test(crudo);
  const hayAcuerdos = !comoReal && /\b(acuerdos?|agreements?)\b/.test(crudo) && !/\bpagos?\b|\bpayments?\b/.test(crudo);
  const hayPagos = !comoReal && /\b(pagos?|payments?)\b/.test(crudo) && (/\bacuerdos?\b|\bagreements?\b|\bexcel\b|\bcontabilidad\b|\baccounting\b/.test(crudo) || pideDoc);
  const hayCasasDoc = !comoReal && hayCambio && (pideDoc || tiene(ps, 'hojas', 'hoja', 'imprimir', 'imprimo'));
  const hayMenuDoc = !comoReal && /\bmenu\b/.test(s) && (pideDoc || tiene(ps, 'limpia', 'limpiar', 'limpio', 'arregla', 'arreglar', 'corrige', 'corregir', 'clean', 'fix'));
  const hayRegalos = !comoReal && /\bregalos?\b|\bgift/.test(crudo);
  const hayDirectorio = !comoReal && /\bdirectorio\b|\bdirectory\b/.test(crudo);
  const ingles = /\ben ingles\b|\bin english\b|\benglish\b/.test(crudo) ? 'en' : /\ben espanol\b|\bin spanish\b|\bspanish\b/.test(crudo) ? 'es' : '';
  const hayCumpleDoc = !comoReal && hayCumple && !nin.length && (tiene(ps, 'pdf', 'imprimir', 'documento', 'hoja', 'cartel', 'afiche', 'descargar', 'archivo') || /\b(pdf|poster|print)\b/.test(crudo));
  const hayReporteAus = !comoReal && hayAus && !trab.length && (tiene(ps, 'reporte', 'excel', 'descargar', 'archivo', 'report', 'resumen') || /\b(reporte|report|excel)\b/.test(crudo));
  const cadaUno = /\b(cada|todos|todas|everyone|everybody|each|all|todo el personal|el personal)\b/.test(crudo);
  const hayConteo = (!comoReal || /^how many\b/.test(crudo)) && !trab.length && !hayAus && (/\bconteo\b/.test(crudo) || /\bweekend count\b/.test(crudo) || ((hayFinde || /\bweekends?\b/.test(crudo)) && (cadaUno || /\b(quien|quienes|who)\b.*\b(cuantos|cuantas|how many)\b|\b(cuantos|cuantas|how many)\b.*\b(quien|quienes|who)\b/.test(crudo)) && /\b(cuantos|cuantas|how many|count|cuenta|contar|conteo|cuantas veces)\b/.test(crudo)));
  const conIntencion = hayConteo || hayEquipos || hayAcuerdos || hayPagos || hayCasasDoc || hayMenuDoc || hayRegalos || hayDirectorio || hayCumpleDoc || hayReporteAus || hayListaNinos || hayListaPersonal || hayDescargaHorario || hayAus || hayTalla || hayCumple || hayEdad || hayOncall || hayDescanso || hayCambio || hayTrabajo || hayEstadoHorario || hayNinosCasa || hayCasaDe || como;
  const seguir = seguimiento(contexto, s, sinVacias, conIntencion, ent);
  if (seguir) return seguir;

  if (hayConteo) return r('conteo_findes');
  if (hayEquipos) {
    const desde = mRango ? Math.min(+mRango[1], +mRango[2]) : edadMin != null ? +edadMin + 1 : null;
    const hasta = mRango ? Math.max(+mRango[1], +mRango[2]) : edadMax != null ? +edadMax - 1 : null;
    const modo = !mCuantos && (porEdad || porCasaG || porSexoG) && !/\b(equipos?|teams?)\b/.test(crudo) ? 'grupos' : 'equipos';
    return r('equipos', { n: mCuantos ? Math.max(2, Math.min(12, aNum(mCuantos[1]))) : 2, desde, hasta, sexo, modo, porEdad, porCasa: porCasaG, porSexo: porSexoG || (modo === 'grupos' && !porEdad && !porCasaG) });
  }
  if (hayPagos) return r('pagos_doc');
  if (hayAcuerdos) return r('acuerdos_doc');
  if (hayCasasDoc) return r('casas_doc', { todas: tiene(ps, 'todas', 'todos') || /\ball\b/.test(crudo) });
  if (hayMenuDoc) return r('menu_doc');
  if (hayRegalos) return r('regalos_doc', { idiomaDoc: ingles });
  if (hayDirectorio) return r('directorio_doc', { idiomaDoc: ingles });
  if (hayCumpleDoc) return r('cumple_doc', { idiomaDoc: ingles });
  if (hayReporteAus) return r('reporte_aus', { anioAus });
  if (!como && hayDescargaHorario) return r('horario_descarga');
  if (!como && hayListaNinos) return r('lista_ninos', { sexo, edadMin: edadMin != null ? +edadMin : null, edadMax: edadMax != null ? +edadMax : null });
  if (!como && hayListaPersonal) return r('lista_personal', { rol: rolPedido });
  if (!como || nin.length || trab.length) {
    if (hayTalla && nin.length) return r('talla_nino', { prenda: tiene(ps, 'zapatos') && !tiene(ps, 'ropa') ? 'zapatos' : tiene(ps, 'ropa') && !tiene(ps, 'zapatos') ? 'ropa' : 'ambas' });
    if ((hayCumple || hayEdad) && nin.length) return r(hayEdad && !hayCumple ? 'edad_nino' : 'cumple_nino');
    if (hayCumple && !como) return r('cumples');
    if (hayCasaDe && nin.length && !trab.length) return r('casa_nino');
    if (hayOncall && !como) return r('oncall');
    if (hayCambio && !como && !tiene(ps, 'hojas', 'hoja', 'imprimir', 'imprimo')) return r('cambio_casa');
    if (trab.length && hayAus && !como) return r('aus_persona', { anioAus });
    if (!trab.length && hayAus && !como && !dondeVer && (tiene(ps, 'dias') || /\b(mas|total|resumen)\b/.test(s)) && /\b(cuantos|cuantas|quien|total|resumen)\b/.test(s)) return r('aus_resumen', { anioAus });
    if (!trab.length && hayAusAhora && !como && /\b(quien|quienes)\b/.test(s) && !dondeVer) return r('aus_ahora');
    if (hayDescanso && !como && !trab.length) return r('descansan');
    if (hayNinosCasa) return r('ninos_casa');
    if (hayEstadoHorario) return r('estado_horario');
    if (trab.length && (hayTrabajo || hayDescanso || fechas || casa || !nin.length) && !como) return r('dias_persona', { soloFindes: hayFinde });
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
