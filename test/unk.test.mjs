import { construirTokenizador, leerCelda } from '../src/lib/horario.js';
import { PERSONAL_BASE } from '../src/lib/personal.js';
const tk = construirTokenizador(PERSONAL_BASE);
const cases = ['Casa 1: Miguel y Pa G Casa 2: Pedro y Mayra On Call: Jauna (Tania Vac.)', 'Casa Esther: Devimar e Yazmir', 'Casa 4: Viviana y Moises (Yveli', 'Casa 3: Dayaith y Ana María', 'Casa 5: Wendy'];
for (const c of cases) console.log(c, '=>', JSON.stringify(leerCelda(c, tk)));
