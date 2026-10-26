import { requerirSesion } from "@/lib/auth";
import type { CanalOrigen } from "@/lib/leads";
import type { Sql } from "@/lib/proyectos";

// Datos del panel del asesor (ADR 0003 y 0007). Solo se leen después de comprobar la sesión.

export type InteresPanel = {
  proyecto: string;
  slug: string;
  canal: CanalOrigen;
  uso3d: boolean;
  usoRa: boolean;
  /** Lote del plano por el que preguntó, si lo eligió. */
  lote: string | null;
  fecha: string;
};

export type PreguntaPanel = { proyecto: string; pregunta: string; respuesta: string; sabe: boolean; fecha: string };

export type LeadPanel = {
  id: number;
  nombre: string;
  celular: string;
  correo: string;
  horario: string | null;
  creadoEn: string;
  ultimoContacto: string;
  intereses: InteresPanel[];
  preguntas: PreguntaPanel[];
};

export type ProyectoFiltro = { slug: string; nombre: string };

const SLUG_VALIDO = /^[a-z0-9-]{1,80}$/;
export const esSlugValido = (valor: string) => SLUG_VALIDO.test(valor);

const LIMITE_LEADS = 500;
const aIso = (v: unknown) => new Date(v as string).toISOString();

export async function listarLeads(sql: Sql, opciones: { proyecto?: string } = {}): Promise<LeadPanel[]> {
  const proyecto = opciones.proyecto && esSlugValido(opciones.proyecto) ? opciones.proyecto : null;
  if (opciones.proyecto && !proyecto) return [];

  const filas = await sql`
    SELECT l.id, l.nombre, l.celular, l.correo, l.horario_preferido, l.creado_en, l.ultimo_contacto,
      COALESCE((
        SELECT json_agg(json_build_object(
                 'proyecto', p.nombre, 'slug', p.slug, 'canal', i.canal_origen,
                 'uso3d', i.uso_3d, 'usoRa', i.uso_ra, 'lote', i.lote, 'fecha', i.creado_en) ORDER BY i.creado_en DESC, i.id DESC)
        FROM lead_intereses i JOIN proyectos p ON p.id = i.proyecto_id
        WHERE i.lead_id = l.id), '[]'::json) AS intereses,
      COALESCE((
        SELECT json_agg(json_build_object(
                 'proyecto', p.nombre, 'pregunta', q.pregunta, 'respuesta', q.respuesta,
                 'sabe', q.asistente_sabia, 'fecha', q.creado_en) ORDER BY q.creado_en, q.id)
        FROM lead_preguntas q JOIN proyectos p ON p.id = q.proyecto_id
        WHERE q.lead_id = l.id), '[]'::json) AS preguntas
    FROM leads l
    WHERE ${proyecto}::text IS NULL OR EXISTS (
      SELECT 1 FROM lead_intereses i JOIN proyectos p ON p.id = i.proyecto_id
      WHERE i.lead_id = l.id AND p.slug = ${proyecto}::text)
    ORDER BY l.ultimo_contacto DESC, l.id DESC
    LIMIT ${LIMITE_LEADS}`;

  return filas.map((f) => ({
    id: Number(f.id),
    nombre: f.nombre,
    celular: f.celular,
    correo: f.correo,
    horario: f.horario_preferido ?? null,
    creadoEn: aIso(f.creado_en),
    ultimoContacto: aIso(f.ultimo_contacto),
    intereses: f.intereses,
    preguntas: f.preguntas,
  }));
}

export async function listarProyectosFiltro(sql: Sql): Promise<ProyectoFiltro[]> {
  const filas = await sql`SELECT slug, nombre FROM proyectos ORDER BY id`;
  return filas.map((f) => ({ slug: f.slug, nombre: f.nombre }));
}

export type ResultadoPanel =
  | { autorizado: false }
  | { autorizado: true; usuario: string; leads: LeadPanel[]; proyectos: ProyectoFiltro[] };

/** Comprueba la sesión PRIMERO: sin sesión válida no se hace ninguna consulta a la base de datos. */
export async function obtenerPanel(args: {
  token: string | undefined;
  secreto: string | undefined;
  proyecto?: string;
  sql: Sql;
}): Promise<ResultadoPanel> {
  const sesion = await requerirSesion(args.token, args.secreto);
  if (!sesion) return { autorizado: false };
  const [leads, proyectos] = await Promise.all([
    listarLeads(args.sql, { proyecto: args.proyecto }),
    listarProyectosFiltro(args.sql),
  ]);
  return { autorizado: true, usuario: sesion.usuario, leads, proyectos };
}
