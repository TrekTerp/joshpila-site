import type { Metadata } from "next";

export function sectionMetadata(section: string, title: string): Metadata {
  return {
    title: `${title} · Josh Pila`,
    icons: {
      icon: [
        { url: `/icons/${section}-32.png`, type: "image/png", sizes: "32x32" },
        { url: `/icons/${section}.svg`, type: "image/svg+xml", sizes: "any" },
      ],
      shortcut: `/icons/${section}-32.png`,
      apple: { url: `/icons/${section}-180.png`, sizes: "180x180" },
    },
  };
}
