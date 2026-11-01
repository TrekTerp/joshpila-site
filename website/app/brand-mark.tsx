"use client";

import { useId } from "react";

export function BrandMark() {
  const id = useId();
  const filterId = `${id}-ink`;
  const maskId = `${id}-monogram`;
  return (
    <svg className="brand-mark" viewBox="200 275 900 910" aria-hidden="true" focusable="false">
      <defs>
        <filter id={filterId} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0" />
        </filter>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="200" y="275" width="900" height="910" style={{ maskType: "luminance" }}>
          <image href="/brand/jp-monogram.png" width="1560" height="1560" filter={`url(#${filterId})`} />
        </mask>
      </defs>
      <rect x="200" y="275" width="900" height="910" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}
