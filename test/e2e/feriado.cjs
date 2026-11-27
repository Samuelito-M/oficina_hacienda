const { iniciar } = require('./arnes.cjs');
(async () => {
  const { p, ok, fila, entrar, irA, preguntar, cerrar } = await iniciar({ hash: '#horario' });
  await entrar();
  await p.waitForSelector('#h-mes');
  await irA('Diciembre 2026');
  await p.waitForSelector('#h-armar');
  await p.click('#h-armar');
  await p.waitForSelector('.h-barra');
  await p.click('#h-guardar');
  await p.waitForTimeout(800);
  for (const [q, d] of [['pon el 25 como feriado', 25], ['quiero que el 24 sea feriado', 24], ['necesito que pongas el 31 como feriado', 31]]) {
    const r = await preguntar(q);
    ok(new RegExp(`Marqué el ${d} como feriado`).test(r), `“${q}” → ${r.slice(0, 60)}`);
  }
  await p.click('#asistente .as-bot:last-of-type button:has-text("Guardar")');
  await p.waitForTimeout(1000);
  ok([24, 25, 31].every((d) => fila('2026-12').fer.includes(d)), 'los feriados quedaron guardados en diciembre');
  await p.click('#h-ver-mes');
  await p.waitForTimeout(300);
  ok(/FERIADO|Feriado|feriado/.test(await p.textContent('.h-dia:has([data-d="25"])')), 'el 25 se ve como feriado en el horario');
  let r = await preguntar('el 24 ya no es feriado');
  ok(/Quité el feriado del 24/.test(r), 'quitar feriado: ' + r.slice(0, 50));
  r = await preguntar('¿el 25 es feriado?');
  ok(!/Marqué|Quité/.test(r), 'una pregunta no cambia nada');
  await preguntar('guarda el horario');
  await p.click('#tab-inicio');
  await p.waitForTimeout(400);
  r = await preguntar('el 1 de enero es feriado');
  ok(/Marqué el 1 como feriado \(enero 2027\)/.test(r), 'enero sin horario: ' + r.slice(0, 80));
  await p.waitForTimeout(800);
  ok((fila('2027-01') || { fer: [] }).fer.includes(1), 'el feriado de enero quedó guardado aunque enero no tiene horario');
  await cerrar();
})();
