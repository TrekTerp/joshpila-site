"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { artifactPages, artifactHref, type Artifact } from "./data";
import { useCabinetTransition } from "./cabinet-transition";
import { BrandMark } from "./brand-mark";
import { AstronomyLanding } from "./sky-landing";

const OrreryScene = lazy(() => import("./orrery-scene").then((module) => ({ default: module.OrreryScene })));

function SubjectLinks() {
  return <nav className="subject-index" aria-label="Browse subjects">{artifactPages.map((item) => <Link key={item.id} href={artifactHref(item)}>{item.short}</Link>)}</nav>;
}

function SiteHeader({ quiet, setQuiet }: { quiet: boolean; setQuiet: (value: boolean) => void }) {
  return <header className="lab-header orrery-header">
    <Link className="lab-brand" href="/" aria-label="Josh Pila home"><BrandMark /><span><strong>Josh Pila</strong></span></Link>
    <div className="view-controls">
      <details className="subject-menu"><summary>Explore</summary><SubjectLinks /></details>
      <label className="motion-switch"><input type="checkbox" checked={quiet} onChange={(event) => setQuiet(event.target.checked)} /><span aria-hidden="true" /> Reduce motion</label>
    </div>
  </header>;
}

class OrreryBoundary extends Component<{ children: ReactNode }, { unavailable: boolean }> {
  state = { unavailable: false };
  static getDerivedStateFromError() { return { unavailable: true }; }
  render() {
    if (this.state.unavailable) return <section className="orrery-fallback" aria-label="Explore the collection"><h2>Explore the collection</h2><p>The Orrery isn’t available in this browser. All the destinations are here.</p><SubjectLinks /></section>;
    return this.props.children;
  }
}

export function OrreryHome({ initialSelectedId }: { initialSelectedId?: string }) {
  const [quiet, setQuiet] = useState(false);
  return <main className={`site-shell concept-orrery ${quiet ? "quiet-motion" : ""}`}>
    <SiteHeader quiet={quiet} setQuiet={setQuiet} />
    <Orrery quiet={quiet} initialSelectedId={initialSelectedId} />
  </main>;
}

function Orrery({ quiet, initialSelectedId }: { quiet: boolean; initialSelectedId?: string }) {
  const router = useRouter();
  const cabinetTransition = useCabinetTransition();
  const [selected, setSelected] = useState<Artifact | null>(() => artifactPages.find((item) => item.id === initialSelectedId) ?? null);
  const [departing, setDeparting] = useState(false);
  const [capturingCabinet, setCapturingCabinet] = useState(false);
  const departureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const beginCabinetTransition = (frame: Parameters<typeof cabinetTransition.begin>[0]) => cabinetTransition.begin(frame, { quiet });
  useEffect(() => {
    let arrivalTimer: ReturnType<typeof setTimeout> | null = null;
    let arrivalFrame = 0;
    if (document.body.dataset.orreryTransition === "departing") {
      arrivalFrame = requestAnimationFrame(() => {
        document.body.dataset.orreryTransition = "arriving";
        arrivalTimer = setTimeout(() => { delete document.body.dataset.orreryTransition; }, 500);
      });
    }
    return () => {
      if (departureTimer.current) clearTimeout(departureTimer.current);
      if (arrivalTimer) clearTimeout(arrivalTimer);
      if (arrivalFrame) cancelAnimationFrame(arrivalFrame);
    };
  }, []);
  useEffect(() => {
    const restore = () => {
      setDeparting(false);
      setCapturingCabinet(false);
      if (departureTimer.current) clearTimeout(departureTimer.current);
    };
    // React can reconnect this scene's effects with its departure state retained.
    // Reset on reactivation as well as full-document browser history restoration.
    restore();
    window.addEventListener("cabinet-transition-cancel", restore);
    // Cross-site Back may restore this page from the browser's page cache.
    window.addEventListener("pageshow", restore);
    return () => {
      window.removeEventListener("cabinet-transition-cancel", restore);
      window.removeEventListener("pageshow", restore);
    };
  }, []);
  const chooseWorld = (item: Artifact) => {
    if (item.id === "sky") {
      navigateToWorld(item);
      return;
    }
    setSelected(item);
    if (item.id === "cocktails") cabinetTransition.prepare();
  };
  const clearSelection = () => setSelected(null);
  const navigateToWorld = (item: Artifact) => {
    if (departing) return;
    setSelected(item);
    if (item.id === "cocktails") cabinetTransition.prepare();
    setDeparting(true);
    if (item.id === "cocktails") {
      setCapturingCabinet(true);
      return;
    }
    const href = artifactHref(item);
    const navigate = () => {
      if (item.href) {
        // Preserve selection even when Back reloads instead of restoring the page cache.
        const returnUrl = new URL(window.location.href);
        returnUrl.searchParams.set("selected", item.id);
        window.history.replaceState(window.history.state, "", returnUrl);
        window.location.assign(href);
      } else router.push(href);
    };
    const skipMotion = quiet || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    departureTimer.current = setTimeout(navigate, skipMotion ? 0 : 460);
  };
  return (
    <section className={`concept-stage orrery-stage ${selected ? "orrery-engaged" : ""} ${departing && !capturingCabinet ? "orrery-departing" : ""} ${capturingCabinet ? "orrery-cabinet-departing" : ""}`} aria-labelledby="concept-title">
      <div className="concept-intro orrery-intro"><h1 id="concept-title">Orrery Ascendant</h1><span>Astronomy, games, recipes, and other projects.</span></div>
      <div className="orrery-viewport">
        <OrreryBoundary><Suspense fallback={<div className="orrery-loading" role="status">Loading Orrery…</div>}>
          <OrreryScene
            selectedId={selected?.id ?? null}
            quiet={quiet}
            onSelect={chooseWorld}
            onClear={clearSelection}
            onNavigate={navigateToWorld}
            transitionActive={capturingCabinet}
            onDepartureFrame={beginCabinetTransition}
          />
        </Suspense></OrreryBoundary>
      </div>
    </section>
  );
}


function ArtifactNavigation({ currentId }: { currentId: string }) {
  return (
    <header className="artifact-header">
      <Link className="artifact-brand" href="/artifact/origin" aria-label="Josh Pila, Origin"><BrandMark /></Link>
      <nav className="artifact-world-nav" aria-label="Worlds">
        {artifactPages.map((artifact) => (
          <Link key={artifact.id} className={currentId === artifact.id ? "active" : ""} href={artifactHref(artifact)} aria-current={currentId === artifact.id ? "page" : undefined}>
            {artifact.short}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function ReturnToOrrery({ item }: { item: Artifact }) {
  const router = useRouter();
  const href = `/?selected=${item.id}`;
  return <Link className="artifact-return" href={href} onClick={(event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    document.body.dataset.orreryTransition = "departing";
    setTimeout(() => router.push(href), 470);
  }}>Return to Orrery <span aria-hidden="true">↗</span></Link>;
}

export function ArtifactPage({ id }: { id: string }) {
  const item = artifactPages.find((artifact) => artifact.id === id)!;
  return (
    <main className={`artifact-page artifact-${id}`}>
      <ArtifactNavigation currentId={id} />
      {id === "sky" ? <AstronomyLanding /> : id === "writing" ? (
        <article className="writing-entry">
          <p className="article-kicker">{item.eyebrow}</p>
          <h1>{item.title}</h1>
          <p className="article-deck">{item.description}</p>
          <p>Articles and presentations will be added here.</p>
          <ReturnToOrrery item={item} />
        </article>
      ) : (
        <article className="artifact-entry-shell" style={{ "--entry-accent": item.accent } as React.CSSProperties}>
          <section className="artifact-entry-lead">
            <div><p>{item.eyebrow}</p><h1>{item.title}</h1></div>
            <div><p>{item.description}</p>{id !== "origin" && <span>{item.status}</span>}</div>
          </section>
          <ReturnToOrrery item={item} />
        </article>
      )}
    </main>
  );
}
