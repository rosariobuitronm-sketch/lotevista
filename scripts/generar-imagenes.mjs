// Genera las ilustraciones de los 3 proyectos (public/proyectos/<slug>.jpg) a partir de dibujos
// vectoriales propios con la paleta de LoteVista. Uso: node scripts/generar-imagenes.mjs
// No lleva texto dentro de la imagen: la etiqueta "Imagen referencial" se muestra en la página.
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const C = {
  marino: "#0F2E4C", azul: "#1E6FB8", celeste: "#DCEBF8", verde: "#2BB673",
  coral: "#FF7A59", arena: "#E9DCC7", burbuja: "#F6EFE4", fondo: "#FAF8F4", ambar: "#F2A900",
};

const arbol = (x, y, s = 1) => `
  <rect x="${x - 5 * s}" y="${y - 40 * s}" width="${10 * s}" height="${40 * s}" fill="#7a5a3a"/>
  <circle cx="${x}" cy="${y - 58 * s}" r="${30 * s}" fill="${C.verde}"/>
  <circle cx="${x - 18 * s}" cy="${y - 44 * s}" r="${20 * s}" fill="#25a066"/>
  <circle cx="${x + 18 * s}" cy="${y - 46 * s}" r="${22 * s}" fill="#34c27f"/>`;

const casa = (x, y) => `
  <ellipse cx="${x}" cy="${y + 4}" rx="150" ry="16" fill="${C.marino}" opacity="0.18"/>
  <rect x="${x - 110}" y="${y - 120}" width="220" height="120" fill="${C.burbuja}" stroke="${C.marino}" stroke-width="4"/>
  <polygon points="${x - 128},${y - 118} ${x},${y - 200} ${x + 128},${y - 118}" fill="${C.coral}" stroke="${C.marino}" stroke-width="4" stroke-linejoin="round"/>
  <rect x="${x - 22}" y="${y - 70}" width="44" height="70" fill="${C.marino}"/>
  <rect x="${x - 88}" y="${y - 92}" width="42" height="36" fill="${C.celeste}" stroke="${C.marino}" stroke-width="3"/>
  <rect x="${x + 46}" y="${y - 92}" width="42" height="36" fill="${C.celeste}" stroke="${C.marino}" stroke-width="3"/>`;

const estaca = (x, y) => `<rect x="${x - 4}" y="${y - 26}" width="8" height="26" fill="${C.coral}"/><circle cx="${x}" cy="${y - 28}" r="6" fill="${C.coral}"/>`;

// Cada proyecto tiene un paisaje distinto, con la misma idea: un lote delimitado y una casa referencial.
const paisajes = {
  "algarrobos-de-sunampe": {
    cielo: [C.celeste, "#F3E3C3"],
    fondo: `<circle cx="930" cy="170" r="70" fill="${C.ambar}" opacity="0.9"/>
      <path d="M0 470 Q200 390 420 450 T820 440 T1200 430 L1200 520 L0 520Z" fill="${C.arena}"/>
      <path d="M0 500 Q300 440 600 490 T1200 480 L1200 560 L0 560Z" fill="#dccdb2"/>`,
    extra: `${arbol(130, 560, 1.3)}${arbol(1060, 575, 1.1)}${arbol(240, 548, 0.8)}`,
  },
  "campina-de-huaral": {
    cielo: [C.celeste, "#FFFFFF"],
    fondo: `<circle cx="220" cy="150" r="58" fill="${C.ambar}" opacity="0.85"/>
      <path d="M0 460 Q250 360 520 440 T1200 420 L1200 540 L0 540Z" fill="#9ed8b8"/>
      <path d="M0 500 Q300 430 640 490 T1200 470 L1200 560 L0 560Z" fill="#6cc79a"/>`,
    extra: `${arbol(1040, 580, 1.2)}${arbol(1120, 560, 0.9)}${arbol(100, 585, 1)}`,
  },
  "jardines-del-chira": {
    cielo: ["#BFE0F6", "#FFF1D6"],
    fondo: `<circle cx="600" cy="190" r="80" fill="${C.ambar}" opacity="0.9"/>
      <path d="M0 520 L1200 520 L1200 560 L0 560Z" fill="#e7cfa2"/>
      <path d="M0 470 Q300 430 600 470 T1200 460 L1200 530 L0 530Z" fill="#e4d2ae"/>`,
    extra: `${arbol(160, 570, 0.9)}${arbol(1030, 565, 1)}<rect x="40" y="590" width="1120" height="6" fill="${C.verde}" opacity="0.5"/>`,
  },
};

function svg(slug) {
  const p = paisajes[slug];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${p.cielo[0]}"/><stop offset="1" stop-color="${p.cielo[1]}"/>
    </linearGradient>
    <linearGradient id="suelo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.arena}"/><stop offset="1" stop-color="#d9c8a9"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#cielo)"/>
  ${p.fondo}
  <rect x="0" y="560" width="1200" height="240" fill="url(#suelo)"/>
  <polygon points="250,780 950,780 880,590 320,590" fill="${C.fondo}" opacity="0.55" stroke="${C.azul}" stroke-width="6" stroke-dasharray="22 14" stroke-linejoin="round"/>
  ${casa(600, 735)}
  ${estaca(250, 780)}${estaca(950, 780)}${estaca(320, 590)}${estaca(880, 590)}
  ${p.extra}
</svg>`;
}

mkdirSync("public/proyectos", { recursive: true });
for (const slug of Object.keys(paisajes)) {
  await sharp(Buffer.from(svg(slug))).jpeg({ quality: 82, mozjpeg: true }).toFile(`public/proyectos/${slug}.jpg`);
  console.log("OK  public/proyectos/" + slug + ".jpg");
}
