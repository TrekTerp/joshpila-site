export type Artifact = {
  id: string;
  short: string;
  title: string;
  eyebrow: string;
  description: string;
  status: string;
  accent: string;
  routes: string[];
  questions: string[];
  href?: string;
};

export const artifacts: Artifact[] = [
  {
    id: "sky",
    short: "Sky",
    title: "The sky, one good night at a time",
    eyebrow: "Astronomy & astrophotography",
    description: "Photographs from nights at the telescope, and SkyWatcher to plan the next one.",
    status: "SkyWatcher is live · photos coming soon",
    accent: "#81d4ff",
    routes: ["Explore my photos", "Open SkyWatcher"],
    questions: ["beautiful", "learn"],
  },
  {
    id: "campaigns",
    short: "D&D Campaigns",
    title: "Dragon’s Bane",
    eyebrow: "Campaigns & tools for the table",
    description: "Our Greyhawk campaign, from Saltmarsh to the Ake River Valley. The Codex, Bastions, and dice roller serve the table; separate workbenches help me prepare treasures, settlements, and dangerous places.",
    status: "Campaign hub and tools are live",
    accent: "#eb9b67",
    routes: ["Open Dragon’s Bane"],
    questions: ["world", "story"],
    href: "https://www.joshpila.com/dnd/",
  },
  {
    id: "patterns",
    short: "Magic Squares",
    title: "A better home for magic squares",
    eyebrow: "Interactive mathematics",
    description: "A modern, visual place to play with magic squares, see how they are built, and follow the patterns as far into the mathematics as you want.",
    status: "Early build; bigger plans",
    accent: "#f0c866",
    routes: ["See a square", "Build and test one", "Follow the mathematics"],
    questions: ["pattern", "learn"],
  },
  {
    id: "writing",
    short: "Writing",
    title: "Ideas from the work",
    eyebrow: "Professional musings, insights & presentations",
    description: "Thoughts on transportation safety, active transportation, project management, and people leadership, plus presentations and occasional essays when I have something useful to share.",
    status: "Built from practice, added over time",
    accent: "#9ec6ad",
    routes: ["Read the latest musing", "Browse presentations", "Explore professional insights"],
    questions: ["useful", "learn"],
  },
  {
    id: "cocktails",
    short: "Cooking & Cocktails",
    title: "Things worth making again",
    eyebrow: "Cooking, cocktails & collected notes",
    description: "Favorite recipes, cookbooks, techniques, photographs, and five years of Advent cocktails, with credit and links back to the people and sources that inspired them.",
    status: "Five Advents and many dinners",
    accent: "#dd7690",
    routes: ["Browse food and drinks", "Explore five Advents", "Open the cookbook shelf"],
    questions: ["beautiful", "story"],
  },
  {
    id: "workshop",
    short: "Workshop",
    title: "Things I made because I wanted them to exist",
    eyebrow: "Tools, prototypes & experiments",
    description: "Small apps, useful tools, odd experiments, and whichever non-work project I currently cannot leave alone. Some are finished; some are here because I want feedback.",
    status: "Updated when something is worth showing",
    accent: "#b38cf4",
    routes: ["Try the current build", "Browse the project shelf", "See what is in progress"],
    questions: ["useful", "pattern"],
  },
  {
    id: "games",
    short: "Games",
    title: "Retro Disk Box",
    eyebrow: "Old favorites, new possibilities",
    description: "The games I grew up with, rebuilt so I can play them again. Start with the classics, then try new looks, modes, and ideas layered on top.",
    status: "Open the box and pick a game",
    accent: "#9bdf83",
    routes: ["Open Retro Disk Box"],
    questions: ["useful", "pattern"],
    href: "https://www.joshpila.com/games/",
  },
];

export function artifactHref(artifact: Artifact) {
  return artifact.href ?? (artifact.id === "cocktails" ? "/study/cabinet" : `/artifact/${artifact.id}`);
}

export const originArtifact: Artifact = {
  id: "origin",
  short: "Origin",
  title: "How all of this ended up in one place",
  eyebrow: "About me",
  description: "I am an engineer and project manager with a habit of taking hobbies past the reasonable stopping point. This is where astronomy, D&D, mathematics, cooking, cocktails, writing, and building things start to look like the same impulse.",
  status: "The connective tissue",
  accent: "#d9a45c",
  routes: ["Meet Josh"],
  questions: ["maker"],
};

export const artifactPages = [...artifacts, originArtifact];
