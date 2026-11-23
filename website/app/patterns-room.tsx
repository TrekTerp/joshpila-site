import type { ReactNode } from "react";
import "./patterns-room.css";

const exhibits = [
  {
    id: "chaos-lab", title: "Chaos Lab", plate: "chaos", imageSrc: "/patterns/chaos-lab/art/chaos-plate.svg",
    imageAlt: "A Sierpiński triangle emerges from 32, 256, and 2,048 random halfway jumps.",
    description: "Grow a fractal from random jumps, survey a vanishing carpet, or race three ways of estimating π.",
    action: "Open Chaos Lab", href: "/patterns/chaos-lab/",
  },
  {
    id: "magic-squares", title: "Magic squares", plate: "magic-square",
    imageAlt: "The Lo Shu square with its top row highlighted: 8 + 1 + 6 = 15.",
    description: "Arrange the numbers so every row, column, and main diagonal adds to the same sum.",
    action: "Open Magic Squares Lab", href: "/patterns/magic-squares/",
  },
  {
    id: "life-lab", title: "Conway’s Life Lab", plate: "life",
    imageAlt: "A five-cell glider moves one square down and right in four generations.",
    description: "Draw a colony and step it forward. Discover which shapes settle, oscillate, or travel.",
    action: "Open Life Lab", href: "/patterns/life/",
  },
  {
    id: "flux-chamber", title: "Flux Chamber", plate: "flux",
    imageAlt: "Four colored particle streams curve from the chamber walls toward a single sink.",
    description: "Move the jets, place a sink, and change each wall’s gravity to sculpt the particle streams.",
    action: "Open Flux Chamber", href: "/patterns/flux-chamber/",
  },
  {
    id: "kaprekar", title: "The road to 6174", plate: "kaprekar",
    imageAlt: "3524 and 5432 merge at 3087, then pass through 8352 to reach 6174.",
    description: "Trace three starting numbers through repeated subtraction and see where their paths merge.",
    action: "Explore the road to 6174", href: "/patterns/6174/",
  },
];

function MultiplicationCircle() {
  return <figure className="pattern-wheel">
    <svg className="pattern-wheel-art" viewBox="0 0 302 250" role="img" aria-label="Multiplication chords on a circle of 120 points">
      {[2, 3, 4].map(factor => <use key={factor} className={`wheel-times-${factor}`} href={`/patterns/plates/multiplication.svg#times-${factor}`} width="302" height="250" />)}
    </svg>
    <figcaption className="pattern-wheel-caption">
      <strong>Multiplication circle</strong>
      <p>Connect each of 120 points to its multiple. Wrap around at 120.</p>
      <fieldset className="pattern-factors">
        <legend>Choose a multiplier</legend>
        {[2, 3, 4].map(factor => <label key={factor}>
          <input type="radio" name="pattern-multiplier" value={factor} defaultChecked={factor === 2} />
          <span>×{factor}</span>
        </label>)}
      </fieldset>
    </figcaption>
  </figure>;
}

export function PatternsArticle({ returnLink }: { returnLink: ReactNode }) {
  return <article className="patterns-room pattern-atlas" id="room-content" tabIndex={-1}>
    <div className="room-return-top">{returnLink}</div>
    <header className="pattern-cover">
      <div className="pattern-cover-copy">
        <p className="pattern-discipline">Mathematics &amp; emergent systems</p>
        <h1>Patterns</h1>
        <p className="pattern-intro">Numbers, cells, and particles behaving suspiciously well.</p>
      </div>
      <MultiplicationCircle />
    </header>
    <section className="pattern-catalogue" aria-labelledby="pattern-labs-heading">
      <h2 id="pattern-labs-heading">Explore the labs</h2>
      <div className="pattern-shelves">
        {exhibits.map(exhibit => <section className={`pattern-exhibit exhibit-${exhibit.plate}`} key={exhibit.id} aria-labelledby={exhibit.id}>
          <img className="pattern-plate" src={exhibit.imageSrc ?? `/patterns/plates/${exhibit.plate}.svg`} alt={exhibit.imageAlt} width="480" height="164" />
          <div className="pattern-exhibit-copy">
            <h3 id={exhibit.id}>{exhibit.title}</h3>
            <p>{exhibit.description}</p>
            <a className="pattern-launch-name" href={exhibit.href}>{exhibit.action}</a>
          </div>
        </section>)}
      </div>
    </section>
    <div className="room-return-bottom">{returnLink}</div>
  </article>;
}
