const VERSION = 7;
const HOJA = 'Ninos';
const HOJA_FOTOS = 'Fotos';
const HOJA_CASAS = 'Casas';
const COLUMNAS = ['id', 'nombre', 'casa', 'nacimiento', 'tallaRopa', 'tallaZapatos', 'notas', 'actualizado', 'colorFavorito', 'pasatiempos', 'deseos', 'tallasFecha', 'descripcion', 'sexo', 'tallaRopaEC', 'tallaZapatosEC'];
const COLUMNAS_CASAS = ['casa', 'padres', 'bio', 'actualizado'];
const DIAS_SESION = 30;
const MAX_FALLOS = 8;
const MINUTOS_BLOQUEO = 15;
const MAX_FOTO = 48000;
const HOJA_HORARIOS = 'Horarios';
const MAX_HORARIO = 45000;
const MAX_PERSONAL = 300;
const CARPETA_COPIAS = 'Copias de Oficina Hacienda';
const COPIAS_QUE_QUEDAN = 8;
const HOJA_ALBUM = 'Album';
const COLUMNAS_ALBUM = ['id', 'archivo', 'miniatura', 'fecha', 'subido', 'ninos', 'huella', 'nombre', 'atajos'];
const HOJA_CARAS = 'Caras';
const MAX_FOTO_ALBUM = 9000000;
const MAX_MINI = 120000;
const CARAS_POR_NINO = 12;

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
  if (accion === 'sexos') return conCandado(() => ({ ok: true, cambios: ponerSexos(datos.lista || []) }));
  if (accion === 'importar') return conCandado(() => ({ ok: true, agregados: importar(datos.ninos || []) }));
  if (accion === 'fotos') return { ok: true, fotos: fotos(datos.ids || []) };
  if (accion === 'guardarFoto') return conCandado(() => ({ ok: guardarFoto(String(datos.id || ''), String(datos.foto || '')) }));
  if (accion === 'borrarFoto') return conCandado(() => ({ ok: borrarFoto(String(datos.id || '')) }));
  if (accion === 'horario') return { ok: true, version: VERSION, datos: leerHorario(String(datos.mes || '')) };
  if (accion === 'horarios') return { ok: true, version: VERSION, meses: mesesGuardados() };
  if (accion === 'guardarHorario') return conCandado(() => ({ ok: true, actualizado: guardarDato(mesValido(datos.mes), datos.horario) }));
  if (accion === 'guardarConfig') return conCandado(() => ({ ok: true, actualizado: guardarDato('config', datos.config) }));
  if (accion === 'personal') return { ok: true, version: VERSION, datos: leerPersonal() };
  if (accion === 'guardarPersonal') return conCandado(() => ({ ok: true, actualizado: guardarPersonal(datos.lista) }));
  if (accion === 'inicio') return { ok: true, version: VERSION, datos: inicio(String(datos.mes || '')) };
  if (accion === 'albumEstado') return conDrive(() => ({ ok: true, version: VERSION, carpeta: infoCarpeta(), cuentas: cuentasAlbum() }));
  if (accion === 'albumCarpeta') return conCandado(() => conDrive(() => ({ ok: true, carpeta: configurarCarpeta(String(datos.enlace || '')) })));
  if (accion === 'albumSubir') return conCandado(() => conDrive(() => Object.assign({ ok: true }, subirAlAlbum(datos))));
  if (accion === 'album') return conDrive(() => ({ ok: true, fotos: listarAlbum(datos), cuentas: cuentasAlbum() }));
  if (accion === 'albumMinis') return conDrive(() => ({ ok: true, minis: miniaturas(datos.ids || []) }));
  if (accion === 'albumFoto') return conDrive(() => Object.assign({ ok: true }, fotoCompleta(String(datos.id || ''))));
  if (accion === 'albumEtiquetar') return conCandado(() => conDrive(() => ({ ok: true, foto: etiquetarFoto(String(datos.id || ''), datos.ninos) })));
  if (accion === 'albumBorrar') return conCandado(() => conDrive(() => ({ ok: borrarDelAlbum(String(datos.id || '')) })));
  if (accion === 'caras') return { ok: true, caras: leerCaras() };
  if (accion === 'guardarCaras') return conCandado(() => ({ ok: true, guardadas: guardarCaras(datos.nuevas) }));
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
    tallaRopaEC: texto(n.tallaRopaEC, 20),
    tallaZapatosEC: texto(n.tallaZapatosEC, 20),
    notas: texto(n.notas, 300),
    colorFavorito: texto(n.colorFavorito, 40),
    pasatiempos: texto(n.pasatiempos, 200),
    deseos: texto(n.deseos, 400),
    descripcion: texto(n.descripcion, 900),
    sexo: sexoValido(n.sexo)
  };
}

function tieneTallas(n) {
  return !!(n.tallaRopa || n.tallaZapatos || n.tallaRopaEC || n.tallaZapatosEC);
}

function sexoValido(v) {
  const s = String(v == null ? '' : v).trim().toUpperCase();
  return s === 'F' || s === 'M' ? s : '';
}

function ponerSexos(lista) {
  if (!Array.isArray(lista)) return 0;
  const h = hoja();
  const m = mapa(h, COLUMNAS);
  const todas = filasDe(h, m);
  const porId = {};
  lista.slice(0, 500).forEach(function (x) {
    if (x && x.id) porId[String(x.id)] = sexoValido(x.sexo);
  });
  let cambios = 0;
  todas.forEach(function (f, i) {
    const id = f[m.id];
    if (id && Object.prototype.hasOwnProperty.call(porId, id) && f[m.sexo] !== porId[id]) {
      h.getRange(i + 2, m.sexo + 1).setValue(porId[id]);
      cambios++;
    }
  });
  return cambios;
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
  const cambiaronTallas = !previo || ['tallaRopa', 'tallaZapatos', 'tallaRopaEC', 'tallaZapatosEC'].some(function (k) {
    return (previo[k] || '') !== limpio[k];
  });
  const o = Object.assign({}, limpio, {
    id: previo ? previo.id : Utilities.getUuid(),
    actualizado: ahora,
    tallasFecha: cambiaronTallas ? (tieneTallas(limpio) ? ahora : '') : previo.tallasFecha
  });
  const fila = aFila(o, m, COLUMNAS, m.__ancho);
  if (i >= 0) h.getRange(i + 2, 1, 1, fila.length).setValues([fila]);
  else h.appendRow(fila);
  o.conFoto = !!idsConFoto()[o.id];
  if (previo && (previo.casa !== o.casa || previo.nombre !== o.nombre)) {
    try {
      acomodarCarpetaNino(o);
    } catch (e) {
      o.avisoCarpeta = true;
    }
  }
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
      const o = Object.assign({}, l, { id: Utilities.getUuid(), actualizado: ahora, tallasFecha: tieneTallas(l) ? ahora : '' });
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

function hojaHorarios() {
  return hojaCon(HOJA_HORARIOS, ['id', 'datos', 'actualizado']);
}

function mesValido(mes) {
  const m = String(mes || '');
  if (!/^20\d\d-(0[1-9]|1[0-2])$/.test(m)) throw new Error('mes');
  return m;
}

function mesAnterior(mes) {
  const a = +mes.slice(0, 4);
  const m = +mes.slice(5, 7);
  return m === 1 ? a - 1 + '-12' : a + '-' + ('0' + (m - 1)).slice(-2);
}

function filasHorarios() {
  const h = hojaHorarios();
  const n = h.getLastRow() - 1;
  if (n < 1) return [];
  return h.getRange(2, 1, n, 3).getDisplayValues();
}

function parsear(t) {
  try {
    return t ? JSON.parse(t) : null;
  } catch (e) {
    return null;
  }
}

function leerHorario(mes) {
  const m = mesValido(mes);
  const ant = mesAnterior(m);
  const out = { mes: m, horario: null, actualizado: '', anterior: null, mesAnterior: ant, config: null, meses: [] };
  filasHorarios().forEach(function (f) {
    if (f[0] === m) {
      out.horario = parsear(f[1]);
      out.actualizado = f[2];
    } else if (f[0] === ant) out.anterior = parsear(f[1]);
    else if (f[0] === 'config') out.config = parsear(f[1]);
    if (/^20\d\d-\d\d$/.test(f[0])) out.meses.push(f[0]);
  });
  out.meses.sort();
  return out;
}

function mesesGuardados() {
  return filasHorarios()
    .filter(function (f) {
      return /^20\d\d-\d\d$/.test(f[0]) && f[1] && f[1].indexOf('"dias":{}') < 0;
    })
    .map(function (f) {
      return { mes: f[0], actualizado: f[2] };
    })
    .sort(function (a, b) {
      return a.mes < b.mes ? 1 : -1;
    });
}

function guardarDato(id, valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new Error('horario');
  const t = JSON.stringify(valor);
  if (t.length > MAX_HORARIO) throw new Error('horario-grande');
  const h = hojaHorarios();
  const i = filaFoto(h, id);
  const ahora = new Date().toISOString();
  if (i >= 0) h.getRange(i + 2, 1, 1, 3).setValues([[id, t, ahora]]);
  else h.appendRow([id, t, ahora]);
  return ahora;
}

function prepararHoja() {
  hojaHorarios();
  mapa(hoja(), COLUMNAS);
  hojaFotos();
  mapa(hojaCon(HOJA_CASAS, COLUMNAS_CASAS), COLUMNAS_CASAS);
  hojaCon(HOJA_ALBUM, COLUMNAS_ALBUM);
  hojaCon(HOJA_CARAS, ['id', 'datos', 'actualizado']);
  secreto();
}

function leerPersonal() {
  const f = filasHorarios().filter(function (x) {
    return x[0] === 'personal';
  })[0];
  const d = f ? parsear(f[1]) : null;
  return { lista: d && Array.isArray(d.lista) ? d.lista : null, actualizado: f ? f[2] : '' };
}

function limpiarPersona(p) {
  if (!p || typeof p !== 'object') return null;
  const id = texto(p.id, 40);
  if (!id) return null;
  const alias = Array.isArray(p.alias) ? p.alias.slice(0, 20).map(function (a) { return texto(a, 30); }).filter(String) : [];
  const o = { id: id, nombre: texto(p.nombre, 60) || id, alias: alias, fijo: !!p.fijo, casa: texto(p.casa, 30), completo: texto(p.completo, 120), cedula: String(p.cedula || '').replace(/[^0-9]/g, '').slice(0, 13), hasta: /^20\d\d-\d\d$/.test(String(p.hasta || '')) ? String(p.hasta) : '' };
  if (p.hor && typeof p.hor === 'object') o.hor = { n: texto(p.hor.n, 60), rol: texto(p.hor.rol, 10), casa: texto(p.hor.casa, 30), hasta: /^20\d\d-\d\d$/.test(String(p.hor.hasta || '')) ? String(p.hor.hasta) : '' };
  return o;
}

function guardarPersonal(lista) {
  if (!Array.isArray(lista) || lista.length > MAX_PERSONAL) throw new Error('personal');
  const vistos = {};
  const limpia = lista.map(limpiarPersona).filter(function (p) {
    if (!p || vistos[p.id]) return false;
    vistos[p.id] = true;
    return true;
  });
  return guardarDato('personal', { lista: limpia });
}

function inicio(mes) {
  const m = mesValido(mes);
  const sig = m.slice(5) === '12' ? +m.slice(0, 4) + 1 + '-01' : m.slice(0, 5) + ('0' + (+m.slice(5) + 1)).slice(-2);
  const out = { mes: m, horario: null, horarioSiguiente: null, config: null, siguiente: false, cumples: [], ultimaCopia: String(propiedades().getProperty('ULTIMA_COPIA') || '') };
  filasHorarios().forEach(function (f) {
    if (f[0] === m) out.horario = parsear(f[1]);
    else if (f[0] === 'config') out.config = parsear(f[1]);
    else if (f[0] === sig) {
      out.siguiente = !!f[1] && f[1].indexOf('"dias":{}') < 0;
      out.horarioSiguiente = parsear(f[1]);
    }
  });
  const h = hoja();
  const mp = mapa(h, COLUMNAS);
  out.cumples = filasDe(h, mp)
    .filter(function (f) {
      return f[mp.id] && f[mp.nacimiento];
    })
    .map(function (f) {
      return { nombre: f[mp.nombre], casa: f[mp.casa], nacimiento: f[mp.nacimiento] };
    });
  return out;
}

function copiaSemanal() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const archivo = DriveApp.getFileById(libro.getId());
  const carpetas = DriveApp.getFoldersByName(CARPETA_COPIAS);
  const carpeta = carpetas.hasNext() ? carpetas.next() : DriveApp.createFolder(CARPETA_COPIAS);
  const ahora = new Date();
  archivo.makeCopy('Copia Oficina Hacienda ' + ahora.toISOString().slice(0, 10), carpeta);
  const copias = [];
  const it = carpeta.getFiles();
  while (it.hasNext()) copias.push(it.next());
  copias.sort(function (a, b) {
    return b.getDateCreated().getTime() - a.getDateCreated().getTime();
  });
  copias.slice(COPIAS_QUE_QUEDAN).forEach(function (f) {
    f.setTrashed(true);
  });
  propiedades().setProperty('ULTIMA_COPIA', ahora.toISOString());
  return ahora.toISOString();
}

function activarCopias() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'copiaSemanal') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('copiaSemanal').timeBased().everyWeeks(1).onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(3).create();
  return copiaSemanal();
}

function conDrive(fn) {
  try {
    return fn();
  } catch (e) {
    const m = String((e && e.message) || e);
    if (m === 'sinCarpeta') return { ok: false, error: 'sinCarpeta', mensaje: 'Primero elige la carpeta de Google Drive donde se guardan las fotos.' };
    if (m === 'autorizar') return { ok: false, error: 'autorizar', mensaje: 'Falta darle permiso a Google Drive. En Apps Script elige la función activarCopias, toca Ejecutar y acepta los permisos (Revisar permisos → tu cuenta → Configuración avanzada → Ir al proyecto → Permitir). Después pega el enlace otra vez.' };
    if (m === 'sinAcceso') return { ok: false, error: 'sinAcceso', mensaje: 'La cuenta de Google donde está el código de la app no puede ver esa carpeta. Abre la carpeta en Drive → Compartir → agrega esa cuenta como Editor. Si ya la tiene, revisa primero que Drive tenga permiso: en Apps Script ejecuta activarCopias una vez.' };
    if (m === 'soloLectura') return { ok: false, error: 'soloLectura', mensaje: 'La cuenta del código puede ver la carpeta pero no guardar en ella. En Drive → Compartir, cámbiala de Lector a Editor.' };
    if (m === 'papelera') return { ok: false, error: 'papelera', mensaje: 'Esa carpeta está en la papelera de Drive. Restáurala o elige otra.' };
    if (m === 'enlace') return { ok: false, error: 'enlace', mensaje: 'Ese enlace no es de una carpeta de Google Drive. Abre la carpeta en Drive y copia el enlace de arriba.' };
    if (m === 'foto') return { ok: false, error: 'foto', mensaje: 'La foto llegó dañada o es muy grande.' };
    if (m === 'noExiste') return { ok: false, error: 'noExiste', mensaje: 'Esa foto ya no está en el álbum.' };
    return { ok: false, error: 'drive', mensaje: 'Google Drive no respondió: ' + m };
  }
}

function hojaAlbum() {
  return hojaCon(HOJA_ALBUM, COLUMNAS_ALBUM);
}

function filasAlbum() {
  const h = hojaAlbum();
  const n = h.getLastRow() - 1;
  if (n < 1) return [];
  return h.getRange(2, 1, n, COLUMNAS_ALBUM.length).getDisplayValues().map(function (f, i) {
    return { fila: i + 2, id: f[0], archivo: f[1], miniatura: f[2], fecha: f[3], subido: f[4], ninos: parsear(f[5]) || [], huella: f[6], nombre: f[7], atajos: parsear(f[8]) || {} };
  });
}

function escribirFila(r) {
  const fila = [r.id, r.archivo, r.miniatura, r.fecha, r.subido, JSON.stringify(r.ninos), r.huella, r.nombre, JSON.stringify(r.atajos)];
  const h = hojaAlbum();
  if (r.fila) h.getRange(r.fila, 1, 1, fila.length).setValues([fila]);
  else h.appendRow(fila);
}

function mapaCarpetas() {
  const f = filasHorarios().filter(function (x) {
    return x[0] === 'carpetasFotos';
  })[0];
  const d = (f && parsear(f[1])) || {};
  d.casas = d.casas || {};
  d.ninos = d.ninos || {};
  d.meses = d.meses || {};
  return d;
}

function carpetaPorId(id) {
  if (!id) return null;
  try {
    const c = DriveApp.getFolderById(id);
    return c.isTrashed() ? null : c;
  } catch (e) {
    return null;
  }
}

function hija(padre, nombre) {
  const it = padre.getFoldersByName(nombre);
  while (it.hasNext()) {
    const c = it.next();
    if (!c.isTrashed()) return c;
  }
  return padre.createFolder(nombre);
}

function raiz(m) {
  const id = String(propiedades().getProperty('FOTOS_CARPETA') || '');
  const c = carpetaPorId(id);
  if (!c) throw new Error('sinCarpeta');
  if (m && m.raiz !== id) {
    m.raiz = id;
    m.casas = {};
    m.ninos = {};
    m.meses = {};
    m.todas = '';
    m.mini = '';
    m.sin = '';
  }
  return c;
}

function fija(m, campo, padre, nombre) {
  let c = carpetaPorId(m[campo]);
  if (!c) {
    c = hija(padre, nombre);
    m[campo] = c.getId();
  }
  return c;
}

function idDeEnlace(enlace) {
  const t = String(enlace || '').trim();
  const a = t.match(/\/folders\/([A-Za-z0-9_-]{10,})/) || t.match(/[?&]id=([A-Za-z0-9_-]{10,})/) || t.match(/^([A-Za-z0-9_-]{20,})$/);
  if (!a) throw new Error('enlace');
  return a[1];
}

function esPermisoDrive(e) {
  return /required permissions|permisos necesarios|auth\/drive|authorization is required|se requiere autorizaci|necesitas autorizaci/i.test(String((e && e.message) || e));
}

function configurarCarpeta(enlace) {
  const id = idDeEnlace(enlace);
  let c;
  try {
    c = DriveApp.getFolderById(id);
    c.getName();
  } catch (e) {
    if (esPermisoDrive(e)) throw new Error('autorizar');
    throw new Error('sinAcceso');
  }
  if (c.isTrashed()) throw new Error('papelera');
  try {
    const prueba = c.createFolder('Prueba de Oficina Hacienda');
    prueba.setTrashed(true);
  } catch (e) {
    if (esPermisoDrive(e)) throw new Error('autorizar');
    throw new Error('soloLectura');
  }
  propiedades().setProperty('FOTOS_CARPETA', id);
  guardarDato('carpetasFotos', { raiz: id, casas: {}, ninos: {}, meses: {} });
  return infoCarpeta();
}

function infoCarpeta() {
  const id = String(propiedades().getProperty('FOTOS_CARPETA') || '');
  const c = carpetaPorId(id);
  return c ? { id: id, nombre: c.getName(), url: c.getUrl() } : null;
}

function ninosPorId() {
  const h = hoja();
  const m = mapa(h, COLUMNAS);
  const out = {};
  filasDe(h, m).forEach(function (f) {
    if (f[m.id]) out[f[m.id]] = { id: f[m.id], nombre: f[m.nombre], casa: f[m.casa] };
  });
  return out;
}

function carpetaDeNino(n, m, r) {
  const casa = hija(r, n.casa || 'Sin casa');
  m.casas[n.casa || 'Sin casa'] = casa.getId();
  let c = carpetaPorId(m.ninos[n.id]);
  if (!c) {
    c = casa.createFolder(n.nombre || 'Sin nombre');
    m.ninos[n.id] = c.getId();
    return c;
  }
  let dentro = false;
  const ps = c.getParents();
  while (ps.hasNext()) if (ps.next().getId() === casa.getId()) dentro = true;
  if (!dentro) c.moveTo(casa);
  if (c.getName() !== n.nombre && n.nombre) c.setName(n.nombre);
  return c;
}

function acomodarCarpetaNino(n) {
  const m = mapaCarpetas();
  if (!m.ninos[n.id]) return;
  const r = raiz(m);
  carpetaDeNino(n, m, r);
  guardarDato('carpetasFotos', m);
}

function quitarAtajo(id) {
  if (!id) return;
  try {
    DriveApp.getFileById(id).setTrashed(true);
  } catch (e) {
    return;
  }
}

function ponerAtajos(r, ids, todos, m, raizC) {
  const quedan = {};
  Object.keys(r.atajos).forEach(function (k) {
    if (k === '_sin' ? ids.length > 0 : ids.indexOf(k) < 0) quitarAtajo(r.atajos[k]);
    else quedan[k] = r.atajos[k];
  });
  ids.forEach(function (id) {
    if (quedan[id]) return;
    const c = carpetaDeNino(todos[id], m, raizC);
    quedan[id] = c.createShortcut(r.archivo).getId();
  });
  if (!ids.length && !quedan._sin) quedan._sin = fija(m, 'sin', raizC, 'Sin ordenar').createShortcut(r.archivo).getId();
  r.atajos = quedan;
}

function idsValidos(lista, todos) {
  if (!Array.isArray(lista)) return [];
  const out = [];
  lista.forEach(function (x) {
    const id = String(x || '');
    if (todos[id] && out.indexOf(id) < 0) out.push(id);
  });
  return out.slice(0, 60);
}

function base64De(t, max) {
  const b = String(t || '').replace(/^data:[^,]*,/, '');
  if (!b || b.length > max || !/^[A-Za-z0-9+/=]+$/.test(b)) throw new Error('foto');
  return b;
}

function subirAlAlbum(d) {
  const foto = base64De(d.foto, MAX_FOTO_ALBUM);
  const mini = base64De(d.mini, MAX_MINI);
  const huella = texto(d.huella, 80);
  if (huella) {
    const ya = filasAlbum().filter(function (r) {
      return r.huella === huella;
    })[0];
    if (ya) return { repetida: true, foto: publica(ya) };
  }
  const m = mapaCarpetas();
  const r0 = raiz(m);
  const todos = ninosPorId();
  const ids = idsValidos(d.ninos, todos);
  const fecha = /^\d{4}-\d{2}-\d{2}/.test(String(d.fecha || '')) ? String(d.fecha).slice(0, 10) : new Date().toISOString().slice(0, 10);
  const mes = fecha.slice(0, 7);
  const todas = fija(m, 'todas', r0, 'Todas las fotos');
  let cm = carpetaPorId(m.meses[mes]);
  if (!cm) {
    cm = hija(todas, mes);
    m.meses[mes] = cm.getId();
  }
  const nombre = (fecha + ' ' + (texto(d.nombre, 80).replace(/\.[A-Za-z0-9]+$/, '') || 'foto')).replace(/[\\/:*?"<>|]/g, '_') + '.jpg';
  const archivo = cm.createFile(Utilities.newBlob(Utilities.base64Decode(foto), 'image/jpeg', nombre));
  const chica = fija(m, 'mini', r0, 'Miniaturas (no tocar)').createFile(Utilities.newBlob(Utilities.base64Decode(mini), 'image/jpeg', 'mini ' + nombre));
  const r = { id: Utilities.getUuid(), archivo: archivo.getId(), miniatura: chica.getId(), fecha: fecha, subido: new Date().toISOString(), ninos: ids, huella: huella, nombre: nombre, atajos: {} };
  ponerAtajos(r, ids, todos, m, r0);
  escribirFila(r);
  guardarDato('carpetasFotos', m);
  return { foto: publica(r) };
}

function publica(r) {
  return { id: r.id, fecha: r.fecha, ninos: r.ninos, nombre: r.nombre, url: 'https://drive.google.com/file/d/' + r.archivo + '/view' };
}

function listarAlbum(d) {
  const nino = texto(d.nino, 40);
  const sin = d.sin === true;
  const todas = filasAlbum().filter(function (r) {
    if (sin) return !r.ninos.length;
    if (nino) return r.ninos.indexOf(nino) >= 0;
    return true;
  });
  todas.sort(function (a, b) {
    return a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.subido < b.subido ? 1 : -1;
  });
  return todas.slice(0, nino || sin ? 2000 : 300).map(publica);
}

function cuentasAlbum() {
  const out = { _total: 0, _sin: 0 };
  filasAlbum().forEach(function (r) {
    out._total++;
    if (!r.ninos.length) out._sin++;
    r.ninos.forEach(function (id) {
      out[id] = (out[id] || 0) + 1;
    });
  });
  return out;
}

function porIdAlbum(id) {
  const r = filasAlbum().filter(function (x) {
    return x.id === id;
  })[0];
  if (!r) throw new Error('noExiste');
  return r;
}

function miniaturas(ids) {
  const quiero = {};
  (Array.isArray(ids) ? ids.slice(0, 40) : []).forEach(function (id) {
    quiero[String(id)] = true;
  });
  const out = {};
  filasAlbum().forEach(function (r) {
    if (!quiero[r.id]) return;
    try {
      out[r.id] = 'data:image/jpeg;base64,' + Utilities.base64Encode(DriveApp.getFileById(r.miniatura).getBlob().getBytes());
    } catch (e) {
      out[r.id] = '';
    }
  });
  return out;
}

function fotoCompleta(id) {
  const r = porIdAlbum(id);
  return { datos: 'data:image/jpeg;base64,' + Utilities.base64Encode(DriveApp.getFileById(r.archivo).getBlob().getBytes()), foto: publica(r) };
}

function etiquetarFoto(id, ninos) {
  const r = porIdAlbum(id);
  const m = mapaCarpetas();
  const r0 = raiz(m);
  const todos = ninosPorId();
  const ids = idsValidos(ninos, todos);
  ponerAtajos(r, ids, todos, m, r0);
  r.ninos = ids;
  escribirFila(r);
  guardarDato('carpetasFotos', m);
  return publica(r);
}

function borrarDelAlbum(id) {
  const r = porIdAlbum(id);
  [r.archivo, r.miniatura].concat(Object.keys(r.atajos).map(function (k) {
    return r.atajos[k];
  })).forEach(quitarAtajo);
  hojaAlbum().deleteRow(r.fila);
  return true;
}

function hojaCaras() {
  return hojaCon(HOJA_CARAS, ['id', 'datos', 'actualizado']);
}

function leerCaras() {
  const h = hojaCaras();
  const n = h.getLastRow() - 1;
  const out = {};
  if (n < 1) return out;
  h.getRange(2, 1, n, 2).getDisplayValues().forEach(function (f) {
    const d = parsear(f[1]);
    if (f[0] && Array.isArray(d)) out[f[0]] = d;
  });
  return out;
}

function descriptorValido(d) {
  if (!Array.isArray(d) || d.length !== 128) return null;
  const o = [];
  for (let i = 0; i < 128; i++) {
    const v = Number(d[i]);
    if (!isFinite(v) || Math.abs(v) > 2) return null;
    o.push(Math.round(v * 10000) / 10000);
  }
  return o;
}

function guardarCaras(nuevas) {
  if (!Array.isArray(nuevas)) return 0;
  const todos = ninosPorId();
  const actual = leerCaras();
  let n = 0;
  nuevas.slice(0, 200).forEach(function (x) {
    const id = String((x && x.nino) || '');
    const d = descriptorValido(x && x.d);
    if (!todos[id] || !d) return;
    actual[id] = (actual[id] || []).concat([d]).slice(-CARAS_POR_NINO);
    n++;
  });
  if (!n) return 0;
  const h = hojaCaras();
  const ahora = new Date().toISOString();
  Object.keys(actual).forEach(function (id) {
    const i = filaFoto(h, id);
    const fila = [id, JSON.stringify(actual[id]), ahora];
    if (i >= 0) h.getRange(i + 2, 1, 1, 3).setValues([fila]);
    else h.appendRow(fila);
  });
  return n;
}
