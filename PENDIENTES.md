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
