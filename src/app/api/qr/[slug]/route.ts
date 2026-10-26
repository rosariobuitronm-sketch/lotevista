import { responderError } from "@/lib/api";
import { generarQrPng, origenDelSitio, SLUG_QR_VALIDO, urlFichaConQr } from "@/lib/qr";

// GET /api/qr/[slug]: QR en PNG que abre la ficha del proyecto con el canal qr_sala.
// No consulta la base de datos: el QR de un proyecto que ya no existe lleva a la página amable del catálogo.
export async function GET(request: Request, contexto: { params: Promise<{ slug: string }> }) {
  const { slug } = await contexto.params;
  if (!SLUG_QR_VALIDO.test(slug)) {
    return responderError(400, { codigo: "validacion", mensaje: "El proyecto indicado no es válido." });
  }

  const png = await generarQrPng(urlFichaConQr(origenDelSitio(request), slug));
  const cabeceras: Record<string, string> = {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=3600",
  };
  if (new URL(request.url).searchParams.get("descargar") === "1") {
    cabeceras["Content-Disposition"] = `attachment; filename="qr-${slug}.png"`;
  }
  return new Response(png as BodyInit, { headers: cabeceras });
}
