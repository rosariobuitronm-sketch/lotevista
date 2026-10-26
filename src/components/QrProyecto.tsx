import Image from "next/image";
import Link from "next/link";
import { BotonImprimir } from "@/components/BotonImprimir";

// QR pequeño dentro de la ficha: se puede escanear desde otra pantalla, descargar o abrir para imprimir.
export function QrProyecto({ slug, nombre }: { slug: string; nombre: string }) {
  return (
    <section aria-labelledby="titulo-qr" className="flex flex-col items-start gap-4 rounded-2xl border border-marino/10 bg-white p-5 sm:flex-row sm:items-center">
      <Image
        src={`/api/qr/${slug}`}
        alt={`Código QR para abrir la ficha de ${nombre} en tu celular`}
        width={160}
        height={160}
        unoptimized
        className="rounded-lg border border-marino/10"
      />
      <div className="space-y-2">
        <h2 id="titulo-qr" className="text-lg font-bold text-marino">
          Abre esta ficha en tu celular
        </h2>
        <p className="text-sm text-texto/80">Escanea el código con la cámara para seguir viendo el proyecto en tu celular.</p>
        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          <a href={`/api/qr/${slug}?descargar=1`} download className="text-azul underline underline-offset-2">
            Descargar QR
          </a>
          <Link href={`/qr/${slug}`} className="text-azul underline underline-offset-2">
            Ver para imprimir
          </Link>
        </div>
      </div>
    </section>
  );
}

// Página pensada para imprimir o proyectar el QR en la sala de ventas.
export function QrImprimible({ slug, nombre }: { slug: string; nombre: string }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center gap-5 px-4 py-10 text-center">
      <h1 className="text-3xl font-extrabold text-marino">{nombre}</h1>
      <p className="text-lg">Escanea el código con la cámara de tu celular para ver el proyecto, la casa en 3D y los lotes.</p>
      <Image
        src={`/api/qr/${slug}`}
        alt={`Código QR para abrir la ficha de ${nombre} en tu celular`}
        width={360}
        height={360}
        unoptimized
        priority
        className="rounded-xl border border-marino/10"
      />
      <p className="text-sm text-texto/80">Se vende únicamente el lote. Todos los datos son ficticios.</p>
      <BotonImprimir />
      <Link href={`/proyectos/${slug}`} className="text-sm font-semibold text-azul underline print:hidden">
        Volver a la ficha
      </Link>
    </main>
  );
}
