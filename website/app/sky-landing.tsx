import "./sky-landing.css";

const previews = [
  { id: "astro-811f68ddb1be30b7", title: "Lunar eclipse", date: "March 3, 2026" },
  { id: "astro-ce39a9254933ec62", title: "Orion Nebula", date: "February 12, 2026" },
  { id: "astro-19ea2ce798eb646d", title: "Orion over Alabama Hills", date: "April 8, 2026" },
];

export function AstronomyLanding() {
  return <article className="astronomy-landing">
    <section className="astronomy-hero" aria-labelledby="astronomy-heading">
      <div className="astronomy-intro">
        <p className="astronomy-kicker">Astronomy & astrophotography</p>
        <h1 id="astronomy-heading">Astronomy</h1>
        <p className="astronomy-lead">The sky, through <br />my telescope.</p>
        <p className="astronomy-description">Photographs of the Moon, planets, and deep sky—and a tool for planning the next night out.</p>
        <div className="astronomy-hero-actions">
          <a className="astronomy-primary" href="/astronomy/gallery/">View the highlights <span aria-hidden="true">↗</span></a>
          <a className="astronomy-text-link" href="/skywatcher/">Open SkyWatcher <span aria-hidden="true">→</span></a>
        </div>
        <p className="astronomy-collection-note">90 images <span aria-hidden="true">/</span> 42 observing nights</p>
      </div>
      <figure className="astronomy-feature">
        <a href="/astronomy/gallery/?photo=astro-e93b89a511d263fe&view=highlights#photo-viewer" aria-label="View Crescent Moon, 14% illuminated, May 19, 2026">
          <img src="/astronomy/display/astro-e93b89a511d263fe.webp" width="1731" height="1731" alt="A slender crescent Moon with sharply lit craters against a blue evening sky." fetchPriority="high" />
          <span className="astronomy-feature-open" aria-hidden="true">↗</span>
        </a>
        <figcaption><span>Crescent Moon <span className="astronomy-caption-detail">· 14% illuminated</span></span><time dateTime="2026-05-19">May 19, 2026</time></figcaption>
      </figure>
    </section>

    <div className="astronomy-explore">
      <section className="astronomy-preview" aria-labelledby="astronomy-preview-title">
        <div className="astronomy-section-heading"><h2 id="astronomy-preview-title">From the gallery</h2><a className="astronomy-text-link" href="/astronomy/gallery/?view=all">All 90 images <span aria-hidden="true">→</span></a></div>
        <div className="astronomy-preview-grid">{previews.map(photo => <a className="astronomy-preview-photo" href={`/astronomy/gallery/?photo=${photo.id}&view=highlights#photo-viewer`} key={photo.id}>
          <div className="astronomy-preview-image"><img src={`/astronomy/thumbnails/${photo.id}.webp`} width="640" height="640" alt={photo.title} loading="lazy" /></div>
          <h3>{photo.title}</h3><p>{photo.date}</p>
        </a>)}</div>
      </section>
      <section className="astronomy-planner" aria-labelledby="astronomy-planner-title">
        <svg className="astronomy-planner-diagram" viewBox="0 0 220 110" fill="none" aria-hidden="true">
          <ellipse cx="110" cy="56" rx="92" ry="31" transform="rotate(-18 110 56)" stroke="currentColor" opacity=".25" />
          <ellipse cx="110" cy="56" rx="59" ry="20" transform="rotate(-18 110 56)" stroke="currentColor" opacity=".4" />
          <circle cx="110" cy="56" r="9" fill="#ddbd84" />
          <circle cx="58" cy="73" r="4" fill="#a2cbdd" />
          <circle cx="191" cy="29" r="6" fill="#d2d9d2" />
          <path d="M177 34l28-10M110 1v8M110 103v6M2 56h7M211 56h7" stroke="currentColor" opacity=".5" />
        </svg>
        <p className="astronomy-kicker">Plan an observing night</p>
        <h2 id="astronomy-planner-title">SkyWatcher</h2>
        <p>Find what’s visible, from Jupiter’s moons and Saturn’s rings to deep-sky targets.</p>
        <a className="astronomy-text-link" href="/skywatcher/">Open the planner <span aria-hidden="true">↗</span></a>
      </section>
    </div>
    <footer className="astronomy-footer"><a className="astronomy-text-link" href="/?selected=sky">← Return to Orrery</a><span>Photographs © Josh Pila</span></footer>
  </article>;
}
