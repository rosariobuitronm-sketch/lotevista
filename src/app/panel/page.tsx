import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BotonCerrarSesion } from "@/components/BotonCerrarSesion";
import { COOKIE_SESION, requerirSesion } from "@/lib/auth";

export const metadata: Metadata = { title: "Panel del asesor", robots: { index: false, follow: false } };

// Además del filtro (proxy), la página vuelve a comprobar la sesión: nunca se confía en una sola barrera.
async function PanelProtegido() {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  const sesion = await requerirSesion(token, process.env.AUTH_SECRET);
  if (!sesion) redirect("/panel/login");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold text-marino">Panel del asesor</h1>
        <div className="flex items-center gap-3 text-sm">
          <span>
            Sesión de <strong>{sesion.usuario}</strong>
          </span>
          <BotonCerrarSesion />
        </div>
      </div>
    </>
  );
}

export default function PaginaPanel() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
      <Suspense fallback={<p aria-busy="true">Cargando el panel…</p>}>
        <PanelProtegido />
      </Suspense>
    </main>
  );
}
