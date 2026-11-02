import { AstronomyRouteBridge } from "../../astronomy-route-bridge";
import { sectionMetadata } from "../../section-metadata";
import { notFound } from "next/navigation";
import { RedirectClient } from "../../static-pages";
import { artifactPages } from "../../data";
import { ArtifactPage } from "../../prototype-lab";

export default async function CalmArtifactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artifact = artifactPages.find((artifact) => artifact.id === slug);
  if (!artifact) notFound();
  if (slug === "sky") return <AstronomyRouteBridge fallback="/astronomy/" />;
  if (artifact.href) return <RedirectClient href={artifact.href}/>;
  return <ArtifactPage id={slug} />;
}

export function generateStaticParams(){return artifactPages.map(a=>({slug:a.id}));}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artifact = artifactPages.find(item => item.id === slug);
  const icon = slug === "sky" ? "astronomy" : slug === "origin" ? "home" : slug;
  return artifact ? { ...sectionMetadata(icon, artifact.title), ...(slug === "sky" ? { alternates: { canonical: "https://www.joshpila.com/astronomy/" } } : {}) } : {};
}
