import { MESES, fold, collapse } from './text.js';
import { parseXml, porTag } from './xml.js';
import { HorarioError, construirTokenizador, leerCelda, armarResultado } from './horario.js';

const colNum = (col) => col.split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);

function resolver(base, target) {
  if (target.startsWith('/')) return target.slice(1);
  const ps = base.split('/').slice(0, -1);
  for (const p of target.split('/')) {
    if (p === '..') ps.pop();
    else if (p !== '.') ps.push(p);
  }
  return ps.join('/');
}

export async function leerGrillaExcel(data, JSZip) {
  let zip;
  try {
    zip = await JSZip.loadAsync(data, { createFolders: false });
  } catch {
    throw new HorarioError('No pude abrir el Excel. Revisa que sea un archivo .xlsx.');
  }
  const wbF = zip.file('xl/workbook.xml');
  if (!wbF) throw new HorarioError('Este archivo no parece un Excel (.xlsx).');
  const wb = parseXml(await wbF.async('string'));
  const rels = parseXml(await zip.file('xl/_rels/workbook.xml.rels').async('string'));
  let compartidos = [];
  const ss = zip.file('xl/sharedStrings.xml');
  if (ss) compartidos = porTag(parseXml(await ss.async('string')), 'si').map((si) => porTag(si, 't').map((t) => t.textContent).join(''));
  const hojas = [];
  for (const s of porTag(wb, 'sheet')) {
    const rel = porTag(rels, 'Relationship').find((r) => r.getAttribute('Id') === s.getAttribute('r:id'));
    if (!rel) continue;
    const f = zip.file(resolver('xl/workbook.xml', rel.getAttribute('Target')));
    if (!f) continue;
    const doc = parseXml(await f.async('string'));
    const filas = [];
    for (const r of porTag(doc, 'row')) {
      const fila = {};
      for (const c of porTag(r, 'c')) {
        const ref = c.getAttribute('r') || '';
        const col = colNum(ref.replace(/\d+/g, ''));
        const t = c.getAttribute('t');
        const v = porTag(c, 'v')[0];
        let val = '';
        if (t === 'inlineStr') val = porTag(c, 't').map((x) => x.textContent).join('');
        else if (v) val = t === 's' ? compartidos[+v.textContent] ?? '' : v.textContent;
        if (String(val).trim() !== '') fila[col] = String(val);
      }
      filas.push({ r: +r.getAttribute('r'), celdas: fila });
    }
    hojas.push({ nombre: s.getAttribute('name'), filas });
  }
  if (!hojas.length) throw new HorarioError('El Excel no tiene hojas.');
  return hojas;
}

const NUMERO = /^(?:[a-z]+\s+)?(\d{1,2})(?:\.0+)?$/;

function mesDe(hojas, nombreArchivo) {
  const re = new RegExp(`\\b(${MESES.join('|')}|setiembre)\\b\\D{0,12}(20\\d\\d)`);
  const textos = [];
  for (const h of hojas) for (const f of h.filas.slice(0, 6)) textos.push(...Object.values(f.celdas));
  textos.push(h0(hojas), nombreArchivo || '');
  for (const t of textos) {
    const m = fold(t).match(re);
    if (m) return { mes: m[1] === 'setiembre' ? 8 : MESES.indexOf(m[1]), anio: +m[2] };
  }
  return null;
}

function h0(hojas) {
  return hojas.map((h) => h.nombre).join(' ');
}

export function analizarHorarioExcel(hojas, personal, nombreArchivo) {
  const info = mesDe(hojas, nombreArchivo);
  if (!info) throw new HorarioError('No encontré el mes en el Excel. Arriba debe decir el mes y el año, por ejemplo "Horario NOVIEMBRE 2026".');
  const { mes, anio } = info;
  const diasDelMes = new Date(anio, mes + 1, 0).getDate();
  let mejor = null;
  const feriadoEn = {};
  for (const h of hojas) {
    const numFilas = h.filas
      .map((f) => {
        const nums = {};
        for (const [c, v] of Object.entries(f.celdas)) {
          const m = fold(v).trim().match(NUMERO);
          if (m && +m[1] >= 1 && +m[1] <= 31) {
            nums[c] = +m[1];
            if (/^feriado/.test(fold(v).trim())) (feriadoEn[f.r] = feriadoEn[f.r] || {})[c] = true;
          }
        }
        return { r: f.r, nums, n: Object.keys(nums).length };
      })
      .filter((x) => x.n >= 2 || (x.n >= 1 && Object.keys(h.filas.find((f) => f.r === x.r).celdas).length === x.n));
    if (!mejor || numFilas.length > mejor.numFilas.length) mejor = { h, numFilas };
  }
  if (!mejor || mejor.numFilas.length < 4) throw new HorarioError('No encontré las filas con los números de los días en el Excel.');
  const { h, numFilas } = mejor;
  const votos = {};
  numFilas.forEach((nf, i) => {
    if (i === 0 || i === numFilas.length - 1) return;
    for (const [c, d] of Object.entries(nf.nums)) {
      if (d > diasDelMes) continue;
      votos[c] = votos[c] || new Array(7).fill(0);
      votos[c][new Date(anio, mes, d).getDay()]++;
    }
  });
  const dowDe = {};
  for (const [c, v] of Object.entries(votos)) dowDe[c] = v.indexOf(Math.max(...v));
  const tokenizar = construirTokenizador(personal);
  const dias = {};
  const feriados = [];
  const notas = {};
  const obs = [];
  const porFila = new Map(h.filas.map((f) => [f.r, f.celdas]));
  numFilas.forEach((nf, i) => {
    const desde = nf.r + 1;
    const hasta = i + 1 < numFilas.length ? numFilas[i + 1].r - 1 : nf.r + 40;
    for (const [c, d] of Object.entries(nf.nums)) {
      if (d > diasDelMes) continue;
      if (dowDe[c] !== undefined && new Date(anio, mes, d).getDay() !== dowDe[c]) continue;
      if (i === 0 && d > 20) continue;
      if (i === numFilas.length - 1 && d < 8 && numFilas.length > 4) continue;
      if (dias[d]) continue;
      if (feriadoEn[nf.r] && feriadoEn[nf.r][c]) feriados.push(d);
      const lineas = [];
      for (let r = desde; r <= hasta; r++) {
        const celdas = porFila.get(r);
        if (!celdas || !celdas[c]) continue;
        const t = collapse(celdas[c]);
        const ft = fold(t).trim();
        if (/^\s*(casa\s*\w*|esther|on\s*call)\s*:/i.test(ft)) lineas.push(t);
        else if (/^observaciones?\s*:/.test(ft)) obs.push(t.replace(/^[^:]*:\s*/, ''));
        else if (t.trim() && !/^(desc|vacaci|feriado|\d{1,2}$)/.test(ft)) (notas[d] = notas[d] || []).push(t.trim());
      }
      dias[d] = { texto: lineas.join(' | '), ...leerCelda(lineas.join(' '), tokenizar) };
    }
  });
  for (let d = 1; d <= diasDelMes; d++) if (!(d in dias)) dias[d] = null;
  const notasTexto = {};
  for (const [d, l] of Object.entries(notas)) if (dias[d]) notasTexto[d] = Array.from(new Set(l)).join(' · ');
  return { ...armarResultado(mes, anio, dias), feriados: feriados.sort((a, b) => a - b), notas: notasTexto, obs: Array.from(new Set(obs)).join(' · ') };
}
