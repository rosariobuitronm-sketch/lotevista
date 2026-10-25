import Image from "next/image";
import Link from "next/link";

export function Encabezado() {
  return (
    <header className="border-b border-marino/10 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label="LoteVista, ir al inicio" className="shrink-0">
          <Image src="/lotevista-logo.svg" alt="LoteVista" width={182} height={45} unoptimized priority />
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-4 text-sm font-medium text-marino">
          <Link href="/#proyectos" className="rounded px-2 py-1 hover:bg-celeste">
            Proyectos
          </Link>
        </nav>
      </div>
    </header>
  );
}
