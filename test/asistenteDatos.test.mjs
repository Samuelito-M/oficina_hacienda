import fs from 'fs';
import JSZip from 'jszip';
import * as PDFLib from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
const { entender } = await import('../src/lib/asistente/entender.js');
const { responder } = await import('../src/lib/asistente/responder.js');
const { idioma } = await import('../src/lib/asistente/texto.js');
const { crearDescarga } = await import('../src/lib/asistente/descargas.js');
const A = await import('../src/lib/horarioApp.js');
const P = await import('../src/lib/personal.js');
const ok = (c, m) => { console.log((c ? 'ok - ' : 'FALLA - ') + m); if (!c) process.exitCode = 1; };
const hoy = new Date(2026, 10, 24);
const cfg = A.configInicial();
const dic = A.armar('2026-12', { dias: {}, vac: [], fer: [], notas: {}, obs: '' }, cfg, null).horario;
const personal = P.sincronizarConHorario(P.normalizarPersonal([]), cfg);
const ninos = [
  { id: 'a', nombre: 'Ana', casa: 'Casa 3', sexo: 'F', nacimiento: '2015-03-02' },
  { id: 'b', nombre: 'Belén', casa: 'Casa 1', sexo: 'F', nacimiento: '2010-07-10' },
  { id: 'c', nombre: 'Carlos', casa: 'Casa 3', sexo: 'M', nacimiento: '2012-01-20' },
  { id: 'd', nombre: 'Dana', casa: 'Casa 3', sexo: 'F', nacimiento: '2009-11-30' },
  { id: 'e', nombre: 'Elías', casa: 'Casa 2', sexo: '', nacimiento: '2016-05-05' }
];
let vivo = null;
const servidor = { '2026-12': { horario: dic, config: cfg } };
const horario = async (m) => (vivo && vivo.clave === m ? { horario: vivo.horario, config: cfg, vivo: true, sinGuardar: true } : servidor[m] || null);
const cargarNinos = async () => ninos;
const texto = (r) => (r.partes || []).map((x) => x.p || (x.ul || []).join(' | ') || (x.casas || []).map((c) => `${c.casa}: ${c.texto}`).join(' | ')).join(' // ');
const ask = async (q, extra = {}) => {
  const lang = idioma(q) || 'es';
  const e = entender(q, { hoy, trabajadores: cfg.personal, ninos, idioma: lang });
  const r = await responder(e, { hoy, idioma: lang, personal, horario, cargarNinos, ninosLista: ninos, ninosPorId: new Map(ninos.map((n) => [n.id, n])), ...extra });
  return { e, r, t: texto(r) };
};
const ctx = A.contexto('2026-12', dic, cfg);
const findesMayra = ctx.findes.filter((f) => f.dias.some((d) => ctx.donde('mayra', d))).length;
let x = await ask('cuantos fines de semana trabaja Mayra en diciembre');
ok(x.e.tipo === 'dias_persona' && x.t.includes(`**${findesMayra} ${findesMayra === 1 ? 'fin de semana' : 'fines de semana'}**`) && x.r.partes[1].ul.length === findesMayra, `fines de semana de Mayra en diciembre (${findesMayra}): ${x.t}`);
x = await ask('cuantos fines trabaja Mayra', { mesActivo: '2026-12' });
ok(x.t.toLowerCase().includes('diciembre') && x.r.partes[1].ul.length === findesMayra, 'sin decir el mes, usa el mes abierto en Horario (diciembre): ' + x.t.slice(0, 60));
x = await ask('cuantos fines trabaja Mayra');
ok(!x.t.toLowerCase().includes('diciembre'), 'fuera del Horario usa el mes actual (noviembre): ' + x.t.slice(0, 70));
vivo = { clave: '2026-12', horario: A.poner(A.armar('2026-12', { dias: {}, vac: [], fer: [], notas: {}, obs: '' }, cfg, null).horario, 5, 'Casa 1', ['x:Juan Pérez']) };
x = await ask('quien trabaja el 5 de diciembre en casa 1', { mesActivo: '2026-12' });
ok(x.t.includes('Juan Pérez') && !x.t.includes('x:'), 'responde con lo que estoy armando aunque no esté guardado (Juan el 5): ' + x.t);
vivo = null;
x = await ask('how many weekends does Mayra work in december');
ok(x.t.includes(`works **${findesMayra} weekend`) && /Fri|Sat|Sun/.test(x.t), 'EN: weekends: ' + x.t.slice(0, 90));
x = await ask('dame una lista de las niñas');
ok(x.e.tipo === 'lista_ninos' && x.t.includes('**Niñas**: 3') && x.t.includes('Ana') && x.t.includes('Dana') && !x.t.includes('Carlos'), 'lista de niñas: ' + x.t);
ok(x.t.includes('1 niños no tienen puesto'), 'avisa que a alguien le falta niña/niño');
ok(x.r.botones.length === 2 && x.r.botones.every((b) => b.descarga && b.descarga.ids.length === 3), 'trae botones para descargar Excel y PDF');
const btnX = x.r.botones.find((b) => b.descarga.formato === 'xlsx').descarga;
const btnP = x.r.botones.find((b) => b.descarga.formato === 'pdf').descarga;
x = await ask('cuantas niñas hay en casa 3');
ok(x.t.includes('**Niñas de Casa 3**: 2'), 'niñas de casa 3: ' + x.t);
x = await ask('niños mayores de 12');
ok(x.t.includes('Belén') && x.t.includes('Carlos') && x.t.includes('Dana') && !x.t.includes('Ana ·'), 'mayores de 12: ' + x.t);
x = await ask('lista de varones');
ok(x.t.includes('Carlos') && !x.t.includes('Ana'), 'varones: ' + x.t);
x = await ask('give me a list of the girls in casa 3');
ok(x.t.includes('**Girls in Casa 3**: 2') && x.r.botones[0].t === 'Download Excel', 'EN girls: ' + x.t);
x = await ask('lista del personal', { mesActivo: '2026-12' });
ok(x.e.tipo === 'lista_personal' && x.t.includes('Personal · diciembre 2026') && x.t.includes('Mayra') && x.t.includes('Miguel'), 'lista del personal: ' + x.t.slice(0, 120));
const btnPer = x.r.botones[0].descarga;
x = await ask('quienes son los auxiliares de casa 3', { mesActivo: '2026-12' });
ok(x.t.includes('Auxiliares · Casa 3') && !x.t.includes('Tania'), 'auxiliares de casa 3 (sin los padres): ' + x.t.slice(0, 140));
x = await ask('dame el horario de diciembre');
ok(x.e.tipo === 'horario_descarga' && x.r.botones.filter((b) => b.descarga).length === 2, 'dame el horario → botones PDF y Excel');
const btnH = x.r.botones.find((b) => b.descarga && b.descarga.formato === 'pdf').descarga;
x = await ask('dame el horario de febrero');
ok(x.t.includes('todavía no tiene horario'), 'mes sin horario: ' + x.t);
x = await ask('cuantos niños hay en casa 3');
ok(x.e.tipo === 'ninos_casa', 'lo de antes sigue igual (cuántos niños hay en casa 3)');
const recursos = { normal: fs.readFileSync('node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff'), bold: fs.readFileSync('node_modules/@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff') };
const libs = { JSZip, PDFLib, fontkit, cargarRecursos: async () => recursos };
const dx = await crearDescarga(btnX, { cargarNinos, horario, personal, libs });
const hoja = await (await JSZip.loadAsync(dx.bytes)).file('xl/worksheets/sheet1.xml').async('string');
ok(dx.nombre.endsWith('.xlsx') && hoja.includes('Ana') && hoja.includes('Belén') && hoja.includes('Dana') && !hoja.includes('Carlos'), 'el Excel de niñas trae solo a las niñas: ' + dx.nombre);
const dp = await crearDescarga(btnP, { cargarNinos, horario, personal, libs });
ok(dp.nombre.endsWith('.pdf') && dp.bytes.length > 1000, 'el PDF de niñas se arma');
const dper = await crearDescarga(btnPer, { cargarNinos, horario, personal, libs });
const hp = await (await JSZip.loadAsync(dper.bytes)).file('xl/worksheets/sheet1.xml').async('string');
ok(hp.includes('Mayra') && hp.includes('Auxiliar') && !/\d{10}/.test(hp), 'el Excel del personal (sin cédulas)');
const dh = await crearDescarga(btnH, { cargarNinos, horario, personal, libs });
ok(dh.nombre === 'HORARIO DICIEMBRE 2026.pdf' && dh.bytes.length > 2000, 'el PDF del horario: ' + dh.nombre);
for (const [q, id] of [['como pongo a alguien que no esta en el personal', 'cambiar'], ['how do I add a volunteer who is not on the staff', 'cambiar'], ['quiero completar la semana con enero', 'continuar'], ['complete the last week with the next month', 'continuar']]) {
  const e = entender(q, { hoy, trabajadores: cfg.personal, ninos, idioma: idioma(q) || 'es' });
  ok(e.tipo === 'guia' && e.articulo.id === id, `"${q}" → guía ${id}`);
}
