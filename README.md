# LoteVista

Visor inmobiliario web en **maqueta 3D, Realidad Aumentada (RA) y modo holograma**, con asistente de IA, para una inmobiliaria que vende **lotes** (no casas). Se muestra un catálogo de 3 proyectos; cada ficha tiene una maqueta 3D del proyecto con sus lotes, la casa referencial sobre el lote elegido, el botón «Ver en tu espacio» (RA), un código QR, el asistente Vicha y un formulario de interés. Un panel privado permite a los asesores ver los leads.

> **Todos los datos de este proyecto son ficticios.** La empresa («Inmobiliaria Demo S.A.C.»), los proyectos, los precios y los lotes no representan a ninguna empresa real. Los textos legales son borradores pendientes de validación legal.

Proyecto final de curso. Fecha límite: **26 de octubre de 2026**.

## Demo en línea

- **Aplicación:** https://lotevista.vercel.app
- **Panel del asesor:** https://lotevista.vercel.app/panel/login
- **Credenciales de demostración:** usuario `ASESOR` · contraseña `ASESOR123`.
  Son públicas a propósito, solo para esta demo con datos ficticios (el acceso se bloquea 15 minutos tras 5 intentos fallidos). En un uso real se reemplazan por credenciales privadas.

## Qué incluye

- **Catálogo** de 3 proyectos y **ficha** de cada uno.
- **Maqueta 3D inmersiva** (vista principal): los lotes por estado (disponible, separado, vendido), calles, parque y árboles; cámara orbital con mouse o dedo. Al tocar un lote, la cámara vuela hacia él, aparece la casa referencial encima y un panel muestra medidas, área, precio y estado, con «Quiero información» y «Ver en tu espacio».
- **Plano 2D de lotización** como respaldo accesible (teclado y lector de pantalla): se muestra solo si el dispositivo no soporta WebGL, es lento, o si la persona lo pide con «Ver plano 2D».
- **RA «Ver en tu espacio»** con `<model-viewer>` (celulares compatibles con ARCore o iPhone); en laptop se avisa que no está disponible.
- **QR por proyecto**, **asistente Vicha** (Gemini, con respaldo de preguntas frecuentes si la IA falla, límite de mensajes por sesión y derivación a un asesor cuando no sabe), **modo holograma** (`/holograma/<proyecto>`).
- **Formulario de interés** con consentimiento (Ley 29733): sin consentimiento no se guarda nada; el mismo celular actualiza al mismo lead.
- **Panel del asesor** con login, lista de leads con su historial y estado vacío.
- **Etiqueta «Imagen referencial»** en toda pantalla que muestra la casa. La inmobiliaria vende únicamente el lote.

Qué quedó fuera y por qué: `PRD.md` (alcance) y `PENDIENTES.md` (lo que falta o requiere decisión).

## Cómo ejecutarlo en tu computadora

Requisitos: **Node.js 24** o superior y una cuenta de Neon (base de datos PostgreSQL).

```bash
npm install                  # instala las dependencias
# crea un archivo .env.local con las variables de la sección siguiente (nunca se sube a git)
npm run db:prueba            # crea las tablas y los datos de ejemplo en la rama de pruebas
npm run asesores:prueba      # crea el asesor de prueba (usa ASESOR_1_USUARIO y ASESOR_1_CLAVE)
npm run dev                  # abre http://localhost:3000
```

### Variables de entorno

Van en `.env.local` y en Vercel; **nunca en el código ni en git**.

| Variable | Para qué sirve |
|---|---|
| `DATABASE_URL` | Base de datos de la demo (Neon). |
| `DATABASE_URL_TEST` | Rama de pruebas de Neon: las pruebas y el trabajo local usan solo esta. |
| `AUTH_SECRET` | Firma de la sesión del asesor. |
| `COOKIE_SECRET` | Firma de las cookies de canal de origen y contador del asistente. |
| `IP_HASH_SECRET` | Convierte la IP en un hash para los límites de uso (no se guarda la IP real). |
| `GEMINI_API_KEY` | Clave de Gemini (capa gratuita); solo se usa desde el servidor. |
| `ASESOR_1_USUARIO`, `ASESOR_1_CLAVE` | Usuario y contraseña del asesor que crea `npm run asesores:*`. |
| `GEMINI_MODEL` (opcional) | Modelo de Gemini; por defecto `gemini-3.5-flash-lite`. |
| `SITE_URL` (opcional) | Dirección pública que llevan los códigos QR. |

(Vercel también agrega `VERCEL_OIDC_TOKEN`; la aplicación no lo usa.)

### Comandos útiles

```bash
npm test                      # pruebas unitarias y de integración (Vitest)
npm run test:e2e              # pruebas de extremo a extremo en un navegador real (Playwright)
npm run build                 # compila para producción
npm run db:prueba             # aplica db/schema.sql y db/seed.sql en la rama de pruebas
npm run db:produccion         # lo mismo en la base de la demo (pide cuidado)
npm run asesores:produccion   # crea o actualiza los asesores en la base de la demo
node scripts/evaluar-asistente.mjs [url]    # mide el asistente con la IA real (8 de 10 y 5 de 5)
node scripts/probar-gemini.mjs [modelo ...] # compara modelos de Gemini y su velocidad
```

## Pruebas

- **`npm test`** (Vitest, unas 440 pruebas): reglas de negocio con desarrollo guiado por pruebas (lead, consentimiento, asistente, límites, panel, etiqueta referencial, cabeceras de seguridad, geometría de la maqueta). Usan un Gemini simulado y la rama de pruebas de Neon, **nunca** la clave real ni la base de la demo.
- **`npm run test:e2e`** (Playwright, 3 flujos en un navegador real): catálogo → ficha → plano → lote → formulario → lead guardado; login del asesor → el panel muestra el lead; el asistente responde con el FAQ. El servidor de estas pruebas arranca en el puerto 3112 con la rama de pruebas y **sin** clave de Gemini (resultado repetible). Usa Microsoft Edge ya instalado y necesita `ASESOR_1_USUARIO` y `ASESOR_1_CLAVE` en `.env.local`, con ese asesor creado en la rama de pruebas.
- Lo visual (maqueta 3D, RA, holograma) se verifica a mano; la RA se valida en un celular compatible con ARCore.

## Documentación

| Documento | Contenido |
|---|---|
| [`PRD.md`](PRD.md) | Qué se construye y para quién (fuente de verdad del producto). |
| [`TECH-DESIGN.md`](TECH-DESIGN.md) | Diseño técnico. |
| [`adrs/`](adrs/) | Decisiones de arquitectura (0001–0007). |
| [`BACKLOG.md`](BACKLOG.md) | Lista de trabajo y su avance. |
| [`docs/arquitectura.md`](docs/arquitectura.md) | Diagramas de arquitectura y del flujo del lead. |
| [`SECURITY-REPORT.md`](SECURITY-REPORT.md) | Revisión de seguridad, hallazgos y su estado. |
| [`PENDIENTES.md`](PENDIENTES.md) | Lo que falta o necesita una decisión. |
| [`CREDITOS-3D.md`](CREDITOS-3D.md) | Detalle de los modelos 3D y su licencia. |

## Créditos

### Modelos 3D

Las casas 3D son **solo referenciales**: la inmobiliaria vende únicamente el lote. Los tres modelos son de **Kenney** (kenney.nl), publicados bajo licencia **CC0 1.0** (dominio público; no exige atribución, pero se cita por cortesía) y se obtuvieron en Poly Pizza. Están en `public/modelos/`.

| Proyecto | Modelo | Autor | Licencia | Enlace | Archivo | Peso |
|---|---|---|---|---|---|---|
| Algarrobos de Sunampe | House | Kenney | CC0 1.0 | [poly.pizza/m/7VSVwAg2T3](https://poly.pizza/m/7VSVwAg2T3) | `casa-sunampe.glb` | 28 KB |
| Campiña de Huaral | Two story house | Kenney | CC0 1.0 | [poly.pizza/m/htvFgnVP4d](https://poly.pizza/m/htvFgnVP4d) | `casa-huaral.glb` | 46 KB |
| Jardines del Chira | Two story house | Kenney | CC0 1.0 | [poly.pizza/m/sGgL4Nt7I7](https://poly.pizza/m/sGgL4Nt7I7) | `casa-chira.glb` | 40 KB |

### Software de código abierto

Next.js, React, Tailwind CSS, Neon serverless driver, Zod, jose, bcryptjs, qrcode y gltf-transform (MIT); three.js, react-three-fiber y drei para la maqueta (MIT); `<model-viewer>` de Google (Apache-2.0); Vitest y Playwright (MIT / Apache-2.0).

Las ilustraciones, el logotipo y las imágenes de los proyectos son propios y ficticios.
