/**
 * Movie store search beyond the synced catalog, from TMDB. Runs on the server so the TMDB token never reaches the
 * browser. GET /api/movies?q=inception
 */
import { movies, searchMovies } from "@/lib/tmdb";

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return Response.json({ movies: [] });
  try {
    return Response.json({ movies: await movies(await searchMovies(q)) }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (e) {
    console.error("movie search:", e);
    return Response.json({ movies: [], error: "unavailable" }, { status: 502 });
  }
}
