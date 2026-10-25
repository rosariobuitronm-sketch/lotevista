import { Suspense } from "react";
import { FichaCargada, FichaCargando } from "@/components/FichaProyecto";

async function Contenido({ params }: Pick<PageProps<"/proyectos/[slug]">, "params">) {
  const { slug } = await params;
  return <FichaCargada slug={slug} />;
}

export default function PaginaProyecto({ params }: PageProps<"/proyectos/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <Suspense fallback={<FichaCargando />}>
        <Contenido params={params} />
      </Suspense>
    </main>
  );
}
