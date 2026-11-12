const VERSION = 2;
const HOJA = 'Ninos';
const HOJA_FOTOS = 'Fotos';
const HOJA_CASAS = 'Casas';
const COLUMNAS = ['id', 'nombre', 'casa', 'nacimiento', 'tallaRopa', 'tallaZapatos', 'notas', 'actualizado', 'colorFavorito', 'pasatiempos', 'deseos', 'tallasFecha', 'descripcion'];
const COLUMNAS_CASAS = ['casa', 'padres', 'bio', 'actualizado'];
const DIAS_SESION = 30;
const MAX_FALLOS = 8;
const MINUTOS_BLOQUEO = 15;
const MAX_FOTO = 48000;

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
  if (accion === 'listar') return { ok: true, version: VERSION, ninos: listar(), casas: listarCasas() };
  if (accion === 'guardar') return conCandado(() => ({ ok: true, nino: guardar(datos.nino || {}) }));
  if (accion === 'borrar') return conCandado(() => ({ ok: borrar(String(datos.id || '')) }));
  if (accion === 'importar') return conCandado(() => ({ ok: true, agregados: importar(datos.ninos || []) }));
  if (accion === 'fotos') return { ok: true, fotos: fotos(datos.ids || []) };
  if (accion === 'guardarFoto') return conCandado(() => ({ ok: guardarFoto(String(datos.id || ''), String(datos.foto || '')) }));
  if (accion === 'borrarFoto') return conCandado(() => ({ ok: borrarFoto(String(datos.id || '')) }));
  if (accion === 'guardarCasa') return conCandado(() => ({ ok: true, casa: guardarCasa(datos.casa || {}) }));
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
    if (err && err.message === 'nombre') return { ok: false, error: 'Falta el nombre.' };
    if (err && err.message === 'fecha') return { ok: false, error: 'La fecha de cumpleaños no es válida.' };
    if (err && err.message === 'foto') return { ok: false, error: 'La foto no es válida o es muy grande.' };
    return { ok: false, error: 'No se pudo guardar. Intenta otra vez.' };
  } finally {
    lock.releaseLock();
  }
}

function hojaCon(nombre, columnas) {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let h = libro.getSheetByName(nombre);
  if (!h) {
    h = libro.insertSheet(nombre);
    h.getRange(1, 1, 1, columnas.length).setValues([columnas]).setFontWeight('bold');
    h.setFrozenRows(1);
    h.getRange(1, 1, h.getMaxRows(), Math.max(columnas.length, 2)).setNumberFormat('@');
  }
  return h;
}

function mapa(h, columnas) {
  const ancho = Math.max(h.getLastColumn(), 1);
  const enc = h.getRange(1, 1, 1, ancho).getDisplayValues()[0];
  const m = {};
  enc.forEach(function (c, i) {
    if (c) m[c] = i;
  });
  let siguiente = enc.length;
  while (siguiente > 0 && !enc[siguiente - 1]) siguiente--;
  columnas.forEach(function (c) {
    if (m[c] === undefined) {
      h.getRange(1, siguiente + 1).setValue(c).setFontWeight('bold');
      h.getRange(1, siguiente + 1, h.getMaxRows(), 1).setNumberFormat('@');
      m[c] = siguiente;
      siguiente++;
    }
  });
  m.__ancho = Math.max(siguiente, ancho);
  return m;
}

function hoja() {
  return hojaCon(HOJA, COLUMNAS);
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
    notas: texto(n.notas, 300),
    colorFavorito: texto(n.colorFavorito, 40),
    pasatiempos: texto(n.pasatiempos, 200),
    deseos: texto(n.deseos, 400),
    descripcion: texto(n.descripcion, 900)
  };
}

function filasDe(h, m) {
  const n = h.getLastRow() - 1;
  if (n < 1) return [];
  return h.getRange(2, 1, n, m.__ancho).getDisplayValues();
}

function aObjeto(f, m, columnas) {
  const o = {};
  columnas.forEach(function (c) {
    o[c] = m[c] < f.length ? f[m[c]] : '';
  });
  return o;
}

function aFila(o, m, columnas, ancho) {
  const f = new Array(ancho).fill('');
  columnas.forEach(function (c) {
    f[m[c]] = o[c] == null ? '' : String(o[c]);
  });
  return f;
}

function idsConFoto() {
  const h = hojaCon(HOJA_FOTOS, ['id', 'foto']);
  const n = h.getLastRow() - 1;
  if (n < 1) return {};
  const ids = {};
  h.getRange(2, 1, n, 1)
    .getDisplayValues()
    .forEach(function (f) {
      if (f[0]) ids[f[0]] = true;
    });
  return ids;
}

function listar() {
  const h = hoja();
  const m = mapa(h, COLUMNAS);
  const conFoto = idsConFoto();
  return filasDe(h, m)
    .filter(function (f) {
      return f[m.id];
    })
    .map(function (f) {
      const o = aObjeto(f, m, COLUMNAS);
      o.conFoto = !!conFoto[o.id];
      return o;
    });
}

function guardar(n) {
  const limpio = limpiarNino(n);
  const h = hoja();
  const m = mapa(h, COLUMNAS);
  const id = texto(n.id, 40);
  const ahora = new Date().toISOString();
  const todas = filasDe(h, m);
  const i = id
    ? todas.findIndex(function (f) {
        return f[m.id] === id;
      })
    : -1;
  const previo = i >= 0 ? aObjeto(todas[i], m, COLUMNAS) : null;
  const cambiaronTallas = !previo || previo.tallaRopa !== limpio.tallaRopa || previo.tallaZapatos !== limpio.tallaZapatos;
  const o = Object.assign({}, limpio, {
    id: previo ? previo.id : Utilities.getUuid(),
    actualizado: ahora,
    tallasFecha: cambiaronTallas ? (limpio.tallaRopa || limpio.tallaZapatos ? ahora : '') : previo.tallasFecha
  });
  const fila = aFila(o, m, COLUMNAS, m.__ancho);
  if (i >= 0) h.getRange(i + 2, 1, 1, fila.length).setValues([fila]);
  else h.appendRow(fila);
  o.conFoto = !!idsConFoto()[o.id];
  return o;
}

function borrar(id) {
  if (!id) return false;
  const h = hoja();
  const m = mapa(h, COLUMNAS);
  const i = filasDe(h, m).findIndex(function (f) {
    return f[m.id] === id;
  });
  if (i < 0) return false;
  h.deleteRow(i + 2);
  borrarFoto(id);
  return true;
}

function importar(lista) {
  if (!Array.isArray(lista)) return 0;
  const h = hoja();
  const m = mapa(h, COLUMNAS);
  const ahora = new Date().toISOString();
  const nuevas = [];
  lista.slice(0, 500).forEach(function (n) {
    try {
      const l = limpiarNino(n);
      const o = Object.assign({}, l, { id: Utilities.getUuid(), actualizado: ahora, tallasFecha: l.tallaRopa || l.tallaZapatos ? ahora : '' });
      nuevas.push(aFila(o, m, COLUMNAS, m.__ancho));
    } catch (err) {}
  });
  if (nuevas.length) h.getRange(h.getLastRow() + 1, 1, nuevas.length, m.__ancho).setValues(nuevas);
  return nuevas.length;
}

function hojaFotos() {
  return hojaCon(HOJA_FOTOS, ['id', 'foto']);
}

function filaFoto(h, id) {
  const n = h.getLastRow() - 1;
  if (n < 1) return -1;
  return h
    .getRange(2, 1, n, 1)
    .getDisplayValues()
    .findIndex(function (f) {
      return f[0] === id;
    });
}

function fotos(ids) {
  if (!Array.isArray(ids)) return {};
  const h = hojaFotos();
  const n = h.getLastRow() - 1;
  if (n < 1) return {};
  const buscar = {};
  ids.slice(0, 200).forEach(function (i) {
    buscar[String(i)] = true;
  });
  const out = {};
  h.getRange(2, 1, n, 2)
    .getDisplayValues()
    .forEach(function (f) {
      if (buscar[f[0]] && f[1]) out[f[0]] = f[1];
    });
  return out;
}

function guardarFoto(id, foto) {
  if (!id || id.length > 60) throw new Error('foto');
  if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(foto) || foto.length > MAX_FOTO) throw new Error('foto');
  const h = hojaFotos();
  const i = filaFoto(h, id);
  if (i >= 0) h.getRange(i + 2, 1, 1, 2).setValues([[id, foto]]);
  else h.appendRow([id, foto]);
  return true;
}

function borrarFoto(id) {
  const h = hojaFotos();
  const i = filaFoto(h, id);
  if (i < 0) return false;
  h.deleteRow(i + 2);
  return true;
}

function listarCasas() {
  const h = hojaCon(HOJA_CASAS, COLUMNAS_CASAS);
  const m = mapa(h, COLUMNAS_CASAS);
  const conFoto = idsConFoto();
  return filasDe(h, m)
    .filter(function (f) {
      return f[m.casa];
    })
    .map(function (f) {
      const o = aObjeto(f, m, COLUMNAS_CASAS);
      o.conFoto = !!conFoto['casa:' + o.casa];
      return o;
    });
}

function guardarCasa(c) {
  const casa = texto(c.casa, 40);
  if (!casa) throw new Error('nombre');
  const h = hojaCon(HOJA_CASAS, COLUMNAS_CASAS);
  const m = mapa(h, COLUMNAS_CASAS);
  const o = { casa: casa, padres: texto(c.padres, 120), bio: texto(c.bio, 900), actualizado: new Date().toISOString() };
  const todas = filasDe(h, m);
  const i = todas.findIndex(function (f) {
    return f[m.casa] === casa;
  });
  const fila = aFila(o, m, COLUMNAS_CASAS, m.__ancho);
  if (i >= 0) h.getRange(i + 2, 1, 1, fila.length).setValues([fila]);
  else h.appendRow(fila);
  return o;
}

function prepararHoja() {
  mapa(hoja(), COLUMNAS);
  hojaFotos();
  mapa(hojaCon(HOJA_CASAS, COLUMNAS_CASAS), COLUMNAS_CASAS);
  secreto();
}
