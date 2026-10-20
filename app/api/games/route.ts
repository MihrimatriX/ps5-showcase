/**
 * Store search beyond the synced catalog: PS5 and PS4 games from IGDB, as console games.
 * Runs on the server so the Twitch credentials never reach the browser. GET /api/games?q=witcher
 */
import { FIELDS, PS4, PS5, igdb, searchTerm, toProject } from "@/lib/igdb";

export async function GET(request: Request) {
  const q = searchTerm(new URL(request.url).searchParams.get("q") ?? "");
  if (q.length < 2) return Response.json({ games: [] });
  try {
    // Main games plus the other things a store sells: standalone expansions, remakes, remasters, expanded games and ports.
    const hits = await igdb("games", `fields ${FIELDS}; search "${q}"; where platforms = (${PS5},${PS4}) & version_parent = null & game_type = (0,4,8,9,10,11) & cover != null; limit 20;`);
    return Response.json({ games: hits.map((g, i) => toProject(g, i, false)) }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (e) {
    console.error("store search:", e);
    return Response.json({ games: [], error: "unavailable" }, { status: 502 });
  }
}
