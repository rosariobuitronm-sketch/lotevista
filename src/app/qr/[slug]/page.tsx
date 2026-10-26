import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { QrImprimible } from "@/components/QrProyecto";
import { obtenerProyecto } from "@/lib/proyectos";

export const metadata: Metadata = { title: "Código QR del proyecto", robots: { index: false } };

async function Contenido({ params }: Pick<PageProps<"/qr/[slug]">, "params">) {
  const { slug } = await params;
  const proyecto = await obtenerProyecto(slug).catch(() => null);
  if (!proyecto) notFound();
  return <QrImprimible slug={proyecto.slug} nombre={proyecto.nombre} />;
}

export default function PaginaQr({ params }: PageProps<"/qr/[slug]">) {
  return (
    <Suspense fallback={<p className="p-8" aria-busy="true">Cargando…</p>}>
      <Contenido params={params} />
    </Suspense>
  );
}
