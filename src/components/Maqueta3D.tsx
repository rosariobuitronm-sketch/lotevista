"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, OrbitControls, useGLTF } from "@react-three/drei";
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Box3, BufferAttribute, BufferGeometry, CanvasTexture, SRGBColorSpace, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  CAMARA_INICIAL,
  crearEscenaMaqueta,
  escalaCasa,
  LIMITES_CAMARA,
  objetivoCamara,
  type Lote3D,
} from "@/lib/maqueta";
import type { Lote } from "@/lib/proyectos";

// Dibujo de la maqueta 3D con three.js (react-three-fiber). Toda la geometría sale de src/lib/maqueta.ts, que está probado.
// Se carga solo en el navegador (ver VistaPrincipal.tsx). Lo visual se verifica a mano.

export type PropsMaqueta = {
  lotes: Lote[];
  /** Código del lote elegido (o null). */
  seleccionado: string | null;
  /** Archivo .glb de la casa referencial del proyecto. */
  modeloUrl: string | null;
  alElegir: (lote: Lote) => void;
  /** La persona movió la cámara (cuenta como uso del 3D). */
  alMover?: () => void;
  /** No se pudo dibujar la escena (por ejemplo, sin WebGL): se pasa al plano 2D. */
  alFallar?: () => void;
};

class Barrera extends Component<{ alFallar?: () => void; children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() {
    return { fallo: true };
  }
  componentDidCatch() {
    this.props.alFallar?.();
  }
  render() {
    return this.state.fallo ? null : this.props.children;
  }
}

// Número del lote dibujado como textura (una por número, compartida): evita montar elementos HTML dentro de la escena.
const texturas = new Map<number, CanvasTexture>();
function texturaNumero(n: number): CanvasTexture {
  let tex = texturas.get(n);
  if (!tex) {
    const lienzo = document.createElement("canvas");
    lienzo.width = lienzo.height = 128;
    const g = lienzo.getContext("2d")!;
    g.fillStyle = "rgba(255,255,255,0.92)";
    g.beginPath();
    g.roundRect(14, 14, 100, 100, 22);
    g.fill();
    g.fillStyle = "#0F2E4C";
    g.font = "800 64px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(n), 64, 68);
    tex = new CanvasTexture(lienzo);
    tex.colorSpace = SRGBColorSpace;
    texturas.set(n, tex);
  }
  return tex;
}

function Bloque({ b, elegido, alElegir }: { b: Lote3D; elegido: boolean; alElegir: (l: Lote) => void }) {
  const elegible = b.lote.estado !== "vendido";
  const alto = elegido ? b.altura + 0.25 : b.altura;
  return (
    <group position={[b.x, 0, b.z]}>
      <mesh
        position={[0, alto / 2, 0]}
        onClick={(e) => {
          if (!elegible) return;
          e.stopPropagation();
          alElegir(b.lote);
        }}
        onPointerOver={() => {
          if (elegible) document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <boxGeometry args={[b.ancho - 0.12, alto, b.fondo - 0.12]} />
        <meshStandardMaterial color={b.color} emissive={elegido ? b.color : "#000000"} emissiveIntensity={elegido ? 0.35 : 0} />
        {elegido && <Edges color="#0F2E4C" lineWidth={2} />}
      </mesh>
      <sprite position={[0, alto + 0.45, b.fondo / 2 - 0.7]} scale={[1.15, 1.15, 1]} raycast={() => null}>
        <spriteMaterial map={texturaNumero(b.lote.numero)} transparent depthWrite={false} />
      </sprite>
    </group>
  );
}

function Calle({ puntos, ancho }: { puntos: [number, number][]; ancho: number }) {
  const geometria = useMemo(() => {
    const posiciones: number[] = [];
    const indices: number[] = [];
    puntos.forEach(([x, z], i) => {
      const [x0, z0] = puntos[Math.max(0, i - 1)];
      const [x1, z1] = puntos[Math.min(puntos.length - 1, i + 1)];
      const largo = Math.hypot(x1 - x0, z1 - z0) || 1;
      const nx = -(z1 - z0) / largo;
      const nz = (x1 - x0) / largo;
      posiciones.push(x + (nx * ancho) / 2, 0.03, z + (nz * ancho) / 2, x - (nx * ancho) / 2, 0.03, z - (nz * ancho) / 2);
      if (i < puntos.length - 1) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(posiciones), 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, [puntos, ancho]);
  return (
    <mesh geometry={geometria}>
      <meshStandardMaterial color="#C9CFD6" side={2} />
    </mesh>
  );
}

function Arbol({ x, z, escala }: { x: number; z: number; escala: number }) {
  return (
    <group position={[x, 0, z]} scale={escala}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.6, 6]} />
        <meshStandardMaterial color="#8B5E3C" />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <coneGeometry args={[0.45, 1.1, 7]} />
        <meshStandardMaterial color="#1F9D55" />
      </mesh>
    </group>
  );
}

/** La casa referencial encima del lote elegido, a escala aproximada. */
function CasaEnLote({ url, bloque }: { url: string; bloque: Lote3D }) {
  const { scene } = useGLTF(url, false);
  const { copia, escala, base } = useMemo(() => {
    const copia = scene.clone(true);
    const medida = new Box3().setFromObject(copia);
    const tam = medida.getSize(new Vector3());
    const centro = medida.getCenter(new Vector3());
    copia.position.set(-centro.x, -medida.min.y, -centro.z);
    return { copia, escala: escalaCasa({ ancho: tam.x, fondo: tam.z }, bloque), base: bloque.altura + 0.25 };
  }, [scene, bloque]);
  return (
    <group position={[bloque.x, base, bloque.z]} scale={escala}>
      <primitive object={copia} />
    </group>
  );
}

function Camara({ destino, alMover }: { destino: ReturnType<typeof objetivoCamara> | null; alMover?: () => void }) {
  const controles = useRef<OrbitControlsImpl>(null);
  const meta = useRef<ReturnType<typeof objetivoCamara> | null>(null);
  const camara = useThree((s) => s.camera);

  useEffect(() => {
    meta.current = destino;
  }, [destino]);

  useFrame((_, delta) => {
    const c = controles.current;
    if (!c) return;
    // Mantiene el punto de mira dentro de la maqueta para que nadie se pierda al desplazar.
    c.target.x = Math.max(-LIMITES_CAMARA.movimientoMaxX, Math.min(LIMITES_CAMARA.movimientoMaxX, c.target.x));
    c.target.z = Math.max(-LIMITES_CAMARA.movimientoMaxZ, Math.min(LIMITES_CAMARA.movimientoMaxZ, c.target.z));
    c.target.y = 0;
    const m = meta.current;
    if (!m) return;
    const paso = 1 - Math.pow(0.0008, delta); // vuelo suave y corto
    camara.position.lerp(new Vector3(...m.posicion), paso);
    c.target.lerp(new Vector3(...m.objetivo), paso);
    if (camara.position.distanceTo(new Vector3(...m.posicion)) < 0.05) meta.current = null;
    c.update();
  });

  return (
    <OrbitControls
      ref={controles}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      minDistance={LIMITES_CAMARA.distanciaMin}
      maxDistance={LIMITES_CAMARA.distanciaMax}
      maxPolarAngle={LIMITES_CAMARA.anguloMaxPolar}
      onStart={() => {
        meta.current = null; // si la persona toma el control, se cancela el vuelo
        alMover?.();
      }}
    />
  );
}

function Escena({ lotes, seleccionado, modeloUrl, alElegir, alMover }: PropsMaqueta) {
  const escena = useMemo(() => crearEscenaMaqueta(lotes), [lotes]);
  const elegido = escena.lotes.find((l) => l.lote.codigo === seleccionado) ?? null;
  // En pantallas verticales (celular) la vista general se aleja un poco para que quepa todo el ancho.
  const aspecto = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const alejar = Math.max(1, Math.min(1.8, 1.15 / aspecto));
  const destino = useMemo(
    () =>
      elegido
        ? objetivoCamara(elegido)
        : {
            posicion: CAMARA_INICIAL.posicion.map((v) => v * alejar) as [number, number, number],
            objetivo: CAMARA_INICIAL.objetivo,
          },
    [elegido, alejar],
  );

  return (
    <>
      <color attach="background" args={["#DCEBF8"]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[12, 22, 10]} intensity={1.6} />
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[escena.suelo.ancho, escena.suelo.fondo]} />
          <meshStandardMaterial color="#E9DCC7" />
        </mesh>
        <Calle puntos={escena.calle.puntos} ancho={escena.calle.ancho} />
        <mesh position={[escena.parque.x, 0.04, escena.parque.z]}>
          <cylinderGeometry args={[escena.parque.radio, escena.parque.radio, 0.08, 40]} />
          <meshStandardMaterial color="#8FD3A8" />
        </mesh>
        {escena.arboles.map((a, i) => (
          <Arbol key={i} {...a} />
        ))}
        {escena.lotes.map((b) => (
          <Bloque key={b.lote.codigo} b={b} elegido={b.lote.codigo === seleccionado} alElegir={alElegir} />
        ))}
        {elegido && modeloUrl && (
          <Suspense fallback={null}>
            <CasaEnLote url={modeloUrl} bloque={elegido} />
          </Suspense>
        )}
      </group>
      <Camara destino={destino} alMover={alMover} />
    </>
  );
}

export default function Maqueta3D(props: PropsMaqueta) {
  return (
    <Barrera alFallar={props.alFallar}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: CAMARA_INICIAL.posicion, fov: 42, near: 0.1, far: 300 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            props.alFallar?.();
          });
        }}
      >
        <Escena {...props} />
      </Canvas>
    </Barrera>
  );
}
