import bcrypt from "bcryptjs";

/**
 * Lee los asesores demo desde variables de entorno:
 *   ASESOR_1_USUARIO / ASESOR_1_CLAVE, ASESOR_2_USUARIO / ASESOR_2_CLAVE, ...
 * Si a un asesor le falta el usuario o la clave, falla indicando solo el NOMBRE de la variable.
 * @param {Record<string, string | undefined>} env
 * @returns {{ usuario: string, clave: string }[]}
 */
export function leerAsesoresDeEntorno(env) {
  const numeros = new Set();
  for (const nombre of Object.keys(env)) {
    const m = /^ASESOR_(\d+)_(USUARIO|CLAVE)$/.exec(nombre);
    if (m) numeros.add(Number(m[1]));
  }
  return [...numeros]
    .sort((a, b) => a - b)
    .map((n) => {
      const usuario = env[`ASESOR_${n}_USUARIO`]?.trim();
      const clave = env[`ASESOR_${n}_CLAVE`];
      if (!usuario) throw new Error(`Falta la variable ASESOR_${n}_USUARIO`);
      if (!clave) throw new Error(`Falta la variable ASESOR_${n}_CLAVE`);
      return { usuario, clave };
    });
}

/**
 * Crea (o actualiza la clave de) cada asesor. La clave se guarda siempre con hash.
 * @param {{ query: (texto: string, valores?: unknown[]) => Promise<unknown> }} pool
 * @param {{ usuario: string, clave: string }[]} asesores
 */
export async function crearAsesores(pool, asesores) {
  for (const { usuario, clave } of asesores) {
    const hash = await bcrypt.hash(clave, 10);
    await pool.query(
      `INSERT INTO asesores (usuario, password_hash) VALUES ($1, $2)
       ON CONFLICT (usuario) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [usuario, hash],
    );
  }
}
