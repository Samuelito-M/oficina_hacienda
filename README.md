# Oficina Hacienda

App para la oficina de Hacienda of Hope. Hace cuatro cosas:

1. **Acuerdos de fin de semana**: lee el horario del mes (PDF o Excel) y el Word de acuerdos del mes pasado, y arma el Word nuevo y un Excel de pagos para contabilidad.
2. **Cambio de casa**: con el mismo horario arma las hojas de cambio de casa de cada fin de semana, en PDF.
3. **Menú del nutricionista**: limpia el Excel del menú (quita cantidades y lo que diga "en casa", pone bebida en las cenas, corrige ortografía) y lo deja con una sola hoja, en una página, con las firmas de la coordinadora y del doctor abajo.
4. **Niños**: lista de los niños con foto, cumpleaños, edad y tallas. Tiene clave y los datos viven en una hoja de Google de Hacienda. Desde ahí salen el resumen de tallas, las hojas de regalos, el directorio, los cumpleaños del mes y la lista en PDF o Excel. Con **Equipos** se separan los niños por niñas/niños, edad o casa, o se arman equipos parejos (mezclando niños y niñas, edades parecidas y hermanos separados), y se descargan en PDF o se copian para WhatsApp.
5. **Horario**: arma el horario del mes de las casas siguiendo las reglas (padres de casa un fin de semana sí y uno no, auxiliares con su día de descanso y 3 fines de semana, casas permitidas y preferidas por persona, on call: Viviana del viernes que trabaja al jueves siguiente, y si no, Jauna por defecto; lo que se pone a mano se respeta). Se cambia tocando cada casilla, avisa si falta gente o si se rompe una regla, y se descarga en PDF o Excel. Las reglas y el personal se editan en **Personal y reglas**. Se guarda en la hoja de Google (misma clave de Niños) y Acuerdos y Cambio de casa lo pueden usar sin subir archivo.

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
3. Descarga el Excel limpio. Trae solo la hoja del menú (las otras hojas se quitan), sale en una sola página al imprimir y abajo tiene las firmas: Jauna Reeger como coordinadora y el espacio del doctor. Si el Excel ya traía esas firmas, se respetan los nombres y cargos que tenía.

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

**Completar la última semana con el mes siguiente:** en Horario, si el mes no termina en domingo, marca **Completar la semana con [mes siguiente]**. Salen los días del mes siguiente hasta el domingo (en la última semana y en la vista Mes); se llenan con **Completar lo que falta** o a mano, y al guardar se guardan en el mes siguiente. También salen en el PDF y el Excel (Acuerdos los ignora al leer el archivo). La opción se recuerda en cada computadora.

**AM / PM (opcional):** al tocar un día y una casa, al lado de cada persona marcada salen dos botoncitos **AM** y **PM**. Se marca uno si esa persona va solo en la mañana o en la tarde; tocarlo otra vez lo quita. No es obligatorio: sin marcar, todo queda como siempre. En el horario sale una etiqueta pequeña al lado del nombre (AM en amarillo, PM en morado) y en el PDF y el Excel sale "Nombre (AM)". Si se marca "Poner lo mismo todo el fin de semana", el turno se pone en esos días también. Acuerdos sigue leyendo bien estos horarios.

**Sam Jr. cambia el horario:** escríbele como se lo dirías a alguien y lo hace en el mes abierto en Horario (o el mes que nombres): "pon a Wendy AM todos los días que le toca", "quita a Mayra del 15", "cambia a Mayra por Wendy el 20", "pon a Wendy en Casa 2 del 14 al 17", "intercambia a Mayra con Marlene el fin de semana del 12", "pon a Jauna de on call el 22", "deja el on call automático", "marca el 25 como feriado", "pon una nota el 24: cena de Navidad", "Mayra está de vacaciones del 21 al 24" (esta pide confirmar porque queda en Control de personal), "arma el horario de enero", "guarda el horario" y "deshaz". Después de cada cambio salen los botones **Guardar** y **Deshacer**. Nada queda guardado hasta que se toca Guardar.

**On call:** la app lo pone sola. Si Viviana trabaja el viernes, queda de on call de ese viernes al jueves siguiente; las otras semanas queda Jauna (se cambia en Personal y reglas → Reglas → On call por defecto). Si cambias el on call de un día a mano, la app lo respeta y ya no lo vuelve a cambiar; para que vuelva a la regla, toca ese on call y "Volver a lo automático".

**Cosas para revisar como lista:** arriba del horario, cada cosa para revisar tiene su casilla. Cuando ya la viste, márcala y se quita de la lista; quedan solo las que faltan. Lo marcado se recuerda en esa computadora (por mes). Si cambia algo en el horario y vuelve a haber un problema distinto, sale otra vez. **Volver a mostrar las que ya vi** las trae de nuevo.

**Conteo de fines de semana:** en Horario, abajo, el botón **Conteo de fines de semana** muestra cuántos fines de semana trabaja cada persona en el mes y cuáles (por ejemplo "Tania 2 · vie 4–dom 6 (Casa 1) · vie 18–dom 20 (Casa 2)"), separado en auxiliares, padres de casa y otras personas. El on call no se cuenta. Sam Jr. también lo da: "dame el conteo de fines de semana" o "¿cuántos fines trabaja cada uno en diciembre?", con botón para copiar.

**Otra persona (que no está en el personal):** al elegir quién trabaja un día, toca **+ Otra persona**, escribe el nombre y **Agregar**. Sale ese día en el horario, el PDF y el Excel, pero no cuenta para acuerdos, cambio de casa ni reglas. Después aparece en la lista de ese mes para elegirla rápido.

**Acuerdos para imprimir a doble cara:** la casilla **ordenar el Word por persona** (marcada por defecto, se recuerda en cada computadora) junta todos los fines de semana de cada persona, en el mismo orden de personas del Word del mes pasado (las personas nuevas van después). Cuando una persona termina en una página impar, el Word trae una página en blanco de verdad (se ve en pantalla y se imprime en cualquier programa), así la siguiente empieza en el frente de una hoja nueva. Los acuerdos viejos de una página que se conservan van con su persona; otros documentos que ya estaban (adendum, acuerdo de servicios) van al final, empezando en hoja nueva. Además, si un auxiliar trabaja más de 3 fines de semana en el mes, Acuerdos (y Sam Jr.) muestran un aviso con sus fechas; los padres de casa no se cuentan.

**Sam Jr. hace los documentos de la oficina:** se le pide en el chat y arma el archivo con las mismas funciones de cada pestaña: equipos y grupos de niños (“dame 2 equipos de niños de 5 a 10 años”, con PDF, copiar para WhatsApp y otra mezcla), acuerdos de trabajo en Word y Excel de pagos (usa los extras marcados en Acuerdos; si falta el Word del mes pasado lo pide por el clip 📎), hojas de cambio de casa de un fin de semana, menú limpio (subiendo el Excel por 📎), hojas de regalos, directorio, cumpleaños del mes en PDF, horario, listas y reporte de ausencias. Para cambiar datos (armar o guardar el horario, poner ausencias) lleva a la pantalla correcta.

**Sam Jr. con datos:** además de explicar cómo hacer las cosas, responde con los datos: cuántos fines de semana trabaja alguien (si estás en Horario, del mes que tienes abierto, aunque no lo hayas guardado), listas de niñas/niños (por casa, por edad) y del personal con botones para **descargar en Excel o PDF**, y el horario de un mes para descargar. Estas preguntas piden la clave.

**Personas que trabajan distinto:** en Horario → Personal y reglas → Trabajadores, cada auxiliar tiene **Fines de semana al mes** (Normal = la regla general, ninguno, 1 a 4, o todos) y **Días entre semana al mes** (todos sus días o un número; la app los reparte en el mes). Sirve, por ejemplo, para alguien que trabaja entre semana y solo 1 fin de semana, o al revés. A quien tiene un número fijo nunca se le pone un fin de semana extra; si se le pone a mano, sale en verde para revisar.

**Control de personal** (desde la versión 8 del código de Google): la pestaña **Control de personal** pide la misma clave de Niños. Ahí se ve, por año o por mes, cuántos días tomó de vacaciones cada persona y cuántos faltó, con el motivo (enfermedad o emergencia médica, emergencia familiar, licencia de maternidad o paternidad, otro). Los días se cuentan completos, con fines de semana. Las ausencias se anotan en Horario (**Ausencias y feriados**) o directo en Control con **Anotar una ausencia**; una licencia larga puede cruzar varios meses y la app deja a esa persona fuera del horario de todos. Se guardan junto con la lista de Personal en la hoja de Google (fila "personal"). El horario impreso solo muestra "Vacación"; las otras ausencias (médicas, familiares, licencias) no se imprimen. Se puede descargar para Excel o imprimir.

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
- `src/tabs/`: las pantallas (Inicio, Acuerdos, Cambio de casa, Menú, Niños, Horario y Control de personal).
- `src/lib/accionesHorario.js` y `src/lib/asistente/accionesChat.js`: los cambios que Sam Jr. hace en el horario cuando se lo piden.

**Pruebas en el navegador** (`test/e2e/`): después de `npm run build`, corre por ejemplo `node test/e2e/recorrido.cjs` (recorre todas las pestañas), `node test/e2e/oncall.cjs` y `node test/e2e/samacciones.cjs`. Usan una copia falsa de la hoja de Google y niños de prueba, nunca los datos reales. Necesitan Playwright (`npm i -D playwright` y `npx playwright install chromium`). El recorrido usa el Word de acuerdos y el Excel del menú de la carpeta que indiques con `DATOS=/ruta/a/la/carpeta`.
