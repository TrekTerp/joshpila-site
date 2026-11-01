"use client";

/* eslint-disable @next/next/no-img-element -- Registered 2.5D frames must share their exact source coordinate system. */

import { useCallback, useEffect, useRef, useState, useId, type RefObject } from "react";
import { glassTextures, GLASS_SLOT, GLASS_START, GLASSES_PER_SHELF } from "./cabinet-years";
import { useCocktailYears } from "./cocktail-years-context";
import { useCabinetTransition, type CabinetArtLayout } from "./cabinet-transition";

type CabinetArtSceneProps = {
  openSide: CabinetDoorSide | null;
  workspaceOpen: boolean;
  yearOffset: number;
  quiet: boolean;
  overlayRef: RefObject<HTMLDivElement | null>;
  activeTarget: string | null;
  onCabinetReady: (ready: boolean) => void;
};

export type CabinetDoorSide = "cooking" | "cocktails";

export const cabinetDoorRegistry = {
  cooking: { hinge: "left", openable: false, artwork: "reserved" },
  cocktails: { hinge: "right", openable: true, artwork: "registered-r3" },
} as const satisfies Record<CabinetDoorSide, { hinge: "left" | "right"; openable: boolean; artwork: string }>;

const ART_WIDTH = 1536;
const ART_HEIGHT = 1024;
type LocalLayout = CabinetArtLayout & {
  width: number;
  height: number;
};

function fitArtwork(width: number, height: number, workspaceOpen: boolean): LocalLayout {
  const compact = width < 900;
  const padding = compact ? 18 : 28;
  const availableWidth = !compact && workspaceOpen ? width * .56 : width;
  const bounds = { left: 270, top: 100, right: 1120, bottom: 808 };
  const visibleWidth = bounds.right - bounds.left;
  const visibleHeight = bounds.bottom - bounds.top;
  const scale = Math.min(
    2,
    Math.max(0.12, (availableWidth - padding * 2) / visibleWidth),
    Math.max(0.12, (height - padding * 2) / visibleHeight),
  );
  return {
    left: (availableWidth - visibleWidth * scale) / 2 - bounds.left * scale,
    top: (height - visibleHeight * scale) / 2 - bounds.top * scale,
    scale,
    width,
    height,
  };
}

export function CabinetArtScene({ openSide, workspaceOpen, yearOffset, quiet, overlayRef, activeTarget, onCabinetReady }: CabinetArtSceneProps) {
  const adventYears = useCocktailYears();
  const mountRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const doorRef = useRef<HTMLDivElement>(null);
  const closedFrameRef = useRef<HTMLImageElement>(null);
  const clipId = useId().replaceAll(":", "");
  const animationFrame = useRef(0);
  const progress = useRef(0);
  const ready = useRef(false);
  const [assetsState, setAssetsState] = useState<"loading" | "ready" | "error">("loading");
  const [layout, setLayout] = useState<LocalLayout>(() => ({ left: 0, top: 0, scale: 1, width: 1, height: 1 }));
  const currentLayout = useRef(layout);
  const { reportDestinationLayout } = useCabinetTransition();

  const applyProgress = useCallback((value: number) => {
    const bounded = Math.max(0, Math.min(1, value));
    progress.current = bounded;
    if (doorRef.current) doorRef.current.style.transform = `rotateY(${bounded * 120}deg)`;
    // At rest use the complete registered frame, avoiding seams between separate alpha crops.
    if (closedFrameRef.current) closedFrameRef.current.style.visibility = bounded === 0 ? 'visible' : 'hidden';
    const nextReady = bounded >= 0.985;
    if (nextReady !== ready.current) {
      ready.current = nextReady;
      onCabinetReady(nextReady);
    }
  }, [onCabinetReady]);

  useEffect(() => {
    let cancelled = false;
    const sources = ["/cabinet-r3/cabinet-state-000.png", "/cabinet-r3/cabinet-state-120.png"];
    void Promise.all(sources.map((source) => {
      const image = new Image();
      image.src = source;
      return image.decode();
    })).then(() => {
      if (!cancelled) setAssetsState("ready");
    }).catch(() => {
      if (!cancelled) setAssetsState("error");
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      const target = fitArtwork(Math.max(1, mount.clientWidth), Math.max(1, mount.clientHeight), workspaceOpen);
      const from = currentLayout.current;
      if (from.width <= 1 || quiet || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        currentLayout.current = target;
        setLayout(target);
        return;
      }
      const started = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - started) / 420);
        const eased = t * t * (3 - 2 * t);
        const next = { ...target, left: from.left + (target.left - from.left) * eased, top: from.top + (target.top - from.top) * eased, scale: from.scale + (target.scale - from.scale) * eased };
        currentLayout.current = next;
        setLayout(next);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const observer = new ResizeObserver(update);
    observer.observe(mount);
    update();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [workspaceOpen, quiet]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const point = (name: string, x: number, y: number) => {
      overlay.style.setProperty(`--anchor-${name}-x`, `${layout.left + x * layout.scale}px`);
      overlay.style.setProperty(`--anchor-${name}-y`, `${layout.top + y * layout.scale}px`);
    };
    point("cooking", 475, 405);
    point("cocktails", 790, 405);
    // Project the same leaf silhouette as the animated CSS door at its settled 120° pose.
    const doorPoints = Array.from({length:25},(_,i)=>{
      const theta=-Math.PI/2+i*Math.PI/24;
      const x=627+329*Math.cos(theta), y=456+329*Math.sin(theta);
      const dx=x-944, depth=-Math.sin(2*Math.PI/3)*dx;
      const perspective=6000/(6000-depth);
      return {x:944+Math.cos(2*Math.PI/3)*dx*perspective,y:456+(y-456)*perspective};
    });
    const left=Math.min(...doorPoints.map(p=>p.x)),right=Math.max(...doorPoints.map(p=>p.x));
    const top=Math.min(...doorPoints.map(p=>p.y)),bottom=Math.max(...doorPoints.map(p=>p.y));
    overlay.style.setProperty('--door-close-left',`${layout.left+left*layout.scale}px`);
    overlay.style.setProperty('--door-close-top',`${layout.top+top*layout.scale}px`);
    overlay.style.setProperty('--door-close-width',`${(right-left)*layout.scale}px`);
    overlay.style.setProperty('--door-close-height',`${(bottom-top)*layout.scale}px`);
    overlay.style.setProperty('--door-close-shape',`polygon(${doorPoints.map(p=>`${100*(p.x-left)/(right-left)}% ${100*(p.y-top)/(bottom-top)}%`).join(',')})`);
    point("backstory", 740, 190);
    point("backstory-end", 1518, 239);
    point("backstory-referent", 780, 329);
    point("advent", 782, 372);
    point("advent-end", 1518, 409);
    point("advent-referent", 780, 483);
    point("recipes", 768, 578);
    point("recipes-end", 1518, 579);
    point("recipes-referent", 780, 706);
    adventYears.forEach(({ year, left, right }) => {
      point(`glass-${year}`, (left + right) / 2 - yearOffset * GLASS_SLOT, 436);
      overlay.style.setProperty(`--glass-${year}-width`, `${(right - left) * layout.scale}px`);
    });
    overlay.style.setProperty("--glass-height", `${92 * layout.scale}px`);
    point("glass-pager", 780, 530);
    point("mobile-glass-pager", 700, 844);
    overlay.style.setProperty("--shelf-label-width", `${280 * layout.scale}px`);
    overlay.style.setProperty("--shelf-label-size", `${Math.max(11, Math.min(14, 14 * layout.scale))}px`);
    point("year-rail", 1408, 500);
    point("cabinet", 1278, 456);
    point("cabinet-center", 627, 456);
    point("workspace-backstory", 1278, 239);
    point("workspace-advent", 1278, 409);
    point("workspace-recipes", 1278, 579);
    point("workspace-panel", 1560, 456);
  }, [layout, overlayRef, yearOffset, adventYears]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || assetsState !== "ready" || layout.width <= 1 || layout.height <= 1) return;
    const bounds = mount.getBoundingClientRect();
    reportDestinationLayout({
      left: bounds.left + layout.left,
      top: bounds.top + layout.top,
      scale: layout.scale,
    });
  }, [assetsState, layout, reportDestinationLayout]);

  useEffect(() => {
    cancelAnimationFrame(animationFrame.current);
    const target = assetsState === "ready" && openSide === "cocktails" && cabinetDoorRegistry.cocktails.openable ? 1 : 0;
    const start = progress.current;
    const reduced = quiet || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || Math.abs(target - start) < 0.001) {
      applyProgress(target);
      return;
    }
    const started = performance.now();
    const duration = 650 * Math.abs(target - start);
    const animate = (now: number) => {
      const elapsed = Math.min(1, (now - started) / Math.max(1, duration));
      const eased = elapsed < 0.5 ? 2 * elapsed * elapsed : 1 - Math.pow(-2 * elapsed + 2, 2) / 2;
      applyProgress(start + (target - start) * eased);
      if (elapsed < 1) animationFrame.current = requestAnimationFrame(animate);
    };
    animationFrame.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame.current);
  }, [applyProgress, assetsState, openSide, quiet]);

  useEffect(() => () => {
    cancelAnimationFrame(animationFrame.current);
    ready.current = false;
    onCabinetReady(false);
  }, [onCabinetReady]);

  const artStyle = {
    width: `${ART_WIDTH}px`,
    height: `${ART_HEIGHT}px`,
    transform: `translate3d(${layout.left}px, ${layout.top}px, 0) scale(${layout.scale})`,
  };

  return <>
    <div className={`cabinet-art-scene ${openSide === "cocktails" ? "cabinet-art-open" : "cabinet-art-closed"} ${workspaceOpen ? "cabinet-workspace-open" : ""} ${activeTarget ? `cabinet-target-${activeTarget}` : ""}`} data-open-side={openSide ?? "none"} ref={mountRef} aria-hidden="true">
      <div className="cabinet-art-root" ref={artRef} style={artStyle}>
        <svg className="cabinet-stationary-art" viewBox="0 0 1536 1024" aria-hidden="true">
          <defs>
            <clipPath id={`${clipId}-glass-shelf`}><rect x="640" y="390" width="285" height="86" /></clipPath>
            <linearGradient id={`${clipId}-glass-wall`} x1="630" x2="925" y1="0" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#0e0300" /><stop offset=".25" stopColor="#120501" /><stop offset=".55" stopColor="#140500" /><stop offset=".88" stopColor="#1d0900" /><stop offset="1" stopColor="#0c0400" /></linearGradient>
            <linearGradient id={`${clipId}-wall-feather`} x1="0" x2="0" y1="390" y2="474" gradientUnits="userSpaceOnUse"><stop stopColor="black" /><stop offset=".08" stopColor="white" /><stop offset=".95" stopColor="white" /><stop offset="1" stopColor="black" /></linearGradient>
            <mask id={`${clipId}-wall-mask`}><rect x="630" y="390" width="295" height="84" fill={`url(#${clipId}-wall-feather)`} /></mask>
            {glassTextures.map((texture, index) => <clipPath key={index} id={`${clipId}-glass-${index}`}><path d={texture.outline} /></clipPath>)}
            <clipPath id={`${clipId}-body`}><circle cx="627" cy="456" r="351" /><rect x="928" y="267" width="48" height="370" /></clipPath>
            <clipPath id={`${clipId}-lower`}><rect x="627" y="548" width="351" height="260" /></clipPath>
            <clipPath id={`${clipId}-rim`}><path clipRule="evenodd" d="M627 105 A351 351 0 0 1 627 807 L627 783 A327 327 0 0 0 627 129 Z" /></clipPath>
            <clipPath id={`${clipId}-interior`}><path d="M627 127 A329 329 0 0 1 627 785 Z" /></clipPath>
            <clipPath id={`${clipId}-ingredients`}><rect x="636" y="565" width="278" height="132" /></clipPath>
          </defs>
          <image clipPath={`url(#${clipId}-body)`} href="/cabinet-r3/cabinet-state-120.png" width="1536" height="1024" />
          <g clipPath={`url(#${clipId}-interior)`}>
            <image href="/cabinet-r3/cabinet-state-120.png" width="1536" height="1024" />
            <path d="M630 390 H925 V474 H630 Z" fill={`url(#${clipId}-glass-wall)`} mask={`url(#${clipId}-wall-mask)`} />
            <g clipPath={`url(#${clipId}-glass-shelf)`}>
              <g className="cabinet-glass-strip" style={{ transform: `translateX(${-yearOffset * GLASS_SLOT}px)` }}>
                {adventYears.map(({ year }, index) => {
                  const textureIndex = ((year - 2020) % GLASSES_PER_SHELF + GLASSES_PER_SHELF) % GLASSES_PER_SHELF;
                  const texture = glassTextures[textureIndex];
                  return <svg key={year} x={GLASS_START + index * GLASS_SLOT} y="390" width={GLASS_SLOT} height="86" viewBox={`${texture.left} 390 ${texture.right - texture.left} 86`} preserveAspectRatio="xMidYMax meet">
                    <image clipPath={`url(#${clipId}-glass-${textureIndex})`} href="/cabinet-r3/cabinet-state-120.png" width="1536" height="1024" />
                  </svg>;
                })}
              </g>
            </g>
            {/* Keep the lower shelf stock inside the narrowing barrel, using the registered art. */}
            <path d="M630 548 H960 V697 H630 Z" fill="#190a03" />
            <g transform="translate(139 153) scale(.78)">
              <image clipPath={`url(#${clipId}-ingredients)`} href="/cabinet-r3/cabinet-state-120.png" width="1536" height="1024" />
            </g>
          </g>
          <g clipPath={`url(#${clipId}-lower)`}><image clipPath={`url(#${clipId}-rim)`} href="/cabinet-r3/cabinet-state-000.png" width="1536" height="1024" /></g>
        </svg>
        <div className="cabinet-hinged-door" ref={doorRef}>
          <div className="cabinet-door-face cabinet-door-outside"><img src="/cabinet-r3/cabinet-state-000.png" alt="" draggable="false" /></div>
          <div className="cabinet-door-face cabinet-door-inside">
            <svg viewBox="976 105 302 700" preserveAspectRatio="none" width="350" height="700"><image href="/cabinet-r3/cabinet-state-120.png" width="1536" height="1024" /></svg>
          </div>
        </div>
        <img className="cabinet-closed-rest" ref={closedFrameRef} src="/cabinet-r3/cabinet-state-000.png" alt="" draggable="false" />
      </div>
    </div>
    {assetsState !== "ready" && <div className={`cabinet-art-status ${assetsState === "error" ? "error" : ""}`} role={assetsState === "error" ? "alert" : "status"}>{assetsState === "error" ? "Cabinet artwork could not be loaded. Reload to try again." : "Preparing the cabinet…"}</div>}
  </>;
}
