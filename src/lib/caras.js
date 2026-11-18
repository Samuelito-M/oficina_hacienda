const VERSION_LIB = '1.7.15';
const CDN = `https://cdn.jsdelivr.net/npm/@vladmandic/face-api@${VERSION_LIB}`;

let cargando = null;
const referencias = new Map();

function script(src) {
  return new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => {
      s.remove();
      mal(new Error('script'));
    };
    document.head.appendChild(s);
  });
}

function rutas() {
  const web = location.protocol === 'https:' || location.protocol === 'http:';
  const cdn = { js: `${CDN}/dist/face-api.js`, modelos: `${CDN}/model` };
  return web ? [{ js: 'vendor/face-api.js', modelos: 'modelos' }, cdn] : [cdn];
}

async function iniciar(avance) {
  let ultimo = null;
  for (const r of rutas()) {
    try {
      avance && avance('Bajando el programa que reconoce caras (solo la primera vez)…');
      if (!window.faceapi) await script(r.js);
      const fa = window.faceapi;
      try {
        await fa.tf.setBackend('webgl');
      } catch {
        await fa.tf.setBackend('cpu');
      }
      await fa.tf.ready();
      await fa.nets.ssdMobilenetv1.loadFromUri(r.modelos);
      await fa.nets.faceLandmark68Net.loadFromUri(r.modelos);
      await fa.nets.faceRecognitionNet.loadFromUri(r.modelos);
      return fa;
    } catch (err) {
      ultimo = err;
    }
  }
  const e = new Error('No se pudo bajar el programa que reconoce caras. Revisa el internet e intenta otra vez.');
  e.causa = ultimo;
  throw e;
}

export function cargarCaras(avance) {
  if (!cargando)
    cargando = iniciar(avance).catch((err) => {
      cargando = null;
      throw err;
    });
  return cargando;
}

const opciones = (fa, min = 0.45) => new fa.SsdMobilenetv1Options({ minConfidence: min, maxResults: 40 });

export async function detectar(imagen) {
  const fa = await cargarCaras();
  const ancho = imagen.naturalWidth || imagen.width;
  const alto = imagen.naturalHeight || imagen.height;
  const r = await fa.detectAllFaces(imagen, opciones(fa)).withFaceLandmarks().withFaceDescriptors();
  return r
    .map((x) => {
      const b = x.detection.box;
      return { caja: { x: b.x / ancho, y: b.y / alto, w: b.width / ancho, h: b.height / alto }, d: x.descriptor, score: x.detection.score };
    })
    .filter((c) => c.caja.w * ancho >= 28)
    .sort((a, b) => a.caja.x - b.caja.x);
}

function lienzo(im, lado, grados) {
  const w = im.naturalWidth || im.width;
  const h = im.naturalHeight || im.height;
  const k = Math.max(1, lado / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * k);
  c.height = Math.round(h * k);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  if (grados) {
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((grados * Math.PI) / 180);
    ctx.translate(-c.width / 2, -c.height / 2);
  }
  ctx.drawImage(im, 0, 0, c.width, c.height);
  return c;
}

async function caraDeRetrato(fa, im) {
  for (const [grados, min] of [[0, 0.3], [0, 0.12], [-18, 0.2], [18, 0.2]]) {
    const r = await fa.detectSingleFace(lienzo(im, 512, grados), opciones(fa, min)).withFaceLandmarks().withFaceDescriptor();
    if (r) return r.descriptor;
  }
  return null;
}

function imagenDe(src) {
  return new Promise((ok, mal) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => mal(new Error('imagen'));
    im.src = src;
  });
}

export async function referenciasDe(ninos, fotos, aprendidas, avance) {
  const fa = await cargarCaras(avance);
  const con = ninos.filter((n) => fotos[n.id]);
  let i = 0;
  for (const n of con) {
    i++;
    const clave = `${n.id}:${fotos[n.id].length}:${fotos[n.id].slice(-40)}`;
    if (referencias.get(n.id)?.clave === clave) continue;
    avance && avance(`Preparando las caras de los niños (${i} de ${con.length})…`);
    let d = null;
    try {
      d = await caraDeRetrato(fa, await imagenDe(fotos[n.id]));
    } catch {
      d = null;
    }
    referencias.set(n.id, { clave, d });
  }
  const out = new Map();
  for (const n of ninos) {
    const lista = [];
    const r = referencias.get(n.id);
    if (r && r.d && fotos[n.id]) lista.push(r.d);
    for (const x of (aprendidas && aprendidas[n.id]) || []) if (Array.isArray(x) && x.length === 128) lista.push(Float32Array.from(x));
    out.set(n.id, lista);
  }
  return out;
}

export const sinCaraEnDirectorio = (ninos) => ninos.filter((n) => n.conFoto && referencias.has(n.id) && !referencias.get(n.id).d);
