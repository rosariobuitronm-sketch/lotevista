"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { Lote } from "@/lib/proyectos";

// Comunica el plano de lotes con el formulario y el visor 3D de la misma ficha, sin enviar nada al servidor.
// - loteInteres: el lote que la persona eligió con "Quiero información" (se precarga en el formulario).
// - lote3d: el lote elegido con "Ver casa 3D en este lote" (el visor lo muestra como referencia).

type Valor = {
  loteInteres: Lote | null;
  lote3d: Lote | null;
  elegirInteres: (lote: Lote | null) => void;
  elegir3d: (lote: Lote | null) => void;
};

const SIN_PROVEEDOR: Valor = { loteInteres: null, lote3d: null, elegirInteres: () => {}, elegir3d: () => {} };
const Contexto = createContext<Valor>(SIN_PROVEEDOR);

export function ProveedorLote({ children }: { children: React.ReactNode }) {
  const [loteInteres, elegirInteres] = useState<Lote | null>(null);
  const [lote3d, elegir3d] = useState<Lote | null>(null);
  const valor = useMemo(() => ({ loteInteres, lote3d, elegirInteres, elegir3d }), [loteInteres, lote3d]);
  return <Contexto value={valor}>{children}</Contexto>;
}

/** Sin proveedor (por ejemplo en otras páginas) devuelve valores vacíos que no hacen nada. */
export const useLote = () => useContext(Contexto);
