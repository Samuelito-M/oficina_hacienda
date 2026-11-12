export const MAX_FOTO = 45000;

function cargarImagen(file) {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      ok(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      mal(new Error('imagen'));
    };
    img.src = url;
  });
}

export async function prepararFoto(file, { ancho = 300, alto = 400 } = {}) {
  if (!/^image\//.test(file.type || '') && !/\.(jpe?g|png|webp|heic|heif|gif)$/i.test(file.name || '')) throw new Error('Elige una foto (JPG o PNG).');
  let img;
  try {
    img = await cargarImagen(file);
  } catch {
    throw new Error('No pude abrir esa foto. Si es del iPhone (HEIC), conviértela a JPG o súbela desde Safari.');
  }
  const proporcion = ancho / alto;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  let sx = 0;
  let sy = 0;
  if (sw / sh > proporcion) {
    const n = sh * proporcion;
    sx = (sw - n) / 2;
    sw = n;
  } else {
    const n = sw / proporcion;
    sy = Math.max(0, (sh - n) * 0.3);
    sh = n;
  }
  let escala = 1;
  for (let intento = 0; intento < 8; intento++) {
    const w = Math.round(ancho * escala);
    const h = Math.round(alto * escala);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    for (const q of [0.82, 0.72, 0.62, 0.52]) {
      const url = c.toDataURL('image/jpeg', q);
      if (url.length <= MAX_FOTO) return url;
    }
    escala *= 0.85;
  }
  throw new Error('La foto es demasiado pesada, prueba con otra.');
}

export function bytesDeDataUrl(url) {
  const b64 = String(url).split(',')[1] || '';
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
