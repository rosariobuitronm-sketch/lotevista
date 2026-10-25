-- LoteVista: esquema de base de datos (ADR 0007). Se puede ejecutar varias veces sin error.
-- No existe ninguna columna de DNI (no se pide en ningún formulario).

CREATE TABLE IF NOT EXISTS proyectos (
  id                  serial PRIMARY KEY,
  slug                text NOT NULL UNIQUE,
  nombre              text NOT NULL,
  departamento        text NOT NULL,
  provincia           text NOT NULL,
  distrito            text NOT NULL,
  descripcion         text NOT NULL,
  precio_desde        numeric(12,2) NOT NULL CHECK (precio_desde > 0),
  area_desde          numeric(7,2)  NOT NULL CHECK (area_desde > 0),
  area_hasta          numeric(7,2)  NOT NULL CHECK (area_hasta >= area_desde),
  imagen_url          text NOT NULL,
  servicios           text NOT NULL,
  habilitacion_urbana text NOT NULL,
  financiamiento      text NOT NULL,
  entrega             text NOT NULL,
  -- Modelo 3D referencial y su atribución de licencia (se cargan en el ítem 3)
  modelo_archivo      text,
  modelo_autor        text,
  modelo_licencia     text,
  modelo_fuente       text,
  creado_en           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lotes (
  id          serial PRIMARY KEY,
  proyecto_id integer NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  codigo      text NOT NULL,
  area_m2     numeric(7,2)  NOT NULL CHECK (area_m2 > 0),
  frente_m    numeric(6,2)  NOT NULL CHECK (frente_m > 0),
  fondo_m     numeric(6,2)  NOT NULL CHECK (fondo_m > 0),
  precio      numeric(12,2) NOT NULL CHECK (precio > 0),
  UNIQUE (proyecto_id, codigo)
);

CREATE TABLE IF NOT EXISTS faq (
  id             serial PRIMARY KEY,
  proyecto_id    integer NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  pregunta       text NOT NULL,
  respuesta      text NOT NULL,
  palabras_clave text[] NOT NULL DEFAULT '{}',
  UNIQUE (proyecto_id, pregunta)
);

CREATE TABLE IF NOT EXISTS asesores (
  id            serial PRIMARY KEY,
  usuario       text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  creado_en     timestamptz NOT NULL DEFAULT now()
);

-- Una fila por persona; el celular (9 dígitos, solo números) la identifica.
CREATE TABLE IF NOT EXISTS leads (
  id                       serial PRIMARY KEY,
  celular                  text NOT NULL UNIQUE CHECK (celular ~ '^[0-9]{9}$'),
  nombre                   text NOT NULL,
  correo                   text NOT NULL,
  horario_preferido        text,
  consentimiento_aceptado  boolean NOT NULL CHECK (consentimiento_aceptado),
  consentimiento_fecha     timestamptz NOT NULL,
  consentimiento_version   text NOT NULL,
  creado_en                timestamptz NOT NULL DEFAULT now(),
  ultimo_contacto          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_intereses (
  id            serial PRIMARY KEY,
  lead_id       integer NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  proyecto_id   integer NOT NULL REFERENCES proyectos(id),
  canal_origen  text NOT NULL CHECK (canal_origen IN ('web', 'qr_sala', 'holograma')),
  uso_3d        boolean NOT NULL DEFAULT false,
  uso_ra        boolean NOT NULL DEFAULT false,
  creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_preguntas (
  id               serial PRIMARY KEY,
  lead_id          integer NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  proyecto_id      integer NOT NULL REFERENCES proyectos(id),
  pregunta         text NOT NULL,
  respuesta        text NOT NULL,
  asistente_sabia  boolean NOT NULL DEFAULT true,
  creado_en        timestamptz NOT NULL DEFAULT now()
);

-- Bloqueo por intentos fallidos de login (ADR 0004)
CREATE TABLE IF NOT EXISTS intentos_login (
  usuario            text PRIMARY KEY,
  intentos_fallidos  integer NOT NULL DEFAULT 0,
  bloqueado_hasta    timestamptz
);

-- Contador temporal por IP para el asistente (ADR 0005); se purga pasadas 24 horas
CREATE TABLE IF NOT EXISTS limite_ip (
  ip_hash         text PRIMARY KEY,
  ventana_inicio  timestamptz NOT NULL DEFAULT now(),
  contador        integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_lotes_proyecto          ON lotes (proyecto_id);
CREATE INDEX IF NOT EXISTS idx_faq_proyecto            ON faq (proyecto_id);
CREATE INDEX IF NOT EXISTS idx_lead_intereses_lead     ON lead_intereses (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_intereses_proyecto ON lead_intereses (proyecto_id);
CREATE INDEX IF NOT EXISTS idx_lead_preguntas_lead     ON lead_preguntas (lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_ultimo_contacto   ON leads (ultimo_contacto DESC);
