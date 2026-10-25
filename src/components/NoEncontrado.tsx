import Image from "next/image";
import Link from "next/link";

// Página amable para URLs o QR de proyectos que no existen.
export function NoEncontrado() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      <Image src="/vicha-asistente.svg" alt="Vicha, la vizcacha asistente" width={120} height={128} unoptimized />
      <h1 className="text-3xl font-extrabold text-marino">No encontramos esta página</h1>
      <p className="text-texto/80">
        Puede que el enlace o el código QR sea antiguo, o que el proyecto ya no esté disponible. Mira nuestros
        proyectos actuales y encuentra tu lote.
      </p>
      <Link href="/" className="rounded-lg bg-coral px-6 py-3 font-bold text-marino hover:brightness-95">
        Ver los proyectos
      </Link>
    </main>
  );
}
