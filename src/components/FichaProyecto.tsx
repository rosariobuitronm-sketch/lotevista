import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioInteres } from "@/components/FormularioInteres";
import { VisorCasa } from "@/components/VisorCasa";
import { formatearArea, formatearMetros, formatearRangoArea, formatearSoles } from "@/lib/formato";
import { obtenerProyecto, type ProyectoDetalle } from "@/lib/proyectos";

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-marino/10 bg-white p-4">
      <dt className="text-sm font-semibold text-azul">{titulo}</dt>
      <dd className="mt-1 text-texto">{children}</dd>
    </div>
  );
}

export function FichaProyecto({ proyecto }: { proyecto: ProyectoDetalle }) {
  const ubicacion = `${proyecto.distrito}, ${proyecto.provincia}, ${proyecto.departamento}`;
  return (
    <article className="space-y-8">
      <title>{`${proyecto.nombre} · LoteVista`}</title>
      <div>
        <Link href="/" className="text-sm font-medium text-azul underline-offset-2 hover:underline">
          ← Todos los proyectos
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-marino sm:text-4xl">{proyecto.nombre}</h1>
        <p className="text-lg text-texto/80">{ubicacion}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-label="Casa referencial">
          <VisorCasa nombre={proyecto.nombre} modeloUrl={proyecto.modeloArchivo} imagenUrl={proyecto.imagenUrl} />
        </section>

        <section aria-labelledby="resumen" className="space-y-4">
          <h2 id="resumen" className="sr-only">
            Resumen del proyecto
          </h2>
          <p className="text-lg leading-relaxed">{proyecto.descripcion}</p>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Dato titulo="Precio desde">
              <span className="text-2xl font-extrabold text-marino">{formatearSoles(proyecto.precioDesde)}</span>
            </Dato>
            <Dato titulo="Tamaño de los lotes">
              <span className="text-2xl font-extrabold text-marino">
                {formatearRangoArea(proyecto.areaDesde, proyecto.areaHasta)}
              </span>
            </Dato>
            <Dato titulo="Servicios">{proyecto.servicios}</Dato>
            <Dato titulo="Habilitación urbana">{proyecto.habilitacionUrbana}</Dato>
          </dl>
        </section>
      </div>

      <section aria-labelledby="lotes">
        <h2 id="lotes" className="text-2xl font-bold text-marino">
          Lotes referenciales
        </h2>
        <p className="mb-3 text-sm text-texto/80">
          Se vende únicamente el lote. Las medidas y los precios son referenciales; un asesor te confirmará los datos
          vigentes.
        </p>
        <div className="overflow-x-auto rounded-xl border border-marino/10 bg-white">
          <table className="w-full min-w-[20rem] text-left text-sm sm:text-base">
            <caption className="sr-only">Lotes referenciales de {proyecto.nombre}</caption>
            <thead className="bg-celeste text-marino">
              <tr>
                <th scope="col" className="whitespace-nowrap px-2 py-2 sm:px-3 font-bold">Lote</th>
                <th scope="col" className="whitespace-nowrap px-2 py-2 sm:px-3 font-bold">Área</th>
                <th scope="col" className="whitespace-nowrap px-2 py-2 sm:px-3 font-bold">Frente</th>
                <th scope="col" className="whitespace-nowrap px-2 py-2 sm:px-3 font-bold">Fondo</th>
                <th scope="col" className="whitespace-nowrap px-2 py-2 sm:px-3 text-right font-bold">Precio</th>
              </tr>
            </thead>
            <tbody>
              {proyecto.lotes.map((l) => (
                <tr key={l.codigo} className="border-t border-marino/10">
                  <td className="whitespace-nowrap px-2 py-2 sm:px-3 font-semibold">{l.codigo}</td>
                  <td className="whitespace-nowrap px-2 py-2 sm:px-3">{formatearArea(l.areaM2)}</td>
                  <td className="whitespace-nowrap px-2 py-2 sm:px-3">{formatearMetros(l.frenteM)}</td>
                  <td className="whitespace-nowrap px-2 py-2 sm:px-3">{formatearMetros(l.fondoM)}</td>
                  <td className="whitespace-nowrap px-2 py-2 sm:px-3 text-right font-semibold text-marino">{formatearSoles(l.precio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="condiciones" className="grid gap-4 md:grid-cols-2">
        <h2 id="condiciones" className="sr-only">
          Financiamiento y entrega
        </h2>
        <div className="rounded-xl bg-burbuja p-5">
          <h3 className="text-lg font-bold text-marino">Financiamiento</h3>
          <p className="mt-1">{proyecto.financiamiento}</p>
        </div>
        <div className="rounded-xl bg-burbuja p-5">
          <h3 className="text-lg font-bold text-marino">Entrega</h3>
          <p className="mt-1">{proyecto.entrega}</p>
        </div>
      </section>
      <section aria-labelledby="contacto" id="contacto" className="max-w-2xl scroll-mt-4">
        <h2 id="contacto" className="sr-only">
          Contacto
        </h2>
        <FormularioInteres proyectoSlug={proyecto.slug} proyectoNombre={proyecto.nombre} />
      </section>
    </article>
  );
}

export function FichaError() {
  return (
    <div role="alert" className="rounded-xl border border-separado/60 bg-burbuja p-6 text-marino">
      <p className="font-bold">No pudimos cargar este proyecto en este momento.</p>
      <p className="mt-1 text-sm">Por favor, vuelve a intentarlo en unos segundos.</p>
      <Link href="/" className="mt-3 inline-block font-semibold text-azul underline">
        Volver al catálogo
      </Link>
    </div>
  );
}

export function FichaCargando() {
  return (
    <div aria-busy="true" aria-label="Cargando proyecto" className="space-y-4">
      <div className="h-10 w-2/3 animate-pulse rounded bg-celeste/70" />
      <div className="aspect-[3/2] w-full animate-pulse rounded-2xl bg-celeste/70" />
      <div className="h-40 animate-pulse rounded-xl bg-celeste/50" />
    </div>
  );
}

// Lee la ficha en el servidor, en cada visita (por eso se usa dentro de <Suspense>).
export async function FichaCargada({ slug }: { slug: string }) {
  let proyecto: ProyectoDetalle | null;
  try {
    proyecto = await obtenerProyecto(slug);
  } catch {
    // Nunca se muestran detalles técnicos al cliente.
    return <FichaError />;
  }
  if (!proyecto) notFound();
  return <FichaProyecto proyecto={proyecto} />;
}
