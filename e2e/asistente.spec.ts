import { expect, test } from "@playwright/test";

// Flujo 3: el asistente responde. El servidor E2E arranca sin clave de Gemini, así que responde el FAQ guardado
// en la base (un resultado repetible, sin llamar a la IA real).
test("el asistente responde una pregunta frecuente con los datos del proyecto", async ({ page }) => {
  await page.goto("/proyectos/algarrobos-de-sunampe");

  await page.getByPlaceholder("Escribe tu pregunta…").fill("¿La casa que veo en 3D está incluida?");
  await page.getByRole("button", { name: "Enviar" }).click();

  const conversacion = page.getByRole("log", { name: "Conversación con Vicha" });
  await expect(conversacion.getByText("¿La casa que veo en 3D está incluida?")).toBeVisible();
  await expect(conversacion.getByText(/La inmobiliaria vende únicamente el lote/)).toBeVisible();
});
