export const LADO_GRANDE = 2048;
export const LADO_MINI = 360;

function fechaExif(buf) {
  const v = new DataView(buf);
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return '';
  let o = 2;
  while (o + 4 < v.byteLength) {
    const marca = v.getUint16(o);
    const largo = v.getUint16(o + 2);
    if (marca === 0xffe1 && v.getUint32(o + 4) === 0x45786966) return leerTiff(v, o + 10);
    if ((marca & 0xff00) !== 0xff00 || largo < 2) return '';
    o += 2 + largo;
  }
  return '';
}

function leerTiff(v, ini) {
  if (ini + 8 > v.byteLength) return '';
  const le = v.getUint16(ini) === 0x4949;
  const u16 = (p) => v.getUint16(p, le);
  const u32 = (p) => v.getUint32(p, le);
  const texto = (p, n) => {
    let s = '';
    for (let i = 0; i < n && p + i < v.byteLength; i++) {
      const c = v.getUint8(p + i);
      if (!c) break;
      s += String.fromCharCode(c);
    }
    return s;
  };
  const buscar = (dir, tags) => {
    const out = {};
    if (dir + 2 > v.byteLength) return out;
    const n = u16(dir);
    for (let i = 0; i < n; i++) {
      const e = dir + 2 + i * 12;
      if (e + 12 > v.byteLength) break;
      const tag = u16(e);
      if (tags.includes(tag)) out[tag] = { tipo: u16(e + 2), n: u32(e + 4), valor: e + 8 };
    }
    return out;
  };
  const ifd0 = buscar(ini + u32(ini + 4), [0x8769, 0x0132]);
  let fecha = '';
  if (ifd0[0x8769]) {
    const exif = buscar(ini + u32(ifd0[0x8769].valor), [0x9003, 0x9004]);
    const t = exif[0x9003] || exif[0x9004];
    if (t) fecha = texto(ini + u32(t.valor), 19);
  }
  if (!fecha && ifd0[0x0132]) fecha = texto(ini + u32(ifd0[0x0132].valor), 19);
  const m = fecha.match(/^(\d{4}):(\d{2}):(\d{2})/);
  return m && m[1] !== '0000' ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

const dosDigitos = (n) => String(n).padStart(2, '0');
const fechaLocal = (d) => `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;

async function huellaDe(buf) {
  try {
    const h = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
  } catch {
    return '';
  }
}

function cargarImagen(url) {
  return new Promise((ok, mal) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => mal(new Error('formato'));
    im.src = url;
  });
}

function achicar(im, lado, calidad) {
  const w = im.naturalWidth;
  const h = im.naturalHeight;
  const k = Math.min(1, lado / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(h * k));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(im, 0, 0, c.width, c.height);
  return { canvas: c, datos: c.toDataURL('image/jpeg', calidad) };
}

export async function prepararFoto(archivo) {
  const buf = await archivo.arrayBuffer();
  const exif = fechaExif(buf);
  const fecha = exif || fechaLocal(new Date(archivo.lastModified || Date.now()));
  const huella = await huellaDe(buf);
  const url = URL.createObjectURL(archivo);
  let im;
  try {
    im = await cargarImagen(url);
  } catch {
    URL.revokeObjectURL(url);
    const e = new Error(/heic|heif/i.test(archivo.type || archivo.name) ? 'Está en formato HEIC del iPhone. Súbela desde el iPhone mismo o expórtala como JPG.' : 'No es una foto que se pueda abrir.');
    e.formato = true;
    throw e;
  }
  const grande = achicar(im, LADO_GRANDE, 0.86);
  const mini = achicar(im, LADO_MINI, 0.72);
  URL.revokeObjectURL(url);
  return { nombre: archivo.name || 'foto.jpg', fecha, fechaDeCamara: !!exif, huella, canvas: grande.canvas, foto: grande.datos, mini: mini.datos, ancho: grande.canvas.width, alto: grande.canvas.height };
}

export const _probar = { fechaExif };
