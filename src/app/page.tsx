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
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex"></div>

      <div className="relative flex place-items-center h-[60vh] w-[60vw]">
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

      <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left"></div>
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
      options: ["sphere", "box"],
    },
  });

  return (
    <Center top>
      <mesh castShadow scale={[scaleX, scaleY, scaleZ]}>
        {shape === "sphere" && <sphereGeometry args={[scale, 64, 64]} />}
        {shape === "box" && <boxGeometry args={[scale, 1, 1]} />}
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
