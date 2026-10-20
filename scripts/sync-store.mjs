// The stores for hosts without a server (GitHub Pages): snapshots of IGDB's PS5/PS4 catalog (preview/store.json) and
// TMDB's movies (preview/movies.json), searched in the browser instead of through /api/games and /api/movies.
// Same credentials as sync:games and sync:movies (.env.local or the environment):
//   npm run sync:store
import { writeFileSync } from "node:fs";
import { FIELDS, PS4, PS5, igdb, toProject } from "../lib/igdb.ts";
import { movies, tmdb } from "../lib/tmdb.ts";

try {
  process.loadEnvFile(".env.local");
} catch {}

// ponytail: the most-rated titles only, to keep each file small; raise MAX if searches miss titles people look for.
const MAX = 3000;
const save = (file, list) => {
  const json = JSON.stringify(list);
  writeFileSync(`preview/${file}`, json);
  console.log(`Wrote ${list.length} titles to preview/${file} · ${(json.length / 1024).toFixed(0)} KB`);
};
let missing = false;

if (process.env.CLIENT_ID && process.env.CLIENT_SECRET) {
  // Same filter as the live search route: main games, expansions, remakes, remasters, expanded games and ports.
  const where = `where platforms = (${PS5},${PS4}) & version_parent = null & game_type = (0,4,8,9,10,11) & cover != null`;
  const found = [];
  while (found.length < MAX) {
    // IGDB pages at 500; one request at a time stays under its 4 requests/second.
    const page = await igdb("games", `fields ${FIELDS}; ${where}; sort total_rating_count desc; limit 500; offset ${found.length};`);
    found.push(...page);
    if (page.length < 500) break;
  }
  // Most-rated first: the browser search keeps this order, so popular games win ties.
  save("store.json", found.slice(0, MAX).map((g, i) => toProject(g, i, false)));
} else {
  console.error("CLIENT_ID / CLIENT_SECRET missing: no game store snapshot (add them to .env.local or the repo's Actions secrets)");
  missing = true;
}

if (process.env.TMDB_TOKEN) {
  // The most-voted movies, 20 to a page; each is then fetched in full (trailer, cast, Turkish texts).
  const hits = [];
  for (let page = 1; hits.length < MAX; page++) {
    const r = await tmdb("discover/movie", { sort_by: "vote_count.desc", include_adult: "false", page: String(page) });
    hits.push(...r.results);
    if (page >= r.total_pages) break;
  }
  save("movies.json", await movies(hits.slice(0, MAX)));
} else {
  console.error("TMDB_TOKEN missing: no movie store snapshot (add it to .env.local or the repo's Actions secrets)");
  missing = true;
}

if (missing) process.exit(1);
