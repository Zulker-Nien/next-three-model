# next-three-model — Feature Overview

An in-browser **3D model viewer** built with Next.js, React Three Fiber, and drei. Users can upload their own `.glb`, `.gltf`, `.fbx`, or `.stl` models, inspect them in a lights-and-camera-controlled scene, and review technical/diagnostics data. When no model is loaded, a configurable parametric shape is shown instead.

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS · React Three Fiber v9 · @react-three/drei v10 · three 0.185 · leva (settings panel)

---

## Core Features

### 1. Model Upload & Loading
- **Formats:** `.glb`, `.gltf`, `.fbx`, `.stl` (detected from the filename).
- **Input methods:**
  - Click the **"Add model"** button to open a file picker.
  - **Drag & drop** a model file anywhere onto the canvas.
- **Loaders:** Uses `GLTFLoader`, `FBXLoader`, and `STLLoader` from `three-stdlib`, with **KTX2 texture** and **Draco compression** support so compressed models load correctly (transcoders served from `/public/loader`).
- **Remove model:** A control lets you clear the loaded model and return to the placeholder shape.

### 2. Placeholder Shape Viewer
When no model is loaded, a centered parametric shape is shown instead, fully controllable via the settings panel:
- **Shape:** 12 primitives — sphere, box, cylinder, cone, torus, torusKnot, dodecahedron, icosahedron, octahedron, tetrahedron, capsule, plane.
- **Material:** roughness and metalness.
- **Geometry:** uniform scale, plus independent width / height / length.
- **Color:** 7 presets, changed via a non-blocking transition so the environment isn't dropped mid-swap.

### 3. Studio Scene & Lighting
- **Environment:** Real-time image-based lighting with 10 HDRI presets (sunset, dawn, night, warehouse, forest, apartment, studio, city, park, lobby), used as background with adjustable blur.
- **Soft Contact Shadows:** `AccumulativeShadows` + `RandomizedLight` for high-quality temporal soft shadows — opacity, blend color, and sample frames are configurable.

### 4. Camera & Navigation
- **OrbitControls** with toggles for auto-rotate (plus speed), zoom, and pan.
- **Embedded Camera switching** for uploaded models (see Model Diagnostics).

### 5. Settings Panel (leva)
A floating GUI exposes live controls grouped by:
- **Camera** — FOV, camera distance, and active camera selection.
- **Environment** — preset and blur.
- **OrbitControls** — auto-rotate, speed, zoom, pan.
- **Shadows** — opacity, blend color, sample frames.
- **Shape / Material** — placeholder geometry and material (see above).

### 6. Model Diagnostics (analysis of the loaded model)
After uploading a model, panels show:
- **Info Panel** — file size, triangle/vertex counts, material and texture counts, animation count, and camera count.
- **Hierarchy Tree** — collapsible scene graph of all nodes and their relationships.
- **Compliance Panel** — a checklist of common production/common-pitfall checks (e.g. texture presence, scale, etc.), presenting an overall pass/fail verdict.
- **Embedded Cameras** — cameras embedded inside a model file are extracted and made selectable, letting you jump to that camera's exact position, rotation, and FOV.

---

## Tech Highlights / Notes
- **App Router** with a single client-side page (`src/app/page.tsx`) hosting the R3F `<Canvas>`, plus model logic in `src/app/ModelUpload.tsx` and a KTX2/Draco loader hook in `src/app/useGltfWithKTX2.ts`.
- **React Server Components** render the static shell; the 3D scene is fully client-rendered.
- **Next.js 16** (Turbopack) with config written in TypeScript (`next.config.ts`) and **ESLint 9 flat config** (`eslint.config.mjs`) — run `npm run lint`, `npx tsc --noEmit`, `npm run build` to verify.

---

## Scripts
| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint (flat config) |
