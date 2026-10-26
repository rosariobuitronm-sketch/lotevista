import type { Metadata } from "next";
import Image from "next/image";
import { FormularioLogin } from "@/components/FormularioLogin";

export const metadata: Metadata = { title: "Acceso para asesores", robots: { index: false, follow: false } };

export default function PaginaLogin() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <Image src="/vicha-asistente.svg" alt="" width={90} height={96} unoptimized />
        <h1 className="text-2xl font-extrabold text-marino">Acceso para asesores</h1>
        <p className="text-sm text-texto/80">Ingresa con tu usuario y contraseña para ver los leads.</p>
      </div>
      <FormularioLogin />
    </main>
  );
}
