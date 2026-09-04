"use client";
import { Canvas } from "@react-three/fiber";
import { useControls } from "leva";
import {
  AccumulativeShadows,
  RandomizedLight,
  Center,
  Environment,
  OrbitControls,
} from "@react-three/drei";
import { startTransition, useState } from "react";

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <div className="relative h-full w-full">
        <Canvas shadows camera={{ position: [0, 0, 4.5], fov: 50 }}>
          <group position={[0, -0.65, 0]}>
            <Sphere />
            <AccumulativeShadows
              temporal
              frames={200}
              color="purple"
              colorBlend={0.5}
              opacity={1}
              scale={10}
              alphaTest={0.85}
            >
              <RandomizedLight
                amount={8}
                radius={5}
                ambient={0.5}
                position={[5, 3, 2]}
                bias={0.001}
              />
            </AccumulativeShadows>
          </group>
          <Env />
          <OrbitControls
            autoRotate
            // autoRotateSpeed={4}
            // enablePan={false}
            // enableZoom={false}
            // minPolarAngle={Math.PI / 2.1}
            // maxPolarAngle={Math.PI / 2.1}
          />
        </Canvas>
      </div>
    </main>
  );
}

function Sphere() {
  const { roughness } = useControls({
    roughness: { value: 1, min: 0, max: 1 },
  });

  const [color, setColor] = useState("orange");
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);
  const [scaleZ, setScaleZ] = useState(1);
  const { scale } = useControls({
    scale: { value: 0.75, min: 0.75, max: 2 },
    color: {
      value: color,
      options: ["black", "yellow", "white", "cyan", "blue", "red", "purple"],
      // If onChange is present the value will not be reactive, see https://github.com/pmndrs/leva/blob/main/docs/advanced/controlled-inputs.md#onchange
      // Instead we transition the preset value, which will prevents the suspense bound from triggering its fallback
      // That way we can hang onto the current environment until the new one has finished loading ...
      onChange: (value) => startTransition(() => setColor(value)),
    },
    width: {
      value: 1,
      min: 1,
      max: 5,
      onChange: (value) => startTransition(() => setScaleX(value)),
    },
    height: {
      value: 1,
      min: 1,
      max: 5,
      onChange: (value) => startTransition(() => setScaleY(value)),
    },
    length: {
      value: 1,
      min: 1,
      max: 5,
      onChange: (value) => startTransition(() => setScaleZ(value)),
    },
  });
  // const { horizontalPlane } = useControls({
  //   horizontalPlane: { value: 64, min: 1, max: 64 },
  // });
  // const { verticalPlane } = useControls({
  //   verticalPlane: { value: 64, min: 1, max: 64 },
  // });
  const [shapes, setShapes] = useState("sphere");
  const { shape } = useControls({
    shape: {
      value: shapes,
      options: [
        "sphere",
        "box",
        "cylinder",
        "cone",
        "torus",
        "torusKnot",
        "dodecahedron",
        "icosahedron",
        "octahedron",
        "tetrahedron",
        "capsule",
        "plane",
      ],
    },
  });

  return (
    <Center top>
      <mesh castShadow scale={[scaleX, scaleY, scaleZ]}>
        {shape === "sphere" && <sphereGeometry args={[scale, 64, 64]} />}
        {shape === "box" && <boxGeometry args={[scale, scale, scale]} />}
        {shape === "cylinder" && (
          <cylinderGeometry args={[scale, scale, scale * 2, 64]} />
        )}
        {shape === "cone" && <coneGeometry args={[scale, scale * 2, 64]} />}
        {shape === "torus" && (
          <torusGeometry args={[scale, scale * 0.4, 32, 64]} />
        )}
        {shape === "torusKnot" && (
          <torusKnotGeometry args={[scale * 0.75, scale * 0.3, 128, 32]} />
        )}
        {shape === "dodecahedron" && (
          <dodecahedronGeometry args={[scale, 0]} />
        )}
        {shape === "icosahedron" && (
          <icosahedronGeometry args={[scale, 0]} />
        )}
        {shape === "octahedron" && <octahedronGeometry args={[scale, 0]} />}
        {shape === "tetrahedron" && <tetrahedronGeometry args={[scale]} />}
        {shape === "capsule" && (
          <capsuleGeometry args={[scale * 0.5, scale, 16, 32]} />
        )}
        {shape === "plane" && (
          <planeGeometry args={[scale * 2, scale * 2, 8, 8]} />
        )}
        <meshStandardMaterial
          metalness={1}
          roughness={roughness}
          color={color}
        />
      </mesh>
    </Center>
  );
}
function Env() {
  return <Environment preset={"sunset"} background blur={1} />;
}
