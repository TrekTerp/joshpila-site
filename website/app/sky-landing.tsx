import Link from "next/link";
import "./sky-landing.css";

export function AstronomyLanding() {
  return <article className="astronomy-landing">
    <div className="astronomy-intro"><p className="astronomy-kicker">Astronomy & astrophotography</p><h1>Astronomy</h1><p>My photographs and a tool for planning what to observe next.</p></div>
    <div className="astronomy-destinations">
      <Link className="astronomy-card astronomy-photos" href="/astronomy/">
        <div className="astronomy-card-art photo-orbits" aria-hidden="true"><span /><i /></div>
        <div className="astronomy-card-copy"><p className="astronomy-kicker">Through the telescope</p><h2>My photos <span aria-hidden="true">↗</span></h2><p>The Moon, planets, star clusters, and nebulae.</p><span className="astronomy-status">Browse 90 images →</span></div>
      </Link>
      <a className="astronomy-card astronomy-planner" href="/skywatcher/">
        <div className="astronomy-card-art planner-orbits" aria-hidden="true"><span /><i /></div>
        <div className="astronomy-card-copy"><p className="astronomy-kicker">Observing planner</p><h2>SkyWatcher <span aria-hidden="true">↗</span></h2><p>Check what’s visible, including Jupiter’s moons, Saturn’s rings, and deep-sky targets.</p><span className="astronomy-action">Open SkyWatcher <span aria-hidden="true">→</span></span></div>
      </a>
    </div>
    <Link className="astronomy-return" href="/?selected=sky">← Return to Orrery</Link>
  </article>;
}
