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

-- <!-- REVISAR --> códigos de lote, medidas y precios inventados (área = frente x fondo)
INSERT INTO lotes (proyecto_id, codigo, area_m2, frente_m, fondo_m, precio)
SELECT p.id, v.codigo, v.area, v.frente, v.fondo, v.precio
FROM proyectos p,
     (VALUES ('A-01', 120, 8, 15, 37200),
             ('A-07', 120, 8, 15, 37200),
             ('B-05', 144, 9, 16, 44640),
             ('C-03', 150, 10, 15, 46500),
             ('D-08', 200, 10, 20, 62000)) AS v(codigo, area, frente, fondo, precio)
WHERE p.slug = 'algarrobos-de-sunampe'
ON CONFLICT (proyecto_id, codigo) DO UPDATE SET
  area_m2 = EXCLUDED.area_m2, frente_m = EXCLUDED.frente_m, fondo_m = EXCLUDED.fondo_m, precio = EXCLUDED.precio;

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

-- <!-- REVISAR --> códigos de lote, medidas y precios inventados (área = frente x fondo)
INSERT INTO lotes (proyecto_id, codigo, area_m2, frente_m, fondo_m, precio)
SELECT p.id, v.codigo, v.area, v.frente, v.fondo, v.precio
FROM proyectos p,
     (VALUES ('A-01', 90, 6, 15, 43200),
             ('A-09', 105, 7, 15, 50400),
             ('B-04', 120, 8, 15, 57600),
             ('C-02', 160, 8, 20, 76800),
             ('D-06', 200, 10, 20, 96000)) AS v(codigo, area, frente, fondo, precio)
WHERE p.slug = 'campina-de-huaral'
ON CONFLICT (proyecto_id, codigo) DO UPDATE SET
  area_m2 = EXCLUDED.area_m2, frente_m = EXCLUDED.frente_m, fondo_m = EXCLUDED.fondo_m, precio = EXCLUDED.precio;

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

-- <!-- REVISAR --> códigos de lote, medidas y precios inventados (área = frente x fondo)
INSERT INTO lotes (proyecto_id, codigo, area_m2, frente_m, fondo_m, precio)
SELECT p.id, v.codigo, v.area, v.frente, v.fondo, v.precio
FROM proyectos p,
     (VALUES ('A-03', 100, 10, 10, 42000),
             ('B-01', 120, 8, 15, 50400),
             ('B-10', 150, 10, 15, 63000),
             ('C-05', 180, 9, 20, 75600),
             ('D-02', 200, 10, 20, 84000)) AS v(codigo, area, frente, fondo, precio)
WHERE p.slug = 'jardines-del-chira'
ON CONFLICT (proyecto_id, codigo) DO UPDATE SET
  area_m2 = EXCLUDED.area_m2, frente_m = EXCLUDED.frente_m, fondo_m = EXCLUDED.fondo_m, precio = EXCLUDED.precio;

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
