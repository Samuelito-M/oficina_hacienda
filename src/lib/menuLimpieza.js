export const ORTOGRAFIA_BASE = {
  revuleto: 'revuelto',
  revueto: 'revuelto',
  canquil: 'canguil',
  canguill: 'canguil',
  peperonni: 'pepperoni',
  peperoni: 'pepperoni',
  pezcado: 'pescado',
  totilas: 'tortillas',
  tortias: 'tortillas',
  tortiyas: 'tortillas',
  chicharon: 'chicharron',
  mantequila: 'mantequilla',
  ensalda: 'ensalada',
  arros: 'arroz',
  arrroz: 'arroz',
  hamburgesa: 'hamburguesa',
  yogourt: 'yogurt',
  yougurt: 'yogurt',
  platanno: 'platano',
  zanaoria: 'zanahoria',
  zanahorria: 'zanahoria',
  aguacte: 'aguacate',
  chocolote: 'chocolate',
  cebola: 'cebolla',
  verdurras: 'verduras',
  galletass: 'galletas'
};

const SOPAS = /(^|[^a-záéíóúñ])(sopa|sopita|crema|consome|consomé|locro|aguado|sancocho|caldo|encebollado|repe|biche|fanesca|colada)([^a-záéíóúñ]|$)/;
const CON_BEBIDA = /(\+\s*(te|té|refresco|cafe|café|jugo|chocolate|colada|leche|agua aromatica|aromatica))|(^|\s)(y|con)\s+(te|té|refresco|cafe|café|jugo|chocolate|leche)\s*$/;
const SIEMPRE_REFRESCO = /(^|[^a-z])(pizza|hamburguesa|hot ?dog|salchipapa)/;
const SIN_CAMBIO = /^(no|colegio|cena villa|villa|cena en la villa)$/;

const L = 'a-záéíóúñü';
const NUM = `(?:\\d+(?:[.,/]\\d+)?\\s*|[½¼¾]\\s*|(?:media|medio|una?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce)\\s+)`;
const PESO = '(?:libras?|lbs?|kilogramos?|kilos?|kg|gramos?|grs?|g|onzas?|oz)';
const MEDIDA = '(?:tazas?|cucharadas?|cucharaditas?|cdas?|cditas?|litros?|lts?|l|mililitros?|ml|unidades?|unds?|u|paquetes?|fundas?|latas?|docenas?|porciones?|bandejas?|cubetas?|cartones?|sobres?|botellas?|galones?|atados?|racimos?|manojos?)';
const POR = '(?:chic[oa]s?|niñ[oa]s?|nin[oa]s?|personas?|cabezas?|casas?)';

export const EN_CASA = new RegExp(`\\s*-?\\s*(?<![${L}])(?:hech[oa]s?\\s+en\\s+(?:la\\s+)?casa|en\\s+(?:la\\s+)?casa|caser[oa]s?)(?![${L}])`, 'gi');

const CANTIDADES = [
  [/\(\s*[^)]*\)?/g, ''],
  [/\s+-\s*[a-záéíóúñ ]+$/i, ''],
  [new RegExp(`(^|\\s)${NUM}${PESO}(?![${L}])(?:\\s+de\\s+[${L}]+(?:\\s+(?:fileteada|fileteado|molida|molido|picada|picado|entera|entero|sin hueso|con hueso))?)?`, 'gi'), '$1'],
  [new RegExp(`(^|\\s)(?:\\d+|una?|dos|tres|cuatro)\\s+[${L}]+\\s+(?:por|x)\\s+${POR}(?![${L}])`, 'gi'), '$1'],
  [new RegExp(`\\s+(?:por|x)\\s+${POR}(?![${L}])`, 'gi'), ''],
  [
    new RegExp(`(^|\\s)${NUM}${MEDIDA}(?![${L}])(?:\\s+de\\s+([${L}]+))?`, 'gi'),
    (todo, ini, cosa, pos, txt) => {
      if (!cosa) return ini;
      const antes = txt.slice(0, pos).toLowerCase();
      return new RegExp(`(^|[^${L}])${cosa.toLowerCase()}(?![${L}])`).test(antes) ? ini : `${ini}${cosa}`;
    }
  ],
  [/(^|\s)\d+\s*pechugas?\s+(de\s+)/gi, '$1$2'],
  [/\s+\d+\s*(?:pollos?|cuerpos?)(?![a-z]).*$/i, ''],
  [/(^|\s)(?:1\/2|½|medio|media|un|una)\s+(queso|pollo)(?![a-z])/gi, '$1$2'],
  [/(pollo)\s+enter[oa](?![a-z])/gi, '$1'],
  [/(queso)\s+fresco/gi, '$1'],
  [/(^|\s)x\s*\d+(?![\d.,])|(^|\s)\d+\s*x(?![a-z])/gi, '$1$2'],
  [/(^|[\s,;])\d+(?:[.,/]\d+)?(?=$|[\s,;.])/g, '$1']
];

const CONECTOR_FINAL = /\s+(y|e|con|de|en|al|a|para|por)$/i;

const limpiarEspacios = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

function corregir(s, dic, log) {
  return s.replace(/[a-záéíóúñü]+/gi, (w) => {
    const k = w.toLowerCase();
    const v = dic[k];
    if (v && v !== k) {
      log.push(['ortografia', w, v]);
      return v;
    }
    return w;
  });
}

export function limpiarCelda(crudo, { cena = false, siguienteBebida, diccionario = ORTOGRAFIA_BASE } = {}) {
  const log = [];
  const original = limpiarEspacios(crudo);
  if (!original) return { valor: '', cambio: false, log };
  let s = original;
  const sinCasa = limpiarEspacios(s.replace(EN_CASA, ' '));
  if (sinCasa !== s) {
    log.push(['casa', s, sinCasa]);
    s = sinCasa;
  }
  let q = s;
  for (const [re, rep] of CANTIDADES) q = q.replace(re, rep);
  q = limpiarEspacios(q);
  for (let i = 0; i < 4; i++) q = q.replace(CONECTOR_FINAL, '').replace(/^[,;+\-\s]+|[,;+\-\s]+$/g, '');
  if (q !== s) log.push(['cantidad', s, q]);
  s = q.toLowerCase();
  s = corregir(s, diccionario, log);
  s = s.replace(/\s*\+\s*/g, ' + ').replace(/\s+,/g, ',').replace(/\s+/g, ' ').trim();
  if (cena && s && !SIN_CAMBIO.test(s) && !SOPAS.test(s) && !CON_BEBIDA.test(s)) {
    const bebida = SIEMPRE_REFRESCO.test(s) ? 'refresco' : siguienteBebida();
    s = `${s} + ${bebida}`;
    log.push(['bebida', '', `+ ${bebida}`]);
  }
  if (/\d/.test(s.replace(/\b\d{1,2}\s*-\s*\d{1,2}\b/g, ''))) log.push(['revisar', s, '']);
  return { valor: s, cambio: s !== original.toLowerCase(), log };
}

export function limpiarMenu(filas, diccionario = ORTOGRAFIA_BASE) {
  let alterna = 0;
  const siguienteBebida = () => (alterna++ % 2 === 0 ? 'te' : 'refresco');
  const conteo = { cantidad: 0, casa: 0, bebida: 0, ortografia: 0, revisar: 0, sueltos: 0 };
  const salida = filas.map((f) => {
    const dia = limpiarEspacios(f.dia).toLowerCase();
    const comidas = f.comidas.map((c) => {
      const r = limpiarCelda(c.valor, { cena: c.esCena, siguienteBebida, diccionario });
      for (const [k] of r.log) conteo[k]++;
      return { ...c, nuevo: r.valor, cambio: r.cambio, log: r.log, revisar: r.log.some((l) => l[0] === 'revisar') };
    });
    conteo.sueltos += f.sueltos.length;
    return { ...f, diaNuevo: dia, diaCambio: dia !== limpiarEspacios(f.dia), comidas };
  });
  return { filas: salida, conteo };
}
