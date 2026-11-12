import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import JSZip from 'jszip';
import fs from 'fs';
globalThis.DOMParser = DOMParser; globalThis.XMLSerializer = XMLSerializer;
const { leerWord, generarWord, bloquesQueSeQuedan } = await import('../src/lib/acuerdos.js');
const data = fs.readFileSync(process.argv[2]);
const w = await leerWord(data, JSZip);
console.log('bloques', w.bloques.length, 'personas', w.personas.length);
for (const b of w.bloques) console.log(b.esFinde ? 'FINDE' : 'otro ', b.titulo.slice(0, 30), '|', b.completo, b.cedula ? b.cedula.slice(0, 2) + '…' : '', b.sabado ? b.sabado.toDateString() : '');
const quedan = bloquesQueSeQuedan(w, 10, 2026);
console.log('quedan para noviembre', quedan.length, quedan.map(b => b.completo || b.titulo.slice(0, 20)));
const per = Object.fromEntries(w.personas.map(p => [p.completo, p.cedula]));
const acuerdos = [
  { completo: 'Salazar Miguel', cedula: per['Salazar Miguel'], sabado: new Date(2026, 10, 7) },
  { completo: 'Ayala Patricia', cedula: per['Ayala Patricia'], sabado: new Date(2026, 10, 7) },
  { completo: 'Prueba Persona Nueva', cedula: '1234567890', sabado: new Date(2026, 10, 28) },
];
const out = await generarWord(await leerWord(data, JSZip), acuerdos, { mes: 10, anio: 2026, mantenerViejos: true });
fs.writeFileSync(process.argv[3], out);
console.log('ok', out.length);
