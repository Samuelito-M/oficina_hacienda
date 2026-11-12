import { fold, squash } from './text.js';

export const CASAS = ['Casa 1', 'Casa 2', 'Casa 3', 'Casa 4', 'Casa Esther'];

export const PERSONAL_BASE = [
  { id: 'miguel', nombre: 'Miguel', alias: ['miguel'], fijo: true, casa: 'Casa 1' },
  { id: 'patricia', nombre: 'Paty', alias: ['patricia', 'paty', 'pa'], fijo: true, casa: 'Casa 1' },
  { id: 'julian', nombre: 'Julián', alias: ['julian', 'julia'], fijo: true, casa: 'Casa 2' },
  { id: 'alejandra', nombre: 'Alejandra', alias: ['alejandra'], fijo: true, casa: 'Casa 2' },
  { id: 'tania', nombre: 'Tania', alias: ['tania'], fijo: true, casa: 'Casa 3' },
  { id: 'marivid', nombre: 'Marivid', alias: ['marivid', 'marivi', 'mariv'], fijo: true, casa: 'Casa 3' },
  { id: 'viviana', nombre: 'Viviana', alias: ['viviana', 'vivia', 'vivi'], fijo: true, casa: 'Casa 4' },
  { id: 'devimar', nombre: 'Devimar', alias: ['devimar'], fijo: true, casa: 'Casa Esther' },
  { id: 'yazmira', nombre: 'Yazmira', alias: ['yazmira', 'yazmi'] },
  { id: 'mayra', nombre: 'Mayra', alias: ['mayra'] },
  { id: 'yvelice', nombre: 'Yvelice', alias: ['yvelice', 'ivelice', 'yvelic', 'yveli', 'yvel'] },
  { id: 'myriam', nombre: 'Myriam', alias: ['myriam', 'myrian', 'miriam', 'myr'] },
  { id: 'wendy', nombre: 'Wendy', alias: ['wendy', 'wendi', 'wend'] },
  { id: 'magali', nombre: 'Magali', alias: ['magali', 'maga'] },
  { id: 'dayanith', nombre: 'Dayanith', alias: ['dayanith', 'dayaith', 'dayanit', 'dayani', 'dayan'] },
  { id: 'moises', nombre: 'Moisés', alias: ['moises', 'moise', 'mois'] },
  { id: 'marlene', nombre: 'Marlene', alias: ['marlene', 'marlen', 'marle'] },
  { id: 'coro', nombre: 'Coro', alias: ['coro'] },
  { id: 'jauna', nombre: 'Jauna', alias: ['jauna'] },
  { id: 'fredy', nombre: 'Fredy', alias: ['fredy', 'freddy'] },
  { id: 'ingrit', nombre: 'Ingrit', alias: ['ingrit', 'ingrid'] }
];

const KEY = 'oficina-hacienda.personal.v1';

export function slug(s) {
  return fold(s).replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'persona';
}

export function normalizarPersonal(guardado) {
  const porId = new Map(PERSONAL_BASE.map((p) => [p.id, { ...p, alias: [...p.alias], completo: '', cedula: '' }]));
  if (Array.isArray(guardado)) {
    for (const g of guardado) {
      if (!g || typeof g.id !== 'string' || !g.id) continue;
      const base = porId.get(g.id) || { id: g.id, nombre: g.nombre || g.id, alias: [], fijo: false, casa: '' };
      porId.set(g.id, {
        ...base,
        nombre: typeof g.nombre === 'string' && g.nombre.trim() ? g.nombre.trim() : base.nombre,
        alias: Array.from(new Set([...(base.alias || []), ...(Array.isArray(g.alias) ? g.alias : [])].map(squash).filter(Boolean))),
        fijo: typeof g.fijo === 'boolean' ? g.fijo : !!base.fijo,
        casa: typeof g.casa === 'string' ? g.casa : base.casa || '',
        completo: typeof g.completo === 'string' ? g.completo : '',
        cedula: typeof g.cedula === 'string' ? g.cedula : ''
      });
    }
  }
  return Array.from(porId.values());
}

export function cargarPersonal() {
  let guardado = [];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) guardado = JSON.parse(raw);
  } catch {
    guardado = [];
  }
  return normalizarPersonal(guardado);
}

export function guardarPersonal(lista) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(lista.map(({ id, nombre, alias, fijo, casa, completo, cedula }) => ({ id, nombre, alias, fijo, casa, completo, cedula })))
    );
    return true;
  } catch {
    return false;
  }
}

export function personaDeNombreCompleto(lista, completo) {
  const tokens = fold(completo).split(/[^a-z]+/).filter(Boolean);
  for (const p of lista) {
    const al = [p.id, ...p.alias].filter((a) => a.length >= 3);
    if (tokens.some((t) => al.includes(t))) return p;
  }
  return null;
}

export function cedulaValida(c) {
  return /^\d{10}$/.test(String(c || ''));
}

export function fusionarPersonas(lista, personas) {
  const nueva = lista.map((p) => ({ ...p, alias: [...(p.alias || [])] }));
  let agregadas = 0;
  let actualizadas = 0;
  for (const per of personas) {
    const yaPorCedula = nueva.find((p) => p.cedula && p.cedula === per.cedula);
    const p = yaPorCedula || personaDeNombreCompleto(nueva, per.completo);
    if (p) {
      if (p.completo !== per.completo || p.cedula !== per.cedula) actualizadas++;
      p.completo = per.completo;
      p.cedula = per.cedula;
    } else {
      const tokens = fold(per.completo).split(/[^a-z]+/).filter(Boolean);
      let id = slug(per.completo);
      while (nueva.some((x) => x.id === id)) id += 'x';
      nueva.push({ id, nombre: per.completo, alias: tokens.filter((t) => t.length >= 4), fijo: false, casa: '', completo: per.completo, cedula: per.cedula });
      agregadas++;
    }
  }
  return { lista: nueva, agregadas, actualizadas };
}

export function nuevaPersona(lista, nombre, alias = []) {
  let id = slug(nombre);
  while (lista.some((x) => x.id === id)) id += 'x';
  return { id, nombre: nombre.trim(), alias: Array.from(new Set(alias.map(squash).filter(Boolean))), fijo: false, casa: '', completo: '', cedula: '' };
}
