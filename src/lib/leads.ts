import type { Pool } from "@neondatabase/serverless";
import type { DatosLead } from "@/lib/lead-schema";

// ADR 0006 y 0007: un celular = una persona. Guardar un lead es UNA transacción:
// crea o actualiza el lead, suma (o fusiona) el interés en el proyecto y agrega las preguntas del chat.
// Nunca se borra nada del historial.

export type CanalOrigen = "web" | "qr_sala" | "holograma";

/** Dos envíos del mismo lead y proyecto dentro de esta ventana se fusionan. */
export const VENTANA_FUSION_MINUTOS = 10;

export class ProyectoInexistenteError extends Error {
  constructor() {
    super("El proyecto no existe");
    this.name = "ProyectoInexistenteError";
  }
}

export type ResultadoGuardado = { leadId: number; nuevo: boolean; fusionado: boolean };

type Opciones = {
  canal: CanalOrigen;
  versionConsentimiento: string;
  /** Hora de referencia (se inyecta en las pruebas para simular el paso del tiempo). */
  ahora?: Date;
};

export async function guardarLead(pool: Pool, datos: DatosLead, opciones: Opciones): Promise<ResultadoGuardado> {
  // Defensa en profundidad: aunque la validación ya lo exige, sin consentimiento no se toca la base.
  if (datos.consentimiento !== true) {
    throw new Error("No se puede guardar un lead sin consentimiento");
  }
  const ahora = opciones.ahora ?? new Date();

  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");

    const proyecto = await cliente.query("SELECT id FROM proyectos WHERE slug = $1", [datos.proyecto]);
    if (proyecto.rows.length === 0) throw new ProyectoInexistenteError();
    const proyectoId: number = proyecto.rows[0].id;

    // Si el celular ya existe solo se actualiza el último contacto y el horario (si llegó uno nuevo).
    // La fila queda bloqueada hasta el COMMIT, así dos envíos simultáneos se ordenan solos.
    const upsert = await cliente.query(
      `INSERT INTO leads (celular, nombre, correo, horario_preferido,
                          consentimiento_aceptado, consentimiento_fecha, consentimiento_version,
                          creado_en, ultimo_contacto)
       VALUES ($1, $2, $3, $4, true, $5, $6, $5, $5)
       ON CONFLICT (celular) DO UPDATE SET
         ultimo_contacto   = EXCLUDED.ultimo_contacto,
         horario_preferido = COALESCE(EXCLUDED.horario_preferido, leads.horario_preferido)
       RETURNING id, (xmax = 0) AS nuevo`,
      [datos.celular, datos.nombre, datos.correo, datos.horario ?? null, ahora, opciones.versionConsentimiento],
    );
    const leadId: number = upsert.rows[0].id;
    const nuevo: boolean = upsert.rows[0].nuevo;

    // ¿Hay un interés reciente en este mismo proyecto? Entonces se fusiona en vez de duplicar.
    const reciente = await cliente.query(
      `SELECT id FROM lead_intereses
       WHERE lead_id = $1 AND proyecto_id = $2
         AND creado_en > $3::timestamptz - make_interval(mins => $4)
       ORDER BY creado_en DESC LIMIT 1`,
      [leadId, proyectoId, ahora, VENTANA_FUSION_MINUTOS],
    );
    const fusionado = reciente.rows.length > 0;
    if (fusionado) {
      await cliente.query(
        `UPDATE lead_intereses SET uso_3d = uso_3d OR $2, uso_ra = uso_ra OR $3, lote = COALESCE($4, lote) WHERE id = $1`,
        [reciente.rows[0].id, datos.uso3d, datos.usoRa, datos.lote ?? null],
      );
    } else {
      await cliente.query(
        `INSERT INTO lead_intereses (lead_id, proyecto_id, canal_origen, uso_3d, uso_ra, lote, creado_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [leadId, proyectoId, opciones.canal, datos.uso3d, datos.usoRa, datos.lote ?? null, ahora],
      );
    }

    // Las preguntas se agregan al historial; las que ya se guardaron hace poco no se repiten.
    for (const p of datos.preguntas) {
      await cliente.query(
        `INSERT INTO lead_preguntas (lead_id, proyecto_id, pregunta, respuesta, asistente_sabia, creado_en)
         SELECT $1, $2, $3, $4, $5, $6
         WHERE NOT EXISTS (
           SELECT 1 FROM lead_preguntas
           WHERE lead_id = $1 AND proyecto_id = $2 AND pregunta = $3 AND respuesta = $4
             AND creado_en > $6::timestamptz - make_interval(mins => $7)
         )`,
        [leadId, proyectoId, p.pregunta, p.respuesta, p.sabe, ahora, VENTANA_FUSION_MINUTOS],
      );
    }

    await cliente.query("COMMIT");
    return { leadId, nuevo, fusionado };
  } catch (error) {
    await cliente.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    cliente.release();
  }
}
