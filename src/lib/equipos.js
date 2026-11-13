import { edadDe } from './documentos.js';
import { fold } from './text.js';

export const COLORES_EQUIPO = [
  ['Rojo', '#E53935'],
  ['Azul', '#1E88E5'],
  ['Verde', '#43A047'],
  ['Amarillo', '#F2B600'],
  ['Morado', '#8E24AA'],
  ['Naranja', '#FB8C00'],
  ['Rosado', '#EC407A'],
  ['Celeste', '#00ACC1'],
  ['Café', '#6D4C41'],
  ['Gris', '#607D8B']
];

const COLORES_GRUPO = ['#5B6CFF', '#E4568A', '#2E9E6B', '#E08A00', '#7E57C2', '#00897B', '#C0392B', '#3D7CC9'];

export const MAX_EQUIPOS = COLORES_EQUIPO.length;

export function sexoDe(n) {
  const s = String(n.sexo || '').trim().toUpperCase();
  return s === 'F' || s === 'M' ? s : '';
}

export function apellido(n) {
  const p = String(n.nombre || '').trim().split(/\s+/);
  return p.length > 1 ? fold(p[p.length - 1]) : '';
}

export function cortesDe(texto) {
  const nums = String(texto || '')
    .split(/[^\d]+/)
    .filter(Boolean)
    .map(Number)
    .filter((x) => x >= 0 && x < 30);
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

export function rangos(cortes) {
  const r = [];
  let desde = 0;
  for (const c of cortes) {
    if (c < desde) continue;
    r.push({ desde, hasta: c, nombre: desde === c ? `${c} años` : `${desde} a ${c} años` });
    desde = c + 1;
  }
  r.push({ desde, hasta: Infinity, nombre: cortes.length ? `${desde} años o más` : 'Todas las edades' });
  return r;
}

export function rangoDe(edad, lista) {
  if (edad == null) return null;
  return lista.find((r) => edad >= r.desde && edad <= r.hasta) || null;
}

export function filtrar(lista, { sexo = '', desde = '', hasta = '', fuera = [] } = {}, hoy = new Date()) {
  const quitar = new Set(fuera);
  const d = desde === '' || desde == null ? null : +desde;
  const h = hasta === '' || hasta == null ? null : +hasta;
  return lista.filter((n) => {
    if (quitar.has(n.id)) return false;
    if (sexo && sexoDe(n) !== sexo) return false;
    if (d != null || h != null) {
      const e = edadDe(n, hoy);
      if (e == null) return false;
      if (d != null && e < d) return false;
      if (h != null && e > h) return false;
    }
    return true;
  });
}

const porEdadNombre = (hoy) => (a, b) => (edadDe(a, hoy) ?? 99) - (edadDe(b, hoy) ?? 99) || a.nombre.localeCompare(b.nombre, 'es');

export function separar(lista, { porSexo = false, porEdad = false, porCasa = false, cortes = [], casas = [] } = {}, hoy = new Date()) {
  const rs = rangos(cortes);
  const grupos = new Map();
  for (const n of lista) {
    const partes = [];
    const orden = [];
    if (porSexo) {
      const s = sexoDe(n);
      partes.push(s === 'F' ? 'Niñas' : s === 'M' ? 'Niños' : 'Sin marcar niño/niña');
      orden.push(s === 'F' ? 0 : s === 'M' ? 1 : 2);
    }
    if (porEdad) {
      const r = rangoDe(edadDe(n, hoy), rs);
      partes.push(r ? r.nombre : 'Sin edad');
      orden.push(r ? rs.indexOf(r) : 99);
    }
    if (porCasa) {
      const i = casas.indexOf(n.casa);
      partes.push(n.casa || 'Sin casa');
      orden.push(i < 0 ? 99 : i);
    }
    const k = orden.join('|') + '|' + partes.join(' · ');
    if (!grupos.has(k)) grupos.set(k, { nombre: partes.join(' · ') || 'Todos', orden, ninos: [] });
    grupos.get(k).ninos.push(n);
  }
  return Array.from(grupos.values())
    .sort((a, b) => {
      for (let i = 0; i < a.orden.length; i++) if (a.orden[i] !== b.orden[i]) return a.orden[i] - b.orden[i];
      return 0;
    })
    .map((g, i) => ({ nombre: g.nombre, color: COLORES_GRUPO[i % COLORES_GRUPO.length], ninos: g.ninos.sort(porEdadNombre(hoy)) }));
}

function generador(semilla) {
  let s = (semilla >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function armarEquipos(lista, { n = 2, mezclarSexo = true, separarHermanos = true, semilla = 1 } = {}, hoy = new Date()) {
  const cuantos = Math.max(2, Math.min(MAX_EQUIPOS, Math.floor(+n) || 2, Math.max(2, lista.length)));
  const azar = generador(semilla);
  const edades = lista.map((x) => edadDe(x, hoy)).filter((e) => e != null).sort((a, b) => a - b);
  const mediana = edades.length ? edades[Math.floor(edades.length / 2)] : 10;
  const info = lista.map((x) => {
    const e = edadDe(x, hoy);
    return { x, e: e == null ? mediana : e, s: sexoDe(x), ap: apellido(x), r: azar() };
  });
  const tandas = mezclarSexo ? ['F', 'M', ''].map((s) => info.filter((i) => i.s === s)) : [info];
  const equipos = Array.from({ length: cuantos }, (_, i) => ({ i, ninos: [], suma: 0, porSexo: { F: 0, M: 0, '': 0 }, apellidos: new Map(), r: azar() }));
  for (const tanda of tandas) {
    tanda.sort((a, b) => b.e + b.r * 1.6 - (a.e + a.r * 1.6));
    for (const k of tanda) {
      const puntaje = (t) => [mezclarSexo ? t.porSexo[k.s] : 0, t.ninos.length, separarHermanos && k.ap ? t.apellidos.get(k.ap) || 0 : 0, t.suma, t.r];
      let mejor = equipos[0];
      let pm = puntaje(mejor);
      for (const t of equipos.slice(1)) {
        const p = puntaje(t);
        for (let j = 0; j < p.length; j++) {
          if (p[j] !== pm[j]) {
            if (p[j] < pm[j]) {
              mejor = t;
              pm = p;
            }
            break;
          }
        }
      }
      mejor.ninos.push(k);
      mejor.suma += k.e;
      mejor.porSexo[k.s]++;
      if (k.ap) mejor.apellidos.set(k.ap, (mejor.apellidos.get(k.ap) || 0) + 1);
    }
  }
  const media = info.length ? info.reduce((a, k) => a + k.e, 0) / info.length : 0;
  const choques = (t) => {
    let c = 0;
    for (const v of t.apellidos.values()) if (v > 1) c += (v * (v - 1)) / 2;
    return c;
  };
  const costo = (t) => (separarHermanos ? choques(t) * 1000 : 0) + (t.suma - t.ninos.length * media) ** 2;
  const mover = (t, k, signo) => {
    t.suma += signo * k.e;
    if (k.ap) t.apellidos.set(k.ap, (t.apellidos.get(k.ap) || 0) + signo);
  };
  for (let vuelta = 0, mejoro = true; mejoro && vuelta < 30; vuelta++) {
    mejoro = false;
    for (let a = 0; a < equipos.length; a++) {
      for (let b = a + 1; b < equipos.length; b++) {
        const A = equipos[a];
        const B = equipos[b];
        for (let i = 0; i < A.ninos.length; i++) {
          for (let j = 0; j < B.ninos.length; j++) {
            const x = A.ninos[i];
            const y = B.ninos[j];
            if (mezclarSexo && x.s !== y.s) continue;
            if (x.e === y.e && x.ap === y.ap) continue;
            const antes = costo(A) + costo(B);
            mover(A, x, -1);
            mover(B, y, -1);
            mover(A, y, 1);
            mover(B, x, 1);
            if (costo(A) + costo(B) < antes - 1e-9) {
              A.ninos[i] = y;
              B.ninos[j] = x;
              mejoro = true;
            } else {
              mover(A, y, -1);
              mover(B, x, -1);
              mover(A, x, 1);
              mover(B, y, 1);
            }
          }
        }
      }
    }
  }
  const orden = equipos.map((t) => t.i).sort(() => azar() - 0.5);
  return equipos.map((t, j) => {
    const [nombre, color] = COLORES_EQUIPO[orden[j] % COLORES_EQUIPO.length];
    return { nombre: `Equipo ${nombre}`, color, ninos: t.ninos.map((k) => k.x).sort(porEdadNombre(hoy)) };
  });
}

export function resumenGrupo(g, hoy = new Date()) {
  const edades = g.ninos.map((n) => edadDe(n, hoy)).filter((e) => e != null);
  return {
    total: g.ninos.length,
    F: g.ninos.filter((n) => sexoDe(n) === 'F').length,
    M: g.ninos.filter((n) => sexoDe(n) === 'M').length,
    promedio: edades.length ? Math.round((edades.reduce((a, b) => a + b, 0) / edades.length) * 10) / 10 : null
  };
}

export function textoResumen(r) {
  const p = [`${r.total} en total`];
  if (r.F || r.M) p.push(`${r.F} ${r.F === 1 ? 'niña' : 'niñas'}, ${r.M} ${r.M === 1 ? 'niño' : 'niños'}`);
  if (r.promedio != null) p.push(`edad promedio ${String(r.promedio).replace('.', ',')}`);
  return p.join(' · ');
}

export function textoGrupos(grupos, titulo, hoy = new Date()) {
  const out = [titulo, ''];
  for (const g of grupos) {
    out.push(`*${g.nombre}* (${g.ninos.length})`);
    for (const n of g.ninos) {
      const e = edadDe(n, hoy);
      out.push(`• ${n.nombre}${e != null ? ` (${e})` : ''}`);
    }
    out.push('');
  }
  return out.join('\n').trim();
}

function rgb(PDFLib, hex) {
  const h = hex.replace('#', '');
  return PDFLib.rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255);
}

function cortar(texto, font, size, max) {
  if (font.widthOfTextAtSize(texto, size) <= max) return texto;
  let t = texto;
  while (t.length > 1 && font.widthOfTextAtSize(t + '…', size) > max) t = t.slice(0, -1);
  return t + '…';
}

const MAX_CAJA = 32;

export async function generarPdfGrupos(originales, { titulo, subtitulo = '' }, PDFLib, fontkit, recursos, hoy = new Date()) {
  const total = originales.reduce((a, g) => a + g.ninos.length, 0);
  const grupos = [];
  for (const g of originales) {
    if (g.ninos.length <= MAX_CAJA) grupos.push({ ...g, desde: 0, total: g.ninos.length });
    else for (let i = 0; i < g.ninos.length; i += MAX_CAJA) grupos.push({ ...g, nombre: i ? `${g.nombre} (sigue)` : g.nombre, ninos: g.ninos.slice(i, i + MAX_CAJA), desde: i, total: g.ninos.length });
  }
  const pdf = await PDFLib.PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const R = await pdf.embedFont(recursos.normal, { subset: true });
  const B = await pdf.embedFont(recursos.bold, { subset: true });
  const W = 792;
  const H = 612;
  const M = 32;
  const gap = 14;
  const cols = grupos.length <= 3 ? Math.max(grupos.length, 1) : grupos.length === 4 ? 4 : grupos.length <= 6 ? 3 : 4;
  const colW = (W - 2 * M - gap * (cols - 1)) / cols;
  const maxNinos = Math.max(1, ...grupos.map((g) => g.ninos.length));
  const filasDeCajas = Math.ceil(grupos.length / cols);
  const disponible = H - 2 * M - 46 - gap * (filasDeCajas - 1);
  let linea = Math.min(19, Math.max(12, (disponible / filasDeCajas - 42) / maxNinos));
  const size = Math.max(9, Math.min(14, linea * 0.72));
  const gris = PDFLib.rgb(0.42, 0.45, 0.5);
  const tinta = PDFLib.rgb(0.12, 0.14, 0.18);
  const blanco = PDFLib.rgb(1, 1, 1);

  let page;
  let y;
  const nuevaPagina = (primera) => {
    page = pdf.addPage([W, H]);
    y = H - M;
    page.drawText(titulo, { x: M, y: y - 20, size: 20, font: B, color: tinta });
    const sub = [subtitulo, `${total} niños en ${originales.length} ${originales.length === 1 ? 'grupo' : 'grupos'}`].filter(Boolean).join(' · ');
    if (primera) page.drawText(cortar(sub, R, 10, W - 2 * M), { x: M, y: y - 36, size: 10, font: R, color: gris });
    y -= primera ? 50 : 32;
  };
  nuevaPagina(true);

  for (let f = 0; f < filasDeCajas; f++) {
    const fila = grupos.slice(f * cols, f * cols + cols);
    const alto = 36 + Math.max(...fila.map((g) => g.ninos.length), 1) * linea + 10;
    if (y - alto < M && y < H - M - 60) nuevaPagina(false);
    fila.forEach((g, j) => {
      const x = M + j * (colW + gap);
      const c = rgb(PDFLib, g.color);
      page.drawRectangle({ x, y: y - alto, width: colW, height: alto, borderColor: c, borderWidth: 1.5, color: blanco });
      page.drawRectangle({ x, y: y - 30, width: colW, height: 30, color: c });
      const cab = cortar(g.nombre, B, 13, colW - 46);
      page.drawText(cab, { x: x + 10, y: y - 20, size: 13, font: B, color: blanco });
      const cnt = String(g.total);
      page.drawText(cnt, { x: x + colW - 10 - B.widthOfTextAtSize(cnt, 13), y: y - 20, size: 13, font: B, color: blanco });
      let yy = y - 30 - linea + 2;
      g.ninos.forEach((n, i) => {
        if (yy < M - 4) return;
        const e = edadDe(n, hoy);
        const edadTxt = e != null ? `${e}` : '';
        const ancho = edadTxt ? R.widthOfTextAtSize(edadTxt, size) : 0;
        const num = `${g.desde + i + 1}.`;
        page.drawText(num, { x: x + 27 - R.widthOfTextAtSize(num, size * 0.85), y: yy, size: size * 0.85, font: R, color: gris });
        page.drawText(cortar(n.nombre, R, size, colW - 46 - ancho), { x: x + 31, y: yy, size, font: R, color: tinta });
        if (edadTxt) page.drawText(edadTxt, { x: x + colW - 10 - ancho, y: yy, size, font: R, color: gris });
        yy -= linea;
      });
    });
    y -= alto + gap;
  }
  return pdf.save();
}
