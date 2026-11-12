# Oficina Hacienda

App para la oficina de Hacienda of Hope. Hace cuatro cosas:

1. **Acuerdos de fin de semana**: lee el horario del mes (PDF o Excel) y el Word de acuerdos del mes pasado, y arma el Word nuevo y un Excel de pagos para contabilidad.
2. **Cambio de casa**: con el mismo horario arma las hojas de cambio de casa de cada fin de semana, en PDF.
3. **Menú del nutricionista**: limpia el Excel del menú (quita cantidades, pone bebida en las cenas, corrige ortografía).
4. **Niños**: lista de los niños con foto, cumpleaños, edad y tallas. Tiene clave y los datos viven en una hoja de Google de Hacienda. Desde ahí salen el resumen de tallas, las hojas de regalos, el directorio, los cumpleaños del mes y la lista en PDF o Excel.

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

El personal guardado en el archivo de tu compu y el de la versión en Netlify son independientes. Usa una sola, o pasa los datos con Guardar copia / Cargar copia.

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
