const { iniciar } = require('./arnes.cjs');
(async () => {
  const { p, ok, S, fila, entrar, irA, cerrar } = await iniciar({ hash: '#horario' });
  const t = S.call({ accion: 'entrar', clave: 'K' }).token;
  const dias = {};
  for (let d = 1; d <= 31; d++) {
    const w = new Date(2027, 2, d).getDay();
    dias[d] = { 'Casa 1': ['marlene'], 'Casa 4': [5, 6, 0].includes(w) && d >= 5 && d <= 7 ? ['viviana'] : ['yazmira'] };
  }
  for (const d of [8, 9, 10, 11]) dias[d]['On Call'] = ['viviana'];
  dias[16]['On Call'] = ['tania'];
  S.call({ accion: 'guardarHorario', token: t, mes: '2027-03', horario: { dias, vac: [], fer: [], notas: {}, obs: '' } });
  await entrar();
  await p.waitForSelector('#h-mes');
  await irA('Marzo 2027');
  await p.waitForSelector('.h-barra');
  await p.waitForTimeout(500);
  const toast = await p.textContent('.toast').catch(() => '');
  ok(/Completé el on call/.test(toast), 'avisa que completó el on call: ' + toast.slice(0, 80));
  await p.click('#h-ver-mes');
  await p.waitForTimeout(300);
  const oc = async (d) => (await p.textContent(`[data-d="${d}"][data-k="On Call"]`)).replace(/On call/i, '').trim();
  ok(/Viviana/.test(await oc(5)) && /Viviana/.test(await oc(11)), 'Viviana del viernes 5 al jueves 11');
  ok(/Tania/.test(await oc(16)), 'Tania (puesta a mano en el horario viejo) se respeta el 16');
  ok(/Jauna/.test(await oc(13)) && /Jauna/.test(await oc(20)), 'Jauna los otros días');
  await p.click('#h-guardar');
  await p.waitForTimeout(800);
  await p.reload();
  await entrar().catch(() => {});
  await p.waitForSelector('#h-mes');
  await irA('Marzo 2027');
  await p.waitForSelector('.h-barra');
  await p.waitForTimeout(500);
  const toast2 = await p.textContent('.toast').catch(() => '');
  ok(!/Completé el on call/.test(toast2), 'después de guardar, ya no avisa ni cambia nada al entrar');
  ok((fila('2027-03').dias[16]['On Call'] || []).join() === 'tania', 'Tania quedó guardada');
  await cerrar();
})();
