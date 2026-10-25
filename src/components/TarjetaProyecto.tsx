import Image from "next/image";
import Link from "next/link";
import { EtiquetaReferencial } from "@/components/EtiquetaReferencial";
import { formatearRangoArea, formatearSoles } from "@/lib/formato";
import type { Proyecto } from "@/lib/proyectos";

export function TarjetaProyecto({ proyecto, prioridad = false }: { proyecto: Proyecto; prioridad?: boolean }) {
  const ubicacion = `${proyecto.distrito}, ${proyecto.provincia}, ${proyecto.departamento}`;
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-marino/10 bg-white shadow-sm transition-shadow focus-within:shadow-md hover:shadow-md">
      <div className="relative aspect-[3/2] w-full bg-celeste">
        <Image
          src={proyecto.imagenUrl}
          alt={`Ilustración del proyecto ${proyecto.nombre}: un lote delimitado con una casa referencial`}
          fill
          sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
          priority={prioridad}
        />
        <EtiquetaReferencial compacta className="absolute left-3 top-3" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-xl font-bold text-marino">{proyecto.nombre}</h3>
          <p className="text-sm text-texto/80">{ubicacion}</p>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-texto/70">Precio desde</dt>
            <dd className="text-lg font-bold text-marino">{formatearSoles(proyecto.precioDesde)}</dd>
          </div>
          <div>
            <dt className="text-texto/70">Lotes de</dt>
            <dd className="text-lg font-bold text-marino">{formatearRangoArea(proyecto.areaDesde, proyecto.areaHasta)}</dd>
          </div>
        </dl>
        <Link
          href={`/proyectos/${proyecto.slug}`}
          className="mt-auto inline-flex items-center justify-center rounded-lg bg-coral px-4 py-3 text-center font-bold text-marino hover:brightness-95"
        >
          Ver proyecto <span className="sr-only">{proyecto.nombre}</span>
        </Link>
      </div>
    </article>
  );
}
