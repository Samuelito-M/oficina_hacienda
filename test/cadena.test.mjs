import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import JSZip from 'jszip';
import fs from 'fs';
globalThis.DOMParser = DOMParser; globalThis.XMLSerializer = XMLSerializer;
const { leerWord, generarWord } = await import('../src/lib/acuerdos.js');
let data = fs.readFileSync('/home/claude/e2e/out_acuerdos.docx');
for (const [mes, anio] of [[10, 2026], [11, 2026], [0, 2027]]) {
  const w = await leerWord(data, JSZip);
  const per = Object.fromEntries(w.personas.map(p => [p.completo, p.cedula]));
  const sab = [...Array(31).keys()].map(d => new Date(anio, mes, d + 1)).filter(d => d.getMonth() === mes && d.getDay() === 6);
  const acu = sab.flatMap(s => [{ completo: 'Salazar Miguel', cedula: per['Salazar Miguel'], sabado: s }, { completo: 'Viviana Chávez', cedula: per['Viviana Chávez'], sabado: s }]);
  data = Buffer.from(await generarWord(w, acu, { mes, anio, mantenerViejos: true }));
  const w2 = await leerWord(data, JSZip);
  console.log(mes + 1, anio, 'bloques', w2.bloques.length, 'nuevos', acu.length, 'finde', w2.bloques.filter(b => b.esFinde && b.sabado.getMonth() === mes).length);
  fs.writeFileSync(`/home/claude/e2e/cadena_${mes + 1}_${anio}.docx`, data);
}
