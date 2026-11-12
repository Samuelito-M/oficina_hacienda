import { MESES, fold, squash, collapse, addDays } from './text.js';
import { CASAS } from './personal.js';

export class HorarioError extends Error {}

export async function leerItemsPdf(data, pdfjs) {
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false, useSystemFonts: false, disableFontFace: true }).promise;
  if (doc.numPages < 1) throw new HorarioError('El PDF está vacío.');
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const items = [];
  for (const it of tc.items) {
    if (!it.str || !it.str.trim()) continue;
    const [a, b, c, d, e, f] = it.transform;
    const size = Math.hypot(c, d) || Math.hypot(a, b) || 10;
    items.push({ str: it.str, x: e, y: vp.height - f, w: it.width || 0, size });
  }
  await doc.destroy();
  return { items, width: vp.width, height: vp.height, pages: doc.numPages };
}

function detectarMes(items, nombreArchivo) {
  const re = new RegExp(`\\b(${MESES.join('|')}|setiembre)\\b\\D{0,12}(20\\d\\d)`);
  const candidatos = [...items].sort((a, b) => b.size - a.size || a.y - b.y);
  for (const it of candidatos) {
    const m = fold(it.str).match(re);
    if (m) return { mes: m[1] === 'setiembre' ? 8 : MESES.indexOf(m[1]), anio: +m[2] };
  }
  const todo = fold(items.map((i) => i.str).join(' '));
  const m = todo.match(re);
  if (m) return { mes: m[1] === 'setiembre' ? 8 : MESES.indexOf(m[1]), anio: +m[2] };
  const f = fold(nombreArchivo || '').match(new RegExp(`(${MESES.join('|')}|setiembre)\\D{0,6}(20\\d\\d)`));
  if (f) return { mes: f[1] === 'setiembre' ? 8 : MESES.indexOf(f[1]), anio: +f[2] };
  return null;
}

function agrupar(valores, salto) {
  const ord = [...valores].sort((a, b) => a.v - b.v);
  const grupos = [];
  for (const o of ord) {
    const g = grupos[grupos.length - 1];
    if (g && o.v - g.max <= salto) {
      g.items.push(o);
      g.max = o.v;
    } else grupos.push({ min: o.v, max: o.v, items: [o] });
  }
  return grupos;
}

export function construirTokenizador(personal) {
  const entradas = [];
  for (const p of personal) {
    const al = new Set([p.id, ...(p.alias || [])].map(squash).filter((a) => a.length >= 2));
    for (const a of al) entradas.push({ id: p.id, a });
  }
  entradas.sort((x, y) => y.a.length - x.a.length);
  return function tokenizar(texto) {
    const ids = [];
    const desconocidos = [];
    let resto = '';
    let i = 0;
    const cerrarResto = () => {
      const limpio = resto.replace(/[^a-z]/g, '');
      if (limpio.length >= 3) desconocidos.push(limpio);
      resto = '';
    };
    while (i < texto.length) {
      let mejor = null;
      for (const { id, a } of entradas) {
        if (texto.startsWith(a, i)) {
          if (!mejor || a.length > mejor.len) mejor = { id, len: a.length };
          continue;
        }
        if (a.length >= 6) {
          let k = 0;
          while (k < a.length && texto[i + k] === a[k]) k++;
          const siguiente = texto[i + k];
          if (k >= 5 && (siguiente === undefined || !/[a-z]/.test(siguiente))) {
            if (!mejor || k > mejor.len) mejor = { id, len: k };
          }
        }
      }
      if (mejor) {
        cerrarResto();
        if (!ids.includes(mejor.id)) ids.push(mejor.id);
        i += mejor.len;
        continue;
      }
      const ch = texto[i];
      if ((ch === 'y' || ch === 'e') && resto === '') {
        i++;
        continue;
      }
      resto += ch;
      i++;
    }
    cerrarResto();
    return { ids, desconocidos };
  };
}

function etiquetaCasa(lbl) {
  if (lbl === 'oncall') return 'On Call';
  if (lbl === 'casaest' || lbl === 'esther' || lbl === 'casaesther') return 'Casa Esther';
  const conocida = CASAS.find((c) => squash(c) === lbl);
  if (conocida) return conocida;
  const m = lbl.match(/^casa(\d+)$/);
  if (m) return `Casa ${m[1]}`;
  return lbl;
}

export function leerCelda(textoCrudo, tokenizar) {
  const sinNotas = textoCrudo.replace(/\([^)]*\)?/g, ' ');
  const t = squash(sinNotas).replace(/:+/g, ':');
  const etiquetas = [...CASAS.map(squash), 'oncall', 'casaest', 'esther'].sort((a, b) => b.length - a.length);
  const re = new RegExp(`(${etiquetas.join('|')}|casa\\d+):`, 'g');
  const partes = [];
  let m;
  let ultimo = null;
  let ultimoFin = 0;
  while ((m = re.exec(t))) {
    if (ultimo) partes.push({ lbl: ultimo, txt: t.slice(ultimoFin, m.index) });
    ultimo = m[1];
    ultimoFin = re.lastIndex;
  }
  if (ultimo) partes.push({ lbl: ultimo, txt: t.slice(ultimoFin) });
  const casas = {};
  const call = [];
  const desconocidos = [];
  const espaciado = ' ' + fold(sinNotas).replace(/[^a-z]+/g, ' ') + ' ';
  const limpiar = (u) => {
    let v = u;
    if (/[ye]$/.test(v) && v.length > 3 && espaciado.includes(`${v.slice(0, -1)} ${v.slice(-1)} `)) v = v.slice(0, -1);
    if (/^[ye]/.test(v) && v.length > 3 && espaciado.includes(` ${v[0]} ${v.slice(1)}`)) v = v.slice(1);
    return v;
  };
  for (const { lbl, txt } of partes) {
    const { ids, desconocidos: d } = tokenizar(txt.replace(/:/g, ''));
    const nombre = etiquetaCasa(lbl);
    for (const x of d) desconocidos.push({ casa: nombre, texto: limpiar(x) });
    if (nombre === 'On Call') {
      for (const id of ids) if (!call.includes(id)) call.push(id);
    } else {
      casas[nombre] = casas[nombre] || [];
      for (const id of ids) if (!casas[nombre].includes(id)) casas[nombre].push(id);
    }
  }
  return { casas, call, desconocidos };
}

export function analizarHorario({ items }, personal, nombreArchivo) {
  const mesInfo = detectarMes(items, nombreArchivo);
  if (!mesInfo) throw new HorarioError('No encontré el mes en el horario. El PDF debe decir arriba el mes y el año, por ejemplo "Octubre 2026".');
  const { mes, anio } = mesInfo;
  const diasDelMes = new Date(anio, mes + 1, 0).getDate();

  const numeros = items.filter((i) => /^\d{1,2}$/.test(i.str.trim())).map((i) => ({ ...i, n: +i.str.trim() }));
  if (numeros.length < 20) throw new HorarioError('No encontré los números de los días. ¿Seguro que es el horario mensual?');

  const filasG = agrupar(numeros.map((n) => ({ v: n.y, n })), 25);
  const filas = filasG.map((g) => ({ y: g.min, nums: g.items.map((o) => o.n) }));
  const colsG = agrupar(numeros.map((n) => ({ v: n.x, n })), 40).filter((g) => g.items.length >= 3);
  if (colsG.length < 5) throw new HorarioError('No pude reconocer las columnas del calendario.');
  const cols = colsG.map((g) => ({ x: Math.min(...g.items.map((o) => o.n.x)), nums: g.items.map((o) => o.n) }));

  for (const c of cols) {
    const votos = new Array(7).fill(0);
    for (const n of c.nums) {
      const fi = filas.findIndex((f) => f.nums.includes(n));
      if (fi <= 0 || fi >= filas.length - 1) continue;
      if (n.n < 1 || n.n > diasDelMes) continue;
      votos[new Date(anio, mes, n.n).getDay()]++;
    }
    const max = Math.max(...votos);
    c.dow = max > 0 ? votos.indexOf(max) : -1;
  }
  if (cols.some((c) => c.dow < 0) || new Set(cols.map((c) => c.dow)).size !== cols.length) {
    throw new HorarioError('Las columnas del calendario no coinciden con los días del mes. Revisa que el mes del título sea el correcto.');
  }
  cols.sort((a, b) => a.x - b.x);
  const margen = 14;
  const limitesX = cols.map((c, i) => ({ dow: c.dow, x0: c.x - margen, x1: i + 1 < cols.length ? cols[i + 1].x - margen : Infinity }));

  const celdas = new Map();
  filas.forEach((f, fi) => {
    const y0 = f.y - 6;
    const y1 = fi + 1 < filas.length ? filas[fi + 1].y - 6 : Infinity;
    for (const n of f.nums) {
      const col = limitesX.find((l) => n.x >= l.x0 && n.x < l.x1);
      if (!col) continue;
      if (n.n < 1 || n.n > diasDelMes) continue;
      const fecha = new Date(anio, mes, n.n);
      if (fecha.getDay() !== col.dow) continue;
      if (fi === 0 && n.n > 20) continue;
      if (fi === filas.length - 1 && n.n < 8 && filas.length > 4) continue;
      if (celdas.has(n.n)) continue;
      celdas.set(n.n, { x0: col.x0, x1: col.x1, y0, y1, numero: n });
    }
  });

  const tokenizar = construirTokenizador(personal);
  const dias = {};
  for (let d = 1; d <= diasDelMes; d++) {
    const c = celdas.get(d);
    if (!c) {
      dias[d] = null;
      continue;
    }
    const dentro = items
      .filter((i) => i !== c.numero && i.x >= c.x0 && i.x < c.x1 && i.y >= c.y0 && i.y < c.y1)
      .filter((i) => !(/^\d{1,2}$/.test(i.str.trim()) && Math.abs(i.y - c.numero.y) < 4));
    dentro.sort((a, b) => a.y - b.y || a.x - b.x);
    const lineas = [];
    for (const it of dentro) {
      const l = lineas[lineas.length - 1];
      if (l && Math.abs(it.y - l.y) < Math.max(3, it.size * 0.45)) l.partes.push(it);
      else lineas.push({ y: it.y, partes: [it] });
    }
    const texto = lineas.map((l) => l.partes.sort((a, b) => a.x - b.x).map((p) => p.str).join(' ')).join('\n');
    dias[d] = { texto: collapse(texto.replace(/\n/g, ' | ')), ...leerCelda(texto.replace(/\n/g, ' '), tokenizar) };
  }

  return armarResultado(mes, anio, dias);
}

export function armarResultado(mes, anio, dias) {
  const diasDelMes = new Date(anio, mes + 1, 0).getDate();
  const encontrados = Object.values(dias).filter(Boolean).length;
  if (encontrados < diasDelMes - 3) throw new HorarioError(`Solo pude leer ${encontrados} de los ${diasDelMes} días del horario.`);

  const findes = [];
  for (let d = 1; d <= diasDelMes; d++) {
    const sab = new Date(anio, mes, d);
    if (sab.getDay() !== 6) continue;
    const dom = addDays(sab, 1);
    const ds = dias[d];
    const dd = dom.getMonth() === mes ? dias[dom.getDate()] : null;
    const casas = {};
    const call = [];
    const desconocidos = [];
    for (const dia of [ds, dd]) {
      if (!dia) continue;
      for (const [c, ids] of Object.entries(dia.casas)) {
        casas[c] = casas[c] || [];
        for (const id of ids) if (!casas[c].includes(id)) casas[c].push(id);
      }
      for (const id of dia.call) if (!call.includes(id)) call.push(id);
      for (const u of dia.desconocidos) if (!desconocidos.some((x) => x.texto === u.texto && x.casa === u.casa)) desconocidos.push(u);
    }
    const casasSabado = {};
    for (const c of Object.keys(casas)) casasSabado[c] = (ds && ds.casas[c]) || (dd && dd.casas[c]) || [];
    const orden = [...CASAS, ...Object.keys(casas).filter((c) => !CASAS.includes(c)).sort()];
    const casasOrdenadas = {};
    const sabOrdenadas = {};
    for (const c of orden) if (casas[c]) {
      casasOrdenadas[c] = casas[c];
      sabOrdenadas[c] = casasSabado[c];
    }
    findes.push({
      i: findes.length,
      sabado: sab,
      domingo: dom,
      viernes: addDays(sab, -1),
      domingoFuera: dom.getMonth() !== mes,
      sinDatos: !ds && !dd,
      casas: casasOrdenadas,
      casasSabado: sabOrdenadas,
      call,
      desconocidos
    });
  }
  if (!findes.length) throw new HorarioError('No encontré fines de semana en el horario.');
  const vacios = findes.filter((f) => !Object.keys(f.casas).length);
  if (vacios.length === findes.length) throw new HorarioError('Leí el calendario pero no encontré casas ni nombres. Revisa que el horario diga "Casa 1: ..." en cada día.');

  return { mes, anio, dias, findes };
}
