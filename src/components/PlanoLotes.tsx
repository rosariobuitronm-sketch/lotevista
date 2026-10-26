"use client";

import { useEffect, useRef, useState } from "react";
import { useLote } from "@/components/ContextoLote";
import { formatearArea, formatearMetros, formatearSoles } from "@/lib/formato";
import { contarPorEstado, descripcionLote, distribuirLotes, MANZANAS_PLANO, VISTA_PLANO } from "@/lib/plano";
import type { EstadoLote, Lote } from "@/lib/proyectos";

const COLOR: Record<EstadoLote, string> = {
  disponible: "var(--disponible)",
  separado: "var(--separado)",
  vendido: "var(--vendido)",
};
// Además del color, cada estado lleva un patrón (rayas = vendido, puntos = separado) para quien no distingue colores.
const PATRON: Record<EstadoLote, string | null> = { disponible: null, separado: "url(#plano-puntos)", vendido: "url(#plano-rayas)" };
const ETIQUETA: Record<EstadoLote, string> = { disponible: "Disponible", separado: "Separado", vendido: "Vendido" };

const movimiento = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

function irA(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: movimiento(), block: "center" });
}

function Muestra({ estado }: { estado: EstadoLote }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="shrink-0 rounded-sm">
      <rect width="20" height="20" fill={COLOR[estado]} />
      {PATRON[estado] && <rect width="20" height="20" fill={PATRON[estado]!} />}
    </svg>
  );
}

function PanelLote({
  lote,
  alCerrar,
  alVerCasa,
  alPedirInformacion,
  panelRef,
}: {
  lote: Lote;
  alCerrar: () => void;
  alVerCasa: () => void;
  alPedirInformacion: () => void;
  panelRef: React.RefObject<HTMLElement | null>;
}) {
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
          Cerrar
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
            <Muestra estado={lote.estado} />
            {ETIQUETA[lote.estado]}
          </dd>
        </div>
      </dl>

      {lote.estado === "separado" && (
        <p className="rounded-lg bg-burbuja p-3 text-sm">
          Este lote está separado por otro cliente. Déjanos tus datos y un asesor te dirá si vuelve a estar disponible.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
        <button
          type="button"
          onClick={alVerCasa}
          className="rounded-lg border-2 border-marino bg-white px-4 py-2.5 font-bold text-marino hover:bg-celeste"
        >
          Ver casa 3D en este lote
        </button>
        <button
          type="button"
          onClick={alPedirInformacion}
          className="rounded-lg bg-coral px-4 py-2.5 font-bold text-marino hover:brightness-95"
        >
          Quiero información
        </button>
      </div>
      <p className="text-xs text-texto/70">La casa es solo una referencia: se vende únicamente el lote.</p>
    </section>
  );
}

export function PlanoLotes({ lotes, nombreProyecto }: { lotes: Lote[]; nombreProyecto: string }) {
  const { elegirInteres, elegir3d } = useLote();
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const lotesRef = useRef(new Map<string, SVGGElement>());

  const { dibujados } = distribuirLotes(lotes);
  const cuenta = contarPorEstado(lotes);
  const actual = lotes.find((l) => l.codigo === seleccionado) ?? null;

  // Al elegir un lote, el foco pasa a su panel para que el lector de pantalla lo anuncie.
  useEffect(() => {
    if (seleccionado) panelRef.current?.focus();
  }, [seleccionado]);

  // Escape cierra el panel desde cualquier parte de la página mientras esté abierto.
  useEffect(() => {
    if (!seleccionado) return;
    const alTecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSeleccionado(null);
      setTimeout(() => lotesRef.current.get(seleccionado)?.focus(), 0);
    };
    window.addEventListener("keydown", alTecla);
    return () => window.removeEventListener("keydown", alTecla);
  }, [seleccionado]);

  const cerrar = () => {
    const codigo = seleccionado;
    setSeleccionado(null);
    if (codigo) setTimeout(() => lotesRef.current.get(codigo)?.focus(), 0);
  };

  const abrir = (lote: Lote) => setSeleccionado(lote.codigo);

  const verCasa = () => {
    if (!actual) return;
    elegir3d(actual);
    irA("visor3d");
  };
  const pedirInformacion = () => {
    if (!actual) return;
    elegirInteres(actual);
    irA("contacto");
    document.getElementById("nombre")?.focus({ preventScroll: true });
  };

  return (
    <section aria-labelledby="titulo-plano" className="space-y-4">
      <div>
        <h2 id="titulo-plano" className="text-2xl font-bold text-marino">
          Plano de lotización
        </h2>
        <p className="text-sm font-semibold text-azul">Plano referencial, no a escala</p>
        <p className="text-sm text-texto/80">
          Los estados de los lotes son una referencia de demostración. Se vende únicamente el lote.
        </p>
      </div>

      <ul aria-label="Leyenda del plano" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-marino">
        {(["disponible", "separado", "vendido"] as const).map((estado) => (
          <li key={estado} className="flex items-center gap-2">
            <Muestra estado={estado} />
            {`${ETIQUETA[estado]} (${cuenta[estado]})`}
          </li>
        ))}
      </ul>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <svg
          viewBox={`0 0 ${VISTA_PLANO.ancho} ${VISTA_PLANO.alto}`}
          role="group"
          aria-label={`Plano de lotización de ${nombreProyecto}. Plano referencial, no a escala. Usa la tecla Tab para recorrer los lotes y Enter para ver sus datos.`}
          className="h-auto w-full rounded-2xl border border-marino/10"
        >
          <defs>
            <pattern id="plano-rayas" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="9" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="3" />
            </pattern>
            <pattern id="plano-puntos" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="1.8" fill="#ffffff" fillOpacity="0.7" />
            </pattern>
          </defs>

          <rect width={VISTA_PLANO.ancho} height={VISTA_PLANO.alto} fill="#F1EADB" />

          {/* Calle curva con su eje y su nombre */}
          <path id="eje-calle" data-calle d="M-20 340 C 250 260, 600 420, 1020 300" fill="none" stroke="#C9CFD6" strokeWidth="60" />
          <path d="M-20 340 C 250 260, 600 420, 1020 300" fill="none" stroke="#ffffff" strokeWidth="3" strokeDasharray="16 14" opacity="0.9" />
          <text fontSize="14" fontWeight="700" fill="#0F2E4C" letterSpacing="4" opacity="0.7">
            <textPath href="#eje-calle" startOffset="50%" textAnchor="middle">
              AV. PRINCIPAL
            </textPath>
          </text>

          {/* Pasaje y parque circular entre las manzanas A y B */}
          <rect x="480" y="215" width="40" height="80" fill="#C9CFD6" />
          <circle data-parque cx="500" cy="150" r="70" fill="#BFE5CF" stroke="#2BB673" strokeWidth="3" />
          <circle cx="500" cy="150" r="46" fill="#D5F0E1" />
          {[0, 60, 120, 180, 240, 300].map((grados) => (
            <circle
              key={grados}
              cx={500 + 58 * Math.cos((grados * Math.PI) / 180)}
              cy={150 + 58 * Math.sin((grados * Math.PI) / 180)}
              r="9"
              fill="#2BB673"
              opacity="0.85"
            />
          ))}
          <text x="500" y="156" textAnchor="middle" fontSize="16" fontWeight="700" fill="#0F2E4C">
            Parque
          </text>

          {/* Rótulos de las manzanas */}
          {(Object.keys(MANZANAS_PLANO) as (keyof typeof MANZANAS_PLANO)[]).map((letra) => {
            const mz = MANZANAS_PLANO[letra];
            return (
              <text
                key={letra}
                x={mz.x + mz.ancho / 2}
                y={letra === "C" ? mz.y - 10 : mz.y - 12}
                textAnchor="middle"
                fontSize="15"
                fontWeight="800"
                letterSpacing="3"
                fill="#0F2E4C"
              >
                {`MANZANA ${letra}`}
              </text>
            );
          })}

          {/* Norte */}
          <g transform="translate(950 600)" aria-hidden="true">
            <circle r="20" fill="#ffffff" stroke="#0F2E4C" strokeWidth="2" />
            <polygon points="0,-14 6,6 0,2 -6,6" fill="#0F2E4C" />
            <text y="-24" textAnchor="middle" fontSize="13" fontWeight="800" fill="#0F2E4C">
              N
            </text>
          </g>

          {/* Lotes */}
          {dibujados.map((l) => {
            const cx = l.x + l.ancho / 2;
            const cy = l.y + l.alto / 2;
            const elegido = seleccionado === l.codigo;
            const interior = (
              <>
                <rect
                  x={l.x}
                  y={l.y}
                  width={l.ancho}
                  height={l.alto}
                  rx="3"
                  fill={COLOR[l.estado]}
                  stroke={elegido ? "#0F2E4C" : "#ffffff"}
                  strokeWidth={elegido ? 6 : 2}
                />
                {PATRON[l.estado] && (
                  <rect x={l.x} y={l.y} width={l.ancho} height={l.alto} rx="3" fill={PATRON[l.estado]!} pointerEvents="none" />
                )}
                <text x={cx} y={cy - 4} textAnchor="middle" fontSize="36" fontWeight="800" fill="#0F2E4C" pointerEvents="none">
                  {l.numero}
                </text>
                <text x={cx} y={cy + 26} textAnchor="middle" fontSize="20" fontWeight="700" fill="#0F2E4C" pointerEvents="none">
                  {formatearArea(l.areaM2)}
                </text>
              </>
            );

            // Los lotes vendidos no se pueden elegir: no son botones ni reciben el foco, pero se describen.
            if (l.estado === "vendido") {
              return (
                <g key={l.codigo} role="img" aria-label={descripcionLote(l)} className="cursor-not-allowed">
                  {interior}
                </g>
              );
            }
            return (
              <g
                key={l.codigo}
                ref={(el) => {
                  if (el) lotesRef.current.set(l.codigo, el);
                  else lotesRef.current.delete(l.codigo);
                }}
                role="button"
                tabIndex={0}
                aria-pressed={elegido}
                aria-label={descripcionLote(l)}
                onClick={() => abrir(l)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    abrir(l);
                  }
                }}
                className="cursor-pointer outline-none hover:opacity-90 [&:focus-visible>rect:first-child]:stroke-azul [&:focus-visible>rect:first-child]:stroke-[7]"
              >
                {interior}
              </g>
            );
          })}
        </svg>

        <div aria-live="polite">
          {actual ? (
            <PanelLote
              lote={actual}
              alCerrar={cerrar}
              alVerCasa={verCasa}
              alPedirInformacion={pedirInformacion}
              panelRef={panelRef}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-marino/30 bg-white p-5 text-sm text-texto/80">
              Toca un lote disponible del plano para ver sus datos, ver la casa en 3D sobre él o pedir información.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
