import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export async function GET() {
  try {
    const sql = getSql();
    await sql`SELECT 1 AS ok`;
    return NextResponse.json({ ok: true, base: "accesible" });
  } catch {
    // Nunca se devuelve el error real: podría incluir datos de conexión.
    return NextResponse.json({ ok: false, base: "no disponible" }, { status: 503 });
  }
}
