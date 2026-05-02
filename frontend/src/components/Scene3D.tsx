import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ReactNode } from "react";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function useIsMobile() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches;
}

function surfaceTransform(theta: number, phi: number, radius: number) {
  const normal = new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta)
  ).normalize();
  const position = normal.clone().multiplyScalar(radius);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  return { position, quaternion };
}

function Tree({ theta, phi }: { theta: number; phi: number }) {
  const { position, quaternion } = surfaceTransform(theta, phi, 2.12);
  return (
    <group position={position} quaternion={quaternion} scale={0.22}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.42, 6]} />
        <meshStandardMaterial color="#7a4f2d" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow>
        <coneGeometry args={[0.3, 0.62, 7]} />
        <meshStandardMaterial color="#42b883" roughness={0.72} flatShading />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <coneGeometry args={[0.22, 0.48, 7]} />
        <meshStandardMaterial color="#58d68d" roughness={0.72} flatShading />
      </mesh>
    </group>
  );
}

function Rock({ theta, phi, size }: { theta: number; phi: number; size: number }) {
  const { position, quaternion } = surfaceTransform(theta, phi, 2.08);
  return (
    <mesh position={position} quaternion={quaternion} scale={size} castShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#a9b2a2" roughness={0.9} metalness={0.02} flatShading />
    </mesh>
  );
}

function FloatingNodes({ mobile }: { mobile: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const nodes = useMemo(
    () =>
      Array.from({ length: mobile ? 8 : 16 }, (_, index) => ({
        angle: (index / (mobile ? 8 : 16)) * Math.PI * 2,
        radius: 3.3 + (index % 3) * 0.22,
        y: Math.sin(index * 1.6) * 0.8,
        color: index % 2 ? "#7dd3fc" : "#f6c85f"
      })),
    [mobile]
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = clock.elapsedTime * 0.14;
  });

  return (
    <group ref={groupRef}>
      {nodes.map((node) => (
        <mesh
          key={`${node.angle}-${node.radius}`}
          position={[Math.cos(node.angle) * node.radius, node.y, Math.sin(node.angle) * node.radius]}
        >
          <icosahedronGeometry args={[0.055, 0]} />
          <meshStandardMaterial color={node.color} emissive={node.color} emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function ParticleField({ mobile }: { mobile: boolean }) {
  const geometry = useMemo(() => {
    const count = mobile ? 160 : 420;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const radius = 7 + Math.random() * 9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.cos(phi);
      positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return next;
  }, [mobile]);

  return (
    <points geometry={geometry}>
      <pointsMaterial size={mobile ? 0.025 : 0.018} color="#c7f9ff" transparent opacity={0.72} />
    </points>
  );
}

function Planet({ mobile }: { mobile: boolean }) {
  const planetRef = useRef<THREE.Group>(null);
  const trees = useMemo(
    () =>
      Array.from({ length: mobile ? 9 : 20 }, (_, index) => ({
        theta: index * 1.91,
        phi: 0.75 + ((index * 0.43) % 1.75)
      })),
    [mobile]
  );
  const rocks = useMemo(
    () =>
      Array.from({ length: mobile ? 8 : 18 }, (_, index) => ({
        theta: index * 2.37,
        phi: 0.48 + ((index * 0.61) % 2.0),
        size: 0.07 + (index % 4) * 0.018
      })),
    [mobile]
  );

  useFrame(({ clock }) => {
    if (!planetRef.current) return;
    planetRef.current.rotation.y = clock.elapsedTime * 0.09;
    planetRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.25) * 0.04;
  });

  return (
    <group ref={planetRef}>
      <mesh receiveShadow castShadow>
        <icosahedronGeometry args={[2, 3]} />
        <meshStandardMaterial
          color="#2f8f7a"
          roughness={0.82}
          metalness={0.03}
          flatShading
          emissive="#10281f"
          emissiveIntensity={0.22}
        />
      </mesh>
      <mesh scale={1.012}>
        <icosahedronGeometry args={[2, 2]} />
        <meshStandardMaterial color="#173f55" wireframe transparent opacity={0.12} />
      </mesh>
      {trees.map((tree) => (
        <Tree key={`${tree.theta}-${tree.phi}`} theta={tree.theta} phi={tree.phi} />
      ))}
      {rocks.map((rock) => (
        <Rock key={`${rock.theta}-${rock.phi}`} {...rock} />
      ))}
    </group>
  );
}

function CameraRig({ children }: { children: ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const { pointer, camera } = useThree();

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, pointer.x * 0.16, 0.045);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -pointer.y * 0.08, 0.045);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.x * 0.45, 0.035);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.2 + pointer.y * 0.25, 0.035);
    camera.lookAt(0, 0, 0);
  });

  return <group ref={groupRef}>{children}</group>;
}

function SceneContents() {
  const mobile = useIsMobile();

  return (
    <>
      <color attach="background" args={["#070b18"]} />
      <fog attach="fog" args={["#070b18", 8, 22]} />
      <ambientLight intensity={0.48} />
      <directionalLight position={[4, 6, 5]} intensity={2.1} color="#f8ffe5" castShadow />
      <pointLight position={[-4, 2, 2]} intensity={2.8} color="#8b5cf6" />
      <pointLight position={[3.5, -1.4, -2.5]} intensity={2.2} color="#38bdf8" />
      <CameraRig>
        <Planet mobile={mobile} />
        <FloatingNodes mobile={mobile} />
        <ParticleField mobile={mobile} />
        {!mobile && <Stars radius={18} depth={20} count={900} factor={2.4} fade speed={0.35} />}
      </CameraRig>
      <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} rotateSpeed={0.42} />
    </>
  );
}

export default function Scene3D() {
  const mobile = useIsMobile();

  return (
    <Canvas
      shadows={!mobile}
      dpr={mobile ? [1, 1.4] : [1, 2]}
      camera={{ position: [0, 0.2, 6.4], fov: mobile ? 48 : 42 }}
      gl={{ antialias: !mobile, powerPreference: "high-performance", preserveDrawingBuffer: true }}
      className="landing-canvas"
    >
      <SceneContents />
    </Canvas>
  );
}
