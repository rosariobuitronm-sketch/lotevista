"use client";

import { useRef, useState } from "react";
import { leerActividad } from "@/lib/actividad";
import { validarLead } from "@/lib/lead-schema";
import { CONSENTIMIENTO_TEXTO, NOMBRE_EMPRESA } from "@/lib/textos";

type Props = { proyectoSlug: string; proyectoNombre: string };
type Estado = "editando" | "enviando" | "fallo" | "exito";

const HORARIOS = ["Mañana (8 a. m. a 12 m.)", "Tarde (12 m. a 6 p. m.)", "Noche (6 a 9 p. m.)"];

const MSG_SIN_CONEXION = "No pudimos enviar tus datos. Revisa tu conexión a internet e inténtalo de nuevo.";

function Campo({
  id,
  etiqueta,
  error,
  opcional = false,
  children,
}: {
  id: string;
  etiqueta: string;
  error?: string;
  opcional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-marino">
        {etiqueta}
        {opcional && <span className="ml-1 font-normal text-texto/70">(opcional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

const estiloCampo = (hayError: boolean) =>
  `mt-1 block w-full rounded-lg border bg-white px-3 py-2.5 text-base text-texto ${
    hayError ? "border-red-600" : "border-marino/30"
  }`;

export function FormularioInteres({ proyectoSlug, proyectoNombre }: Props) {
  const [valores, setValores] = useState({ nombre: "", celular: "", correo: "", horario: "", consentimiento: false });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [estado, setEstado] = useState<Estado>("editando");
  const [mensajeFallo, setMensajeFallo] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const enviandoRef = useRef(false); // evita el doble envío aunque el segundo clic llegue antes de repintar

  const cambiar = (campo: keyof typeof valores, valor: string | boolean) => setValores((v) => ({ ...v, [campo]: valor }));
  const describir = (id: string, campo: string) => (errores[campo] ? `${id}-error` : undefined);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (enviandoRef.current || estado === "exito") return;

    const actividad = leerActividad(proyectoSlug);
    const cuerpo = {
      nombre: valores.nombre,
      celular: valores.celular,
      correo: valores.correo,
      horario: valores.horario || undefined,
      consentimiento: valores.consentimiento,
      proyecto: proyectoSlug,
      uso3d: actividad.uso3d,
      usoRa: actividad.usoRa,
      preguntas: actividad.preguntas,
    };

    const revision = validarLead(cuerpo);
    if (!revision.ok) {
      setErrores(revision.errores);
      return;
    }
    setErrores({});

    enviandoRef.current = true;
    setEstado("enviando");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        setMensajeExito(json.datos?.mensaje ?? "¡Gracias! Un asesor se comunicará contigo.");
        setEstado("exito");
      } else if (res.status === 400 && json?.error?.campos) {
        setErrores(json.error.campos);
        setEstado("editando");
      } else {
        setMensajeFallo(json?.error?.mensaje ?? "No pudimos guardar tus datos. Intenta de nuevo.");
        setEstado("fallo");
      }
    } catch {
      setMensajeFallo(MSG_SIN_CONEXION);
      setEstado("fallo");
    } finally {
      enviandoRef.current = false;
    }
  }

  if (estado === "exito") {
    return (
      <div role="status" className="rounded-2xl border border-verde/40 bg-white p-6">
        <h3 className="text-xl font-bold text-marino">¡Gracias, {valores.nombre.trim().split(" ")[0]}!</h3>
        <p className="mt-2">{mensajeExito}</p>
      </div>
    );
  }

  const enviando = estado === "enviando";
  return (
    <form onSubmit={enviar} noValidate className="space-y-4 rounded-2xl border border-marino/10 bg-white p-5 sm:p-6">
      <div>
        <h3 className="text-xl font-bold text-marino">Quiero más información</h3>
        <p className="text-sm text-texto/80">Déjanos tus datos y un asesor te contactará sobre {proyectoNombre}.</p>
      </div>

      <Campo id="nombre" etiqueta="Nombre completo" error={errores.nombre}>
        <input
          id="nombre"
          name="nombre"
          type="text"
          autoComplete="name"
          required
          maxLength={120}
          value={valores.nombre}
          onChange={(e) => cambiar("nombre", e.target.value)}
          aria-invalid={!!errores.nombre}
          aria-describedby={describir("nombre", "nombre")}
          className={estiloCampo(!!errores.nombre)}
        />
      </Campo>

      <Campo id="celular" etiqueta="Celular" error={errores.celular}>
        <input
          id="celular"
          name="celular"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="987 654 321"
          required
          maxLength={20}
          value={valores.celular}
          onChange={(e) => cambiar("celular", e.target.value)}
          aria-invalid={!!errores.celular}
          aria-describedby={describir("celular", "celular")}
          className={estiloCampo(!!errores.celular)}
        />
      </Campo>

      <Campo id="correo" etiqueta="Correo electrónico" error={errores.correo}>
        <input
          id="correo"
          name="correo"
          type="email"
          autoComplete="email"
          required
          maxLength={140}
          value={valores.correo}
          onChange={(e) => cambiar("correo", e.target.value)}
          aria-invalid={!!errores.correo}
          aria-describedby={describir("correo", "correo")}
          className={estiloCampo(!!errores.correo)}
        />
      </Campo>

      <Campo id="horario" etiqueta="Horario preferido de contacto" opcional error={errores.horario}>
        <select
          id="horario"
          name="horario"
          value={valores.horario}
          onChange={(e) => cambiar("horario", e.target.value)}
          aria-describedby={describir("horario", "horario")}
          className={estiloCampo(!!errores.horario)}
        >
          <option value="">Sin preferencia</option>
          {HORARIOS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </Campo>

      <div>
        <div className="flex items-start gap-3">
          <input
            id="consentimiento"
            name="consentimiento"
            type="checkbox"
            checked={valores.consentimiento}
            onChange={(e) => cambiar("consentimiento", e.target.checked)}
            aria-invalid={!!errores.consentimiento}
            aria-describedby={`${errores.consentimiento ? "consentimiento-error " : ""}consentimiento-texto`}
            className="mt-1 h-5 w-5 shrink-0 accent-azul"
          />
          <label htmlFor="consentimiento" className="text-sm font-semibold text-marino">
            Acepto el tratamiento de mis datos personales por {NOMBRE_EMPRESA}
          </label>
        </div>
        <p id="consentimiento-texto" className="mt-2 text-xs leading-relaxed text-texto/80">
          {CONSENTIMIENTO_TEXTO}
        </p>
        {errores.consentimiento && (
          <p id="consentimiento-error" className="mt-1 text-sm font-medium text-red-700">
            {errores.consentimiento}
          </p>
        )}
      </div>

      {errores._general && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {errores._general}
        </p>
      )}
      {estado === "fallo" && (
        <p role="alert" className="rounded-lg bg-burbuja p-3 text-sm font-medium text-marino">
          {mensajeFallo}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-coral px-4 py-3 text-base font-bold text-marino hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? "Enviando…" : estado === "fallo" ? "Reintentar" : "Quiero que me contacten"}
      </button>
      <p className="text-xs text-texto/70">No pedimos tu DNI. Solo vendemos el lote; la casa del 3D es referencial.</p>
    </form>
  );
}
