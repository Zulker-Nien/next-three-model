"use client";
import { useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader, KTX2Loader, DRACOLoader } from "three-stdlib";
import type { WebGLRenderer } from "three";

const TRANSCODER_PATH = "/loader/basis/";
const DRACO_PATH = "/loader/draco/";

let ktx2Loader: KTX2Loader | null = null;
let dracoLoader: DRACOLoader | null = null;

function getKTX2Loader(renderer: WebGLRenderer) {
  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath(TRANSCODER_PATH);
    ktx2Loader.setWorkerLimit(4);
  }
  ktx2Loader.detectSupport(renderer);
  return ktx2Loader;
}

function getDracoLoader() {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_PATH);
  }
  return dracoLoader;
}

export function useGltfWithKTX2(url: string) {
  const gl = useThree((s) => s.gl);
  return useLoader(
    GLTFLoader,
    url,
    (loader: GLTFLoader) => {
      loader.setDRACOLoader(getDracoLoader());
      loader.setKTX2Loader(getKTX2Loader(gl));
    },
  );
}
