# CLAUDE.md — LoteVista

Guía para Claude Code en este proyecto. La fuente de verdad del producto es `PRD.md`; si algo aquí contradice al PRD, manda el PRD.

## Qué es

LoteVista: visor inmobiliario web en 3D y Realidad Aumentada, con asistente IA y modo holograma, para una inmobiliaria que vende **lotes** (no casas). Proyecto final de curso, greenfield. **Fecha límite: lunes 26 de octubre de 2026.** Todos los datos son ficticios.

## Persona del usuario

El Product Owner no tiene experiencia en programación. Responde y redacta **todo en español** (código, nombres técnicos y comandos pueden quedar en inglés). Explica los pasos sin jerga y di qué hará cada comando antes de ejecutarlo.

## Restricciones obligatorias

- Despliegue en **Vercel (free tier)**.
- Base de datos **PostgreSQL en Neon**. El proyecto de Neon se llama `lotevivo` (nombre anterior del producto; se deja así).
- Vercel CLI ya tiene sesión iniciada.
- Los secretos (`DATABASE_URL`, `GEMINI_API_KEY`, credenciales del asesor) van en variables de entorno y **nunca** en el código ni en git.
- Los modelos 3D deben ser gratuitos con licencia CC0 o CC-BY; citar al autor en el `README.md`.

## Stack propuesto

<!-- REVISAR: stack propuesto por el agente; el Product Owner no lo decidió. -->

- Next.js (App Router) + TypeScript + Tailwind CSS.
- `<model-viewer>` de Google para 3D y RA (modelos `.glb`).
- Neon PostgreSQL con un cliente SQL simple (por ejemplo `@neondatabase/serverless`).
- Google Gemini (capa gratuita) para el asistente IA, llamado solo desde el servidor.
- Autenticación del panel del asesor con usuario y contraseña (sesión con cookie firmada); sin cuentas de cliente.

## Reglas de negocio (no negociables)

1. Se vende el lote, no la construcción. La casa 3D es solo referencial.
2. **Toda pantalla que muestre la casa 3D** (ficha, RA, holograma, Modo Sala) lleva visible la etiqueta **"Imagen referencial"**, también cuando falla el modelo y se muestra la imagen de respaldo.
3. El asistente **no inventa datos**: responde solo con la información del proyecto guardada en la base de datos; si no sabe, deriva a un asesor. No negocia precios, descuentos ni promociones ni agenda citas.
4. Un lead **no se guarda** sin aceptar el tratamiento de datos personales (Ley 29733). No se pide DNI.
5. El mismo celular es la misma persona: se actualiza el lead existente, se agregan el nuevo proyecto y las nuevas preguntas al historial y se actualiza la fecha del último contacto. No se borra nada anterior.
6. El horario preferido de contacto es opcional en el formulario.
7. La app está solo en español.

## Alcance y prioridad

Orden de construcción:

1. **Núcleo:** catálogo de 3 proyectos, ficha con visor 3D y etiqueta, formulario de lead, panel del asesor (login).
2. **Diferenciadores, en este orden:** RA "Ver en tu espacio", QR por proyecto, asistente IA con respaldo de FAQ y límite de mensajes por sesión, modo holograma (pantalla negra, modelo 3D mostrado 4 veces: arriba, abajo, izquierda, derecha).
3. **Opcional:** Modo Sala (pantalla completa para proyector con 3D girando y QR).

Si el tiempo aprieta se recorta primero el Modo Sala y luego el modo holograma. **El asistente IA se protege.**

## Fuera de alcance (no construir)

Pagos o reservas, DNI, integración automática con CRM, RA con marcador en laptop, Meta Quest/WebXR/VR, maqueta 3D del proyecto completo, asistente por voz, campañas con IA, integración con la web 3D existente, "Construye tu casa con nosotros", citas, cuentas de cliente, exportación a Excel, notificaciones automáticas, plano de lotes en tiempo real, simulador de cuotas (el financiamiento es texto), administración de proyectos desde el panel, otros idiomas.

## Datos del lead

Nombre, celular, correo, proyecto visto, preguntas al asistente, horario preferido (opcional), canal de origen (`web`, `qr_sala`, `holograma`), si usó 3D o RA, fecha y hora de registro, fecha del último contacto, aceptación del tratamiento de datos. Un lead puede tener varios proyectos y varias preguntas (historial).

## Casos borde críticos a implementar

IA caída o cuota agotada → FAQ; pregunta fuera de datos → derivar; dispositivo sin RA → 3D normal con aviso; modelo 3D que falla → imagen del proyecto con etiqueta; formulario inválido, vacío o doble clic → validar sin duplicar; panel sin sesión → redirigir al login (estado vacío si no hay leads); abuso del asistente → límite de mensajes. URL de proyecto inexistente → página amable al catálogo.

## Criterios de aceptación de la demo

Flujo completo catálogo → ficha → 3D → lead → panel sin errores; etiqueta en el 100 % de pantallas con casa; 0 leads sin consentimiento; panel solo con login; asistente 8/10 en preguntas de prueba y 5/5 de derivación sin inventar; FAQ con IA caída; RA en al menos 1 celular compatible y video corto en el repositorio; ficha en menos de 3 s en 4G (p95). Las vistas y giros del 3D no cuentan como éxito.

## Desarrollo guiado por pruebas (TDD)

Para la lógica de negocio y las reglas críticas se trabaja en ciclo **rojo → verde → mejorar**:

1. **Rojo:** escribir primero la prueba y ejecutarla para verla fallar por la razón correcta.
2. **Verde:** escribir lo mínimo de código para que pase.
3. **Mejorar:** limpiar el código con las pruebas en verde.

Se aplica con prueba previa obligatoria a:

- Lead: no se guarda sin consentimiento; validación de nombre, celular y correo; mismo celular actualiza el lead y agrega proyecto y preguntas al historial sin borrar lo anterior; doble envío no duplica.
- Asistente: responde solo con datos del proyecto; ante preguntas fuera de datos o intentos de negociar, deriva a un asesor sin inventar; con la IA caída responde el FAQ; respeta el límite de mensajes por sesión. Las pruebas usan un Gemini simulado (mock), nunca la clave real.
- Panel del asesor: sin sesión redirige al login; credenciales erróneas no entran; sin leads muestra estado vacío.
- Etiqueta "Imagen referencial": componente que muestra la casa siempre la incluye, también con la imagen de respaldo.
- Datos: consultas a Neon probadas contra una base de pruebas, nunca la de la demo.

Lo visual (3D, RA, holograma, Modo Sala) se verifica a mano, no con TDD. Antes de dar algo por terminado, ejecutar toda la suite y mostrar el resultado real; si algo falla, decirlo.

## Convenciones de trabajo

- Probar cada pieza antes de pasar a la siguiente; desplegar en Vercel con frecuencia para no dejar el deploy para el final.
- Antes de la demo, abrir la app para "despertar" Neon.
- Mantener `README.md` con instrucciones de ejecución, créditos de modelos 3D (autor, licencia, enlace) y aviso de que los datos son ficticios.
- El celular del Product Owner no soporta ARCore: la RA se valida con un celular compatible prestado; el profesor puede ver todo en 3D desde su laptop.
- Pedir confirmación al Product Owner antes de acciones difíciles de revertir (borrar datos, `--prod`, rotar claves).
