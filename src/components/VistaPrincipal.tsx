"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLote } from "@/components/ContextoLote";
import { EtiquetaReferencial } from "@/components/EtiquetaReferencial";
import { PlanoLotes } from "@/components/PlanoLotes";
import { marcarUso } from "@/lib/actividad";
import { dispositivoLimitado, soportaWebGL } from "@/lib/capacidades";
import { formatearArea, formatearMetros, formatearSoles } from "@/lib/formato";
import { contarPorEstado } from "@/lib/plano";
import type { EstadoLote, Lote, ProyectoDetalle } from "@/lib/proyectos";

// La escena three.js pesa bastante: se baja solo cuando la persona está en el navegador y la vista 3D está activa.
const Maqueta3D = lazy(() => import("@/components/Maqueta3D"));
const cargarModelViewer = () => import("@google/model-viewer");

type Vista = "detectando" | "3d" | "2d";
type Aviso = "sin-webgl" | "limitado" | "fallo" | null;

const AVISOS: Record<Exclude<Aviso, null>, string> = {
  "sin-webgl": "Tu dispositivo no puede mostrar la maqueta en 3D. Te mostramos el plano 2D, con los mismos lotes.",
  limitado: "Empezamos con el plano 2D para que cargue rápido. Puedes pasar a la maqueta 3D cuando quieras.",
  fallo: "No pudimos mostrar la maqueta en 3D. Te mostramos el plano 2D, con los mismos lotes.",
};

const ETIQUETA: Record<EstadoLote, string> = { disponible: "Disponible", separado: "Separado", vendido: "Vendido" };
const COLOR: Record<EstadoLote, string> = { disponible: "bg-disponible", separado: "bg-separado", vendido: "bg-vendido" };

const movimiento = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

type Ra = "cargando" | "si" | "no";

function PanelLote({
  lote,
  modeloUrl,
  nombre,
  slug,
  cargarVisor,
  alCerrar,
  alPedirInformacion,
  panelRef,
}: {
  lote: Lote;
  modeloUrl: string | null;
  nombre: string;
  slug: string;
  cargarVisor: () => Promise<unknown>;
  alCerrar: () => void;
  alPedirInformacion: () => void;
  panelRef: React.RefObject<HTMLElement | null>;
}) {
  const visorRef = useRef<(HTMLElement & { canActivateAR?: boolean; activateAR?: () => void; loaded?: boolean }) | null>(null);
  const [ra, setRa] = useState<Ra>("cargando");

  // <model-viewer> se carga solo cuando hay un lote abierto; informa si el equipo admite Realidad Aumentada.
  useEffect(() => {
    if (!modeloUrl) return;
    let activo = true;
    cargarVisor().catch(() => activo && setRa("no"));
    const v = visorRef.current;
    if (!v) return;
    const revisar = () => setRa(v.canActivateAR ? "si" : "no");
    const alFallar = () => setRa("no");
    v.addEventListener("load", revisar);
    v.addEventListener("error", alFallar);
    if (v.loaded) revisar();
    return () => {
      activo = false;
      v.removeEventListener("load", revisar);
      v.removeEventListener("error", alFallar);
    };
  }, [modeloUrl, cargarVisor]);

  const verEnTuEspacio = () => {
    visorRef.current?.activateAR?.();
    marcarUso(slug, "ra");
  };

  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      aria-label={`Datos del lote ${lote.codigo}`}
      className="space-y-4 rounded-2xl border-2 border-marino bg-white p-5 shadow-sm outline-none focus-visible:ring-4 focus-visible:ring-azul/40"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-extrabold text-marino">{lote.codigo}</h3>
        <button
          type="button"
          onClick={alCerrar}
          className="rounded-lg border border-marino/30 px-3 py-1 text-sm font-semibold text-marino hover:bg-celeste"
        >
          Ver toda la maqueta
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="font-semibold text-azul">Área</dt>
          <dd className="text-base font-bold">{formatearArea(lote.areaM2)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-azul">Frente × fondo</dt>
          <dd className="text-base font-bold">{`${formatearMetros(lote.frenteM)} × ${formatearMetros(lote.fondoM)}`}</dd>
        </div>
        <div>
          <dt className="font-semibold text-azul">Precio referencial</dt>
          <dd className="text-base font-bold">{formatearSoles(lote.precio)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-azul">Estado</dt>
          <dd className="flex items-center gap-2 text-base font-bold">
            <span aria-hidden="true" className={`inline-block h-4 w-4 rounded-sm ${COLOR[lote.estado]}`} />
            {ETIQUETA[lote.estado]}
          </dd>
        </div>
      </dl>

      {lote.estado === "separado" && (
        <p className="rounded-lg bg-burbuja p-3 text-sm">
          Este lote está separado por otro cliente. Déjanos tus datos y un asesor te dirá si vuelve a estar disponible.
        </p>
      )}

      {modeloUrl && (
        <div className="relative h-40 overflow-hidden rounded-xl bg-celeste/60">
          <model-viewer
            ref={visorRef as React.Ref<HTMLElement>}
            src={modeloUrl}
            alt={`Casa referencial del proyecto ${nombre}`}
            ar=""
            ar-modes="webxr scene-viewer quick-look"
            camera-controls=""
            touch-action="pan-y"
            environment-image="neutral"
            shadow-intensity="0"
            exposure="0.9"
            interaction-prompt="none"
            style={{ width: "100%", height: "100%", background: "transparent" }}
          >
            {/* Solo durante una sesión de RA de Chrome (WebXR): ahí el visor es la capa superpuesta. */}
            <div data-solo-ra className="pointer-events-none absolute left-3 top-3 hidden [model-viewer[ar-status=session-started]_&]:block">
              <EtiquetaReferencial compacta />
            </div>
          </model-viewer>
          <div className="pointer-events-none absolute bottom-2 left-2 [model-viewer[ar-status=session-started]_~_&]:hidden">
            <EtiquetaReferencial compacta />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
        {modeloUrl && (
          <button
            type="button"
            onClick={verEnTuEspacio}
            disabled={ra !== "si"}
            className="rounded-lg border-2 border-marino bg-white px-4 py-2.5 font-bold text-marino hover:bg-celeste disabled:cursor-not-allowed disabled:opacity-60"
          >
            Ver en tu espacio
          </button>
        )}
        <button
          type="button"
          onClick={alPedirInformacion}
          className="rounded-lg bg-coral px-4 py-2.5 font-bold text-marino hover:brightness-95"
        >
          Quiero información
        </button>
      </div>
      {modeloUrl && ra === "no" && (
        <p role="note" className="rounded-lg bg-burbuja p-3 text-sm">
          Este dispositivo no admite Realidad Aumentada. Puedes ver la casa en 3D aquí o abrir esta página en un celular compatible.
        </p>
      )}
      <p className="text-xs text-texto/70">La casa es solo una referencia: se vende únicamente el lote.</p>
    </section>
  );
}

export function VistaPrincipal({
  proyecto,
  cargarVisor = cargarModelViewer,
}: {
  proyecto: ProyectoDetalle;
  cargarVisor?: () => Promise<unknown>;
}) {
  const { elegirInteres } = useLote();
  const [vista, setVista] = useState<Vista>("detectando");
  const [aviso, setAviso] = useState<Aviso>(null);
  const [conWebGL, setConWebGL] = useState(true);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  // Se decide en el navegador: con WebGL y un equipo normal, la maqueta; si no, el plano 2D con su aviso.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- depende de APIs del navegador (WebGL) que no existen en el servidor */
    if (!soportaWebGL()) {
      setConWebGL(false);
      setAviso("sin-webgl");
      setVista("2d");
    } else if (dispositivoLimitado()) {
      setAviso("limitado");
      setVista("2d");
    } else {
      setVista("3d");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const actual = proyecto.lotes.find((l) => l.codigo === seleccionado) ?? null;
  const cuenta = contarPorEstado(proyecto.lotes);

  useEffect(() => {
    if (seleccionado) panelRef.current?.focus();
  }, [seleccionado]);

  useEffect(() => {
    if (!seleccionado) return;
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSeleccionado(null);
    };
    window.addEventListener("keydown", alTecla);
    return () => window.removeEventListener("keydown", alTecla);
  }, [seleccionado]);

  const elegir = (lote: Lote) => {
    if (lote.estado === "vendido") return;
    setSeleccionado(lote.codigo);
    marcarUso(proyecto.slug, "3d");
  };

  const pedirInformacion = () => {
    if (!actual) return;
    elegirInteres(actual);
    document.getElementById("contacto")?.scrollIntoView({ behavior: movimiento(), block: "center" });
    document.getElementById("nombre")?.focus({ preventScroll: true });
  };

  const cambiarA = (v: "2d" | "3d") => {
    setSeleccionado(null);
    setVista(v);
    setAviso(null);
  };

  if (vista === "detectando") {
    return (
      <div aria-busy="true" aria-label="Preparando la vista del proyecto" className="h-[420px] animate-pulse rounded-2xl bg-celeste/60" />
    );
  }

  const boton = (texto: string, a: "2d" | "3d") => (
    <button
      type="button"
      onClick={() => cambiarA(a)}
      className="rounded-lg border-2 border-marino bg-white px-4 py-2 font-bold text-marino hover:bg-celeste"
    >
      {texto}
    </button>
  );

  return (
    <div className="space-y-4">
      {aviso && (
        <p role="note" className="rounded-xl border border-separado/60 bg-burbuja p-3 text-sm text-marino">
          {AVISOS[aviso]}
        </p>
      )}

      {vista === "2d" ? (
        <>
          {conWebGL && <div>{boton("Ver maqueta 3D", "3d")}</div>}
          <PlanoLotes lotes={proyecto.lotes} nombreProyecto={proyecto.nombre} />
        </>
      ) : (
        <section aria-labelledby="titulo-maqueta" className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="titulo-maqueta" className="text-2xl font-bold text-marino">
                Maqueta 3D del proyecto
              </h2>
              <p className="text-sm text-texto/80">
                Gira y acerca la maqueta; toca un lote disponible o separado para ver sus datos y la casa sobre él. Se vende
                únicamente el lote.
              </p>
            </div>
            {boton("Ver plano 2D", "2d")}
          </div>

          <ul aria-label="Leyenda de la maqueta" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-marino">
            {(["disponible", "separado", "vendido"] as const).map((estado) => (
              <li key={estado} className="flex items-center gap-2">
                <span aria-hidden="true" className={`inline-block h-4 w-4 rounded-sm ${COLOR[estado]}`} />
                {`${ETIQUETA[estado]} (${cuenta[estado]})`}
              </li>
            ))}
          </ul>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <div
                role="img"
                aria-label={`Maqueta 3D de ${proyecto.nombre}. Arrastra para girar y usa la rueda o dos dedos para acercar. Para recorrer los lotes con el teclado, usa el plano 2D.`}
                className="h-[60vh] min-h-[340px] touch-none overflow-hidden rounded-2xl border border-marino/10 bg-celeste"
              >
                <Suspense fallback={<p className="p-6 text-marino">Cargando la maqueta…</p>}>
                  <Maqueta3D
                    lotes={proyecto.lotes}
                    seleccionado={seleccionado}
                    modeloUrl={proyecto.modeloArchivo}
                    alElegir={elegir}
                    alMover={() => marcarUso(proyecto.slug, "3d")}
                    alFallar={() => {
                      setSeleccionado(null);
                      setAviso("fallo");
                      setVista("2d");
                    }}
                  />
                </Suspense>
              </div>
              <EtiquetaReferencial />
            </div>

            <div aria-live="polite">
              {actual ? (
                <PanelLote
                  key={actual.codigo}
                  lote={actual}
                  modeloUrl={proyecto.modeloArchivo}
                  nombre={proyecto.nombre}
                  slug={proyecto.slug}
                  cargarVisor={cargarVisor}
                  alCerrar={() => setSeleccionado(null)}
                  alPedirInformacion={pedirInformacion}
                  panelRef={panelRef}
                />
              ) : (
                <p className="rounded-2xl border border-dashed border-marino/30 bg-white p-5 text-sm text-texto/80">
                  Toca un lote disponible o separado de la maqueta para ver sus datos, la casa sobre él y pedir información.
                </p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
