import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FichaError } from "@/components/FichaProyecto";
import { Holograma } from "@/components/Holograma";
import { obtenerProyecto, type ProyectoDetalle } from "@/lib/proyectos";

export const metadata: Metadata = { title: "Modo holograma", robots: { index: false, follow: false } };

async function Contenido({ params }: Pick<PageProps<"/holograma/[slug]">, "params">) {
  const { slug } = await params;
  let proyecto: ProyectoDetalle | null;
  try {
    proyecto = await obtenerProyecto(slug);
  } catch {
    return <FichaError />;
  }
  if (!proyecto) notFound();
  return (
    <Holograma
      slug={proyecto.slug}
      nombre={proyecto.nombre}
      modeloUrl={proyecto.modeloArchivo}
      imagenUrl={proyecto.imagenUrl}
    />
  );
}

// El proxy fija el canal "holograma" al abrir esta página: un lead que llegue desde aquí queda con ese canal.
export default function PaginaHolograma({ params }: PageProps<"/holograma/[slug]">) {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-50 bg-black" aria-busy="true" />}>
      <Contenido params={params} />
    </Suspense>
  );
}
