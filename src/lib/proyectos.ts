import { getSql } from "@/lib/db";

// Todas las funciones reciben la conexión como parámetro (por defecto la de la aplicación),
// así las pruebas usan la rama de pruebas de Neon y nunca la base de la demo.
export type Sql = ReturnType<typeof getSql>;

export type Proyecto = {
  id: number;
  slug: string;
  nombre: string;
  departamento: string;
  provincia: string;
  distrito: string;
  descripcion: string;
  precioDesde: number;
  areaDesde: number;
  areaHasta: number;
  imagenUrl: string;
  servicios: string;
  habilitacionUrbana: string;
  financiamiento: string;
  entrega: string;
  modeloArchivo: string | null;
  modeloAutor: string | null;
  modeloLicencia: string | null;
  modeloFuente: string | null;
};

export type EstadoLote = "disponible" | "separado" | "vendido";

export type Lote = {
  /** Texto del plano, por ejemplo "Mz. A - Lt. 5". */
  codigo: string;
  manzana: string;
  numero: number;
  /** Estado referencial de demostración (no es disponibilidad en tiempo real). */
  estado: EstadoLote;
  areaM2: number;
  frenteM: number;
  fondoM: number;
  precio: number;
};

export type Faq = {
  pregunta: string;
  respuesta: string;
  palabrasClave: string[];
};

export type ProyectoDetalle = Proyecto & { lotes: Lote[]; faq: Faq[] };

const SLUG_VALIDO = /^[a-z0-9-]{1,80}$/;

// El controlador de Neon devuelve los campos numeric como texto: se convierten aquí.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- fila cruda de la base de datos
const aProyecto = (f: Record<string, any>): Proyecto => ({
  id: Number(f.id),
  slug: f.slug,
  nombre: f.nombre,
  departamento: f.departamento,
  provincia: f.provincia,
  distrito: f.distrito,
  descripcion: f.descripcion,
  precioDesde: Number(f.precio_desde),
  areaDesde: Number(f.area_desde),
  areaHasta: Number(f.area_hasta),
  imagenUrl: f.imagen_url,
  servicios: f.servicios,
  habilitacionUrbana: f.habilitacion_urbana,
  financiamiento: f.financiamiento,
  entrega: f.entrega,
  modeloArchivo: f.modelo_archivo ?? null,
  modeloAutor: f.modelo_autor ?? null,
  modeloLicencia: f.modelo_licencia ?? null,
  modeloFuente: f.modelo_fuente ?? null,
});

export async function listarProyectos(sql: Sql = getSql()): Promise<Proyecto[]> {
  const filas = await sql`SELECT * FROM proyectos ORDER BY id`;
  return filas.map(aProyecto);
}

export async function obtenerProyecto(slug: string, sql: Sql = getSql()): Promise<ProyectoDetalle | null> {
  if (!SLUG_VALIDO.test(slug)) return null;

  const [fila] = await sql`SELECT * FROM proyectos WHERE slug = ${slug}`;
  if (!fila) return null;

  const [lotes, faq] = await Promise.all([
    sql`SELECT codigo, manzana, numero, estado, area_m2, frente_m, fondo_m, precio FROM lotes
        WHERE proyecto_id = ${fila.id} ORDER BY manzana, numero`,
    sql`SELECT pregunta, respuesta, palabras_clave FROM faq WHERE proyecto_id = ${fila.id} ORDER BY id`,
  ]);

  return {
    ...aProyecto(fila),
    lotes: lotes.map((l) => ({
      codigo: l.codigo,
      manzana: l.manzana,
      numero: Number(l.numero),
      estado: l.estado,
      areaM2: Number(l.area_m2),
      frenteM: Number(l.frente_m),
      fondoM: Number(l.fondo_m),
      precio: Number(l.precio),
    })),
    faq: faq.map((f) => ({ pregunta: f.pregunta, respuesta: f.respuesta, palabrasClave: f.palabras_clave ?? [] })),
  };
}
