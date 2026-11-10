import { fechaCorta, fold } from './text.js';

export const SECCIONES = [
  ['COCINA', ['Los mesones están limpios', 'Los platos están lavados  y guardados', 'El piso está limpio', 'El comedor está limpio', 'El tacho de basura está limpio y vacíos', 'El tacho de basura organica está vacío', 'La refrigeradora está libre de comida podrida y limpio', 'Electrodomesticos en buen estado', '@fruta']],
  ['SALA', ['Los sillones están libres de basura y juguetes', 'Las cobijas están limpios, las sabanas dobladas', 'La chimenea está limpia, libre de basura', 'El piso está limpio']],
  ['LAVANDERÍA', ['No hay ropa encima de la lavadora o secadora', 'La ropa sucia está en la cesta']],
  ['GRADAS', ['Están limpias,sin ningun tipo de basura u objetos.']],
  ['DORMITORIOS', ['Las camas están tendidas, sin ropa u objetos encima de las camas', 'No hay basura, zapatos o cualquier tipo de objetos debajo de la camas', 'La ropa está guardada correctamente en los cajones', 'Los cajones están libres de basura', 'La ropa sucia está en la cesta', 'Los pisos están limpios, libres de basura y manchas']],
  ['BAÑOS', ['Los lavamanos están limpios y haya jabón de manos', 'Las duchas están limpias', 'Los inodoros lavados', 'Los tachos de basura están vacíos', 'Los pisos están limpios, libres de basura y manchas']],
  ['DORMITORIO AUXILIAR', ['La cama está tendida', 'Los pisos están limpios, libres de basura y manchas']],
  ['PASILLOS EXTERIORES', ['Los pisos están limpios, libres de basura u objetos']]
];

function seguro(s) {
  return Array.from(String(s ?? ''))
    .map((c) => {
      const code = c.charCodeAt(0);
      if (code < 256 || '–—‘’“”•…€'.includes(c)) return c;
      return fold(c).replace(/[^\x20-\x7e]/g, '');
    })
    .join('');
}

export async function generarCambiosDeCasa(hojas, PDFLib) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const pdf = await PDFDocument.create();
  pdf.setTitle('Cambio de casa');
  pdf.setCreator('Oficina Hacienda');
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const negro = rgb(0, 0, 0);
  const gris = rgb(0.35, 0.35, 0.35);
  const rojo = rgb(0.86, 0, 0);

  for (const h of hojas) {
    const page = pdf.addPage([595.28, 841.89]);
    const W = page.getWidth();
    const H = page.getHeight();
    const x0 = 40;
    const ancho = W - 80;
    const cols = [0.44, 0.2, 0.18, 0.18].map((f) => f * ancho);
    const xs = [x0, x0 + cols[0], x0 + cols[0] + cols[1], x0 + cols[0] + cols[1] + cols[2], x0 + ancho];
    let y = H - 48;
    const linea = (xa, ya, xb, yb, g = 0.6) => page.drawLine({ start: { x: xa, y: ya }, end: { x: xb, y: yb }, thickness: g, color: negro });
    const texto = (t, x, yy, { f = reg, size = 8.6, color = negro, max = 0, centro = false } = {}) => {
      let s = size;
      const str = seguro(t);
      if (max) while (s > 5.5 && f.widthOfTextAtSize(str, s) > max) s -= 0.25;
      const w = f.widthOfTextAtSize(str, s);
      page.drawText(str, { x: centro ? x - w / 2 : x, y: yy, size: s, font: f, color });
    };
    const fila = (alto, celdas, unir = []) => {
      const yTop = y;
      const yBot = y - alto;
      linea(x0, yTop, x0 + ancho, yTop);
      linea(x0, yBot, x0 + ancho, yBot);
      linea(xs[0], yTop, xs[0], yBot);
      linea(xs[4], yTop, xs[4], yBot);
      for (let i = 1; i < 4; i++) if (!unir.includes(i)) linea(xs[i], yTop, xs[i], yBot);
      const base = yBot + (alto - 8.6) / 2 + 1.6;
      celdas.forEach((c, i) => {
        if (!c) return;
        const span = c.span || 1;
        const ancho2 = xs[i + span] - xs[i] - 6;
        if (c.centro) texto(c.t, (xs[i] + xs[i + span]) / 2, base + (c.dy || 0), { ...c, max: ancho2, centro: true });
        else texto(c.t, xs[i] + 3, base + (c.dy || 0), { ...c, max: ancho2 });
      });
      y = yBot;
    };

    const alto = 13.4;
    fila(20, [{ t: 'CAMBIO DE CASA', f: bold, size: 13, centro: true, span: 2, dy: -1.5 }, null, { t: fechaCorta(h.viernes), f: bold, centro: true }, { t: fechaCorta(h.domingo), f: bold, centro: true }], [1]);
    fila(alto, [{ t: `CASA # ${h.casa.replace(/^Casa\s+/i, '')}`, f: bold }, { t: h.nombres, f: bold }, { t: 'Viernes', f: bold, centro: true }, { t: 'domingo', f: bold, centro: true }]);
    for (const [sec, items] of SECCIONES) {
      fila(alto, [{ t: sec, f: bold, span: 2 }, null, { t: '////////////////', color: gris, centro: true, size: 7.5 }, { t: '////////////////', color: gris, centro: true, size: 7.5 }], [1]);
      for (const it of items) {
        if (it === '@fruta') fila(alto, [{ t: 'Frutas entregadas', color: rojo }, { t: 'entregado:', color: rojo }, null, { t: 'recibo :', color: rojo }]);
        else fila(alto, [{ t: it, span: 2 }, null, null, null], [1]);
      }
    }
    fila(alto, [{ t: 'Indicaciones:', f: bold, span: 4 }], [1, 2, 3]);
    for (let i = 0; i < 5; i++) fila(alto, [], [1, 2, 3]);
    fila(alto, [{ t: 'indicaciones Domingo:', f: bold, span: 4 }], [1, 2, 3]);
    for (let i = 0; i < 4; i++) fila(alto, [], [1, 2, 3]);
    fila(26, [{ t: 'Entrega Tutor 1: ___________________   Recibe Tutor 2. ___________________________', f: bold, span: 4, dy: -6 }], [1, 2, 3]);
    fila(26, [{ t: 'Entrega Tutor 2: ___________________   Recibe Tutor 1. ___________________________', f: bold, span: 4, dy: -6 }], [1, 2, 3]);
  }
  return pdf.save();
}
