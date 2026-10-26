import { Document, getBounds, WebIO, type Buffer as BufferGltf, type Material } from "@gltf-transform/core";

// Pone la casa referencial sobre un terreno verde del tamaño real del lote (frente × fondo, en metros).
// Se hace dentro del propio modelo 3D (un GLB nuevo armado en el navegador), así el terreno y sus medidas giran junto con la casa.
// La casa es solo una referencia: se escala a un tamaño de casa real (unos 40 m² de planta) y nunca pasa del 85 % del frente
// ni del 60 % del fondo del lote.

export type MedidasLote = { frenteM: number; fondoM: number };
export type Hotspot = { id: string; texto: string; posicion: string };

const PLANTA_CASA_M2 = 40;
const MAX_FRENTE_OCUPADO = 0.85;
const MAX_FONDO_OCUPADO = 0.6;
const GROSOR_TERRENO_M = 0.2;

export const VERDE_TERRENO: [number, number, number, number] = [0.1, 0.45, 0.12, 1]; // verde pasto (los colores de glTF van en espacio lineal)
export const CORAL_ESTACA: [number, number, number, number] = [1, 0.2, 0.1, 1]; // coral de la marca
const COLOR_POR_MATERIAL: Record<string, [number, number, number, number]> = { terreno: VERDE_TERRENO, estaca: CORAL_ESTACA };

const redondear = (n: number) => Math.round(n * 100) / 100;
const metros = (n: number) => `${redondear(n)}m`;
const numero = (n: number) => String(redondear(n));

/** Cubo con las caras separadas (para que las sombras y los bordes se vean bien). Centrado en el origen. */
function crearCaja(doc: Document, buffer: BufferGltf, material: Material, ancho: number, alto: number, largo: number, nombre: string) {
  const hx = ancho / 2, hy = alto / 2, hz = largo / 2;
  // [normal, 4 esquinas] de cada cara, en sentido antihorario visto desde fuera
  const caras: [number[], number[][]][] = [
    [[0, 1, 0], [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]]],
    [[0, -1, 0], [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]]],
    [[0, 0, 1], [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]]],
    [[0, 0, -1], [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]]],
    [[1, 0, 0], [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]]],
    [[-1, 0, 0], [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]]],
  ];
  const posiciones: number[] = [];
  const normales: number[] = [];
  const indices: number[] = [];
  caras.forEach(([normal, esquinas], i) => {
    for (const e of esquinas) {
      posiciones.push(...e);
      normales.push(...normal);
    }
    const base = i * 4;
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });

  const posicion = doc.createAccessor(`${nombre}-posicion`).setType("VEC3").setArray(new Float32Array(posiciones)).setBuffer(buffer);
  const normal = doc.createAccessor(`${nombre}-normal`).setType("VEC3").setArray(new Float32Array(normales)).setBuffer(buffer);
  const indice = doc.createAccessor(`${nombre}-indices`).setType("SCALAR").setArray(new Uint16Array(indices)).setBuffer(buffer);
  const primitiva = doc
    .createPrimitive()
    .setAttribute("POSITION", posicion)
    .setAttribute("NORMAL", normal)
    .setIndices(indice)
    .setMaterial(material);
  return doc.createMesh(nombre).addPrimitive(primitiva);
}

export async function componerCasaSobreTerreno(glb: Uint8Array, { frenteM, fondoM }: MedidasLote): Promise<{ glb: Uint8Array }> {
  if (![frenteM, fondoM].every((m) => Number.isFinite(m) && m > 0 && m <= 500)) {
    throw new Error("Medidas del lote no válidas");
  }

  const io = new WebIO();
  const doc = await io.readBinary(glb);
  const escena = doc.getRoot().listScenes()[0];
  if (!escena) throw new Error("El modelo no tiene escena");

  const caja = getBounds(escena);
  const ex = caja.max[0] - caja.min[0];
  const ez = caja.max[2] - caja.min[2];
  if (!(ex > 0) || !(ez > 0) || !Number.isFinite(ex + ez)) throw new Error("El modelo no tiene tamaño");

  // Escala pareja (no se deforma la casa): tamaño de casa real, pero que quepa en el lote con retiros.
  const escala = Math.min(
    Math.sqrt(PLANTA_CASA_M2 / (ex * ez)),
    (MAX_FRENTE_OCUPADO * frenteM) / ex,
    (MAX_FONDO_OCUPADO * fondoM) / ez,
  );

  // La casa va dentro de un nodo propio: centrada en el lote y con su base justo sobre el terreno (y = 0).
  const casa = doc.createNode("casa");
  for (const hijo of escena.listChildren()) {
    escena.removeChild(hijo);
    casa.addChild(hijo);
  }
  const cx = (caja.max[0] + caja.min[0]) / 2;
  const cz = (caja.max[2] + caja.min[2]) / 2;
  casa.setScale([escala, escala, escala]).setTranslation([-cx * escala, -caja.min[1] * escala, -cz * escala]);
  escena.addChild(casa);

  const buffer = doc.getRoot().listBuffers()[0] ?? doc.createBuffer();
  const materialTerreno = doc.createMaterial("terreno").setBaseColorFactor(VERDE_TERRENO).setRoughnessFactor(1).setMetallicFactor(0).setAlphaMode("BLEND");
  const materialEstaca = doc.createMaterial("estaca").setBaseColorFactor(CORAL_ESTACA).setRoughnessFactor(0.8).setMetallicFactor(0).setAlphaMode("BLEND");

  // Terreno: su cara de arriba queda en y = 0, con grosor hacia abajo.
  const terreno = doc
    .createNode("terreno")
    .setMesh(crearCaja(doc, buffer, materialTerreno, frenteM, GROSOR_TERRENO_M, fondoM, "terreno"))
    .setTranslation([0, -GROSOR_TERRENO_M / 2, 0]);
  escena.addChild(terreno);

  // Una estaca en cada esquina, como en un lote real.
  const mallaEstaca = crearCaja(doc, buffer, materialEstaca, 0.18, 0.7, 0.18, "estaca");
  [[-1, 1], [1, 1], [1, -1], [-1, -1]].forEach(([sx, sz], i) => {
    escena.addChild(doc.createNode(`estaca-${i + 1}`).setMesh(mallaEstaca).setTranslation([(sx * frenteM) / 2, 0.35, (sz * fondoM) / 2]));
  });

  return { glb: await io.writeBinary(doc) };
}

/** Etiquetas de medidas ancladas sobre el terreno (se usan como «hotspots» del visor y giran con el modelo). */
export function hotspotsDelTerreno(lote: MedidasLote & { areaM2: number }): Hotspot[] {
  const { frenteM, fondoM, areaM2 } = lote;
  return [
    { id: "frente", texto: `Frente ${numero(frenteM)} m`, posicion: `0m 0.05m ${metros(fondoM / 2)}` },
    { id: "fondo", texto: `Fondo ${numero(fondoM)} m`, posicion: `${metros(frenteM / 2)} 0.05m 0m` },
    { id: "area", texto: `${numero(areaM2)} m²`, posicion: `${metros(-frenteM / 2)} 0.05m 0m` },
  ];
}

type VisorConModelo = { model?: { materials?: { name: string; pbrMetallicRoughness: { setBaseColorFactor: (c: number[]) => void } }[] } };

/**
 * En realidad aumentada solo debe verse la casa: el terreno verde y las estacas se vuelven transparentes mientras dura la
 * sesión de RA y se muestran de nuevo al salir. Nunca se tocan los materiales de la casa.
 */
export function alternarTerrenoEnRA(visor: VisorConModelo, visible: boolean): void {
  for (const material of visor.model?.materials ?? []) {
    const color = COLOR_POR_MATERIAL[material.name];
    if (!color) continue;
    material.pbrMetallicRoughness.setBaseColorFactor(visible ? color : [color[0], color[1], color[2], 0]);
  }
}
