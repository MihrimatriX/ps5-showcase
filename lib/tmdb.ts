/**
 * TMDB access and the mapping from a TMDB movie to the console's Project (kind "movie").
 * Shared by scripts/sync-tmdb.mjs, scripts/sync-store.mjs (Node runs this file directly) and the movie search route,
 * so only erasable TypeScript here, like lib/igdb.ts.
 * Needs TMDB_TOKEN (the API read access token from themoviedb.org/settings/api); it never reaches the browser.
 */
import { MOTIFS, PALETTES, both, firstSentence } from "./igdb.ts";
import type { L, Project } from "./types";

export async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const { TMDB_TOKEN } = process.env;
  if (!TMDB_TOKEN) throw new Error("TMDB_TOKEN missing");
  const res = await fetch(`https://api.themoviedb.org/3/${path}?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${TMDB_TOKEN}` } });
  if (!res.ok) throw new Error(`TMDB ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

type Named = { id: number; name: string };
type TmdbMovie = {
  id: number;
  title: string;
  tagline?: string;
  overview?: string;
  release_date?: string;
  runtime?: number;
  vote_average?: number;
  vote_count?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genres?: Named[];
  production_companies?: Named[];
  videos?: { results: { key: string; site: string; type: string; official?: boolean }[] };
  credits?: { cast: { name: string }[]; crew: { name: string; job: string }[] };
  images?: { backdrops: { file_path: string }[] };
  translations?: { translations: { iso_639_1: string; data: { title?: string; overview?: string; tagline?: string } }[] };
};

/** A search or list hit: just enough to fetch the full movie. */
export type MovieHit = { id: number; title: string; release_date?: string };

// TMDB names genres in the request's language; the Turkish names come from one extra call, made once.
let genresTr: Promise<Map<number, string>> | undefined;
const turkishGenres = () =>
  (genresTr ??= tmdb<{ genres: Named[] }>("genre/movie/list", { language: "tr-TR" }).then((r) => new Map(r.genres.map((g) => [g.id, g.name]))));

const img = (path: string | null | undefined, size: string) => (path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined);

// ponytail: TMDB has no prices either, so these follow digital release tiers by age. Illustrative only; the store is a demo.
function price(date: Date | null) {
  if (!date) return 19.99;
  const years = (Date.now() - date.getTime()) / 3.15e10;
  return years < 1 ? 19.99 : years < 3 ? 14.99 : 9.99;
}

function runtime(min: number): L {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return { tr: h ? `${h} sa ${m} dk` : `${m} dk`, en: h ? `${h}h ${m}m` : `${m}m` };
}

/** One movie with everything its page shows (trailer, cast and crew, backdrops, Turkish texts) as a console title. */
export async function movie(id: number, owned = false): Promise<Project> {
  const [m, trGenres] = await Promise.all([
    tmdb<TmdbMovie>(`movie/${id}`, { language: "en-US", append_to_response: "videos,credits,images,translations", include_image_language: "en,null" }),
    turkishGenres(),
  ]);
  const tr = m.translations?.translations.find((x) => x.iso_639_1 === "tr")?.data ?? {};
  const overview: L = { en: (m.overview ?? "").trim(), tr: (tr.overview || m.overview || "").trim() };
  const date = m.release_date ? new Date(m.release_date) : null;
  const genres = m.genres ?? [];
  const directors = (m.credits?.crew ?? []).filter((c) => c.job === "Director").map((c) => c.name).join(", ");
  const studio = m.production_companies?.[0]?.name;
  const yt = (m.videos?.results ?? []).filter((v) => v.site === "YouTube");
  // An official trailer, else any trailer, else a teaser.
  const trailer = (yt.find((v) => v.type === "Trailer" && v.official) ?? yt.find((v) => v.type === "Trailer") ?? yt.find((v) => v.type === "Teaser"))?.key;
  const rating = m.vote_count ? Math.round((m.vote_average ?? 0) * 10) : undefined;
  // The first backdrop is the hero; the next ones are the gallery.
  const shots = (m.images?.backdrops ?? []).slice(1, 7).map((b) => img(b.file_path, "w1280")!);
  // "Activities" cards: the facts a store page would show.
  const facts: [L, L][] = [];
  if (date) facts.push([{ tr: "Vizyon tarihi", en: "Release date" }, { tr: date.toLocaleDateString("tr-TR", { dateStyle: "long" }), en: date.toLocaleDateString("en-US", { dateStyle: "long" }) }]);
  if (m.runtime) facts.push([{ tr: "Süre", en: "Runtime" }, runtime(m.runtime)]);
  if (studio) facts.push([{ tr: "Stüdyo", en: "Studio" }, both(studio)]);
  if (rating) facts.push([{ tr: "Puan", en: "Rating" }, both(`${rating} / 100`)]);
  const two = (names: (g: Named) => string) => genres.slice(0, 2).map(names).join(" · ");
  return {
    id: `movie-${m.id}`,
    kind: "movie",
    title: m.title,
    tagline: { en: m.tagline || firstSentence(overview.en), tr: tr.tagline || firstSentence(overview.tr) },
    genre: { en: two((g) => g.name) || "Movie", tr: two((g) => trGenres.get(g.id) ?? g.name) || "Film" },
    year: date?.getFullYear() ?? new Date().getFullYear(),
    status: date && date > new Date() ? "dev" : "live",
    palette: PALETTES[m.id % PALETTES.length],
    motif: MOTIFS[m.id % MOTIFS.length],
    logo: { font: "sans" },
    description: overview,
    features: facts.map(([title, body]) => ({ title, body })),
    // Tags: the leading cast (the page labels them "Cast" for movies).
    tech: (m.credits?.cast ?? []).slice(0, 6).map((c) => c.name),
    role: both(directors || "—"),
    hours: 0,
    trophies: [],
    links: {
      demo: trailer ? `https://www.youtube.com/watch?v=${trailer}` : undefined,
      repo: `https://www.themoviedb.org/movie/${m.id}`,
    },
    cover: img(m.poster_path, "w500"),
    hero: img(m.backdrop_path, "w1280"),
    screenshots: shots.length ? shots : undefined,
    trailer,
    rating,
    price: price(date),
    owned: owned ? undefined : false,
  };
}

/** Full movies for a list of hits, a few requests at a time to stay under TMDB's rate limit (~40/second). */
export async function movies(hits: MovieHit[], owned = false): Promise<Project[]> {
  const out: Project[] = [];
  for (let i = 0; i < hits.length; i += 10) out.push(...(await Promise.all(hits.slice(i, i + 10).map((h) => movie(h.id, owned)))));
  return out;
}

/** Title search, best matches first (TMDB's own ranking). */
export const searchMovies = (q: string, limit = 10) =>
  tmdb<{ results: MovieHit[] }>("search/movie", { query: q, include_adult: "false", language: "en-US" }).then((r) => r.results.slice(0, limit));
