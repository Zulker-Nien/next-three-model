"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFBX, useGLTF, Center } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import {
  BufferGeometry,
  Material,
  Mesh,
  Object3D,
  SkinnedMesh,
  Texture,
  AnimationClip,
  Box3,
  Vector3,
} from "three";
import { STLLoader } from "three-stdlib";

export type ModelType = "gltf" | "fbx" | "stl";

export type ModelStats = {
  fileName: string;
  format: ModelType;
  fileSize: string;
  meshes: number;
  vertices: number;
  triangles: number;
  materials: number;
  textures: number;
  animations: number;
  width: number;
  height: number;
  depth: number;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function countVertices(geometry: BufferGeometry): number {
  const pos = geometry.getAttribute("position");
  return pos ? pos.count : 0;
}

function countTriangles(geometry: BufferGeometry): number {
  const idx = geometry.getIndex();
  if (idx) return idx.count / 3;
  const pos = geometry.getAttribute("position");
  return pos ? pos.count / 3 : 0;
}

function collectMaterials(object: Object3D): Material[] {
  const set = new Set<Material>();
  object.traverse((child) => {
    if (child instanceof Mesh || child instanceof SkinnedMesh) {
      const mat = child.material;
      if (Array.isArray(mat)) mat.forEach((m) => set.add(m));
      else if (mat) set.add(mat);
    }
  });
  return Array.from(set);
}

function collectTextures(object: Object3D): Texture[] {
  const set = new Set<Texture>();
  const materials = collectMaterials(object);
  const mapKeys = [
    "map",
    "normalMap",
    "roughnessMap",
    "metalnessMap",
    "emissiveMap",
    "aoMap",
    "envMap",
    "alphaMap",
    "bumpMap",
    "displacementMap",
    "lightMap",
  ];
  materials.forEach((mat) => {
    for (const key of mapKeys) {
      const val = (mat as unknown as Record<string, unknown>)[key];
      if (val instanceof Texture) set.add(val);
    }
  });
  return Array.from(set);
}

function countAnimations(object: Object3D): number {
  let count = 0;
  object.traverse((child) => {
    if (child.animations && child.animations.length) {
      count += child.animations.length;
    }
  });
  return count;
}

function computeStats(
  object: Object3D,
  fileName: string,
  format: ModelType,
  fileSizeBytes: number,
): ModelStats {
  let meshes = 0;
  let vertices = 0;
  let triangles = 0;

  object.traverse((child) => {
    if (child instanceof Mesh || child instanceof SkinnedMesh) {
      meshes++;
      if (child.geometry) {
        vertices += countVertices(child.geometry);
        triangles += countTriangles(child.geometry);
      }
    }
  });

  const materials = collectMaterials(object).length;
  const textures = collectTextures(object).length;
  const animations = countAnimations(object);

  const box = new Box3().setFromObject(object);
  const size = new Vector3();
  box.getSize(size);

  return {
    fileName,
    format,
    fileSize: formatBytes(fileSizeBytes),
    meshes,
    vertices,
    triangles,
    materials,
    textures,
    animations,
    width: parseFloat(size.x.toFixed(4)),
    height: parseFloat(size.y.toFixed(4)),
    depth: parseFloat(size.z.toFixed(4)),
  };
}

export type HierarchyNode = {
  name: string;
  type: string;
  uuid: string;
  layers: number[];
  children: HierarchyNode[];
  materials: string[];
  animations: string[];
};

function buildHierarchy(object: Object3D): HierarchyNode {
  const typeName = object.type || object.constructor.name;

  const layers: number[] = [];
  for (let i = 0; i < 32; i++) {
    if (object.layers.mask & (1 << i)) layers.push(i);
  }

  let materials: string[] = [];
  if (object instanceof Mesh || object instanceof SkinnedMesh) {
    const mat = object.material;
    materials = Array.isArray(mat)
      ? mat.map((m) => m.name || m.type)
      : mat
        ? [mat.name || mat.type]
        : [];
  }

  const animations: string[] = (object.animations ?? []).map(
    (a) => a.name || a.uuid,
  );

  return {
    name: object.name || `${typeName} (${object.uuid.slice(0, 6)})`,
    type: typeName,
    uuid: object.uuid,
    layers,
    children: object.children.map(buildHierarchy),
    materials,
    animations,
  };
}

export type LoadedModel = {
  url: string;
  type: ModelType;
  name: string;
  fileSize: number;
  onStats?: (stats: ModelStats) => void;
  onHierarchy?: (root: HierarchyNode) => void;
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
  if (model.type === "gltf") return <GltfModel model={model} />;
  if (model.type === "fbx") return <FbxModel model={model} />;
  return <StlModel model={model} />;
}

function GltfModel({ model }: { model: LoadedModel }) {
  const { scene } = useGLTF(model.url);

  useEffect(() => {
    if (model.onStats) {
      model.onStats(computeStats(scene, model.name, model.type, model.fileSize));
    }
    if (model.onHierarchy) {
      model.onHierarchy(buildHierarchy(scene));
    }
  }, [scene, model]);

  return (
    <Center top>
      <primitive object={scene} castShadow />
    </Center>
  );
}

function FbxModel({ model }: { model: LoadedModel }) {
  const fbx = useFBX(model.url);

  useEffect(() => {
    if (model.onStats) {
      model.onStats(computeStats(fbx, model.name, model.type, model.fileSize));
    }
    if (model.onHierarchy) {
      model.onHierarchy(buildHierarchy(fbx));
    }
  }, [fbx, model]);

  return (
    <Center top>
      <primitive object={fbx} castShadow />
    </Center>
  );
}

function StlModel({ model }: { model: LoadedModel }) {
  const geometry = useLoader(STLLoader, model.url);

  useEffect(() => {
    if (model.onStats) {
      const mesh = new Mesh(geometry);
      model.onStats(computeStats(mesh, model.name, model.type, model.fileSize));
    }
    if (model.onHierarchy) {
      const mesh = new Mesh(geometry);
      mesh.name = "STL Model";
      model.onHierarchy(buildHierarchy(mesh));
    }
  }, [geometry, model]);

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
      onModel({ url, type, name: file.name, fileSize: file.size });
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

function TreeRow({
  node,
}: {
  node: HierarchyNode;
}) {
  const [open, setOpen] = useState(node.type === "Scene" || node.type === "Group");
  const hasChildren = node.children.length > 0;
  const hasHandles =
    node.materials.length > 0 ||
    node.animations.length > 0 ||
    node.layers.length > 0;

  return (
    <div>
      <div
        className="flex cursor-pointer items-center gap-1.5 py-0.5 hover:bg-white/5"
        onClick={() => hasChildren && setOpen((v) => !v)}
      >
        <span className="w-3 text-center text-white/40">
          {hasChildren ? (open ? "▾" : "▸") : ""}
        </span>
        <span className="font-mono text-white/80">{node.name}</span>
        <span className="text-white/40">[{node.type}]</span>
      </div>
      {open && (
        <div className="ml-4">
          {hasHandles && (
            <div className="mb-1 ml-2 text-[11px]">
              {node.materials.length > 0 && (
                <div>
                  <span className="text-emerald-300/70">materials: </span>
                  <span className="font-mono text-white/70">
                    {node.materials.join(", ")}
                  </span>
                </div>
              )}
              {node.animations.length > 0 && (
                <div>
                  <span className="text-sky-300/70">animations: </span>
                  <span className="font-mono text-white/70">
                    {node.animations.join(", ")}
                  </span>
                </div>
              )}
              {node.layers.length > 0 && (
                <div>
                  <span className="text-amber-300/70">layers: </span>
                  <span className="font-mono text-white/70">
                    {node.layers.join(", ")}
                  </span>
                </div>
              )}
            </div>
          )}
          {node.children.map((child) => (
            <TreeRow key={child.uuid} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ModelHierarchy({
  root,
}: {
  root: HierarchyNode | null;
}) {
  const [open, setOpen] = useState(true);

  if (!root) return null;

  return (
    <div className="pointer-events-auto absolute left-6 top-6 z-10 w-80">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-white/30 bg-black/60 px-4 py-3 text-sm text-white backdrop-blur-md transition hover:bg-black/80"
      >
        <span className="text-base leading-none">&#9881;</span>
        <span>Model Hierarchy</span>
        <span className="text-xs text-white/50">{open ? "▾" : "▴"}</span>
      </button>
      {open && (
        <div className="mt-2 max-h-[60vh] overflow-auto rounded-xl border border-white/20 bg-black/70 p-3 text-xs text-white/90 backdrop-blur-md">
          <TreeRow node={root} />
        </div>
      )}
    </div>
  );
}

export function ModelCompliancePanel({
  stats,
}: {
  stats: ModelStats | null;
}) {
  if (!stats) return null;

  const checks: { label: string; ok: boolean; note: string }[] = [];

  // Format suitability
  const formatLabel = stats.format === "gltf" ? "GLTF" : stats.format.toUpperCase();
  checks.push({
    label: "Format",
    ok: stats.format === "gltf",
    note:
      stats.format === "gltf"
        ? "glTF/GLB is the recommended web format"
        : `${formatLabel} works, but glTF/GLB is recommended for best web compatibility`,
  });

  // File size
  const sizeBytes = parseFloat(stats.fileSize);
  const sizeMB = stats.fileSize.endsWith("MB")
    ? sizeBytes
    : stats.fileSize.endsWith("KB")
      ? sizeBytes / 1024
      : sizeBytes / (1024 * 1024);

  checks.push({
    label: "File size",
    ok: sizeMB <= 20,
    note:
      sizeMB <= 20
        ? `~${sizeMB.toFixed(2)} MB is lightweight and loads fast on the web`
        : `~${sizeMB.toFixed(2)} MB is large; consider compressing or DRACO-compressing it`,
  });

  // Triangle count
  checks.push({
    label: "Geometry",
    ok: stats.triangles <= 250000,
    note:
      stats.triangles <= 250000
        ? `${stats.triangles.toLocaleString()} triangles is web-friendly`
        : `${stats.triangles.toLocaleString()} triangles is heavy; consider decimation/LOD`,
  });

  // Textures
  checks.push({
    label: "Textures",
    ok: stats.textures > 0,
    note:
      stats.textures > 0
        ? `${stats.textures} texture handle(s) present`
        : "No textures - model may look plain; materials rely on solid colors",
  });

  const allOk = checks.every((c) => c.ok);

  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 w-[min(90vw,600px)] -translate-x-1/2">
      <div
        className={`rounded-xl border px-5 py-3 text-center text-xs backdrop-blur-md ${
          allOk
            ? "border-emerald-400/40 bg-emerald-900/40 text-emerald-50"
            : "border-amber-400/40 bg-amber-900/40 text-amber-50"
        }`}
      >
        <div className="mb-1.5 font-semibold">
          {allOk
            ? "This model is ready for the web & rendering"
            : "This model may need optimization for the web"}
        </div>
        <ul className="mx-auto flex max-w-md flex-col gap-1 text-left">
          {checks.map((c) => (
            <li key={c.label} className="flex gap-2">
              <span className={c.ok ? "text-emerald-300" : "text-amber-300"}>
                {c.ok ? "✓" : "!"}
              </span>
              <span>
                <span className="font-mono text-white/80">{c.label}:</span>{" "}
                {c.note}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ModelInfoPanel({
  stats,
}: {
  stats: ModelStats | null;
}) {
  const [open, setOpen] = useState(true);

  if (!stats) return null;

  const rows: [string, string | number][] = [
    ["Format", stats.format],
    ["File size", stats.fileSize],
    ["Meshes", stats.meshes],
    ["Vertices", stats.vertices.toLocaleString()],
    ["Triangles", stats.triangles.toLocaleString()],
    ["Materials", stats.materials],
    ["Textures", stats.textures],
    ["Animations", stats.animations],
    ["Width", stats.width],
    ["Height", stats.height],
    ["Depth", stats.depth],
  ];

  return (
    <div className="pointer-events-auto absolute bottom-6 right-6 z-10">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-white/30 bg-black/60 px-4 py-3 text-sm text-white backdrop-blur-md transition hover:bg-black/80"
      >
        <span className="text-base leading-none">&#9432;</span>
        <span>Model Info</span>
        <span className="text-xs text-white/50">{open ? "▾" : "▴"}</span>
      </button>
      {open && (
        <div className="mt-2 w-64 rounded-xl border border-white/20 bg-black/70 p-4 text-xs text-white/90 backdrop-blur-md">
          <div className="mb-2 font-mono text-sm font-semibold text-white">
            {stats.fileName}
          </div>
          <table className="w-full border-collapse">
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label} className="border-b border-white/10 last:border-b-0">
                  <td className="py-1 pr-3 text-white/60">{label}</td>
                  <td className="py-1 text-right font-mono">{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
