// The store for hosts without a server (GitHub Pages): a snapshot of IGDB's PS5/PS4 catalog in preview/store.json,
// searched in the browser instead of through /api/games. Same credentials as sync:games (.env.local or the environment):
//   npm run sync:store
import { writeFileSync } from "node:fs";
import { FIELDS, PS4, PS5, igdb, toProject } from "../lib/igdb.ts";

try {
  process.loadEnvFile(".env.local");
} catch {}
if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
  console.error("CLIENT_ID / CLIENT_SECRET missing: add them to .env.local (or the repo's Actions secrets)");
  process.exit(1);
}

// ponytail: the most-rated games only, to keep the file small; raise MAX if searches miss games people look for.
const MAX = 3000;
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
const json = JSON.stringify(found.slice(0, MAX).map((g, i) => toProject(g, i, false)));
writeFileSync("preview/store.json", json);
console.log(`Wrote ${Math.min(found.length, MAX)} games to preview/store.json · ${(json.length / 1024).toFixed(0)} KB`);
