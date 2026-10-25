import { TarjetaProyecto } from "@/components/TarjetaProyecto";
import { listarProyectos, type Proyecto } from "@/lib/proyectos";

export function CatalogoVista({ proyectos }: { proyectos: Proyecto[] }) {
  if (proyectos.length === 0) {
    return (
      <p className="rounded-xl bg-celeste p-6 text-marino">
        Pronto tendremos proyectos disponibles. ¡Vuelve a visitarnos!
      </p>
    );
  }
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {proyectos.map((p, i) => (
        <li key={p.id}>
          <TarjetaProyecto proyecto={p} prioridad={i === 0} />
        </li>
      ))}
    </ul>
  );
}

export function CatalogoError() {
  return (
    <div role="alert" className="rounded-xl border border-separado/60 bg-burbuja p-6 text-marino">
      <p className="font-bold">No pudimos cargar los proyectos en este momento.</p>
      <p className="mt-1 text-sm">Por favor, vuelve a intentarlo en unos segundos. Gracias por tu paciencia.</p>
    </div>
  );
}

// Lee los proyectos en el servidor, en cada visita (por eso se usa dentro de <Suspense>).
export async function Catalogo() {
  let proyectos: Proyecto[];
  try {
    proyectos = await listarProyectos();
  } catch {
    // Nunca se muestran detalles técnicos al cliente.
    return <CatalogoError />;
  }
  return <CatalogoVista proyectos={proyectos} />;
}

export function CatalogoCargando() {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Cargando proyectos">
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-80 animate-pulse rounded-2xl bg-celeste/70" />
      ))}
    </ul>
  );
}
