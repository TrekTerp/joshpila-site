import { ArtifactPage } from "../prototype-lab";
import { sectionMetadata } from "../section-metadata";

export const metadata = {
  ...sectionMetadata("patterns", "Patterns"),
  description: "Magic squares, Conway’s Game of Life, 6174, and other systems that behave suspiciously well.",
  alternates: { canonical: "https://www.joshpila.com/patterns/" },
};

export default function PatternsPage() {
  return <ArtifactPage id="patterns" />;
}
