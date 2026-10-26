"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EtiquetaReferencial } from "@/components/EtiquetaReferencial";

// Modo holograma: pantalla negra con la casa referencial 4 veces (arriba, abajo, izquierda y derecha) para usarla
// con una pirámide holográfica puesta en el centro de la pantalla. Cada vista se gira para que su base mire al centro.
// Las 4 vistas llevan la etiqueta "Imagen referencial". Si el modelo falla, las 4 muestran la imagen del proyecto.

type Estado = "cargando" | "listo" | "fallo";

type Props = {
  slug: string;
  nombre: string;
  modeloUrl: string | null;
  imagenUrl: string;
  cargarVisor?: () => Promise<unknown>;
  tiempoMaxMs?: number;
};

const VISTAS = [
  { nombre: "superior", grados: 0, lugar: "col-start-2 row-start-1" },
  { nombre: "inferior", grados: 180, lugar: "col-start-2 row-start-3" },
  { nombre: "izquierda", grados: -90, lugar: "col-start-1 row-start-2" },
  { nombre: "derecha", grados: 90, lugar: "col-start-3 row-start-2" },
] as const;

const TIEMPO_OCULTAR_CONTROLES_MS = 4000;
const cargarModelViewer = () => import("@google/model-viewer");

export function Holograma({ slug, nombre, modeloUrl, imagenUrl, cargarVisor = cargarModelViewer, tiempoMaxMs = 15000 }: Props) {
  const [estado, setEstado] = useState<Estado>(modeloUrl ? "cargando" : "fallo");
  const [controlesVisibles, setControlesVisibles] = useState(true);
  const [puedePantallaCompleta, setPuedePantallaCompleta] = useState(false);
  const [enPantallaCompleta, setEnPantallaCompleta] = useState(false);
  const raizRef = useRef<HTMLDivElement | null>(null);
  const principalRef = useRef<HTMLElement | null>(null);
  const relojControles = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  // Las 4 vistas son el mismo archivo: basta escuchar a la primera para saber si cargó o falló.
  useEffect(() => {
    const visor = principalRef.current;
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

  // Los controles se esconden solos para que no estorben en la pantalla negra.
  const mostrarControles = () => {
    setControlesVisibles(true);
    clearTimeout(relojControles.current);
    relojControles.current = setTimeout(() => setControlesVisibles(false), TIEMPO_OCULTAR_CONTROLES_MS);
  };
  useEffect(() => {
    // Los controles empiezan visibles; solo se arranca la cuenta para esconderlos.
    relojControles.current = setTimeout(() => setControlesVisibles(false), TIEMPO_OCULTAR_CONTROLES_MS);
    return () => clearTimeout(relojControles.current);
  }, []);

  // Pantalla completa, pantalla encendida y sin desplazamiento mientras el modo está abierto.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de una API del navegador que no existe en el servidor
    setPuedePantallaCompleta(Boolean(document.fullscreenEnabled));
    const alCambiar = () => setEnPantallaCompleta(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", alCambiar);

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let cancelado = false;
    let sentinela: WakeLockSentinel | undefined;
    navigator.wakeLock
      ?.request("screen")
      .then((s) => {
        if (cancelado) void s.release();
        else sentinela = s;
      })
      .catch(() => {});

    return () => {
      cancelado = true;
      void sentinela?.release();
      document.removeEventListener("fullscreenchange", alCambiar);
      document.body.style.overflow = overflowPrevio;
    };
  }, []);

  const alternarPantallaCompleta = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void raizRef.current?.requestFullscreen?.();
  };

  const hayModelo = estado !== "fallo" && Boolean(modeloUrl);
  const claseControl =
    "rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/30 focus-visible:bg-white/30";

  return (
    <div
      ref={raizRef}
      onPointerMove={mostrarControles}
      onPointerDown={mostrarControles}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black"
    >
      <div className="grid h-[min(100dvh,100vw)] w-[min(100dvh,100vw)] grid-cols-3 grid-rows-3">
        {VISTAS.map((v, i) => (
          <figure key={v.nombre} aria-label={`Vista ${v.nombre} de la casa referencial`} className={`relative m-0 ${v.lugar}`}>
            <div className="relative h-full w-full" style={{ transform: `rotate(${v.grados}deg)` }}>
              {hayModelo ? (
                <model-viewer
                  ref={i === 0 ? (principalRef as React.Ref<HTMLElement>) : undefined}
                  src={modeloUrl!}
                  alt={`Vista ${v.nombre} de la casa referencial de ${nombre}`}
                  auto-rotate=""
                  rotation-per-second="40deg"
                  interaction-prompt="none"
                  disable-zoom=""
                  shadow-intensity="0"
                  environment-image="neutral"
                  exposure="1"
                  loading="eager"
                  style={{ width: "100%", height: "100%", background: "transparent", pointerEvents: "none" }}
                />
              ) : (
                <Image
                  src={imagenUrl}
                  alt={`Ilustración del proyecto ${nombre}`}
                  fill
                  sizes="34vmin"
                  className="object-contain"
                />
              )}
              <EtiquetaReferencial compacta className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap" />
            </div>
          </figure>
        ))}
      </div>

      <div
        data-controles
        onFocus={mostrarControles}
        className={`absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-2 p-3 transition-opacity duration-500 ${
          controlesVisibles ? "opacity-100" : "pointer-events-none opacity-0 focus-within:pointer-events-auto focus-within:opacity-100"
        }`}
      >
        <Link href={`/proyectos/${slug}`} className={claseControl}>
          Salir del modo holograma
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/proyectos/${slug}#contacto`} className={`${claseControl} !bg-coral !text-marino`}>
            Quiero información
          </Link>
          {puedePantallaCompleta && (
            <button type="button" onClick={alternarPantallaCompleta} className={claseControl}>
              {enPantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"}
            </button>
          )}
        </div>
      </div>

      {estado === "cargando" && (
        <p role="status" className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white/70">
          Cargando la casa en 3D…
        </p>
      )}
    </div>
  );
}
