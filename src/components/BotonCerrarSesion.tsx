"use client";

import { useState } from "react";

const irAlLogin = () => {
  // Recarga completa a propósito: así no queda ningún dato del panel en memoria.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/panel/login";
};

export function BotonCerrarSesion({ alTerminar = irAlLogin }: { alTerminar?: () => void }) {
  const [cerrando, setCerrando] = useState(false);

  async function cerrar() {
    setCerrando(true);
    try {
      await fetch("/api/panel/logout", { method: "POST" });
    } finally {
      alTerminar();
    }
  }

  return (
    <button
      type="button"
      onClick={cerrar}
      disabled={cerrando}
      className="rounded-lg border border-marino/30 bg-white px-4 py-2 text-sm font-semibold text-marino hover:bg-celeste disabled:opacity-60"
    >
      {cerrando ? "Cerrando…" : "Cerrar sesión"}
    </button>
  );
}
