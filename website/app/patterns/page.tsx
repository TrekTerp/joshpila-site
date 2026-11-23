import { ArtifactPage } from "../prototype-lab";
import { sectionMetadata } from "../section-metadata";

export const metadata = {
  ...sectionMetadata("patterns", "Patterns"),
  description: "Experiment with ciphers, run Monte Carlo simulations, explore magic squares and Conway’s Life, shape particle streams, and trace paths to 6174.",
  alternates: { canonical: "https://www.joshpila.com/patterns/" },
};

export default function PatternsPage() {
  return <ArtifactPage id="patterns" />;
}
