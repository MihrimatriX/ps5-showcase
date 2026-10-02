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
  links: { demo?: string; repo?: string };
  /** Optional real images (put files in public/ and use "/projects/x.jpg"). Generated art is used when missing. */
  cover?: string;
  hero?: string;
  screenshots?: string[];
  /** true while the entry is placeholder content. */
  sample?: boolean;
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
  id: "github" | "linkedin" | "mail" | "x" | "blog" | "cv";
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
  /** Years of experience, shown as the profile level. */
  level: number;
  /** Progress to the next level, 0..100. */
  levelProgress: number;
  experience: { company: string; role: L; period: string; summary: L }[];
  skills: { name: string; value: number }[];
  education: { school: string; degree: L; period: string }[];
  languages: { name: L; level: L }[];
  cvUrl?: string;
  sample?: boolean;
}
