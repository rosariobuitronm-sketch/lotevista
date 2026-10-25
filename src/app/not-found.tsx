import type { Metadata } from "next";
import { NoEncontrado } from "@/components/NoEncontrado";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return <NoEncontrado />;
}
