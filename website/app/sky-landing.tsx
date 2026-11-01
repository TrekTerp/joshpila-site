import Link from "next/link";
import { BrandMark } from "./brand-mark";
import "./sky-landing.css";

export function AstronomyLanding() {
  return <article className="astronomy-landing">
    <div className="astronomy-intro"><p className="astronomy-kicker">Astronomy & astrophotography</p><h1>The sky, one good<br />night at a time.</h1><p>Some nights are for finding something new. Some are for trying to bring a little of it home.</p></div>
    <div className="astronomy-destinations">
      <Link className="astronomy-card astronomy-photos" href="/artifact/sky/photos/">
        <div className="astronomy-card-art photo-orbits" aria-hidden="true"><span /><i /></div>
        <div className="astronomy-card-copy"><p className="astronomy-kicker">Through the telescope</p><h2>My photos <span aria-hidden="true">↗</span></h2><p>Photographs of the Moon, planets, and the things that make a late night worthwhile.</p><span className="astronomy-status">Collection coming soon</span></div>
      </Link>
      <a className="astronomy-card astronomy-planner" href="/skywatcher/">
        <div className="astronomy-card-art planner-orbits" aria-hidden="true"><span /><i /></div>
        <div className="astronomy-card-copy"><p className="astronomy-kicker">Before heading outside</p><h2>SkyWatcher <span aria-hidden="true">↗</span></h2><p>Plan a night at the telescope. Explore visibility, Jupiter’s moons, Saturn’s rings, and deep-sky targets.</p><span className="astronomy-action">Open SkyWatcher <span aria-hidden="true">→</span></span></div>
      </a>
    </div>
    <Link className="astronomy-return" href="/?selected=sky">← Return to Orrery</Link>
  </article>;
}

export function AstronomyPhotos() {
  return <main className="artifact-page artifact-sky">
    <header><Link href="/" aria-label="Josh Pila home"><BrandMark /></Link><nav aria-label="Astronomy"><Link href="/artifact/sky/">← Astronomy</Link></nav></header>
    <article className="astronomy-landing astronomy-photo-empty"><p className="astronomy-kicker">Astrophotography</p><h1>My photos</h1><p className="astronomy-photo-note">The collection is on its way. I’m still gathering the photographs for this corner of the sky.</p><div className="astronomy-empty-orbits photo-orbits" aria-hidden="true"><span /><i /></div><Link className="astronomy-action" href="/skywatcher/">Plan a night with SkyWatcher →</Link><Link className="astronomy-return" href="/artifact/sky/">← Back to Astronomy</Link></article>
  </main>;
}
