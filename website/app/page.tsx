import { preload } from "react-dom";
import { OrreryHome } from "./prototype-lab";
import { worldTextureUrls } from "./world-textures";

export default function Home() {
  // Fetch the planet surfaces alongside the scripts. `anonymous` matches how three.js requests them.
  worldTextureUrls.forEach((url) => preload(url, { as: "image", type: "image/webp", crossOrigin: "anonymous" }));
  return <OrreryHome />;
}
