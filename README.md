# Oficina Hacienda

App para la oficina de Hacienda of Hope. Hace tres cosas:

1. **Acuerdos de fin de semana**: lee el horario del mes (PDF) y el Word de acuerdos del mes pasado, y arma el Word nuevo.
2. **Cambio de casa**: con el mismo horario arma las hojas de cambio de casa de cada fin de semana, en PDF.
3. **Menú del nutricionista**: limpia el Excel del menú (quita cantidades, pone bebida en las cenas, corrige ortografía).

Todo pasa en el navegador. Los archivos no se suben a ningún servidor y funciona sin internet.

## Usarla

1. Abre `Oficina Hacienda.html` con doble clic (Chrome o Safari).
2. Guárdalo en una carpeta fija, por ejemplo Documentos. El personal y las cédulas se guardan en ese navegador.
3. En **Personal** (abajo en Acuerdos) usa **Guardar copia** de vez en cuando. Si cambias de computadora o se borran los datos del navegador, usa **Cargar copia**.

## Cada mes

**Acuerdos**
1. Sube el horario del mes en PDF.
2. Sube el Word de acuerdos del mes pasado (el que descargaste de la app el mes anterior).
3. Revisa los fines de semana. Los fijos ya vienen marcados. Toca un nombre para agregar o quitar extras.
4. Si sale un aviso de nombre desconocido, dile a la app quién es. Lo recuerda para siempre.
5. Descarga el Word.

**Cambio de casa**
1. Usa el mismo horario (si ya lo subiste en Acuerdos, aparece solo).
2. Elige el fin de semana, marca las casas y dale Descargar PDF o Imprimir.

**Menú**
1. Sube el Excel del menú.
2. Revisa la tabla (botón "Como llegó" para comparar) y las celdas para revisar.
3. Descarga el Excel limpio.

## Qué necesita cada archivo

- **Horario**: un PDF de una página con el calendario. Arriba debe decir el mes y el año ("Octubre 2026"). Cada día con líneas tipo "Casa 1: Miguel y Pa" y "On Call: Jauna". Lo que esté entre paréntesis se ignora.
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
- `src/tabs/`: las tres pantallas.
