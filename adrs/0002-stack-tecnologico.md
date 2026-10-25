# ADR 0002: Stack tecnológico

## Estado

Aceptado

## Contexto

Restricciones del curso: Vercel (free tier), PostgreSQL en Neon (proyecto "lotevivo" ya creado) y repositorio en GitHub. El Product Owner sugirió Next.js con TypeScript y Tailwind, `<model-viewer>` de Google para 3D y RA, Gemini llamado solo desde el servidor y una librería simple para QR. El CLAUDE.md exige TDD sobre la lógica de negocio. Plazo de un día y una persona sin experiencia en programación.

Decisión delegada por el Product Owner: se aplica la opción más simple y segura.

## Decisión

- **Aplicación:** Next.js (App Router) + TypeScript + Tailwind CSS.
- **3D y RA:** `<model-viewer>` con modelos `.glb` (CC0 o CC-BY). En iPhone, `<model-viewer>` genera el formato necesario para RA a partir del `.glb`, así que no se mantienen dos archivos por modelo.
- **Base de datos:** Neon PostgreSQL con el controlador `@neondatabase/serverless` y SQL escrito a mano en archivos versionados (`db/schema.sql` y `db/seed.sql`). Sin ORM.
- **Validación de entradas:** Zod.
- **QR:** librería `qrcode`, generada en el servidor.
- **Pruebas:** Vitest para la lógica y las rutas; las pruebas con base de datos usan una rama de Neon exclusiva para pruebas, nunca la de la demo.
- **Despliegue:** Vercel conectado al repositorio de GitHub; secretos solo en `.env.local` y en las variables de entorno de Vercel.

## Alternativas consideradas

- **ORM (Drizzle o Prisma)** — da tipos y migraciones automáticas, pero agrega configuración y conceptos nuevos para un esquema de pocas tablas; no se eligió por simplicidad.
- **Backend separado (Express o similar)** — innecesario al existir rutas de servidor en Next.js (ver ADR 0001).
- **Tres.js / React Three Fiber para el 3D** — más control, mucho más trabajo; `<model-viewer>` ya trae giro, zoom y RA.

## Consecuencias

- Pocas piezas, todas con documentación abundante, y el SQL a mano es fácil de leer y de probar.
- Sin ORM no hay migraciones automáticas: los cambios de tabla se aplican ejecutando los archivos SQL a mano.
- Las pruebas con Neon dependen de la conexión a internet y de crear una rama de pruebas.
- `<model-viewer>` limita lo que se puede personalizar en 3D y RA al comportamiento que el componente ofrece.
