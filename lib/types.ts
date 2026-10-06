export type Lang = "tr" | "en";
/** A string in both languages. */
export type L = Record<Lang, string>;

/** Procedural cover art styles (see components/CoverArt.tsx). */
export type Motif = "orbit" | "grid" | "waves" | "shards" | "rings" | "dunes" | "city" | "circuit";

export type LogoFont = "orbitron" | "bebas" | "righteous" | "playfair" | "space" | "sans";

export type Tier = "bronze" | "silver" | "gold" | "platinum";

export interface Logo {
  font: LogoFont;
  /** Uppercase + wide tracking, like most game logos. */
  caps?: boolean;
  /** Two colors for a gradient fill; omit for white. */
  gradient?: [string, string];
}

export interface ProjectTrophy {
  name: L;
  detail: L;
  tier: Tier;
  earned: boolean;
}

export interface Project {
  id: string;
  title: string;
  tagline: L;
  genre: L;
  year: number;
  status: "live" | "dev" | "archived";
  /** Background, mid tone, accent. */
  palette: [string, string, string];
  motif: Motif;
  logo: Logo;
  description: L;
  /** "Activities" cards: the project's key features. */
  features: { title: L; body: L }[];
  tech: string[];
  role: L;
  /** Hours spent building it, shown as play time. */
  hours: number;
  trophies: ProjectTrophy[];
  /** demo: trailer or live demo, repo: store page or source code. */
  links: { demo?: string; repo?: string };
  /** Optional real images (put files in public/ and use "/projects/x.jpg"). Generated art is used when missing. */
  cover?: string;
  hero?: string;
  screenshots?: string[];
  /** true while the entry is placeholder content. */
  sample?: boolean;
  /** YouTube video id of the trailer that plays behind the key art. */
  trailer?: string;
  /** Critic + user score, 0..100. */
  rating?: number;
  /** Store price in USD; games without one are not for sale. */
  price?: number;
  /** false for store-only games the visitor hasn't bought yet. Missing means owned. */
  owned?: boolean;
}

/** A public GitHub repository, shown on the recruiter's profile. */
export interface Repo {
  name: string;
  description: string;
  url: string;
  homepage?: string;
  language?: string;
  stars: number;
  topics: string[];
  pushedAt: string;
}

export interface MediaItem {
  id: string;
  kind: "post" | "tutorial" | "video" | "talk";
  title: L;
  summary: L;
  date: string;
  minutes: number;
  url: string;
  palette: [string, string, string];
  motif: Motif;
  image?: string;
  sample?: boolean;
}

export interface Achievement {
  id: string;
  kind: "certificate" | "award" | "milestone";
  name: L;
  issuer: string;
  date: string;
  tier: Tier;
  detail: L;
  url?: string;
  sample?: boolean;
}

export interface Social {
  id: "github" | "linkedin" | "instagram" | "mail" | "x" | "blog" | "cv";
  label: string;
  handle: string;
  url: string;
  sample?: boolean;
}

export interface Profile {
  name: string;
  onlineId: string;
  title: L;
  location: L;
  about: L;
  /** Years of experience, shown as the profile level. Leave out to hide the level. */
  level?: number;
  /** Progress to the next level, 0..100. */
  levelProgress?: number;
  experience: { company: string; role: L; period: string; summary: L }[];
  /** Technologies by area, shown as tags. */
  skills: { group: L; items: string[] }[];
  education: { school: string; degree: L; period: string }[];
  languages: { name: L; level: L }[];
  /** Profile photo URL; the initial is shown without one. */
  avatar?: string;
  cvUrl?: string;
  sample?: boolean;
}
