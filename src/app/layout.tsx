import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Encabezado } from "@/components/Encabezado";
import { Pie } from "@/components/Pie";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LoteVista · Lotes en 3D y Realidad Aumentada",
    template: "%s · LoteVista",
  },
  description: "Visor inmobiliario de lotes en 3D y Realidad Aumentada. Datos ficticios.",
  icons: { icon: "/lotevista-icono.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F2E4C",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-coral focus:px-3 focus:py-2 focus:font-semibold focus:text-marino"
        >
          Saltar al contenido
        </a>
        <Encabezado />
        <div id="contenido" className="flex flex-1 flex-col">
          {children}
        </div>
        <Pie />
      </body>
    </html>
  );
}
