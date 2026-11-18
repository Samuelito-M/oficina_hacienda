export const SEGURO = 0.45;
export const QUIZAS = 0.56;
export const APRENDER = 0.3;

export function distancia(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

export function masCercano(d, referencias) {
  let mejor = Infinity;
  for (const r of referencias) {
    const x = distancia(d, r);
    if (x < mejor) mejor = x;
  }
  return mejor;
}

export function emparejar(caras, refs, umbral = QUIZAS) {
  const pares = [];
  caras.forEach((c, i) => {
    for (const [id, lista] of refs) {
      if (!lista.length) continue;
      const x = masCercano(c.d, lista);
      if (x < umbral) pares.push({ i, id, x });
    }
  });
  pares.sort((a, b) => a.x - b.x);
  const caraUsada = new Set();
  const ninoUsado = new Set();
  const out = caras.map(() => ({ id: '', dist: null, nivel: 'nadie' }));
  for (const p of pares) {
    if (caraUsada.has(p.i) || ninoUsado.has(p.id)) continue;
    caraUsada.add(p.i);
    ninoUsado.add(p.id);
    out[p.i] = { id: p.id, dist: p.x, nivel: p.x < SEGURO ? 'seguro' : 'quizas' };
  }
  return out;
}

export function ninosDeFoto(foto) {
  const ids = [];
  for (const c of foto.caras) if (c.id && !c.ignorar && !ids.includes(c.id)) ids.push(c.id);
  for (const id of foto.extra || []) if (!ids.includes(id)) ids.push(id);
  return ids;
}

export function carasParaAprender(fotos, refs) {
  const out = [];
  for (const f of fotos) {
    for (const c of f.caras) {
      if (!c.id || c.ignorar || !c.d) continue;
      const lista = refs.get(c.id) || [];
      const x = lista.length ? masCercano(c.d, lista) : Infinity;
      if (x > APRENDER) out.push({ nino: c.id, d: Array.from(c.d, (v) => Math.round(v * 10000) / 10000) });
    }
  }
  return out;
}
