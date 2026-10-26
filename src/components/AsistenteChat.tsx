"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { agregarPregunta, leerActividad } from "@/lib/actividad";
import { AVISO_CHAT } from "@/lib/textos";

type Mensaje = { id: number; rol: "cliente" | "vicha"; texto: string; invitarFormulario?: boolean };

const SUGERENCIAS = ["¿Cuánto cuesta el lote más barato?", "¿Cómo es el financiamiento?", "¿Qué servicios tiene?"];
const LARGO_MAX = 300;
const MSG_SIN_CONEXION = "No pude conectarme. Revisa tu conexión a internet e inténtalo de nuevo.";
const MSG_GENERICO = "No pude responder ahora. Si deseas que te contactemos, usa el formulario.";

export function AsistenteChat({ proyectoSlug, proyectoNombre }: { proyectoSlug: string; proyectoNombre: string }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [entrada, setEntrada] = useState("");
  const [cargando, setCargando] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const registroRef = useRef<HTMLDivElement | null>(null);
  const ocupadoRef = useRef(false); // evita el doble envío aunque el segundo llegue antes de repintar
  const siguienteId = useRef(1);

  const nuevo = (rol: Mensaje["rol"], texto: string, invitarFormulario = false): Mensaje => ({
    id: siguienteId.current++,
    rol,
    texto,
    invitarFormulario,
  });

  // El historial vive solo en el navegador (sessionStorage): al recargar la pestaña se recupera.
  useEffect(() => {
    const previas = leerActividad(proyectoSlug).preguntas;
    if (previas.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- se lee de sessionStorage, que no existe en el servidor
    setMensajes(
      previas.flatMap((p) => [nuevo("cliente", p.pregunta), nuevo("vicha", p.respuesta, !p.sabe)]),
    );
  }, [proyectoSlug]);

  // Mantiene visible lo último de la conversación.
  useEffect(() => {
    const registro = registroRef.current;
    if (registro) registro.scrollTop = registro.scrollHeight;
  }, [mensajes, cargando]);

  async function preguntar(texto: string) {
    const pregunta = texto.trim();
    if (!pregunta || ocupadoRef.current || bloqueado) return;
    ocupadoRef.current = true;
    setCargando(true);
    setEntrada("");
    setMensajes((m) => [...m, nuevo("cliente", pregunta)]);

    try {
      const res = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proyecto: proyectoSlug, pregunta }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        const { respuesta, sabe } = json.datos as { respuesta: string; sabe: boolean };
        setMensajes((m) => [...m, nuevo("vicha", respuesta, !sabe)]);
        agregarPregunta(proyectoSlug, { pregunta, respuesta, sabe });
      } else {
        const codigo = json?.error?.codigo;
        if (codigo === "limite_sesion") setBloqueado(true);
        const invitar = codigo === "limite_sesion" || codigo === "limite_ip" || codigo === "no_disponible";
        setMensajes((m) => [...m, nuevo("vicha", json?.error?.mensaje ?? MSG_GENERICO, invitar)]);
      }
    } catch {
      setMensajes((m) => [...m, nuevo("vicha", MSG_SIN_CONEXION)]);
    } finally {
      ocupadoRef.current = false;
      setCargando(false);
    }
  }

  const hayPreguntas = mensajes.some((m) => m.rol === "cliente");
  return (
    <section aria-labelledby="titulo-asistente" className="rounded-2xl border border-marino/10 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <Image src="/vicha-asistente.svg" alt="Vicha, la vizcacha asistente" width={56} height={60} unoptimized className="shrink-0" />
        <div>
          <h2 id="titulo-asistente" className="text-xl font-bold text-marino">
            Pregunta a Vicha
          </h2>
          <p className="text-sm text-texto/80">Responde con la información registrada de {proyectoNombre}.</p>
        </div>
      </div>

      <p className="mt-3 rounded-lg bg-celeste p-3 text-sm font-medium text-marino">{AVISO_CHAT}</p>

      <div
        ref={registroRef}
        role="log"
        aria-label="Conversación con Vicha"
        aria-live="polite"
        className="mt-3 max-h-96 space-y-3 overflow-y-auto rounded-xl bg-fondo p-3"
      >
        <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-burbuja px-4 py-2.5 text-sm">
          ¡Hola! Soy Vicha, la asistente de {proyectoNombre}. Puedo ayudarte con la ubicación, los precios, el
          financiamiento y la entrega. ¿Qué te gustaría saber?
        </div>

        {mensajes.map((m) =>
          m.rol === "cliente" ? (
            <div key={m.id} className="ml-auto max-w-[88%] rounded-2xl rounded-br-sm bg-celeste px-4 py-2.5 text-sm text-marino">
              {m.texto}
            </div>
          ) : (
            <div key={m.id} className="max-w-[88%] rounded-2xl rounded-bl-sm bg-burbuja px-4 py-2.5 text-sm">
              <p>{m.texto}</p>
              {m.invitarFormulario && (
                <a href="#contacto" className="mt-2 inline-block font-bold text-azul underline underline-offset-2">
                  Ir al formulario
                </a>
              )}
            </div>
          ),
        )}

        {cargando && (
          <p role="status" className="text-sm italic text-texto/70">
            Vicha está escribiendo…
          </p>
        )}
      </div>

      {!hayPreguntas && !bloqueado && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGERENCIAS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => preguntar(s)}
              disabled={cargando}
              className="rounded-full border border-marino/30 bg-white px-3 py-1.5 text-sm font-medium text-marino hover:bg-celeste disabled:opacity-60"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          preguntar(entrada);
        }}
        className="mt-3 flex gap-2"
      >
        <label htmlFor="pregunta-chat" className="sr-only">
          Tu pregunta
        </label>
        <input
          id="pregunta-chat"
          type="text"
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          maxLength={LARGO_MAX}
          disabled={bloqueado}
          autoComplete="off"
          placeholder={bloqueado ? "Límite de preguntas alcanzado" : "Escribe tu pregunta…"}
          className="min-w-0 flex-1 rounded-lg border border-marino/30 bg-white px-3 py-2.5 text-base disabled:bg-fondo"
        />
        <button
          type="submit"
          disabled={cargando || bloqueado}
          className="rounded-lg bg-coral px-5 py-2.5 font-bold text-marino hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Enviar
        </button>
      </form>
    </section>
  );
}
