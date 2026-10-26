# Backlog: LoteVista

> Generado con la skill `generar-backlog` a partir de `PRD.md`, `CLAUDE.md`, `TECH-DESIGN.md` y `adrs/`. Todavía no se ha construido nada.
> Fecha límite: **lunes 26 de octubre de 2026**. Todos los datos son ficticios.

| # | Item | Alcance | Depende de | Contexto extra requerido |
|---|---|---|---|---|
| 1a | Proyecto Next.js, GitHub y primer despliegue | Next.js + TypeScript + Tailwind + Vitest, repositorio en GitHub y primera URL pública en Vercel | — | — |
| 1b | Conexión a Neon y ruta de salud | Conectar a Neon (`lotevivo`), ruta `/api/salud` y rama de pruebas | 1a | — |
| 2 | Esquema de BD y datos demo | `db/schema.sql` con 9 tablas, `db/seed.sql` con 3 proyectos, lotes y FAQ, y script de usuarios del asesor | 1b | — |
| 3 | Modelos 3D libres y créditos | Modelos `.glb` CC0/CC-BY livianos, cargados en `proyectos` y citados en el README | 1a | — |
| 4 | Catálogo | Página con los 3 proyectos leídos de la BD | 2 | — |
| 5 | Ficha del proyecto | Datos, lotes, financiamiento como texto y página amable si el proyecto no existe | 4 | — |
| 6 | Visor 3D + etiqueta "Imagen referencial" | `<model-viewer>`, componente reutilizable de la etiqueta y respaldo con imagen | 3, 5 | Texto de la etiqueta (borrador abajo, **pendiente de validación legal**) |
| 7 | Validación del lead | Reglas de nombre, celular de 9 dígitos, correo y consentimiento obligatorio; sin DNI | 1a | Texto de consentimiento (borrador abajo, **pendiente de validación legal**) |
| 8 | Guardar y actualizar leads | Mismo celular actualiza el lead y suma historial; doble envío no duplica; una transacción | 2, 7 | Texto de consentimiento (ídem) |
| 9 | Formulario de interés | Formulario en la ficha y `POST /api/leads` | 5, 8 | Texto de consentimiento (ídem) |
| 10 | Login del asesor | Hash bcrypt, cookie firmada de 8 horas, `/panel` protegido | 2 | — |
| 11 | Bloqueo por intentos fallidos | 5 fallos seguidos bloquean el login 15 minutos | 10 | — |
| 12 | Panel de leads | Lista por proyecto con historial, estado vacío y texto escapado | 8, 10 | — |
| 13 | RA "Ver en tu espacio" | Botón de RA, aviso en equipos sin RA y video corto | 6 | — |
| 14 | Canal de origen y uso de 3D/RA | Pasar el canal y las marcas de uso del navegador al lead | 9, 13 | — |
| 15 | QR por proyecto | QR generado en el servidor que abre la ficha con canal `qr_sala` | 5 | — |
| 16 | Asistente: lógica acotada a los datos | Instrucción con datos del proyecto, formato `{respuesta, sabe}` y derivación (Gemini simulado) | 2 | — |
| 17 | Asistente: respaldo FAQ | Falla, cuota agotada o más de 8 s caen al FAQ y luego a derivación | 16 | — |
| 18 | Asistente: límites | 20 preguntas por sesión y 500 por IP en 24 h (hash) | 2 | — |
| 19 | Ruta `/api/asistente` | Une 16, 17 y 18; verifica el tiempo máximo de funciones en Vercel | 16, 17, 18 | — |
| 20 | Ventana del asistente | Chat en la ficha con aviso de no compartir datos, carga e historial en `sessionStorage` | 19, 6 | — |
| 21 | Preguntas del chat en el lead y el panel | Guardar el chat al enviar el formulario y mostrarlo en el panel | 20, 9, 12 | — |
| 22 | Modo holograma | Pantalla negra con 4 vistas del modelo y canal `holograma` | 6 | — |
| 23 | Modo Sala (opcional) | Pantalla completa con 3D girando y QR | 6, 15 | — |
| 24 | Revisión de seguridad y secretos | Buscar secretos, probar el panel sin sesión, comprobar que no hay DNI | todos | — |
| 25 | Ensayo de demo, README y video RA | Suite completa, flujo de punta a punta y criterios de la demo | todos | — |

**Orden de recorte si el tiempo aprieta:** primero el #23 (Modo Sala), luego el #22 (holograma). El asistente (#16 a #21) se protege.

**Definición de terminado (todos los ítems):** criterios cumplidos, pruebas en verde mostradas con su resultado real, cambio subido a GitHub y desplegado en Vercel, sin secretos en el código. Donde dice TDD, la prueba se escribe primero y se ve fallar (rojo → verde → mejorar). Lo visual se verifica a mano.

## Textos borrador (datos ficticios, pendientes de validación legal)

> Para la demo se usan estos textos. **Antes de un uso real deben ser validados por un abogado** (Ley 29733 e INDECOPI).

**Consentimiento (Ley 29733):**
"Autorizo a Inmobiliaria Demo S.A.C. a tratar mis datos personales (nombre, celular y correo) con la finalidad de contactarme y brindarme información sobre sus proyectos inmobiliarios, conforme a la Ley N.° 29733, Ley de Protección de Datos Personales, y su reglamento. Mis datos se conservarán como máximo 12 meses. Puedo ejercer mis derechos de acceso, rectificación, cancelación y oposición escribiendo a datospersonales@inmobiliariademo.pe."

**Etiqueta de imagen referencial (INDECOPI):**
"Imagen referencial. La vivienda mostrada es solo una ilustración; la empresa vende únicamente el lote y la construcción no forma parte de la oferta."

Nota de implementación: la etiqueta visible sobre la casa lleva siempre el texto corto **"Imagen referencial"** (así lo exige `CLAUDE.md`); la frase completa va como texto de apoyo junto a ella. La versión del texto de consentimiento se guarda en `consentimiento_version` del lead.

---

## Ítems

### 1a — Proyecto Next.js, GitHub y primer despliegue ✅

**Pruebas:** Manual · **ADR:** 0001, 0002
- [x] Existe un proyecto Next.js (App Router) con TypeScript y Tailwind y una página de inicio que dice "LoteVista".
- [x] `npm test` (Vitest) corre y muestra al menos una prueba en verde.
- [x] El código está en un repositorio de GitHub; `.env.local` está en `.gitignore`.
- [x] La aplicación está desplegada en Vercel (conectada al repositorio) y la URL pública abre la página de inicio.
- [x] El repositorio no contiene ningún secreto.

### 1b — Conexión a Neon y ruta de salud ✅

**Pruebas:** Manual · **Depende de:** 1a · **ADR:** 0002
- [x] `DATABASE_URL` está en `.env.local` y en las variables de entorno de Vercel.
- [x] `/api/salud` responde que la base está accesible, sin mostrar datos secretos, tanto en local como en la URL pública.
- [x] Existe una rama de Neon exclusiva para pruebas, distinta de la de la demo.

### 2 — Esquema de BD y datos demo ✅

**Pruebas:** TDD (rama de pruebas) · **Depende de:** 1b · **ADR:** 0007
- [x] `db/schema.sql` crea las 9 tablas del ADR 0007 y se puede ejecutar dos veces sin error.
- [x] No existe ninguna columna de DNI; `canal_origen` solo admite `web`, `qr_sala` o `holograma`.
- [x] `db/seed.sql` carga 3 proyectos ficticios con ubicación, precio desde, metraje, imagen, financiamiento y entrega, al menos 2 lotes y 5 preguntas de FAQ por proyecto.
- [x] Un script crea los usuarios de demo leyendo las contraseñas de variables de entorno; se guardan con hash.

### 3 — Modelos 3D libres y créditos ⚠️ parcial: falta verificación manual

**Pruebas:** Manual · **Depende de:** 1a
- [x] Hay al menos 1 modelo `.glb` (idealmente 3) con licencia CC0 o CC-BY, de menos de 5 MB cada uno (se anota el peso).
- [x] El `README.md` lista nombre, autor, licencia y enlace de cada modelo.
- [x] Autor, licencia, fuente y archivo quedan cargados en `proyectos`.
- [ ] El Product Owner aprueba visualmente los modelos.

> **Nota:** El criterio de aprobación visual de los modelos queda para ti: los elegiste por la tabla y las vistas previas, pero aún no los has visto girar en la web (se verán en la ficha, ítem 6).

### 4 — Catálogo ✅

**Pruebas:** TDD · **Depende de:** 2
- [x] Muestra los 3 proyectos con nombre, ubicación, precio desde, metraje e imagen, leídos de la BD.
- [x] Cada tarjeta lleva a su ficha.
- [x] Si la BD no responde, hay un mensaje amable en español, sin error técnico.
- [x] Se ve bien en celular, sin desplazamiento horizontal.

### 5 — Ficha del proyecto ✅

**Pruebas:** TDD · **Depende de:** 4
- [x] `/proyectos/[slug]` muestra datos del proyecto, lotes referenciales (área, frente, fondo, precio), financiamiento y entrega como texto.
- [x] Un `slug` inexistente muestra una página amable con enlace al catálogo.
- [x] No hay simulador de cuotas, plano ni estado de venta.
- [x] La ficha carga en menos de 3 s con 4G (se mide ya desplegada).


> **Nota:** Medido en https://lotevista.vercel.app con Edge, sin caché y 4G simulado (10 cargas): carga p95 = 0.73 s, LCP p95 = 1.2 s. Con 4G lento (1.6 Mbps): p95 = 1.6 s. Cumple el límite de 3 s. **Requisito adicional posterior:** la ficha ahora incluye un plano de lotización referencial (22 lotes con estados de demostración); por eso el criterio «sin plano ni estado de venta» fue reemplazado por ese pedido. Sigue sin haber simulador de cuotas.

### 6 — Visor 3D + etiqueta "Imagen referencial" ✅

**Pruebas:** TDD (componente) + Manual · **Depende de:** 3, 5 · **ADR:** 0002
- [x] La casa se muestra en `<model-viewer>` y se gira y acerca con mouse y dedo.
- [x] La etiqueta "Imagen referencial" es visible junto a la casa y legible en celular, con el texto de apoyo del borrador.
- [x] Si el modelo falla o tarda, se muestra la imagen del proyecto y la etiqueta sigue visible (se prueba bloqueando el `.glb`).
- [x] La etiqueta es un componente reutilizable; una prueba confirma que siempre incluye el texto, también con la imagen de respaldo.

> **Nota:** Verificado en Edge: el modelo carga sin errores y, bloqueando el .glb, aparece la imagen con la etiqueta. El giro y zoom con dedo en un celular real queda para tu prueba manual.

### 7 — Validación del lead ✅

**Pruebas:** TDD · **Depende de:** 1a · **ADR:** 0003, 0007
- [x] Nombre obligatorio y de largo limitado; correo válido; celular peruano de 9 dígitos normalizado a solo dígitos.
- [x] Sin consentimiento aceptado la validación falla (0 excepciones).
- [x] El horario preferido es opcional.
- [x] Campos de más (por ejemplo `dni`) se rechazan.
- [x] Se limitan la cantidad y el tamaño de las preguntas que acompañan al lead.

### 8 — Guardar y actualizar leads ✅

**Pruebas:** TDD (rama de pruebas) · **Depende de:** 2, 7 · **ADR:** 0006, 0007
- [x] Un lead nuevo se guarda con sus datos, consentimiento (fecha y versión), interés en el proyecto y fechas de creación y último contacto.
- [x] El mismo celular no crea otro lead: agrega interés y preguntas, actualiza el último contacto y no borra nada.
- [x] Dos envíos del mismo lead y proyecto en menos de 10 minutos se fusionan.
- [x] Todo ocurre en una transacción; sin consentimiento no se guarda nada.
- [x] Las pruebas usan solo la rama de pruebas y limpian sus datos.

### 9 — Formulario de interés ✅

**Pruebas:** TDD (`POST /api/leads`) + Manual · **Depende de:** 5, 8 · **ADR:** 0003
- [x] Formulario con nombre, celular, correo, horario (opcional) y casilla con el texto de consentimiento del borrador.
- [x] No se envía sin consentimiento; los errores salen en español junto a cada campo.
- [x] El botón se desactiva tras el primer clic.
- [x] Éxito: mensaje de agradecimiento; fallo del servidor: mensaje amable con opción de reintentar.
- [x] La ruta responde con la forma `{ ok, datos | error }` y no devuelve datos de otros leads.
- [x] No se pide DNI.

> **Nota:** Verificado en Edge de punta a punta (contra la rama de pruebas): enviar vacío muestra los errores, el doble clic envía un solo POST y el lead queda guardado con consentimiento, horario y canal web.

### 10 — Login del asesor ✅

**Pruebas:** TDD · **Depende de:** 2 · **ADR:** 0004
- [x] `/panel/login` inicia sesión con credenciales correctas y lleva a `/panel`.
- [x] La contraseña se compara contra el hash bcrypt y nunca se registra en texto plano.
- [x] Cookie `httpOnly`, `secure`, `sameSite=lax`, firmada con `AUTH_SECRET`, caduca en 8 horas.
- [x] Sin sesión, `/panel` redirige al login y `/api/panel/*` responde 401.
- [x] Credenciales erróneas muestran "Usuario o contraseña incorrectos"; el cierre de sesión borra la cookie.

### 11 — Bloqueo por intentos fallidos ✅

**Pruebas:** TDD · **Depende de:** 10 · **ADR:** 0004
- [x] 5 fallos seguidos bloquean el login 15 minutos, incluso con la contraseña correcta.
- [x] Pasado el tiempo vuelve a funcionar; un login correcto reinicia el contador.
- [x] El mensaje de espera no revela si el usuario existe; los usuarios inexistentes también cuentan.
- [x] Las pruebas simulan el tiempo sin esperar 15 minutos reales.

### 12 — Panel de leads ✅

**Pruebas:** TDD (`GET /api/panel/leads`) + Manual · **Depende de:** 8, 10 · **ADR:** 0003, 0007
- [x] Lista leads con nombre, celular, correo, horario, último contacto y proyectos de interés; filtro por proyecto.
- [x] Cada lead muestra su historial (proyecto, canal, uso de 3D/RA, fecha).
- [x] Sin leads, estado vacío en español.
- [x] Los textos del cliente se muestran como texto, nunca como HTML (prueba con un nombre con etiquetas).
- [x] Sin sesión no se ve ningún dato personal por ninguna ruta.

> **Nota:** Verificado en Edge de punta a punta (contra la rama de pruebas): un lead enviado desde el formulario público aparece en el panel con su historial.

### 13 — RA "Ver en tu espacio" ⚠️ parcial: falta verificación manual

**Pruebas:** Manual · **Depende de:** 6
- [ ] El botón activa la RA en un celular compatible con ARCore o ARKit.
- [x] En laptop o equipo sin RA se mantiene el 3D con un aviso claro en español.
- [x] La etiqueta "Imagen referencial" sigue visible (o se anota la limitación del modo RA del sistema).
- [ ] Se probó en al menos 1 celular compatible prestado y hay un video corto en el repositorio.

> **Nota:** Verificado en Edge de escritorio: sin RA el 3D se mantiene con el aviso en español y la etiqueta Imagen referencial va dentro del visor (así se ve también en la RA de Chrome/WebXR). **Falta, y no puedo hacerlo yo:** probar el botón en un celular compatible (Android con ARCore o iPhone) y grabar el video corto. **Limitación conocida:** en Scene Viewer (Android) y Quick Look (iPhone) el sistema dibuja la RA en su propia pantalla y no permite superponer la etiqueta; por eso se recuerda justo antes de entrar.

### 14 — Canal de origen y uso de 3D/RA ✅

**Pruebas:** TDD · **Depende de:** 9, 13 · **ADR:** 0006
- [x] El canal se toma del parámetro de la URL y se guarda en una cookie firmada; si falta o es inválido, es `web`.
- [x] El navegador recuerda en memoria el uso de 3D/RA y no envía nada al servidor antes del formulario.
- [x] Al enviar, el lead guarda canal y marcas "usó 3D" y "usó RA".

> **Nota:** Verificado en Edge: ?canal=qr_sala fija una cookie firmada, arrastrar el modelo guarda uso3d solo en sessionStorage (no hubo ningún POST antes del formulario) y el lead quedó con canal qr_sala y uso_3d verdadero.

### 15 — QR por proyecto ⚠️ parcial: falta verificación manual

**Pruebas:** TDD + Manual · **Depende de:** 5
- [x] Cada proyecto tiene un QR generado en el servidor que abre su ficha con canal `qr_sala`.
- [ ] El QR se puede ver en pantalla y descargar o imprimir; se probó con un celular real.
- [x] Un QR de un proyecto inexistente lleva a la página amable del ítem 5.

> **Nota:** Verificado por programa: el QR se decodifica a https://…/proyectos/<slug>?canal=qr_sala y la imagen carga en la ficha. **Falta escanearlo con un celular real** (criterio 2).

### 16 — Asistente: lógica acotada a los datos ✅

**Pruebas:** TDD (Gemini simulado) · **Depende de:** 2 · **ADR:** 0005
- [x] La instrucción a Gemini usa solo los datos del proyecto: sin negociar precios ni descuentos, sin agendar y marcando "no sé" cuando falte información.
- [x] La respuesta `{ respuesta, sabe }` se valida; formato inválido o `sabe` falso dan la derivación a un asesor.
- [x] Con el simulado: 8 de 10 preguntas sobre datos reciben la respuesta esperada y 5 de 5 preguntas fuera de datos derivan sin inventar.
- [x] `GEMINI_API_KEY` y `GEMINI_MODEL` solo se leen en el servidor; las pruebas nunca usan la clave real.

> **Nota:** El criterio 4 (la clave solo se lee en el servidor) se cierra con la ruta del ítem 19.

> **Nota:** Prueba de seguridad automática: GEMINI_API_KEY y GEMINI_MODEL solo se leen en src/app/api/asistente/route.ts y ningún componente de navegador menciona Gemini.

### 17 — Asistente: respaldo FAQ ✅

**Pruebas:** TDD · **Depende de:** 16 · **ADR:** 0005
- [x] Si Gemini falla, agota la cuota o tarda más de 8 s, se busca en el FAQ del proyecto por palabras clave.
- [x] Con coincidencia responde el FAQ; sin ella, deriva a un asesor.
- [x] El cliente nunca ve un error técnico (se prueba cada tipo de falla) y una prueba confirma el corte a los 8 s.

> **Nota:** Las pruebas cubren cuota agotada, servicio caído, sin conexión, falta de clave, respuesta bloqueada y error genérico, más el corte exacto a los 8 s con temporizadores simulados.

### 18 — Asistente: límites ✅

**Pruebas:** TDD · **Depende de:** 2 · **ADR:** 0005
- [x] Una cookie firmada cuenta las preguntas: tras 20 por sesión se avisa del límite y se sugiere el formulario.
- [x] Límite de 500 por IP en 24 h con HMAC-SHA256 y `IP_HASH_SECRET`; no se guarda la IP real ni el contenido.
- [x] Las filas de `limite_ip` con más de 24 h se borran en cada escritura; los límites son constantes configurables.
- [x] Las pruebas confirman el bloqueo en la pregunta 21 de sesión y en la 501 de IP.

> **Nota:** El bloqueo se prueba en la pregunta 21 de sesión y en la 501 de IP (con filas precargadas en la rama de pruebas, sin repetir 500 llamadas).

### 19 — Ruta `/api/asistente` ⚠️ parcial: falta verificación manual

**Pruebas:** TDD · **Depende de:** 16, 17, 18 · **ADR:** 0003, 0005
- [x] Valida la entrada y limita el largo de la pregunta; aplica límites, lógica y respaldo; responde `{ ok, datos | error }`.
- [x] No guarda preguntas ni respuestas en la BD.
- [ ] Se verifica en Vercel que el tiempo máximo de las funciones alcanza para los 8 s; si no, se ajusta y se anota.
- [x] La clave de Gemini no aparece en respuestas ni en el código del navegador.

> **Nota:** El criterio 3 queda por confirmar ya desplegado en Vercel: la ruta declara maxDuration = 30 y el build lo acepta.

### 20 — Ventana del asistente ✅

**Pruebas:** Manual · **Depende de:** 19, 6
- [x] Chat en la ficha con el aviso fijo: "No compartas datos personales en el chat. Si deseas que te contactemos, usa el formulario."
- [x] Indicador de carga; al derivar o llegar al límite, el mensaje invita al formulario.
- [x] El historial vive solo en el navegador (estado y `sessionStorage`) y sobrevive a recargar la pestaña.
- [x] Se usa bien en celular.

> **Nota:** Verificado en Edge en ancho de celular (390 px) con la IA real: sugerencias, pregunta con Enter, indicador de carga, derivación con enlace al formulario, historial que sobrevive a recargar y sin desborde horizontal. Falta usarlo en un celular físico.

### 21 — Preguntas del chat en el lead y el panel ✅

**Pruebas:** TDD · **Depende de:** 20, 9, 12 · **ADR:** 0006
- [x] Al enviar el formulario con consentimiento, el chat se guarda en `lead_preguntas` con proyecto, respuesta y si el asistente sabía.
- [x] Sin consentimiento no se guarda ninguna pregunta; sin chat, el lead se guarda igual.
- [x] El panel muestra las preguntas como texto escapado; se limitan cantidad y tamaño.

> **Nota:** Pruebas de integración contra la rama de pruebas y verificación en Edge: dos preguntas del chat viajaron con el formulario y quedaron en lead_preguntas con su respuesta y si el asistente sabía.

### 22 — Modo holograma

**Pruebas:** Manual · **Depende de:** 6
- [ ] `/holograma/[slug]` muestra pantalla negra con el modelo 4 veces (arriba, abajo, izquierda, derecha) girando.
- [ ] Las 4 vistas llevan la etiqueta "Imagen referencial".
- [ ] Funciona a pantalla completa en celular o tablet; un lead desde esta página queda con canal `holograma`.
- [ ] Se probó sobre la pirámide casera o se anota que no se pudo.

### 23 — Modo Sala (opcional)

**Pruebas:** Manual · **Depende de:** 6, 15
- [ ] `/sala/[slug]` muestra el modelo girando en pantalla completa y un QR hacia la ficha con canal `qr_sala`.
- [ ] Lleva la etiqueta "Imagen referencial". Se recorta primero si el tiempo aprieta.

### 24 — Revisión de seguridad y secretos

**Pruebas:** Manual · **Depende de:** todos
- [ ] Ninguna clave, contraseña ni cadena de conexión en el repositorio ni en su historial; `.env.local` ignorado.
- [ ] Variables de Vercel configuradas (`DATABASE_URL`, `GEMINI_API_KEY`, `AUTH_SECRET`, `IP_HASH_SECRET`, contraseñas de demo) y distintas a las de pruebas.
- [ ] Cada ruta del panel responde 401 o redirige sin sesión; no existe campo de DNI en ningún lugar.
- [ ] Las pruebas con BD apuntan solo a la rama de pruebas.

### 25 — Ensayo de demo, README y video RA

**Pruebas:** Manual · **Depende de:** todos
- [ ] Se ejecuta toda la suite y se muestra el resultado real.
- [ ] En la URL pública se recorre catálogo → ficha → 3D → formulario → lead en el panel, sin errores.
- [ ] La etiqueta aparece en el 100 % de las pantallas con casa (ficha, RA, holograma y Modo Sala si se hizo).
- [ ] Se verifican los criterios de la demo del PRD (asistente 8/10 y 5/5, FAQ con IA caída, 0 leads sin consentimiento, panel solo con login, ficha en menos de 3 s con 4G).
- [ ] Se despierta Neon antes de presentar.
- [ ] El `README.md` incluye cómo ejecutar, créditos de modelos, aviso de datos ficticios, la nota de textos pendientes de validación legal y el video de la RA; si la RA no se validó, se documenta.

## Cómo usar este backlog

Cada ítem es una spec independiente. Al implementarlo, arranca un ciclo de Spec-Driven Development (`sdd-new` o el flujo equivalente de tu harness) usando ese ítem como el "change", no el proyecto completo. Si la columna "Contexto extra requerido" tiene algo, compártelo como contexto al generar la spec de ese ítem.
