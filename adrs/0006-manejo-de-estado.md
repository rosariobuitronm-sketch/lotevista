# ADR 0006: Manejo de estado — la actividad previa al lead vive en el navegador

## Estado

Aceptado

## Contexto

El PRD pide que cada lead incluya las preguntas hechas al asistente y si el cliente usó el 3D o la RA, y que no se guarde ningún lead sin aceptar el tratamiento de datos personales (Ley 29733). Esa actividad ocurre **antes** de que la persona llene el formulario. Lo que alguien escribe en el chat puede contener datos personales sin querer.

## Decisión

Elegida por el Product Owner (opción B):

- **Base de datos (servidor):** única fuente de verdad para proyectos, lotes, FAQ, asesores y leads con su historial.
- **Navegador (temporal):** las preguntas y respuestas del asistente y las marcas "usó 3D" / "usó RA" se guardan solo en el navegador (estado de la página y `sessionStorage`) y se envían **junto con el formulario**, cuando existe el consentimiento. Antes de eso, el servidor no guarda nada personal ni de actividad.
- **Cookies:** (1) cookie firmada de sesión del asistente con el contador de preguntas y el canal de origen (`web`, `qr_sala`, `holograma`, tomado del parámetro de la URL del QR o de la página de holograma); (2) cookie de sesión del asesor (ADR 0004).
- **Consistencia:** el envío del formulario es una sola transacción en el servidor. Un mismo celular actualiza su lead y agrega un interés; el botón se desactiva tras el primer clic y, si llega un segundo envío del mismo lead y proyecto dentro de 10 minutos, el servidor lo fusiona con el anterior en lugar de duplicarlo.
- No se usa ninguna librería de estado global.

## Alternativas consideradas

- **Guardar la actividad en el servidor con una sesión anónima** — conserva la actividad de quien no deja datos, pero guarda información antes del consentimiento y es más difícil de defender ante la Ley 29733.
- **Estado global en el cliente (Redux, Zustand)** — innecesario para un flujo de pocas pantallas.

## Consecuencias

- No se guarda ningún dato antes del consentimiento, lo que facilita cumplir el criterio de 0 leads sin consentimiento.
- Se pierde la actividad de quienes no dejan sus datos (coherente: al asesor solo le importan los leads).
- Si el cliente cierra la pestaña o cambia de dispositivo antes de enviar el formulario, pierde el historial del chat.
- Como las preguntas llegan desde el navegador, el servidor no puede verificar que realmente se hicieron: se validan formato y tamaño (máximo de preguntas y de caracteres) y el panel las muestra siempre como texto escapado.
