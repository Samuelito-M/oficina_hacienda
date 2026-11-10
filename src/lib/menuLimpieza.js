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

const CANTIDADES = [
  [/\(\s*[^)]*\)?/g, ''],
  [/\s+-\s*[a-záéíóúñ ]+$/i, ''],
  [/(^|\s)\d+(?:[.,]\d+)?\s*(?:libras?|lbs?|kg|kilos?|gramos?|gr)(?![a-z])(?:\s+de\s+[a-záéíóúñ]+(?:\s+(?:fileteada|fileteado|molida|molido|picada|picado|entera|entero))?)?/gi, '$1'],
  [/(^|\s)\d+\s*huevos?\s+por\s+(?:chicos?|niños?|ninos?|persona|cabeza)\b/gi, '$1'],
  [/(^|\s)\d+\s*pechugas?\s+(de\s+)/gi, '$1$2'],
  [/\s+\d+\s*(?:pollos?|cuerpos?)(?![a-z]).*$/i, ''],
  [/(^|\s)(?:1\/2|½|medio|media|un|una)\s+(queso|pollo)(?![a-z])/gi, '$1$2'],
  [/(queso)\s+fresco/gi, '$1']
];

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
  let q = s;
  for (const [re, rep] of CANTIDADES) q = q.replace(re, rep);
  q = limpiarEspacios(q).replace(/\s+(y|con|de)$/i, '').replace(/^[,;\s]+|[,;\s]+$/g, '');
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
  const conteo = { cantidad: 0, bebida: 0, ortografia: 0, revisar: 0, sueltos: 0 };
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
