import { crearExcel } from './excel.js';
import { finDeSemanaCorto, MESES3 } from './text.js';

const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const finde = (sab) => {
  const t = finDeSemanaCorto(sab);
  return /[a-z]/i.test(t) ? t : `${t} ${MESES3[sab.getMonth()]}`;
};

export function filasPagos(lista, monto) {
  const porPersona = new Map();
  for (const a of lista) {
    if (!porPersona.has(a.persona.id)) porPersona.set(a.persona.id, { p: a.persona, items: [] });
    porPersona.get(a.persona.id).items.push(a);
  }
  const nombre = (a) => a.completo || a.persona.completo || a.persona.nombre;
  const resumen = Array.from(porPersona.values()).map(({ p, items }) => [
    items[0].completo || p.completo || p.nombre,
    p.cedula || '',
    items.length,
    items.map((a) => finde(a.sabado)).join(', '),
    Array.from(new Set(items.map((a) => a.casa))).join(', '),
    items.length * monto
  ]);
  const detalle = lista.map((a) => [nombre(a), a.cedula || a.persona.cedula || '', a.sabado, a.finde && a.finde.domingo ? a.finde.domingo : addDays(a.sabado, 1), a.casa, monto]);
  return { resumen, detalle, total: lista.length * monto, acuerdos: lista.length };
}

export function generarExcelPagos(lista, monto, JSZip) {
  const f = filasPagos(lista, monto);
  return crearExcel(
    [
      {
        nombre: 'Resumen',
        columnas: [
          { t: 'Persona', w: 34 },
          { t: 'Cédula', w: 13 },
          { t: 'Acuerdos', w: 10, tipo: 'numero' },
          { t: 'Fines de semana', w: 30 },
          { t: 'Casa', w: 18 },
          { t: 'Total', w: 12, tipo: 'dinero' }
        ],
        filas: f.resumen,
        total: ['Total', '', f.acuerdos, '', '', f.total]
      },
      {
        nombre: 'Detalle',
        columnas: [
          { t: 'Persona', w: 34 },
          { t: 'Cédula', w: 13 },
          { t: 'Sábado', w: 12, tipo: 'fecha' },
          { t: 'Domingo', w: 12, tipo: 'fecha' },
          { t: 'Casa', w: 14 },
          { t: 'Valor', w: 12, tipo: 'dinero' }
        ],
        filas: f.detalle,
        total: ['Total', '', '', '', '', f.total]
      }
    ],
    JSZip
  );
}
