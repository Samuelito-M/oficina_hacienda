import { MESES } from './text.js';

export const COLORES_CASA = { 'Casa 1': '#24A9C2', 'Casa 2': '#E44D64', 'Casa 3': '#389B58', 'Casa 4': '#5170FF', 'Casa Esther': '#F39200' };
const ORDEN_CASAS = ['Casa 1', 'Casa 2', 'Casa 3', 'Casa 4', 'Casa Esther'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const TXT = {
  en: { anos: (n) => (n === 1 ? 'year old' : 'years old'), color: 'FAVORITE COLOR:', hobby: 'FAVORITE HOBBY:', ropa: 'CLOTHING SIZES:', zapatos: 'SHOE SIZE:', deseos: 'WISHES:', cumple: (m) => `${MONTHS[m]} birthdays`, cumpleN: (n) => `turns ${n}`, padres: 'HOUSE PARENTS', sin: 'No birthdays this month.' },
  es: { anos: (n) => (n === 1 ? 'año' : 'años'), color: 'COLOR FAVORITO:', hobby: 'PASATIEMPOS:', ropa: 'TALLA DE ROPA:', zapatos: 'TALLA DE ZAPATOS:', deseos: 'DESEOS:', cumple: (m) => `Cumpleaños de ${MESES[m]}`, cumpleN: (n) => `cumple ${n}`, padres: 'PADRES DE CASA', sin: 'No hay cumpleaños este mes.' }
};

function rgbDe(PDFLib, hex) {
  const h = String(hex || '#7A45C9').replace('#', '');
  return PDFLib.rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255);
}

function limpio(s) {
  return String(s ?? '')
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/[^\u0000-ɏ -⁯€™]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function envolver(texto, font, size, ancho) {
  const palabras = limpio(texto).split(' ').filter(Boolean);
  const lineas = [];
  let l = '';
  for (const p of palabras) {
    const prueba = l ? `${l} ${p}` : p;
    if (font.widthOfTextAtSize(prueba, size) <= ancho) l = prueba;
    else {
      if (l) lineas.push(l);
      l = p;
      while (font.widthOfTextAtSize(l, size) > ancho && l.length > 1) {
        let corte = l.length - 1;
        while (corte > 1 && font.widthOfTextAtSize(l.slice(0, corte), size) > ancho) corte--;
        lineas.push(l.slice(0, corte));
        l = l.slice(corte);
      }
    }
  }
  if (l) lineas.push(l);
  return lineas;
}

function ajustar(texto, font, max, ancho, min = 6) {
  let s = max;
  while (s > min && font.widthOfTextAtSize(limpio(texto), s) > ancho) s -= 0.5;
  return s;
}

async function preparar(PDFLib, fontkit, recursos, titulo) {
  const pdf = await PDFLib.PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(titulo);
  pdf.setCreator('Oficina Hacienda');
  const R = await pdf.embedFont(recursos.normal, { subset: true });
  const B = await pdf.embedFont(recursos.bold, { subset: true });
  const mano = recursos.mano ? await pdf.embedPng(recursos.mano) : null;
  const esther = recursos.esther ? await pdf.embedPng(recursos.esther) : null;
  const cache = new Map();
  const foto = async (url) => {
    if (!url) return null;
    if (cache.has(url)) return cache.get(url);
    let img = null;
    try {
      const b = Uint8Array.from(atob(url.split(',')[1] || ''), (c) => c.charCodeAt(0));
      img = await pdf.embedJpg(b);
    } catch {
      img = null;
    }
    cache.set(url, img);
    return img;
  };
  return { pdf, R, B, mano, esther, foto };
}

export function edadDe(n, hoy = new Date()) {
  const m = String(n.nacimiento || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    let e = hoy.getFullYear() - +m[1];
    if (hoy.getMonth() + 1 < +m[2] || (hoy.getMonth() + 1 === +m[2] && hoy.getDate() < +m[3])) e--;
    return e >= 0 ? e : null;
  }
  const x = String(n.notas || '').match(/edad[^\d]{0,30}(\d{1,2})/i);
  return x ? +x[1] : null;
}

function apellido(n) {
  const p = limpio(n.nombre).split(' ');
  return p.length > 1 ? p.slice(1).join(' ') : '';
}

function notaCorta(n) {
  const t = limpio(n.notas || '')
    .replace(/edad[^·]*?(\d{1,2})\s*·?/i, '')
    .replace(/^[·\s]+|[·\s]+$/g, '');
  return t.slice(0, 40);
}

function dibujarFoto(page, img, x, y, w, h, P, { sombra = true, iniciales = '' } = {}) {
  if (sombra) page.drawRectangle({ x: x + 1.2, y: y - 1.2, width: w, height: h, color: P.rgb(0, 0, 0), opacity: 0.12 });
  if (img) {
    const r = img.width / img.height;
    const rr = w / h;
    let dw = w;
    let dh = h;
    if (r > rr) dw = h * r;
    else dh = w / r;
    page.drawRectangle({ x, y, width: w, height: h, color: P.rgb(1, 1, 1) });
    page.drawImage(img, { x: x + (w - dw) / 2, y: y + (h - dh) / 2, width: dw, height: dh });
  } else {
    page.drawRectangle({ x, y, width: w, height: h, color: P.rgb(0.91, 0.89, 0.86) });
    if (iniciales) return iniciales;
  }
  return '';
}

export async function generarDirectorio({ ninos, casas = [], fotos = {}, idioma = 'en', soloCasa = '' }, PDFLib, fontkit, recursos) {
  const T = TXT[idioma] || TXT.en;
  const P = PDFLib;
  const { pdf, R, B, mano, esther, foto } = await preparar(P, fontkit, recursos, 'Directorio Hacienda of Hope');
  const W = 360;
  const H = 504;
  const crema = P.rgb(1, 249 / 255, 244 / 255);
  const tinta = P.rgb(0.13, 0.13, 0.13);
  const gris = P.rgb(0.4, 0.4, 0.4);
  const datosCasa = new Map(casas.map((c) => [c.casa, c]));
  const nombresCasas = Array.from(new Set([...ORDEN_CASAS, ...ninos.map((n) => n.casa).filter(Boolean), ...casas.map((c) => c.casa)])).filter((c) => (!soloCasa || c === soloCasa) && (ninos.some((n) => n.casa === c) || datosCasa.has(c)));
  if (!nombresCasas.length) throw new Error('No hay casas con niños para el directorio.');
  for (const casa of nombresCasas) {
    const color = rgbDe(P, COLORES_CASA[casa] || '#7A45C9');
    const lista = ninos.filter((n) => n.casa === casa).sort((a, b) => apellido(a).localeCompare(apellido(b), 'es') || a.nombre.localeCompare(b.nombre, 'es'));
    const dc = datosCasa.get(casa);
    const fotoPadres = dc && dc.conFoto ? await foto(fotos[`casa:${casa}`]) : null;
    let i = 0;
    let primera = true;
    while (primera || i < lista.length) {
      const page = pdf.addPage([W, H]);
      page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: crema });
      let y = H - 22;
      if (casa === 'Casa Esther' && esther) {
        const w = 150;
        const h = (esther.height / esther.width) * w;
        page.drawImage(esther, { x: (W - w) / 2, y: y - h, width: w, height: h });
        y -= h + 10;
      } else {
        const t = limpio(casa).toUpperCase();
        const size = ajustar(t, B, 30, W - 110, 16);
        const tw = B.widthOfTextAtSize(t, size);
        const mw = mano ? size * 1.15 : 0;
        const x0 = (W - tw - mw - 6) / 2;
        if (mano) page.drawImage(mano, { x: x0, y: y - mw + 2, width: mw * (mano.width / mano.height), height: mw });
        page.drawText(t, { x: x0 + mw + 6, y: y - size * 0.82, size, font: B, color });
        y -= size + 14;
      }
      if (primera && dc && (dc.padres || dc.bio || fotoPadres)) {
        page.drawText(limpio(dc.padres || T.padres).toUpperCase(), { x: 18, y: y - 7, size: 7, font: B, color: tinta });
        y -= 12;
        const fw = 112;
        const fh = 84;
        if (fotoPadres) dibujarFoto(page, fotoPadres, 18, y - fh, fw, fh, P);
        const tx = fotoPadres ? 18 + fw + 12 : 18;
        const lineas = envolver(dc.bio || '', R, 7.2, W - tx - 18).slice(0, 11);
        lineas.forEach((l, k) => page.drawText(l, { x: tx, y: y - 12 - k * 10, size: 7.2, font: R, color: tinta }));
        y -= Math.max(fotoPadres ? fh : 0, lineas.length * 10 + 6) + 16;
      }
      const cols = 4;
      const gap = 12;
      const cw = (W - 36 - gap * (cols - 1)) / cols;
      const ch = cw * (4 / 3);
      const alto = ch + 30;
      const filasCaben = Math.max(1, Math.floor((y - 18) / alto));
      const cuantos = Math.min(lista.length - i, filasCaben * cols);
      for (let k = 0; k < cuantos; k++, i++) {
        const n = lista[i];
        const col = k % cols;
        const fila = Math.floor(k / cols);
        const x = 18 + col * (cw + gap);
        const top = y - fila * alto;
        const img = n.conFoto ? await foto(fotos[n.id]) : null;
        const ini = dibujarFoto(page, img, x, top - ch, cw, ch, P, { iniciales: limpio(n.nombre).split(' ').map((p) => p[0]).slice(0, 2).join('') });
        if (ini) page.drawText(ini, { x: x + cw / 2 - B.widthOfTextAtSize(ini, 16) / 2, y: top - ch / 2 - 6, size: 16, font: B, color: gris });
        const nombre = limpio(n.nombre).toUpperCase();
        const sn = ajustar(nombre, R, 5.6, cw + 8, 4);
        page.drawText(nombre, { x: x + cw / 2 - R.widthOfTextAtSize(nombre, sn) / 2, y: top - ch - 9, size: sn, font: R, color: tinta });
        const e = edadDe(n);
        if (e != null) {
          const t = `${e} ${T.anos(e)}`;
          page.drawText(t, { x: x + cw / 2 - R.widthOfTextAtSize(t, 5) / 2, y: top - ch - 16.5, size: 5, font: R, color: gris });
        }
        const nota = notaCorta(n);
        if (nota) {
          const sz = ajustar(nota, R, 4.4, cw + 6, 3.5);
          page.drawText(nota, { x: x + cw / 2 - R.widthOfTextAtSize(nota, sz) / 2, y: top - ch - 23, size: sz, font: R, color: gris });
        }
      }
      primera = false;
      if (!lista.length) break;
    }
  }
  return pdf.save();
}

export async function generarHojasRegalo({ ninos, fotos = {}, idioma = 'en' }, PDFLib, fontkit, recursos) {
  const T = TXT[idioma] || TXT.en;
  const P = PDFLib;
  const { pdf, R, B, mano, foto } = await preparar(P, fontkit, recursos, idioma === 'en' ? 'Gift Info Sheets' : 'Hojas de regalos');
  const W = 612;
  const H = 792;
  const negro = P.rgb(0.1, 0.1, 0.1);
  const gris = P.rgb(0.35, 0.35, 0.35);
  const linea = P.rgb(0.8, 0.8, 0.8);
  if (!ninos.length) throw new Error('No hay niños para las hojas.');
  for (const n of ninos) {
    const page = pdf.addPage([W, H]);
    const color = rgbDe(P, COLORES_CASA[n.casa] || '#7A45C9');
    const primer = limpio(n.nombre).split(' ')[0].toUpperCase();
    const sn = ajustar(primer, B, 64, 300, 28);
    page.drawText(primer, { x: 48, y: H - 70 - sn * 0.75, size: sn, font: B, color: negro });
    const desc = envolver(n.descripcion || '', R, 10.5, 290).slice(0, 12);
    desc.forEach((l, k) => page.drawText(l, { x: 48, y: H - 110 - sn * 0.75 - k * 14.5, size: 10.5, font: R, color: negro }));
    const px = 372;
    const pw = 186;
    const ph = 196;
    const py = H - 56 - ph;
    page.drawRectangle({ x: px + 3, y: py - 3, width: pw, height: ph, color: P.rgb(0, 0, 0), opacity: 0.15 });
    page.drawRectangle({ x: px, y: py, width: pw, height: ph, color: P.rgb(1, 1, 1), borderColor: P.rgb(0.88, 0.88, 0.88), borderWidth: 0.6 });
    const img = n.conFoto ? await foto(fotos[n.id]) : null;
    const iw = pw - 20;
    const ih = ph - 48;
    if (img) dibujarFoto(page, img, px + 10, py + 38, iw, ih, P, { sombra: false });
    else {
      page.drawRectangle({ x: px + 10, y: py + 38, width: iw, height: ih, color: P.rgb(0.93, 0.92, 0.9) });
      const t = idioma === 'en' ? 'Photo' : 'Foto';
      page.drawText(t, { x: px + pw / 2 - R.widthOfTextAtSize(t, 12) / 2, y: py + 38 + ih / 2, size: 12, font: R, color: gris });
    }
    page.drawRectangle({ x: px + pw / 2 - 34, y: py + ph - 10, width: 68, height: 22, color: P.rgb(0.93, 0.86, 0.68), opacity: 0.85, rotate: P.degrees(-3) });
    for (let k = 0; k < 9; k++) page.drawCircle({ x: px + 20 + k * 18.5, y: py + 20, size: 3.2, color: k % 3 === 0 ? color : k % 3 === 1 ? P.rgb(1, 0.77, 0.2) : P.rgb(0.85, 0.3, 0.35) });
    const e = edadDe(n);
    if (e != null) {
      const t = String(e);
      const se = 62;
      const tw = B.widthOfTextAtSize(t, se);
      const ex = px + pw - tw - 34;
      const ey = py - 70;
      page.drawText(t, { x: ex, y: ey, size: se, font: B, color: negro });
      const pal = T.anos(e).split(' ');
      pal.forEach((p, k) => page.drawText(p, { x: ex + tw + 4, y: ey + 34 - k * 15, size: 14, font: R, color: negro }));
    }
    const campo = (titulo, valor, x, y, ancho, alin = 'izq') => {
      const ts = ajustar(titulo, B, 24, ancho, 12);
      const tw = B.widthOfTextAtSize(titulo, ts);
      page.drawText(titulo, { x: alin === 'der' ? x + ancho - tw : x, y, size: ts, font: B, color: negro });
      const ls = envolver(valor || '', R, 11, ancho).slice(0, 4);
      if (!ls.length) page.drawLine({ start: { x: alin === 'der' ? x + ancho - 150 : x, y: y - 18 }, end: { x: alin === 'der' ? x + ancho : x + 150, y: y - 18 }, thickness: 0.6, color: linea });
      ls.forEach((l, k) => {
        const lw = R.widthOfTextAtSize(l, 11);
        page.drawText(l, { x: alin === 'der' ? x + ancho - lw : x + 8, y: y - 17 - k * 14, size: 11, font: R, color: gris });
      });
    };
    const y1 = 400;
    campo(T.color, n.colorFavorito, 36, y1, 250);
    campo(T.hobby, n.pasatiempos, 316, y1, 260, 'der');
    campo(T.ropa, n.tallaRopa, 36, y1 - 90, 250);
    campo(T.zapatos, n.tallaZapatos, 316, y1 - 90, 260, 'der');
    page.drawText(T.deseos, { x: 36, y: y1 - 180, size: 24, font: B, color: negro });
    const ds = envolver(n.deseos || '', R, 11, 300).slice(0, 8);
    if (ds.length) ds.forEach((l, k) => page.drawText(l, { x: 44, y: y1 - 198 - k * 14, size: 11, font: R, color: gris }));
    else for (let k = 0; k < 6; k++) page.drawLine({ start: { x: 44, y: y1 - 204 - k * 22 }, end: { x: 330, y: y1 - 204 - k * 22 }, thickness: 0.6, color: linea });
    const caja = (x, y, w, h, c) => {
      page.drawRectangle({ x, y, width: w, height: h, color: c });
      page.drawRectangle({ x: x + w / 2 - 5, y, width: 10, height: h, color: P.rgb(0.95, 0.95, 0.95), opacity: 0.85 });
      page.drawRectangle({ x: x - 3, y: y + h - 12, width: w + 6, height: 12, color: c, opacity: 0.9 });
    };
    caja(392, 46, 92, 84, color);
    caja(470, 46, 96, 120, P.rgb(1, 0.77, 0.2));
    caja(420, 120, 70, 60, P.rgb(0.85, 0.3, 0.35));
    if (mano) page.drawImage(mano, { x: 40, y: 40, width: 34 * (mano.width / mano.height), height: 34 });
    page.drawText('Hacienda of Hope', { x: 80, y: 52, size: 10, font: B, color: gris });
  }
  return pdf.save();
}

export async function generarCumpleMes({ ninos, fotos = {}, mes, anio, idioma = 'es' }, PDFLib, fontkit, recursos) {
  const T = TXT[idioma] || TXT.es;
  const P = PDFLib;
  const { pdf, R, B, mano, foto } = await preparar(P, fontkit, recursos, T.cumple(mes));
  const W = 612;
  const H = 792;
  const crema = P.rgb(1, 249 / 255, 244 / 255);
  const tinta = P.rgb(0.15, 0.15, 0.15);
  const gris = P.rgb(0.4, 0.4, 0.4);
  const lista = ninos
    .map((n) => {
      const m = String(n.nacimiento || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      return m && +m[2] === mes + 1 ? { n, dia: +m[3], cumple: anio - +m[1] } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.dia - b.dia || a.n.nombre.localeCompare(b.n.nombre, 'es'));
  let page;
  let y;
  const nueva = () => {
    page = pdf.addPage([W, H]);
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: crema });
    for (let k = 0; k < 26; k++) {
      const c = [P.rgb(0.14, 0.66, 0.76), P.rgb(0.89, 0.3, 0.39), P.rgb(0.22, 0.61, 0.35), P.rgb(0.32, 0.44, 1), P.rgb(1, 0.77, 0.2)][k % 5];
      page.drawCircle({ x: 30 + ((k * 97) % 560), y: H - 20 - ((k * 37) % 70), size: 3 + (k % 3), color: c, opacity: 0.8 });
    }
    y = H - 60;
  };
  nueva();
  if (mano) page.drawImage(mano, { x: W / 2 - 24 * (mano.width / mano.height), y: y - 52, width: 48 * (mano.width / mano.height), height: 48 });
  y -= 70;
  const titulo = limpio(T.cumple(mes));
  const ts = ajustar(titulo, B, 40, W - 80, 20);
  page.drawText(titulo, { x: W / 2 - B.widthOfTextAtSize(titulo, ts) / 2, y: y - ts, size: ts, font: B, color: P.rgb(0.48, 0.27, 0.79) });
  y -= ts + 16;
  const sub = String(anio);
  page.drawText(sub, { x: W / 2 - R.widthOfTextAtSize(sub, 14) / 2, y: y - 10, size: 14, font: R, color: gris });
  y -= 40;
  if (!lista.length) {
    page.drawText(T.sin, { x: W / 2 - R.widthOfTextAtSize(T.sin, 16) / 2, y: y - 40, size: 16, font: R, color: gris });
    return pdf.save();
  }
  const alto = lista.length > 10 ? 52 : lista.length > 6 ? 62 : 74;
  const fw = alto - 14;
  for (const { n, dia, cumple } of lista) {
    if (y - alto < 30) nueva();
    const color = rgbDe(P, COLORES_CASA[n.casa] || '#7A45C9');
    page.drawRectangle({ x: 60, y: y - alto + 6, width: W - 120, height: alto - 8, color: P.rgb(1, 1, 1), borderColor: P.rgb(0.9, 0.88, 0.84), borderWidth: 0.6 });
    const r = (alto - 20) / 2;
    page.drawCircle({ x: 60 + 14 + r, y: y - alto / 2 + 2, size: r, color });
    const d = String(dia);
    const ds = r * 0.95;
    page.drawText(d, { x: 60 + 14 + r - B.widthOfTextAtSize(d, ds) / 2, y: y - alto / 2 + 2 - ds * 0.36, size: ds, font: B, color: P.rgb(1, 1, 1) });
    let tx = 60 + 14 + 2 * r + 14;
    const img = n.conFoto ? await foto(fotos[n.id]) : null;
    if (img) {
      dibujarFoto(page, img, tx, y - alto + 13, fw * 0.75, fw - 6, P, { sombra: false });
      tx += fw * 0.75 + 14;
    }
    const nom = limpio(n.nombre);
    const ns = ajustar(nom, B, alto > 60 ? 18 : 14, W - 60 - tx - 20, 9);
    page.drawText(nom, { x: tx, y: y - alto / 2 + 4, size: ns, font: B, color: tinta });
    const det = [T.cumpleN(cumple), n.casa].filter(Boolean).join(' · ');
    page.drawText(det, { x: tx, y: y - alto / 2 - 12, size: alto > 60 ? 11 : 9.5, font: R, color: gris });
    y -= alto;
  }
  return pdf.save();
}
