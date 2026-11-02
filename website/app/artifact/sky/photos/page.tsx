import { AstronomyRouteBridge } from "../../../astronomy-route-bridge";
import { sectionMetadata } from "../../../section-metadata";
export const metadata = {
  ...sectionMetadata("astronomy", "Astrophotography"),
  alternates: { canonical: "https://www.joshpila.com/astronomy/gallery/" },
};
export default function Page() { return <AstronomyRouteBridge fallback="/astronomy/gallery/" />; }
