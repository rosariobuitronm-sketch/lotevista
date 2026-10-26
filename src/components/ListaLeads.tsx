import Link from "next/link";
import { formatearFechaHora } from "@/lib/formato";
import type { LeadPanel, ProyectoFiltro } from "@/lib/panel";

// Todo lo que escribió el cliente (nombre, correo, preguntas…) se muestra como TEXTO: React lo escapa siempre.
// Aquí nunca se usa dangerouslySetInnerHTML.

const CANALES: Record<string, string> = { web: "Web", qr_sala: "QR en sala", holograma: "Holograma" };

type Props = { leads: LeadPanel[]; proyectos: ProyectoFiltro[]; proyectoActual: string | undefined };

function Filtro({ proyectos, proyectoActual }: Pick<Props, "proyectos" | "proyectoActual">) {
  const enlace = (activo: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm font-semibold ${
      activo ? "border-marino bg-marino text-white" : "border-marino/30 bg-white text-marino hover:bg-celeste"
    }`;
  return (
    <nav aria-label="Filtrar por proyecto" className="flex flex-wrap gap-2">
      <Link href="/panel" aria-current={proyectoActual ? undefined : "page"} className={enlace(!proyectoActual)}>
        Todos
      </Link>
      {proyectos.map((p) => (
        <Link
          key={p.slug}
          href={`/panel?proyecto=${p.slug}`}
          aria-current={proyectoActual === p.slug ? "page" : undefined}
          className={enlace(proyectoActual === p.slug)}
        >
          {p.nombre}
        </Link>
      ))}
    </nav>
  );
}

function Insignia({ children, tono = "celeste" }: { children: React.ReactNode; tono?: "celeste" | "arena" }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold text-marino ${tono === "celeste" ? "bg-celeste" : "bg-arena"}`}>
      {children}
    </span>
  );
}

function TarjetaLead({ lead }: { lead: LeadPanel }) {
  return (
    <article className="space-y-4 rounded-2xl border border-marino/10 bg-white p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold text-marino">{lead.nombre}</h3>
        <p className="text-sm text-texto/80">Último contacto: {formatearFechaHora(lead.ultimoContacto)}</p>
      </header>

      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-semibold text-azul">Celular</dt>
          <dd>{lead.celular}</dd>
        </div>
        <div className="min-w-0">
          <dt className="font-semibold text-azul">Correo</dt>
          <dd className="break-words">{lead.correo}</dd>
        </div>
        <div>
          <dt className="font-semibold text-azul">Horario preferido</dt>
          <dd>{lead.horario ?? "Sin preferencia"}</dd>
        </div>
      </dl>

      <section>
        <h4 className="text-sm font-bold text-marino">Historial de proyectos</h4>
        <ul aria-label="Historial de proyectos" className="mt-1 space-y-1.5 text-sm">
          {lead.intereses.map((i, n) => (
            <li key={n} className="flex flex-wrap items-center gap-2">
              <strong>{i.proyecto}</strong>
              <Insignia>{CANALES[i.canal] ?? i.canal}</Insignia>
              {i.uso3d && <Insignia tono="arena">Usó 3D</Insignia>}
              {i.usoRa && <Insignia tono="arena">Usó RA</Insignia>}
              <span className="text-texto/70">{formatearFechaHora(i.fecha)}</span>
            </li>
          ))}
        </ul>
      </section>

      {lead.preguntas.length > 0 && (
        <section>
          <h4 className="text-sm font-bold text-marino">Preguntas al asistente</h4>
          <ul aria-label="Preguntas al asistente" className="mt-1 space-y-3 text-sm">
            {lead.preguntas.map((p, n) => (
              <li key={n} className="rounded-lg bg-burbuja p-3">
                <p className="text-xs text-texto/70">{p.proyecto}</p>
                <p className="font-semibold">{p.pregunta}</p>
                <p className="mt-0.5 text-texto/90">{p.respuesta}</p>
                {!p.sabe && <p className="mt-1 text-xs font-semibold text-red-800">Derivada a un asesor</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

export function ListaLeads({ leads, proyectos, proyectoActual }: Props) {
  const nombreProyecto = proyectos.find((p) => p.slug === proyectoActual)?.nombre;
  return (
    <section aria-labelledby="titulo-leads" className="space-y-5">
      <h2 id="titulo-leads" className="sr-only">
        Leads
      </h2>
      <Filtro proyectos={proyectos} proyectoActual={proyectoActual} />

      {leads.length === 0 ? (
        <p className="rounded-xl bg-celeste p-6 text-marino">
          {nombreProyecto
            ? `Aún no hay leads de ${nombreProyecto}. Cuando alguien deje sus datos, aparecerán aquí.`
            : "Aún no hay leads. Cuando alguien deje sus datos en una ficha, aparecerá aquí."}
        </p>
      ) : (
        <>
          <p className="text-sm text-texto/80">{leads.length === 1 ? "1 lead" : `${leads.length} leads`}</p>
          <div className="space-y-4">
            {leads.map((l) => (
              <TarjetaLead key={l.id} lead={l} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
