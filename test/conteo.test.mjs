import JSZip from 'jszip';
const { DOMParser, XMLSerializer } = await import('@xmldom/xmldom');
globalThis.DOMParser = DOMParser;
globalThis.XMLSerializer = XMLSerializer;
const { entender } = await import('../src/lib/asistente/entender.js');
const { responder } = await import('../src/lib/asistente/responder.js');
const { idioma } = await import('../src/lib/asistente/texto.js');
const A = await import('../src/lib/horarioApp.js');
const P = await import('../src/lib/personal.js');
const { generarExcelHorario } = await import('../src/lib/horarioExport.js');
const ok = (c, m) => { console.log((c ? 'ok - ' : 'FALLA - ') + m); if (!c) process.exitCode = 1; };
const hoy = new Date(2026, 10, 24);
const cfg = A.configInicial();
let dic = A.armar('2026-12', { dias: {}, vac: [], fer: [], notas: {}, obs: '' }, cfg, null).horario;
dic = A.poner(dic, 12, 'Casa 1', [...A.en(dic, 12, 'Casa 1'), 'x:Juan Pérez']);
const personal = P.sincronizarConHorario(P.normalizarPersonal([]), cfg);
const servidor = { '2026-12': { horario: dic, config: cfg } };
const horario = async (m) => servidor[m] || null;
const ask = async (q, extra = {}) => {
  const lang = idioma(q) || 'es';
  const e = entender(q, { hoy, trabajadores: cfg.personal, ninos: [], idioma: lang });
  const r = e.tipo === 'guia' ? null : await responder(e, { hoy, idioma: lang, personal, horario, mesActivo: '2026-12', ...extra });
  return { e, r, t: r ? (r.partes || []).map((x) => x.p || (x.ul || []).join(' | ')).join(' // ') : '' };
};

const ctx = A.contexto('2026-12', dic, cfg);
const c = A.conteoFindes(ctx);
for (const f of c) {
  const real = ctx.findes.filter((x) => x.dias.some((d) => ctx.donde(f.id, d))).length;
  if (f.findes.length !== real) ok(false, `conteo de ${f.n}: ${f.findes.length} vs ${real}`);
}
ok(c.every((f) => f.findes.length === ctx.findes.filter((x) => x.dias.some((d) => ctx.donde(f.id, d))).length), 'el conteo coincide con el horario para todos');
const juan = c.find((f) => f.id === 'x:Juan Pérez');
ok(juan && juan.n === 'Juan Pérez' && juan.findes.length === 1 && juan.rol === 'otro', 'también cuenta a las personas de “Otro”');
ok(!c.some((f) => f.findes.some((x) => x.casas.includes(A.ON_CALL))), 'el on call no cuenta como fin de semana');
const t = c.find((f) => f.findes.length >= 2);
ok(/^[a-záéíóú]{3} \d+(–[a-záéíóú]{3} \d+)?$/.test(A.rangoFinde(ctx, t.findes[0].dias)), 'rango del fin de semana: ' + A.rangoFinde(ctx, t.findes[0].dias));

for (const q of ['dame el conteo de fines de semana', 'cuantos fines de semana trabaja cada persona', 'cuántos fines trabaja cada uno en diciembre', 'conteo', 'weekend count for everyone', 'how many weekends does everyone work']) {
  const x = await ask(q);
  ok(x.e.tipo === 'conteo_findes', `"${q}" → conteo`);
}
let x = await ask('dame el conteo de fines de semana');
const may = c.find((f) => f.id === 'mayra');
ok(x.t.includes('diciembre 2026') && x.t.includes(`**${may.n}**: ${may.findes.length} —`) && x.t.includes('Juan Pérez'), 'Sam Jr. da el conteo del mes abierto: ' + x.t.slice(0, 160));
ok(x.r.botones.some((b) => b.copiar && b.copiar.includes(`${may.n}: ${may.findes.length}`)), 'con botón para copiar');
x = await ask('cuantos fines de semana trabaja Mayra en diciembre');
ok(x.e.tipo === 'dias_persona', 'preguntar por una persona sigue funcionando como antes');
x = await ask('como veo el conteo de fines de semana');
ok(x.e.tipo === 'guia' && x.e.articulo.id === 'conteo', 'la guía explica dónde está el botón Conteo');
x = await ask('dame el conteo de fines de semana de enero');
ok(/todavía no tiene horario/.test(x.t), 'mes sin horario: lo dice');

let h2 = { ...dic, vac: [{ id: 'mayra', de: 3, a: 4, t: 'med' }, { id: 'yazmira', de: 8, a: 9, t: 'vac' }] };
const bytes = await generarExcelHorario('2026-12', h2, cfg, JSZip);
const z = await JSZip.loadAsync(bytes);
const todo = (await Promise.all(Object.keys(z.files).filter((f) => /\.xml$/.test(f)).map((f) => z.file(f).async('string')))).join(' ');
ok(!/AUSENTE/i.test(todo), 'el Excel del horario ya no dice “Ausente”');
ok(/VACACI[ÓO]N/i.test(todo), 'las vacaciones sí siguen saliendo');
