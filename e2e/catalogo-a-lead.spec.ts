import { expect, test } from "@playwright/test";
import { celularUnico, consultar, limpiar } from "./soporte";

// Flujo 1: una persona entra al catálogo, abre un proyecto, elige un lote en el plano y deja sus datos.
const celular = celularUnico();

test.beforeEach(async ({ page }) => {
  // Un equipo "normal": así la ficha empieza en la maqueta 3D y la persona pasa al plano con el botón.
  await page.addInitScript(() => Object.defineProperty(navigator, "hardwareConcurrency", { value: 8 }));
});
test.afterAll(() => limpiar([celular]));

test("catálogo → ficha → plano → lote → formulario → lead guardado", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Ver proyecto Algarrobos de Sunampe/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Algarrobos de Sunampe" })).toBeVisible();

  await page.getByRole("button", { name: "Ver plano 2D" }).click();
  await expect(page.getByRole("heading", { name: "Plano de lotización" })).toBeVisible();

  await page.getByRole("button", { name: /^Mz\. A - Lt\. 1,.*disponible$/ }).click();
  const panel = page.getByRole("region", { name: "Datos del lote Mz. A - Lt. 1" });
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: "Quiero información" }).click();
  await expect(page.getByText("Lote de interés: Mz. A - Lt. 1")).toBeVisible();

  await page.getByLabel("Nombre completo").fill("Prueba Automática");
  await page.getByRole("textbox", { name: "Celular" }).fill(celular);
  await page.getByLabel("Correo electrónico").fill("prueba.e2e@example.com");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Quiero que me contacten" }).click();

  await expect(page.getByRole("heading", { name: "¡Gracias, Prueba!" })).toBeVisible();

  // El lead quedó guardado una sola vez, con consentimiento y el lote elegido.
  const filas = await consultar<{ consentimiento: boolean }>("SELECT consentimiento_aceptado AS consentimiento FROM leads WHERE celular = $1", [celular]);
  expect(filas).toHaveLength(1);
  expect(filas[0].consentimiento).toBe(true);
});
