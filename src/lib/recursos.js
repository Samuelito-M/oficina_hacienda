import normalUrl from '@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff?url';
import boldUrl from '@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff?url';
import manoUrl from '../assets/mano.png';
import estherUrl from '../assets/casa-esther.png';

let cache = null;

async function bytes(url) {
  const r = await fetch(url);
  return new Uint8Array(await r.arrayBuffer());
}

export async function cargarRecursos() {
  if (cache) return cache;
  const [normal, bold, mano, esther] = await Promise.all([bytes(normalUrl), bytes(boldUrl), bytes(manoUrl), bytes(estherUrl)]);
  cache = { normal, bold, mano, esther };
  return cache;
}
