const { iniciar } = require('./arnes.cjs');
const fs = require('fs');
const path = require('path');
const DATOS = process.env.DATOS || '/home/claude/datos';
(async () => {
  const T = await iniciar({ hash: '#inicio' });
  const { p, ok, S, entrar, irA, preguntar, cerrar, SALIDA, errs } = T;
  const paso = async (nombre, fn) => {
    const n0 = errs.length;
    try {
      await fn();
    } catch (e) {
      ok(false, `${nombre}: ${String(e.message).split('\n')[0]}`);
    }
    if (errs.length > n0) console.log(`   (errores en ${nombre}: ${errs.slice(n0).join(' | ')})`);
  };
  const bajar = async (selector, nombre) => {
    const [d] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click(selector)]);
    const f = path.join(SALIDA, d.suggestedFilename());
    await d.saveAs(f);
    ok(fs.statSync(f).size > 200, `${nombre}: ${d.suggestedFilename()} (${fs.statSync(f).size} bytes)`);
    return f;
  };
  const tab = async (k) => {
    await p.click(`#tab-${k}`);
    await p.waitForTimeout(400);
  };

  await paso('Inicio sin clave', async () => {
    await p.waitForSelector('#t-inicio');
    ok(await p.isVisible('#t-inicio'), 'Inicio abre');
  });

  await paso('Niños: entrar', async () => {
    await tab('ninos');
    await entrar();
    await p.waitForSelector('#ninos-buscar', { timeout: 15000 });
    const t = S.call({ accion: 'entrar', clave: 'K' }).token;
    const casas = ['Casa 1', 'Casa 2', 'Casa 3', 'Casa 4', 'Casa Esther'];
    for (let i = 0; i < 20; i++) S.call({ accion: 'guardar', token: t, nino: { nombre: `Niño Prueba ${i + 1}`, casa: casas[i % 5], nacimiento: `20${String(10 + (i % 9)).padStart(2, '0')}-0${(i % 9) + 1}-1${i % 9}`, sexo: i % 2 ? 'F' : 'M', tallaRopa: String(4 + (i % 8)), tallaZapatos: String(24 + i) } });
    await p.click('text=Actualizar').catch(() => {});
    await p.waitForTimeout(800);
    const filas = await p.$$eval('#t-ninos ~ * li, .ninos-lista li, table tbody tr', (l) => l.length).catch(() => 0);
    ok((await p.textContent('body')).includes('Niño Prueba 7'), 'la lista de niños se ve: ' + filas);
  });

  await paso('Niños: editar uno', async () => {
    await p.click('tr:has-text("Niño Prueba 7") button:has-text("Editar")');
    await p.waitForSelector('#f-nombre', { timeout: 5000 });
    await p.fill('#f-ropa', '10');
    await p.click('form button.mini.solid');
    await p.waitForTimeout(800);
    const t = S.call({ accion: 'entrar', clave: 'K' }).token;
    const n = S.call({ accion: 'listar', token: t }).ninos.find((x) => x.nombre === 'Niño Prueba 7');
    ok(n && n.tallaRopa === '10', 'guardar la talla');
  });

  await paso('Niños: equipos', async () => {
    await p.click('button:has-text("Equipos")');
    await p.waitForSelector('#eq-cuantos', { timeout: 5000 });
    await p.click('#eq-mezclar').catch(() => {});
    await p.waitForTimeout(400);
    await bajar('#eq-pdf', 'PDF de equipos');
    await p.keyboard.press('Escape');
  });

  await paso('Niños: tallas y documentos', async () => {
    await p.click('button:has-text("Tallas")');
    await p.waitForTimeout(500);
    await p.keyboard.press('Escape');
    await p.click('button.dl:has-text("ocumentos")');
    await p.waitForSelector('#doc-lista', { timeout: 5000 });
    for (const [k, n] of [['lista', 'Lista de niños'], ['regalos', 'Hojas de regalos'], ['directorio', 'Directorio'], ['cumple', 'Cumpleaños del mes']]) {
      await p.click(`#doc-${k}`);
      await p.waitForTimeout(200);
      const b = await p.$$('.ficha .row-actions button.mini.solid, .ficha button.mini.solid');
      if (!b.length) { ok(false, `${n}: sin botón`); continue; }
      const [d] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), b[0].click()]);
      const f = path.join(SALIDA, d.suggestedFilename());
      await d.saveAs(f);
      ok(fs.statSync(f).size > 200, `${n}: ${d.suggestedFilename()}`);
    }
  });

  await paso('Horario: armar y guardar', async () => {
    await tab('horario');
    await p.waitForSelector('#h-mes', { timeout: 15000 });
    await irA('Noviembre 2026');
    if (await p.$('#h-armar')) await p.click('#h-armar');
    await p.waitForSelector('.h-barra');
    await p.click('#h-guardar');
    await p.waitForTimeout(800);
    await irA('Diciembre 2026');
    await p.waitForSelector('#h-armar');
    await p.click('#h-armar');
    await p.waitForSelector('.h-barra');
    await p.click('#h-guardar');
    await p.waitForTimeout(800);
    ok(!!T.fila('2026-12'), 'diciembre guardado');
  });

  await paso('Horario: conteo, AM/PM, continuación', async () => {
    await p.click('#h-ver-mes');
    await p.click('#h-conteo');
    await p.waitForSelector('#h-conteo-lista');
    ok((await p.$$('#h-conteo-lista li')).length > 5, 'conteo de fines de semana');
    await p.keyboard.press('Escape');
    await p.click('[data-d="9"][data-k="Casa 1"]');
    await p.waitForSelector('#h-elegir-ok');
    const b = await p.$('dialog[open] [data-tur$="|pm"]');
    if (b) await b.click();
    await p.click('#h-elegir-ok');
    await p.waitForTimeout(200);
    ok(/PM/.test(await p.textContent('[data-d="9"][data-k="Casa 1"]')), 'PM en el día 9');
    await p.check('#h-continuar').catch(() => {});
    await p.waitForTimeout(1200);
    ok(/ene/.test(await p.textContent('body')), 'continuación con enero');
  });

  await paso('Horario: descargas', async () => {
    await p.click('#h-descargar');
    await p.waitForSelector('#h-bajar-pdf');
    await bajar('#h-bajar-pdf', 'Horario PDF');
    await p.click('#h-descargar').catch(() => {});
    await p.waitForSelector('#h-bajar-excel');
    await bajar('#h-bajar-excel', 'Horario Excel');
    await p.keyboard.press('Escape');
  });

  await paso('Horario: personal y reglas (on call por defecto)', async () => {
    await p.click('#h-personal');
    await p.click('#h-tab-reglas');
    await p.fill('#h-r-ocdef', 'Ana');
    await p.click('#h-personal-ok');
    await p.waitForTimeout(600);
    const oc = await p.$$eval('[data-k="On Call"]', (l) => l.map((e) => e.textContent));
    ok(oc.some((t) => /Ana/.test(t)) && !oc.some((t) => /Jauna/.test(t)), 'cambiar el on call por defecto a Ana se ve en el horario');
    await p.click('#h-personal');
    await p.click('#h-tab-reglas');
    await p.fill('#h-r-ocdef', 'Jauna');
    await p.click('#h-personal-ok');
    await p.waitForTimeout(400);
    await p.click('#h-guardar');
    await p.waitForTimeout(800);
  });

  await paso('Horario: ausencias y feriados', async () => {
    await p.click('#h-vacaciones');
    await p.waitForSelector('#h-vac-quien');
    const ops = await p.$$eval('#h-vac-quien option', (l) => l.map((o) => o.value).filter(Boolean));
    await p.selectOption('#h-vac-quien', ops.includes('mayra') ? 'mayra' : ops[0]);
    await p.selectOption('#h-aus-tipo', 'med');
    await p.fill('#h-vac-de', '2026-12-15');
    await p.fill('#h-vac-a', '2026-12-16');
    await p.click('#h-vac-ok');
    await p.waitForTimeout(400);
    ok(/15/.test(await p.textContent('dialog[open]')), 'ausencia anotada');
    await p.keyboard.press('Escape');
  });

  await paso('Control de personal', async () => {
    await tab('control');
    await p.waitForSelector('#ct-tabla', { timeout: 10000 });
    ok(/Mayra/.test(await p.textContent('#ct-tabla')), 'la ausencia sale en Control');
    await p.selectOption('#ct-quien', { index: 2 });
    await p.selectOption('#ct-tipo', 'fam');
    await p.fill('#ct-de', '2026-12-02');
    await p.click('#ct-ok');
    await p.waitForTimeout(300);
    await bajar('#ct-csv', 'Reporte CSV');
  });

  await paso('Acuerdos', async () => {
    await tab('acuerdos');
    await p.waitForSelector('#t-acuerdos');
    await p.click('#usar-horario-app');
    await p.click('[data-mes="2026-12"]');
    await p.waitForTimeout(1500);
    const word = path.join(DATOS, 'ACUERDOS_DE_TRABAJO_OCTUBRE_2026.docx');
    const inputs = await p.$$('section:has(#t-acuerdos) input[type=file]');
    let subido = false;
    for (const i of inputs) {
      const acc = (await i.getAttribute('accept')) || '';
      if (/docx/.test(acc)) {
        await i.setInputFiles(word);
        subido = true;
        break;
      }
    }
    ok(subido, 'subí el Word');
    await p.waitForTimeout(1500);
    const botones = await p.$$eval('button.dl', (l) => l.map((b) => b.textContent.trim()));
    console.log('   botones acuerdos:', botones.join(' | '));
    const bWord = await p.$('button.dl:has-text("Word")');
    if (bWord) await bajar('button.dl:has-text("Word")', 'Word de acuerdos');
    const bPagos = await p.$('button.dl:has-text("pagos"), button.dl:has-text("Pagos")');
    if (bPagos) await bajar('button.dl:has-text("agos")', 'Excel de pagos');
  });

  await paso('Cambio de casa', async () => {
    await tab('casas');
    await p.waitForSelector('#t-casas');
    await p.waitForTimeout(800);
    console.log('   casas:', (await p.textContent('section:has(#t-casas)')).slice(0, 300));
    const marcadas = await p.$$eval('section:has(#t-casas) input[type=checkbox]:checked', (l) => l.length);
    if (!marcadas) await p.click('section:has(#t-casas) input[type=checkbox]');
    await bajar('section:has(#t-casas) button.dl:has-text("Descargar PDF")', 'PDF de cambio de casa');
  });

  await paso('Menú', async () => {
    await tab('menu');
    await p.waitForSelector('#t-menu');
    const i = await p.$('section:has(#t-menu) input[type=file]');
    await i.setInputFiles(path.join(DATOS, 'MENU_16_de_Octubre.xlsx'));
    await p.waitForSelector('.result', { timeout: 10000 });
    await bajar('.result button.dl', 'Menú limpio');
  });

  await paso('Sam Jr.', async () => {
    let r = await preguntar('¿quién trabaja el 12 de diciembre?');
    ok(/Casa 1/.test(r), 'quién trabaja');
    r = await preguntar('¿quién está de on call el 22 de diciembre?');
    ok(/Viviana|Jauna/.test(r), 'on call: ' + r.slice(0, 80));
    r = await preguntar('dame el conteo de fines de semana de diciembre');
    ok(/Fines de semana/.test(r), 'conteo');
    r = await preguntar('dame la lista de las niñas');
    ok(/Niño Prueba/.test(r), 'lista de niñas');
    r = await preguntar('cuántas vacaciones tomó Mayra este año');
    ok(r.length > 10, 'ausencias de Mayra: ' + r.slice(0, 60));
  });

  await paso('Inicio con datos', async () => {
    await tab('inicio');
    await p.waitForTimeout(1500);
    const t = await p.textContent('section:has(#t-inicio)');
    console.log('   inicio:', t.slice(0, 300));
    ok(/Viviana|Jauna|on call/i.test(t), 'Inicio con datos del horario');
  });
  await cerrar();
})();
