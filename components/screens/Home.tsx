"use client";
/** The home screen: Games / Media tabs, the tile row, the hero area and the cards below it. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { achievements, media, profile, projects, socials } from "@/content/portfolio";
import { useConsole } from "@/lib/console";
import { pick, type Key } from "@/lib/i18n";
import { useLayer, useSwipe, type Action } from "@/lib/input";
import { sound } from "@/lib/sound";
import type { Achievement, MediaItem, Project, Social } from "@/lib/types";
import { CoverArt } from "../CoverArt";
import { Icon, TrophyIcon } from "../Icons";
import { AmbientBg, Avatar, Clock, Logo, ProgressRing, SampleBadge, projectProgress } from "../ui";

export type Tab = "games" | "media";
export type Zone = "top" | "tiles" | "actions" | "cards";
export type HomeState = { tab: Tab; idx: Record<Tab, number>; zone: Zone; top: number; act: number; card: number };

export const initialHome: HomeState = { tab: "games", idx: { games: 1, media: 0 }, zone: "tiles", top: 0, act: 0, card: 0 };

export type Tile =
  | { kind: "explore"; key: string }
  | { kind: "project"; key: string; p: Project }
  | { kind: "trophies"; key: string }
  | { kind: "library"; key: string }
  | { kind: "media"; key: string; m: MediaItem }
  | { kind: "social"; key: string; s: Social };

export type HomeNav =
  | { to: "game"; project: Project }
  | { to: "profile" }
  | { to: "trophies" }
  | { to: "library" }
  | { to: "link"; url: string; title: string; sample?: boolean }
  | { to: "search" }
  | { to: "settings" }
  | { to: "cc" };

const gamesTiles: Tile[] = [
  { kind: "explore", key: "explore" },
  ...projects.map((p) => ({ kind: "project" as const, key: `p-${p.id}`, p })),
  { kind: "trophies", key: "trophies" },
  { kind: "library", key: "library" },
];
const mediaTiles: Tile[] = [
  ...media.map((m) => ({ kind: "media" as const, key: `m-${m.id}`, m })),
  ...socials.map((s) => ({ kind: "social" as const, key: `s-${s.id}`, s })),
];

const socialColors: Record<Social["id"], [string, string]> = {
  github: ["#1f2937", "#0b0f16"],
  linkedin: ["#0a66c2", "#063a70"],
  mail: ["#0f766e", "#053a36"],
  x: ["#27272a", "#09090b"],
  blog: ["#7c3aed", "#2e1065"],
  cv: ["#b45309", "#451a03"],
};

const mediaIcon: Record<MediaItem["kind"], string> = { post: "book", tutorial: "cap", video: "video", talk: "mic" };

function TileFace({ tile }: { tile: Tile }) {
  const { lang } = useConsole();
  switch (tile.kind) {
    case "project":
      return (
        <>
          <CoverArt src={tile.p.cover} seed={tile.p.id} motif={tile.p.motif} palette={tile.p.palette} className="tile-art" />
          <Logo text={tile.p.title} spec={tile.p.logo} className="tile-logo" />
        </>
      );
    case "media":
      return (
        <>
          <CoverArt src={tile.m.image} seed={tile.m.id} motif={tile.m.motif} palette={tile.m.palette} className="tile-art" />
          <span className="tile-kind">
            <Icon name={mediaIcon[tile.m.kind]} />
          </span>
          <span className="tile-caption">{pick(lang, tile.m.title)}</span>
        </>
      );
    case "social": {
      const [a, b] = socialColors[tile.s.id];
      return (
        <span className="tile-app" style={{ background: `linear-gradient(145deg, ${a}, ${b})` }}>
          <Icon name={tile.s.id === "blog" ? "globe" : tile.s.id} />
        </span>
      );
    }
    case "explore":
      return (
        <span className="tile-sys sys-explore">
          <Icon name="compass" />
        </span>
      );
    case "trophies":
      return (
        <span className="tile-sys sys-trophies">
          <TrophyIcon tier="gold" />
        </span>
      );
    case "library":
      return (
        <span className="tile-sys sys-library">
          <Icon name="grid" />
        </span>
      );
  }
}

function tileLabel(tile: Tile, lang: "tr" | "en", t: (k: Key) => string) {
  switch (tile.kind) {
    case "project":
      return tile.p.title;
    case "media":
      return pick(lang, tile.m.title);
    case "social":
      return tile.s.label;
    case "explore":
      return t("explore");
    case "trophies":
      return t("trophies");
    case "library":
      return t("library");
  }
}

/** Two stacked layers so the old background fades out under the new one. */
function HeroBg({ tile }: { tile: Tile }) {
  const [layers, setLayers] = useState<Tile[]>([tile]);
  useEffect(() => {
    setLayers((prev) => (prev[prev.length - 1]?.key === tile.key ? prev : [...prev.slice(-1), tile]));
  }, [tile]);
  return (
    <div className="hero-bg" aria-hidden="true">
      {layers.map((l, i) => (
        <div key={l.key} className={`hero-layer ${i === layers.length - 1 ? "is-top" : ""}`}>
          <HeroArt tile={l} />
        </div>
      ))}
      <div className="hero-shade" />
    </div>
  );
}

function HeroArt({ tile }: { tile: Tile }) {
  switch (tile.kind) {
    case "project":
      return <CoverArt src={tile.p.hero ?? tile.p.cover} seed={tile.p.id} motif={tile.p.motif} palette={tile.p.palette} className="hero-art" animated />;
    case "media":
      return <CoverArt src={tile.m.image} seed={tile.m.id} motif={tile.m.motif} palette={tile.m.palette} className="hero-art" animated />;
    case "social": {
      const [a, b] = socialColors[tile.s.id];
      return (
        <div className="hero-app" style={{ background: `radial-gradient(120% 90% at 75% 30%, ${a}, ${b} 60%, #000)` }}>
          <Icon name={tile.s.id === "blog" ? "globe" : tile.s.id} />
        </div>
      );
    }
    default:
      return <AmbientBg />;
  }
}

type Card = { key: string; title: string; body: string; tier?: Achievement["tier"]; art?: { src?: string; seed: string; motif: Project["motif"]; palette: Project["palette"] }; icon?: string; ring?: number };

export function Home({ state, setState, onNav }: { state: HomeState; setState: (fn: (s: HomeState) => HomeState) => void; onNav: (n: HomeNav) => void }) {
  const { t, lang, award } = useConsole();
  const tiles = state.tab === "games" ? gamesTiles : mediaTiles;
  const idx = Math.min(state.idx[state.tab], tiles.length - 1);
  const tile = tiles[idx];
  const [menu, setMenu] = useState<number | null>(null);

  useEffect(() => {
    if (state.tab === "media") award("reader");
  }, [state.tab, award]);

  // Coming back from a game or page lands on the tile row, not halfway down the page.
  useEffect(() => {
    setState((s) => (s.zone === "cards" ? { ...s, zone: "tiles" } : s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- what the selected tile offers -----
  const primary = useMemo((): { label: string; nav: HomeNav } => {
    switch (tile.kind) {
      case "project":
        return { label: t("play"), nav: { to: "game", project: tile.p } };
      case "explore":
        return { label: t("view"), nav: { to: "profile" } };
      case "trophies":
        return { label: t("view"), nav: { to: "trophies" } };
      case "library":
        return { label: t("view"), nav: { to: "library" } };
      case "media":
        return { label: t("read"), nav: { to: "link", url: tile.m.url, title: pick(lang, tile.m.title), sample: tile.m.sample } };
      case "social":
        return { label: t("open"), nav: { to: "link", url: tile.s.url, title: tile.s.label, sample: tile.s.sample } };
    }
  }, [tile, t, lang]);

  const moreItems = useMemo((): { label: string; icon: string; nav: HomeNav }[] => {
    if (tile.kind !== "project") return [];
    const p = tile.p;
    const items: { label: string; icon: string; nav: HomeNav }[] = [{ label: t("details"), icon: "gamepad", nav: { to: "game", project: p } }];
    if (p.links.demo) items.push({ label: t("demo"), icon: "play", nav: { to: "link", url: p.links.demo, title: p.title, sample: p.sample } });
    if (p.links.repo) items.push({ label: t("source"), icon: "github", nav: { to: "link", url: p.links.repo, title: p.title, sample: p.sample } });
    return items;
  }, [tile, t]);

  const actions = moreItems.length ? 2 : 1;

  const cards = useMemo((): { title: string; items: Card[] } | null => {
    if (tile.kind === "project") {
      const p = tile.p;
      const items: Card[] = p.features.map((f, i) => ({
        key: `f${i}`,
        title: pick(lang, f.title),
        body: pick(lang, f.body),
        art: { src: p.screenshots?.[i], seed: p.id, motif: p.motif, palette: p.palette },
      }));
      items.push({
        key: "trophies",
        title: t("trophies"),
        body: `${p.trophies.filter((x) => x.earned).length}/${p.trophies.length} · ${p.hours} ${t("hours")}`,
        ring: projectProgress(p),
      });
      return { title: t("activities"), items };
    }
    if (tile.kind === "explore")
      return {
        title: t("profile.experience"),
        items: profile.experience.map((e, i) => ({ key: `e${i}`, title: `${pick(lang, e.role)}`, body: `${e.company} · ${e.period}`, icon: "users" })),
      };
    if (tile.kind === "trophies")
      return {
        title: t("profile.achievements"),
        items: achievements.slice(0, 4).map((a) => ({ key: a.id, title: pick(lang, a.name), body: `${a.issuer} · ${a.date}`, tier: a.tier })),
      };
    return null;
  }, [tile, lang, t]);

  const cardCount = cards?.items.length ?? 0;
  const cardNav: HomeNav = tile.kind === "explore" ? { to: "profile" } : tile.kind === "trophies" ? { to: "trophies" } : primary.nav;

  const topItems: { id: string; run: () => void }[] = [
    { id: "games", run: () => switchTab("games") },
    { id: "media", run: () => switchTab("media") },
    { id: "search", run: () => onNav({ to: "search" }) },
    { id: "settings", run: () => onNav({ to: "settings" }) },
    { id: "profile", run: () => onNav({ to: "profile" }) },
  ];

  function switchTab(tab: Tab) {
    if (tab === state.tab) return;
    sound.select();
    setState((s) => ({ ...s, tab, zone: s.zone === "top" ? "top" : "tiles", top: tab === "games" ? 0 : 1, act: 0, card: 0 }));
  }

  function select(i: number) {
    const n = Math.max(0, Math.min(tiles.length - 1, i));
    if (n === idx) return false;
    sound.move();
    setState((s) => ({ ...s, idx: { ...s.idx, [s.tab]: n }, act: 0, card: 0 }));
    return true;
  }

  function run(nav: HomeNav) {
    if (nav.to !== "game") sound.select();
    onNav(nav);
  }

  const zone = state.zone;
  const setZone = (z: Zone, extra: Partial<HomeState> = {}) => {
    sound.move();
    setState((s) => ({ ...s, zone: z, ...extra }));
  };

  useLayer(
    (a: Action) => {
      if (a === "home") return onNav({ to: "cc" });
      if (zone === "top") {
        if (a === "left" && state.top > 0) setZone("top", { top: state.top - 1 });
        else if (a === "right" && state.top < topItems.length - 1) setZone("top", { top: state.top + 1 });
        else if (a === "down" || a === "back") setZone("tiles");
        else if (a === "confirm") topItems[state.top].run();
        return;
      }
      if (zone === "tiles") {
        if (a === "left") select(idx - 1);
        else if (a === "right") select(idx + 1);
        else if (a === "up") setZone("top", { top: state.tab === "games" ? 0 : 1 });
        else if (a === "down") setZone("actions", { act: 0 });
        else if (a === "confirm") run(primary.nav);
        else if (a === "back" && state.tab === "media") switchTab("games");
        return;
      }
      if (zone === "actions") {
        if (a === "left" && state.act > 0) setZone("actions", { act: state.act - 1 });
        else if (a === "right" && state.act < actions - 1) setZone("actions", { act: state.act + 1 });
        else if (a === "up" || a === "back") setZone("tiles");
        else if (a === "down" && cardCount) setZone("cards", { card: 0 });
        else if (a === "confirm") {
          if (state.act === 0) run(primary.nav);
          else {
            sound.select();
            setMenu(0);
          }
        }
        return;
      }
      if (zone === "cards") {
        if (a === "left" && state.card > 0) setZone("cards", { card: state.card - 1 });
        else if (a === "right" && state.card < cardCount - 1) setZone("cards", { card: state.card + 1 });
        else if (a === "up") setZone("actions");
        else if (a === "back") setZone("tiles");
        else if (a === "confirm") run(cardNav);
      }
    },
    menu === null,
  );

  // Swipe: sideways moves through tiles, up/down scrolls between hero and cards.
  const swipe = useSwipe((dir, steps) => {
    if (dir === "left") select(idx + steps);
    else if (dir === "right") select(idx - steps);
    else if (dir === "up" && cardCount && zone !== "cards") setZone("cards", { card: 0 });
    else if (dir === "down" && zone === "cards") setZone("actions");
  }, 70);

  const focusClass = (z: Zone, i: number, cur: number) => (zone === z && i === cur ? "is-focus" : "");
  const hover = (fn: () => void) => ({
    onMouseEnter: () => {
      if (document.documentElement.dataset.input === "pointer") fn();
    },
  });

  let heroMeta: ReactNode = null;
  let heroTitle: ReactNode = null;
  let heroSide: ReactNode = null;
  let heroText: string | null = null;
  switch (tile.kind) {
    case "project": {
      const p = tile.p;
      heroTitle = <Logo text={p.title} spec={p.logo} className="hero-logo" />;
      heroMeta = p.sample ? <SampleBadge show /> : null;
      heroSide = (
        <div className="hero-side">
          <ProgressRing value={projectProgress(p)} size="sm" />
        </div>
      );
      break;
    }
    case "explore":
      heroTitle = (
        <div className="hero-profile">
          <Avatar name={profile.name} size="lg" ring />
          <Logo text={profile.name} spec={{ font: "space", caps: true, gradient: ["#ffffff", "#93c5fd"] }} className="hero-logo" />
        </div>
      );
      heroMeta = (
        <>
          <span>{pick(lang, profile.title)}</span>
          <span className="dot" />
          <span>{pick(lang, profile.location)}</span>
          <SampleBadge show={profile.sample} />
        </>
      );
      heroText = pick(lang, profile.about);
      break;
    case "trophies": {
      const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
      achievements.forEach((a) => counts[a.tier]++);
      projects.forEach((p) => p.trophies.forEach((x) => x.earned && counts[x.tier]++));
      heroTitle = <Logo text={t("trophies")} spec={{ font: "sans" }} className="hero-logo hero-logo-sys" />;
      heroMeta = (
        <span className="tier-counts">
          {(Object.keys(counts) as (keyof typeof counts)[]).map((k) => (
            <span key={k} className="tier-count">
              <TrophyIcon tier={k} />
              {counts[k]}
            </span>
          ))}
        </span>
      );
      heroText = t("profile.achievements");
      break;
    }
    case "library":
      heroTitle = <Logo text={t("library")} spec={{ font: "sans" }} className="hero-logo hero-logo-sys" />;
      heroMeta = <span>{projects.length} {lang === "tr" ? "oyun" : "games"}</span>;
      heroText = null;
      break;
    case "media":
      heroTitle = <Logo text={pick(lang, tile.m.title)} spec={{ font: "sans" }} className="hero-logo hero-logo-media" />;
      heroMeta = (
        <>
          <span className="badge">{t(`kind.${tile.m.kind}`)}</span>
          <span>{new Date(tile.m.date).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
          <span className="dot" />
          <span>
            {tile.m.minutes} {t("minutes")}
          </span>
          <SampleBadge show={tile.m.sample} />
        </>
      );
      heroText = pick(lang, tile.m.summary);
      break;
    case "social":
      heroTitle = <Logo text={tile.s.label} spec={{ font: "sans" }} className="hero-logo hero-logo-sys" />;
      heroMeta = (
        <>
          <span>{tile.s.handle}</span>
          <SampleBadge show={tile.s.sample} />
        </>
      );
      break;
  }

  return (
    <div className={`screen home zone-${zone} tab-${state.tab}`} {...swipe}>
      <HeroBg tile={tile} />
      <div className="home-scroll">
        <header className="topbar">
          <nav className="tabs">
            {(["games", "media"] as Tab[]).map((tab, i) => (
              <button key={tab} className={`tab ${state.tab === tab ? "is-active" : ""} ${focusClass("top", i, state.top)}`} onClick={() => switchTab(tab)} {...hover(() => setState((s) => ({ ...s, zone: "top", top: i })))}>
                {t(tab === "games" ? "tab.games" : "tab.media")}
              </button>
            ))}
          </nav>
          <div className="topbar-right">
            {(["search", "settings"] as const).map((id, k) => (
              <button key={id} className={`icon-btn ${focusClass("top", k + 2, state.top)}`} aria-label={id === "search" ? t("search.title") : t("settings.title")} onClick={() => onNav({ to: id })} {...hover(() => setState((s) => ({ ...s, zone: "top", top: k + 2 })))}>
                <Icon name={id === "search" ? "search" : "gear"} />
              </button>
            ))}
            <button className={`icon-btn avatar-btn ${focusClass("top", 4, state.top)}`} aria-label={profile.name} onClick={() => onNav({ to: "profile" })} {...hover(() => setState((s) => ({ ...s, zone: "top", top: 4 })))}>
              <Avatar name={profile.name} size="sm" />
            </button>
            <Clock />
          </div>
        </header>

        <div className="tiles-wrap">
          <div className="tiles" style={{ ["--i" as string]: Math.max(0, idx - 2) }}>
            {tiles.map((tl, i) => (
              <button
                key={tl.key}
                className={`tile tile-${tl.kind} ${i === idx ? "is-sel" : ""} ${i < idx - 2 ? "is-past" : ""} ${i === idx && zone === "tiles" ? "is-focus" : ""}`}
                data-launch-src={i === idx ? "true" : undefined}
                style={{ ["--d" as string]: `${Math.max(0, i - idx) * 40}ms` }}
                onClick={() => (i === idx ? run(primary.nav) : (select(i), setState((s) => ({ ...s, zone: "tiles" }))))}
                aria-label={tileLabel(tl, lang, t)}
              >
                <span className="tile-box">
                  <TileFace tile={tl} />
                </span>
                <span className="tile-label">{tileLabel(tl, lang, t)}</span>
              </button>
            ))}
          </div>
        </div>

        <section className="hero" key={tile.key}>
          <div className="hero-title">{heroTitle}</div>
          {heroMeta && <div className="hero-meta">{heroMeta}</div>}
          {heroText && <p className="hero-text">{heroText}</p>}
          <div className="hero-actions">
            <button className={`btn-play ${focusClass("actions", 0, state.act)}`} onClick={() => run(primary.nav)} {...hover(() => setState((s) => ({ ...s, zone: "actions", act: 0 })))}>
              {primary.label}
            </button>
            {moreItems.length > 0 && (
              <div className="more-wrap">
                <button
                  className={`btn-round ${focusClass("actions", 1, state.act)}`}
                  aria-label="…"
                  onClick={() => {
                    sound.select();
                    setMenu(menu === null ? 0 : null);
                  }}
                  {...hover(() => setState((s) => ({ ...s, zone: "actions", act: 1 })))}
                >
                  <Icon name="dots" />
                </button>
                {menu !== null && <MoreMenu items={moreItems} index={menu} setIndex={setMenu} onPick={(n) => (setMenu(null), run(n))} onClose={() => setMenu(null)} />}
              </div>
            )}
            {heroSide}
          </div>
        </section>

        {cards && (
          <section className="home-cards">
            <h3>{cards.title}</h3>
            <div className="cards-row">
              {cards.items.map((c, i) => (
                <button key={c.key} className={`card ${focusClass("cards", i, state.card)}`} onClick={() => (zone === "cards" ? run(cardNav) : setZone("cards", { card: i }))} {...hover(() => zone === "cards" && setState((s) => ({ ...s, card: i })))}>
                  {c.art && <CoverArt src={c.art.src} seed={c.art.seed} motif={c.art.motif} palette={c.art.palette} variant={i + 1} className="card-art" />}
                  {c.ring !== undefined && (
                    <span className="card-ring">
                      <ProgressRing value={c.ring} size="lg" />
                    </span>
                  )}
                  {c.tier && (
                    <span className="card-trophy">
                      <TrophyIcon tier={c.tier} />
                    </span>
                  )}
                  {c.icon && (
                    <span className="card-icon">
                      <Icon name={c.icon} />
                    </span>
                  )}
                  <span className="card-body">
                    <strong>{c.title}</strong>
                    <small>{c.body}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
      {cardCount > 0 && zone !== "cards" && (
        <button className="scroll-cue" onClick={() => setZone("cards", { card: 0 })} aria-label={cards?.title}>
          <span>{cards?.title}</span>
          <Icon name="chevronRight" />
        </button>
      )}
    </div>
  );
}

function MoreMenu({ items, index, setIndex, onPick, onClose }: { items: { label: string; icon: string; nav: HomeNav }[]; index: number; setIndex: (i: number) => void; onPick: (n: HomeNav) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayer((a) => {
    if (a === "up" && index > 0) {
      sound.move();
      setIndex(index - 1);
    } else if (a === "down" && index < items.length - 1) {
      sound.move();
      setIndex(index + 1);
    } else if (a === "confirm") onPick(items[index].nav);
    else if (a === "back" || a === "home") {
      sound.back();
      onClose();
    }
  });
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [onClose]);
  return (
    <div className="menu" ref={ref} role="menu">
      {items.map((it, i) => (
        <button key={it.label} role="menuitem" className={i === index ? "is-focus" : ""} onMouseEnter={() => setIndex(i)} onClick={() => onPick(it.nav)}>
          <Icon name={it.icon} />
          {it.label}
        </button>
      ))}
    </div>
  );
}
