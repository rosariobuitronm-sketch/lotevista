import { Suspense } from "react";
import { Catalogo, CatalogoCargando } from "@/components/Catalogo";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <section aria-labelledby="titulo" className="rounded-3xl bg-marino px-6 py-10 text-white sm:px-10">
        <h1 id="titulo" className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          LoteVista
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-celeste">
          Conoce lotes en Chincha, Huaral y Piura, mira una casa referencial en 3D y en tu propio espacio con Realidad
          Aumentada, y resuelve tus dudas con Vicha, nuestra asistente.
        </p>
        <p className="mt-2 text-sm text-celeste/80">Vendemos lotes: la casa que ves es solo una referencia.</p>
      </section>

      <section id="proyectos" aria-labelledby="titulo-proyectos" className="mt-10 scroll-mt-4">
        <h2 id="titulo-proyectos" className="mb-5 text-2xl font-bold text-marino">
          Nuestros proyectos
        </h2>
        <Suspense fallback={<CatalogoCargando />}>
          <Catalogo />
        </Suspense>
      </section>
    </main>
  );
}
