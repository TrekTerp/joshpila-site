import { notFound } from "next/navigation";
import { RedirectClient } from "../../static-pages";
import { artifactPages } from "../../data";
import { ArtifactPage } from "../../prototype-lab";

export default async function CalmArtifactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artifact = artifactPages.find((artifact) => artifact.id === slug);
  if (!artifact) notFound();
  if (artifact.href) return <RedirectClient href={artifact.href}/>;
  return <ArtifactPage id={slug} />;
}

export function generateStaticParams(){return artifactPages.map(a=>({slug:a.id}));}
