import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BotonCerrarSesion } from "@/components/BotonCerrarSesion";
import { ListaLeads } from "@/components/ListaLeads";
import { COOKIE_SESION } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { esSlugValido, obtenerPanel } from "@/lib/panel";

export const metadata: Metadata = { title: "Panel del asesor", robots: { index: false, follow: false } };

// Además del filtro (proxy), la página vuelve a comprobar la sesión ANTES de leer un solo dato:
// nunca se confía en una sola barrera.
async function PanelProtegido({ searchParams }: Pick<PageProps<"/panel">, "searchParams">) {
  const { proyecto: crudo } = await searchParams;
  const proyecto = typeof crudo === "string" && esSlugValido(crudo) ? crudo : undefined;
  const token = (await cookies()).get(COOKIE_SESION)?.value;

  let panel;
  try {
    panel = await obtenerPanel({ token, secreto: process.env.AUTH_SECRET, proyecto, sql: getSql() });
  } catch {
    return (
      <p role="alert" className="rounded-xl border border-separado/60 bg-burbuja p-6 text-marino">
        No pudimos cargar los leads en este momento. Vuelve a intentarlo en unos segundos.
      </p>
    );
  }
  if (!panel.autorizado) redirect("/panel/login");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold text-marino">Panel del asesor</h1>
        <div className="flex items-center gap-3 text-sm">
          <span>
            Sesión de <strong>{panel.usuario}</strong>
          </span>
          <BotonCerrarSesion />
        </div>
      </div>
      <ListaLeads leads={panel.leads} proyectos={panel.proyectos} proyectoActual={proyecto} />
    </>
  );
}

export default function PaginaPanel({ searchParams }: PageProps<"/panel">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
      <Suspense fallback={<p aria-busy="true">Cargando el panel…</p>}>
        <PanelProtegido searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
