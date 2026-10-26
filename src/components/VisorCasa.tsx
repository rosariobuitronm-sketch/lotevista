"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLote } from "@/components/ContextoLote";
import { EtiquetaReferencial } from "@/components/EtiquetaReferencial";
import { marcarUso } from "@/lib/actividad";
import type { Hotspot, MedidasLote } from "@/lib/terreno";
import { alternarTerrenoEnRA } from "@/lib/terreno";

type Estado = "cargando" | "listo" | "fallo";
type SoporteAR = "desconocido" | "si" | "no";

export type LoteVisor = MedidasLote & { codigo: string; areaM2: number };
export type ModeloPreparado = { src: string; hotspots: Hotspot[]; liberar?: () => void };

type Props = {
  nombre: string;
  /** Ruta del .glb. Si es null, se muestra directamente la imagen del proyecto. */
  modeloUrl: string | null;
  /** Imagen de respaldo si el modelo falla o tarda. */
  imagenUrl: string;
  /** Identificador del proyecto: con él se recuerda (solo en el navegador) si la persona usó el 3D o la RA. */
  proyectoSlug?: string;
  /** Lote de referencia: con él la casa se muestra sobre un terreno verde con las medidas del lote. */
  lote?: LoteVisor;
  /** Arma el modelo con el terreno (se inyecta en las pruebas). */
  prepararModelo?: (modeloUrl: string, lote: LoteVisor) => Promise<ModeloPreparado>;
  /** Carga la librería <model-viewer> (se inyecta en las pruebas). */
  cargarVisor?: () => Promise<unknown>;
  /** Tiempo máximo de espera antes de mostrar la imagen de respaldo. */
  tiempoMaxMs?: number;
};

const cargarModelViewer = () => import("@google/model-viewer");

// Arma, en el navegador, un modelo nuevo con la casa sobre el terreno del lote. La librería que lo hace solo se
// descarga cuando se necesita.
async function prepararModeloReal(modeloUrl: string, lote: LoteVisor): Promise<ModeloPreparado> {
  const respuesta = await fetch(modeloUrl);
  if (!respuesta.ok) throw new Error("No se pudo leer el modelo");
  const original = new Uint8Array(await respuesta.arrayBuffer());
  const { componerCasaSobreTerreno, hotspotsDelTerreno } = await import("@/lib/terreno");
  const { glb } = await componerCasaSobreTerreno(original, lote);
  const src = URL.createObjectURL(new Blob([glb as BlobPart], { type: "model/gltf-binary" }));
  return { src, hotspots: hotspotsDelTerreno(lote), liberar: () => URL.revokeObjectURL(src) };
}

// Muestra la casa referencial en 3D (sobre un terreno con las medidas del lote) y, si el equipo lo permite, en Realidad Aumentada.
// Etiqueta "Imagen referencial": hay UNA sola visible, junto al texto legal bajo el visor. Dentro del visor hay otra, oculta,
// que aparece únicamente durante una sesión de RA de Chrome (WebXR), que usa el visor como capa superpuesta.
// Limitación: en Scene Viewer (Android) y Quick Look (iPhone) el sistema dibuja la RA en su propia pantalla y no deja
// superponer la etiqueta; por eso se recuerda antes de entrar (ver README).
export function VisorCasa({
  nombre,
  modeloUrl,
  imagenUrl,
  proyectoSlug,
  lote,
  prepararModelo = prepararModeloReal,
  cargarVisor = cargarModelViewer,
  tiempoMaxMs = 15000,
}: Props) {
  const { lote3d } = useLote(); // lote elegido con «Ver casa 3D en este lote»
  const [estado, setEstado] = useState<Estado>(modeloUrl ? "cargando" : "fallo");
  const [ar, setAr] = useState<SoporteAR>("desconocido");
  const [falloAr, setFalloAr] = useState(false);
  const [preparado, setPreparado] = useState<{ clave: string; modelo: ModeloPreparado } | null>(null);
  const visorRef = useRef<HTMLElement | null>(null);

  const origen = lote3d ?? lote ?? null;
  const frenteM = origen?.frenteM;
  const fondoM = origen?.fondoM;
  const areaM2 = origen?.areaM2;
  const codigo = origen?.codigo;
  const medidas = useMemo<LoteVisor | null>(
    () => (frenteM && fondoM && areaM2 && codigo !== undefined ? { codigo, frenteM, fondoM, areaM2 } : null),
    [frenteM, fondoM, areaM2, codigo],
  );
  const sobreTerreno = Boolean(modeloUrl && medidas);
  const clave = sobreTerreno ? `${modeloUrl}|${frenteM}x${fondoM}|${areaM2}` : null;

  // Arma la casa sobre el terreno del lote; si algo falla, se usa la casa sola (nunca se muestra un error técnico).
  useEffect(() => {
    if (!clave || !modeloUrl || !medidas) return;
    let cancelado = false;
    let liberar: (() => void) | undefined;
    prepararModelo(modeloUrl, medidas)
      .then((modelo) => {
        liberar = modelo.liberar;
        if (cancelado) liberar?.();
        else setPreparado({ clave, modelo });
      })
      .catch(() => {
        if (!cancelado) setPreparado({ clave, modelo: { src: modeloUrl, hotspots: [] } });
      });
    return () => {
      cancelado = true;
      liberar?.();
    };
  }, [clave, modeloUrl, medidas, prepararModelo]);

  const actual = preparado && preparado.clave === clave ? preparado.modelo : null;
  const listo = !sobreTerreno || actual !== null;
  const src = sobreTerreno ? actual?.src : (modeloUrl ?? undefined);

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
      if (estadoRa === "session-started") {
        if (proyectoSlug) marcarUso(proyectoSlug, "ra");
        alternarTerrenoEnRA(visor as Parameters<typeof alternarTerrenoEnRA>[0], false); // en RA solo se ve la casa
      }
      if (estadoRa === "not-presenting") alternarTerrenoEnRA(visor as Parameters<typeof alternarTerrenoEnRA>[0], true);
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
  }, [estado, proyectoSlug, listo, src]);

  const mostrarImagen = estado === "fallo" || !modeloUrl;
  return (
    <div className="space-y-2">
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl bg-gradient-to-b from-celeste to-fondo">
        {mostrarImagen ? (
          <Image
            src={imagenUrl}
            alt={`Ilustración del proyecto ${nombre}`}
            fill
            priority
            sizes="(min-width: 1024px) 560px, 100vw"
            className="object-cover"
          />
        ) : (
          listo && (
            <model-viewer
              ref={visorRef as React.Ref<HTMLElement>}
              src={src}
              alt={`Modelo 3D referencial de una casa del proyecto ${nombre}${
                sobreTerreno && medidas ? `, sobre un terreno de ${frenteM} por ${fondoM} metros` : ""
              }. Arrastra para girarla.`}
              ar=""
              ar-modes="webxr scene-viewer quick-look"
              camera-controls=""
              auto-rotate=""
              touch-action="pan-y"
              shadow-intensity={sobreTerreno ? "0" : "1"}
              environment-image="neutral"
              exposure="0.9"
              interaction-prompt="auto"
              {...(sobreTerreno
                ? { "camera-orbit": "35deg 66deg 78%", "min-camera-orbit": "auto 20deg auto", "max-camera-orbit": "auto 86deg auto", "field-of-view": "30deg" }
                : {})}
              style={{ width: "100%", height: "100%", background: "transparent" }}
            >
              {/* Solo durante una sesión de RA de Chrome (WebXR): ahí el visor es la capa superpuesta y esta etiqueta se hace visible. */}
              <div data-solo-ra className="pointer-events-none absolute left-3 top-3 hidden [model-viewer[ar-status=session-started]_&]:block">
                <EtiquetaReferencial compacta />
              </div>

              {/* Medidas del lote ancladas sobre el terreno: giran junto con la casa y no se ven en RA. */}
              {actual?.hotspots.map((h) => (
                <div
                  key={h.id}
                  slot={`hotspot-${h.id}`}
                  data-position={h.posicion}
                  data-normal="0m 1m 0m"
                  className="pointer-events-none whitespace-nowrap rounded-md bg-white/95 px-2 py-0.5 text-xs font-bold text-marino shadow [model-viewer[ar-status=session-started]_&]:hidden"
                >
                  {h.texto}
                </div>
              ))}

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
          )
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
      {sobreTerreno && medidas && estado !== "fallo" && (
        <p className="text-sm text-texto/80">
          {`Terreno referencial del lote ${medidas.codigo}: ${frenteM} m de frente por ${fondoM} m de fondo (${areaM2} m²). Elige otro lote en el plano para verlo aquí.`}
        </p>
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

      {/* La única etiqueta visible: junto al texto legal. */}
      <EtiquetaReferencial />
    </div>
  );
}
