import QRCode from "qrcode";

// El QR de cada proyecto abre su ficha con el canal de origen "qr_sala" (ADR 0006).
export const SLUG_QR_VALIDO = /^[a-z0-9-]{1,80}$/;

/** Dirección base del sitio: SITE_URL si está configurada; si no, el origen de la propia petición. */
export function origenDelSitio(request: Request): string {
  const configurada = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  return configurada || new URL(request.url).origin;
}

export const urlFichaConQr = (origen: string, slug: string) => `${origen}/proyectos/${slug}?canal=qr_sala`;

/** Genera el QR como imagen PNG, en el servidor. */
export async function generarQrPng(texto: string): Promise<Uint8Array> {
  const buffer = await QRCode.toBuffer(texto, {
    type: "png",
    width: 640,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#0F2E4C", light: "#FFFFFF" },
  });
  return new Uint8Array(buffer);
}
