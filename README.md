# LoteVista

Visor inmobiliario web en 3D y Realidad Aumentada, con asistente IA y modo holograma, para una inmobiliaria que vende **lotes** (no casas).

> **Todos los datos de este proyecto son ficticios.** No representan a ninguna empresa real.

Estado: en construcción (proyecto final de curso, fecha límite 26 de octubre de 2026). Ver `PRD.md`, `TECH-DESIGN.md` y `BACKLOG.md`.

## Cómo ejecutarlo

Requisitos: Node.js 24 o superior.

```bash
npm install        # instala las dependencias
cp .env.example .env.local   # luego completa los valores (nunca se suben a git)
npm run dev        # abre http://localhost:3000
npm test           # corre las pruebas (Vitest)
npm run build      # compila para producción
```

### Variables de entorno (en `.env.local` y en Vercel; nunca en el código)

`DATABASE_URL` (base de la demo), `DATABASE_URL_TEST` (rama de pruebas de Neon: las pruebas y el trabajo local usan solo esta), `AUTH_SECRET`, `COOKIE_SECRET`, `IP_HASH_SECRET`, `GEMINI_API_KEY`, y opcionales `GEMINI_MODEL` (por defecto `gemini-3.5-flash-lite`) y `SITE_URL` (dirección pública de los QR). Para crear los asesores: `ASESOR_1_USUARIO` y `ASESOR_1_CLAVE`.

### Comandos útiles

```bash
npm run db:prueba            # aplica db/schema.sql y db/seed.sql en la rama de pruebas
npm run db:produccion        # lo mismo en la base de la demo (pide cuidado)
npm run asesores:prueba      # crea los asesores desde las variables ASESOR_n_* (también :produccion)
node scripts/evaluar-asistente.mjs [url]   # mide el asistente con la IA real (8 de 10 y 5 de 5)
node scripts/probar-gemini.mjs [modelo ...] # compara modelos de Gemini y su velocidad
```

Las pruebas automáticas (`npm test`) usan siempre un Gemini simulado y la rama de pruebas de Neon, nunca la clave real ni la base de la demo. La arquitectura y el flujo del lead están en [`docs/arquitectura.md`](docs/arquitectura.md).

### Qué incluye

Catálogo de 3 proyectos con ficha, visor 3D y RA «Ver en tu espacio», plano de lotización referencial, QR por proyecto, asistente Vicha con respaldo de FAQ, modo holograma (`/holograma/<proyecto>`), formulario de interés con consentimiento (Ley 29733) y panel del asesor con login. Los textos legales son borradores pendientes de validación legal.

## Créditos de modelos 3D

Las casas 3D son **solo referenciales**: la inmobiliaria vende únicamente el lote. Los tres modelos son de **Kenney** (kenney.nl), publicados bajo licencia **CC0 1.0** (dominio público; no exige atribución, pero se cita por cortesía) y se obtuvieron en Poly Pizza. Están en `public/modelos/`.

| Proyecto | Modelo | Autor | Licencia | Enlace | Archivo | Peso |
|---|---|---|---|---|---|---|
| Algarrobos de Sunampe | House | Kenney | CC0 1.0 | [poly.pizza/m/7VSVwAg2T3](https://poly.pizza/m/7VSVwAg2T3) | `casa-sunampe.glb` | 28 KB |
| Campiña de Huaral | Two story house | Kenney | CC0 1.0 | [poly.pizza/m/htvFgnVP4d](https://poly.pizza/m/htvFgnVP4d) | `casa-huaral.glb` | 46 KB |
| Jardines del Chira | Two story house | Kenney | CC0 1.0 | [poly.pizza/m/sGgL4Nt7I7](https://poly.pizza/m/sGgL4Nt7I7) | `casa-chira.glb` | 40 KB |

Detalle completo en [`CREDITOS-3D.md`](CREDITOS-3D.md).
