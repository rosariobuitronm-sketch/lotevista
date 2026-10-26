import Link from "next/link";
import { NOMBRE_EMPRESA } from "@/lib/textos";

export function Pie() {
  return (
    <footer className="mt-12 border-t border-marino/10 bg-marino text-celeste print:hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm">
        <p>
          <strong className="text-white">{NOMBRE_EMPRESA}</strong> · Se vende únicamente el lote; la construcción no
          forma parte de la oferta.
        </p>
        <p>Proyecto académico: todos los datos, precios y proyectos son ficticios.</p>
        <p>
          <Link href="/panel/login" className="underline underline-offset-2 hover:text-white">
            Acceso para asesores
          </Link>
        </p>
      </div>
    </footer>
  );
}
