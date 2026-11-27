const { CASAS } = await import('../src/lib/personal.js');
const { entender } = await import('../src/lib/asistente/entender.js');
const { responder } = await import('../src/lib/asistente/responder.js');
const { diasDeTexto } = await import('../src/lib/asistente/accionesChat.js');
const { planAccion } = await import('../src/lib/accionesHorario.js');
const A = await import('../src/lib/horarioApp.js');
const P = await import('../src/lib/personal.js');
const ok = (c, m) => { console.log((c ? 'ok - ' : 'FALLA - ') + m); if (!c) process.exitCode = 1; };
const hoy = new Date(2026, 10, 27);
const cfg = A.configInicial();
const vacio = { dias: {}, vac: [], fer: [], notas: {}, obs: '' };
const nov = A.armar('2026-11', vacio, cfg, null).horario;
const dic = A.armar('2026-12', vacio, cfg, nov).horario;
const personal = P.sincronizarConHorario(P.normalizarPersonal([]), cfg);
const ent = (q) => entender(q, { hoy, trabajadores: cfg.personal, ninos: [], idioma: /\b(put|remove|take|swap|replace|save|mark)\b/i.test(q) ? 'en' : 'es' });
const casos = [
  ['pon a Wendy AM todos los días que le toca', { tipo: 'turno', id: 'wendy', turno: 'am' }],
  ['ponle PM a Mayra', { tipo: 'turno', id: 'mayra', turno: 'pm' }],
  ['Wendy en la mañana todos los días', { tipo: 'turno', id: 'wendy', turno: 'am' }],
  ['quítale el AM a Wendy', { tipo: 'turno', id: 'wendy', turno: '' }],
  ['quita a Mayra del horario', { tipo: 'quitar', id: 'mayra' }],
  ['saca a Marlene el 15', { tipo: 'quitar', id: 'marlene' }],
  ['quita a Dayanith de Casa 4 el martes 15', { tipo: 'quitar', id: 'dayanith', casa: 'Casa 4' }],
  ['pon a Wendy en Casa 2 el 15', { tipo: 'poner', id: 'wendy', casa: 'Casa 2' }],
  ['mueve a Yazmira a casa 3 del 14 al 17', { tipo: 'poner', id: 'yazmira', casa: 'Casa 3' }],
  ['cambia a Mayra por Wendy el 15', { tipo: 'reemplazar', id: 'mayra', id2: 'wendy' }],
  ['pon a Wendy en lugar de Mayra el 16', { tipo: 'reemplazar', id: 'mayra', id2: 'wendy' }],
  ['intercambia a Mayra con Marlene el fin de semana del 12', { tipo: 'intercambiar', id: 'mayra', id2: 'marlene' }],
  ['pon a Jauna de on call el 20', { tipo: 'poner', id: 'x:Jauna', casa: 'On Call' }],
  ['pon a Tania de on call del 21 al 24', { tipo: 'poner', id: 'tania', casa: 'On Call' }],
  ['deja el on call automático', { tipo: 'oncall_auto' }],
  ['marca el 25 como feriado', { tipo: 'feriado' }],
  ['el 8 ya no es feriado, quítalo', { tipo: 'quitar_feriado' }],
  ['pon una nota el 24: cena de Navidad', { tipo: 'nota', texto: 'cena de Navidad' }],
  ['borra la nota del 24', { tipo: 'quitar_nota' }],
  ['Mayra está de vacaciones del 21 al 24', { tipo: 'ausencia', id: 'mayra', t: 'vac' }],
  ['guarda el horario', { tipo: 'guardar' }],
  ['arma el horario de enero', { tipo: 'armar' }],
  ['deshaz eso', { tipo: 'deshacer' }],
  ['put Wendy on PM every day', { tipo: 'turno', id: 'wendy', turno: 'pm' }],
  ['remove Mayra from the schedule on the 15th', { tipo: 'quitar', id: 'mayra' }]
];
for (const [q, esp] of casos) {
  const e = ent(q);
  const a = e.accion || {};
  const bien = e.tipo === 'accion' && Object.entries(esp).every(([k, v]) => a[k] === v);
  ok(bien, `“${q}” → ${e.tipo === 'accion' ? JSON.stringify(a) : e.tipo}`);
}
for (const q of ['¿quién trabaja el 15?', '¿cómo pongo AM a alguien?', 'cuántos fines trabaja Wendy', '¿Wendy trabaja AM?', 'dame el horario de diciembre', 'cuántas vacaciones tomó Mayra', 'dame 2 equipos de niños', 'que turno tiene wendy']) {
  const e = ent(q);
  ok(e.tipo !== 'accion', `“${q}” no es una orden (${e.tipo})`);
}
const D = (q, c = '2026-12') => (diasDeTexto(q, c, hoy) || []).join(',');
ok(D('el 15') === '15', 'el 15');
ok(D('del 20 al 24') === '20,21,22,23,24', 'del 20 al 24');
ok(D('el 15 y el 16') === '15,16', 'el 15 y el 16');
ok(D('fin de semana del 12') === '11,12,13', 'fin de semana del 12');
ok(D('los sábados') === '5,12,19,26', 'los sábados: ' + D('los sábados'));
ok(D('todos los lunes') === '7,14,21,28', 'todos los lunes');
ok(D('entre semana del 14 al 20') === '14,15,16,17', 'entre semana del 14 al 20: ' + D('entre semana del 14 al 20'));
ok(D('la semana del 14') === '14,15,16,17,18,19,20', 'la semana del 14');
ok(diasDeTexto('pon a Wendy AM todos los días que le toca', '2026-12', hoy) === null, 'sin fecha = todo el mes');
ok(D('quita a Dayanith de Casa 4 el martes 15') === '15', 'casa 4 no se cuenta como día');
ok(D('pon a Wendy AM a las 8am el 3') === '3', '8am no es un día');

const datos = { hoy, idioma: 'es', personal, mesActivo: '2026-12', mesHorario: '2026-12', horario: async (m) => (m === '2026-12' ? { horario: dic, config: cfg, anterior: nov } : m === '2026-11' ? { horario: nov, config: cfg } : null) };
const pedir = async (q) => { const e = ent(q); return { e, r: await responder(e, datos) }; };
let x = await pedir('pon a Wendy AM todos los días que le toca');
const diasWendy = [...Array(31)].map((_, i) => i + 1).filter((d) => CASAS.some((k) => A.en(dic, d, k).includes('wendy')));
ok(x.r.hacerYa && x.r.hacerYa.tipo === 'turno' && new RegExp(`${diasWendy.length} días`).test(x.r.partes[0].p), 'turno: lo hace en todos los días que trabaja: ' + x.r.partes[0].p);
const p1 = planAccion(x.r.hacerYa, { clave: '2026-12', horario: dic, config: cfg, anterior: nov });
ok(diasWendy.every((d) => CASAS.some((k) => A.turnoDe(p1.horario, d, k, 'wendy') === 'am')), 'el plan pone AM en todos sus días');
const dM = [...Array(31)].map((_, i) => i + 1).find((d) => d > 3 && CASAS.some((k) => A.en(dic, d, k).includes('mayra')) && CASAS.some((k) => A.en(dic, d + 1, k).includes('mayra')));
x = await pedir(`quita a Mayra del ${dM}`);
const p2 = planAccion(x.r.hacerYa, { clave: '2026-12', horario: dic, config: cfg, anterior: nov });
ok(!A.PUESTOS.some((k) => A.en(p2.horario, dM, k).includes('mayra')) && CASAS.some((k) => A.en(p2.horario, dM + 1, k).includes('mayra')), `quitar el ${dM} solo toca el ${dM}`);
x = await pedir(`cambia a Mayra por Wendy el ${dM}`);
const p3 = planAccion(x.r.hacerYa, { clave: '2026-12', horario: dic, config: cfg, anterior: nov });
const casaMayra = CASAS.find((k) => A.en(dic, dM, k).includes('mayra'));
ok(!!casaMayra && A.en(p3.horario, dM, casaMayra).includes('wendy') && !CASAS.some((k) => A.en(p3.horario, dM, k).includes('mayra')) && CASAS.filter((k) => A.en(p3.horario, dM, k).includes('wendy')).length === 1, 'reemplazar: Wendy queda donde estaba Mayra, una sola vez');
x = await pedir('pon a Jauna de on call el 20');
const p4 = planAccion(x.r.hacerYa, { clave: '2026-12', horario: dic, config: cfg, anterior: nov });
ok(A.en(p4.horario, 20, 'On Call').join() === 'x:Jauna' && p4.horario.ocMan.includes(20), 'on call a mano el 20, queda marcado como manual');
x = await pedir('pon a Wendy en Casa 2');
ok(!x.r.hacerYa && /Qué días/.test(x.r.partes[0].p), 'si falta el día, pregunta');
x = await pedir('Mayra está de vacaciones del 21 al 24');
ok(x.r.botones && x.r.botones[0].hacer && x.r.botones[0].hacer.dias.join() === '21,22,23,24', 'ausencia pide confirmar con botón');
x = await pedir('arma el horario de enero');
ok(x.r.hacerYa && x.r.hacerYa.tipo === 'armar' && x.r.hacerYa.mes === '2027-01', 'armar enero');
x = await pedir('marca el 25 como feriado');
const p5 = planAccion(x.r.hacerYa, { clave: '2026-12', horario: dic, config: cfg, anterior: nov });
ok(p5.horario.fer.includes(25), 'feriado 25');
x = await pedir('pon una nota el 24: cena de Navidad');
ok(planAccion(x.r.hacerYa, { clave: '2026-12', horario: dic, config: cfg }).horario.notas[24] === 'cena de Navidad', 'nota del 24');
