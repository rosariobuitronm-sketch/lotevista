import { describe, expect, it } from "vitest";
import { LIMITE_PREGUNTAS_LEAD, normalizarCelular, validarLead } from "@/lib/lead-schema";

const valido = {
  nombre: "María Quispe Huamán",
  celular: "987 654 321",
  correo: "Maria.Quispe@Example.com",
  consentimiento: true,
  proyecto: "algarrobos-de-sunampe",
};

const errores = (entrada: unknown) => {
  const r = validarLead(entrada);
  if (r.ok) throw new Error("se esperaba un error de validación");
  return r.errores;
};

describe("normalizarCelular", () => {
  it("deja solo dígitos y quita el prefijo 51 del país", () => {
    expect(normalizarCelular("987 654 321")).toBe("987654321");
    expect(normalizarCelular("987-654-321")).toBe("987654321");
    expect(normalizarCelular("+51 987 654 321")).toBe("987654321");
    expect(normalizarCelular("(51) 987654321")).toBe("987654321");
  });
});

describe("validarLead: datos correctos", () => {
  it("acepta un lead válido, lo normaliza y completa los valores por defecto", () => {
    const r = validarLead(valido);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.datos).toEqual({
      nombre: "María Quispe Huamán",
      celular: "987654321",
      correo: "maria.quispe@example.com",
      horario: undefined,
      consentimiento: true,
      proyecto: "algarrobos-de-sunampe",
      uso3d: false,
      usoRa: false,
      preguntas: [],
    });
  });

  it("el horario preferido es opcional (ausente, vacío o con texto)", () => {
    expect(validarLead(valido).ok).toBe(true);
    const vacio = validarLead({ ...valido, horario: "   " });
    expect(vacio.ok && vacio.datos.horario).toBeUndefined();
    const conTexto = validarLead({ ...valido, horario: "Tardes, después de las 5" });
    expect(conTexto.ok && conTexto.datos.horario).toBe("Tardes, después de las 5");
  });

  it("acepta las marcas de uso de 3D y RA y las preguntas del chat", () => {
    const r = validarLead({
      ...valido,
      uso3d: true,
      usoRa: true,
      preguntas: [{ pregunta: "¿Cuánto cuesta?", respuesta: "Desde S/ 37,200.", sabe: true }],
    });
    expect(r.ok && r.datos.uso3d).toBe(true);
    expect(r.ok && r.datos.usoRa).toBe(true);
    expect(r.ok && r.datos.preguntas).toHaveLength(1);
  });
});

describe("validarLead: lote de interés (del plano)", () => {
  it("es opcional, se limpia y no puede ser enorme ni de otro tipo", () => {
    const sin = validarLead(valido);
    expect(sin.ok && sin.datos.lote).toBeUndefined();
    const con = validarLead({ ...valido, lote: "  Mz. A - Lt. 5 " });
    expect(con.ok && con.datos.lote).toBe("Mz. A - Lt. 5");
    const vacio = validarLead({ ...valido, lote: "" });
    expect(vacio.ok && vacio.datos.lote).toBeUndefined();
    expect(errores({ ...valido, lote: "x".repeat(41) }).lote).toBeDefined();
    expect(errores({ ...valido, lote: 5 }).lote).toBeDefined();
  });
});

describe("validarLead: consentimiento (Ley 29733)", () => {
  it("sin consentimiento aceptado la validación siempre falla", () => {
    for (const consentimiento of [false, undefined, null, "true", "on", 1, 0, "", [], {}]) {
      const e = errores({ ...valido, consentimiento });
      expect(e.consentimiento, String(consentimiento)).toMatch(/aceptar el tratamiento de tus datos personales/);
    }
    const sinCampo: Record<string, unknown> = { ...valido };
    delete sinCampo.consentimiento;
    expect(errores(sinCampo).consentimiento).toBeDefined();
  });
});

describe("validarLead: nombre", () => {
  it("es obligatorio y tiene largo limitado", () => {
    expect(errores({ ...valido, nombre: "" }).nombre).toMatch(/nombre/i);
    expect(errores({ ...valido, nombre: " " }).nombre).toMatch(/nombre/i);
    expect(errores({ ...valido, nombre: "A" }).nombre).toMatch(/al menos 2/);
    expect(errores({ ...valido, nombre: "x".repeat(81) }).nombre).toMatch(/80/);
    expect(errores({ ...valido, nombre: undefined }).nombre).toMatch(/nombre/i);
    expect(errores({ ...valido, nombre: 12345 }).nombre).toMatch(/nombre/i);
  });

  it("conserva etiquetas HTML tal cual (se escapan al mostrarlas)", () => {
    const r = validarLead({ ...valido, nombre: "<script>alert(1)</script>" });
    expect(r.ok && r.datos.nombre).toBe("<script>alert(1)</script>");
  });
});

describe("validarLead: celular peruano", () => {
  it("rechaza celulares que no son de 9 dígitos que empiezan con 9", () => {
    for (const celular of ["", "12345", "98765432", "9876543210", "887654321", "abc", "+51 887 654 321", null, undefined, 987654321]) {
      expect(errores({ ...valido, celular }).celular, String(celular)).toMatch(/celular/i);
    }
  });

  it("acepta formatos comunes", () => {
    for (const celular of ["987654321", "987 654 321", "+51987654321", "+51 987-654-321", "(51) 987 654 321"]) {
      const r = validarLead({ ...valido, celular });
      expect(r.ok && r.datos.celular, celular).toBe("987654321");
    }
  });
});

describe("validarLead: correo", () => {
  it("rechaza correos inválidos y vacíos", () => {
    for (const correo of ["", "sin-arroba", "a@", "@b.com", "a b@c.com", undefined, 5]) {
      expect(errores({ ...valido, correo }).correo, String(correo)).toMatch(/correo/i);
    }
    expect(errores({ ...valido, correo: `${"a".repeat(120)}@example.com` }).correo).toMatch(/correo/i);
  });
});

describe("validarLead: campos de más y entradas raras", () => {
  it("rechaza campos de más, por ejemplo dni", () => {
    const e = errores({ ...valido, dni: "12345678" });
    expect(e._general).toMatch(/no permitidos/);
    expect(errores({ ...valido, canal: "holograma" })._general).toBeDefined();
    expect(errores({ ...valido, __proto__: { admin: true }, rol: "asesor" })._general).toBeDefined();
  });

  it("nunca lanza error con entradas que no son un objeto", () => {
    for (const entrada of [null, undefined, "texto", 42, [], true, () => {}]) {
      expect(() => validarLead(entrada)).not.toThrow();
      expect(validarLead(entrada).ok).toBe(false);
    }
  });

  it("el proyecto debe ser un identificador válido", () => {
    expect(errores({ ...valido, proyecto: "" }).proyecto).toBeDefined();
    expect(errores({ ...valido, proyecto: "../etc/passwd" }).proyecto).toBeDefined();
    expect(errores({ ...valido, proyecto: "A B" }).proyecto).toBeDefined();
  });
});

describe("validarLead: preguntas del chat", () => {
  const pregunta = { pregunta: "¿Hay agua?", respuesta: "Sí, agua potable.", sabe: true };

  it("limita la cantidad de preguntas", () => {
    const justas = Array.from({ length: LIMITE_PREGUNTAS_LEAD }, () => pregunta);
    expect(validarLead({ ...valido, preguntas: justas }).ok).toBe(true);
    const demas = [...justas, pregunta];
    expect(errores({ ...valido, preguntas: demas }).preguntas).toMatch(/demasiadas preguntas/i);
  });

  it("limita el tamaño de la pregunta y de la respuesta", () => {
    expect(errores({ ...valido, preguntas: [{ ...pregunta, pregunta: "x".repeat(501) }] }).preguntas).toBeDefined();
    expect(errores({ ...valido, preguntas: [{ ...pregunta, respuesta: "x".repeat(2001) }] }).preguntas).toBeDefined();
    expect(errores({ ...valido, preguntas: [{ ...pregunta, pregunta: "" }] }).preguntas).toBeDefined();
  });

  it("rechaza preguntas mal formadas o con campos de más", () => {
    expect(errores({ ...valido, preguntas: "hola" }).preguntas).toBeDefined();
    expect(errores({ ...valido, preguntas: [{ pregunta: "¿Hola?" }] }).preguntas).toBeDefined();
    expect(errores({ ...valido, preguntas: [{ ...pregunta, dni: "1" }] }).preguntas).toBeDefined();
  });
});
