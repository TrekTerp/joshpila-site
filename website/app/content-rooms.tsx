import Link from "next/link";
import type { ReactNode } from "react";
import { artifacts, artifactHref } from "./data";
import copy from "./origin-copy.json";
import { RouteArrow } from "./route-arrow";

function InlineCopy({ text }: { text: string }) {
  return text.split(/(\*[^*]+\*)/g).map((part, index) => part.startsWith("*")
    ? <em key={index}>{part.slice(1, -1)}</em> : part);
}

function SunStudy() {
  return <svg className="origin-sun-study" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="origin-sun-fill" cx="38%" cy="34%" r="70%">
        <stop offset="0" stopColor="#fff0bd" /><stop offset=".6" stopColor="#e7b869" /><stop offset="1" stopColor="#a15d33" />
      </radialGradient>
    </defs>
    <g fill="none" stroke="currentColor">
      <circle cx="120" cy="120" r="106" opacity=".22" />
      <circle cx="120" cy="120" r="88" opacity=".4" />
      <circle cx="120" cy="120" r="65" opacity=".32" />
      {Array.from({ length: 48 }, (_, i) => <path key={i} d={`M 120 ${i % 4 ? 19 : 14} V 25`} transform={`rotate(${i * 7.5} 120 120)`} opacity={i % 4 ? .25 : .65} />)}
      <path d="M120 0v40M120 200v40M0 120h40M200 120h40" opacity=".4" />
      <path d="M120 48v12M120 180v12M48 120h12M180 120h12" opacity=".5" />
    </g>
    <circle cx="120" cy="120" r="39" fill="url(#origin-sun-fill)" />
    <circle cx="120" cy="120" r="44" fill="none" stroke="currentColor" opacity=".5" />
    <circle cx="192" cy="70" r="5" fill="#f6f1e5" stroke="currentColor" />
  </svg>;
}

export function OriginArticle({ returnLink }: { returnLink: ReactNode }) {
  return <article className="origin-room" id="room-content" tabIndex={-1}>
    <div className="room-return-top">{returnLink}</div>
    <header className="origin-title">
      <div><h1>{copy.title}</h1><p><em>{copy.subtitle}</em></p></div>
      <SunStudy />
    </header>
    <div className="origin-copy">
      {copy.sections.map((section, i) => <section className={`origin-section ${i === 0 ? "origin-opening" : ""}`} key={section.id} aria-labelledby={section.id}>
        <h2 id={section.id}>{section.title}</h2>
        <div className="origin-prose">{section.paragraphs.map((paragraph, index) => <p key={index}><InlineCopy text={paragraph} /></p>)}</div>
      </section>)}
      <section className="origin-section origin-index" aria-labelledby="where-next">
        <h2 id="where-next">{copy.indexTitle}</h2>
        <ul>{copy.destinations.map((destination) => {
          const item = artifacts.find((artifact) => artifact.id === destination.id)!;
          return <li key={item.id} style={{ "--world-accent": item.accent } as React.CSSProperties}>
            <Link href={artifactHref(item)}>{destination.label}<RouteArrow /></Link>
            <span className="origin-index-description"><span className="origin-index-colon">: </span>{destination.description}</span>
          </li>;
        })}</ul>
      </section>
      <footer className="origin-colophon">
        <p>Contact: <span className="contact-tbd">[CONTACT ROUTE TBD]</span> <span aria-hidden="true">·</span> Elsewhere: <a href="https://www.instagram.com/joshpila/">Instagram</a></p>
      </footer>
    </div>
    <div className="room-return-bottom">{returnLink}</div>
  </article>;
}

export { PatternsArticle } from "./patterns-room";
