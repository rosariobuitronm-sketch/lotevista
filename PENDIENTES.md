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
