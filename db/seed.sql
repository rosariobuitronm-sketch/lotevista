-- LoteVista: datos demo de "Inmobiliaria Demo S.A.C." (TODOS FICTICIOS).
-- Se puede ejecutar varias veces: actualiza lo que ya existe y no duplica.
-- Las zonas (Sunampe, Huaral, Castilla) son reales; los nombres de proyecto,
-- precios, plazos y demás cifras son inventados.
-- Todo lo marcado con <!-- REVISAR --> lo inventé yo y debe validarlo el Product Owner.

-- =====================================================================
-- Proyecto 1: Algarrobos de Sunampe (Chincha, Ica)
-- =====================================================================
-- <!-- REVISAR --> nombre del proyecto (inventado; podría parecerse al de uno real)
-- <!-- REVISAR --> precios por m² (S/ 310 aprox.), servicios, plazos y financiamiento: todo inventado
-- <!-- REVISAR --> imagen_url: la imagen aún no existe, se cargará más adelante
INSERT INTO proyectos (slug, nombre, departamento, provincia, distrito, descripcion,
                       precio_desde, area_desde, area_hasta, imagen_url,
                       servicios, habilitacion_urbana, financiamiento, entrega)
VALUES (
  'algarrobos-de-sunampe',
  'Algarrobos de Sunampe',
  'Ica', 'Chincha', 'Sunampe',
  'Lotes residenciales en Sunampe, a pocos minutos de Chincha Alta, en una zona tranquila y en crecimiento. Se vende únicamente el lote; la vivienda que se muestra en 3D es solo una ilustración referencial.',
  37200, 120, 200,
  '/proyectos/algarrobos-de-sunampe.jpg',
  'Agua potable, desagüe y electricidad en cada lote.',
  'Habilitación urbana en proceso ante la municipalidad: pistas, veredas y redes de agua, desagüe y luz.',
  'Financiamiento directo con la inmobiliaria: cuota inicial desde el 10 % del precio del lote y el saldo en hasta 60 cuotas mensuales en soles.',
  'Entrega del lote con posesión inmediata al pagar la cuota inicial. Obras de habilitación previstas en 12 meses.'
)
ON CONFLICT (slug) DO UPDATE SET
  nombre = EXCLUDED.nombre, departamento = EXCLUDED.departamento, provincia = EXCLUDED.provincia,
  distrito = EXCLUDED.distrito, descripcion = EXCLUDED.descripcion, precio_desde = EXCLUDED.precio_desde,
  area_desde = EXCLUDED.area_desde, area_hasta = EXCLUDED.area_hasta, imagen_url = EXCLUDED.imagen_url,
  servicios = EXCLUDED.servicios, habilitacion_urbana = EXCLUDED.habilitacion_urbana,
  financiamiento = EXCLUDED.financiamiento, entrega = EXCLUDED.entrega;

-- <!-- REVISAR --> 22 lotes por proyecto (Mz. A, B y C): medidas, precios y estados inventados (área = frente x fondo).
-- Los estados son referenciales, de demostración: no hay disponibilidad en tiempo real. Esquina: +5 % sobre S/ 310 por m².
DELETE FROM lotes WHERE proyecto_id = (SELECT id FROM proyectos WHERE slug = 'algarrobos-de-sunampe');
INSERT INTO lotes (proyecto_id, codigo, manzana, numero, area_m2, frente_m, fondo_m, precio, estado)
SELECT p.id, v.codigo, v.manzana, v.numero, v.area, v.frente, v.fondo, v.precio, v.estado
FROM proyectos p,
     (VALUES
             ('Mz. A - Lt. 1', 'A', 1, 144, 9, 16, 46870, 'disponible'),
             ('Mz. A - Lt. 2', 'A', 2, 120, 8, 15, 37200, 'disponible'),
             ('Mz. A - Lt. 3', 'A', 3, 120, 8, 15, 37200, 'vendido'),
             ('Mz. A - Lt. 4', 'A', 4, 150, 10, 15, 48830, 'disponible'),
             ('Mz. A - Lt. 5', 'A', 5, 200, 10, 20, 65100, 'disponible'),
             ('Mz. A - Lt. 6', 'A', 6, 120, 8, 15, 37200, 'separado'),
             ('Mz. A - Lt. 7', 'A', 7, 135, 9, 15, 41850, 'disponible'),
             ('Mz. A - Lt. 8', 'A', 8, 180, 10, 18, 58590, 'disponible'),
             ('Mz. B - Lt. 1', 'B', 1, 150, 10, 15, 48830, 'vendido'),
             ('Mz. B - Lt. 2', 'B', 2, 144, 9, 16, 44640, 'disponible'),
             ('Mz. B - Lt. 3', 'B', 3, 120, 8, 15, 37200, 'separado'),
             ('Mz. B - Lt. 4', 'B', 4, 135, 9, 15, 43940, 'disponible'),
             ('Mz. B - Lt. 5', 'B', 5, 160, 10, 16, 52080, 'vendido'),
             ('Mz. B - Lt. 6', 'B', 6, 128, 8, 16, 39680, 'disponible'),
             ('Mz. B - Lt. 7', 'B', 7, 120, 8, 15, 37200, 'disponible'),
             ('Mz. B - Lt. 8', 'B', 8, 180, 12, 15, 58590, 'disponible'),
             ('Mz. C - Lt. 1', 'C', 1, 180, 10, 18, 58590, 'disponible'),
             ('Mz. C - Lt. 2', 'C', 2, 144, 9, 16, 44640, 'vendido'),
             ('Mz. C - Lt. 3', 'C', 3, 150, 10, 15, 48830, 'disponible'),
             ('Mz. C - Lt. 4', 'C', 4, 200, 10, 20, 65100, 'separado'),
             ('Mz. C - Lt. 5', 'C', 5, 120, 8, 15, 37200, 'disponible'),
             ('Mz. C - Lt. 6', 'C', 6, 135, 9, 15, 43940, 'disponible')
     ) AS v(codigo, manzana, numero, area, frente, fondo, precio, estado)
WHERE p.slug = 'algarrobos-de-sunampe'
ON CONFLICT (proyecto_id, codigo) DO UPDATE SET
  manzana = EXCLUDED.manzana, numero = EXCLUDED.numero, area_m2 = EXCLUDED.area_m2, frente_m = EXCLUDED.frente_m,
  fondo_m = EXCLUDED.fondo_m, precio = EXCLUDED.precio, estado = EXCLUDED.estado;

-- <!-- REVISAR --> respuestas de FAQ: salen de los datos de arriba, pero hay que validarlas
INSERT INTO faq (proyecto_id, pregunta, respuesta, palabras_clave)
SELECT p.id, v.pregunta, v.respuesta, v.palabras_clave
FROM proyectos p,
     (VALUES
       ('¿Dónde está ubicado el proyecto?',
        'Algarrobos de Sunampe está en el distrito de Sunampe, provincia de Chincha, departamento de Ica, a pocos minutos de Chincha Alta.',
        ARRAY['ubicacion','ubicado','donde','direccion','sunampe','chincha','ica','zona']),
       ('¿Qué servicios tiene el proyecto?',
        'Cada lote cuenta con agua potable, desagüe y electricidad.',
        ARRAY['servicios','agua','desague','luz','electricidad','basicos']),
       ('¿Qué tamaños de lote hay y cuánto cuestan?',
        'Los lotes van de 120 a 200 m². El más económico es de 120 m² (8 x 15 m) a S/ 37,200 y el más grande es de 200 m² (10 x 20 m) a S/ 62,000. En la ficha del proyecto puedes ver todos los lotes referenciales.',
        ARRAY['tamaño','tamanos','metros','m2','area','lote','lotes','precio','cuesta','cuanto','costo','frente','fondo']),
       ('¿Cómo es el financiamiento?',
        'La inmobiliaria ofrece financiamiento directo: cuota inicial desde el 10 % del precio del lote y el saldo en hasta 60 cuotas mensuales en soles.',
        ARRAY['financiamiento','financiar','cuotas','cuota','inicial','credito','pagar','pago','plazo','mensual']),
       ('¿Cuándo me entregan el lote?',
        'La posesión del lote es inmediata al pagar la cuota inicial. Las obras de habilitación están previstas en 12 meses.',
        ARRAY['entrega','entregan','cuando','posesion','plazo','obras','fecha']),
       ('¿La casa que veo en 3D está incluida?',
        'No. La inmobiliaria vende únicamente el lote. La casa en 3D es solo una imagen referencial para que imagines cómo podría verse tu terreno.',
        ARRAY['casa','vivienda','construccion','incluida','incluye','3d','referencial','construir']),
       ('¿El proyecto cuenta con habilitación urbana?',
        'La habilitación urbana está en proceso ante la municipalidad e incluye pistas, veredas y redes de agua, desagüe y luz.',
        ARRAY['habilitacion','urbana','pistas','veredas','municipalidad','obras','tramite']),
       ('¿Cómo hablo con un asesor?',
        'Deja tu nombre, celular y correo en el formulario de interés del proyecto y un asesor se comunicará contigo.',
        ARRAY['asesor','contacto','contactar','llamar','hablar','formulario','telefono','celular'])
     ) AS v(pregunta, respuesta, palabras_clave)
WHERE p.slug = 'algarrobos-de-sunampe'
ON CONFLICT (proyecto_id, pregunta) DO UPDATE SET
  respuesta = EXCLUDED.respuesta, palabras_clave = EXCLUDED.palabras_clave;

-- =====================================================================
-- Proyecto 2: Campiña de Huaral (Huaral, Lima)
-- =====================================================================
-- <!-- REVISAR --> nombre del proyecto (inventado)
-- <!-- REVISAR --> precios por m² (S/ 480 aprox.), servicios, plazos y financiamiento: todo inventado
-- <!-- REVISAR --> imagen_url: la imagen aún no existe, se cargará más adelante
INSERT INTO proyectos (slug, nombre, departamento, provincia, distrito, descripcion,
                       precio_desde, area_desde, area_hasta, imagen_url,
                       servicios, habilitacion_urbana, financiamiento, entrega)
VALUES (
  'campina-de-huaral',
  'Campiña de Huaral',
  'Lima', 'Huaral', 'Huaral',
  'Lotes residenciales en la ciudad de Huaral, con acceso a la carretera Panamericana Norte y cerca de colegios y comercios. Se vende únicamente el lote; la vivienda que se muestra en 3D es solo una ilustración referencial.',
  43200, 90, 200,
  '/proyectos/campina-de-huaral.jpg',
  'Agua potable, desagüe y electricidad en cada lote, con pistas y veredas.',
  'Habilitación urbana aprobada por la municipalidad, con pistas, veredas, parques y redes de agua, desagüe y luz.',
  'Financiamiento directo con la inmobiliaria: cuota inicial desde el 15 % del precio del lote y el saldo en hasta 48 cuotas mensuales en soles.',
  'Entrega del lote en 6 meses desde el pago de la cuota inicial, con minuta de compraventa.'
)
ON CONFLICT (slug) DO UPDATE SET
  nombre = EXCLUDED.nombre, departamento = EXCLUDED.departamento, provincia = EXCLUDED.provincia,
  distrito = EXCLUDED.distrito, descripcion = EXCLUDED.descripcion, precio_desde = EXCLUDED.precio_desde,
  area_desde = EXCLUDED.area_desde, area_hasta = EXCLUDED.area_hasta, imagen_url = EXCLUDED.imagen_url,
  servicios = EXCLUDED.servicios, habilitacion_urbana = EXCLUDED.habilitacion_urbana,
  financiamiento = EXCLUDED.financiamiento, entrega = EXCLUDED.entrega;

-- <!-- REVISAR --> 22 lotes por proyecto (Mz. A, B y C): medidas, precios y estados inventados (área = frente x fondo).
-- Los estados son referenciales, de demostración: no hay disponibilidad en tiempo real. Esquina: +5 % sobre S/ 480 por m².
DELETE FROM lotes WHERE proyecto_id = (SELECT id FROM proyectos WHERE slug = 'campina-de-huaral');
INSERT INTO lotes (proyecto_id, codigo, manzana, numero, area_m2, frente_m, fondo_m, precio, estado)
SELECT p.id, v.codigo, v.manzana, v.numero, v.area, v.frente, v.fondo, v.precio, v.estado
FROM proyectos p,
     (VALUES
             ('Mz. A - Lt. 1', 'A', 1, 105, 7, 15, 52920, 'disponible'),
             ('Mz. A - Lt. 2', 'A', 2, 90, 6, 15, 43200, 'disponible'),
             ('Mz. A - Lt. 3', 'A', 3, 90, 6, 15, 43200, 'vendido'),
             ('Mz. A - Lt. 4', 'A', 4, 120, 8, 15, 60480, 'disponible'),
             ('Mz. A - Lt. 5', 'A', 5, 135, 9, 15, 68040, 'disponible'),
             ('Mz. A - Lt. 6', 'A', 6, 105, 7, 15, 50400, 'separado'),
             ('Mz. A - Lt. 7', 'A', 7, 144, 8, 18, 69120, 'disponible'),
             ('Mz. A - Lt. 8', 'A', 8, 160, 10, 16, 80640, 'disponible'),
             ('Mz. B - Lt. 1', 'B', 1, 120, 8, 15, 60480, 'vendido'),
             ('Mz. B - Lt. 2', 'B', 2, 105, 7, 15, 50400, 'disponible'),
             ('Mz. B - Lt. 3', 'B', 3, 90, 6, 15, 43200, 'separado'),
             ('Mz. B - Lt. 4', 'B', 4, 180, 9, 20, 90720, 'disponible'),
             ('Mz. B - Lt. 5', 'B', 5, 200, 10, 20, 100800, 'vendido'),
             ('Mz. B - Lt. 6', 'B', 6, 160, 8, 20, 76800, 'disponible'),
             ('Mz. B - Lt. 7', 'B', 7, 126, 7, 18, 60480, 'disponible'),
             ('Mz. B - Lt. 8', 'B', 8, 135, 9, 15, 68040, 'disponible'),
             ('Mz. C - Lt. 1', 'C', 1, 144, 8, 18, 72580, 'disponible'),
             ('Mz. C - Lt. 2', 'C', 2, 144, 9, 16, 69120, 'vendido'),
             ('Mz. C - Lt. 3', 'C', 3, 105, 7, 15, 52920, 'disponible'),
             ('Mz. C - Lt. 4', 'C', 4, 200, 10, 20, 100800, 'separado'),
             ('Mz. C - Lt. 5', 'C', 5, 120, 8, 15, 57600, 'disponible'),
             ('Mz. C - Lt. 6', 'C', 6, 105, 7, 15, 52920, 'disponible')
     ) AS v(codigo, manzana, numero, area, frente, fondo, precio, estado)
WHERE p.slug = 'campina-de-huaral'
ON CONFLICT (proyecto_id, codigo) DO UPDATE SET
  manzana = EXCLUDED.manzana, numero = EXCLUDED.numero, area_m2 = EXCLUDED.area_m2, frente_m = EXCLUDED.frente_m,
  fondo_m = EXCLUDED.fondo_m, precio = EXCLUDED.precio, estado = EXCLUDED.estado;

-- <!-- REVISAR --> respuestas de FAQ: salen de los datos de arriba, pero hay que validarlas
INSERT INTO faq (proyecto_id, pregunta, respuesta, palabras_clave)
SELECT p.id, v.pregunta, v.respuesta, v.palabras_clave
FROM proyectos p,
     (VALUES
       ('¿Dónde está ubicado el proyecto?',
        'Campiña de Huaral está en la ciudad de Huaral, provincia de Huaral, departamento de Lima, con acceso a la carretera Panamericana Norte.',
        ARRAY['ubicacion','ubicado','donde','direccion','huaral','lima','zona','panamericana']),
       ('¿Qué servicios tiene el proyecto?',
        'Cada lote cuenta con agua potable, desagüe y electricidad, además de pistas y veredas.',
        ARRAY['servicios','agua','desague','luz','electricidad','basicos','pistas','veredas']),
       ('¿Qué tamaños de lote hay y cuánto cuestan?',
        'Los lotes van de 90 a 200 m². El más económico es de 90 m² (6 x 15 m) a S/ 43,200 y el más grande es de 200 m² (10 x 20 m) a S/ 96,000. En la ficha del proyecto puedes ver todos los lotes referenciales.',
        ARRAY['tamaño','tamanos','metros','m2','area','lote','lotes','precio','cuesta','cuanto','costo','frente','fondo']),
       ('¿Cómo es el financiamiento?',
        'La inmobiliaria ofrece financiamiento directo: cuota inicial desde el 15 % del precio del lote y el saldo en hasta 48 cuotas mensuales en soles.',
        ARRAY['financiamiento','financiar','cuotas','cuota','inicial','credito','pagar','pago','plazo','mensual']),
       ('¿Cuándo me entregan el lote?',
        'El lote se entrega en 6 meses desde el pago de la cuota inicial, con minuta de compraventa.',
        ARRAY['entrega','entregan','cuando','posesion','plazo','minuta','fecha']),
       ('¿La casa que veo en 3D está incluida?',
        'No. La inmobiliaria vende únicamente el lote. La casa en 3D es solo una imagen referencial para que imagines cómo podría verse tu terreno.',
        ARRAY['casa','vivienda','construccion','incluida','incluye','3d','referencial','construir']),
       ('¿El proyecto cuenta con habilitación urbana?',
        'Sí. La habilitación urbana está aprobada por la municipalidad e incluye pistas, veredas, parques y redes de agua, desagüe y luz.',
        ARRAY['habilitacion','urbana','pistas','veredas','parques','municipalidad','aprobada']),
       ('¿Cómo hablo con un asesor?',
        'Deja tu nombre, celular y correo en el formulario de interés del proyecto y un asesor se comunicará contigo.',
        ARRAY['asesor','contacto','contactar','llamar','hablar','formulario','telefono','celular'])
     ) AS v(pregunta, respuesta, palabras_clave)
WHERE p.slug = 'campina-de-huaral'
ON CONFLICT (proyecto_id, pregunta) DO UPDATE SET
  respuesta = EXCLUDED.respuesta, palabras_clave = EXCLUDED.palabras_clave;

-- =====================================================================
-- Proyecto 3: Jardines del Chira (Castilla, Piura)
-- =====================================================================
-- <!-- REVISAR --> nombre del proyecto (inventado)
-- <!-- REVISAR --> precios por m² (S/ 420 aprox.), servicios, plazos y financiamiento: todo inventado
-- <!-- REVISAR --> imagen_url: la imagen aún no existe, se cargará más adelante
INSERT INTO proyectos (slug, nombre, departamento, provincia, distrito, descripcion,
                       precio_desde, area_desde, area_hasta, imagen_url,
                       servicios, habilitacion_urbana, financiamiento, entrega)
VALUES (
  'jardines-del-chira',
  'Jardines del Chira',
  'Piura', 'Piura', 'Castilla',
  'Lotes residenciales en el distrito de Castilla, en Piura, en una zona de rápido crecimiento y con buenas vías de acceso a la ciudad. Se vende únicamente el lote; la vivienda que se muestra en 3D es solo una ilustración referencial.',
  42000, 100, 200,
  '/proyectos/jardines-del-chira.jpg',
  'Agua potable, desagüe y electricidad en cada lote, con áreas verdes comunes.',
  'Habilitación urbana en proceso ante la municipalidad: pistas, veredas, áreas verdes y redes de agua, desagüe y luz.',
  'Financiamiento directo con la inmobiliaria: cuota inicial desde el 10 % del precio del lote y el saldo en hasta 72 cuotas mensuales en soles.',
  'Entrega del lote en 12 meses desde el pago de la cuota inicial, con minuta de compraventa.'
)
ON CONFLICT (slug) DO UPDATE SET
  nombre = EXCLUDED.nombre, departamento = EXCLUDED.departamento, provincia = EXCLUDED.provincia,
  distrito = EXCLUDED.distrito, descripcion = EXCLUDED.descripcion, precio_desde = EXCLUDED.precio_desde,
  area_desde = EXCLUDED.area_desde, area_hasta = EXCLUDED.area_hasta, imagen_url = EXCLUDED.imagen_url,
  servicios = EXCLUDED.servicios, habilitacion_urbana = EXCLUDED.habilitacion_urbana,
  financiamiento = EXCLUDED.financiamiento, entrega = EXCLUDED.entrega;

-- <!-- REVISAR --> 22 lotes por proyecto (Mz. A, B y C): medidas, precios y estados inventados (área = frente x fondo).
-- Los estados son referenciales, de demostración: no hay disponibilidad en tiempo real. Esquina: +5 % sobre S/ 420 por m².
DELETE FROM lotes WHERE proyecto_id = (SELECT id FROM proyectos WHERE slug = 'jardines-del-chira');
INSERT INTO lotes (proyecto_id, codigo, manzana, numero, area_m2, frente_m, fondo_m, precio, estado)
SELECT p.id, v.codigo, v.manzana, v.numero, v.area, v.frente, v.fondo, v.precio, v.estado
FROM proyectos p,
     (VALUES
             ('Mz. A - Lt. 1', 'A', 1, 100, 10, 10, 44100, 'disponible'),
             ('Mz. A - Lt. 2', 'A', 2, 100, 10, 10, 42000, 'disponible'),
             ('Mz. A - Lt. 3', 'A', 3, 120, 8, 15, 50400, 'vendido'),
             ('Mz. A - Lt. 4', 'A', 4, 150, 10, 15, 66150, 'disponible'),
             ('Mz. A - Lt. 5', 'A', 5, 180, 9, 20, 79380, 'disponible'),
             ('Mz. A - Lt. 6', 'A', 6, 135, 9, 15, 56700, 'separado'),
             ('Mz. A - Lt. 7', 'A', 7, 140, 10, 14, 58800, 'disponible'),
             ('Mz. A - Lt. 8', 'A', 8, 120, 10, 12, 52920, 'disponible'),
             ('Mz. B - Lt. 1', 'B', 1, 126, 9, 14, 55570, 'vendido'),
             ('Mz. B - Lt. 2', 'B', 2, 112, 8, 14, 47040, 'disponible'),
             ('Mz. B - Lt. 3', 'B', 3, 150, 10, 15, 63000, 'separado'),
             ('Mz. B - Lt. 4', 'B', 4, 200, 10, 20, 88200, 'disponible'),
             ('Mz. B - Lt. 5', 'B', 5, 120, 8, 15, 52920, 'vendido'),
             ('Mz. B - Lt. 6', 'B', 6, 180, 9, 20, 75600, 'disponible'),
             ('Mz. B - Lt. 7', 'B', 7, 140, 10, 14, 58800, 'disponible'),
             ('Mz. B - Lt. 8', 'B', 8, 112, 8, 14, 49390, 'disponible'),
             ('Mz. C - Lt. 1', 'C', 1, 150, 10, 15, 66150, 'disponible'),
             ('Mz. C - Lt. 2', 'C', 2, 135, 9, 15, 56700, 'vendido'),
             ('Mz. C - Lt. 3', 'C', 3, 120, 10, 12, 52920, 'disponible'),
             ('Mz. C - Lt. 4', 'C', 4, 200, 10, 20, 88200, 'separado'),
             ('Mz. C - Lt. 5', 'C', 5, 120, 8, 15, 50400, 'disponible'),
             ('Mz. C - Lt. 6', 'C', 6, 126, 9, 14, 55570, 'disponible')
     ) AS v(codigo, manzana, numero, area, frente, fondo, precio, estado)
WHERE p.slug = 'jardines-del-chira'
ON CONFLICT (proyecto_id, codigo) DO UPDATE SET
  manzana = EXCLUDED.manzana, numero = EXCLUDED.numero, area_m2 = EXCLUDED.area_m2, frente_m = EXCLUDED.frente_m,
  fondo_m = EXCLUDED.fondo_m, precio = EXCLUDED.precio, estado = EXCLUDED.estado;

-- <!-- REVISAR --> respuestas de FAQ: salen de los datos de arriba, pero hay que validarlas
INSERT INTO faq (proyecto_id, pregunta, respuesta, palabras_clave)
SELECT p.id, v.pregunta, v.respuesta, v.palabras_clave
FROM proyectos p,
     (VALUES
       ('¿Dónde está ubicado el proyecto?',
        'Jardines del Chira está en el distrito de Castilla, provincia y departamento de Piura, con buenas vías de acceso a la ciudad.',
        ARRAY['ubicacion','ubicado','donde','direccion','castilla','piura','zona']),
       ('¿Qué servicios tiene el proyecto?',
        'Cada lote cuenta con agua potable, desagüe y electricidad. El proyecto tiene además áreas verdes comunes.',
        ARRAY['servicios','agua','desague','luz','electricidad','basicos','areas','verdes','parque']),
       ('¿Qué tamaños de lote hay y cuánto cuestan?',
        'Los lotes van de 100 a 200 m². El más económico es de 100 m² (10 x 10 m) a S/ 42,000 y el más grande es de 200 m² (10 x 20 m) a S/ 84,000. En la ficha del proyecto puedes ver todos los lotes referenciales.',
        ARRAY['tamaño','tamanos','metros','m2','area','lote','lotes','precio','cuesta','cuanto','costo','frente','fondo']),
       ('¿Cómo es el financiamiento?',
        'La inmobiliaria ofrece financiamiento directo: cuota inicial desde el 10 % del precio del lote y el saldo en hasta 72 cuotas mensuales en soles.',
        ARRAY['financiamiento','financiar','cuotas','cuota','inicial','credito','pagar','pago','plazo','mensual']),
       ('¿Cuándo me entregan el lote?',
        'El lote se entrega en 12 meses desde el pago de la cuota inicial, con minuta de compraventa.',
        ARRAY['entrega','entregan','cuando','posesion','plazo','minuta','fecha']),
       ('¿La casa que veo en 3D está incluida?',
        'No. La inmobiliaria vende únicamente el lote. La casa en 3D es solo una imagen referencial para que imagines cómo podría verse tu terreno.',
        ARRAY['casa','vivienda','construccion','incluida','incluye','3d','referencial','construir']),
       ('¿El proyecto cuenta con habilitación urbana?',
        'La habilitación urbana está en proceso ante la municipalidad e incluye pistas, veredas, áreas verdes y redes de agua, desagüe y luz.',
        ARRAY['habilitacion','urbana','pistas','veredas','areas','verdes','municipalidad','tramite']),
       ('¿Cómo hablo con un asesor?',
        'Deja tu nombre, celular y correo en el formulario de interés del proyecto y un asesor se comunicará contigo.',
        ARRAY['asesor','contacto','contactar','llamar','hablar','formulario','telefono','celular'])
     ) AS v(pregunta, respuesta, palabras_clave)
WHERE p.slug = 'jardines-del-chira'
ON CONFLICT (proyecto_id, pregunta) DO UPDATE SET
  respuesta = EXCLUDED.respuesta, palabras_clave = EXCLUDED.palabras_clave;

-- =====================================================================
-- Modelos 3D referenciales (ítem 3). Autor, licencia y fuente de cada archivo.
-- Créditos completos en CREDITOS-3D.md y en el README.
-- =====================================================================
UPDATE proyectos AS p SET
  modelo_archivo  = v.archivo,
  modelo_autor    = 'Kenney',
  modelo_licencia = 'CC0 1.0',
  modelo_fuente   = v.fuente
FROM (VALUES
  ('algarrobos-de-sunampe', '/modelos/casa-sunampe.glb', 'https://poly.pizza/m/7VSVwAg2T3'),
  ('campina-de-huaral',     '/modelos/casa-huaral.glb',  'https://poly.pizza/m/htvFgnVP4d'),
  ('jardines-del-chira',    '/modelos/casa-chira.glb',   'https://poly.pizza/m/sGgL4Nt7I7')
) AS v(slug, archivo, fuente)
WHERE p.slug = v.slug;
