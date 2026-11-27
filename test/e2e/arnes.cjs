const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const crear = require('../gasSim.cjs');

const RAIZ = path.resolve(__dirname, '..', '..');
const URL = 'https://script.google.com/macros/s/PRUEBA/exec';
const SALIDA = process.env.E2E_SALIDA || path.join(require('os').tmpdir(), 'oficina-e2e');
fs.mkdirSync(SALIDA, { recursive: true });
const MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

let fallas = 0;
let pasan = 0;
function ok(c, m) {
  console.log((c ? 'ok - ' : 'FALLA - ') + m);
  if (c) pasan++;
  else {
    fallas++;
    process.exitCode = 1;
  }
}

async function iniciar({ hash = '#inicio', ancho = 1280, alto = 950 } = {}) {
  const S = crear(path.join(RAIZ, 'google', 'Code.gs'));
  S.props.CLAVE = 'K';
  const b = await chromium.launch();
  const cx = await b.newContext({ viewport: { width: ancho, height: alto }, acceptDownloads: true, locale: 'es-EC', timezoneId: 'America/Guayaquil' });
  const errs = [];
  await cx.route('https://script.google.com/**', async (route) => {
    let cuerpo = {};
    try {
      cuerpo = JSON.parse(route.request().postData() || '{}');
    } catch {}
    let r;
    try {
      r = S.call(cuerpo);
    } catch (e) {
      r = { ok: false, error: String(e.message || e) };
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r) });
  });
  const p = await cx.newPage();
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
  p.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text());
  });
  p.on('dialog', (d) => d.accept());
  await p.goto('file://' + path.join(RAIZ, 'dist', 'index.html') + hash);
  const fila = (mes) => {
    const h = S.sheets.Horarios;
    if (!h) return null;
    const f = h.rows.find((x) => x[0] === mes);
    return f ? JSON.parse(f[1]) : null;
  };
  const entrar = async () => {
    await p.waitForSelector('#ninos-clave', { timeout: 15000 });
    if (await p.$('#ninos-url')) await p.fill('#ninos-url', URL);
    await p.fill('#ninos-clave', 'K');
    await p.click('form.lock button.dl');
  };
  const irA = async (txt) => {
    for (let i = 0; i < 40; i++) {
      const t = (await p.$eval('#h-mes', (e) => e.textContent)).trim();
      if (t === txt) return;
      const [m, a] = t.split(' ');
      const [m2, a2] = txt.split(' ');
      await p.click(+a2 * 12 + MES.indexOf(m2) > +a * 12 + MES.indexOf(m) ? '#h-mes-despues' : '#h-mes-antes');
      await p.waitForTimeout(200);
    }
    throw new Error('no llegué a ' + txt);
  };
  const preguntar = async (texto) => {
    if (!(await p.$('#asistente'))) await p.click('#as-abrir');
    await p.waitForSelector('#as-texto');
    const n0 = await p.$$eval('#asistente .as-bot:not(.as-pensando)', (x) => x.length);
    await p.fill('#as-texto', texto);
    await p.press('#as-texto', 'Enter');
    await p.waitForFunction((n) => document.querySelectorAll('#asistente .as-bot:not(.as-pensando)').length > n && !document.querySelector('#asistente .as-pensando'), n0, { timeout: 20000 });
    return p.$$eval('#asistente .as-bot', (l) => l[l.length - 1].textContent);
  };
  const ultimoBot = () => p.$('#asistente .as-bot:last-of-type');
  const cerrar = async () => {
    ok(!errs.length, 'sin errores en la página' + (errs.length ? ': ' + errs.slice(0, 4).join(' | ') : ''));
    console.log(`\n${pasan} bien, ${fallas} fallas`);
    await b.close();
  };
  return { b, cx, p, S, URL, ok, errs, fila, entrar, irA, preguntar, ultimoBot, cerrar, SALIDA, MES };
}

module.exports = { iniciar, ok, URL, SALIDA, RAIZ };
