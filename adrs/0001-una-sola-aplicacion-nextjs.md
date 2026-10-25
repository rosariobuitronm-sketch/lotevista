# ADR 0001: Una sola aplicación Next.js para todo el sistema

## Estado

Aceptado

## Contexto

El PRD pide una web pública (catálogo, ficha con 3D/RA, QR, modo holograma, Modo Sala), un panel privado para el asesor, un asistente IA y una base de datos. El equipo es una persona sin experiencia en programación, con un plazo de un día (lunes 26 de octubre de 2026). Restricción del curso: desplegar en Vercel (free tier) con PostgreSQL en Neon.

## Decisión

Un solo proyecto Next.js (App Router) en un único repositorio de GitHub y un único despliegue en Vercel. Las páginas públicas, el panel del asesor (rutas protegidas) y las rutas internas del servidor (leads, asistente, eventos) viven juntos. La clave de Gemini y la conexión a Neon solo se usan en código de servidor.

Elegida por el Product Owner (opción A).

## Alternativas consideradas

- **Web pública y panel como dos aplicaciones** — aísla el panel, pero duplica configuración, despliegue y credenciales; demasiado para un día.
- **Aplicación Next.js + servicio aparte para el asistente IA** — separa la parte más delicada, pero agrega otro despliegue que Vercel ya cubre con rutas de servidor.

## Consecuencias

- Un repositorio, un despliegue y un solo lugar donde buscar errores.
- Los secretos nunca llegan al navegador del cliente.
- Todo vive junto: si el sistema creciera, habría que separar el panel o el asistente más adelante.
