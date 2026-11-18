const FOTO = /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i;

async function leer(blob, desde, largo) {
  return new DataView(await blob.slice(desde, desde + largo).arrayBuffer());
}

function fechaDos(fecha, hora) {
  const y = 1980 + (fecha >> 9);
  const m = ((fecha >> 5) & 15) - 1;
  const d = fecha & 31;
  if (m < 0 || m > 11 || d < 1) return Date.now();
  return new Date(y, m, d, hora >> 11, (hora >> 5) & 63, (hora & 31) * 2).getTime();
}

const tipoDe = (n) => (/\.png$/i.test(n) ? 'image/png' : /\.webp$/i.test(n) ? 'image/webp' : /\.(heic|heif)$/i.test(n) ? 'image/heic' : /\.gif$/i.test(n) ? 'image/gif' : 'image/jpeg');

export async function leerZip(blob) {
  const tam = blob.size;
  const cola = Math.min(tam, 65557);
  const fin = await leer(blob, tam - cola, cola);
  let eocd = -1;
  for (let i = cola - 22; i >= 0; i--)
    if (fin.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) throw new Error('Ese archivo no es un zip válido.');
  let total = fin.getUint16(eocd + 10, true);
  let dirTam = fin.getUint32(eocd + 12, true);
  let dirIni = fin.getUint32(eocd + 16, true);
  if (total === 0xffff || dirIni === 0xffffffff) {
    const loc = eocd - 20;
    if (loc < 0 || fin.getUint32(loc, true) !== 0x07064b50) throw new Error('Ese zip es muy grande para leerlo así. Descomprímelo y elige la carpeta.');
    const z64 = Number(fin.getBigUint64(loc + 8, true));
    const r = await leer(blob, z64, 56);
    total = Number(r.getBigUint64(32, true));
    dirTam = Number(r.getBigUint64(40, true));
    dirIni = Number(r.getBigUint64(48, true));
  }
  const dir = await leer(blob, dirIni, dirTam);
  const utf8 = new TextDecoder('utf-8');
  const estricto = new TextDecoder('utf-8', { fatal: true });
  const viejo = new TextDecoder('windows-1252');
  const nombreDe = (bytes, banderas) => {
    if (banderas & 0x800) return utf8.decode(bytes);
    try {
      return estricto.decode(bytes);
    } catch {
      return viejo.decode(bytes);
    }
  };
  const entradas = [];
  let p = 0;
  for (let k = 0; k < total && p + 46 <= dir.byteLength; k++) {
    if (dir.getUint32(p, true) !== 0x02014b50) break;
    const banderas = dir.getUint16(p + 8, true);
    const metodo = dir.getUint16(p + 10, true);
    const hora = dir.getUint16(p + 12, true);
    const fecha = dir.getUint16(p + 14, true);
    let comp = dir.getUint32(p + 20, true);
    let real = dir.getUint32(p + 24, true);
    const nLen = dir.getUint16(p + 28, true);
    const xLen = dir.getUint16(p + 30, true);
    const cLen = dir.getUint16(p + 32, true);
    let local = dir.getUint32(p + 42, true);
    const bytes = new Uint8Array(dir.buffer, dir.byteOffset + p + 46, nLen);
    const nombre = nombreDe(bytes, banderas);
    let x = p + 46 + nLen;
    const finX = x + xLen;
    while (x + 4 <= finX) {
      const id = dir.getUint16(x, true);
      const n = dir.getUint16(x + 2, true);
      if (id === 1) {
        let q = x + 4;
        if (real === 0xffffffff) {
          real = Number(dir.getBigUint64(q, true));
          q += 8;
        }
        if (comp === 0xffffffff) {
          comp = Number(dir.getBigUint64(q, true));
          q += 8;
        }
        if (local === 0xffffffff) local = Number(dir.getBigUint64(q, true));
      }
      x += 4 + n;
    }
    p += 46 + nLen + xLen + cLen;
    const base = nombre.split('/').pop();
    if (nombre.endsWith('/') || /(^|\/)__MACOSX\//.test(nombre) || base.startsWith('._') || base.startsWith('.') || !FOTO.test(base)) continue;
    if (banderas & 1) continue;
    entradas.push({ nombre: base, ruta: nombre, metodo, comp, real, local, fecha: fechaDos(fecha, hora) });
  }
  return {
    entradas,
    async archivo(e) {
      const h = await leer(blob, e.local, 30);
      if (h.getUint32(0, true) !== 0x04034b50) throw new Error('El zip está dañado en esta foto.');
      const ini = e.local + 30 + h.getUint16(26, true) + h.getUint16(28, true);
      const datos = blob.slice(ini, ini + e.comp);
      let b;
      if (e.metodo === 0) b = datos;
      else if (e.metodo === 8 && typeof DecompressionStream !== 'undefined') b = await new Response(datos.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
      else throw new Error('Esta foto está comprimida de una forma que no puedo abrir.');
      return new File([b], e.nombre, { type: tipoDe(e.nombre), lastModified: e.fecha });
    }
  };
}

export const esZip = (f) => /\.zip$/i.test(f.name || '') || /zip/.test(f.type || '');
export const esFoto = (f) => /^image\//.test(f.type || '') || FOTO.test(f.name || '');
