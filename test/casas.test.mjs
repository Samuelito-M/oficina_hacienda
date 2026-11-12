import * as PDFLib from 'pdf-lib';
import fs from 'fs';
import { generarCambiosDeCasa } from '../src/lib/casas.js';
const out = await generarCambiosDeCasa([
  { casa: 'Casa Esther', nombres: 'Coro - Dayanith', viernes: new Date(2026, 9, 23), domingo: new Date(2026, 9, 25) },
  { casa: 'Casa 1', nombres: 'Dayanith - Yvelice - Moisés Ñandú', viernes: new Date(2026, 9, 30), domingo: new Date(2026, 10, 1) }
], PDFLib);
fs.writeFileSync(process.argv[2], out); console.log('ok', out.length);
