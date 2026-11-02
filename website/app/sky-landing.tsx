import Link from "next/link";
import "./sky-landing.css";

export function AstronomyLanding() {
  return <article className="astronomy-landing">
    <div className="astronomy-intro"><p className="astronomy-kicker">Astronomy & astrophotography</p><h1>The sky, one good<br />night at a time.</h1><p>Some nights are for finding something new. Some are for trying to bring a little of it home.</p></div>
    <div className="astronomy-destinations">
      <Link className="astronomy-card astronomy-photos" href="/astronomy/">
        <div className="astronomy-card-art photo-orbits" aria-hidden="true"><span /><i /></div>
        <div className="astronomy-card-copy"><p className="astronomy-kicker">Through the telescope</p><h2>My photos <span aria-hidden="true">↗</span></h2><p>Photographs of the Moon, planets, and the things that make a late night worthwhile.</p><span className="astronomy-status">Browse 90 images →</span></div>
      </Link>
      <a className="astronomy-card astronomy-planner" href="/skywatcher/">
        <div className="astronomy-card-art planner-orbits" aria-hidden="true"><span /><i /></div>
        <div className="astronomy-card-copy"><p className="astronomy-kicker">Before heading outside</p><h2>SkyWatcher <span aria-hidden="true">↗</span></h2><p>Plan a night at the telescope. Explore visibility, Jupiter’s moons, Saturn’s rings, and deep-sky targets.</p><span className="astronomy-action">Open SkyWatcher <span aria-hidden="true">→</span></span></div>
      </a>
    </div>
    <Link className="astronomy-return" href="/?selected=sky">← Return to Orrery</Link>
  </article>;
}
