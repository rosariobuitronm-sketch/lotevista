# PENDIENTES — para que los revises al volver

> Lo escribí yo (Claude) mientras avanzaba sin poder consultarte. Cada decisión eligió la opción más razonable según `PRD.md`, `TECH-DESIGN.md` y los ADR. Si alguna no te gusta, dime y la cambio.

## Reglas que respeté mientras no estabas

- Hice solo commits locales: **no hubo push** después del ítem 3, **no toqué la base de producción** y **no usé `vercel env add`**.
- No mostré ni leí completo `.env.local`. Solo agregué variables nuevas y comprobé nombres.

## Variables de entorno nuevas (ya están en `.env.local`; falta subirlas a Vercel)

| Variable | Para qué sirve | Obligatoria en Vercel |
|---|---|---|
| `AUTH_SECRET` | Firma la cookie de sesión del asesor (ADR 0004) | Sí |
| `IP_HASH_SECRET` | Convierte la IP en hash para el límite del asistente (ADR 0005) | Sí |
| `COOKIE_SECRET` | Firma las cookies del visitante: canal de origen y contador de preguntas | Sí |
| `GEMINI_API_KEY` | Clave de Gemini (ya existía en `.env.local`) | Sí |
| `GEMINI_MODEL` | Modelo de Gemini. Si no existe se usa `gemini-2.5-flash` | No |
| `ASESOR_1_USUARIO` / `ASESOR_1_CLAVE` | Usuario demo del asesor (ya en `.env.local`; en producción ya está creado en la base) | No (solo para el script) |

Para subirlas, cuando vuelvas: `vercel env add AUTH_SECRET production` (y lo mismo con las otras). **Usa valores distintos a los de pruebas si algún día separas ambientes.** No las subí porque me lo pediste así.

## Decisiones que tomé (revísalas)

### Ítems 4 a 9 (catálogo, ficha, visor 3D, leads)

- **Catálogo = página de inicio (`/`).** No hice una ruta `/proyectos` aparte; la portada tiene un texto breve y debajo las 3 tarjetas.
- **Ilustraciones de los proyectos:** las generé con `scripts/generar-imagenes.mjs` como `.jpg` en `public/proyectos/` (la ruta que ya estaba en la base). Son dibujos propios con la paleta. Como dibujan una casa, **las tarjetas del catálogo también llevan la etiqueta "Imagen referencial"** (regla de negocio 2).
- **Botones de acción:** fondo coral con texto marino (el blanco sobre coral no cumple el contraste mínimo de accesibilidad).
- **Modelo de Gemini por defecto:** `gemini-2.5-flash` (comprobé que tu clave lo admite). Se cambia con `GEMINI_MODEL`.
- **Fuente:** dejé Geist (la que trae el proyecto) en lugar de Arial.
- **Visor 3D:** si el modelo no carga en 15 s se muestra la imagen del proyecto con la etiqueta. Bajé la exposición (`0.8`) porque los colores salían lavados.
- **Slug inexistente:** muestra la página amable con enlace al catálogo, pero el código HTTP es 200 y no 404 (limitación de Next.js al enviar la página por partes). No afecta a quien navega.
- **Horario preferido:** es una lista de 3 franjas (mañana, tarde, noche) más "Sin preferencia", en vez de texto libre.
- **El formulario no revela si un celular ya estaba registrado:** la respuesta es idéntica para un lead nuevo y uno repetido (privacidad).
- **Mismo celular:** al repetirse, NO se pisan el nombre ni el correo originales (solo cambian último contacto y horario, como dice el ADR 0007).
- **Celular válido:** 9 dígitos que empiezan con 9 (celulares de Perú); se acepta el prefijo +51.
- **Pruebas locales de punta a punta:** mi servidor local usa la **rama de pruebas** de Neon, nunca la de producción, para no ensuciar los leads reales.

### Plano de lotización (requisito nuevo, entre los ítems 12 y 13)

- **Contradice una línea del PRD y del CLAUDE.md** ("no hay plano de lotes con disponibilidad en tiempo real"). Lo hice como pediste, pero **referencial**: el plano dice "Plano referencial, no a escala" y los estados son de demostración, no vienen de ningún sistema en tiempo real. Si quieres que el PRD quede coherente, hay que ajustar esa frase.
- **22 lotes por proyecto:** Mz. A (8), Mz. B (8) y Mz. C (6). Los generé con un cálculo repetible: área = frente × fondo, tarifa por m² de cada proyecto (S/ 310 Sunampe, S/ 480 Huaral, S/ 420 Chira) y **+5 % en lotes de esquina**. Los precios "desde" y los rangos de metraje de los proyectos no cambiaron. **Todo está marcado como `<!-- REVISAR -->` en `db/seed.sql`.**
- **Estados por proyecto:** 15 disponibles, 3 separados y 4 vendidos.
- **Separado:** se puede tocar y muestra un aviso ("separado por otro cliente"); **vendido:** no es clicable ni recibe el foco, pero el lector de pantalla lo describe.
- **"Ver casa 3D en este lote":** el modelo 3D es el mismo para todos los lotes. El botón lleva al visor y muestra "Mostrando la casa referencial sobre el lote Mz. X - Lt. N…". No se coloca la casa físicamente sobre el lote.
- **"Quiero información"** precarga el lote en el formulario (con opción de quitarlo) y **se guarda en el lead** (columna nueva `lead_intereses.lote`) y se ve en el panel del asesor. Esto lo agregué yo porque, si no, el dato se perdía.
- **Accesibilidad:** cada lote es un botón con nombre completo ("Mz. A - Lt. 1, 144 m², 9 m de frente por 16 m de fondo, S/ 46,870, disponible"), Tab/Enter/Espacio/Escape, foco que pasa al panel, y además de color cada estado lleva un patrón (rayas = vendido, puntos = separado) para quien no distingue colores. La tabla completa de lotes queda en un desplegable como alternativa.
- **Cambio de esquema pendiente en producción:** columnas nuevas `lotes.manzana`, `lotes.numero`, `lotes.estado` y `lead_intereses.lote` (con `ALTER TABLE … IF NOT EXISTS`, repetible y sin borrar nada) + el seed con los 66 lotes. **Hay que aplicarlos en producción ANTES de subir el código del plano** (`npm run db:produccion`); si no, la ficha fallaría. Te lo pediré junto con el siguiente push.
- Corregí un error mío anterior: el título y la sección de contacto repetían el mismo `id`.

### Ítems 13 a 15 (RA, canal de origen, QR)

- **RA sin verificar en un celular:** el botón y los avisos funcionan en Edge de escritorio (sin RA: aviso en español), pero **necesito que pruebes en un celular compatible** (Android con ARCore o iPhone) y grabes el video corto. En Android con Chrome la etiqueta "Imagen referencial" se ve dentro de la RA; en **Scene Viewer y Quick Look (iPhone) el sistema no deja superponerla**: por eso se avisa justo antes de entrar ("la casa es solo una referencia").
- **Canal de origen:** el parámetro `?canal=qr_sala` se guarda en una cookie firmada (24 h). La página `/holograma/[slug]` fija `holograma` sola. Un valor inválido se ignora y el canal queda `web`.
- **"Usó 3D":** cuenta solo si la persona mueve la casa con mouse o dedo (el giro automático no cuenta). "Usó RA": al tocar el botón o iniciar la sesión de RA.
- **QR:** `GET /api/qr/<slug>` genera un PNG en el servidor que abre `/proyectos/<slug>?canal=qr_sala`. Usa la variable opcional **`SITE_URL`** (por ejemplo `https://lotevista.vercel.app`); si no existe, usa la dirección desde la que se pidió. Conviene definirla en Vercel para que el QR impreso no dependa de cómo se abra la página. Hay una página para imprimir (`/qr/<slug>`). **Falta que lo escanees con un celular real** (yo comprobé por programa que el QR decodifica a la URL correcta).

### Asistente de IA (ítems 16 a 21) — hallazgos importantes con tu clave real de Gemini

- **El modelo por defecto del ADR/TECH-DESIGN no sirve y lo cambié:** `gemini-2.5-flash` (y toda la familia 2.5) devuelve **404 "ya no está disponible para cuentas nuevas"**, aunque aparece en la lista de modelos. Midiendo con tu clave: `gemini-3.8-flash` tardó **119 segundos** en una pregunta trivial; `gemini-3.5-flash` ~1,2 a 2,7 s (y a veces 429 por cuota); **`gemini-3.5-flash-lite` ~0,9 s, estable** → es el nuevo valor por defecto. Se cambia con la variable **`GEMINI_MODEL`** sin tocar código (no hace falta definirla en Vercel; si quieres, `vercel env add GEMINI_MODEL production`).
- **La capa gratuita es inestable** (vi respuestas 429 "cuota" y 503 "alta demanda" en medio de las pruebas). Para eso están el corte de 8 s y el FAQ: durante la evaluación parte de las respuestas salió del FAQ y el cliente nunca vio un error. Antes de la demo conviene hacer unas preguntas de calentamiento.
- **Evaluación real (`node scripts/evaluar-asistente.mjs`), 3 proyectos × (10 de datos + 5 fuera de datos):** datos **30/30** correctos; fuera de datos **14/15 derivadas** con la IA real. El único "fallo" fue "¿Cuál es el teléfono personal del gerente?" respondido por el **FAQ** (con la IA caída) con "Deja tu nombre, celular y correo… un asesor se comunicará": no inventa ningún teléfono, pero el criterio estricto pide `sabe=false`. Con la IA funcionando (Sunampe y Chira) derivó bien las 5/5. **Las pruebas automáticas usan siempre un Gemini simulado** (10/10 y 5/5), nunca la clave real.
- **Texto corrupto de la IA:** en una respuesta real faltaron letras ("Campia de Huaral est  en…", probablemente caracteres de reemplazo). No se repitió en 8 intentos, pero agregué una barrera (con prueba): si la respuesta trae ese carácter, se descarta y se usa el FAQ.
- **Derivación vs. FAQ:** si la IA responde con formato inválido o dice "no sé", se deriva a un asesor (como pide el ADR 0005); si la IA *falla* (cuota, caída, más de 8 s), primero se busca en el FAQ.
- **Antes de llamar a la IA** se filtran los pedidos de descuento, negociación, citas, visitas, reservas y separaciones (se derivan sin gastar cuota).
- **Límites:** 20 preguntas por sesión (cookie firmada, la 21 se bloquea) y 500 por IP en 24 h (HMAC con `IP_HASH_SECRET`; solo se guarda el hash). Si falta un secreto en el servidor, el asistente responde "no está disponible, usa el formulario".
- **`maxDuration = 30`** en la ruta del asistente para cubrir los 8 s de espera; **falta confirmarlo ya desplegado en Vercel** (lo hago al subir).
- **Scripts de apoyo** (no son parte de la app): `scripts/evaluar-asistente.mjs` (mide 8/10 y 5/5 con la IA real) y `scripts/probar-gemini.mjs` (compara modelos y su latencia).

### Cosas que no pude hacer yo

- **`.env.example` sin actualizar:** el sistema me impide editar ese archivo. Conviene que le agregues, sin valores, estos nombres: `AUTH_SECRET`, `COOKIE_SECRET`, `IP_HASH_SECRET`, `GEMINI_MODEL`, `SITE_URL`, `ASESOR_1_USUARIO`, `ASESOR_1_CLAVE` (ya debería estar `DATABASE_URL`, `DATABASE_URL_TEST` y `GEMINI_API_KEY`). El README ya lista las variables.
- **Pruebas con dispositivos reales:** RA en un celular compatible y el video corto (ítem 13), escaneo del QR con un celular (ítem 15), uso del chat y del plano en un celular físico (ítems 20 y plano) y el holograma sobre la pirámide casera (ítem 22). Yo solo pude verificar con Edge de escritorio emulando tamaños de celular y tableta.
- **Revisar el contenido inventado** marcado con `<!-- REVISAR -->` en `db/seed.sql` (nombres, precios, plazos, financiamiento, lotes y respuestas de FAQ) y los textos legales (consentimiento e "Imagen referencial"), que siguen siendo borradores.

### Ítems que NO toqué (según tus instrucciones)

- **23 (Modo Sala, opcional):** omitido, como pediste.
- **24 (revisión de seguridad) y 25 (ensayo de demo, README final y video RA):** no estaban en el alcance 4-22. Antes de la demo conviene correrlos; ya hay varias comprobaciones hechas (secretos fuera del código, prueba que impide que la clave de Gemini llegue al navegador, panel protegido, sin campo de DNI).
