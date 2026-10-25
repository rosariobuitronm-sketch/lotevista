---
title: "LoteVista"
---

# PRD: LoteVista

> Borrador estructurado. Los comentarios `<!-- REVISAR -->` marcan supuestos del agente que el Product Owner debe validar.

## Problema

El comprador de un lote no logra imaginar su futuro hogar sobre un terreno vacío. Sus dudas (área, precio, financiamiento, entrega) no se responden fuera de horario, y su interés no queda registrado para el equipo comercial: el asesor anota a los interesados en WhatsApp y los pasa a mano a un Excel o CRM, y muchos se pierden sin saber qué proyecto vieron ni qué preguntaron. Además, las maquetas físicas en sala de ventas son caras y ocupan espacio.

LoteVista es un visor inmobiliario web en 3D y Realidad Aumentada, con asistente IA y modo holograma, para una inmobiliaria que vende **lotes** (no casas). Los datos de la demo son 100 % ficticios.

<!-- REVISAR: no se definió el "por qué ahora" (qué hace urgente resolver esto hoy). Se asume oportunidad tecnológica (visores 3D/RA en navegador, IA de capa gratuita) y el calendario del curso. -->

## Usuario objetivo

- **Principal: cliente interesado.** Adulto de 30 a 50 años que busca su primer terreno para construir su vivienda o como inversión. Casi siempre decide en familia (pareja e hijos o padres). Llega de dos formas: desde el celular, por anuncios en redes sociales o WhatsApp, o presencialmente en la sala de ventas o en ferias, donde se usa el modo holograma. Navega sin iniciar sesión.
- **Secundario: asesor comercial.** Hoy anota a los interesados en WhatsApp y luego los pasa manualmente a un Excel o CRM. Revisa los leads en un panel privado con usuario y contraseña.
- **Anti-personas:** (1) quien cree que está comprando la casa 3D que se muestra (por eso la etiqueta "Imagen referencial"); (2) el curioso sin intención de compra que solo quiere jugar con el 3D.

## Objetivo / resultado esperado

El cliente resuelve sus dudas por sí mismo y a cualquier hora, y el asesor recibe un lead completo.

- **Plazo:** durante la demo del 26 de octubre de 2026; como producto real, el primer mes de uso.
- **Un lead completo incluye:** nombre, celular, correo, proyecto visto, preguntas hechas al asistente, horario preferido de contacto, canal de origen (web, QR en sala de ventas o modo holograma), si usó 3D o RA, fecha y hora de registro y aceptación del tratamiento de datos personales. No se pide DNI.

## Alcance (qué sí incluye esta versión)

**Núcleo (obligatorio):**

1. Catálogo de 3 proyectos ficticios con nombre, ubicación, precio desde, metraje e imagen.
2. Ficha del proyecto con visor 3D (`<model-viewer>` de Google) para girar y acercar una casa modelo sobre el lote, con etiqueta visible "Imagen referencial", datos del lote y financiamiento.
3. Formulario de interés (lead) con nombre, celular, correo y proyecto, con consentimiento de datos personales (Ley 29733). El horario preferido de contacto es opcional. Un mismo celular es la misma persona: se actualiza el lead existente y se agrega el nuevo proyecto y las nuevas preguntas a su historial, con fecha del último contacto.
4. Panel del asesor con usuario y contraseña que muestra leads por proyecto y las preguntas hechas al asistente.

**Diferenciadores (en este orden de prioridad):**

5. Botón "Ver en tu espacio": activa la Realidad Aumentada en celulares compatibles (ARCore/ARKit); en laptop se ve en 3D.
6. QR por proyecto para abrir la ficha en el celular.
7. Asistente IA con Google Gemini (capa gratuita) que responde solo con datos del proyecto guardados en la base de datos y, si no sabe, deriva a un asesor; con respaldo de preguntas frecuentes (FAQ) si la IA falla y límite de mensajes por sesión.
8. Modo holograma: pantalla negra con el modelo 3D mostrado 4 veces (arriba, abajo, izquierda, derecha) girando, para usar con una pirámide holográfica.

**Opcional (se recorta primero):**

9. Modo Sala: pantalla completa para proyector con el modelo 3D girando y un QR.

**Orden de recorte si el tiempo aprieta:** primero el Modo Sala, luego el modo holograma. El asistente IA se protege.

**Reglas de negocio:** se vende el lote, no la construcción; la casa 3D es solo referencial y siempre lleva la etiqueta "Imagen referencial" (evitar publicidad engañosa ante INDECOPI); el asistente no inventa datos; el lead exige aceptar el tratamiento de datos personales; los modelos 3D deben ser gratuitos con licencia libre (CC0 o CC-BY, citando al autor en el README).

**Restricciones del curso:** desplegado en Vercel (free tier), base de datos PostgreSQL en Neon, proyecto greenfield, fecha límite lunes 26 de octubre de 2026.

## No alcance (qué explícitamente no incluye esta versión)

- No incluye pagos, reservas ni separación de lotes en línea.
- No pide DNI ni datos sensibles.
- No incluye integración automática con el CRM.
- No incluye venta ni cotización de la construcción de la casa.
- No incluye RA con marcador para laptop (en laptop solo se ve el 3D).
- No incluye lentes de realidad mixta (Meta Quest con WebXR) ni recorrido VR.
- No incluye maqueta 3D del proyecto completo (solo la casa referencial sobre el lote).
- No incluye asistente por voz.
- No incluye campañas comerciales con IA.
- No incluye integración con la web 3D existente de la empresa.
- No incluye la línea futura "Construye tu casa con nosotros".
- El asistente no agenda citas ni visitas; solo registra interés y horario preferido de contacto.
- No hay registro de clientes con cuenta ni contraseña.
- El panel del asesor no exporta a Excel; solo muestra los leads en pantalla.
- No hay notificaciones automáticas al asesor (correo o WhatsApp) cuando llega un lead.
- No hay plano de lotes con disponibilidad en tiempo real; la ficha muestra datos referenciales.
- No hay simulador de cuotas ni cronograma de pagos; el financiamiento se muestra como texto.
- No hay administración de proyectos desde el panel; los 3 proyectos se cargan como datos de demo.
- El asistente no negocia precios, descuentos ni promociones; solo informa los datos registrados.
- La app está solo en español.

## Criterios de éxito

**Demo del 26 de octubre de 2026:**

- Un cliente puede ir de catálogo → ficha → 3D → lead enviado → lead visible en el panel, sin errores.
- La etiqueta "Imagen referencial" aparece en el 100 % de las pantallas que muestran la casa (ficha, RA, holograma, Modo Sala).
- Un lead sin aceptar el tratamiento de datos personales no se guarda (0 excepciones).
- El panel del asesor no se puede abrir sin usuario y contraseña.
- El asistente responde bien 8 de 10 preguntas de prueba sobre datos del proyecto y, ante 5 preguntas fuera de los datos, deriva a un asesor en las 5 sin inventar.
- Con la IA caída, el respaldo de FAQ responde.
- La RA funciona en al menos 1 celular compatible, y se incluye un video corto de la RA en el repositorio.
- La ficha del proyecto carga en menos de 3 segundos con 4G (percentil 95). <!-- REVISAR: umbral propuesto por el agente, validar con una prueba real. -->

**Primer mes de uso real:**

- El 100 % de los leads llega con proyecto visto y canal de origen.
- Al menos el 5 % de quienes abren una ficha deja un lead (cifra de partida a validar).
- Al menos el 80 % de los leads incluye horario preferido de contacto.
- **Anti-métrica:** las vistas y los giros del 3D no se usan como éxito, porque miden curiosidad y no intención de compra.

## Casos borde a contemplar

1. **IA caída o cuota de Gemini agotada:** responde el respaldo de FAQ; el cliente no ve un error.
2. **Pregunta fuera de los datos, o intento de negociar o inventar:** el asistente deriva a un asesor y no inventa.
3. **Dispositivo sin RA** (laptop, navegador o celular antiguo): se muestra el 3D normal con un aviso claro.
4. **Modelo 3D que falla o tarda** por datos móviles: se muestra la imagen del proyecto y la etiqueta "Imagen referencial" sigue visible.
5. **Formulario con datos inválidos, vacíos o doble clic:** se valida, no se duplica y no se guarda sin consentimiento.
6. **Acceso al panel sin sesión o con credenciales erróneas:** redirige al login y no muestra datos; sin leads, muestra un estado vacío.
7. **Abuso del asistente** (spam o intentos de saltarse sus reglas): límite de mensajes por sesión.
8. **Lead repetido:** el mismo celular se considera la misma persona; se actualiza el lead existente sin borrar lo anterior (historial de proyectos y preguntas, fecha del último contacto).
9. *(Para diseño)* URL o QR de un proyecto inexistente: página amable que lleva al catálogo.

## Supuestos y riesgos abiertos

**Supuestos:**

- El cliente tiene un celular con navegador moderno; la RA requiere un equipo compatible con ARCore/ARKit y es una mejora, no un requisito.
- Existen modelos 3D de casa gratuitos (CC0 o CC-BY) con calidad suficiente. <!-- REVISAR: depende de que se encuentren modelos adecuados. -->
- La capa gratuita de Gemini alcanza para la demo y las pruebas.
- Al cliente le basta con dejar sus datos a cambio de hablar con un asesor.
- Para la demo se usa una pirámide holográfica casera sobre un celular o tablet; en una sala real se usaría una pirámide comercial.
- El asesor entra al panel con frecuencia, porque no hay avisos automáticos.
- Los datos de proyectos, precios y lotes son ficticios y no representan a ninguna empresa real.

**Riesgos (los dos que más preocupan al Product Owner van primero):**

- **Tiempo:** un día para construir 8 ítems. Mitigación: orden de recorte (Modo Sala, luego holograma) y núcleo primero.
- **RA no verificable:** el celular del Product Owner no es compatible con ARCore; hace falta un celular compatible prestado (iPhone o Android con ARCore) para validar y grabar. Mitigación: el profesor puede ver todo en 3D desde su laptop y se incluye un video corto de la RA en el repositorio.
- **Gemini:** cambios de API, límites de uso o lentitud. Mitigación: respaldo de FAQ y límite de mensajes por sesión.
- **Límites gratuitos de Vercel y Neon:** Neon puede suspenderse por inactividad y la primera consulta de la demo puede tardar. Mitigación: abrir la app justo antes de presentar.
- **Publicidad engañosa (INDECOPI):** si falta la etiqueta "Imagen referencial" en alguna pantalla. Mitigación: criterio de éxito del 100 %.
- **Datos personales (Ley 29733):** se guardan nombre, celular y correo. Mitigación: consentimiento obligatorio y no pedir DNI. <!-- REVISAR: para producción real habría que revisar política de privacidad y registro del banco de datos personales. -->
- **Peso de los modelos 3D con datos móviles:** carga lenta. Mitigación: modelos livianos e imagen de respaldo.
- **Leads de curiosos:** pueden ensuciar el panel. Mitigación: el horario preferido y el historial de preguntas ayudan al asesor a distinguir a un cliente serio.
- **Sin avisos automáticos:** el asesor podría tardar en ver un lead nuevo.
- **Licencias CC-BY:** exigen citar al autor en el README.
