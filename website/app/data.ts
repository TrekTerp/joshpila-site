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
    title: "Astronomy",
    eyebrow: "Astronomy & astrophotography",
    description: "Photographs from nights at the telescope, and SkyWatcher to plan the next one.",
    status: "Photo gallery and SkyWatcher",
    accent: "#81d4ff",
    routes: ["Explore my photos", "Open SkyWatcher"],
    questions: ["beautiful", "learn"],
  },
  {
    id: "campaigns",
    short: "D&D Campaigns",
    title: "Dragon’s Bane",
    eyebrow: "Campaigns & tools for the table",
    description: "Our Greyhawk campaign, from Saltmarsh to the Ake River Valley, with campaign notes and tools for players and the DM.",
    status: "Campaign hub and tools are live",
    accent: "#eb9b67",
    routes: ["Open Dragon’s Bane"],
    questions: ["world", "story"],
    href: "https://www.joshpila.com/dnd/",
  },
  {
    id: "patterns",
    short: "Magic Squares",
    title: "Magic squares",
    eyebrow: "Interactive mathematics",
    description: "Notes and experiments on magic squares: how to construct them and the patterns they contain.",
    status: "In progress",
    accent: "#f0c866",
    routes: ["See a square", "Build and test one", "Follow the mathematics"],
    questions: ["pattern", "learn"],
  },
  {
    id: "writing",
    short: "Writing",
    title: "Writing",
    eyebrow: "Essays & presentations",
    description: "Essays and presentations on transportation safety, active transportation, project management, and leadership.",
    status: "Articles and presentations coming soon",
    accent: "#9ec6ad",
    routes: ["Read the latest musing", "Browse presentations", "Explore professional insights"],
    questions: ["useful", "learn"],
  },
  {
    id: "cocktails",
    short: "Cooking & Cocktails",
    title: "Cooking & cocktails",
    eyebrow: "Cooking, cocktails & collected notes",
    description: "My Advent of Cocktails archive, with recipes, photographs, variations, and links to the original sources.",
    status: "Browse Advent of Cocktails",
    accent: "#dd7690",
    routes: ["Browse food and drinks", "Browse Advent of Cocktails", "Open the cookbook shelf"],
    questions: ["beautiful", "story"],
  },
  {
    id: "workshop",
    short: "Workshop",
    title: "Personal projects",
    eyebrow: "Tools, prototypes & experiments",
    description: "Apps, tools, and experiments from my personal projects.",
    status: "Projects coming soon",
    accent: "#b38cf4",
    routes: ["Try the current build", "Browse the project shelf", "See what is in progress"],
    questions: ["useful", "pattern"],
  },
  {
    id: "games",
    short: "Games",
    title: "Retro Disk Box",
    eyebrow: "Classic games",
    description: "The games I grew up with, rebuilt for the browser with new looks and modes.",
    status: "Open the box and pick a game",
    accent: "#9bdf83",
    routes: ["Open Retro Disk Box"],
    questions: ["useful", "pattern"],
    href: "https://www.joshpila.com/games/",
  },
];

export function artifactHref(artifact: Artifact) {
  return artifact.href ?? (artifact.id === "sky" ? "/astronomy/" : artifact.id === "cocktails" ? "/study/cabinet" : `/artifact/${artifact.id}`);
}

export const originArtifact: Artifact = {
  id: "origin",
  short: "Origin",
  title: "About Josh",
  eyebrow: "About me",
  description: "I’m an engineer and project manager. This site collects my astronomy photos, D&D campaigns, mathematical projects, recipes, and other hobbies.",
  status: "About this site",
  accent: "#d9a45c",
  routes: ["Meet Josh"],
  questions: ["maker"],
};

export const artifactPages = [...artifacts, originArtifact];
