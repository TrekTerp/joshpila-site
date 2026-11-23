import { ArtifactPage } from "../prototype-lab";
import { sectionMetadata } from "../section-metadata";

export const metadata = {
  ...sectionMetadata("patterns", "Patterns"),
  description: "Run Monte Carlo experiments in Chaos Lab, explore magic squares and Conway’s Life, shape particle streams, and trace paths to 6174.",
  alternates: { canonical: "https://www.joshpila.com/patterns/" },
};

export default function PatternsPage() {
  return <ArtifactPage id="patterns" />;
}
