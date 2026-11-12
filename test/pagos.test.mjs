import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import JSZip from 'jszip';
import fs from 'fs';
globalThis.DOMParser = DOMParser; globalThis.XMLSerializer = XMLSerializer;
const { leerGrillaExcel, analizarHorarioExcel } = await import('../src/lib/horarioExcel.js');
const { PERSONAL_BASE } = await import('../src/lib/personal.js');
const { acuerdosElegidos } = await import('../src/lib/seleccion.js');
const { generarExcelPagos, filasPagos } = await import('../src/lib/pagos.js');
const hojas = await leerGrillaExcel(fs.readFileSync(process.argv[2]), JSZip);
const h = analizarHorarioExcel(hojas, PERSONAL_BASE, 'HORARIO.xlsx');
// fijos con cédula de prueba para que sean elegibles
const personal = PERSONAL_BASE.map((p, i) => ({ ...p, completo: p.completo || `APELLIDO ${p.nombre.toUpperCase()}`, cedula: p.cedula || String(1700000000 + i).padStart(10, '0') }));
const lista = acuerdosElegidos(h, personal, {});
const f = filasPagos(lista, 60);
console.log('acuerdos', lista.length, 'personas', f.resumen.length, 'total', f.total);
fs.writeFileSync(process.argv[3], await generarExcelPagos(lista, 60, JSZip));
