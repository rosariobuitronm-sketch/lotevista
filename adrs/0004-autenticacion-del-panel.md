# ADR 0004: Autenticación del panel del asesor

## Estado

Aceptado

## Contexto

El PRD exige un panel privado con usuario y contraseña, sin cuentas de cliente. Los usuarios son de demo. El panel muestra datos personales (nombre, celular, correo), así que no puede abrirse sin sesión. Los secretos nunca van al código ni al repositorio.

Decisión delegada por el Product Owner: se aplica la opción más simple y segura.

## Decisión

- Tabla `asesores` con usuario y **contraseña guardada como hash** (`bcrypt`, con la librería `bcryptjs` y costo 10; la sal propia de cada contraseña queda dentro del mismo hash). Nunca se guarda ni se registra la contraseña en texto plano.
- Al iniciar sesión se emite una cookie `httpOnly`, `secure` y `sameSite=lax` con un token firmado (librería `jose`) que caduca en 8 horas, firmado con `AUTH_SECRET` (variable de entorno).
- Un filtro (proxy de Next.js) redirige a `/panel/login` cualquier acceso a `/panel/*` sin sesión válida, y las rutas `/api/panel/*` responden 401.
- Mensaje de error de login único ("Usuario o contraseña incorrectos"), sin revelar cuál falló.
- **Límite de intentos (decidido por el Product Owner):** tras 5 intentos fallidos seguidos para un mismo usuario, el login queda bloqueado 15 minutos. Se guarda en la tabla `intentos_login` (usuario, intentos, bloqueado hasta); un login correcto reinicia el contador. Mientras está bloqueado se responde con un mensaje de espera, sin revelar si el usuario existe; los usuarios inexistentes también cuentan intentos para no delatar cuáles son válidos.
- Los usuarios de demo se crean con un script que lee las contraseñas de variables de entorno; no hay contraseñas en el código.

## Alternativas consideradas

- **Auth.js / Clerk** — más completas (recuperación de contraseña, proveedores externos), pero agregan configuración y dependencia externa para 1 o 2 usuarios de demo.
- **Contraseña única en variable de entorno** — más simple todavía, pero no permite varios asesores ni cumple "usuario y contraseña" de forma creíble.

- **`scrypt` de Node.js (la opción inicial de este ADR)** — viene incluido en Node y no necesita librería, pero se cambió a `bcrypt` al implementar el ítem 2 por estas razones: `bcryptjs` está escrito en JavaScript puro, sin compilación nativa, así que instala igual en Windows y en Vercel; es un estándar muy conocido y documentado; y guarda sal, costo y hash en un solo texto de 60 caracteres, lo que simplifica la columna `password_hash` y las pruebas. Ambos algoritmos son seguros para este uso.

## Consecuencias

- Seguridad razonable sin servicios externos y fácil de probar con TDD (login correcto, incorrecto y sin sesión).
- El bloqueo frena los intentos de adivinar la contraseña, pero también permite que alguien bloquee a propósito a un asesor real durante 15 minutos escribiendo mal su usuario 5 veces (riesgo aceptado para el MVP).
- No hay recuperación de contraseña en el MVP: si se olvida, se cambia con el script. Los datos de demo son ficticios.
- Crear o cambiar asesores requiere ejecutar un script, no hay pantalla de administración (coherente con el "No alcance").
