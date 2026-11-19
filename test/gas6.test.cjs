const crear = require('./gasSim.cjs');
const ok = (c, m) => { console.log((c ? 'ok - ' : 'FALLA - ') + m); if (!c) process.exitCode = 1; };
const S = crear(__dirname + '/../google/Code.gs'); S.props.CLAVE = 'K';
const tk = S.call({ accion: 'entrar', clave: 'K' }).token;
const aus = [
  { t: 'lic', de: '2026-11-20', a: '2027-02-10', n: 'Maternidad' },
  { t: 'xx', de: '2026-12-01', a: '2026-12-02' },
  { t: 'med', de: '2026-12-10', a: '2026-12-05' },
  { t: 'vac', de: 'mañana', a: '2026-12-05' },
  null
];
let r = S.call({ accion: 'guardarPersonal', token: tk, lista: [{ id: 'wendy', nombre: 'Wendy', aus }, { id: 'mayra', nombre: 'Mayra' }] });
ok(r.ok, 'guarda personal con ausencias');
r = S.call({ accion: 'personal', token: tk }).datos.lista;
const w = r.find((p) => p.id === 'wendy');
ok(w.aus.length === 2 && w.aus[0].t === 'lic' && w.aus[0].n === 'Maternidad' && w.aus[1].t === 'otro', 'limpia: quita fechas malas y los motivos raros pasan a otro');
ok(!r.find((p) => p.id === 'mayra').aus, 'quien no tiene ausencias no trae el campo');
const muchas = Array.from({ length: 300 }, (_, i) => ({ t: 'vac', de: '2026-01-01', a: '2026-01-02' }));
S.call({ accion: 'guardarPersonal', token: tk, lista: [{ id: 'wendy', nombre: 'Wendy', aus: muchas }] });
ok(S.call({ accion: 'personal', token: tk }).datos.lista[0].aus.length === 120, 'tope de 120 ausencias por persona');
ok(S.call({ accion: 'personal' }).error === 'sesion', 'sin clave no se leen las ausencias');
