import { ArtifactPage } from "../prototype-lab";
import { sectionMetadata } from "../section-metadata";

export const metadata = {
  ...sectionMetadata("patterns", "Patterns"),
  description: "Explore magic squares, Conway’s Game of Life, particle streams in Flux Chamber, and the paths that converge on 6174.",
  alternates: { canonical: "https://www.joshpila.com/patterns/" },
};

export default function PatternsPage() {
  return <ArtifactPage id="patterns" />;
}
