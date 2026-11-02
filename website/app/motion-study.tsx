"use client";

import type { RefObject } from "react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GLASSES_PER_SHELF, cocktailArchiveHref } from "./cabinet-years";
import { CocktailYearsProvider, useCocktailYears } from "./cocktail-years-context";
import { CabinetArtScene } from "./cabinet-art-scene";
import { BrandMark } from "./brand-mark";

const MotionStudyScene = lazy(() => import("./motion-study-scene").then((module) => ({ default: module.MotionStudyScene })));

export type MotionStudyKey = "anchorage" | "cabinet";
type CocktailSection = "overview" | "backstory" | "advent" | "recipes";
type InteractionTarget = "cooking" | "cocktails" | "backstory" | "advent" | "recipes" | `year-${number}` | null;

const phases = [
  { short: "System", label: "Selected in the Orrery" },
  { short: "Approach", label: "Approaching the world" },
  { short: "Planet", label: "Cooking & Cocktails" },
  { short: "Branch", label: "Cocktails selected" },
  { short: "Collection", label: "Advent archive" },
  { short: "Year", label: "Advent 2024" },
  { short: "Entry", label: "Day 01 · Bramble" },
] as const;

const studyMeta = {
  anchorage: {
    line: "The world holds the edge while its collections unfold from the surface.",
    warning: "Does the world preserve orientation without charging rent on the useful space?",
  },
  cabinet: {
    line: "The approached world becomes a coopered cabinet, with every shelf carrying meaning.",
    warning: "Does the planet-to-cabinet transformation feel continuous, useful, and earned?",
  },
} as const;

const targetEvents = (setActiveTarget: (target: InteractionTarget) => void, target: Exclude<InteractionTarget, null>) => ({
  onPointerEnter: () => setActiveTarget(target),
  onPointerLeave: () => setActiveTarget(null),
  onFocus: () => setActiveTarget(target),
  onBlur: () => setActiveTarget(null),
});

function YearSelector({ mode, phase, selectedYear, selectYear, setActiveTarget }: { mode: "workspace" | "cabinet"; phase: number; selectedYear: number; selectYear: (year: number) => void; setActiveTarget: (target: InteractionTarget) => void }) {
  const adventYears = useCocktailYears();
  return <div className={mode === "cabinet" ? "cabinet-year-selector" : "year-selector"} role="group" aria-label="Advent years">
    {adventYears.map(({ year, status, photographed }) => <button
      key={year}
      className={`${phase >= 5 && year === selectedYear ? "selected" : ""} ${photographed ? "photographed" : "backfill"} year-${year}`}
      onClick={() => selectYear(year)}
      aria-pressed={phase >= 5 && year === selectedYear}
      aria-label={`${year}, ${status}`}
      title={`${year} · ${status}`}
      {...targetEvents(setActiveTarget, `year-${year}`)}
    ><strong>{year}</strong>{mode === "workspace" && <small>{status}</small>}</button>)}
  </div>;
}

function StudyHeader({ quiet, setQuiet }: { quiet: boolean; setQuiet: (value: boolean) => void }) {
  // Return through a fresh document, independent of cached scene/transition state.
  return <header className="study-header cabinet-header">
    <a className="lab-brand" href="/?selected=cocktails" aria-label="Return to Orrery"><BrandMark /><span><strong>Josh Pila</strong><small>Cooking &amp; Cocktails</small></span></a>
    <div className="study-header-actions"><a href="/?selected=cocktails">Return to Orrery</a><label className="motion-switch"><input type="checkbox" checked={quiet} onChange={(event) => setQuiet(event.target.checked)} /><span aria-hidden="true" /> Reduce motion</label></div>
  </header>;
}

function CalendarGrid({ onSelect, active }: { onSelect: () => void; active: boolean }) {
  const names = ["Bramble", "Better Better", "Black Magic", "Corn ’n Oil", "Left Hand", "Gotham"];
  return <div className="study-calendar" aria-label="Twenty-four days of Advent 2024">{Array.from({ length: 24 }, (_, index) => { const day = index + 1; return <button key={day} className={`${day === 1 && active ? "selected" : ""} thumbnail-${(index % 6) + 1}`} onClick={() => day === 1 && onSelect()} aria-pressed={day === 1 && active}><span className="day-image" aria-hidden="true" /><strong>{String(day).padStart(2, "0")}</strong><small>{names[index % names.length]}</small></button>; })}</div>;
}

function EntryPanel({ onBack }: { onBack: () => void }) {
  return <article className="study-entry"><div className="entry-photo" role="img" aria-label="Placeholder for Josh's Bramble cocktail photograph"><span>PHOTOGRAPH<br />PLACEHOLDER</span></div><div className="entry-copy"><p>ADVENT OF COCKTAILS ’24 · DAY 01</p><h2>Bramble</h2><p>A record of the drink, the photograph, and whatever proved worth remembering.</p><dl><div><dt>Record</dt><dd>Made and photographed</dd></div><div><dt>View</dt><dd>Day record</dd></div><div><dt>Related</dt><dd>Recipe specification</dd></div></dl><button onClick={onBack}>← Back to Advent 2024</button></div></article>;
}

function AnchorageNavigator({ phase, section, selectSection, setPhase, branchReady, setActiveTarget }: { phase: number; section: CocktailSection; selectSection: (section: CocktailSection) => void; setPhase: (phase: number) => void; branchReady: boolean; setActiveTarget: (target: InteractionTarget) => void }) {
  const expanded = phase >= 3;
  const ready = expanded && branchReady;
  return <nav className={`anchorage-tree projected-navigation ${expanded ? "expanded" : ""} ${ready ? "tree-ready" : ""}`} aria-label="Cooking and Cocktails navigation">
    <button className="anchor-node cooking-node" aria-pressed="false" onClick={() => setPhase(2)} {...targetEvents(setActiveTarget, "cooking")}><strong>Cooking</strong><small>Structure still open</small></button>
    <button className={`anchor-node cocktails-node ${expanded ? "selected" : ""}`} aria-pressed={expanded} onClick={() => setPhase(3)} {...targetEvents(setActiveTarget, "cocktails")}><strong>Cocktails</strong><small>Stories, Advents, and recipes</small></button>
    <div className="anchor-branches" aria-hidden={!ready}>
      <button className={`anchor-branch branch-backstory ${section === "backstory" ? "selected" : ""}`} disabled={!ready} tabIndex={ready ? 0 : -1} onClick={() => selectSection("backstory")} {...targetEvents(setActiveTarget, "backstory")}><strong>About the archive</strong><small>Why it exists</small></button>
      <button className={`anchor-branch branch-advent ${section === "advent" ? "selected" : ""}`} disabled={!ready} tabIndex={ready ? 0 : -1} onClick={() => selectSection("advent")} {...targetEvents(setActiveTarget, "advent")}><strong>Advent of Cocktails</strong><small>Six Decembers</small></button>
      <button className={`anchor-branch branch-recipes ${section === "recipes" ? "selected" : ""}`} disabled={!ready} tabIndex={ready ? 0 : -1} onClick={() => selectSection("recipes")} {...targetEvents(setActiveTarget, "recipes")}><strong>Find a drink</strong><small>Names and ingredients</small></button>
    </div>
  </nav>;
}

function CabinetNavigator({ phase, section, selectSection, selectYear, selectedYear, setPhase, doorReady, yearOffset, setYearOffset, setActiveTarget }: { section: CocktailSection; selectSection: (section: CocktailSection) => void; selectYear: (year: number) => void; selectedYear: number; yearOffset: number; setYearOffset: (offset: number) => void; phase: number; setPhase: (phase: number) => void; doorReady: boolean; setActiveTarget: (target: InteractionTarget) => void }) {
  const adventYears = useCocktailYears();
  const open = phase >= 3;
  const ready = open && doorReady;
  const archiveOpen = phase >= 4;
  const touchStart = useRef<number | null>(null);
  const swiped = useRef(false);
  return <nav className={`barrel-navigation projected-navigation ${open ? "barrel-open" : ""} ${ready ? "door-ready" : ""} ${archiveOpen ? "archive-open" : ""}`} aria-label="Cooking and Cocktails cabinet">
    <button className="door-label cooking-door-control" aria-pressed="false" onClick={() => setPhase(2)} {...targetEvents(setActiveTarget, "cooking")}><strong>Cooking</strong><small>Closed for now</small></button>
    <button className="door-label cocktail-door-control" aria-pressed={open} onClick={() => setPhase(3)} {...targetEvents(setActiveTarget, "cocktails")}><strong>Cocktails</strong><small>{open ? "Open" : "Open the cabinet"}</small></button>
    <button type="button" className="cabinet-close-door" hidden={!ready} aria-label="Close cocktail cabinet" title="Close cocktail cabinet" onClick={() => { setPhase(2); requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('.cocktail-door-control')?.focus()); }}><span>Close</span></button>
    <div className="cabinet-glass-years" role="group" aria-label="Advent years on the glass shelf" aria-hidden={!ready}
      onClickCapture={(event) => { if (swiped.current) { event.preventDefault(); swiped.current = false; } }}
      onTouchStart={(event) => { swiped.current = false; touchStart.current = event.touches[0].clientX; }}
      onTouchEnd={(event) => {
        const distance = event.changedTouches[0].clientX - (touchStart.current ?? event.changedTouches[0].clientX);
        swiped.current = Math.abs(distance) > 30;
        if (swiped.current) setYearOffset(Math.max(0, Math.min(Math.max(0, adventYears.length - GLASSES_PER_SHELF), yearOffset + (distance < 0 ? 1 : -1))));
        touchStart.current = null;
      }}>
      {adventYears.map(({ year, status }, index) => {
        const visible = index >= yearOffset && index < yearOffset + GLASSES_PER_SHELF;
        return <a key={year} className={`glass-year glass-year-${year} ${section === "advent" && selectedYear === year ? "selected" : ""}`} hidden={!visible}
          style={{ left: `var(--anchor-glass-${year}-x)`, top: `var(--anchor-glass-${year}-y)`, width: `var(--glass-${year}-width)` }}
          tabIndex={ready && visible ? 0 : -1} aria-label={`Advent ${year}, ${status}`} href={cocktailArchiveHref("calendar",year)} onClick={(event) => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.defaultPrevented && !swiped.current) { event.preventDefault(); selectYear(year); } }}
          {...targetEvents(setActiveTarget, `year-${year}`)}><span>{year}</span></a>;
      })}
      <div className="glass-shelf-pager">
        <button disabled={!ready || yearOffset === 0} onClick={() => setYearOffset(Math.max(0, yearOffset - 1))} aria-label="Show older years">←</button>
        <span aria-live="polite">{adventYears[yearOffset]?.year}–{adventYears[Math.min(adventYears.length - 1, yearOffset + GLASSES_PER_SHELF - 1)]?.year}</span>
        <button disabled={!ready || yearOffset >= adventYears.length - GLASSES_PER_SHELF} onClick={() => setYearOffset(Math.min(Math.max(0, adventYears.length - GLASSES_PER_SHELF), yearOffset + 1))} aria-label="Show newer years">→</button>
      </div>
    </div>
    <div className="barrel-shelf-controls" aria-hidden={!ready}>
      <button aria-label="About the archive, books and papers" aria-controls="cabinet-shelf-panel" aria-expanded={section === "backstory"} className={`barrel-shelf shelf-story ${section === "backstory" ? "selected" : ""}`} disabled={!ready} onClick={() => selectSection("backstory")} {...targetEvents(setActiveTarget, "backstory")}><strong>About the archive</strong></button>
      <button aria-label="Advent of Cocktails, glassware and photographs" aria-controls="cabinet-shelf-panel" aria-expanded={section === "advent"} className={`barrel-shelf shelf-advent ${section === "advent" ? "selected" : ""}`} disabled={!ready} onClick={() => selectSection("advent")} {...targetEvents(setActiveTarget, "advent")}><strong>Advent of Cocktails</strong></button>
      <button aria-label="Find a drink, bottles and ingredients" aria-controls="cabinet-shelf-panel" aria-expanded={section === "recipes"} className={`barrel-shelf shelf-recipes ${section === "recipes" ? "selected" : ""}`} disabled={!ready} onClick={() => selectSection("recipes")} {...targetEvents(setActiveTarget, "recipes")}><strong>Find a drink</strong></button>
    </div>
  </nav>;
}

function ContextBack({ phase, section, onBack }: { phase: number; section: CocktailSection; onBack: () => void }) {
  const label = phase >= 6 ? "Advent 2024" : phase >= 5 ? "Advent years" : phase >= 4 ? "Cocktails" : section !== "overview" ? "Cocktails" : "Cooking & Cocktails";
  return <button className="context-back" onClick={onBack}>← Back to {label}</button>;
}

function workspaceAnchor(concept: MotionStudyKey, section: CocktailSection, phase: number) {
  if (concept === "anchorage") {
    if (phase >= 4 || section === "advent") return "tether-advent";
    if (section === "backstory") return "tether-backstory";
    if (section === "recipes") return "tether-recipes";
    return "tether-cocktails";
  }
  if (phase >= 4 || section === "advent") return "tether-advent";
  if (section === "backstory") return "tether-backstory";
  if (section === "recipes") return "tether-recipes";
  return "tether-cabinet";
}

function CocktailWorkspace({ concept, phase, section, setPhase, onBack, selectedYear, selectYear, setActiveTarget }: { selectedYear: number; selectYear: (year: number) => void; concept: MotionStudyKey; phase: number; section: CocktailSection; setPhase: (phase: number) => void; onBack: () => void; setActiveTarget: (target: InteractionTarget) => void }) {
  const adventYears = useCocktailYears();
  const tether = workspaceAnchor(concept, section, phase);
  if (phase >= 6) return <><div className={`workspace-runner entry-runner ${tether}`} aria-hidden="true"><span /></div><div className="entry-workspace"><EntryPanel onBack={onBack} /></div></>;
  return <>
    <div className={`workspace-runner ${tether}`} aria-hidden="true"><span /></div>
    <section className={`cocktail-workspace workspace-${section} workspace-phase-${phase} ${tether}`} aria-live="polite">
      <ContextBack phase={phase} section={section} onBack={onBack} />
      {phase === 3 && section === "overview" && <div className="workspace-intro"><p>COCKTAILS</p><h2>Drinks worth making again</h2><span>Recipes, photographs, and six Decembers of experiments. Choose a route from the open structure.</span></div>}
      {phase === 3 && section === "backstory" && <div className="workspace-intro"><p>ABOUT THE ARCHIVE</p><h2>A practice measured in drinks</h2><span>Why the archive exists, how Advent began, and what the photographs preserve.</span></div>}
      {phase === 3 && section === "recipes" && <div className="workspace-intro"><p>FIND A DRINK</p><h2>Start with what you have</h2><span>A future selector for names, base spirits, ingredients, and variants.</span><div className="recipe-filter-preview"><button>Spirit</button><button>Ingredient</button><button>Name</button></div></div>}
      {phase === 4 && <div className="archive-selection"><p>ADVENT OF COCKTAILS</p><h2>Choose a December</h2><span>{concept === "cabinet" ? "Choose a glass on the shelf, or a year below." : "Four photographed Decembers and two earlier years awaiting reconstruction."}</span><YearSelector mode="workspace" phase={phase} selectedYear={selectedYear} selectYear={selectYear} setActiveTarget={setActiveTarget} /></div>}
      {phase === 5 && selectedYear === 2024 && <div className="archive-matrix"><div className="matrix-heading"><p>ADVENT OF COCKTAILS ’24</p><h2>Twenty-four nights</h2></div><CalendarGrid onSelect={() => setPhase(6)} active={false} /></div>}
      {phase === 5 && selectedYear !== 2024 && <div className="archive-selection"><p>ADVENT OF COCKTAILS</p><h2>December {selectedYear}</h2><span>{adventYears.find((item) => item.year === selectedYear)?.photographed ? "Photographs are waiting to be added to this archive." : "This December’s archive is waiting to be reconstructed."}</span><YearSelector mode="workspace" phase={phase} selectedYear={selectedYear} selectYear={selectYear} setActiveTarget={setActiveTarget} /></div>}
    </section>
  </>;
}

function CabinetShelfPanel({ section, year, onClose, onYearChange }: { section: CocktailSection; year: number; onClose: () => void; onYearChange: (year: number) => void }) {
  const adventYears = useCocktailYears();
  const panelRef = useRef<HTMLElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const view = section === "recipes" ? "finder" : section === "advent" ? "calendar" : "backstory";
  const frameYear = useRef(year);
  const [frameRevision, setFrameRevision] = useState(0);
  const [frameSrc, setFrameSrc] = useState(() => `${cocktailArchiveHref(view,year)}&embed=cabinet`);
  useEffect(() => {
    if (year !== frameYear.current) {
      frameYear.current = year;
      setFrameSrc(`${cocktailArchiveHref(view,year)}&embed=cabinet`);
      setFrameRevision(value => value + 1);
    }
  }, [year, view]);
  const title = section === "recipes" ? "Find a drink" : section === "advent" ? "Advent of Cocktails" : "About the archive";
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
    if (window.matchMedia("(max-width: 899px)").matches) panelRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
  }, [section]);
  useEffect(() => {
    const closeFromFrame = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === "cocktail-panel-close") onClose();
      if ((event.data?.type === "cocktail-year-changed" && adventYears.some(item => item.year === event.data.year)) || (event.data?.type === "cocktail-archive-updated" && Number.isInteger(event.data.year) && event.data.year >= 2020 && event.data.year <= 2100)) {
        frameYear.current = event.data.year;
        onYearChange(event.data.year);
      }
    };
    window.addEventListener("message", closeFromFrame);
    return () => window.removeEventListener("message", closeFromFrame);
  }, [onClose, onYearChange, adventYears]);
  return <aside id="cabinet-shelf-panel" className="cabinet-shelf-panel" ref={panelRef} tabIndex={-1} aria-labelledby="cabinet-panel-title" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
    <header><div><p>{section === "recipes" ? "III · THE RECIPE INDEX" : section === "advent" ? "II · THE DECEMBER COLLECTION" : "I · THE COCKTAIL JOURNAL"}</p><h2 id="cabinet-panel-title">{title}</h2></div><button type="button" onClick={onClose} aria-label={`Close ${title}`}>×</button></header>
    <iframe ref={iframeRef} key={frameRevision} title={title} src={frameSrc} />
  </aside>;
}

function SubjectIndex({ concept, phase, section, setPhase, selectSection, onBack, overlayRef, cabinetReady, branchReady, yearOffset, setYearOffset, selectedYear, selectYear, setActiveTarget }: { yearOffset: number; setYearOffset: (offset: number) => void; selectedYear: number; selectYear: (year: number) => void; concept: MotionStudyKey; phase: number; section: CocktailSection; setPhase: (phase: number) => void; selectSection: (section: CocktailSection) => void; onBack: () => void; overlayRef: RefObject<HTMLDivElement | null>; cabinetReady: boolean; branchReady: boolean; setActiveTarget: (target: InteractionTarget) => void }) {
  const workspaceReady = concept === "anchorage" ? branchReady : cabinetReady;
  return <div className={`study-destination ${concept}-destination phase-${phase}`} ref={overlayRef}>
    <header className="destination-heading"><p>RECIPES &amp; PHOTOGRAPHS</p><h1>Cooking &amp; Cocktails</h1><span>My Advent of Cocktails recipes and photographs.</span></header>
    {concept === "anchorage" ? <AnchorageNavigator phase={phase} section={section} selectSection={selectSection} setPhase={setPhase} branchReady={branchReady} setActiveTarget={setActiveTarget} /> : <CabinetNavigator section={section} selectSection={selectSection} selectYear={selectYear} selectedYear={selectedYear} yearOffset={yearOffset} setYearOffset={setYearOffset} phase={phase} setPhase={setPhase} doorReady={cabinetReady} setActiveTarget={setActiveTarget} />}
    {concept === "cabinet" && phase >= 3 && workspaceReady && section !== "overview" && <CabinetShelfPanel key={section} section={section} year={selectedYear} onYearChange={selectYear} onClose={() => selectSection("overview")} />}
    {concept !== "cabinet" && phase >= 3 && workspaceReady && <CocktailWorkspace selectedYear={selectedYear} selectYear={selectYear} concept={concept} phase={phase} section={section} setPhase={setPhase} onBack={onBack} setActiveTarget={setActiveTarget} />}
  </div>;
}

function EvaluationNotes({ concept }: { concept: MotionStudyKey }) {
  return <details className="evaluation-rail study-evaluation"><summary>Evaluation notes</summary><div><p><strong>Watch for:</strong> {studyMeta[concept].warning}</p><ol><li>Does the approach feel continuous with the Orrery?</li><li>Does the structure remain legible as it grows?</li><li>Does content gain space without losing the path?</li></ol></div></details>;
}

function MotionStudyContent({ concept, initialYear, initialSection = "overview" }: { concept: MotionStudyKey; initialYear?: number; initialSection?: CocktailSection }) {
  const adventYears = useCocktailYears();
  const [phase, setPhaseState] = useState(concept === "cabinet" ? (initialYear || initialSection !== "overview" ? 3 : 2) : 0);
  const [section, setSection] = useState<CocktailSection>(initialSection);
  const [selectedYear, setSelectedYear] = useState(initialYear ?? adventYears[adventYears.length - 1].year);
  const [yearOffset, setYearOffset] = useState(() => Math.min(Math.max(0, adventYears.findIndex(y => y.year === (initialYear ?? adventYears[adventYears.length - 1].year))), Math.max(0, adventYears.length - GLASSES_PER_SHELF)));
  const [previousYears, setPreviousYears] = useState(adventYears);
  if (previousYears !== adventYears) {
    setPreviousYears(adventYears);
    const index = adventYears.findIndex(item => item.year === selectedYear);
    if (index >= 0 && (index < yearOffset || index >= yearOffset + GLASSES_PER_SHELF)) setYearOffset(Math.max(0, Math.min(index, adventYears.length - GLASSES_PER_SHELF)));
  }
  const [quiet, setQuiet] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeTarget, setActiveTarget] = useState<InteractionTarget>(null);
  const [cabinetReady, setCabinetReady] = useState(false);
  const [branchReady, setBranchReady] = useState(false);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const mediaQuery = useRef<MediaQueryList | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const clearTimers = useCallback(() => { timers.current.forEach((timer) => clearTimeout(timer)); timers.current = []; setPlaying(false); }, []);
  const setPhase = useCallback((next: number) => { clearTimers(); const minimum = concept === "cabinet" ? 2 : 0; const bounded = Math.max(minimum, Math.min(phases.length - 1, next)); setPhaseState(bounded); setSection(bounded >= 4 ? "advent" : "overview"); setActiveTarget(null); if (concept === "cabinet" && bounded === 2) { const url = new URL(window.location.href); url.searchParams.delete("panel"); url.searchParams.delete("year"); if (url.href !== window.location.href) window.history.pushState(null, "", url); } }, [clearTimers, concept]);
  const rememberShelf = useCallback((next: CocktailSection, year: number) => {
    if (concept !== "cabinet") return;
    const url = new URL(window.location.href);
    url.searchParams.set("year", String(year));
    if (next === "overview") url.searchParams.delete("panel");
    else url.searchParams.set("panel", next);
    if (url.href !== window.location.href) window.history.pushState(null, "", url);
  }, [concept]);
  const selectYear = useCallback((year: number) => { setSelectedYear(year); setYearOffset(offset => { const index = adventYears.findIndex(item => item.year === year); return index >= offset && index < offset + GLASSES_PER_SHELF ? offset : Math.max(0, Math.min(index, adventYears.length - GLASSES_PER_SHELF)); }); setPhase(5); rememberShelf("advent", year); }, [setPhase, rememberShelf, adventYears]);
  const selectSection = useCallback((next: CocktailSection) => {
    clearTimers(); setSection(next); setPhaseState(next === "advent" ? 4 : 3); setActiveTarget(null); rememberShelf(next, selectedYear);
    if (next === "overview") requestAnimationFrame(() => overlayRef.current?.querySelector<HTMLButtonElement>(`.shelf-${section === "backstory" ? "story" : section === "recipes" ? "recipes" : "advent"}`)?.focus());
  }, [clearTimers, rememberShelf, selectedYear, section]);
  useEffect(() => {
    if (concept !== "cabinet") return;
    const restoreShelf = () => {
      const params = new URLSearchParams(window.location.search);
      const panel = params.get("panel");
      const next = panel === "backstory" || panel === "recipes" || panel === "advent" ? panel : "overview";
      const year = Number(params.get("year"));
      if (adventYears.some(item => item.year === year)) {
        setSelectedYear(year);
        setYearOffset(Math.max(0, Math.min(adventYears.findIndex(item => item.year === year), adventYears.length - GLASSES_PER_SHELF)));
      }
      setSection(next); setPhaseState(next !== "overview" || adventYears.some(item => item.year === year) ? 3 : 2);
    };
    window.addEventListener("popstate", restoreShelf);
    return () => window.removeEventListener("popstate", restoreShelf);
  }, [concept, adventYears]);
  const onBack = useCallback(() => { if (phase === 3 && section !== "overview") { setSection("overview"); return; } setPhase(phase - 1); }, [phase, section, setPhase]);
  const beginApproach = useCallback(() => { clearTimers(); if (concept === "cabinet" || quiet || mediaQuery.current?.matches) { setPhaseState(2); return; } setPhaseState(1); timers.current.push(setTimeout(() => setPhaseState(2), 1750)); }, [clearTimers, concept, quiet]);
  const playFullStudy = useCallback(() => {
    clearTimers();
    setSelectedYear(2024);
    if (quiet || mediaQuery.current?.matches) { setSection("advent"); setPhaseState(6); return; }
    setPlaying(true);
    setSection("overview");
    if (concept === "cabinet") {
      setPhaseState(2);
      const schedule = [[900, 3], [2600, 4], [4000, 5], [5600, 6]] as const;
      schedule.forEach(([delay, next]) => timers.current.push(setTimeout(() => { setPhaseState(next); setSection(next >= 4 ? "advent" : "overview"); if (next === 6) setPlaying(false); }, delay)));
      return;
    }
    setPhaseState(0);
    const schedule = [[520, 1], [2200, 2], [3500, 3], [5000, 4], [6400, 5], [8000, 6]] as const;
    schedule.forEach(([delay, next]) => timers.current.push(setTimeout(() => { setPhaseState(next); setSection(next >= 4 ? "advent" : "overview"); if (next === 6) setPlaying(false); }, delay)));
  }, [clearTimers, concept, quiet]);
  useEffect(() => {
    mediaQuery.current = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (concept === "cabinet") return clearTimers;
    if (mediaQuery.current.matches) { setPhaseState(2); return clearTimers; }
    const timer = setTimeout(beginApproach, 700);
    return () => { clearTimeout(timer); clearTimers(); };
  }, [beginApproach, clearTimers, concept]);
  useEffect(() => {
    if (phase !== 5 || !window.matchMedia("(max-width: 899px)").matches) return;
    overlayRef.current?.querySelector(".cocktail-workspace")?.scrollIntoView({
      block: "start", behavior: quiet || mediaQuery.current?.matches ? "auto" : "smooth",
    });
  }, [phase, selectedYear, quiet]);
  const phaseLabel = useMemo(() => phase === 5 ? `Advent ${selectedYear}` : phases[phase].label, [phase, selectedYear]);
  const arrived = phase >= 2;
  return <main className={`motion-study study-${concept} phase-${phase} section-${section} ${quiet ? "quiet-motion" : ""}`}>
    <StudyHeader quiet={quiet} setQuiet={(value) => { setQuiet(value); if (value && phase === 1) setPhase(2); }} />
    <section className="motion-stage" aria-labelledby="study-title">
      <div className="study-starfield" aria-hidden="true" />
      {concept === "cabinet"
        ? <CabinetArtScene yearOffset={yearOffset} openSide={phase >= 3 ? "cocktails" : null} workspaceOpen={phase >= 4 || (phase === 3 && section !== "overview")} quiet={quiet} overlayRef={overlayRef} activeTarget={activeTarget} onCabinetReady={setCabinetReady} />
        : <Suspense fallback={<div className="study-loading" role="status">Bringing the world into focus…</div>}><MotionStudyScene concept={concept} phase={phase} quiet={quiet} overlayRef={overlayRef} activeTarget={activeTarget} onCabinetReady={setCabinetReady} onAnchorageReady={setBranchReady} /></Suspense>}
      <div className={`system-selection ${phase >= 1 ? "receded" : ""}`}><p>ORRERY ASCENDANT · SELECTED WORLD</p><h1 id="study-title">Cooking &amp; Cocktails</h1><span>{studyMeta[concept].line}</span>{phase === 0 && <button onClick={beginApproach}>Begin approach <span aria-hidden="true">→</span></button>}</div>
      {arrived && <SubjectIndex yearOffset={yearOffset} setYearOffset={setYearOffset} selectedYear={selectedYear} selectYear={selectYear} concept={concept} phase={phase} section={section} setPhase={setPhase} selectSection={selectSection} onBack={onBack} overlayRef={overlayRef} cabinetReady={cabinetReady} branchReady={branchReady} setActiveTarget={setActiveTarget} />}
    </section>
    {concept !== "cabinet" && <section className="study-controls" id="study-controls" aria-label="Motion study controls"><div><small>CURRENT BEAT</small><strong>{String(phase + 1).padStart(2, "0")} · {phaseLabel}</strong></div><div className="phase-readout" aria-hidden="true">{phases.map((item, index) => <span key={item.short} className={index <= phase ? "reached" : ""}>{item.short}</span>)}</div><div className="study-control-buttons"><button onClick={() => setPhase(phase - 1)} disabled={phase === 0}>Previous</button><button className="primary" onClick={playFullStudy} disabled={playing}>{playing ? "Running study…" : "Run full path"}</button><button onClick={() => phase === 0 ? beginApproach() : setPhase(phase + 1)} disabled={phase === phases.length - 1 || (phase === 5 && selectedYear !== 2024)}>Next</button></div><EvaluationNotes concept={concept} /></section>}
  </main>;
}

export function MotionStudy(props: { concept: MotionStudyKey; initialYear?: number; initialSection?: CocktailSection }) {
  return <CocktailYearsProvider><MotionStudyContent {...props} /></CocktailYearsProvider>;
}
