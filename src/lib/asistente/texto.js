const DIAS_EN = { monday: 'lunes', mon: 'lunes', tuesday: 'martes', tue: 'martes', tues: 'martes', wednesday: 'miercoles', wed: 'miercoles', thursday: 'jueves', thu: 'jueves', thur: 'jueves', thurs: 'jueves', friday: 'viernes', fri: 'viernes', saturday: 'sabado', sat: 'sabado', sunday: 'domingo', sun: 'domingo' };
const MESES_EN = { january: 'enero', jan: 'enero', february: 'febrero', feb: 'febrero', march: 'marzo', april: 'abril', apr: 'abril', june: 'junio', july: 'julio', august: 'agosto', aug: 'agosto', september: 'septiembre', sept: 'septiembre', sep: 'septiembre', october: 'octubre', oct: 'octubre', november: 'noviembre', nov: 'noviembre', december: 'diciembre', dec: 'diciembre' };
const PALABRAS_EN = {
  today: 'hoy', tonight: 'hoy', tomorrow: 'manana', tmrw: 'manana', yesterday: 'ayer', week: 'semana', weeks: 'semana', month: 'mes', months: 'mes', day: 'dia', days: 'dias',
  who: 'quien', whos: 'quien', whom: 'quien', what: 'que', whats: 'que', which: 'cual', when: 'cuando', where: 'donde', how: 'como', next: 'proximo', following: 'siguiente', previous: 'anterior', of: 'de', the: 'el',
  work: 'trabaja', works: 'trabaja', working: 'trabaja', worked: 'trabaja', shift: 'turno', shifts: 'turnos', cover: 'cubre', covers: 'cubre', covering: 'cubre',
  off: 'descansa', rest: 'descansa', rests: 'descansa', resting: 'descansa', free: 'libre',
  schedule: 'horario', schedules: 'horario', roster: 'horario', calendar: 'horario', ready: 'listo', done: 'hecho', finished: 'terminado', made: 'hecho',
  birthday: 'cumple', birthdays: 'cumple', bday: 'cumple', bdays: 'cumple', born: 'nacio', age: 'edad', size: 'talla', sizes: 'tallas', shoe: 'zapatos', shoes: 'zapatos', clothes: 'ropa', clothing: 'ropa', shirt: 'ropa', pants: 'ropa',
  kid: 'ninos', kids: 'ninos', child: 'ninos', children: 'ninos', boy: 'ninos', boys: 'ninos', girl: 'ninos', girls: 'ninos', house: 'casa', houses: 'casas', home: 'inicio',
  build: 'armar', make: 'hacer', create: 'crear', generate: 'generar', fill: 'llenar', copy: 'copiar', change: 'cambiar', swap: 'cambiar', replace: 'reemplazar', move: 'mover', assign: 'asignar',
  save: 'guardar', update: 'actualizar', undo: 'deshacer', download: 'descargar', print: 'imprimir', delete: 'borrar', erase: 'borrar', clear: 'borrar', remove: 'quitar',
  vacation: 'vacaciones', vacations: 'vacaciones', holiday: 'feriado', holidays: 'feriados', leave: 'permiso', note: 'nota', notes: 'notas', comment: 'comentario', comments: 'comentario', observation: 'observacion', observations: 'observaciones',
  add: 'agregar', new: 'nuevo', worker: 'trabajador', workers: 'trabajador', employee: 'empleado', employees: 'empleado', staff: 'personal', caregiver: 'trabajador', caregivers: 'trabajador', aide: 'auxiliar', aides: 'auxiliar', hire: 'contratar', quit: 'renuncio',
  rule: 'regla', rules: 'reglas', green: 'verde', mean: 'significa', means: 'significa', meaning: 'significa', review: 'revisar', check: 'revisar', warning: 'aviso', warnings: 'avisos',
  agreement: 'acuerdo', agreements: 'acuerdos', contract: 'acuerdo', contracts: 'acuerdos', id: 'cedula', surname: 'apellido', payment: 'pago', payments: 'pagos', pay: 'pagar', paid: 'pago', accounting: 'contabilidad', money: 'dinero',
  food: 'comida', meal: 'comida', meals: 'comida', kitchen: 'cocina', cook: 'cocina', nutritionist: 'nutricionista', spelling: 'ortografia', edit: 'editar', profile: 'ficha', record: 'ficha',
  gift: 'regalo', gifts: 'regalos', present: 'regalo', presents: 'regalos', document: 'documento', documents: 'documentos', list: 'lista', directory: 'directorio', sponsor: 'padrino', sponsors: 'padrino', christmas: 'navidad',
  team: 'equipo', teams: 'equipos', group: 'grupo', groups: 'grupos', split: 'separar', divide: 'dividir', separate: 'separar', ages: 'edades',
  photo: 'foto', photos: 'fotos', picture: 'foto', pictures: 'fotos', pic: 'foto', pics: 'fotos', upload: 'subir', face: 'caras', faces: 'caras', folder: 'carpeta',
  password: 'clave', passcode: 'clave', forgot: 'olvide', locked: 'bloqueado', phone: 'celular', mobile: 'celular', cellphone: 'celular', iphone: 'iphone', install: 'instalar', icon: 'icono',
  backup: 'respaldo', restore: 'recuperar', recover: 'recuperar', lost: 'perdi', help: 'ayuda', fourth: 'cuarto', extra: 'extra', minimum: 'minimo', aides_: 'auxiliares'
};
const FRASES_EN = [
  [/\b(\w+)'s\b/g, '$1'],
  [/^(and|what about|how about)\b/, 'y'],
  [/\bthank you( so much| very much)?\b|\bthanks\b|\bthx\b|\bty\b/g, 'gracias'],
  [/\bgood (morning|afternoon|evening)\b/g, 'buenos dias'],
  [/\b(hello|hi|hey|hiya)\b/g, 'hola'],
  [/\b(okay|great|perfect|awesome|cool|got it)\b/g, 'ok'],
  [/\bday after tomorrow\b/g, 'pasado manana'],
  [/\bthis (weekend|wknd)\b/g, 'este finde'],
  [/\b(next|coming|following) (weekend|wknd)\b/g, 'proximo finde'],
  [/\b(last|past|previous) (weekend|wknd)\b/g, 'finde pasado'],
  [/\b(weekends?|wknd)\b/g, 'finde'],
  [/\bthis week\b/g, 'esta semana'],
  [/\b(next|coming|following) week\b/g, 'proxima semana'],
  [/\b(last|past|previous) week\b/g, 'semana pasada'],
  [/\bthis month\b/g, 'este mes'],
  [/\b(next|coming|following) month\b/g, 'proximo mes'],
  [/\b(last|past|previous) month\b/g, 'mes pasado'],
  [/\b(house changes?|change of houses?|changing houses?|house (swaps?|switch(es)?|rotations?))\b/g, 'cambio de casa'],
  [/\bhouse ?parents?\b/g, 'padres de casa'],
  [/\b(esther house|esther s house|house esther)\b/g, 'casa esther'],
  [/\bhouse (one|1)\b/g, 'casa 1'],
  [/\bhouse (two|2)\b/g, 'casa 2'],
  [/\bhouse (three|3)\b/g, 'casa 3'],
  [/\bhouse (four|4)\b/g, 'casa 4'],
  [/\bhow old\b/g, 'cuantos anos tiene'],
  [/\bhow many\b/g, 'cuantos'],
  [/\b(what|which) days\b/g, 'que dias'],
  [/\b(days? off|time off)\b/g, 'descansa'],
  [/\bshoe sizes?\b/g, 'talla zapatos'],
  [/\bclothes sizes?\b|\bclothing sizes?\b/g, 'talla ropa'],
  [/\blast names?\b/g, 'apellido'],
  [/\bid numbers?\b/g, 'cedula'],
  [/\b(log ?in|sign ?in)\b/g, 'entrar'],
  [/\bstart over\b/g, 'empezar de cero'],
  [/\bhome screen\b/g, 'inicio'],
  [/\b(\d{1,2})(st|nd|rd|th)\b/g, '$1'],
  [/\bmay (\d{1,2})\b/g, 'mayo $1'],
  [/\b(\d{1,2}) may\b/g, '$1 mayo'],
  [/\bmar (\d{1,2})\b/g, 'marzo $1'],
  [/\b(\d{1,2}) mar\b/g, '$1 marzo'],
  [/\bjun (\d{1,2})\b/g, 'junio $1'],
  [/\bjul (\d{1,2})\b/g, 'julio $1']
];

const EN_MARCAS = new Set('who whos what whats which when where how does do did is are am was the this that works working work weekend birthday birthdays size shoes shoe house today tomorrow schedule kids children please can could you my me i there next week month off old many have has will should and on in for about hello hi hey thanks thank good morning afternoon monday tuesday wednesday thursday friday saturday sunday january february march april june july august september october november december'.split(' '));
const ES_MARCAS = new Set('quien quienes que cual cuando donde como trabaja trabajan el la los las de del en hoy manana semana mes ninos casa talla tallas cumple cumpleanos horario por para es esta estan hay tiene tengo puedo hago le cuantos descansa proximo zapatos y hola gracias buenos buenas lunes martes miercoles jueves viernes sabado domingo enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre'.split(' '));

export function idioma(t) {
  const ps = String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/'s\b/g, '')
    .replace(/\bon[\s-]?call\b|\boncall\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  let en = 0;
  let es = 0;
  for (const p of ps) {
    if (EN_MARCAS.has(p)) en++;
    if (ES_MARCAS.has(p)) es++;
  }
  if (/[¿¡ñáéíóú]/i.test(t)) es += 2;
  if (en > es) return 'en';
  if (es > en) return 'es';
  return null;
}

function traducir(s) {
  for (const [r, x] of FRASES_EN) s = s.replace(r, x);
  return s
    .split(' ')
    .map((w) => DIAS_EN[w] || MESES_EN[w] || PALABRAS_EN[w] || w)
    .join(' ');
}

const ARREGLOS = [
  [/\bon[\s-]?call\b|\boncal+\b|\bon[\s-]?col\b|\bguardia\b/g, 'oncall'],
  [/\bcumple\s*anos\b|\bcumpleanos\b|\bcumpleanios\b|\bcumpleano\b|\bcumpleaos\b|\bcumpleaño\b|\bcumplanos\b/g, 'cumple'],
  [/\bfin(?:al)?\s+de\s+semana\b|\bfinde\b|\bfin\s+d\s+semana\b|\bfinsemana\b/g, 'finde'],
  [/\bcambio\s+de\s+casa\b|\bcambios\s+de\s+casa\b|\bcambio\s+casa\b/g, 'cambiocasa'],
  [/\bpadres?\s+de\s+casa\b|\bmadres?\s+de\s+casa\b/g, 'padresdecasa'],
  [/\bpasado\s+manana\b/g, 'pasadomanana'],
  [/\bcasa\s+(?:de\s+)?esther\b|\bcasa\s+ester\b|\besther\b|\bester\b/g, 'casa esther'],
  [/\bc\s?([1-4])\b/g, 'casa $1'],
  [/\bcasa\s*uno\b/g, 'casa 1'],
  [/\bcasa\s*dos\b/g, 'casa 2'],
  [/\bcasa\s*tres\b/g, 'casa 3'],
  [/\bcasa\s*cuatro\b/g, 'casa 4'],
  [/\bcasa([1-4])\b/g, 'casa $1'],
  [/\bxq\b|\bpq\b|\bporq\b/g, 'porque'],
  [/\bq\b|\bk\b|\bke\b|\bqe\b/g, 'que'],
  [/\bx\b/g, 'por'],
  [/\bd\b/g, 'de'],
  [/\bpa\b/g, 'para'],
  [/\bnenes?\b|\bnenas?\b|\bchicos?\b|\bchicas?\b|\bguaguas?\b|\bninas?\b|\bninios?\b/g, 'ninos'],
  [/\bsabados?\b|\bsabdo\b|\bsbado\b/g, 'sabado'],
  [/\bdomingos\b|\bdomigo\b/g, 'domingo'],
  [/\bmiercoles\b|\bmiercole\b|\bmiecoles\b/g, 'miercoles'],
  [/\bvirnes\b|\bviernes\b|\bviernez\b/g, 'viernes'],
  [/\bzapatos?\b|\bzapato\b|\bsapatos?\b|\bcalzado\b|\bcalza\b|\bpie\b/g, 'zapatos'],
  [/\bropas?\b|\bvestimenta\b|\bcamiseta\b|\bpantalon\b/g, 'ropa']
];

export function plano(t) {
  let s = String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/[’`]/g, "'")
    .replace(/[¿?¡!.,;:"“”()[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  s = traducir(s).replace(/'/g, ' ').replace(/\s+/g, ' ');
  for (const [r, x] of ARREGLOS) s = s.replace(r, x);
  return s.replace(/\s+/g, ' ').trim();
}

export const VACIAS = new Set(
  'a al algo ante aqui asi cada como con cual cuales de del el ella ellas ellos en entre era es esa ese eso esta este esto estos estas fue ha hay la las le les lo los me mi mis muy ni no nos o os para pero por que se si sin sobre su sus te tu tus un una uno unos unas y ya yo hola porfa porfavor favor gracias buenas buenos dias tardes noches oye dime decir quisiera saber podrias puedes ayudame ayuda necesito is are am was be in at on for to does do did has have there my please can could would you tell an and or it its this that these those with from about like want need know show give get see let us our your will should'.split(
    ' '
  )
);

export const palabras = (t) => plano(t).split(' ').filter(Boolean);

export function distancia(a, b) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) m[i][j] = Math.min(m[i][j], m[i - 2][j - 2] + 1);
    }
  return m[a.length][b.length];
}

const IRREGULARES = { pongo: 'poner', pone: 'poner', ponen: 'poner', hago: 'hacer', hace: 'hacer', hice: 'hacer', puse: 'poner', saco: 'sacar', veo: 'ver', subo: 'subir', bajo: 'bajar', quito: 'quitar', meto: 'meter' };
const FINALES = ['amos', 'emos', 'imos', 'ando', 'iendo', 'ado', 'ido', 'ada', 'ida', 'aron', 'ieron', 'ar', 'er', 'ir', 'as', 'es', 'an', 'en', 'o', 'a', 'e', 's'];
export function raiz(w) {
  const x = IRREGULARES[w] || w;
  for (const f of FINALES) if (x.length - f.length >= 3 && x.endsWith(f)) return x.slice(0, -f.length);
  return x;
}

export function parecida(p, clave) {
  if (p === clave) return true;
  if (p.length >= 4 && clave.length >= 4 && raiz(p) === raiz(clave)) return true;
  if (clave.length >= 5 && p.length >= 4 && (p.startsWith(clave.slice(0, Math.max(5, clave.length - 2))) || clave.startsWith(p) && p.length >= clave.length - 2)) return true;
  if (clave.length < 4 || p.length < 3) return false;
  const tope = clave.length >= 8 ? 2 : 1;
  return distancia(p, clave) <= tope;
}

export const tiene = (ps, ...claves) => claves.some((c) => (c.includes(' ') ? ps.join(' ').includes(c) : ps.some((p) => parecida(p, c))));
