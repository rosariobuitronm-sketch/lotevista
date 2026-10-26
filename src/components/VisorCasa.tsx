"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { EtiquetaReferencial } from "@/components/EtiquetaReferencial";
import { marcarUso } from "@/lib/actividad";

type Estado = "cargando" | "listo" | "fallo";
type SoporteAR = "desconocido" | "si" | "no";

type Props = {
  nombre: string;
  /** Ruta del .glb. Si es null, se muestra directamente la imagen del proyecto. */
  modeloUrl: string | null;
  /** Imagen de respaldo si el modelo falla o tarda. */
  imagenUrl: string;
  /** Identificador del proyecto: con él se recuerda (solo en el navegador) si la persona usó el 3D o la RA. */
  proyectoSlug?: string;
  /** Carga la librería <model-viewer> (se inyecta en las pruebas). */
  cargarVisor?: () => Promise<unknown>;
  /** Tiempo máximo de espera antes de mostrar la imagen de respaldo. */
  tiempoMaxMs?: number;
};

const cargarModelViewer = () => import("@google/model-viewer");

// Muestra la casa referencial en 3D y, si el equipo lo permite, en Realidad Aumentada.
// La etiqueta "Imagen referencial" se muestra SIEMPRE: dentro del visor (así también se ve en la RA de
// Chrome/WebXR, que usa el visor como capa superpuesta), bajo el visor y también con la imagen de respaldo.
// Limitación: en Scene Viewer (Android) y Quick Look (iPhone) el sistema operativo dibuja la RA en su propia
// pantalla y no deja superponer la etiqueta; por eso se recuerda antes de entrar (ver README).
export function VisorCasa({
  nombre,
  modeloUrl,
  imagenUrl,
  proyectoSlug,
  cargarVisor = cargarModelViewer,
  tiempoMaxMs = 15000,
}: Props) {
  const [estado, setEstado] = useState<Estado>(modeloUrl ? "cargando" : "fallo");
  const [ar, setAr] = useState<SoporteAR>("desconocido");
  const [falloAr, setFalloAr] = useState(false);
  const visorRef = useRef<HTMLElement | null>(null);

  // Carga la librería y vigila el tiempo máximo.
  useEffect(() => {
    if (!modeloUrl) return;
    let cancelado = false;
    const reloj = setTimeout(() => {
      if (!cancelado) setEstado((e) => (e === "cargando" ? "fallo" : e));
    }, tiempoMaxMs);
    cargarVisor().catch(() => {
      if (!cancelado) setEstado("fallo");
    });
    return () => {
      cancelado = true;
      clearTimeout(reloj);
    };
  }, [modeloUrl, cargarVisor, tiempoMaxMs]);

  // Escucha los eventos del modelo mientras el visor está en pantalla.
  useEffect(() => {
    const visor = visorRef.current;
    if (!visor || estado === "fallo") return;
    const alCargar = () => {
      setEstado("listo");
      setAr((visor as HTMLElement & { canActivateAR?: boolean }).canActivateAR ? "si" : "no");
    };
    const alFallar = () => setEstado("fallo");
    const alCambiarRa = (e: Event) => {
      const estadoRa = (e as CustomEvent<{ status?: string }>).detail?.status;
      if (estadoRa === "failed") setFalloAr(true);
      if (estadoRa === "session-started" && proyectoSlug) marcarUso(proyectoSlug, "ra");
    };
    // Solo cuenta cuando la persona mueve la casa; el giro automático no es uso.
    const alMoverCamara = (e: Event) => {
      if ((e as CustomEvent<{ source?: string }>).detail?.source === "user-interaction" && proyectoSlug) {
        marcarUso(proyectoSlug, "3d");
      }
    };
    visor.addEventListener("load", alCargar);
    visor.addEventListener("error", alFallar);
    visor.addEventListener("ar-status", alCambiarRa);
    visor.addEventListener("camera-change", alMoverCamara);
    return () => {
      visor.removeEventListener("load", alCargar);
      visor.removeEventListener("error", alFallar);
      visor.removeEventListener("ar-status", alCambiarRa);
      visor.removeEventListener("camera-change", alMoverCamara);
    };
  }, [estado, proyectoSlug]);

  return (
    <div className="space-y-2">
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl bg-gradient-to-b from-celeste to-fondo">
        {estado === "fallo" || !modeloUrl ? (
          <>
            <Image
              src={imagenUrl}
              alt={`Ilustración del proyecto ${nombre}`}
              fill
              priority
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover"
            />
            <EtiquetaReferencial compacta className="pointer-events-none absolute left-3 top-3" />
          </>
        ) : (
          <model-viewer
            ref={visorRef as React.Ref<HTMLElement>}
            src={modeloUrl}
            alt={`Modelo 3D referencial de una casa del proyecto ${nombre}. Arrastra para girarla.`}
            ar=""
            ar-modes="webxr scene-viewer quick-look"
            camera-controls=""
            auto-rotate=""
            touch-action="pan-y"
            shadow-intensity="1"
            environment-image="neutral"
            exposure="0.8"
            interaction-prompt="auto"
            style={{ width: "100%", height: "100%", background: "transparent" }}
          >
            {/* Dentro del visor: se ve en 3D y también como capa superpuesta en la RA de Chrome (WebXR). */}
            <EtiquetaReferencial compacta className="pointer-events-none absolute left-3 top-3" />
            <button
              slot="ar-button"
              type="button"
              hidden={ar === "no"}
              onClick={() => proyectoSlug && marcarUso(proyectoSlug, "ra")}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-marino shadow-lg hover:brightness-95"
            >
              Ver en tu espacio
            </button>
          </model-viewer>
        )}

        {estado === "cargando" && (
          <p
            role="status"
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-celeste/60 text-sm font-semibold text-marino"
          >
            Cargando la casa en 3D…
          </p>
        )}
      </div>

      {estado !== "fallo" && modeloUrl && (
        <p className="text-sm text-texto/80">Arrastra para girar la casa y usa dos dedos o la rueda del mouse para acercar.</p>
      )}

      {ar === "si" && (
        <p className="text-sm text-texto/80">
          Con «Ver en tu espacio» verás la casa sobre tu entorno. Recuerda: la casa es solo una referencia; se vende
          únicamente el lote.
        </p>
      )}
      {ar === "no" && (
        <p role="note" className="rounded-lg bg-celeste p-3 text-sm text-marino">
          Tu dispositivo o navegador no admite Realidad Aumentada. Puedes seguir viendo y girando la casa en 3D; para
          verla en tu espacio abre esta página en un celular compatible (Android con ARCore o iPhone).
        </p>
      )}
      {falloAr && (
        <p role="alert" className="rounded-lg bg-burbuja p-3 text-sm font-medium text-marino">
          No pudimos abrir la Realidad Aumentada en este dispositivo. Puedes seguir viendo la casa en 3D.
        </p>
      )}

      <EtiquetaReferencial />
    </div>
  );
}
