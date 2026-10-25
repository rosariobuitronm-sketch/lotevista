"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { EtiquetaReferencial } from "@/components/EtiquetaReferencial";

type Estado = "cargando" | "listo" | "fallo";

type Props = {
  nombre: string;
  /** Ruta del .glb. Si es null, se muestra directamente la imagen del proyecto. */
  modeloUrl: string | null;
  /** Imagen de respaldo si el modelo falla o tarda. */
  imagenUrl: string;
  /** Carga la librería <model-viewer> (se inyecta en las pruebas). */
  cargarVisor?: () => Promise<unknown>;
  /** Tiempo máximo de espera antes de mostrar la imagen de respaldo. */
  tiempoMaxMs?: number;
};

const cargarModelViewer = () => import("@google/model-viewer");

// Muestra la casa referencial en 3D. La etiqueta "Imagen referencial" se muestra SIEMPRE:
// sobre el modelo, bajo el modelo y también cuando se cae a la imagen de respaldo.
export function VisorCasa({
  nombre,
  modeloUrl,
  imagenUrl,
  cargarVisor = cargarModelViewer,
  tiempoMaxMs = 15000,
}: Props) {
  const [estado, setEstado] = useState<Estado>(modeloUrl ? "cargando" : "fallo");
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
    const alCargar = () => setEstado("listo");
    const alFallar = () => setEstado("fallo");
    visor.addEventListener("load", alCargar);
    visor.addEventListener("error", alFallar);
    return () => {
      visor.removeEventListener("load", alCargar);
      visor.removeEventListener("error", alFallar);
    };
  }, [estado]);

  return (
    <div className="space-y-2">
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl bg-gradient-to-b from-celeste to-fondo">
        {estado === "fallo" || !modeloUrl ? (
          <Image
            src={imagenUrl}
            alt={`Ilustración del proyecto ${nombre}`}
            fill
            priority
            sizes="(min-width: 1024px) 560px, 100vw"
            className="object-cover"
          />
        ) : (
          <model-viewer
            ref={visorRef as React.Ref<HTMLElement>}
            src={modeloUrl}
            alt={`Modelo 3D referencial de una casa del proyecto ${nombre}. Arrastra para girarla.`}
            camera-controls=""
            auto-rotate=""
            touch-action="pan-y"
            shadow-intensity="1"
            environment-image="neutral"
            exposure="0.8"
            interaction-prompt="auto"
            style={{ width: "100%", height: "100%", background: "transparent" }}
          />
        )}

        {estado === "cargando" && (
          <p
            role="status"
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-celeste/60 text-sm font-semibold text-marino"
          >
            Cargando la casa en 3D…
          </p>
        )}

        <EtiquetaReferencial compacta className="pointer-events-none absolute left-3 top-3" />
      </div>

      {estado !== "fallo" && modeloUrl && (
        <p className="text-sm text-texto/80">Arrastra para girar la casa y usa dos dedos o la rueda del mouse para acercar.</p>
      )}
      <EtiquetaReferencial />
    </div>
  );
}
