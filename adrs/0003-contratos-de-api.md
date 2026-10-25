# ADR 0003: Contratos de API con rutas JSON del servidor

## Estado

Aceptado

## Contexto

Con una sola aplicación (ADR 0001), el navegador necesita hablar con el servidor para: enviar un lead, preguntar al asistente, registrar el uso de 3D/RA y que el asesor inicie sesión y consulte leads. Las páginas públicas de lectura (catálogo, ficha) pueden leer la base de datos directamente en el servidor.

Decisión delegada por el Product Owner: se aplica la opción más simple y segura.

## Decisión

- **Lectura pública** (catálogo y ficha): se resuelve en el servidor al construir la página, sin API propia.
- **Escrituras y acciones:** rutas JSON de Next.js (`app/api/...`), cada una con su esquema de entrada en Zod y respuestas con forma fija `{ ok, datos | error }`:
  - `POST /api/leads` — crear o actualizar un lead.
  - `POST /api/asistente` — preguntar al asistente.
  - `POST /api/panel/login` y `POST /api/panel/logout` — sesión del asesor.
  - `GET /api/panel/leads` — leads para el panel (requiere sesión).
- Las rutas `/panel/*` y `/api/panel/*` exigen sesión; el resto es público.
- Todos los mensajes de error visibles al usuario están en español y no exponen detalles internos.

## Alternativas consideradas

- **Server Actions de Next.js** — menos código, pero más difícil de probar con TDD y de documentar como contrato.
- **GraphQL o tRPC** — flexible, pero innecesario para 5 operaciones.

## Consecuencias

- Cada contrato se puede probar con TDD sin abrir el navegador.
- Validar con Zod en cada ruta añade un poco de código repetitivo.
- La lectura directa desde el servidor hace que el catálogo dependa de que Neon esté despierto (ver riesgos).
