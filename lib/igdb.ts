/**
 * IGDB access and the mapping from an IGDB game to the console's Project.
 * Shared by scripts/sync-igdb.mjs (Node runs this file directly) and the store search route, so only
 * erasable TypeScript here: no enums or namespaces, and type-only imports.
 * Needs CLIENT_ID and CLIENT_SECRET (a Twitch app) in the environment; they never reach the browser.
 */
import type { L, Project } from "./types";

export const PS5 = 167;
/** PS4 games play on PS5 and are sold in its store. */
export const PS4 = 48;

export const FIELDS =
  "name,slug,first_release_date,summary,total_rating,themes.name,cover.image_id,artworks.image_id,artworks.width,screenshots.image_id,videos.video_id,genres.name,game_modes.name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher";

export type IgdbGame = {
  id: number;
  name: string;
  slug: string;
  first_release_date?: number;
  summary?: string;
  total_rating?: number;
  themes?: { name: string }[];
  cover?: { image_id: string };
  artworks?: { image_id: string; width?: number }[];
  screenshots?: { image_id: string }[];
  videos?: { video_id: string }[];
  genres?: { name: string }[];
  game_modes?: { name: string }[];
  involved_companies?: { company: { name: string }; developer: boolean; publisher: boolean }[];
};

let token: { value: string; until: number } | null = null;

export async function igdb(endpoint: string, query: string): Promise<IgdbGame[]> {
  const { CLIENT_ID, CLIENT_SECRET } = process.env;
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error("CLIENT_ID / CLIENT_SECRET missing");
  // App tokens last about two months; reuse one until shortly before it expires.
  if (!token || Date.now() > token.until) {
    const auth = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "client_credentials" }),
    }).then((r) => r.json());
    if (!auth.access_token) throw new Error(`Twitch auth failed: ${auth.message}`);
    token = { value: auth.access_token, until: Date.now() + (auth.expires_in - 60) * 1000 };
  }
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    headers: { "Client-ID": CLIENT_ID, Authorization: `Bearer ${token.value}` },
    body: query,
  });
  if (!res.ok) throw new Error(`IGDB ${endpoint}: ${res.status} ${await res.text()}`);
  return res.json();
}

/** A user-typed search turned into an IGDB string literal: no quotes or backslashes to break out of it. */
export const searchTerm = (q: string) => q.replace(/["\\]/g, "").trim().slice(0, 60);

// Fallback art colors for images IGDB doesn't have.
const PALETTES: Project["palette"][] = [
  ["#07060f", "#3b1d8f", "#a78bfa"],
  ["#020617", "#0b3a8a", "#38bdf8"],
  ["#14060f", "#7a1d4a", "#fb7185"],
  ["#03140d", "#0f5132", "#34d399"],
  ["#1a0d03", "#8a4b0b", "#fdba74"],
];
const MOTIFS: Project["motif"][] = ["orbit", "rings", "grid", "circuit", "dunes", "shards", "waves", "city"];

const img = (id: string | undefined, size: string) => (id ? `https://images.igdb.com/igdb/image/upload/t_${size}/${id}.jpg` : undefined);
const both = (s: string): L => ({ tr: s, en: s });
const firstSentence = (s: string) => (s.match(/^.{20,160}?[.!?](\s|$)/)?.[0] ?? s.slice(0, 140)).trim();

// ponytail: IGDB has no prices, so these follow launch-price tiers by age. Illustrative only; the store is a demo.
function price(date: Date | null) {
  if (!date) return 69.99;
  const years = (Date.now() - date.getTime()) / 3.15e10;
  return years < 1.5 ? 69.99 : years < 3 ? 49.99 : 29.99;
}

/** An IGDB game as a console game. `owned: false` puts it in the store instead of the library. */
export function toProject(g: IgdbGame, i: number, owned: boolean): Project {
  const overview = (g.summary ?? "").trim();
  const companies = (role: "developer" | "publisher") =>
    (g.involved_companies ?? [])
      .filter((c) => c[role])
      .map((c) => c.company.name)
      .join(", ");
  const date = g.first_release_date ? new Date(g.first_release_date * 1000) : null;
  const shots = (g.screenshots ?? []).slice(0, 6).map((s) => img(s.image_id, "screenshot_huge")!);
  const modes = (g.game_modes ?? []).map((m) => m.name).join(", ");
  const genres = (g.genres ?? []).map((x) => x.name);
  // "Activities" cards: IGDB has no feature list, so the facts a store page would show.
  const facts: [L, L][] = [];
  if (date) facts.push([{ tr: "Çıkış tarihi", en: "Release date" }, { tr: date.toLocaleDateString("tr-TR", { dateStyle: "long" }), en: date.toLocaleDateString("en-US", { dateStyle: "long" }) }]);
  if (companies("publisher")) facts.push([{ tr: "Yayıncı", en: "Publisher" }, both(companies("publisher"))]);
  if (modes) facts.push([{ tr: "Oyun modları", en: "Game modes" }, both(modes)]);
  if (g.total_rating) facts.push([{ tr: "Puan", en: "Rating" }, both(`${Math.round(g.total_rating)} / 100`)]);
  const trailer = g.videos?.[0]?.video_id;
  return {
    id: g.slug,
    title: g.name,
    tagline: both(firstSentence(overview)),
    genre: both(genres.slice(0, 2).join(" · ") || "Game"),
    year: date?.getFullYear() ?? new Date().getFullYear(),
    status: date && date > new Date() ? "dev" : "live",
    palette: PALETTES[i % PALETTES.length],
    motif: MOTIFS[i % MOTIFS.length],
    logo: { font: "sans" },
    description: both(overview),
    features: facts.map(([title, body]) => ({ title, body })),
    // Tags: whatever the two-genre line leaves out, plus themes ("Open world", "Stealth"), so nothing repeats.
    tech: [...genres.slice(2), ...(g.themes ?? []).map((x) => x.name)],
    role: both(companies("developer") || "—"),
    hours: 0,
    trophies: [],
    links: {
      demo: trailer ? `https://www.youtube.com/watch?v=${trailer}` : undefined,
      repo: `https://store.playstation.com/search/${encodeURIComponent(g.name)}`,
    },
    // Tiles crop the portrait box art to a square; the hero prefers wide key art over a screenshot.
    cover: img(g.cover?.image_id, "cover_big_2x"),
    // Widest artwork: some are small and turn to mush when stretched to 1080p.
    hero: img([...(g.artworks ?? [])].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.image_id, "1080p") ?? img(g.screenshots?.[0]?.image_id, "1080p"),
    screenshots: shots.length ? shots : undefined,
    trailer,
    rating: g.total_rating ? Math.round(g.total_rating) : undefined,
    price: price(date),
    owned: owned ? undefined : false,
  };
}
