# Oficina Hacienda

App para la oficina de Hacienda of Hope. Hace cuatro cosas:

1. **Acuerdos de fin de semana**: lee el horario del mes (PDF o Excel) y el Word de acuerdos del mes pasado, y arma el Word nuevo y un Excel de pagos para contabilidad.
2. **Cambio de casa**: con el mismo horario arma las hojas de cambio de casa de cada fin de semana, en PDF.
3. **Menú del nutricionista**: limpia el Excel del menú (quita cantidades, pone bebida en las cenas, corrige ortografía).
4. **Niños**: lista de los niños con foto, cumpleaños, edad y tallas. Tiene clave y los datos viven en una hoja de Google de Hacienda. Desde ahí salen el resumen de tallas, las hojas de regalos, el directorio, los cumpleaños del mes y la lista en PDF o Excel. Con **Equipos** se separan los niños por niñas/niños, edad o casa, o se arman equipos parejos (mezclando niños y niñas, edades parecidas y hermanos separados), y se descargan en PDF o se copian para WhatsApp.
5. **Horario**: arma el horario del mes de las casas siguiendo las reglas (padres de casa un fin de semana sí y uno no, auxiliares con su día de descanso y 3 fines de semana, casas permitidas y preferidas por persona, on call después del fin de semana trabajado). Se cambia tocando cada casilla, avisa si falta gente o si se rompe una regla, y se descarga en PDF o Excel. Las reglas y el personal se editan en **Personal y reglas**. Se guarda en la hoja de Google (misma clave de Niños) y Acuerdos y Cambio de casa lo pueden usar sin subir archivo.

Acuerdos, Cambio de casa y Menú pasan en el navegador: los archivos no se suben a ningún servidor y funcionan sin internet. Niños necesita internet y la clave.

## Usarla

1. Abre `Oficina Hacienda.html` con doble clic (Chrome o Safari).
2. Guárdalo en una carpeta fija, por ejemplo Documentos. El personal y las cédulas se guardan en ese navegador.
3. En **Personal** (abajo en Acuerdos) usa **Guardar copia** de vez en cuando. Si cambias de computadora o se borran los datos del navegador, usa **Cargar copia**.

## Cada mes

**Acuerdos**
1. Sube el horario del mes en PDF o Excel.
2. Sube el Word de acuerdos del mes pasado (el que descargaste de la app el mes anterior).
3. Revisa los fines de semana. Los fijos ya vienen marcados. Toca un nombre para agregar o quitar extras.
4. Si sale un aviso de nombre desconocido, dile a la app quién es. Lo recuerda para siempre.
5. Descarga el Word. Con **Excel de pagos** sale el resumen por persona y el detalle para contabilidad.

**Cambio de casa**
1. Usa el mismo horario (si ya lo subiste en Acuerdos, aparece solo).
2. Elige el fin de semana, marca las casas y dale Descargar PDF o Imprimir.

**Menú**
1. Sube el Excel del menú.
2. Revisa la tabla (botón "Como llegó" para comparar) y las celdas para revisar.
3. Descarga el Excel limpio.

## Configurar la sección Niños (una sola vez)

1. Con la cuenta de Google de Hacienda, crea una hoja de cálculo nueva, por ejemplo "Niños Hacienda".
2. En la hoja, ve a **Extensiones → Apps Script**.
3. Borra lo que aparece y pega todo el contenido de `google/Code.gs`. Guarda.
4. Arriba, en la lista de funciones, elige `prepararHoja` y dale **Ejecutar**. Acepta los permisos (Revisar permisos → tu cuenta → Configuración avanzada → Ir al proyecto → Permitir). Se crea la pestaña "Ninos".
5. A la izquierda, en **Configuración del proyecto** (engranaje), baja a **Propiedades de la secuencia de comandos** → **Agregar propiedad**. Nombre: `CLAVE`. Valor: la clave que quieras. Guarda.
6. Arriba a la derecha: **Implementar → Nueva implementación**. Tipo: **Aplicación web**. Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier persona**. Dale Implementar y copia la dirección que termina en `/exec`.
7. En la app, pestaña **Niños**, pega esa dirección, escribe la clave y entra.

**Actualizar el código de Google** (cuando la app diga "Falta actualizar el código de Google"): abre Apps Script, borra todo, pega el `google/Code.gs` nuevo y guarda. Ejecuta `prepararHoja` una vez. Luego **Implementar → Administrar implementaciones → lápiz → Versión: Nueva versión → Implementar**. La dirección `/exec` no cambia y los datos no se pierden.

**Copia de seguridad semanal** (una sola vez): en Apps Script, en la lista de funciones elige `activarCopias` y dale **Ejecutar**. Acepta los permisos. Cada domingo de madrugada Google guarda una copia completa de la hoja en la carpeta "Copias de Oficina Hacienda" de tu Drive y deja las 8 más nuevas. La pestaña Inicio avisa si la copia no está activada o si lleva más de 9 días sin hacerse. Para recuperar algo, abre la copia y copia los datos a la hoja original.

**Lista de personal y cédulas en Google** (desde la versión 6 del código de Google): en cualquier computadora o celular que entre con la clave, la lista de Personal de Acuerdos se guarda en la hoja (pestaña "Horarios", fila "personal") y se ve igual en todos lados. Sin clave sigue guardándose solo en ese navegador.

**Control de personal** (desde la versión 8 del código de Google): la pestaña **Control de personal** pide la misma clave de Niños. Ahí se ve, por año o por mes, cuántos días tomó de vacaciones cada persona y cuántos faltó, con el motivo (enfermedad o emergencia médica, emergencia familiar, licencia de maternidad o paternidad, otro). Los días se cuentan completos, con fines de semana. Las ausencias se anotan en Horario (**Ausencias y feriados**) o directo en Control con **Anotar una ausencia**; una licencia larga puede cruzar varios meses y la app deja a esa persona fuera del horario de todos. Se guardan junto con la lista de Personal en la hoja de Google (fila "personal"). El horario impreso solo dice "Vacación" o "Ausente", nunca el motivo. Se puede descargar para Excel o imprimir.

**Sam Jr. y las ausencias:** con la clave puesta, Sam Jr. también contesta con los datos del control de personal, por ejemplo “¿cuántos días de vacaciones tomó Mayra este año?”, “¿quién está de licencia?” o “¿quién ha faltado más?”. Estas preguntas piden la clave porque son datos delicados.

**Fotos de los niños** (desde la versión 7 del código de Google): en Niños → Fotos, la primera vez pega el enlace de la carpeta de Drive (puede ser una carpeta compartida o una unidad compartida; la cuenta dueña del Apps Script tiene que poder editarla). La app crea adentro:
- `Todas las fotos/AAAA-MM/`: cada foto una sola vez.
- `Casa 1/…/Nombre del niño/`: accesos directos a sus fotos (una foto de grupo aparece en la carpeta de cada niño sin ocupar más espacio).
- `Sin ordenar/`: fotos donde no se reconoció a ningún niño.
- `Miniaturas (no tocar)/`: las fotos chiquitas que usa el álbum de la app.
Si un niño cambia de casa o de nombre en la app, su carpeta se mueve y se renombra sola. El reconocimiento de caras se hace en el navegador (programa face-api, carpeta `public/vendor` y `public/modelos`); las fotos no se mandan a ningún servicio de inteligencia artificial. Las caras que se corrigen se guardan como números (no como fotos) en la pestaña "Caras" de la hoja para reconocer mejor la próxima vez. Desde el archivo `Oficina Hacienda.html` abierto en la compu, el programa de caras se baja de internet (jsdelivr); desde Netlify se baja del mismo sitio.

**Ayuda (chat)**: el botón 💬 Ayuda, abajo a la derecha, está en todas las pestañas. No usa inteligencia artificial ni servicios de afuera: entiende las preguntas con reglas propias (`src/lib/asistente/`). Responde cómo hacer cada cosa (los pasos están en `src/lib/asistente/guia.js`; para agregar un tema nuevo copia uno y cambia título, palabras clave y pasos) y datos de la hoja: quién trabaja, on call, días de una persona, quién descansa, cambio de casa, cumpleaños, edades, tallas, niños por casa y si el horario del mes ya está hecho. Para los datos pide la clave. Funciona en español y en inglés: detecta el idioma de cada pregunta y responde en ese idioma (botón ES/EN arriba del chat). Las palabras en inglés se traducen a las del motor en `texto.js` (FRASES_EN y PALABRAS_EN) y los pasos en inglés están en `guia.js` (EN).

Para cambiar la clave, edita la propiedad `CLAVE` (paso 5). No hay que volver a implementar. Todos los dispositivos tendrán que escribir la clave nueva.

La dirección `/exec` sola no muestra nada: sin la clave correcta no devuelve datos, y después de varios intentos fallidos se bloquea 15 minutos. Comparte la hoja de Google solo con quien la necesite, porque quien tenga acceso a la hoja ve los datos directamente.

## Qué necesita cada archivo

- **Horario**: un PDF de una página con el calendario, o el Excel del horario (con "Horario NOVIEMBRE 2026" arriba). Arriba debe decir el mes y el año ("Octubre 2026"). Cada día con líneas tipo "Casa 1: Miguel y Pa" y "On Call: Jauna". Lo que esté entre paréntesis se ignora.
- **Word de acuerdos**: .docx con al menos un "ACUERDO DE TRABAJO" de fin de semana (con líneas "Sábado …" y "Domingo …"). Ese acuerdo se usa de modelo. Los acuerdos que no son fines de semana de este mes ni del mes pasado se dejan al final.
- **Menú**: .xlsx con la hoja "Meal Planner", una fila con Desayuno, Colación, Almuerzo, Refrigerio y Cena, y los días en la primera columna.

## Publicarla en Netlify (opcional)

1. Crea una carpeta y copia dentro `Oficina Hacienda.html` con el nombre `index.html`.
2. Entra a https://app.netlify.com/drop y arrastra la carpeta.
3. Para actualizar, en el sitio ve a Deploys y arrastra la carpeta otra vez.

Si entras con la clave, el personal es el mismo en el archivo de tu compu, en Netlify y en el celular. Sin clave, cada uno guarda el suyo (puedes pasarlo con Guardar copia / Cargar copia).

**En el celular**: abre la dirección de Netlify. En Android (Chrome), menú ⋮ → "Instalar app". En iPhone (Safari), Compartir → "Agregar a inicio". Queda con su ícono como cualquier app.

## Cambiar el código

Necesitas Node.js 18 o más nuevo.

```
npm install
npm run dev
npm run build
```

`npm run build` crea `dist/index.html`, que es el archivo completo de la app. Las versiones de todas las librerías están fijas en `package.json` y `package-lock.json`, así que siempre se arma igual.

Carpetas principales:

- `src/lib/horario.js`: lee el calendario del PDF.
- `src/lib/acuerdos.js`: lee y arma el Word.
- `src/lib/casas.js`: arma el PDF de cambio de casa.
- `src/lib/menu.js` y `src/lib/menuLimpieza.js`: leen, limpian y arman el Excel.
- `src/lib/personal.js`: lista base del personal, fijos y padres de casa.
- `src/lib/ninos.js`: conexión con la hoja de Google, fechas, edades e importación de Excel.
- `google/Code.gs`: el código que va en Apps Script (clave, sesiones de 30 días y datos de los niños).
- `src/tabs/`: las cuatro pantallas.
