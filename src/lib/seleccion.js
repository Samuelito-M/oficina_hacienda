import { MESES, fold, fechaLarga, addDays } from './text.js';
import { cedulaValida } from './personal.js';

export const claveFinde = (f) => `${f.sabado.getFullYear()}-${f.sabado.getMonth() + 1}-${f.sabado.getDate()}`;

export function listo(p) {
  return !!p && !!p.completo && cedulaValida(p.cedula);
}

export function estaElegido(over, f, p) {
  const k = `${claveFinde(f)}|${p.id}`;
  if (k in over) return over[k] && listo(p);
  return !!p.fijo && listo(p);
}

export function acuerdosElegidos(analisis, personal, over) {
  if (!analisis) return [];
  const porId = new Map(personal.map((p) => [p.id, p]));
  const orden = new Map(personal.map((p, i) => [p.id, i]));
  const lista = [];
  for (const f of analisis.findes) {
    const vistos = new Set();
    for (const [casa, ids] of Object.entries(f.casas)) {
      for (const id of ids) {
        const p = porId.get(id);
        if (!p || vistos.has(id)) continue;
        if (estaElegido(over, f, p)) {
          vistos.add(id);
          lista.push({ finde: f, persona: p, casa, completo: p.completo, cedula: p.cedula, sabado: f.sabado });
        }
      }
    }
  }
  lista.sort((a, b) => (orden.get(a.persona.id) ?? 999) - (orden.get(b.persona.id) ?? 999) || a.sabado - b.sabado);
  return lista;
}

const FECHA = new RegExp(`\\b(\\d{1,2})\\s+de\\s+(${MESES.join('|')}|setiembre)\\s+del?\\s+(\\d{4})\\b`, 'gi');
const SENOR = /se(?:ñ|n)or\s*\(\s*a\s*\)\s*/i;

export function vistaPrevia(textos, a) {
  const dom = addDays(a.sabado, 1);
  return textos.map((t) => {
    const esDomingo = fold(t).trim().startsWith('domingo');
    const marcas = [];
    FECHA.lastIndex = 0;
    let m;
    while ((m = FECHA.exec(t))) marcas.push({ i: m.index, f: m.index + m[0].length, nuevo: fechaLarga(esDomingo ? dom : a.sabado) });
    const s = t.search(SENOR);
    if (s >= 0) {
      const ini = s + t.slice(s).match(SENOR)[0].length;
      const mm = t.slice(ini).match(/^(.*?)\s*C\s*\.?\s*C\s*\.?\s*:?\s*(\d{10})/);
      if (mm) {
        const sigue = t[ini + mm[0].length];
        marcas.push({ i: ini, f: ini + mm[0].length, nuevo: `${a.completo} CC. ${a.cedula}` + (sigue && /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(sigue) ? ' ' : '') });
      }
    }
    marcas.sort((x, y) => x.i - y.i);
    const partes = [];
    let pos = 0;
    for (const mk of marcas) {
      if (mk.i < pos) continue;
      if (mk.i > pos) partes.push({ t: t.slice(pos, mk.i) });
      partes.push({ t: mk.nuevo, fill: true });
      pos = mk.f;
    }
    if (pos < t.length) partes.push({ t: t.slice(pos) });
    return partes;
  });
}

export function tapar(c) {
  const s = String(c || '');
  return s.length >= 10 ? s.slice(0, 2) + '••••••' + s.slice(-2) : s;
}
