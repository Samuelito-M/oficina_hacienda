const { entender } = await import('../src/lib/asistente/entender.js');
const { responder } = await import('../src/lib/asistente/responder.js');
const A = await import('../src/lib/horarioApp.js');
const P = await import('../src/lib/personal.js');
const ok = (c, m) => { console.log((c ? 'ok - ' : 'FALLA - ') + m); if (!c) process.exitCode = 1; };
const hoy = new Date(2026, 10, 18);
const config = A.configInicial();
const h = A.horarioVacio();
for (const d of [20, 21, 22]) h.dias[d] = { 'Casa 1': ['miguel', 'patricia', 'mayra'], 'Casa 2': ['wendy', 'dayanith'], 'Casa 3': ['tania', 'marivid'], 'Casa 4': ['viviana', 'yazmira'], 'Casa Esther': ['devimar', 'myriam'] };
h.dias[22]['Casa 2'] = ['wendy', 'magali'];
for (const d of [23, 24, 25, 26]) h.dias[d] = { 'Casa 1': ['mayra'], 'On Call': ['viviana'] };
h.dias[19] = { 'Casa 3': ['myriam'], 'Casa 4': ['wendy'] };
h.vac = [{ id: 'marlene', de: 15, a: 30 }];
const ninos = [
  { id: 'k1', nombre: 'Mikaela Andrade', casa: 'Casa 3', nacimiento: '2017-03-03', tallaRopa: '8', tallaZapatos: '13', tallaRopaEC: '10', tallaZapatosEC: '31', tallasFecha: '2026-08-15T12:00:00Z' },
  { id: 'k2', nombre: 'Ana Lucía Pérez', casa: 'Casa 1', nacimiento: '2015-11-20', tallaRopa: '10', tallaZapatos: '2' },
  { id: 'k3', nombre: 'Ana Gómez', casa: 'Casa 2', nacimiento: '2012-11-25' },
  { id: 'k4', nombre: 'Josué Quishpe', casa: 'Casa 4', nacimiento: '2014-12-01' },
  { id: 'k5', nombre: 'Daniel', casa: 'Casa 3', nacimiento: '' }
];
let llamadas = 0;
const datos = {
  hoy,
  personal: P.sincronizarConHorario(P.normalizarPersonal([]), config),
  horario: async (m) => { llamadas++; return m === '2026-11' ? { horario: h, config } : null; },
  ninosLista: ninos,
  ninosPorId: new Map(ninos.map((n) => [n.id, n])),
  cargarNinos: async () => ninos
};
const texto = (r) => (r.partes || []).map((x) => x.p || (x.ul || x.pasos || []).join(' | ') || (x.casas || []).map((c) => `${c.casa}: ${c.texto}`).join(' | ')).join(' // ');
let ctx = null;
const pregunta = async (q) => { const e = entender(q, { hoy, trabajadores: config.personal, ninos, contexto: ctx }); ctx = e; const r = await responder(e, datos); return { e, r, t: texto(r) }; };
let x = await pregunta('¿Quién trabaja este fin de semana?');
ok(x.t.includes('Casa 1: Miguel, Paty y Mayra') && x.t.includes('Wendy, Dayanith (vie, sáb) y Magali (dom)'), 'fin de semana: casas y quién hace solo algunos días: ' + x.t.slice(0, 160));
x = await pregunta('y el domingo?');
ok(x.t.includes('Domingo 22') && x.t.includes('Casa 2: Wendy y Magali'), 'seguimiento "¿y el domingo?"');
x = await pregunta('kien esta en casa 4 el sabado');
ok(x.t.includes('Casa 4: Viviana y Yazmira') && !x.t.includes('Casa 1'), 'una sola casa');
x = await pregunta('quien esta de oncall');
ok(x.t.includes('lun 23 al jue 26') && x.t.includes('Viviana'), 'on call: si esta semana ya no hay, muestra la siguiente: ' + x.t);
x = await pregunta('on call la proxima semana');
ok(x.t.includes('Viviana') && x.t.includes('lun 23 al jue 26'), 'on call la próxima semana');
x = await pregunta('que dias trabaja myriam');
ok(x.t.includes('Myriam') && x.t.includes('jue 19 · Casa 3') && x.t.includes('vie 20 al dom 22 · Casa Esther') && x.t.includes('1 fin de semana'), 'días de Myriam agrupados: ' + x.t);
x = await pregunta('miryam trabaja el sabado?');
ok(x.t.startsWith('Sí, **Myriam** trabaja el sábado 21 de noviembre en **Casa Esther**'), 'sí/no con casa: ' + x.t);
x = await pregunta('y wendy el jueves?');
ok(x.t.includes('Wendy') && x.t.includes('Casa 4'), 'seguimiento con otra persona y día: ' + x.t);
x = await pregunta('quien descansa el jueves');
ok(x.t.includes('No trabajan') && !x.t.includes('Myriam') && x.t.includes('De vacaciones: Marlene'), 'quién descansa y quién está de vacaciones: ' + x.t.slice(0, 200));
x = await pregunta('que casas necesitan cambio de casa');
ok(x.t.includes('Casa 2') && !x.t.includes('Necesitan hoja de cambio de casa: **Casa 1') && x.r.botones[0].preparar === 'casas', 'cambio de casa: Casa 2 (no están Julián y Alejandra): ' + x.t);
x = await pregunta('cuando cumple micaela');
ok(x.t.includes('Mikaela Andrade** cumple 10 años el miércoles 3 de marzo') && x.t.includes('Ahora tiene 9'), 'cumpleaños con faltas de ortografía: ' + x.t);
x = await pregunta('y josue?');
ok(x.t.includes('Josué Quishpe** cumple 12 años'), 'seguimiento "¿y Josué?" mantiene la pregunta');
x = await pregunta('que talla de zapato tiene ana');
ok(x.t.includes('Ana Lucía Pérez') && x.t.includes('Ana Gómez') && x.t.includes('Zapatos: 2 (Americana)') && !x.t.includes('Ropa:'), 'dos Anas: responde las dos, solo zapatos: ' + x.t);
x = await pregunta('tallas de mikaela');
ok(x.t.includes('Ropa: 8 (Americana) · 10 (Ecuador)') && x.t.includes('Zapatos: 13 (Americana) · 31 (Ecuador)') && x.t.includes('hace 3 meses'), 'tallas americanas y de Ecuador con fecha: ' + x.t);
x = await pregunta('quienes cumplen años este mes');
ok(x.t.includes('(2)') && x.t.indexOf('Ana Lucía') < x.t.indexOf('Ana Gómez'), 'cumpleaños del mes en orden: ' + x.t);
x = await pregunta('quien cumple esta semana');
ok(x.t.includes('Ana Lucía Pérez cumple 11') && !x.t.includes('Ana Gómez'), 'cumpleaños de esta semana');
x = await pregunta('cuantos años tiene daniel');
ok(x.t.includes('No tengo la fecha'), 'niño sin fecha: lo dice');
x = await pregunta('que niños hay en casa 3');
ok(x.t.includes('Casa 3**: 2 niños') && x.t.includes('Daniel'), 'niños de una casa');
x = await pregunta('cuantos niños hay');
ok(x.t.includes('5 niños'), 'total de niños');
x = await pregunta('ya esta el horario de diciembre?');
ok(x.t.includes('Todavía no está hecho el horario de **diciembre 2026') && x.r.botones[0].mes === '2026-12', 'horario de diciembre no hecho, botón al mes');
x = await pregunta('quien trabaja el 25 de diciembre');
ok(x.t.includes('Todavía no hay horario guardado para diciembre 2026'), 'mes sin horario');
x = await pregunta('como armo el horario');
ok(x.r.partes[1].pasos.length >= 4 && x.r.botones[0].ir === 'horario' && x.r.sugerencias.length, 'cómo armar el horario: pasos + Llévame ahí + relacionadas');
x = await pregunta('Copiar el horario del mes anterior');
ok(x.e.tipo === 'guia' && x.e.articulo.id === 'copiar', 'tocar una sugerencia abre ese tema');
x = await pregunta('blablabla xyz');
ok(x.e.tipo === 'no_entendi' && x.r.sugerencias.length === 4, 'no entendí + ejemplos');
for (const [q, id] of [['como pongo vacaciones a mayra', 'vacaciones'], ['donde pongo la cedula', 'cedulas'], ['como imprimo las hojas de cambio de casa', 'cambiocasa'], ['como hago los acuerdos', 'acuerdos'], ['como subo fotos', 'fotosSubir'], ['como instalo la app en el celular', 'celular'], ['olvide la clave', 'clave'], ['como agrego un niño nuevo', 'ninoNuevo'], ['como separo en equipos', 'equipos'], ['hojas de regalo', 'regalos'], ['como arreglo el menu', 'menu'], ['excel de pagos', 'pagos'], ['como guardo los cambios del horario', 'guardar'], ['como descargo el horario en pdf', 'descargar'], ['que significa lo verde', 'verde'], ['como cambio las reglas', 'reglas'], ['como pongo una nota', 'notas'], ['como cambio a alguien de casa un dia', 'cambiar'], ['como borro el horario', 'borrar'], ['como se agrega un trabajador', 'trabajadores'], ['copia de seguridad', 'copiaSeguridad']]) {
  const e = entender(q, { hoy, trabajadores: config.personal, ninos });
  ok(e.tipo === 'guia' && e.articulo.id === id, `"${q}" → ${id}${e.tipo === 'guia' ? '' : ' (salió ' + e.tipo + ')'}${e.articulo && e.articulo.id !== id ? ' (salió ' + e.articulo.id + ')' : ''}`);
}
ok(llamadas < 40, 'no llama de más a Google');
const { idioma } = await import('../src/lib/asistente/texto.js');
ctx = null;
let ultimoLang = 'es';
const ask = async (q) => { const lang = idioma(q) || ultimoLang; ultimoLang = lang; const e = entender(q, { hoy, trabajadores: config.personal, ninos, contexto: ctx, idioma: lang }); if (e.tipo !== 'guia' && e.tipo !== 'no_entendi') ctx = e; const r = await responder(e, { ...datos, idioma: lang }); return { e, r, t: texto(r), lang }; };
x = await ask('Who works this weekend?');
ok(x.lang === 'en' && x.t.includes('**This weekend** (Fri 20 to Sun 22)') && x.t.includes('Wendy, Dayanith (fri, sat) and Magali (sun)'), 'EN: who works this weekend: ' + x.t.slice(0, 140));
x = await ask('and on Sunday?');
ok(x.t.includes('Sunday, November 22') && x.t.includes('Wendy and Magali'), 'EN: follow-up "and on Sunday?": ' + x.t.slice(0, 120));
x = await ask('Who is on call next week?');
ok(x.t.includes('On call from Mon 23 to Thu 26: **Viviana**'), 'EN: on call next week: ' + x.t);
x = await ask('Does Myriam work on Saturday?');
ok(x.t === 'Yes, **Myriam** works on Saturday, November 21 in **Casa Esther**.', 'EN: yes/no with house: ' + x.t);
x = await ask('What days does Myriam work?');
ok(x.t.includes('**Myriam** in November 2026: 4 days in houses, 1 weekend.') && x.t.includes('Fri 20 to Sun 22 · Casa Esther'), 'EN: days of a worker: ' + x.t);
x = await ask('Who has the day off on Thursday?');
ok(x.t.includes('Not working:') && x.t.includes('On vacation: Marlene.'), 'EN: day off and vacation');
x = await ask('Which houses need a house change this weekend?');
ok(x.t.includes('Need a house change sheet: **Casa 2**') && x.r.botones[0].t === 'Make the sheets', 'EN: house change');
x = await ask("When is Mikaela's birthday?");
ok(x.t.includes('**Mikaela Andrade** turns 10 on Wednesday, March 3 (in 105 days). Now 9 years old.'), 'EN: birthday: ' + x.t);
x = await ask('How old is Josue?');
ok(x.t.includes('**Josué Quishpe** is 11 years old (birthday: December 1).'), 'EN: age: ' + x.t);
x = await ask("What's Mikaela's shoe size?");
ok(x.t.includes('Shoes: 13 (US) · 31 (Ecuador)') && !x.t.includes('Clothes'), 'EN: shoe size in US and Ecuador: ' + x.t);
x = await ask('Whose birthday is this month?');
ok(x.t.includes('**Birthdays in November 2026** (2)') && x.t.includes('Fri 20 · Ana Lucía Pérez turns 11 · Casa 1'), 'EN: birthdays this month: ' + x.t);
x = await ask('How many kids are in house 3?');
ok(x.t.includes('**Casa 3**: 2 kids'), 'EN: kids per house');
x = await ask('Is the December schedule done?');
ok(x.t.includes("The **December 2026** schedule isn't done yet.") && x.r.botones[0].t === "Make December's", 'EN: schedule status');
x = await ask('Who works on 12/25?');
ok(x.t.includes('There is no saved schedule for December 2026 yet.'), 'EN: US date 12/25');
x = await ask('How do I build the schedule?');
ok(x.e.articulo.id === 'armar' && x.t.includes('Build the monthly schedule') && x.t.includes('**Armar el horario con las reglas** (Build with the rules)') && x.r.botones[0].t === 'Take me to Horario (Schedule)', 'EN: how-to with Spanish button names + translation');
x = await ask(x.r.sugerencias[0]);
ok(x.e.tipo === 'guia' && x.lang === 'en', 'EN: tapping an English suggestion opens that topic');
x = await ask('hello');
ok(x.t.includes("I'm the Office helper"), 'EN: hello');
x = await ask('thanks!');
ok(x.t.includes("You're welcome"), 'EN: thanks');
x = await ask('blah blah xyz');
ok(x.e.tipo === 'no_entendi', 'unknown stays unknown');
x = await ask('¿Quién trabaja el sábado?');
ok(x.lang === 'es' && x.t.includes('Sábado 21 de noviembre'), 'switching back to Spanish answers in Spanish');
for (const [q, id] of [['How do I copy last month schedule?', 'copiar'], ['How do I add a new worker?', 'trabajadores'], ['How do I make the agreements?', 'acuerdos'], ['Where do I put the ID number?', 'cedulas'], ['How do I upload photos?', 'fotosSubir'], ['How do I install the app on my phone?', 'celular'], ['I forgot the password', 'clave'], ['What does green mean?', 'verde'], ['How do I print the house change sheets?', 'cambiocasa'], ['how do i fix the menu', 'menu'], ['how do i add vacation for mayra', 'vacaciones'], ['how do I add a note', 'notas'], ['how do i delete the schedule', 'borrar'], ['how do I split kids into teams', 'equipos'], ['gift sheets', 'regalos'], ['payments excel', 'pagos'], ['how do I save my changes', 'guardar'], ['how do I download the schedule as pdf', 'descargar'], ['how do I change the rules', 'reglas'], ['how do I add a new child', 'ninoNuevo'], ['backup', 'copiaSeguridad']]) {
  const e = entender(q, { hoy, trabajadores: config.personal, ninos, idioma: 'en' });
  ok(e.tipo === 'guia' && e.articulo.id === id, `EN "${q}" → ${id}${e.tipo !== 'guia' ? ' (got ' + e.tipo + ')' : e.articulo.id !== id ? ' (got ' + e.articulo.id + ')' : ''}`);
}
