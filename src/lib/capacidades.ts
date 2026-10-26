// Capacidades del dispositivo para decidir cómo mostrar la maqueta: en 3D (WebGL) o en el plano 2D de respaldo.

/** ¿El navegador puede dibujar en 3D (WebGL)? Nunca lanza error. */
export function soportaWebGL(doc: Document | undefined = typeof document === "undefined" ? undefined : document): boolean {
  if (!doc) return false;
  try {
    const lienzo = doc.createElement("canvas");
    return Boolean(lienzo.getContext("webgl2") || lienzo.getContext("webgl") || lienzo.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

type NavegadorConDatos = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

/** Celulares lentos o con poca conexión: se empieza en el plano 2D (la persona puede pasar a la maqueta cuando quiera). */
export function dispositivoLimitado(nav: Navigator | undefined = typeof navigator === "undefined" ? undefined : navigator): boolean {
  if (!nav) return false;
  const n = nav as NavegadorConDatos;
  if (typeof n.deviceMemory === "number" && n.deviceMemory <= 2) return true;
  if (typeof n.hardwareConcurrency === "number" && n.hardwareConcurrency <= 2) return true;
  if (n.connection?.saveData) return true;
  return n.connection?.effectiveType === "2g" || n.connection?.effectiveType === "slow-2g";
}
