import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Preload } from "@react-three/drei";
import type { Group } from "three";

function Orb() {
  const group = useRef<Group>(null);

  useFrame(({ clock, pointer }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.rotation.y = t * 0.4 + pointer.x * 0.25;
    group.current.rotation.x = Math.sin(t * 0.3) * 0.2 + pointer.y * 0.15;
  });

  return (
    <Float speed={1.3} rotationIntensity={0.7} floatIntensity={1.2}>
      <group ref={group}>
        <mesh>
          <icosahedronGeometry args={[1.2, 20]} />
          <meshStandardMaterial color="#00A86B" roughness={0.28} metalness={0.45} emissive="#00A86B" emissiveIntensity={0.12} />
        </mesh>
      </group>
    </Float>
  );
}

function Particles() {
  const points = useMemo(() => {
    const arr = new Float32Array(300 * 3);
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = (Math.random() - 0.5) * 10;
      arr[i + 1] = (Math.random() - 0.5) * 6;
      arr[i + 2] = (Math.random() - 0.5) * 10;
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#5FFFC2" sizeAttenuation transparent opacity={0.45} />
    </points>
  );
}

export default function ThreeScene({ inView, reducedMotion }: { inView: boolean; reducedMotion: boolean }) {
  if (reducedMotion) {
    return <div className="h-[360px] w-full rounded-3xl border border-border bg-[radial-gradient(circle_at_30%_20%,#00a86b66,transparent_45%),radial-gradient(circle_at_70%_70%,#ffffff11,transparent_40%)]" />;
  }

  return (
    <div aria-hidden="true" className="h-[360px] w-full rounded-3xl border border-border bg-black/10">
      <Suspense fallback={<div className="h-full w-full rounded-3xl bg-[radial-gradient(circle_at_30%_20%,#00a86b66,transparent_45%),radial-gradient(circle_at_70%_70%,#ffffff11,transparent_40%)]" />}>
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 4.1], fov: 45 }}
          frameloop={inView ? "always" : "never"}
          gl={{ antialias: true, powerPreference: "high-performance" }}
        >
          <ambientLight intensity={0.55} />
          <directionalLight position={[2, 3, 2]} intensity={1.2} color="#D8FFF2" />
          <Particles />
          <Orb />
          <Environment preset="city" />
          <Preload all />
        </Canvas>
      </Suspense>
    </div>
  );
}
