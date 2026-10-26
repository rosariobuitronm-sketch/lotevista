"use client";

import { useLote } from "@/components/ContextoLote";
import { EtiquetaReferencial } from "@/components/EtiquetaReferencial";
import { formatearArea, formatearMetros } from "@/lib/formato";

// Aviso bajo el visor 3D cuando la persona eligió «Ver casa 3D en este lote» en el plano.
// El modelo 3D es el mismo para todos los lotes (es solo una referencia), por eso se aclara siempre.
export function CasaSobreLote() {
  const { lote3d, elegir3d } = useLote();
  if (!lote3d) return null;
  return (
    <div className="space-y-2 rounded-xl border border-azul/30 bg-celeste/60 p-3">
      <p role="status" className="text-sm text-marino">
        {`Mostrando la casa referencial sobre el lote ${lote3d.codigo} (${formatearArea(lote3d.areaM2)}, ${formatearMetros(lote3d.frenteM)} × ${formatearMetros(lote3d.fondoM)}). La casa es solo una referencia: se vende únicamente el lote.`}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <EtiquetaReferencial compacta />
        <button type="button" onClick={() => elegir3d(null)} className="text-sm font-semibold text-azul underline underline-offset-2">
          Quitar el lote
        </button>
      </div>
    </div>
  );
}
