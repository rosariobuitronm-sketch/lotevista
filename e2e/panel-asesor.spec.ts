import { expect, test } from "@playwright/test";
import { celularUnico, credencialesAsesor, limpiar } from "./soporte";

// Flujo 2: el asesor entra con su usuario y su clave y ve en el panel al lead que acaba de llegar.
const celular = celularUnico();

test.afterAll(() => limpiar([celular]));

test("sin sesión el panel manda al login; con login el asesor ve el lead nuevo", async ({ page, request }) => {
  // Sin sesión no se ve nada: se redirige al login.
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/panel\/login/);

  // Llega un lead (por la misma API que usa el formulario).
  const respuesta = await request.post("/api/leads", {
    data: {
      nombre: "Lead Para Panel",
      celular,
      correo: "panel.e2e@example.com",
      consentimiento: true,
      proyecto: "algarrobos-de-sunampe",
    },
  });
  expect(respuesta.ok()).toBe(true);

  const { usuario, clave } = credencialesAsesor();
  await page.getByLabel("Usuario").fill(usuario);
  await page.getByLabel("Contraseña").fill(clave);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Panel del asesor" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lead Para Panel" })).toBeVisible();
  await expect(page.getByText(celular)).toBeVisible();
});
