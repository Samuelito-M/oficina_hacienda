const HOJA = 'Ninos';
const COLUMNAS = ['id', 'nombre', 'casa', 'nacimiento', 'tallaRopa', 'tallaZapatos', 'notas', 'actualizado'];
const DIAS_SESION = 30;
const MAX_FALLOS = 8;
const MINUTOS_BLOQUEO = 15;

function doGet() {
  return ContentService.createTextOutput('Oficina Hacienda: servicio activo.');
}

function doPost(e) {
  let res;
  try {
    const datos = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    res = atender(datos);
  } catch (err) {
    res = { ok: false, error: 'Pedido inválido.' };
  }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

function atender(datos) {
  const accion = String(datos.accion || '');
  if (accion === 'entrar') return entrar(String(datos.clave || ''));
  if (!tokenValido(String(datos.token || ''))) return { ok: false, error: 'sesion', mensaje: 'Tu sesión venció o la clave cambió. Vuelve a escribir la clave.' };
  if (accion === 'listar') return { ok: true, ninos: listar() };
  if (accion === 'guardar') return conCandado(() => ({ ok: true, nino: guardar(datos.nino || {}) }));
  if (accion === 'borrar') return conCandado(() => ({ ok: borrar(String(datos.id || '')) }));
  if (accion === 'importar') return conCandado(() => ({ ok: true, agregados: importar(datos.ninos || []) }));
  return { ok: false, error: 'Acción desconocida.' };
}

function propiedades() {
  return PropertiesService.getScriptProperties();
}

function claveGuardada() {
  return String(propiedades().getProperty('CLAVE') || '');
}

function secreto() {
  const p = propiedades();
  let s = p.getProperty('SECRETO');
  if (!s) {
    s = Utilities.getUuid() + Utilities.getUuid();
    p.setProperty('SECRETO', s);
  }
  return s;
}

function firmar(texto) {
  const bytes = Utilities.computeHmacSha256Signature(texto, secreto() + '|' + claveGuardada());
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function igualesSeguro(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function entrar(clave) {
  const cache = CacheService.getScriptCache();
  const fallos = Number(cache.get('fallos') || 0);
  if (fallos >= MAX_FALLOS) return { ok: false, error: 'bloqueado', mensaje: `Demasiados intentos. Espera ${MINUTOS_BLOQUEO} minutos y prueba otra vez.` };
  const guardada = claveGuardada();
  if (!guardada) return { ok: false, error: 'sin-clave', mensaje: 'Todavía no hay clave configurada en la hoja de Google.' };
  if (!igualesSeguro(clave, guardada)) {
    cache.put('fallos', String(fallos + 1), MINUTOS_BLOQUEO * 60);
    return { ok: false, error: 'clave', mensaje: 'La clave no es correcta.' };
  }
  const expira = Date.now() + DIAS_SESION * 24 * 60 * 60 * 1000;
  return { ok: true, token: expira + '.' + firmar(String(expira)), expira: expira };
}

function tokenValido(token) {
  const partes = token.split('.');
  if (partes.length !== 2) return false;
  const expira = Number(partes[0]);
  if (!expira || expira < Date.now()) return false;
  if (!claveGuardada()) return false;
  return igualesSeguro(partes[1], firmar(partes[0]));
}

function conCandado(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, error: 'Otra persona está guardando. Intenta en unos segundos.' };
  try {
    return fn();
  } catch (err) {
    if (err && err.message === 'nombre') return { ok: false, error: 'Falta el nombre del niño.' };
    if (err && err.message === 'fecha') return { ok: false, error: 'La fecha de cumpleaños no es válida.' };
    return { ok: false, error: 'No se pudo guardar. Intenta otra vez.' };
  } finally {
    lock.releaseLock();
  }
}

function hoja() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let h = libro.getSheetByName(HOJA);
  if (!h) {
    h = libro.insertSheet(HOJA);
    h.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS]).setFontWeight('bold');
    h.setFrozenRows(1);
    h.getRange('A:H').setNumberFormat('@');
  }
  return h;
}

function texto(v, max) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 120);
}

function fechaValida(v) {
  const s = texto(v, 10);
  if (!s) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error('fecha');
  return s;
}

function limpiarNino(n) {
  const nombre = texto(n.nombre, 80);
  if (!nombre) throw new Error('nombre');
  return {
    nombre: nombre,
    casa: texto(n.casa, 40),
    nacimiento: fechaValida(n.nacimiento),
    tallaRopa: texto(n.tallaRopa, 20),
    tallaZapatos: texto(n.tallaZapatos, 20),
    notas: texto(n.notas, 300)
  };
}

function filas() {
  const h = hoja();
  const n = h.getLastRow() - 1;
  if (n < 1) return [];
  return h.getRange(2, 1, n, COLUMNAS.length).getDisplayValues();
}

function aObjeto(f) {
  const o = {};
  COLUMNAS.forEach(function (c, i) {
    o[c] = f[i];
  });
  return o;
}

function listar() {
  return filas()
    .filter(function (f) {
      return f[0];
    })
    .map(aObjeto);
}

function guardar(n) {
  const limpio = limpiarNino(n);
  const h = hoja();
  const id = texto(n.id, 40);
  const ahora = new Date().toISOString();
  const todas = filas();
  if (id) {
    const i = todas.findIndex(function (f) {
      return f[0] === id;
    });
    if (i >= 0) {
      const fila = [id, limpio.nombre, limpio.casa, limpio.nacimiento, limpio.tallaRopa, limpio.tallaZapatos, limpio.notas, ahora];
      h.getRange(i + 2, 1, 1, COLUMNAS.length).setValues([fila]);
      return aObjeto(fila);
    }
  }
  const nuevo = [Utilities.getUuid(), limpio.nombre, limpio.casa, limpio.nacimiento, limpio.tallaRopa, limpio.tallaZapatos, limpio.notas, ahora];
  h.appendRow(nuevo);
  return aObjeto(nuevo);
}

function borrar(id) {
  if (!id) return false;
  const h = hoja();
  const i = filas().findIndex(function (f) {
    return f[0] === id;
  });
  if (i < 0) return false;
  h.deleteRow(i + 2);
  return true;
}

function importar(lista) {
  if (!Array.isArray(lista)) return 0;
  const h = hoja();
  const ahora = new Date().toISOString();
  const nuevas = [];
  lista.slice(0, 500).forEach(function (n) {
    try {
      const l = limpiarNino(n);
      nuevas.push([Utilities.getUuid(), l.nombre, l.casa, l.nacimiento, l.tallaRopa, l.tallaZapatos, l.notas, ahora]);
    } catch (err) {}
  });
  if (nuevas.length) h.getRange(h.getLastRow() + 1, 1, nuevas.length, COLUMNAS.length).setValues(nuevas);
  return nuevas.length;
}

function prepararHoja() {
  hoja();
  secreto();
}
