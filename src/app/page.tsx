"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Euler, Quaternion, Vector3 } from "three";
import type { PerspectiveCamera } from "three";
import { useControls } from "leva";
import {
  AccumulativeShadows,
  RandomizedLight,
  Center,
  Environment,
  OrbitControls,
} from "@react-three/drei";
import type { PresetsType } from "@react-three/drei/helpers/environment-assets";
import { Suspense, startTransition, useMemo, useRef, useState } from "react";
import {
  ModelCompliancePanel,
  ModelHierarchy,
  ModelInfoPanel,
  ModelLoader,
  ModelUploadOverlay,
  type HierarchyNode,
  type LoadedModel,
  type ModelCameraInfo,
  type ModelStats,
} from "./ModelUpload";

function CameraControls({
  cameras,
  activeCamera,
  onActiveCameraChange,
}: {
  cameras: ModelCameraInfo[];
  activeCamera: string;
  onActiveCameraChange: (camera: string) => void;
}) {
  const { camera } = useThree();

  const defaultState = useRef<{
    pos: number[];
    quat: number[];
    fov: number;
  }>({
    pos: camera.position.toArray(),
    quat: camera.quaternion.toArray(),
    fov: (camera as PerspectiveCamera).fov,
  });

  const options = ["orbit", ...cameras.map((c) => c.name)];

  useControls("Camera", {
    fov: {
      value: 50,
      min: 20,
      max: 100,
      onChange: (value) => {
        const cam = camera as PerspectiveCamera;
        cam.fov = value;
        cam.updateProjectionMatrix();
      },
    },
    cameraDistance: {
      value: 4.5,
      min: 1,
      max: 15,
      onChange: (value) => {
        if (activeCamera === "orbit") {
          camera.position.z = value;
        }
      },
    },
    activeCamera: {
      value: activeCamera,
      options,
      onChange: (value) => {
        const cam = camera as PerspectiveCamera;
        if (value === "orbit") {
          camera.position.fromArray(defaultState.current.pos);
          camera.quaternion.fromArray(defaultState.current.quat);
          cam.fov = defaultState.current.fov;
          cam.updateProjectionMatrix();
        } else {
          const modelCam = cameras.find((c) => c.name === value);
          if (modelCam) {
            camera.position.set(...modelCam.position);
            cam.fov = modelCam.fov;
            cam.updateProjectionMatrix();
          }
        }
        onActiveCameraChange(value);
      },
    },
  }, [cameras, activeCamera]);

  return null;
}

const tmpCameraPos = new Vector3();
const tmpCameraQuat = new Quaternion();

function ModelCameraBinding({ modelCam }: { modelCam: ModelCameraInfo }) {
  const { camera } = useThree();
  const live = modelCam.object;

  const target = useMemo(() => {
    if (live) return null;
    return new Vector3(...modelCam.position).addScaledVector(
      new Vector3(0, 0, -1).applyEuler(new Euler(...modelCam.rotation)),
      10,
    );
  }, [modelCam, live]);

  useFrame(() => {
    if (live) {
      live.updateWorldMatrix(true, false);
      camera.position.copy(live.getWorldPosition(tmpCameraPos));
      camera.quaternion.copy(live.getWorldQuaternion(tmpCameraQuat));
      return;
    }
    if (!target) return;
    camera.position.set(...modelCam.position);
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
  }, -1);

  return null;
}

function AnimationControls({
  animations,
  playing,
  activeAnimation,
  onPlayingChange,
  onAnimationChange,
}: {
  animations: string[];
  playing: boolean;
  activeAnimation: string | null;
  onPlayingChange: (playing: boolean) => void;
  onAnimationChange: (name: string) => void;
}) {
  useControls("Animation", {
    play: {
      value: playing,
      onChange: (v: boolean) => onPlayingChange(v),
    },
    animation: {
      value: activeAnimation ?? animations[0] ?? "none",
      options: animations,
      onChange: (v: string) => onAnimationChange(v),
    },
  });

  return null;
}

function SceneControls({
  model,
  modelCameras,
  activeCamera,
  onActiveCameraChange,
  animations,
  playing,
  activeAnimation,
  onPlayingChange,
  onAnimationChange,
}: {
  model: LoadedModel | null;
  modelCameras: ModelCameraInfo[];
  activeCamera: string;
  onActiveCameraChange: (camera: string) => void;
  animations: string[];
  playing: boolean;
  activeAnimation: string | null;
  onPlayingChange: (playing: boolean) => void;
  onAnimationChange: (name: string) => void;
}) {
  const { envPreset } = useControls("Environment", {
    envPreset: {
      value: "sunset",
      options: [
        "sunset",
        "dawn",
        "night",
        "warehouse",
        "forest",
        "apartment",
        "studio",
        "city",
        "park",
        "lobby",
      ],
    },
    blur: { value: 1, min: 0, max: 1 },
  });

  const { autoRotate, autoRotateSpeed, enableZoom, enablePan } = useControls(
    "OrbitControls",
    {
      autoRotate: { value: true },
      autoRotateSpeed: { value: 2, min: 0, max: 10 },
      enableZoom: { value: true },
      enablePan: { value: true },
    },
  );

  const {
    shadowOpacity,
    shadowColor,
    shadowColorBlend,
    frames,
  } = useControls("Shadows", {
    shadowOpacity: { value: 1, min: 0, max: 1 },
    shadowColor: { value: "#8b00ff", options: ["#8b00ff", "black", "#000"] },
    shadowColorBlend: { value: 0.5, min: 0, max: 1 },
    frames: { value: 200, min: 1, max: 400, step: 1 },
  });

  const activeModelCam =
    activeCamera !== "orbit"
      ? modelCameras.find((c) => c.name === activeCamera) ?? null
      : null;

  return (
    <>
      <group position={[0, -0.65, 0]}>
        {model ? (
          <Suspense fallback={null}>
            <ModelLoader
              model={model}
              playing={playing}
              activeAnimation={activeAnimation}
            />
          </Suspense>
        ) : (
          <Shape />
        )}
        <AccumulativeShadows
          temporal
          frames={frames}
          color={shadowColor}
          colorBlend={shadowColorBlend}
          opacity={shadowOpacity}
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
      <Environment
        preset={envPreset as PresetsType}
        background
        blur={blur as unknown as number}
      />
      <OrbitControls
        enabled={activeCamera === "orbit"}
        autoRotate={autoRotate}
        autoRotateSpeed={autoRotateSpeed}
        enableZoom={enableZoom}
        enablePan={enablePan}
      />
      {activeModelCam && <ModelCameraBinding modelCam={activeModelCam} />}
      <CameraControls
        cameras={modelCameras}
        activeCamera={activeCamera}
        onActiveCameraChange={onActiveCameraChange}
      />
      {animations.length > 0 && (
        <AnimationControls
          animations={animations}
          playing={playing}
          activeAnimation={activeAnimation}
          onPlayingChange={onPlayingChange}
          onAnimationChange={onAnimationChange}
        />
      )}
    </>
  );
}

export default function Home() {
  const [model, setModel] = useState<LoadedModel | null>(null);
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [hierarchy, setHierarchy] = useState<HierarchyNode | null>(null);
  const [modelCameras, setModelCameras] = useState<ModelCameraInfo[]>([]);
  const [activeCamera, setActiveCamera] = useState("orbit");
  const [animations, setAnimations] = useState<string[]>([]);
  const [playing, setPlaying] = useState(false);
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);

  return (
    <main className="h-screen w-screen overflow-hidden">
      <div className="relative h-full w-full">
        <Canvas shadows camera={{ position: [0, 0, 4.5], fov: 50 }}>
          <SceneControls
            key={model?.url ?? "default"}
            model={model}
            modelCameras={modelCameras}
            activeCamera={activeCamera}
            onActiveCameraChange={setActiveCamera}
            animations={animations}
            playing={playing}
            activeAnimation={activeAnimation}
            onPlayingChange={setPlaying}
            onAnimationChange={setActiveAnimation}
          />
        </Canvas>
        <ModelUploadOverlay
          onModel={(m) => {
            setStats(null);
            setHierarchy(null);
            setModelCameras([]);
            setAnimations([]);
            setPlaying(false);
            setActiveAnimation(null);
            setActiveCamera("orbit");
            setModel({
              ...m,
              onStats: (s) => setStats(s),
              onHierarchy: (h) => setHierarchy(h),
              onCameras: (cams) => setModelCameras(cams),
              onAnimations: (names) => {
                setAnimations(names);
                setActiveAnimation((prev) => prev ?? names[0] ?? null);
              },
            });
          }}
          hasModel={!!model}
          onRemove={() => {
            setModel(null);
            setStats(null);
            setHierarchy(null);
            setModelCameras([]);
            setAnimations([]);
            setPlaying(false);
            setActiveAnimation(null);
            setActiveCamera("orbit");
          }}
        />
        <ModelInfoPanel stats={stats} />
        <ModelHierarchy root={hierarchy} />
        <ModelCompliancePanel stats={stats} />
      </div>
    </main>
  );
}

function Shape() {
  const { roughness, metalness } = useControls("Material", {
    roughness: { value: 1, min: 0, max: 1 },
    metalness: { value: 1, min: 0, max: 1 },
  });

  const [color, setColor] = useState("orange");
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);
  const [scaleZ, setScaleZ] = useState(1);
  const { scale } = useControls("Shape", {
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
  const { shape } = useControls("Shape", {
    shape: {
      value: "sphere",
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
          metalness={metalness}
          roughness={roughness}
          color={color}
        />
      </mesh>
    </Center>
  );
}
