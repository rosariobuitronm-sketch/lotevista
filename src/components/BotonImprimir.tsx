"use client";

export function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-coral px-5 py-2.5 font-bold text-marino hover:brightness-95 print:hidden"
    >
      Imprimir
    </button>
  );
}
