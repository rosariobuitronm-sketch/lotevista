# Créditos de modelos 3D

Las casas 3D de LoteVista son **solo referenciales**: la inmobiliaria vende únicamente el lote y la construcción no forma parte de la oferta. Todos los datos del proyecto son ficticios.

Los tres modelos fueron creados por **Kenney** (https://kenney.nl) y están publicados bajo **Creative Commons CC0 1.0 Universal** (dominio público): se pueden usar, copiar y modificar, incluso con fines comerciales, sin pedir permiso ni dar crédito. Aun así se cita al autor por cortesía y trazabilidad. Texto de la licencia: https://creativecommons.org/publicdomain/zero/1.0/

Los archivos se descargaron de **Poly Pizza** (https://poly.pizza), que los distribuye en formato glTF/GLB. Se usan sin modificar.

| Proyecto | Modelo | Autor | Licencia | Página de origen | Archivo en el repositorio | Peso | Triángulos |
|---|---|---|---|---|---|---|---|
| Algarrobos de Sunampe | House | Kenney | CC0 1.0 | https://poly.pizza/m/7VSVwAg2T3 | `public/modelos/casa-sunampe.glb` | 28,748 bytes | 381 |
| Campiña de Huaral | Two story house | Kenney | CC0 1.0 | https://poly.pizza/m/htvFgnVP4d | `public/modelos/casa-huaral.glb` | 46,944 bytes | 688 |
| Jardines del Chira | Two story house | Kenney | CC0 1.0 | https://poly.pizza/m/sGgL4Nt7I7 | `public/modelos/casa-chira.glb` | 41,344 bytes | 630 |

## Verificación

- Fecha de descarga: 25 de octubre de 2026.
- Los tres archivos son distintos entre sí (huellas SHA-256 diferentes).
- Validados con el validador oficial de Khronos (`gltf-validator`): 0 errores y 0 avisos en los tres. Sin texturas externas; cada `.glb` es autosuficiente.
- Todos pesan menos de 5 MB (el mayor, unos 46 KB).

## Dónde se guardan en la aplicación

Archivo, autor, licencia y fuente de cada modelo están en las columnas `modelo_archivo`, `modelo_autor`, `modelo_licencia` y `modelo_fuente` de la tabla `proyectos` (cargadas por `db/seed.sql`).
