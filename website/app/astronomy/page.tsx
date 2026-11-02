import { ArtifactPage } from "../prototype-lab";
import { sectionMetadata } from "../section-metadata";
import { AstronomyRouteBridge } from "../astronomy-route-bridge";

export const metadata = {
  ...sectionMetadata("astronomy", "Astronomy"),
  alternates: { canonical: "https://www.joshpila.com/astronomy/" },
};

export default function AstronomyPage() {
  return <><AstronomyRouteBridge /><ArtifactPage id="sky" /></>;
}
