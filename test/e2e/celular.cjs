const { iniciar } = require('./arnes.cjs');
(async () => {
  const { p, ok, entrar, cerrar, SALIDA } = await iniciar({ hash: '#horario', ancho: 390, alto: 844 });
  await entrar();
  await p.waitForSelector('#h-mes');
  if (await p.$('#h-armar')) await p.click('#h-armar');
  await p.waitForSelector('.h-barra');
  for (const t of ['inicio', 'acuerdos', 'casas', 'menu', 'ninos', 'horario', 'control']) {
    await p.goto(p.url().replace(/#.*$/, '') + '#' + t);
    await p.waitForTimeout(700);
    const ancho = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(ancho <= 392, `${t}: sin scroll de lado en el celular (${ancho}px)`);
    await p.screenshot({ path: `${SALIDA}/cel-${t}.png` });
  }
  await p.click('#as-abrir');
  await p.waitForTimeout(300);
  const ancho = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(ancho <= 392, `Sam Jr. en el celular (${ancho}px)`);
  await cerrar();
})();
