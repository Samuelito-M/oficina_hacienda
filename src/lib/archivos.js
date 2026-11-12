export const MIME = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf'
};

export function extension(nombre) {
  const m = String(nombre || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

export function leerBytes(file) {
  if (file.arrayBuffer) return file.arrayBuffer().then((b) => new Uint8Array(b));
  return new Promise((ok, mal) => {
    const r = new FileReader();
    r.onload = () => ok(new Uint8Array(r.result));
    r.onerror = () => mal(r.error);
    r.readAsArrayBuffer(file);
  });
}

export function descargar(bytes, nombre, tipo) {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function abrirPdf(bytes, nombre) {
  const blob = new Blob([bytes], { type: MIME.pdf });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) {
    descargar(blob, nombre, MIME.pdf);
    return false;
  }
  setTimeout(() => URL.revokeObjectURL(url), 300000);
  return true;
}

export function nombreSeguro(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[“”«»"']/g, '')
    .replace(/[\\/:*?<>|]+/g, '-')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}