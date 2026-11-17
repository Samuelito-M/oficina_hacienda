import { CASAS, fijoEn, mesDe, sumarMes, trabajaEn, nombreMes } from './personal.js';
import { ON_CALL, contexto, normalizarConfig, normalizarHorario, problemas, en } from './horarioApp.js';
import { listo } from './seleccion.js';

const DIA = 86400000;
const soloFecha = (f) => new Date(f.getFullYear(), f.getMonth(), f.getDate());
const mas = (f, n) => new Date(f.getFullYear(), f.getMonth(), f.getDate() + n);

export function finDeSemana(hoy) {
  const h = soloFecha(hoy);
  const wd = h.getDay();
  const viernes = wd === 5 ? h : wd === 6 ? mas(h, -1) : wd === 0 ? mas(h, -2) : mas(h, (5 - wd + 7) % 7);
  return { viernes, sabado: mas(viernes, 1), domingo: mas(viernes, 2), semana: [3, 4, 5, 6].map((n) => mas(viernes, n)) };
}

export function proximosCumples(cumples, hoy, dias = 14) {
  const h = soloFecha(hoy);
  const out = [];
  for (const c of cumples || []) {
    const m = String(c.nacimiento || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) continue;
    for (const anio of [h.getFullYear(), h.getFullYear() + 1]) {
      const f = new Date(anio, +m[2] - 1, +m[3]);
      if (f.getMonth() !== +m[2] - 1) continue;
      const falta = Math.round((f - h) / DIA);
      if (falta >= 0 && falta <= dias) {
        out.push({ nombre: c.nombre, casa: c.casa || '', fecha: f, falta, edad: anio - +m[1] });
        break;
      }
    }
  }
  return out.sort((a, b) => a.falta - b.falta || a.nombre.localeCompare(b.nombre, 'es'));
}

export function resumenInicio({ hoy, mes, horario, horarioSiguiente, config, personal, cumples, siguiente, ultimaCopia }) {
  const cfg = normalizarConfig(config);
  const hMes = normalizarHorario(horario);
  const hSig = normalizarHorario(horarioSiguiente);
  const sigClave = sumarMes(mes, 1);
  const horarioDe = (f) => (mesDe(f) === mes ? hMes : mesDe(f) === sigClave ? hSig : null);
  const ids = (f, k) => {
    const h = horarioDe(f);
    return h ? en(h, f.getDate(), k) : [];
  };
  const porIdCfg = new Map(cfg.personal.map((p) => [p.id, p.n]));
  const porIdPer = new Map(personal.map((p) => [p.id, p]));
  const nombre = (id) => (porIdPer.get(id) && porIdPer.get(id).nombre) || porIdCfg.get(id) || id;

  const fs = finDeSemana(hoy);
  const dias = [fs.viernes, fs.sabado, fs.domingo];
  const conHorario = dias.some((f) => horarioDe(f));
  const mesFinde = mesDe(fs.sabado);
  const casas = [];
  for (const casa of CASAS) {
    const todos = Array.from(new Set(dias.flatMap((f) => ids(f, casa))));
    if (!todos.length) continue;
    const sab = ids(fs.sabado, casa).length ? ids(fs.sabado, casa) : todos;
    const padres = personal.filter((p) => p.casa === casa && trabajaEn(p, mesFinde));
    const estan = sab.filter((id) => padres.some((p) => p.id === id));
    casas.push({ casa, nombres: todos.map(nombre), cambio: estan.length === 0 });
  }
  const oncall = Array.from(new Set(fs.semana.flatMap((f) => ids(f, ON_CALL)))).map(nombre);

  const vistos = new Set();
  const acuerdos = [];
  for (const f of dias) {
    for (const casa of CASAS) {
      for (const id of ids(f, casa)) {
        if (vistos.has(id)) continue;
        vistos.add(id);
        const p = porIdPer.get(id);
        acuerdos.push({ id, nombre: nombre(id), fijo: !!p && fijoEn(p, mesFinde), sinCedula: !p || !listo(p) });
      }
    }
  }

  let revisar = 0;
  if (hMes) {
    try {
      revisar = problemas(contexto(mes, hMes, cfg)).length;
    } catch {
      revisar = 0;
    }
  }
  const copiaFecha = ultimaCopia ? new Date(ultimaCopia) : null;
  const copiaDias = copiaFecha && !isNaN(copiaFecha) ? Math.floor((soloFecha(hoy) - soloFecha(copiaFecha)) / DIA) : null;

  return {
    finde: { ...fs, conHorario, mesFinde, casas, oncall, horario: horarioDe(fs.sabado) || horarioDe(fs.viernes), cambios: casas.filter((c) => c.cambio).map((c) => c.casa) },
    acuerdos: { personas: acuerdos, faltanCedula: acuerdos.filter((a) => a.sinCedula).map((a) => a.nombre) },
    cumples: proximosCumples(cumples, hoy),
    mes: { clave: mes, nombre: nombreMes(mes), hecho: !!hMes && Object.keys(hMes.dias).length > 0, revisar },
    siguiente: { clave: sigClave, nombre: nombreMes(sigClave), hecho: !!siguiente, urgente: hoy.getDate() >= 15 },
    copia: { fecha: copiaDias == null ? null : copiaFecha, dias: copiaDias },
    config: cfg
  };
}
