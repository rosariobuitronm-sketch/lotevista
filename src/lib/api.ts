import { NextResponse } from "next/server";

// Forma fija de todas las respuestas JSON (ADR 0003): { ok: true, datos } o { ok: false, error }.
// Los mensajes están en español y nunca exponen detalles internos.
export type ErrorApi = { codigo: string; mensaje: string; campos?: Record<string, string> };

export type RespuestaApi<T> = { ok: true; datos: T } | { ok: false; error: ErrorApi };

export const responderOk = <T>(datos: T, status = 200) => NextResponse.json({ ok: true, datos }, { status });

export const responderError = (status: number, error: ErrorApi, cabeceras?: HeadersInit) =>
  NextResponse.json({ ok: false, error }, { status, headers: cabeceras });
