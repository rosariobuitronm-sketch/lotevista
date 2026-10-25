import { ETIQUETA_REFERENCIAL, ETIQUETA_REFERENCIAL_APOYO } from "@/lib/textos";

type Props = {
  /** Solo la insignia (para tarjetas e imágenes pequeñas). Por defecto lleva también el texto de apoyo. */
  compacta?: boolean;
  /** Clases extra para ubicar la etiqueta (por ejemplo, sobre una imagen). */
  className?: string;
};

// Etiqueta obligatoria en toda pantalla que muestre la casa (INDECOPI): ver CLAUDE.md, regla de negocio 2.
// Siempre incluye el texto "Imagen referencial", también cuando se muestra la imagen de respaldo.
export function EtiquetaReferencial({ compacta = false, className = "" }: Props) {
  return (
    <div className={`inline-flex max-w-full flex-col gap-1 ${className}`} data-testid="etiqueta-referencial">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-marino px-3 py-1 text-xs font-bold text-white shadow">
        <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-coral" />
        {ETIQUETA_REFERENCIAL}
      </span>
      {!compacta && (
        <span className="max-w-md rounded bg-white/90 px-2 py-1 text-xs leading-snug text-texto shadow-sm">
          {ETIQUETA_REFERENCIAL_APOYO}
        </span>
      )}
    </div>
  );
}
