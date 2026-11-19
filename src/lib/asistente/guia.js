export const GUIA = [
  {
    id: 'armar',
    titulo: 'Armar el horario del mes',
    claves: { armar: 3, hacer: 1, crear: 2, llenar: 2, generar: 2, horario: 2, mes: 1, reglas: 1, automatico: 2, nuevo: 1, empezar: 1 },
    pasos: ['Abre la pestaña **Horario**.', 'Con las flechas ‹ › elige el mes.', 'Primero (paso 1) toca **Poner vacaciones y feriados** si hay alguno ese mes, así la app no pone a nadie esos días.', 'Toca **Armar el horario con las reglas**. La app pone a todos según las reglas (fines de semana, descansos y on call).', 'Revisa lo marcado en verde y cambia lo que haga falta tocando cada casa.', 'Al final toca **Guardar horario** (abajo).'],
    ir: 'horario',
    tambien: ['copiar', 'cambiar', 'guardar']
  },
  {
    id: 'copiar',
    titulo: 'Copiar el horario del mes anterior',
    claves: { copiar: 3, copia: 2, anterior: 3, pasado: 2, mismo: 1, plantilla: 2, igual: 1, repetir: 2 },
    pasos: ['Abre **Horario** y ve al mes nuevo con las flechas ‹ ›.', 'Toca **Copiar el de** (el mes anterior). La app copia semana por semana y se salta los feriados.', 'Cambia lo que sea distinto y toca **Guardar horario**.'],
    ir: 'horario',
    tambien: ['armar', 'guardar']
  },
  {
    id: 'cambiar',
    titulo: 'Cambiar a una persona en un día',
    claves: { cambiar: 3, poner: 2, mover: 2, reemplazar: 3, quitar: 1, persona: 1, dia: 1, casa: 1, turno: 2, cubrir: 2, asignar: 2, elegir: 1 },
    pasos: ['En **Horario**, toca la casa de ese día (en la vista **Semana** o **Mes**).', 'Marca o desmarca a las personas. Solo salen las que trabajan en esa casa.', 'Si es fin de semana, deja marcado **Poner lo mismo todo el fin de semana** para no repetirlo en cada día.', 'Toca **Listo** y después **Guardar horario** (o **Actualizar horario** si ya estaba guardado).'],
    ir: 'horario',
    tambien: ['guardar', 'trabajadores']
  },
  {
    id: 'guardar',
    titulo: 'Guardar o actualizar el horario',
    claves: { guardar: 3, actualizar: 3, grabar: 2, cambios: 1, salvar: 2, perder: 1, deshacer: 2 },
    pasos: ['Cuando cambias algo en **Horario**, abajo aparece una barra.', 'Toca **Guardar horario** (o **Actualizar horario** si ya estaba guardado). Así lo ven todos.', 'Si te equivocaste, toca **Deshacer cambios** y vuelve a como estaba guardado.'],
    ir: 'horario',
    tambien: ['descargar']
  },
  {
    id: 'descargar',
    titulo: 'Descargar o imprimir el horario',
    claves: { descargar: 3, imprimir: 3, pdf: 3, excel: 2, bajar: 2, mandar: 1, enviar: 1, compartir: 1, whatsapp: 1, papel: 1 },
    pasos: ['En **Horario**, toca **Descargar**.', 'Elige **PDF para imprimir** (todo el mes en una hoja, con colores) o **Excel** (con el formato de siempre).', 'Ese mismo PDF o Excel sirve para Acuerdos y Cambio de casa.'],
    ir: 'horario',
    tambien: ['acuerdos']
  },
  {
    id: 'borrar',
    titulo: 'Borrar el horario y empezar de nuevo',
    claves: { borrar: 3, eliminar: 3, cero: 2, nuevo: 1, limpiar: 2, desde: 1, empezar: 1, rehacer: 2 },
    pasos: ['En **Horario**, toca **Borrar** (arriba).', 'Toca **Sí, borrar** para confirmar. Vuelve la pantalla de inicio con **Armar con las reglas**, **Copiar el anterior** o **Empezar en blanco**.', 'Las vacaciones y feriados que ya pusiste se quedan.'],
    ir: 'horario',
    tambien: ['armar', 'copiar']
  },
  {
    id: 'vacaciones',
    titulo: 'Poner vacaciones, ausencias o feriados',
    claves: { vacacion: 3, vacaciones: 3, feriado: 3, feriados: 3, permiso: 2, libre: 1, ausente: 2, ausencia: 3, ausencias: 3, falta: 1, enfermo: 1, festivo: 2, licencia: 3, maternidad: 3, embarazada: 2, emergencia: 2 },
    pasos: ['Si el mes todavía está vacío, ponlas en el paso 1 con **Poner ausencias y feriados**, antes de armar. Si ya está armado, toca **Ausencias y feriados** (arriba, al lado del mes).', 'Elige la persona, el **motivo** (vacaciones, médica, familiar, licencia u otro), la fecha de inicio y la última, y toca **Agregar**. Si dura varios meses (maternidad, por ejemplo) pon la fecha final real: queda fuera del horario de todos esos meses.', 'Para feriado: escribe el día y toca **Marcar**. Se guarda enseguida.', 'Para quitar una, toca **Quitar** a su lado. Si hay varias en el mes, puedes usar **Quitar todas las ausencias** del mes.', 'La app ya no pone a esa persona esos días. En el horario impreso solo dice “Vacación” o “Ausente”, sin el motivo. El motivo se ve en **Control de personal**.'],
    ir: 'horario',
    tambien: ['armar']
  },
  {
    id: 'control',
    titulo: 'Control de personal (reporte de ausencias)',
    claves: { control: 3, reporte: 3, reportes: 3, personal: 1, dias: 1, tomaron: 2, faltaron: 3, faltas: 2, anual: 2, mensual: 2, vacaciones: 1, ausencias: 2, motivo: 2, licencia: 2, maternidad: 2 },
    pasos: ['Abre la pestaña **Control de personal** (pide la clave, la misma de Niños).', 'Elige el **año** y el **periodo** (un mes o todo el año).', 'La tabla dice, por persona, cuántos días tomó de vacaciones y cuántos faltó por enfermedad o emergencia médica, familiar, licencia u otro motivo. Los días se cuentan completos, con fines de semana.', 'Toca el nombre de una persona para ver las fechas, el motivo y la nota; ahí también puedes quitar una ausencia mal anotada.', 'Para anotar algo que ya pasó, usa **Anotar una ausencia** (abajo). Lo que pones en Horario como ausencia también aparece aquí solo.', 'Toca **Descargar para Excel** o **Imprimir**.'],
    ir: 'control'
  },
  {
    id: 'notas',
    titulo: 'Poner notas u observaciones',
    claves: { nota: 3, notas: 3, observacion: 3, observaciones: 3, comentario: 2, escribir: 1, apunte: 2, aviso: 1 },
    pasos: ['Nota de un día: en **Horario** vista **Mes**, toca el lápiz ✏️ de ese día y escribe.', 'Observaciones del mes: toca **Agregar observaciones del mes** (abajo del calendario).', 'Toca **Guardar horario**. Las notas salen en el PDF y en el Excel.'],
    ir: 'horario'
  },
  {
    id: 'trabajadores',
    titulo: 'Agregar o quitar trabajadores',
    claves: { agregar: 2, nuevo: 2, nueva: 2, trabajador: 3, trabajadora: 3, empleado: 3, empleada: 3, personal: 2, quitar: 2, renuncio: 3, salio: 2, contratar: 3, auxiliar: 2, persona: 1 },
    pasos: ['En **Horario**, toca **Personal y reglas**.', 'Para agregar: escribe el nombre abajo, elige si es **Padre o madre de casa**, **Auxiliar** o **Auxiliar solo de fin de semana**, y toca **Agregar**. Después marca sus casas y su día de descanso.', 'Para quitar: toca **Quitar** en esa persona. Pasa a "Ya no trabajan" (se puede volver a poner).', 'Los cambios se pasan solos a Acuerdos y Cambio de casa. En Acuerdos → Personal solo falta poner apellidos y cédula.'],
    ir: 'horario',
    tambien: ['casasTrabajador', 'cedulas']
  },
  {
    id: 'casasTrabajador',
    titulo: 'Elegir en qué casas trabaja cada persona',
    claves: { casas: 2, casa: 1, trabaja: 1, donde: 1, puede: 1, descanso: 3, dia: 1, preferencia: 3, prefiere: 3, oncall: 1, fines: 2, finde: 2, semana: 1, entre: 1, solo: 2, alguien: 1, cuantos: 1, revez: 2, reves: 2 },
    pasos: ['En **Horario** → **Personal y reglas** → **Trabajadores**.', 'En cada persona, toca las casas donde sí trabaja (las marcadas quedan en color).', 'Elige su día de descanso, la casa que prefiere y si hace on call.', 'Si alguien trabaja distinto a los demás, usa **Fines de semana al mes** (por ejemplo 1, ninguno o todos) y **Días entre semana al mes** (todos sus días o un número, como 4; la app los reparte en el mes). Así se arma, por ejemplo, alguien que trabaja entre semana y solo 1 fin de semana, o al revés.', 'Toca **Listo**. La próxima vez que armes el horario se usa esto.'],
    ir: 'horario',
    tambien: ['reglas']
  },
  {
    id: 'reglas',
    titulo: 'Cambiar las reglas del horario',
    claves: { regla: 3, reglas: 3, cuantos: 1, findes: 2, padres: 1, auxiliares: 2, minimo: 2, cuarto: 2, extra: 1 },
    pasos: ['En **Horario** → **Personal y reglas** → pestaña **Reglas**.', 'Ahí cambias cuántos fines de semana trabajan los padres y los auxiliares, cuántos auxiliares van en cada casa y si alguien puede hacer un fin de semana más cuando falta gente.', 'Toca **Listo**.'],
    ir: 'horario',
    tambien: ['verde']
  },
  {
    id: 'verde',
    titulo: 'Qué significa lo marcado en verde',
    claves: { verde: 3, revisar: 3, revision: 3, marcado: 2, significa: 2, falta: 2, aviso: 2, avisos: 2, alerta: 2 },
    pasos: ['Lo verde no es un error: son cosas para que revises.', 'Por ejemplo, una casa donde falta alguien, una persona en dos lugares o alguien que hace un fin de semana más.', 'Toca lo marcado para elegir a alguien, o déjalo así si está bien.'],
    ir: 'horario',
    tambien: ['cambiar']
  },
  {
    id: 'acuerdos',
    titulo: 'Hacer los acuerdos de fin de semana',
    claves: { acuerdo: 3, acuerdos: 3, word: 2, contrato: 2, pago: 1, firmar: 1, papeles: 1 },
    pasos: ['Abre la pestaña **Acuerdos**.', 'En **Horario del mes** sube el PDF o Excel, o toca **usa el horario guardado en la pestaña Horario**.', 'En **Acuerdos del mes pasado** sube el Word del mes pasado (sirve de modelo).', 'Los fijos salen solos. Toca un nombre para agregar o quitar extras.', 'Toca **Descargar Word**. Para contabilidad está **Excel de pagos**.'],
    ir: 'acuerdos',
    tambien: ['cedulas', 'pagos']
  },
  {
    id: 'cedulas',
    titulo: 'Poner apellidos y cédula de un trabajador',
    claves: { cedula: 3, cedulas: 3, apellido: 3, apellidos: 3, nombre: 1, completo: 2, documento: 1, identidad: 2 },
    pasos: ['En **Acuerdos**, abre **Personal** (abajo).', 'En la fila de la persona escribe **Apellidos y nombres** y la **Cédula**.', 'Se guarda solo. Si entraste con la clave, queda guardado en Google para todas las computadoras.'],
    ir: 'acuerdos',
    tambien: ['acuerdos', 'trabajadores']
  },
  {
    id: 'pagos',
    titulo: 'Excel de pagos para contabilidad',
    claves: { excel: 2, pagos: 3, pago: 3, contabilidad: 3, plata: 2, dinero: 2, cuanto: 1, pagar: 3, monto: 2 },
    pasos: ['En **Acuerdos**, con el horario y el Word ya subidos, toca **Excel de pagos**.', 'Sale el resumen por persona y el detalle de cada fin de semana.'],
    ir: 'acuerdos'
  },
  {
    id: 'cambiocasa',
    titulo: 'Hacer las hojas de cambio de casa',
    claves: { cambiocasa: 4, hojas: 2, hoja: 2, tutor: 2, entrega: 1, imprimir: 1 },
    pasos: ['Abre la pestaña **Cambio de casa**.', 'Sube el horario (o usa el guardado en la pestaña Horario).', 'Elige el **fin de semana**. Ya vienen marcadas las casas donde no están los padres de casa.', 'Toca **Imprimir** o **Descargar PDF**.'],
    ir: 'casas'
  },
  {
    id: 'menu',
    titulo: 'Arreglar el menú del nutricionista',
    claves: { menu: 4, comida: 3, nutricionista: 3, cocina: 3, almuerzo: 2, cena: 2, desayuno: 2, ortografia: 2 },
    pasos: ['Abre la pestaña **Menú**.', 'En **Menú de la quincena** sube el Excel como lo llena cocina.', 'La app quita cantidades, pone la bebida en las cenas y corrige la ortografía.', 'Toca **Descargar Excel**. Si una palabra sale mal, agrégala en **Palabras que corrige**.'],
    ir: 'menu'
  },
  {
    id: 'ninoNuevo',
    titulo: 'Agregar o editar un niño',
    claves: { agregar: 2, nino: 2, ninos: 2, nuevo: 2, nueva: 2, editar: 3, datos: 1, ficha: 3, registrar: 3, llego: 2 },
    pasos: ['Abre la pestaña **Niños** (con la clave).', 'Toca **Agregar niño**, o toca un niño de la lista para editarlo.', 'Llena nombre, casa, cumpleaños, tallas y lo demás. Puedes ponerle foto.', 'Toca **Guardar**.'],
    ir: 'ninos',
    tambien: ['tallas', 'fotosSubir']
  },
  {
    id: 'tallas',
    titulo: 'Ver o imprimir las tallas',
    claves: { talla: 3, tallas: 3, zapatos: 2, ropa: 2, americana: 2, ecuador: 2, medida: 2 },
    pasos: ['En **Niños**, toca **Tallas**.', 'Elige si las quieres en **Ecuador**, **Americana** o **Ambas**.', 'Para cambiar la talla de un niño, toca su nombre y edita **Tallas**.'],
    ir: 'ninos'
  },
  {
    id: 'regalos',
    titulo: 'Hojas de regalos, lista, directorio y cumpleaños',
    claves: { regalo: 3, regalos: 3, documento: 2, documentos: 2, lista: 2, directorio: 3, padrino: 2, navidad: 2, imprimir: 1 },
    pasos: ['En **Niños**, toca **Documentos**.', 'Elige **Lista**, **Hojas de regalos**, **Directorio** o **Cumpleaños**.', 'En tallas elige Ecuador, Americana o Ambas y descarga el PDF.'],
    ir: 'ninos'
  },
  {
    id: 'equipos',
    titulo: 'Separar a los niños por equipos',
    claves: { equipo: 3, equipos: 3, grupo: 2, grupos: 2, separar: 3, dividir: 2, edades: 2, hombres: 2, mujeres: 2 },
    pasos: ['En **Niños**, toca **Equipos**.', 'Elige quiénes participan y cuántos equipos quieres, o separa por **Niñas y niños**, **Edad** o **Casa**.', 'Puedes repartir niños y niñas parejo y separar hermanos. Después descarga o imprime los grupos.'],
    ir: 'ninos'
  },
  {
    id: 'fotosSubir',
    titulo: 'Subir fotos de los niños',
    claves: { foto: 3, fotos: 3, subir: 2, album: 3, imagen: 2, imagenes: 2, drive: 2, caras: 2, carpeta: 1 },
    pasos: ['En **Niños**, toca **Fotos** → **Subir fotos** y elige las fotos (muchas a la vez).', 'La app reconoce a los niños. Revisa los nombres: los que dicen “¿Nombre?” no está segura. Toca una cara para corregir o **+ Agregar niño**.', 'Toca **Guardar en Drive**. Cada foto va a la carpeta de cada niño (Casa → Niño).'],
    ir: 'ninos',
    tambien: ['fotosVer']
  },
  {
    id: 'fotosZip',
    titulo: 'Subir muchas fotos o un zip',
    claves: { zip: 7, muchas: 6, masivo: 6, cientos: 6, mil: 6, comprimido: 6, monton: 6, foto: 2, fotos: 2, subir: 1, carpeta: 1 },
    pasos: ['En **Niños** → **Fotos** → **Subir fotos**, toca **Subir un zip** o **Subir una carpeta**.', 'La app revisa las fotos una por una y **guarda solas en Drive** las que reconoce con seguridad. Arriba ves cuántas van.', 'Puedes **Pausar** y **Seguir**. Si se cierra la página, vuelve a elegir el mismo zip: sigue donde quedó y no repite fotos.', 'Al final revisa solo las que apartó (“No está segura” y “No reconoció a nadie”) y toca **Guardar en Drive**.'],
    ir: 'ninos',
    tambien: ['fotosSubir', 'fotosVer']
  },
  {
    id: 'fotosVer',
    titulo: 'Ver o corregir las fotos de un niño',
    claves: { ver: 2, fotos: 3, album: 3, corregir: 2, equivocada: 2, borrar: 1, sale: 1, quien: 1 },
    pasos: ['En **Niños** → **Fotos** → **Álbum**, elige al niño en **Ver fotos de**.', 'Toca una foto para verla grande.', 'Ahí puedes **Cambiar quién sale**, **Abrir en Drive** o **Borrar**.'],
    ir: 'ninos'
  },
  {
    id: 'clave',
    titulo: 'La clave para entrar',
    claves: { clave: 3, contrasena: 3, password: 3, entrar: 2, olvide: 2, acceso: 2, sesion: 2, bloqueado: 2 },
    pasos: ['Niños, Horario e Inicio piden la clave de la Hacienda.', 'El aparato la recuerda 30 días.', 'Si no la sabes o no funciona, pídela a Sam. Después de varios intentos fallidos se bloquea 15 minutos.'],
    ir: 'inicio'
  },
  {
    id: 'celular',
    titulo: 'Tener la app en el celular',
    claves: { celular: 3, telefono: 3, instalar: 3, iphone: 3, android: 3, icono: 2, app: 1, movil: 3 },
    pasos: ['Abre la página de la app en el celular.', 'En Android (Chrome): toca ⋮ y luego **Instalar app**.', 'En iPhone (Safari): toca Compartir y luego **Agregar a inicio**.', 'Queda con su ícono como cualquier app.'],
    ir: 'inicio'
  },
  {
    id: 'inicio',
    titulo: 'Qué muestra la pantalla de Inicio',
    claves: { inicio: 3, semana: 1, resumen: 2, pendiente: 2, pendientes: 2, toca: 1, principal: 2 },
    pasos: ['**Inicio** muestra lo de esta semana: quién trabaja el fin de semana, los acuerdos, qué casas necesitan cambio de casa, cumpleaños y si falta el horario del próximo mes.', 'Los botones te llevan directo a hacer cada cosa.'],
    ir: 'inicio'
  },
  {
    id: 'copiaSeguridad',
    titulo: 'Copia de seguridad',
    claves: { copia: 2, seguridad: 3, respaldo: 3, backup: 3, recuperar: 3, perdi: 2, borre: 2 },
    pasos: ['Cada domingo Google guarda solo una copia de toda la hoja en la carpeta **Copias de Oficina Hacienda** de Drive (quedan las 8 últimas).', 'En **Inicio** sale si la copia está al día.', 'Si algo se borró, pídele a Sam que lo recupere de la copia.'],
    ir: 'inicio'
  }
];

export const EJEMPLOS = ['¿Quién trabaja este fin de semana?', '¿Quién está de on call esta semana?', '¿Qué días trabaja Myriam este mes?', '¿Cuándo cumple Mikaela?', '¿Qué talla de zapatos tiene Ana?', '¿Cómo armo el horario?', '¿Cómo hago los acuerdos?', '¿Qué casas necesitan cambio de casa?'];

const EN = {
  armar: { titulo: 'Build the monthly schedule', pasos: ['Open the **Horario** (Schedule) tab.', 'Use the ‹ › arrows to pick the month.', 'First (step 1) tap **Poner vacaciones y feriados** (Add vacations and holidays) if there are any that month, so the app won’t place anyone on those days.', 'Tap **Armar el horario con las reglas** (Build with the rules). The app places everyone by the rules (weekends, days off and on call).', 'Check what is marked in green and change what you need by tapping each house.', 'At the end tap **Guardar horario** (Save schedule) at the bottom.'] },
  copiar: { titulo: "Copy last month's schedule", pasos: ['Open **Horario** and go to the new month with the ‹ › arrows.', 'Tap **Copiar el de** (Copy last month). It copies week by week and skips holidays.', 'Change what is different and tap **Guardar horario** (Save schedule).'] },
  cambiar: { titulo: 'Change who works on a day', pasos: ['In **Horario**, tap the house on that day (in **Semana** week view or **Mes** month view).', 'Check or uncheck people. Only people who work in that house show up.', 'On weekends, leave **Poner lo mismo todo el fin de semana** (Same for the whole weekend) checked so you don’t repeat it each day.', 'Tap **Listo** (Done) and then **Guardar horario** (or **Actualizar horario** if it was already saved).'] },
  guardar: { titulo: 'Save or update the schedule', pasos: ['When you change something in **Horario**, a bar appears at the bottom.', 'Tap **Guardar horario** (Save) or **Actualizar horario** (Update) if it was already saved. That way everyone sees it.', 'If you made a mistake, tap **Deshacer cambios** (Undo changes) to go back to the saved version.'] },
  descargar: { titulo: 'Download or print the schedule', pasos: ['In **Horario**, tap **Descargar** (Download).', 'Choose **PDF para imprimir** (the whole month on one page, with colors) or **Excel** (the usual format).', 'That same PDF or Excel works for Acuerdos and Cambio de casa.'] },
  borrar: { titulo: 'Delete the schedule and start over', pasos: ['In **Horario**, tap **Borrar** (Delete) at the top.', 'Tap **Sí, borrar** (Yes, delete) to confirm. The start screen comes back with **Armar con las reglas**, **Copiar el anterior** or **Empezar en blanco** (blank).', 'Vacations and holidays you already entered are kept.'] },
  control: { titulo: 'Staff control (absence report)', pasos: ['Open the **Control de personal** (Staff control) tab (it asks for the password, the same one as Niños).', 'Pick the **year** and the **period** (one month or the whole year).', 'The table shows, per person, how many vacation days they took and how many days they missed for a medical emergency, family reason, leave or other reason. Days are counted in full, weekends included.', 'Tap a person’s name to see the dates, reason and note; you can also remove an entry that was entered wrong.', 'To record something that already happened, use **Anotar una ausencia** (Record an absence) at the bottom. Absences added in Horario show up here by themselves.', 'Tap **Descargar para Excel** (Download for Excel) or **Imprimir** (Print).'] },
  vacaciones: { titulo: 'Add vacations, absences or holidays', pasos: ['If the month is still empty, add them in step 1 with **Poner ausencias y feriados** (Add absences and holidays), before building. If it is already built, tap **Ausencias y feriados** at the top, next to the month.', 'Pick the person, the **reason** (vacation, medical, family, leave or other), the first and last date, and tap **Agregar** (Add). If it lasts several months (maternity, for example) enter the real last date: they stay out of the schedule for all those months.', 'Holiday: type the day and tap **Marcar** (Mark). It saves right away.', 'To remove one, tap **Quitar** (Remove) next to it. If there are several in the month, use **Quitar todas las ausencias** (Remove all absences).', 'The app won’t place that person on those days. The printed schedule only says “Vacación” or “Ausente”, never the reason. The reason is visible in **Control de personal**.'] },
  notas: { titulo: 'Add notes or remarks', pasos: ['Note for a day: in **Horario**, **Mes** (month) view, tap the pencil ✏️ on that day and type.', 'Remarks for the month: tap **Agregar observaciones del mes** (below the calendar).', 'Tap **Guardar horario**. Notes show up in the PDF and Excel.'] },
  trabajadores: { titulo: 'Add or remove workers', pasos: ['In **Horario**, tap **Personal y reglas** (Staff and rules).', 'To add: type the name at the bottom, choose **Padre o madre de casa** (house parent), **Auxiliar** (aide) or **Auxiliar solo de fin de semana** (weekend aide), and tap **Agregar** (Add). Then mark their houses and day off.', 'To remove: tap **Quitar** (Remove) on that person. They move to "Ya no trabajan" (no longer working) and can be put back.', 'Changes flow to Acuerdos and Cambio de casa automatically. In Acuerdos → Personal you only add last names and ID number.'] },
  casasTrabajador: { titulo: 'Choose which houses each person works in', pasos: ['In **Horario** → **Personal y reglas** → **Trabajadores** (Workers).', 'For each person, tap the houses where they work (selected ones are colored).', 'Choose their day off, preferred house, and whether they do on call.', 'If someone works differently from the rest, use **Fines de semana al mes** (Weekends per month: e.g. 1, none or all) and **Días entre semana al mes** (Weekdays per month: all their days or a number like 4; the app spreads them over the month). For example, someone who works weekdays and only 1 weekend, or the other way around.', 'Tap **Listo** (Done). It is used the next time you build the schedule.'] },
  reglas: { titulo: 'Change the schedule rules', pasos: ['In **Horario** → **Personal y reglas** → **Reglas** (Rules) tab.', 'There you set how many weekends house parents and aides work, how many aides each house needs, and whether someone can do an extra weekend when people are short.', 'Tap **Listo** (Done).'] },
  verde: { titulo: 'What the green marks mean', pasos: ['Green is not an error: it is something to check.', 'For example a house missing someone, a person in two places, or someone doing an extra weekend.', 'Tap it to pick someone, or leave it if it’s fine.'] },
  acuerdos: { titulo: 'Make the weekend agreements', pasos: ['Open the **Acuerdos** (Agreements) tab.', 'In **Horario del mes** upload the PDF or Excel, or tap **usa el horario guardado en la pestaña Horario** (use the saved schedule).', 'In **Acuerdos del mes pasado** upload last month’s Word file (used as the template).', 'Fixed staff are added automatically. Tap a name to add or remove extras.', 'Tap **Descargar Word** (Download Word). For accounting there is **Excel de pagos** (Payments Excel).'] },
  cedulas: { titulo: "Add a worker's last name and ID number", pasos: ['In **Acuerdos**, open **Personal** (at the bottom).', 'In that person’s row type **Apellidos y nombres** (full name) and **Cédula** (ID number).', 'It saves by itself. If you entered the password, it’s saved in Google for every computer.'] },
  pagos: { titulo: 'Payments Excel for accounting', pasos: ['In **Acuerdos**, with the schedule and Word uploaded, tap **Excel de pagos** (Payments Excel).', 'You get a summary per person and the detail of each weekend.'] },
  cambiocasa: { titulo: 'Make the house change sheets', pasos: ['Open the **Cambio de casa** (House change) tab.', 'Upload the schedule (or use the one saved in Horario).', 'Choose the **weekend**. Houses without their house parents are already checked.', 'Tap **Imprimir** (Print) or **Descargar PDF**.'] },
  menu: { titulo: "Fix the nutritionist's menu", pasos: ['Open the **Menú** tab.', 'In **Menú de la quincena** upload the Excel as the kitchen fills it.', 'The app removes amounts, adds the drink to dinners and fixes spelling.', 'Tap **Descargar Excel**. If a word comes out wrong, add it in **Palabras que corrige** (Words it fixes).'] },
  ninoNuevo: { titulo: 'Add or edit a child', pasos: ['Open the **Niños** (Kids) tab (with the password).', 'Tap **Agregar niño** (Add child), or tap a child in the list to edit.', 'Fill in name, house, birthday, sizes and the rest. You can add a photo.', 'Tap **Guardar** (Save).'] },
  tallas: { titulo: 'See or print sizes', pasos: ['In **Niños**, tap **Tallas** (Sizes).', 'Choose **Ecuador**, **Americana** (US) or **Ambas** (Both).', 'To change a child’s size, tap their name and edit **Tallas**.'] },
  regalos: { titulo: 'Gift sheets, list, directory and birthdays', pasos: ['In **Niños**, tap **Documentos** (Documents).', 'Choose **Lista** (List), **Hojas de regalos** (Gift sheets), **Directorio** (Directory) or **Cumpleaños** (Birthdays).', 'For sizes choose Ecuador, Americana (US) or Ambas (Both) and download the PDF.'] },
  equipos: { titulo: 'Split the kids into teams', pasos: ['In **Niños**, tap **Equipos** (Teams).', 'Choose who participates and how many teams, or split by **Niñas y niños** (girls and boys), **Edad** (age) or **Casa** (house).', 'You can balance boys and girls and separate siblings. Then download or print the groups.'] },
  fotosSubir: { titulo: "Upload the kids' photos", pasos: ['In **Niños**, tap **Fotos** → **Subir fotos** (Upload photos) and choose the photos (many at once).', 'The app recognizes the kids. Check the names: the ones with “¿Name?” it isn’t sure about. Tap a face to fix it or **+ Agregar niño** (add child).', 'Tap **Guardar en Drive** (Save to Drive). Each photo goes to each child’s folder (House → Child).'] },
  fotosZip: { titulo: 'Upload lots of photos or a zip', pasos: ['In **Niños** → **Fotos** → **Subir fotos**, tap **Subir un zip** (upload a zip) or **Subir una carpeta** (upload a folder).', 'The app goes through the photos one by one and **saves to Drive by itself** the ones it recognizes for sure. You see the count at the top.', 'You can **Pausar** (pause) and **Seguir** (continue). If the page closes, pick the same zip again: it continues where it left off and doesn’t repeat photos.', 'At the end check only the ones it set aside (“No está segura” and “No reconoció a nadie”) and tap **Guardar en Drive**.'] },
  fotosVer: { titulo: "See or fix a child's photos", pasos: ['In **Niños** → **Fotos** → **Álbum**, pick the child in **Ver fotos de** (See photos of).', 'Tap a photo to see it big.', 'There you can **Cambiar quién sale** (change who is in it), **Abrir en Drive** (open in Drive) or **Borrar** (delete).'] },
  clave: { titulo: 'The password', pasos: ['Niños, Horario and Inicio ask for the Hacienda password.', 'The device remembers it for 30 days.', 'If you don’t know it or it doesn’t work, ask Sam. After several wrong tries it locks for 15 minutes.'] },
  celular: { titulo: 'Get the app on your phone', pasos: ['Open the app’s page on your phone.', 'Android (Chrome): tap ⋮ and then **Install app**.', 'iPhone (Safari): tap Share and then **Add to Home Screen**.', 'It gets its own icon like any app.'] },
  inicio: { titulo: 'What the Home screen shows', pasos: ['**Inicio** (Home) shows this week: who works the weekend, the agreements, which houses need a house change, birthdays, and whether next month’s schedule is missing.', 'The buttons take you straight to each task.'] },
  copiaSeguridad: { titulo: 'Backup', pasos: ['Every Sunday Google saves a full copy of the spreadsheet in the **Copias de Oficina Hacienda** folder in Drive (the last 8 are kept).', '**Inicio** (Home) shows whether the backup is up to date.', 'If something was deleted, ask Sam to restore it from the copy.'] }
};
for (const a of GUIA) a.en = EN[a.id];

export const EJEMPLOS_EN = ['Who works this weekend?', 'Who is on call this week?', 'What days does Myriam work this month?', "When is Mikaela's birthday?", "What's Ana's shoe size?", 'How do I build the schedule?', 'How do I make the agreements?', 'Which houses need a house change?'];
