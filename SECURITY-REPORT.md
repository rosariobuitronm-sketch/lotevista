# Security Pass — LoteVista

Fecha: 25 de octubre de 2026
Herramienta: skill `security-pass` (solo análisis; este archivo es lo único que genera).

**Alcance revisado:** requisitos (`PRD.md`, `CLAUDE.md`), arquitectura (`TECH-DESIGN.md`, ADR 0001 a 0007), especificaciones (`BACKLOG.md`), código completo de `src/` (rutas, proxy, librerías y componentes), pruebas (39 archivos, 393 pruebas), esquema y datos (`db/`), configuración (`next.config.ts`, `package.json`, `.gitignore`), dependencias (`npm audit`), el repositorio y todo su historial (búsqueda de los valores reales de los secretos) y el comportamiento real del sitio publicado (cabeceras y acceso al panel).
**Capas omitidas por falta de material:** CI/CD (no existe: el despliegue es la integración nativa de Vercel con GitHub) y `.env.example` (el sistema no permite leerlo; solo debe contener nombres de variables).

## Resumen ejecutivo

El sistema está razonablemente sano para una demo con datos ficticios: no se encontró inyección SQL, XSS ni secretos en el repositorio o su historial; el panel está protegido en tres capas; el asistente de IA no puede salirse de los datos del proyecto; y `npm audit` no reporta vulnerabilidades. **No hay hallazgos CRITICAL.** El único hallazgo HIGH (credencial pública del panel) es una **decisión consciente del Product Owner** para la demo y queda registrada como riesgo aceptado: no es un defecto de código. Lo más importante antes de cualquier uso real es **rotar la contraseña de demo, marcar `DATABASE_URL` como variable sensible y rotar la clave que se vio en un chat**. Los demás hallazgos son MEDIUM o menores: falta de límite de frecuencia al crear leads, ausencia de cabeceras anti-"clickjacking" y una promesa de retención de 12 meses que ningún proceso cumple todavía.

## Decisiones conscientes (registradas por el Product Owner)

| # | Decisión | Estado | Condición para revisarla |
|---|---|---|---|
| D1 | **Credencial de asesor pública, solo para la demo** (usuario `ASESOR` y su contraseña de demostración), con bloqueo de 15 minutos tras 5 intentos fallidos (ADR 0004). | Riesgo aceptado | Cambiarla antes de recibir datos de personas reales. Ver SP-01. |
| D2 | **`DATABASE_URL` guardada en Vercel como tipo «Configuración»** (no «Sensible»). | Riesgo aceptado | Pasarla a sensible antes de un uso real. Ver SP-02. |
| D3 | **Una clave quedó visible en un chat privado.** | Riesgo aceptado | Rotarla al terminar la demo o antes de un uso real. Ver SP-03. |

## Fortalezas de seguridad

Para que se sepa qué **no** tocar al remediar:

- **Acceso al panel en tres capas:** el filtro `proxy.ts` (redirige o responde 401), cada ruta `/api/panel/*` vuelve a verificar la sesión, y la página `/panel` la verifica **antes** de consultar la base. Una prueba confirma que sin sesión no se hace ninguna consulta. En producción: `/panel` redirige (307) y `/api/panel/leads` responde 401.
- **Contraseñas con bcrypt** (costo 10), comparación en tiempo constante aunque el usuario no exista (hash falso), mensaje de error único y bloqueo por usuario que también cuenta usuarios inexistentes (no delata cuáles son válidos). Las contraseñas nunca se registran (hay prueba).
- **Sesión:** cookie `httpOnly`, `secure`, `sameSite=lax`, firmada (HS256, solo ese algoritmo se acepta), caduca en 8 horas; se rechazan tokens sin firma, con otro secreto o manipulados.
- **Inyección:** todas las consultas SQL usan parámetros (no hay texto concatenado). **XSS:** no existe `dangerouslySetInnerHTML` ni `innerHTML`; hay pruebas con `<script>` e `<img onerror>` en nombres, correos y preguntas.
- **Validación estricta con Zod** en todas las rutas (campos de más como `dni` se rechazan, tamaños acotados) y límites de tamaño del cuerpo.
- **Asistente de IA:** la pregunta del cliente viaja como texto no confiable; la instrucción contiene solo los datos del proyecto (nunca secretos ni otros proyectos); la respuesta se valida con un esquema y, si no cumple, se deriva a un asesor; negociar o agendar se bloquea antes de llamar a la IA. La clave de Gemini solo se lee en una ruta del servidor (una prueba automática lo verifica) y nunca aparece en respuestas, cookies ni errores.
- **Privacidad (Ley 29733):** sin consentimiento no se guarda nada (validado en el navegador, en la ruta, en la lógica y en la base de datos con un `CHECK`); las preguntas y el uso de 3D/RA viven solo en el navegador hasta el formulario; la respuesta del formulario es idéntica para un celular nuevo y uno repetido (no revela si ya estaba registrado); la IP se guarda solo como hash HMAC por 24 horas.
- **Secretos:** ninguno de los valores reales (clave de Gemini, cadenas de Neon, secretos de cookies y contraseña del asesor) aparece en el repositorio ni en su historial (búsqueda de los valores exactos); `.env*` está ignorado; las variables sensibles en Vercel están como secretas.
- **Errores:** ninguna ruta devuelve detalles técnicos; las fallas de Gemini, de la base o de secretos faltantes dan mensajes amables (hay pruebas por cada tipo).
- **Datos de pruebas aislados:** toda prueba con base de datos usa la rama de pruebas de Neon y se niega a correr si apunta a la misma base que la demo.
- **Dependencias:** `npm audit --omit=dev` → 0 vulnerabilidades. `next` está en una versión no afectada por el bypass conocido de `middleware`, y de todos modos la autorización no depende solo del filtro.

## Findings

### CRITICAL

Ninguno.

### HIGH

**SP-01 — Credencial del panel pública: cualquiera puede leer los datos personales de todos los leads**
- **Severity:** HIGH — justificación: el panel muestra nombre, celular, correo y preguntas de **todos** los leads; con usuario y contraseña publicados, ese acceso es de cualquier persona de internet. Se mantiene en HIGH (y no CRITICAL) solo porque los datos de la demo son ficticios y la decisión es del Product Owner.
- **Confidence:** HIGH
- **Category:** Authentication / sensitive data exposure
- **Affected artifact:** Panel del asesor, tabla `asesores`, `README.md` (credenciales de demo)
- **Location:** `src/app/api/panel/login/route.ts`, `src/lib/login.ts`, `README.md`
- **Description:** La contraseña de demostración es conocida y trivial. El bloqueo tras 5 fallos no protege contra quien la conoce.
- **Evidence:** Por decisión D1 el par usuario/contraseña de demo se publica en el `README.md` (paso 5 de este bloque). `GET /api/panel/leads` con esa sesión devuelve todos los leads (hasta 500).
- **Attack scenario:** Un visitante abre `/panel/login`, entra con la credencial pública y copia los datos de cualquier persona que haya dejado un formulario, incluso si escribió datos reales por curiosidad.
- **Potential impact:** Exposición de datos personales (Ley 29733) si algún lead contiene datos reales. Con datos ficticios, el impacto es nulo.
- **Existing mitigation:** Datos 100 % ficticios; bloqueo de 15 minutos tras 5 intentos; sesión de 8 h; la demo es temporal.
- **Recommended remediation:** Antes de cualquier uso real: cambiar la contraseña por una única y larga (`npm run asesores:produccion` con una nueva `ASESOR_1_CLAVE`), no publicarla, y borrar los leads de la demo al terminar. Opcional: avisar en el formulario que no se escriban datos reales.
- **Suggested verification:** Tras cambiarla, el par anterior responde 401; el README ya no lo muestra.
- **Required change type:** `ACCEPT RISK` (decisión D1 del Product Owner, solo para la demo)

### MEDIUM

**SP-02 — `DATABASE_URL` guardada como variable de tipo «Configuración» en Vercel**
- **Severity:** MEDIUM — contiene la contraseña de la base de producción; quien tenga acceso al proyecto de Vercel (o a `vercel env ls` / `vercel env pull`) puede leerla; las demás secretas están como «Sensible».
- **Confidence:** HIGH
- **Category:** Secrets handling
- **Affected artifact:** Variables de entorno de Vercel
- **Location:** Proyecto `lotevista` en Vercel, variable `DATABASE_URL` (Development, Preview y Production)
- **Description:** El tipo «Configuración» no oculta el valor en el panel ni en la CLI.
- **Evidence:** `vercel env ls` lista `DATABASE_URL` con tipo `Config`; las otras cuatro variables sensibles aparecen como `Secret`.
- **Attack scenario:** Un colaborador o una cuenta comprometida con acceso al proyecto copia la cadena y se conecta a la base.
- **Potential impact:** Lectura y borrado de todos los datos de la demo.
- **Existing mitigation:** Acceso a Vercel limitado al dueño; datos ficticios; existe la rama de pruebas aparte.
- **Recommended remediation:** Volver a crearla como variable sensible (`vercel env rm` y `vercel env add … --sensitive`) y, si alguien más tuvo acceso, rotar la contraseña del rol en Neon.
- **Suggested verification:** `vercel env ls` muestra `Secret` para `DATABASE_URL`; el sitio sigue funcionando tras redesplegar.
- **Required change type:** `ACCEPT RISK` (decisión D2 del Product Owner)

**SP-03 — Una clave fue visible en un chat privado**
- **Severity:** MEDIUM — una clave expuesta, aunque sea en un chat privado, debe considerarse comprometida; el impacto depende de cuál fue (Gemini: gasto de cuota; Neon: acceso a datos).
- **Confidence:** LOW — no se sabe qué clave fue; información faltante: cuál y quién pudo verla.
- **Category:** Secrets handling
- **Affected artifact:** Credencial no identificada
- **Location:** Fuera del repositorio (conversación privada)
- **Description / Evidence:** Declarado por el Product Owner. La búsqueda en el repositorio y su historial no encontró ningún secreto.
- **Attack scenario:** Quien tenga acceso a ese chat podría usar la clave.
- **Potential impact:** Uso indebido de la cuota gratuita de Gemini o acceso a la base, según la clave.
- **Existing mitigation:** Chat privado; datos ficticios; cuota gratuita.
- **Recommended remediation:** Rotar la clave al terminar la demo o antes de un uso real (Gemini: crear una nueva en Google AI Studio y actualizar `GEMINI_API_KEY` en `.env.local` y Vercel).
- **Suggested verification:** La clave anterior responde 400/403 en una llamada de prueba.
- **Required change type:** `ACCEPT RISK` (decisión D3 del Product Owner)

**SP-04 — Faltan cabeceras de seguridad (clickjacking y otras)**
- **Severity:** MEDIUM — el formulario de contacto y el login del panel se pueden incrustar en una página ajena.
- **Confidence:** HIGH
- **Category:** Misconfiguration / insecure defaults
- **Affected artifact:** Configuración de la aplicación
- **Location:** `next.config.ts` (no define `headers()`); no existe `vercel.json`
- **Description:** Las respuestas de producción solo llevan `Strict-Transport-Security`.
- **Evidence:** `curl -I https://lotevista.vercel.app/` y `/panel/login` no devuelven `X-Frame-Options`, `Content-Security-Policy`, `X-Content-Type-Options` ni `Referrer-Policy`.
- **Attack scenario:** Una página maliciosa incrusta `/panel/login` o la ficha en un `iframe` transparente y engaña al asesor o a un cliente para que escriba o haga clic sin darse cuenta.
- **Potential impact:** Robo de credenciales por suplantación visual; mala práctica general.
- **Existing mitigation:** HTTPS forzado; el login no hace nada sensible sin interacción.
- **Recommended remediation:** Definir cabeceras en `next.config.ts`: `Content-Security-Policy: frame-ancestors 'none'` (o `X-Frame-Options: DENY`), `X-Content-Type-Options: nosniff` y `Referrer-Policy: strict-origin-when-cross-origin`. **No** restringir cámara ni `xr-spatial-tracking` (la RA los necesita). Una CSP completa requiere cuidado con `model-viewer` y los modelos `blob:`.
- **Suggested verification:** Prueba automática que lea las cabeceras de la ruta y `curl -I` en producción; la RA y el visor siguen funcionando.
- **Required change type:** `CODE FIX`

**SP-05 — `/api/leads` no tiene límite de frecuencia**
- **Severity:** MEDIUM — cualquiera puede crear miles de leads: llena el panel de basura y consume la cuota gratuita de Neon.
- **Confidence:** HIGH
- **Category:** Resource exhaustion / abuse of legitimate functionality
- **Affected artifact:** `POST /api/leads`, tabla `leads`
- **Location:** `src/app/api/leads/route.ts` (no usa el contador por IP que sí tiene el asistente)
- **Description:** La ruta valida y limita el tamaño de cada envío, pero no cuántos se pueden hacer. No hay CAPTCHA.
- **Evidence:** No hay referencias a `registrarPreguntaPorIp`, `hashIp` ni límites en la ruta (búsqueda en el código).
- **Attack scenario:** Un script envía miles de formularios con celulares inventados (`9XXXXXXXX`), cada uno crea un lead y un interés.
- **Potential impact:** Panel inservible para el asesor, base de datos saturada, costo o corte del servicio gratuito.
- **Existing mitigation:** Validación estricta y límites de tamaño; no hay envío de correos ni costos por lead; la demo es temporal.
- **Recommended remediation:** Reutilizar `registrarPreguntaPorIp` con otra clave (por ejemplo, 20 envíos por IP en 24 h) y devolver 429 con un mensaje amable. Agregar el criterio al ítem 9 del BACKLOG.
- **Suggested verification:** Prueba de integración que muestre que el envío 21 desde la misma IP responde 429 sin guardar nada.
- **Required change type:** `CODE FIX` (con un criterio nuevo en la especificación del ítem 9)

**SP-06 — El consentimiento promete conservar los datos 12 meses como máximo, pero nada los borra**
- **Severity:** MEDIUM — incumplir una promesa hecha al titular de los datos (Ley 29733) es un riesgo legal en un uso real.
- **Confidence:** HIGH
- **Category:** Privacy gap
- **Affected artifact:** Texto de consentimiento y modelo de datos
- **Location:** `src/lib/textos.ts` (texto de consentimiento), `db/schema.sql`; ADR 0007 ya lo menciona como pendiente
- **Description:** El texto dice «Mis datos se conservarán como máximo 12 meses», pero no existe tarea de borrado ni forma de atender una solicitud de cancelación (solo SQL manual).
- **Evidence:** No hay ningún `DELETE FROM leads` en el código de la aplicación ni en los scripts (solo en pruebas); los leads tienen `creado_en` y `ultimo_contacto` pero nadie los usa para purgar.
- **Attack scenario:** No es un ataque: una persona pide la cancelación de sus datos o pasa el año y los datos siguen guardados.
- **Potential impact:** Incumplimiento de la normativa y de lo que se prometió.
- **Existing mitigation:** Datos ficticios; el texto legal es un borrador pendiente de validación legal (declarado en BACKLOG y README).
- **Recommended remediation:** Decidir la política (por ejemplo, borrar leads sin contacto en 12 meses con una tarea programada) y un procedimiento para atender solicitudes de cancelación. Alternativa: cambiar el texto a algo que sí se cumpla.
- **Suggested verification:** Prueba que cree un lead con fecha vieja y compruebe que el proceso lo elimina junto con su historial.
- **Required change type:** `PRODUCT / REQUIREMENT CHANGE`

### LOW

**SP-07 — Quien conozca un celular puede modificar el lead de esa persona**
- **Severity:** LOW — el celular es la identidad (decisión del PRD y ADR 0007): un envío con un celular ajeno agrega proyectos y preguntas y puede cambiar el horario preferido.
- **Confidence:** HIGH
- **Category:** Business-logic abuse / integrity
- **Location:** `src/lib/leads.ts` (`ON CONFLICT (celular) DO UPDATE SET … horario_preferido = COALESCE(EXCLUDED…)`)
- **Evidence:** La prueba «el mismo celular no crea otro lead» documenta el comportamiento. No se pisan nombre ni correo.
- **Attack scenario:** Alguien escribe el celular de un conocido con otro horario y preguntas; el asesor ve datos mezclados.
- **Existing mitigation:** Riesgo ya reconocido en el PRD, TECH-DESIGN y ADR 0007; nombre y correo originales no cambian.
- **Recommended remediation:** Aceptar para la demo; en un producto real verificar el celular (código por SMS) antes de fusionar.
- **Required change type:** `ACCEPT RISK`

**SP-08 — La sesión del asesor no se puede revocar del lado del servidor**
- **Severity:** LOW — «Cerrar sesión» solo borra la cookie; un token robado seguiría válido hasta 8 horas.
- **Confidence:** HIGH
- **Category:** Session handling
- **Location:** `src/lib/auth.ts`, `src/app/api/panel/logout/route.ts`
- **Evidence:** No hay lista de sesiones cerradas ni versión de sesión en la base (búsqueda en el código). La cookie es `httpOnly`, `secure` y de 8 h.
- **Existing mitigation:** `httpOnly` impide robo por scripts; HTTPS; vida corta; hay una sola cuenta de demo.
- **Recommended remediation:** Para producción real, guardar un identificador de sesión en la base y borrarlo al cerrar sesión; o rotar `AUTH_SECRET` si hay sospecha (invalida todas las sesiones).
- **Required change type:** `ACCEPT RISK`

**SP-09 — El login no tiene límite por IP y la tabla de intentos crece sin limpieza**
- **Severity:** LOW — el bloqueo es por usuario; un atacante puede probar usuarios distintos sin tope y cada uno deja una fila en `intentos_login` que nunca se borra.
- **Confidence:** MEDIUM — el crecimiento sería lento y la tabla es pequeña; el límite del plan gratuito es el riesgo real.
- **Category:** Resource exhaustion
- **Location:** `src/lib/bloqueo.ts`, `src/app/api/panel/login/route.ts`
- **Evidence:** El login no usa ningún contador por IP; `intentos_login` no tiene columna de fecha ni limpieza.
- **Recommended remediation:** Reutilizar el contador por IP en el login (por ejemplo, 30 intentos por hora) y borrar filas de `intentos_login` sin bloqueo vigente y con más de 24 horas, como ya se hace con `limite_ip`.
- **Required change type:** `CODE FIX`

### INFO

**SP-10 — `/api/salud` es público y consulta la base en cada llamada.** No devuelve datos ni secretos; solo confirma que la base responde. Útil para despertar Neon; cada llamada usa cómputo mínimo. `ACCEPT RISK`.

**SP-11 — Las rutas JSON aceptan cualquier `Content-Type`.** Un sitio ajeno podría enviar un `POST` simple a `/api/leads` o `/api/asistente`; como ninguna depende de una sesión del navegador para autorizar (el asistente solo cuenta preguntas en una cookie firmada), no hay acción protegida que falsificar. Se menciona para que no se agreguen luego rutas con cookies sin revisar CSRF. `PROCESS / HARNESS CHANGE`.

## Pruebas: qué está cubierto y qué falta

- **Ya verificado por pruebas automáticas:** contraseñas con bcrypt y nunca en registros; sesión de 8 h (7 h 59 min vale, 8 h 01 min no); tokens manipulados, sin firma y de otro secreto; bloqueo tras 5 intentos con el tiempo simulado; panel sin sesión (proxy, ruta y página); XSS en panel y chat; consentimiento obligatorio (0 excepciones); campos de más (`dni`); límites de 20 por sesión y 500 por IP; la clave de Gemini solo en el servidor y ningún `NEXT_PUBLIC_` con secretos; errores sin detalles técnicos; pruebas con base de datos solo en la rama de pruebas.
- **Falta:** una prueba de las cabeceras de seguridad (SP-04), una del límite de envíos de `/api/leads` (SP-05) y una de la política de retención (SP-06). Las pruebas E2E con navegador (paso 4) cubrirán los flujos principales.

## Prioridad

1. **Antes de cualquier uso real (SP-01, SP-02, SP-03):** cambiar la contraseña de demo, marcar `DATABASE_URL` como sensible y rotar la clave vista en el chat. Son decisiones tuyas (D1 a D3); no requieren código.
2. **SP-05** (límite de envíos de leads): es la forma más fácil de dañar el sitio público.
3. **SP-04** (cabeceras): cambio pequeño y sin riesgo para la RA si no se restringen cámara ni `xr-spatial-tracking`.
4. **SP-06** (retención de 12 meses): decisión de producto y legal antes de recibir datos reales.
5. **SP-09 y SP-08**: mejoras de endurecimiento para un producto real.

## Gobernanza / Decisión requerida

Quedaron marcados como decisiones humanas (este pase **no** las resuelve):

- **SP-01 (ACCEPT RISK, HIGH):** credencial de asesor pública solo para la demo, con bloqueo tras 5 intentos — decisión D1 del Product Owner. Debe revisarse antes de recibir datos reales.
- **SP-02 (ACCEPT RISK):** `DATABASE_URL` como variable de tipo «Configuración» en Vercel — decisión D2.
- **SP-03 (ACCEPT RISK):** una clave fue visible en un chat privado — decisión D3.
- **SP-06 (PRODUCT / REQUIREMENT CHANGE):** definir la política de retención y de atención de solicitudes de cancelación de datos; el texto de consentimiento promete 12 meses y hoy no se cumple.
- **SP-07, SP-08, SP-10 (ACCEPT RISK):** identidad por celular, sesión sin revocación del lado del servidor y ruta de salud pública. Aceptables para la demo; revisar para un producto real.

Los hallazgos SP-04, SP-05 y SP-09 son `CODE FIX` y SP-11 es `PROCESS / HARNESS CHANGE`: no requieren una decisión de producto.
