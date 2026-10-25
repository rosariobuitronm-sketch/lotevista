# ADR 0005: Asistente IA acotado a los datos y resiliencia ante fallas

## Estado

Aceptado

## Contexto

El PRD exige que el asistente responda solo con datos del proyecto guardados en la base de datos, que no invente ni negocie, que derive a un asesor si no sabe, que use un respaldo de FAQ si la IA falla y que tenga límite de mensajes por sesión. La capa gratuita de Gemini tiene límites de uso y puede fallar o tardar. El resto del sistema debe seguir funcionando aunque la IA no.

Decisión delegada por el Product Owner: se aplica la opción más simple y segura. Los mensajes visibles (texto de derivación) se ajustan en la implementación sin cambiar esta decisión.

## Decisión

- Gemini se llama **solo desde `POST /api/asistente`** en el servidor. La clave `GEMINI_API_KEY` y el nombre del modelo (`GEMINI_MODEL`) son variables de entorno.
- En cada pregunta, el servidor lee de la base de datos los datos del proyecto (ficha, lote, financiamiento) y arma una instrucción que obliga a: responder solo con esos datos, no negociar precios ni descuentos, no agendar citas y, si la respuesta no está en los datos, responder con una marca de "no sé" para derivar al asesor.
- La respuesta del modelo se pide en formato estructurado (`{ respuesta, sabe }`) y se valida con Zod. Si `sabe` es falso o el formato es inválido, se muestra el mensaje de derivación a un asesor.
- **Respaldo:** si Gemini falla, agota la cuota o supera 8 segundos, el servidor busca en la tabla `faq` del proyecto (coincidencia por palabras clave). Si no hay coincidencia, muestra la derivación a un asesor. El cliente nunca ve un error técnico.
- **Límite por sesión:** máximo de preguntas por sesión (valor inicial 20, constante configurable), aplicado en el servidor con una cookie firmada que cuenta los mensajes.
- **Límite por IP (decidido por el Product Owner):** además de la cookie, el servidor limita las preguntas por IP en una ventana de 24 horas (500 preguntas, constante configurable; el Product Owner subió el valor inicial de 150 a 500 porque en una sala de ventas o feria muchas personas comparten la misma IP). Solo se guarda un **contador temporal** asociado a la IP convertida en hash (HMAC-SHA256 con el secreto `IP_HASH_SECRET`); no se guarda la IP real ni el contenido de las preguntas. Las filas con más de 24 horas se borran en cada escritura (limpieza perezosa, sin tareas programadas). Protege la cuota gratuita de Gemini sin almacenar datos personales legibles.
- **Aviso visible** en la ventana del asistente: "No compartas datos personales en el chat. Si deseas que te contactemos, usa el formulario."
- **Sin contenido en el servidor:** el servidor no guarda las preguntas ni las respuestas; el navegador las conserva y las envía junto al formulario de lead (ADR 0006).
- Las pruebas usan un Gemini simulado (mock), nunca la clave real.

## Alternativas consideradas

- **Enviar al modelo todos los proyectos y dejar que él elija** — más simple, pero aumenta el riesgo de mezclar datos entre proyectos y gasta más cuota.
- **Solo FAQ, sin IA** — es lo más robusto, pero incumple el diferenciador clave que el Product Owner quiere proteger.
- **Búsqueda semántica con embeddings** — mejor recuperación, pero demasiado para un día.

## Consecuencias

- El asistente no puede salirse de los datos que el servidor le entrega, y la derivación es el camino por defecto ante la duda.
- La cookie es fácil de saltar borrándola; el límite por IP lo cubre, pero en una sala de ventas o feria muchas personas comparten una IP y podrían agotar el límite: por eso el valor inicial es alto (500) y configurable. Un límite tan alto protege menos la cuota gratuita de Gemini, que sigue siendo el tope real.
- El hash de IP sigue siendo un dato derivado de la IP: se mantiene solo 24 horas y sin contenido asociado, pero en un producto real habría que mencionarlo en la política de privacidad.
- La coincidencia por palabras clave del FAQ es simple y puede fallar con frases poco usuales; en ese caso se deriva al asesor.
- Si Google cambia el modelo o la API, solo se toca `GEMINI_MODEL` o una función.
