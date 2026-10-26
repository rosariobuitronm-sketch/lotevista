"use client";

import { useRef, useState } from "react";

type Props = { alExito?: () => void };

const irAlPanel = () => window.location.assign("/panel");

export function FormularioLogin({ alExito = irAlPanel }: Props) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (enviandoRef.current) return;
    if (!usuario.trim() || !clave) {
      setMensaje("Escribe tu usuario y tu contraseña.");
      return;
    }
    enviandoRef.current = true;
    setEnviando(true);
    setMensaje("");
    try {
      const res = await fetch("/api/panel/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, clave }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        alExito();
        return;
      }
      setClave("");
      setMensaje(json?.error?.mensaje ?? "No pudimos iniciar sesión ahora. Intenta de nuevo.");
    } catch {
      setMensaje("No pudimos conectar. Revisa tu conexión a internet e inténtalo de nuevo.");
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  const campo = "mt-1 block w-full rounded-lg border border-marino/30 bg-white px-3 py-2.5 text-base text-texto";
  return (
    <form onSubmit={enviar} noValidate className="space-y-4 rounded-2xl border border-marino/10 bg-white p-6 shadow-sm">
      <div>
        <label htmlFor="usuario" className="block text-sm font-semibold text-marino">
          Usuario
        </label>
        <input
          id="usuario"
          name="usuario"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          required
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          className={campo}
        />
      </div>
      <div>
        <label htmlFor="clave" className="block text-sm font-semibold text-marino">
          Contraseña
        </label>
        <input
          id="clave"
          name="clave"
          type="password"
          autoComplete="current-password"
          required
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          className={campo}
        />
      </div>
      {mensaje && (
        <p role="alert" className="rounded-lg bg-burbuja p-3 text-sm font-medium text-red-800">
          {mensaje}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-coral px-4 py-3 text-base font-bold text-marino hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
