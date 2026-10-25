import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest no activa los globales, así que la limpieza automática de Testing Library hay que registrarla.
afterEach(() => {
  cleanup();
});
