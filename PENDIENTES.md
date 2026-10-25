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

*(se va llenando con cada ítem)*
