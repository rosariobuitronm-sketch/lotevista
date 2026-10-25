# ADR 0007: Modelo de datos

## Estado

Aceptado

## Contexto

No hay `Design.md`, así que el modelo se deriva solo del PRD. El PRD exige: catálogo de 3 proyectos con datos de lote y financiamiento, modelo 3D con atribución de licencia, FAQ de respaldo por proyecto, asesores con login, y leads con historial (un celular = una persona; varios proyectos y preguntas; canal de origen; uso de 3D/RA; fecha del último contacto; consentimiento; horario preferido opcional; sin DNI). El asistente debe responder solo con datos guardados en la base de datos. Se necesita además un contador temporal por IP (ADR 0005).

Decisión delegada por el Product Owner en lo estructural; los campos del lead ya fueron definidos por él en el PRD.

## Decisión

Nueve tablas en PostgreSQL (Neon), creadas con `db/schema.sql`:

- `proyectos`: datos públicos del proyecto, textos de financiamiento y entrega, imagen de respaldo y datos del modelo 3D (archivo, autor, licencia, fuente).
- `lotes`: lotes referenciales de un proyecto (área, frente, fondo, precio); sin estado de venta ni disponibilidad en tiempo real.
- `faq`: preguntas y respuestas de respaldo por proyecto, con palabras clave.
- `asesores`: usuario y hash de contraseña.
- `leads`: una fila por persona, identificada por el celular normalizado (único). Guarda nombre, correo, horario preferido (opcional), consentimiento (aceptado, fecha y versión del texto), fecha de creación y fecha del último contacto.
- `lead_intereses`: una fila por cada proyecto por el que el lead mostró interés: canal de origen, si usó 3D, si usó RA y fecha.
- `lead_preguntas`: preguntas hechas al asistente, con su respuesta, si el asistente sabía y fecha, ligadas al lead y al proyecto.
- `intentos_login`: usuario, intentos fallidos seguidos y fecha hasta la que está bloqueado (ADR 0004); se reinicia con un login correcto.
- `limite_ip`: hash de IP, inicio de ventana y contador; se borra pasadas 24 horas (ADR 0005).

Reglas de datos: el celular se guarda normalizado (solo dígitos, formato peruano de 9 dígitos); no existe ningún campo de DNI; nada del historial se borra al actualizar un lead; al actualizar solo se cambian la fecha del último contacto, el horario (si se envía uno nuevo) y se agregan filas.

## Alternativas consideradas

- **Una sola tabla `leads` con JSON para proyectos y preguntas** — más rápido de crear, pero el panel no podría filtrar leads por proyecto con consultas simples ni se podrían probar bien las reglas de historial.
- **Un lead nuevo por cada formulario** — más simple, pero llena el panel de duplicados; contradice la decisión del Product Owner de que el mismo celular es la misma persona.

## Consecuencias

- Filtrar leads por proyecto, canal o uso de 3D/RA es una consulta simple, y el historial queda completo.
- Un celular ajeno escrito por error o con mala intención se fusiona con el lead de otra persona: aceptable para el MVP, anotado como riesgo.
- Sin ORM, los cambios de estructura se aplican ejecutando SQL a mano (ADR 0002).
- La fecha del consentimiento y la versión del texto se guardan para poder demostrarlo, pero un producto real necesitaría además política de retención y de borrado de leads.
