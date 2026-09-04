"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFBX, useGLTF, Center } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { STLLoader } from "three-stdlib";

export type ModelType = "gltf" | "fbx" | "stl";

export type LoadedModel = {
  url: string;
  type: ModelType;
  name: string;
};

const ACCEPTED_EXTENSIONS: Record<string, ModelType> = {
  ".glb": "gltf",
  ".gltf": "gltf",
  ".fbx": "fbx",
  ".stl": "stl",
};

function getModelType(filename: string): ModelType | null {
  const lower = filename.toLowerCase();
  for (const [ext, type] of Object.entries(ACCEPTED_EXTENSIONS)) {
    if (lower.endsWith(ext)) return type;
  }
  return null;
}

export function ModelLoader({ model }: { model: LoadedModel }) {
  if (model.type === "gltf") return <GltfModel url={model.url} />;
  if (model.type === "fbx") return <FbxModel url={model.url} />;
  return <StlModel url={model.url} />;
}

function GltfModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return (
    <Center top>
      <primitive object={scene} castShadow />
    </Center>
  );
}

function FbxModel({ url }: { url: string }) {
  const fbx = useFBX(url);
  return (
    <Center top>
      <primitive object={fbx} castShadow />
    </Center>
  );
}

function StlModel({ url }: { url: string }) {
  const geometry = useLoader(STLLoader, url);
  return (
    <Center top>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial metalness={0.8} roughness={0.3} color="#f0a020" />
      </mesh>
    </Center>
  );
}

export function ModelUploadOverlay({
  onModel,
  hasModel = false,
  onRemove,
}: {
  onModel: (model: LoadedModel) => void;
  hasModel?: boolean;
  onRemove?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      const type = getModelType(file.name);
      if (!type) {
        alert(
          "Unsupported file type. Please use .glb, .gltf, .fbx, or .stl files.",
        );
        return;
      }
      const url = URL.createObjectURL(file);
      onModel({ url, type, name: file.name });
    },
    [onModel],
  );

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      setDragging(true);
    };
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer?.files ?? null);
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [handleFiles]);

  return (
    <>
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl border-2 border-dashed border-white/70 bg-black/60 px-10 py-8 text-xl font-semibold text-white">
            Drop your 3D model here
          </div>
        </div>
      )}
      <div className="pointer-events-auto absolute bottom-6 left-6 z-10 flex items-center gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 rounded-xl border border-white/30 bg-black/60 px-4 py-3 text-sm text-white backdrop-blur-md transition hover:bg-black/80"
          title={hasModel ? "Replace your model" : "Add your own 3D model"}
        >
          <span className="text-lg leading-none">+</span>
          <span>{hasModel ? "Replace model" : "Add model"}</span>
        </button>
        {hasModel && onRemove && (
          <button
            onClick={onRemove}
            className="flex items-center gap-2 rounded-xl border border-white/30 bg-red-600/70 px-4 py-3 text-sm text-white backdrop-blur-md transition hover:bg-red-700/80"
            title="Remove your model"
          >
            Remove
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".glb,.gltf,.fbx,.stl"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );
}
