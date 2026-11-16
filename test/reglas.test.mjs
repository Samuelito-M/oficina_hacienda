const A = await import('../src/lib/horarioApp.js');
const ok = (c, m) => { console.log((c ? 'ok - ' : 'FALLA - ') + m); if (!c) process.exitCode = 1; };
const cfg = A.configInicial();
const DS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const C = ['Casa 1', 'Casa 2', 'Casa 3', 'Casa 4', 'Casa Esther'];
const ver = (clave, h) => { const ctx = A.contexto(clave, h, cfg); for (let d = 1; d <= ctx.n; d++) console.log(String(d).padStart(2), DS[ctx.wd(d)], C.map((c) => (c.replace('Casa ', 'C').slice(0, 3) + ':' + A.en(h, d, c).map((id) => ctx.nombre(id).slice(0, 5)).join('+')).padEnd(24)).join(' '), 'OC:' + A.en(h, d, 'On Call').join()); };
const vacio = () => ({ dias: {}, vac: [], fer: [] });

const r = A.armar('2026-12', vacio(), cfg, null);
const h = r.horario; const ctx = A.contexto('2026-12', h, cfg);
if (process.argv[2] === 'ver') ver('2026-12', h);
const P = A.problemas(ctx);
console.log('   problemas:', P.length, P.slice(0, 6).map((p) => p.t).join(' | '));
const padres = cfg.personal.filter((p) => p.rol === 'padre'), aux = cfg.personal.filter((p) => p.rol === 'aux' && !p.hasta), finde = cfg.personal.filter((p) => p.rol === 'finde');
ok(padres.every((p) => ctx.findesDe(p.id) === 2), 'regla 1: cada padre de casa trabaja 2 fines de semana: ' + padres.map((p) => p.n + ' ' + ctx.findesDe(p.id)).join(', '));
const fin = (id) => ctx.findes.map((f) => (f.dias.some((d) => ctx.donde(id, d)) ? 'S' : '-')).join('');
ok(padres.every((p) => ['S-S-', '-S-S'].includes(fin(p.id))), 'regla 1: saltan un fin de semana: ' + padres.map((p) => p.n + ' ' + fin(p.id)).join(', '));
ok(fin('miguel') === fin('patricia') && fin('julian') === fin('alejandra'), 'regla 2: las parejas trabajan juntas');
ok(padres.every((p) => { for (let d = 1; d <= 31; d++) { const c = ctx.donde(p.id, d); if (c && c !== p.casas[0]) return false; if (c && !ctx.finde(d)) return false; } return true; }), 'regla 2 y 10: padres solo en su casa y solo viernes a domingo');
ok([...aux, ...finde].every((p) => ctx.findesDe(p.id) <= 3), 'regla 3 y 9: nadie pasa de 3 fines de semana: ' + [...aux, ...finde].map((p) => p.n + ' ' + ctx.findesDe(p.id)).join(', '));
ok([...aux, ...finde].filter((p) => ctx.findesDe(p.id) === 3).length >= 8, 'casi todos llegan a 3 fines de semana');
let r4 = true, vacias = 0; for (let d = 1; d <= 31; d++) for (const c of C) { const l = A.en(h, d, c); const nAux = l.filter((id) => !ctx.esPadre(id)).length; if (c !== 'Casa 2' && nAux < 1) r4 = false; if (!l.length) vacias++; }
ok(r4, 'regla 4: siempre hay 1 auxiliar en Casa 1, 3, 4 y Esther');
const faltas = P.filter((p) => p.tipo === 'falta');
ok(faltas.every((p) => p.k === 'Casa 2') && faltas.length <= 3, 'lo único que puede faltar es el 2º auxiliar de Casa 2 un fin de semana: ' + faltas.map((p) => p.t).join(' | '));
ok(!P.some((p) => p.tipo !== 'falta'), 'ningún otro aviso (choques, descansos, casas prohibidas)');
ok(![...Array(31)].some((_, i) => ['Casa 1', 'Casa 4'].some((c) => A.en(h, i + 1, c).includes('myriam'))), 'regla 5: Myriam nunca en Casa 1 ni Casa 4');
const veces = (id, c, fn = () => true) => [...Array(31)].filter((_, i) => fn(i + 1) && A.en(h, i + 1, c).includes(id)).length, total = (id, fn = () => true) => C.reduce((a, c) => a + veces(id, c, fn), 0);
ok(veces('marivid', 'Casa 3') / total('marivid') > 0.7 && veces('yazmira', 'Casa 4') / total('yazmira') > 0.7, `regla 6: Marivid ${veces('marivid', 'Casa 3')}/${total('marivid')} días en Casa 3, Yazmira ${veces('yazmira', 'Casa 4')}/${total('yazmira')} en Casa 4`);
const desc = { myriam: 1, mayra: 2, dayanith: 2, marivid: 3, marlene: 3, wendy: 3, yazmira: 4 };
ok(Object.entries(desc).every(([id, w]) => ![...Array(31)].some((_, i) => ctx.wd(i + 1) === w && ctx.donde(id, i + 1))), 'regla 7: todos descansan su día');
ok(aux.every((p) => [...Array(31)].every((_, i) => { const d = i + 1; return ctx.finde(d) || !p.dias.includes(ctx.wd(d)) || ctx.donde(p.id, d); })), 'de lunes a jueves trabajan todos los que no descansan');
const oc = [...Array(31)].map((_, i) => A.en(h, i + 1, 'On Call').join()).map((x, i) => (x ? i + 1 : 0)).filter(Boolean);
const finV = ctx.findes.filter((f) => f.dias.some((d) => ctx.donde('viviana', d)));
const esperado = finV.flatMap((f) => [1, 2, 3, 4].map((k) => f.dias[f.dias.length - 1] + k)).filter((d) => d <= 31);
ok(oc.join() === esperado.join() && [...Array(31)].every((_, i) => ['', 'viviana'].includes(A.en(h, i + 1, 'On Call').join())), 'regla 8: Viviana on call de lunes a jueves después de sus fines de semana: días ' + oc.join(','));
ok(finde.every((p) => [...Array(31)].every((_, i) => ctx.finde(i + 1) || !ctx.donde(p.id, i + 1)) && ctx.findesDe(p.id) === 3), 'regla 9: Moisés y Magali 3 fines de semana y nunca entre semana');
ok(ctx.findes.every((f) => C.every((c) => new Set(f.dias.map((d) => A.en(h, d, c).join())).size === 1)), 'regla 10: viernes, sábado y domingo con la misma gente en cada casa');
ok(ctx.findes.every((f) => C.every((c) => { const l = A.en(h, f.dias[0], c); return ctx.hayPadres(c, f.dias[0]) || l.length === 2 || c === 'Casa 2'; })), 'casa sin padres queda con 2 auxiliares');
ok(ctx.findes.every((f) => A.en(h, f.dias[0], 'Casa 2').length >= 1), 'Casa 2 nunca queda vacía el fin de semana');
ok(!JSON.stringify(h).includes('yvelice') && !JSON.stringify(h).includes('coro'), 'Yvelice y Coro no salen en diciembre');
ok(A.armar('2026-12', h, cfg, null).nuevos.length === 0, 'volver a completar no cambia nada');
console.log('   vacías:', vacias, '· puestos', r.casas, '· on call', r.calls);

// continuidad con el mes anterior y enero (5 fines de semana, empieza viernes)
const e = A.armar('2027-01', vacio(), cfg, h); const ce = A.contexto('2027-01', e.horario, cfg);
if (process.argv[2] === 'ene') ver('2027-01', e.horario);
ok(padres.every((p) => (fin(p.id).slice(-1) === 'S') !== ce.findes[0].dias.some((d) => ce.donde(p.id, d))), 'enero: quien trabajó el último fin de semana de diciembre descansa el primero');
ok(padres.every((p) => ce.findesDe(p.id) <= 2), 'enero (5 fines de semana): padres siguen con máximo 2');
ok(A.en(e.horario, 4, 'On Call').join() === (ce.donde('viviana', 2) ? 'viviana' : ''), 'enero: on call del lunes 4 según el fin de semana del 1 al 3');
const f27 = A.armar('2027-02', vacio(), cfg, e.horario).horario; const cf = A.contexto('2027-02', f27, cfg);
ok(A.en(f27, 1, 'On Call').join() === (ce.donde('viviana', 31) ? 'viviana' : '') && A.en(f27, 4, 'On Call').join() === A.en(f27, 1, 'On Call').join(), 'febrero empieza lunes: on call del 1 al 4 depende del último fin de semana de enero (' + (ce.donde('viviana', 31) ? 'trabajó' : 'no trabajó') + ')');
ok([...aux, ...finde].every((p) => ce.findesDe(p.id) <= 4) && [...aux, ...finde].filter((p) => ce.findesDe(p.id) === 4).length >= 8, 'enero (5 fines de semana): auxiliares 4, descansan 1');
console.log('   enero faltas:', A.problemas(ce).filter((p) => p.tipo === 'falta').length, '· otros:', A.problemas(ce).filter((p) => p.tipo !== 'falta').map((p) => p.t).join(' | ') || 'ninguno');

// mes que empieza en sábado/domingo: agosto 2026 (sábado 1) con julio
const jul = A.armar('2026-07', vacio(), cfg, null).horario; const ago = A.armar('2026-08', vacio(), cfg, jul).horario;
ok(C.every((c) => A.en(jul, 31, c).length >= 1) && C.every((c) => A.en(ago, 1, c).join() === A.en(jul, 31, c).join()) && C.every((c) => A.en(ago, 2, c).join() === A.en(jul, 31, c).join()), 'mes que empieza en sábado: el 1 y 2 siguen con la gente del viernes 31');

// vacaciones y completar sobre algo ya puesto
const v = A.armar('2026-12', { dias: {}, vac: [{ id: 'miguel', de: 1, a: 8 }, { id: 'patricia', de: 1, a: 8 }, { id: 'wendy', de: 14, a: 20 }], fer: [25] }, cfg, null).horario; const cv = A.contexto('2026-12', v, cfg);
ok(!cv.donde('miguel', 5) && A.en(v, 5, 'Casa 1').length === 2 && ![14, 15, 17, 18, 19, 20].some((d) => cv.donde('wendy', d)), 'vacaciones: Casa 1 queda con 2 auxiliares y Wendy no sale del 14 al 20');
ok(!A.problemas(cv).some((p) => p.tipo === 'vac' || p.tipo === 'doble'), 'sin choques con vacaciones');
let m = A.poner(vacio(), 4, 'Casa 2', ['julian', 'alejandra']); m = A.poner(m, 9, 'Casa 3', ['marlene']);
const cm = A.armar('2026-12', m, cfg, null).horario;
ok(A.en(cm, 5, 'Casa 2').includes('julian') && A.en(cm, 9, 'Casa 3').includes('marlene'), 'completar respeta lo que ya estaba puesto y completa el fin de semana');

// avisos de reglas
let mal = A.poner(h, 7, 'Casa 1', [...A.en(h, 7, 'Casa 1'), 'myriam']);
const pm = A.problemas(A.contexto('2026-12', mal, cfg)).filter((p) => p.tipo === 'regla').map((p) => p.t);
ok(pm.length >= 1 && /Myriam/.test(pm[0]), 'avisa si pones a alguien donde no debe: ' + pm.join(' | '));
const c2 = A.contexto('2026-12', h, cfg);
ok(c2.motivo('myriam', 8, 'Casa 4') === 'no va a Casa 4' && /descansa los lunes/.test(c2.motivo('myriam', 14, 'Casa 3')), 'motivos en la ventana: ' + c2.motivo('myriam', 8, 'Casa 4') + ' / ' + c2.motivo('myriam', 14, 'Casa 3'));
// on call manual por bloque
ok(A.ponerEnBloque(c2, 9, 'On Call', ['tania'], true).dias[7]['On Call'].includes('tania') && !(A.ponerEnBloque(c2, 9, 'On Call', ['tania'], true).dias[11]['On Call'] || []).includes('tania'), 'on call a mano: de lunes a jueves');
const b = A.ponerEnBloque(c2, 12, 'Casa 2', ['myriam', 'marlene'], true);
ok([11, 12, 13].every((d) => A.en(b, d, 'Casa 2').join() === 'myriam,marlene') || [11, 12, 13].some((d) => c2.donde('myriam', d)), 'casa en fin de semana: se pone viernes a domingo');
// baja
const baja = A.darDeBaja(cfg, h, 'wendy', '2026-12');
ok(baja.config.personal.find((p) => p.id === 'wendy').hasta === '2026-11' && !JSON.stringify(baja.horario).includes('wendy') && A.activos(baja.config, '2026-11').some((p) => p.id === 'wendy') && !A.activos(baja.config, '2026-12').some((p) => p.id === 'wendy'), 'quitar a alguien: sale desde este mes, los anteriores quedan');
// migración
const viejo = A.normalizarConfig({ v: 2, personal: [{ id: 'miguel', n: 'Miguel', casas: ['Casa 1'], dias: [5] }, { id: 'sofia', n: 'Sofía', casas: ['Casa 2'], dias: [1, 2] }], nec: {} });
ok(viejo.v === 3 && viejo.personal.find((p) => p.id === 'myriam').casas.join() === 'Casa 2,Casa 3,Casa Esther' && viejo.personal.some((p) => p.id === 'sofia'), 'el personal guardado antes pasa a las reglas nuevas y conserva a los que agregaste');
ok(JSON.stringify(A.normalizarConfig(JSON.parse(JSON.stringify(cfg)))) === JSON.stringify(cfg), 'guardar y leer el personal no lo cambia');
