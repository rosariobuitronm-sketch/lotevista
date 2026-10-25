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

## Créditos de modelos 3D

Las casas 3D son **solo referenciales**: la inmobiliaria vende únicamente el lote. Los tres modelos son de **Kenney** (kenney.nl), publicados bajo licencia **CC0 1.0** (dominio público; no exige atribución, pero se cita por cortesía) y se obtuvieron en Poly Pizza. Están en `public/modelos/`.

| Proyecto | Modelo | Autor | Licencia | Enlace | Archivo | Peso |
|---|---|---|---|---|---|---|
| Algarrobos de Sunampe | House | Kenney | CC0 1.0 | [poly.pizza/m/7VSVwAg2T3](https://poly.pizza/m/7VSVwAg2T3) | `casa-sunampe.glb` | 28 KB |
| Campiña de Huaral | Two story house | Kenney | CC0 1.0 | [poly.pizza/m/htvFgnVP4d](https://poly.pizza/m/htvFgnVP4d) | `casa-huaral.glb` | 46 KB |
| Jardines del Chira | Two story house | Kenney | CC0 1.0 | [poly.pizza/m/sGgL4Nt7I7](https://poly.pizza/m/sGgL4Nt7I7) | `casa-chira.glb` | 40 KB |

Detalle completo en [`CREDITOS-3D.md`](CREDITOS-3D.md).
