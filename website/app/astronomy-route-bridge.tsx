"use client";
import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { astronomyRedirect } from "./astronomy-routing";

function RedirectListener({ fallback }: { fallback?: string }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    const redirect = () => {
      const target = astronomyRedirect(window.location.href);
      if (target) window.location.replace(target);
    };
    redirect();
    window.addEventListener("hashchange", redirect);
    return () => window.removeEventListener("hashchange", redirect);
  }, [pathname, search]);
  return fallback ? <p><a href={fallback}>Continue to astronomy</a></p> : null;
}

export function AstronomyRouteBridge({ fallback }: { fallback?: string }) {
  return <Suspense fallback={fallback ? <a href={fallback}>Continue to astronomy</a> : null}>
    <RedirectListener fallback={fallback} />
  </Suspense>;
}
