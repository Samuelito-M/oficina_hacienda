import JSZip from 'jszip';
const { leerZip } = await import('../src/lib/zipLector.js');
const ok = (c, m) => { console.log((c ? 'ok - ' : 'FALLA - ') + m); if (!c) process.exitCode = 1; };
const z = new JSZip();
const foto = (n) => Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.alloc(n, 7), Buffer.from([0xff, 0xd9])]);
z.file('Navidad 2025/IMG_0001.JPG', foto(5000), { date: new Date(2025, 11, 24, 10, 0, 0) });
z.file('Navidad 2025/niña con árbol.jpg', foto(3000), { compression: 'DEFLATE' });
z.file('otra/IMG_0003.png', foto(100), { compression: 'STORE' });
z.file('__MACOSX/Navidad 2025/._IMG_0001.JPG', 'basura');
z.file('Navidad 2025/.DS_Store', 'basura');
z.file('notas.txt', 'hola');
z.folder('vacia');
const buf = await z.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
const r = await leerZip(new Blob([buf]));
ok(r.entradas.length === 3, 'encuentra solo las 3 fotos (ignora __MACOSX, .DS_Store, txt y carpetas): ' + r.entradas.map((e) => e.ruta).join(', '));
ok(r.entradas.some((e) => e.nombre === 'niña con árbol.jpg'), 'nombres con ñ y tildes');
for (const e of r.entradas) {
  const f = await r.archivo(e);
  const b = Buffer.from(await f.arrayBuffer());
  const esperado = e.nombre === 'IMG_0001.JPG' ? foto(5000) : e.nombre === 'IMG_0003.png' ? foto(100) : foto(3000);
  ok(b.equals(esperado), `saca ${e.nombre} igual (${e.metodo === 8 ? 'comprimida' : 'sin comprimir'})`);
  if (e.nombre === 'IMG_0001.JPG') ok(new Date(f.lastModified).getFullYear() === 2025 && new Date(f.lastModified).getMonth() === 11 && new Date(f.lastModified).getDate() === 24, 'usa la fecha del zip si la foto no tiene fecha de cámara');
  if (e.nombre === 'IMG_0003.png') ok(f.type === 'image/png', 'tipo png');
}
let malo = '';
try { await leerZip(new Blob([Buffer.from('esto no es un zip')])); } catch (e) { malo = e.message; }
ok(/no es un zip/.test(malo), 'archivo que no es zip: lo dice');
const grande = new JSZip();
for (let i = 0; i < 1000; i++) grande.file(`fotos/IMG_${i}.jpg`, foto(50), { compression: 'STORE' });
const gb = await grande.generateAsync({ type: 'nodebuffer' });
const t0 = Date.now();
const g = await leerZip(new Blob([gb]));
ok(g.entradas.length === 1000 && Date.now() - t0 < 2000, `1000 fotos: lee el índice rápido (${Date.now() - t0} ms)`);
const ult = await g.archivo(g.entradas[999]);
ok(ult.name === 'IMG_999.jpg' && ult.size === 54, 'saca la foto 1000 sin leer las demás');
