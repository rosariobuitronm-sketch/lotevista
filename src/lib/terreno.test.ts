// @vitest-environment node
import { readFileSync } from "node:fs";
import { getBounds, NodeIO } from "@gltf-transform/core";
import { describe, expect, it } from "vitest";
import { alternarTerrenoEnRA, componerCasaSobreTerreno, CORAL_ESTACA, hotspotsDelTerreno, VERDE_TERRENO } from "@/lib/terreno";

const casa = (archivo: string) => new Uint8Array(readFileSync(`public/modelos/${archivo}`));
const leer = (glb: Uint8Array) => new NodeIO().readBinary(glb);

describe("componerCasaSobreTerreno", () => {
  it("el terreno mide exactamente el frente por el fondo del lote", async () => {
    const { glb } = await componerCasaSobreTerreno(casa("casa-sunampe.glb"), { frenteM: 8, fondoM: 15 });
    const doc = await leer(glb);
    const terreno = doc.getRoot().listNodes().find((n) => n.getName() === "terreno")!;
    const b = getBounds(terreno);
    expect(+(b.max[0] - b.min[0]).toFixed(3)).toBe(8); // frente (ancho, eje x)
    expect(+(b.max[2] - b.min[2]).toFixed(3)).toBe(15); // fondo (largo, eje z)
    expect(b.max[1]).toBeCloseTo(0, 5); // la cara de arriba del terreno está en el suelo (y = 0)
    expect(b.min[1]).toBeLessThan(-0.05); // y tiene grosor hacia abajo
  });

  it("la casa queda apoyada sobre el terreno, centrada y dentro del lote", async () => {
    for (const [archivo, frente, fondo] of [
      ["casa-sunampe.glb", 8, 15],
      ["casa-huaral.glb", 6, 15], // el frente más angosto: la casa debe achicarse para caber
      ["casa-chira.glb", 10, 20],
    ] as const) {
      const { glb } = await componerCasaSobreTerreno(casa(archivo), { frenteM: frente, fondoM: fondo });
      const doc = await leer(glb);
      const nodoCasa = doc.getRoot().listNodes().find((n) => n.getName() === "casa")!;
      const b = getBounds(nodoCasa);
      expect(b.min[1], archivo).toBeCloseTo(0, 4); // pisa el terreno
      expect(b.max[1], archivo).toBeGreaterThan(1.5); // tiene un tamaño de casa real (metros)
      expect((b.max[0] + b.min[0]) / 2, archivo).toBeCloseTo(0, 3); // centrada a lo ancho
      expect((b.max[2] + b.min[2]) / 2, archivo).toBeCloseTo(0, 3); // centrada a lo largo
      expect(b.max[0] - b.min[0], archivo).toBeLessThanOrEqual(frente * 0.85 + 0.001); // cabe con retiro
      expect(b.max[2] - b.min[2], archivo).toBeLessThanOrEqual(fondo * 0.6 + 0.001);
    }
  });

  it("conserva todos los materiales y mallas de la casa y agrega el terreno verde y las estacas", async () => {
    const original = await leer(casa("casa-chira.glb"));
    const { glb } = await componerCasaSobreTerreno(casa("casa-chira.glb"), { frenteM: 10, fondoM: 20 });
    const doc = await leer(glb);
    expect(doc.getRoot().listMeshes().length).toBe(original.getRoot().listMeshes().length + 2); // terreno + estaca
    const nombres = doc.getRoot().listMaterials().map((m) => m.getName());
    expect(nombres).toEqual(expect.arrayContaining(["terreno", "estaca"]));
    const verde = doc.getRoot().listMaterials().find((m) => m.getName() === "terreno")!.getBaseColorFactor();
    expect(verde[1]).toBeGreaterThan(verde[0]); // más verde que rojo
    expect(verde[1]).toBeGreaterThan(verde[2]); // más verde que azul
    expect(verde[1]).toBeGreaterThan(verde[0] * 2); // un verde de pasto firme, no pálido
    const estacas = doc.getRoot().listNodes().filter((n) => n.getName().startsWith("estaca"));
    expect(estacas).toHaveLength(4); // una por esquina
  });

  it("no cambia las proporciones de la casa (escala pareja)", async () => {
    const original = getBounds((await leer(casa("casa-huaral.glb"))).getRoot().listScenes()[0]);
    const { glb } = await componerCasaSobreTerreno(casa("casa-huaral.glb"), { frenteM: 10, fondoM: 20 });
    const nodo = (await leer(glb)).getRoot().listNodes().find((n) => n.getName() === "casa")!;
    const b = getBounds(nodo);
    const proporcion = (m: { min: number[]; max: number[] }) => (m.max[0] - m.min[0]) / (m.max[1] - m.min[1]);
    expect(proporcion(b)).toBeCloseTo(proporcion(original), 3);
  });

  it("devuelve un GLB válido que se puede volver a leer", async () => {
    const { glb } = await componerCasaSobreTerreno(casa("casa-sunampe.glb"), { frenteM: 9, fondoM: 16 });
    expect([...glb.slice(0, 4)]).toEqual([0x67, 0x6c, 0x54, 0x46]); // "glTF"
    await expect(leer(glb)).resolves.toBeDefined();
  });

  it("rechaza medidas absurdas y archivos que no son un modelo, sin devolver nada a medias", async () => {
    for (const medidas of [{ frenteM: 0, fondoM: 15 }, { frenteM: -3, fondoM: 15 }, { frenteM: 8, fondoM: Number.NaN }, { frenteM: Infinity, fondoM: 10 }]) {
      await expect(componerCasaSobreTerreno(casa("casa-sunampe.glb"), medidas)).rejects.toThrow();
    }
    await expect(componerCasaSobreTerreno(new Uint8Array([1, 2, 3, 4]), { frenteM: 8, fondoM: 15 })).rejects.toThrow();
  });
});

describe("hotspotsDelTerreno (medidas ancladas en el terreno)", () => {
  it("rotula el frente, el fondo y el área sobre los bordes del terreno", () => {
    const h = hotspotsDelTerreno({ frenteM: 8, fondoM: 15, areaM2: 120 });
    expect(h.map((x) => [x.id, x.texto])).toEqual([
      ["frente", "Frente 8 m"],
      ["fondo", "Fondo 15 m"],
      ["area", "120 m²"],
    ]);
    const posicion = (id: string) => h.find((x) => x.id === id)!.posicion;
    expect(posicion("frente")).toBe("0m 0.05m 7.5m"); // al medio del borde de adelante (+z)
    expect(posicion("fondo")).toBe("4m 0.05m 0m"); // al medio del borde derecho (+x)
    expect(posicion("area")).toBe("-4m 0.05m 0m"); // al medio del borde izquierdo, simétrico con el fondo y sin quedar detrás de la casa
  });

  it("usa decimales solo cuando hacen falta", () => {
    const h = hotspotsDelTerreno({ frenteM: 7.5, fondoM: 15, areaM2: 112.5 });
    expect(h[0].texto).toBe("Frente 7.5 m");
    expect(h[2].texto).toBe("112.5 m²");
  });
});

describe("terreno y realidad aumentada", () => {
  it("el terreno y las estacas se pueden volver transparentes (modo mezcla), sin tocar la casa", async () => {
    const { glb } = await componerCasaSobreTerreno(casa("casa-sunampe.glb"), { frenteM: 8, fondoM: 15 });
    const doc = await leer(glb);
    const modo = (n: string) => doc.getRoot().listMaterials().find((m) => m.getName() === n)!.getAlphaMode();
    expect(modo("terreno")).toBe("BLEND");
    expect(modo("estaca")).toBe("BLEND");
    const deLaCasa = doc.getRoot().listMaterials().filter((m) => !["terreno", "estaca"].includes(m.getName()));
    expect(deLaCasa.every((m) => m.getAlphaMode() === "OPAQUE")).toBe(true);
  });

  it("ocultarTerrenoEnRA apaga solo el terreno y las estacas y los vuelve a mostrar al salir", () => {
    const material = (nombre: string, color: number[]) => {
      const llamadas: number[][] = [];
      return { name: nombre, llamadas, pbrMetallicRoughness: { setBaseColorFactor: (c: number[]) => llamadas.push(c), baseColorFactor: color } };
    };
    const terreno = material("terreno", [0.33, 0.7, 0.4, 1]);
    const estaca = material("estaca", [1, 0.48, 0.35, 1]);
    const pared = material("pared", [1, 1, 1, 1]);
    const visor = { model: { materials: [terreno, estaca, pared] } } as unknown as Parameters<typeof alternarTerrenoEnRA>[0];

    alternarTerrenoEnRA(visor, false);
    expect(terreno.llamadas.at(-1)![3]).toBe(0);
    expect(estaca.llamadas.at(-1)![3]).toBe(0);
    expect(pared.llamadas).toEqual([]); // la casa nunca se toca

    alternarTerrenoEnRA(visor, true);
    expect(terreno.llamadas.at(-1)).toEqual(VERDE_TERRENO);
    expect(estaca.llamadas.at(-1)).toEqual(CORAL_ESTACA);
  });

  it("si el visor todavía no tiene modelo, no falla", () => {
    expect(() => alternarTerrenoEnRA({} as Parameters<typeof alternarTerrenoEnRA>[0], false)).not.toThrow();
    expect(() => alternarTerrenoEnRA({ model: undefined } as Parameters<typeof alternarTerrenoEnRA>[0], true)).not.toThrow();
  });
});
