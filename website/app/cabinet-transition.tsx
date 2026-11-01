"use client";

/* eslint-disable @next/next/no-img-element -- Registered full-canvas transition plates must remain pixel-identical. */

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export type PlanetDepartureFrame = {
  image: string;
  centerX: number;
  centerY: number;
  radius: number;
  viewportWidth: number;
  viewportHeight: number;
};

export type CabinetArtLayout = {
  left: number;
  top: number;
  scale: number;
};

type TransitionPhase = "preparing" | "approaching" | "closed" | "handoff";

type TransitionRun = {
  id: number;
  frame: PlanetDepartureFrame;
  phase: TransitionPhase;
  target: CabinetArtLayout;
  sourcePath: string;
  reduced: boolean;
};

type CabinetTransitionContextValue = {
  active: boolean;
  prepare: () => void;
  begin: (frame: PlanetDepartureFrame, options?: { quiet?: boolean }) => void;
  reportDestinationLayout: (layout: CabinetArtLayout) => void;
};

const CabinetTransitionContext = createContext<CabinetTransitionContextValue>({
  active: false,
  prepare: () => undefined,
  begin: () => undefined,
  reportDestinationLayout: () => undefined,
});

const transitionAssets = [
  "/cabinet-r3/transition-planet-k1.png",
  "/cabinet-r3/transition-construction-k2.png",
  "/cabinet-r3/transition-cabinet-closed-k3.png",
  "/cabinet-r3/cabinet-state-000.png",
  "/cabinet-r3/cabinet-state-120.png",
] as const;

const ART_WIDTH = 1536;
const ART_HEIGHT = 1024;
const BODY_CENTER_X = 627;
const BODY_CENTER_Y = 456;
const PLANET_DIAMETER = 700;
const OPEN_ENVELOPE = { left: 270, top: 100, right: 1278, bottom: 808 };

function fittedTransitionLayout(width: number, height: number): CabinetArtLayout {
  const padding = Math.max(12, Math.min(28, width * 0.025));
  const envelopeWidth = OPEN_ENVELOPE.right - OPEN_ENVELOPE.left;
  const envelopeHeight = OPEN_ENVELOPE.bottom - OPEN_ENVELOPE.top;
  const scale = Math.min(
    2,
    Math.max(0.12, (width - padding * 2) / envelopeWidth),
    Math.max(0.12, (height - padding * 2) / envelopeHeight),
  );
  return {
    left: (width - envelopeWidth * scale) / 2 - OPEN_ENVELOPE.left * scale,
    top: (height - envelopeHeight * scale) / 2 - OPEN_ENVELOPE.top * scale,
    scale,
  };
}

function sourceLayout(frame: PlanetDepartureFrame): CabinetArtLayout {
  const scale = (frame.radius * 2) / PLANET_DIAMETER;
  return {
    left: frame.centerX - BODY_CENTER_X * scale,
    top: frame.centerY - BODY_CENTER_Y * scale,
    scale,
  };
}

function transformFor(layout: CabinetArtLayout) {
  return `translate3d(${layout.left}px, ${layout.top}px, 0) scale(${layout.scale})`;
}

export function useCabinetTransition() {
  return useContext(CabinetTransitionContext);
}

export function CabinetTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [run, setRun] = useState<TransitionRun | null>(null);
  const runId = useRef(0);
  const deferredToken = useRef(0);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const preload = useRef<Promise<void> | null>(null);

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current = [];
  }, []);

  const prepareAssets = useCallback(() => {
    if (!preload.current) {
      preload.current = Promise.all(transitionAssets.map((source) => {
        const image = new Image();
        image.src = source;
        return image.decode();
      })).then(() => undefined);
    }
    return preload.current;
  }, []);

  const cancelRun = useCallback((id?: number) => {
    if (id !== undefined && runId.current !== id) return;
    clearTimers();
    deferredToken.current += 1;
    runId.current += 1;
    setRun(null);
    window.dispatchEvent(new Event("cabinet-transition-cancel"));
  }, [clearTimers]);

  const goToClosedCabinet = useCallback((id: number, token: number) => {
    if (runId.current !== id || deferredToken.current !== token) return;
    setRun((current) => current?.id === id ? { ...current, phase: "closed" } : current);
    timers.current.push(setTimeout(() => {
      if (runId.current !== id || deferredToken.current !== token) return;
      router.push("/study/cabinet?from=orrery");
    }, 120));
  }, [router]);

  const begin = useCallback((frame: PlanetDepartureFrame, options?: { quiet?: boolean }) => {
    if (run) return;
    clearTimers();
    const id = ++runId.current;
    const token = ++deferredToken.current;
    const target = fittedTransitionLayout(window.innerWidth, window.innerHeight);
    const reduced = Boolean(options?.quiet) || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setRun({ id, frame, phase: "preparing", target, sourcePath: pathname, reduced });
    void prepareAssets().then(() => {
      if (runId.current !== id || deferredToken.current !== token) return;
      if (reduced) {
        goToClosedCabinet(id, token);
        return;
      }
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (runId.current !== id || deferredToken.current !== token) return;
        setRun((current) => current?.id === id ? { ...current, phase: "approaching" } : current);
        timers.current.push(setTimeout(() => goToClosedCabinet(id, token), 1300));
      }));
    }).catch(() => {
      cancelRun(id);
    });
  }, [cancelRun, clearTimers, goToClosedCabinet, pathname, prepareAssets, run]);

  const reportDestinationLayout = useCallback((layout: CabinetArtLayout) => {
    setRun((current) => {
      if (!current || pathname !== "/study/cabinet") return current;
      return { ...current, target: layout, phase: "handoff" };
    });
  }, [pathname]);

  useEffect(() => {
    if (run?.phase !== "handoff") return;
    const id = run.id;
    const token = deferredToken.current;
    timers.current.push(setTimeout(() => {
      if (runId.current !== id || deferredToken.current !== token) return;
      setRun(null);
    }, 320));
  }, [run]);

  useEffect(() => {
    if (!run) return;
    if (pathname === run.sourcePath || pathname === "/study/cabinet") return;
    cancelRun(run.id);
  }, [cancelRun, pathname, run]);

  useEffect(() => {
    if (!run) return;
    const update = () => {
      if (pathname === "/study/cabinet") return;
      setRun((current) => current ? {
        ...current,
        target: fittedTransitionLayout(window.innerWidth, window.innerHeight),
      } : current);
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [pathname, run]);

  useEffect(() => {
    if (!run) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || run.phase === "closed" || run.phase === "handoff") return;
      cancelRun(run.id);
    };
    const cancelOnHistory = () => cancelRun(run.id);
    window.addEventListener("keydown", cancel);
    window.addEventListener("popstate", cancelOnHistory);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", cancel);
      window.removeEventListener("popstate", cancelOnHistory);
    };
  }, [cancelRun, run]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const context = useMemo<CabinetTransitionContextValue>(() => ({
    active: Boolean(run),
    prepare: () => { void prepareAssets().catch(() => undefined); },
    begin,
    reportDestinationLayout,
  }), [begin, prepareAssets, reportDestinationLayout, run]);

  const skip = () => {
    if (!run || run.phase === "closed" || run.phase === "handoff") return;
    clearTimers();
    const token = ++deferredToken.current;
    void prepareAssets().then(() => {
      if (runId.current !== run.id || deferredToken.current !== token) return;
      goToClosedCabinet(run.id, token);
    }).catch(() => cancelRun(run.id));
  };

  const start = run ? sourceLayout(run.frame) : null;
  const settled = run?.phase === "closed" || run?.phase === "handoff";
  const layout = run && start
    ? run.phase === "preparing" ? start : run.target
    : null;
  const stageStyle = layout ? {
    width: `${ART_WIDTH}px`,
    height: `${ART_HEIGHT}px`,
    transform: transformFor(layout),
  } as CSSProperties : undefined;

  return (
    <CabinetTransitionContext.Provider value={context}>
      {children}
      {run && stageStyle && <div className={`cabinet-transition-owner transition-${run.phase} ${run.reduced ? "transition-reduced" : ""}`} role="status" aria-live="polite" aria-label={settled ? "Cooking and Cocktails cabinet ready" : "Approaching Cooking and Cocktails"}>
        <div className="cabinet-transition-backdrop" aria-hidden="true" />
        <div className="cabinet-transition-art" style={stageStyle} aria-hidden="true">
          <img className="transition-live-planet" src={run.frame.image} alt="" />
          <img className="transition-k1" src="/cabinet-r3/transition-planet-k1.png" alt="" />
          <img className="transition-k2" src="/cabinet-r3/transition-construction-k2.png" alt="" />
          <span className="transition-stave-reveal" />
          <img className="transition-k3" src="/cabinet-r3/transition-cabinet-closed-k3.png" alt="" />
        </div>
        {(run.phase === "preparing" || run.phase === "approaching") && <button className="cabinet-transition-skip" type="button" onClick={skip}>Skip approach</button>}
      </div>}
    </CabinetTransitionContext.Provider>
  );
}
