"use client";
/** Full-screen pages: a project's game hub, the profile (CV), trophies and the game library. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { githubUser, repos } from "@/content/github";
import { achievements, profile, projects } from "@/content/portfolio";
import { consoleTrophies, useConsole, useLibrary, useStoreSearch } from "@/lib/console";
import { pick } from "@/lib/i18n";
import { rumble, useLayer, type Action } from "@/lib/input";
import { navProps, useGrid, useScrollToFocus, type Pos } from "@/lib/nav";
import { sound } from "@/lib/sound";
import type { Project, Tier } from "@/lib/types";
import { CoverArt } from "../CoverArt";
import { Icon, TrophyIcon } from "../Icons";
import { AmbientBg, Avatar, Clock, Hints, Logo, ProgressRing, SampleBadge, SectionTitle, StatusChip, TierCounts, Trailer, formatPrice, projectProgress } from "../ui";

export type PageNav =
  | { to: "game"; project: Project }
  | { to: "link"; url: string; title: string; sample?: boolean }
  | { to: "trophies" }
  | { to: "contact" }
  | { to: "search" }
  | { to: "video"; id: string; title: string }
  | { to: "cc" }
  | { to: "back" };

function PageShell({
  className,
  bg,
  children,
  scrollRef,
  onBack,
  title,
}: {
  className: string;
  bg: ReactNode;
  children: ReactNode;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onBack: () => void;
  title?: string;
}) {
  const { t } = useConsole();
  return (
    <div className={`screen page ${className}`}>
      <div className="page-bg">{bg}</div>
      <header className="page-top">
        <button className="back-btn" onClick={onBack} aria-label={t("hint.back")}>
          <Icon name="chevronLeft" />
          <span>{title}</span>
        </button>
        <Clock />
      </header>
      <div className="page-scroll" ref={scrollRef}>
        {children}
      </div>
      <Hints />
    </div>
  );
}

function usePageInput(grid: ReturnType<typeof useGrid>, onNav: (n: PageNav) => void, activate: (p: Pos) => void, enabled = true, extra?: (a: Action) => boolean) {
  useLayer((a: Action) => {
    if (a === "home") return onNav({ to: "cc" });
    if (extra?.(a)) return;
    if (a === "back") {
      sound.back();
      return onNav({ to: "back" });
    }
    if (grid.move(a)) return;
    if (a === "confirm") activate(grid.pos);
  }, enabled);
}

const tierOrder: Tier[] = ["platinum", "gold", "silver", "bronze"];

/* ------------------------------------------------------------------ game hub */

export function GameHub({ project: p, onNav }: { project: Project; onNav: (n: PageNav) => void }) {
  const { t, lang, owns } = useConsole();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [checkout, setCheckout] = useState(false);

  // The first button is the primary one: Buy for games you don't own, otherwise the trailer or store page.
  const buttons: { label: string; icon: string; primary?: boolean; run: () => void }[] = [];
  if (!owns(p) && p.price) buttons.push({ label: `${t(p.status === "dev" ? "store.preorder" : "store.buy")} · ${formatPrice(p.price, lang)}`, icon: "bag", run: () => setCheckout(true) });
  // The trailer plays in the console; only games without a YouTube id fall back to the link.
  if (p.links.demo) buttons.push({ label: t("demo"), icon: "play", run: () => onNav(p.trailer ? { to: "video", id: p.trailer, title: p.title } : { to: "link", url: p.links.demo!, title: p.title, sample: p.sample }) });
  if (p.links.repo) buttons.push({ label: t("source"), icon: "external", run: () => onNav({ to: "link", url: p.links.repo!, title: p.title, sample: p.sample }) });
  if (p.trophies.length) buttons.push({ label: t("trophies"), icon: "trophy", run: () => grid.setPos({ r: 3, c: 0 }) });
  if (buttons[0]) buttons[0].primary = true;

  const gallery = p.screenshots?.length ? p.screenshots.map((_, i) => i + 1) : [1, 2, 3, 4];
  const rows = [buttons.length, p.features.length, 1, p.trophies.length, gallery.length];
  const grid = useGrid(rows);
  useScrollToFocus(scrollRef, grid.pos);

  const activate = (pos: Pos) => {
    if (pos.r === 0) {
      sound.select();
      buttons[pos.c].run();
    } else if (pos.r === 4) {
      sound.select();
      setLightbox(pos.c);
    }
  };
  usePageInput(grid, onNav, activate, lightbox === null && !checkout);
  const np = (r: number, c: number) => navProps(grid.pos, r, c, grid.focus, () => activate({ r, c }));
  const earned = p.trophies.filter((x) => x.earned).length;

  return (
    <PageShell
      className="game"
      scrollRef={scrollRef}
      onBack={() => (sound.back(), onNav({ to: "back" }))}
      bg={
        <>
          <CoverArt src={p.hero ?? p.cover} seed={p.id} motif={p.motif} palette={p.palette} className="page-art" animated />
          <Trailer id={p.trailer} delay={1500} />
          <div className="page-shade" />
        </>
      }
    >
      <section className="game-hero">
        <Logo text={p.title} spec={p.logo} className="game-logo" />
        <div className="hero-meta">
          <span>{pick(lang, p.genre)}</span>
          <span className="dot" />
          <span>{p.year}</span>
          <StatusChip status={p.status} />
          <SampleBadge show={p.sample} />
        </div>
        <p className="game-tagline">{pick(lang, p.tagline)}</p>
        <div className="game-buttons">
          {buttons.map((b, i) => (
            <button key={b.label} className={b.primary ? "btn-play" : "btn-pill"} {...np(0, i)}>
              <Icon name={b.icon} />
              {b.label}
            </button>
          ))}
          {!p.links.demo && !p.links.repo && <span className="muted">{t("noLinks")}</span>}
        </div>
        {p.trophies.length > 0 && (
          <div className="game-progress">
            <ProgressRing value={projectProgress(p)} />
            <span>
              <small>{t("trophy.progress")}</small>
              <strong>
                {earned}/{p.trophies.length} {t("trophies").toLowerCase()}
              </strong>
            </span>
            {p.hours > 0 && (
              <span>
                <small>{t("playtime")}</small>
                <strong>
                  {p.hours} {t("hours")}
                </strong>
              </span>
            )}
          </div>
        )}
      </section>

      <section className="page-section">
        <SectionTitle>{t("activities")}</SectionTitle>
        <div className="row-scroll" data-row-scroll>
          {p.features.map((f, i) => (
            <button key={i} className="activity" {...np(1, i)}>
              <CoverArt src={p.screenshots?.[i]} seed={p.id} motif={p.motif} palette={p.palette} variant={i + 1} className="activity-art" />
              <span className="activity-body">
                <strong>{pick(lang, f.title)}</strong>
                <small>{pick(lang, f.body)}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="page-section">
        <SectionTitle>{t("about")}</SectionTitle>
        <div className="about-card panel" {...np(2, 0)}>
          <p>{pick(lang, p.description)}</p>
          <dl className="facts">
            <div>
              <dt>{t("role")}</dt>
              <dd>{pick(lang, p.role)}</dd>
            </div>
            <div>
              <dt>{t("genre")}</dt>
              <dd>{pick(lang, p.genre)}</dd>
            </div>
            <div>
              <dt>{t("released")}</dt>
              <dd>{p.year}</dd>
            </div>
            {p.hours > 0 && (
              <div>
                <dt>{t("playtime")}</dt>
                <dd>
                  {p.hours} {t("hours")}
                </dd>
              </div>
            )}
          </dl>
          <div className="chips">
            <span className="chips-label">{t("tech")}</span>
            {p.tech.map((x) => (
              <span key={x} className="chip">
                {x}
              </span>
            ))}
          </div>
        </div>
      </section>

      {p.trophies.length > 0 && (
        <section className="page-section">
          <SectionTitle extra={<span className="section-extra">{Math.round(projectProgress(p))}%</span>}>{t("trophies")}</SectionTitle>
          <div className="trophy-grid">
            {p.trophies.map((tr, i) => (
              <div key={i} className={`trophy-row panel ${tr.earned ? "is-earned" : "is-locked"}`} {...np(3, i)}>
                <span className={`trophy-badge tier-${tr.tier}`}>{tr.earned ? <TrophyIcon tier={tr.tier} /> : <Icon name="lock" />}</span>
                <span className="trophy-text">
                  <strong>{pick(lang, tr.name)}</strong>
                  <small>{pick(lang, tr.detail)}</small>
                </span>
                <span className="trophy-state">{tr.earned ? t("earned") : t("locked")}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="page-section">
        <SectionTitle>{t("gallery")}</SectionTitle>
        <div className="row-scroll gallery" data-row-scroll>
          {gallery.map((v, i) => (
            <button key={v} className="shot" {...np(4, i)}>
              <CoverArt src={p.screenshots?.[i]} seed={p.id} motif={p.motif} palette={p.palette} variant={v * 7} />
            </button>
          ))}
        </div>
      </section>
      {lightbox !== null && (
        <Lightbox count={gallery.length} index={lightbox} setIndex={setLightbox} onClose={() => setLightbox(null)}>
          <CoverArt src={p.screenshots?.[lightbox]} seed={p.id} motif={p.motif} palette={p.palette} variant={gallery[lightbox] * 7} animated />
        </Lightbox>
      )}
      {checkout && <Checkout project={p} onClose={() => setCheckout(false)} />}
    </PageShell>
  );
}

/** Demo checkout: confirm, then the game joins the library. No payment details are ever asked for. */
function Checkout({ project: p, onClose }: { project: Project; onClose: () => void }) {
  const { t, lang, buy, owns } = useConsole();
  const done = owns(p);
  const [focus, setFocus] = useState(0);
  const confirm = () => {
    sound.select();
    rumble(160, 0.4, 0.2);
    buy(p);
  };
  useLayer((a) => {
    if (a === "back" || a === "home") (sound.back(), onClose());
    else if (done) a === "confirm" && (sound.select(), onClose());
    else if (a === "left" || a === "right") (sound.move(), setFocus((f) => 1 - f));
    else if (a === "confirm") focus === 0 ? confirm() : (sound.back(), onClose());
  });
  return (
    <div className="checkout" onClick={onClose}>
      <div className="checkout-card" role="dialog" aria-modal="true" aria-label={t("store.confirm")} onClick={(e) => e.stopPropagation()}>
        <span className="checkout-art">
          <CoverArt src={p.cover} seed={p.id} motif={p.motif} palette={p.palette} />
        </span>
        <div className="checkout-body">
          <small className={done ? "checkout-done" : ""}>
            {done && <Icon name="check" />}
            {done ? t("store.done") : t("store.confirm")}
          </small>
          <strong>{p.title}</strong>
          <span className="muted">{pick(lang, p.genre)}</span>
          {!done && p.price && (
            <dl className="checkout-total">
              <dt>{t("store.total")}</dt>
              <dd>{formatPrice(p.price, lang)}</dd>
            </dl>
          )}
          <p className="checkout-note">{t("store.demo")}</p>
          <div className="checkout-buttons">
            {done ? (
              <button className="btn-play" data-focus onClick={onClose}>
                {t("store.ok")}
              </button>
            ) : (
              <>
                <button className="btn-play" data-focus={focus === 0 || undefined} onMouseEnter={() => setFocus(0)} onClick={confirm}>
                  <Icon name="bag" />
                  {t(p.status === "dev" ? "store.preorder" : "store.buy")}
                </button>
                <button className="btn-pill" data-focus={focus === 1 || undefined} onMouseEnter={() => setFocus(1)} onClick={onClose}>
                  {t("store.cancel")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Lightbox({ count, index, setIndex, onClose, children }: { count: number; index: number; setIndex: (i: number) => void; onClose: () => void; children: ReactNode }) {
  useLayer((a) => {
    if (a === "left" && index > 0) (sound.move(), setIndex(index - 1));
    else if (a === "right" && index < count - 1) (sound.move(), setIndex(index + 1));
    else if (a === "back" || a === "confirm" || a === "home") (sound.back(), onClose());
  });
  return (
    <div className="lightbox" onClick={onClose}>
      <div className="lightbox-frame">{children}</div>
      <div className="lightbox-dots">
        {Array.from({ length: count }, (_, i) => (
          <span key={i} className={i === index ? "is-on" : ""} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ profile / CV */

export function ProfilePage({ onNav }: { onNav: (n: PageNav) => void }) {
  const { t, lang, earned, award } = useConsole();
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => award("curious"), [award]);

  // Everything below is optional: a section only shows (and only takes a navigation row) when it has content.
  const buttons: { label: string; icon: string; run: () => void }[] = [];
  if (profile.cvUrl) buttons.push({ label: t("profile.cv"), icon: "file", run: () => onNav({ to: "link", url: profile.cvUrl!, title: t("profile.cv") }) });
  buttons.push({ label: t("profile.contact"), icon: "mail", run: () => onNav({ to: "contact" }) });
  const facts = [profile.education.length, profile.languages.length].filter(Boolean).length;
  const rows = [buttons.length, 1, profile.experience.length, profile.skills.length ? 1 : 0, repos.length, achievements.length, facts];
  const grid = useGrid(rows);
  useScrollToFocus(scrollRef, grid.pos);
  const stars = repos.reduce((n, r) => n + r.stars, 0);

  const activate = (pos: Pos) => {
    if (pos.r === 0) {
      sound.select();
      buttons[pos.c].run();
    } else if (pos.r === 4) {
      sound.select();
      onNav({ to: "link", url: repos[pos.c].url, title: repos[pos.c].name });
    } else if (pos.r === 5) {
      sound.select();
      onNav({ to: "trophies" });
    }
  };
  usePageInput(grid, onNav, activate);
  const np = (r: number, c: number) => navProps(grid.pos, r, c, grid.focus, () => activate({ r, c }));
  const consoleEarned = Object.keys(earned).length;

  return (
    <PageShell className="profile" scrollRef={scrollRef} onBack={() => (sound.back(), onNav({ to: "back" }))} bg={<AmbientBg dim />} title={t("explore")}>
      <section className="profile-head">
        <Avatar name={profile.name} src={profile.avatar} size="xl" ring />
        <div className="profile-id">
          <h1>{profile.name}</h1>
          <div className="profile-sub">
            <span className="online-dot" />
            {t("profile.online")} · {profile.onlineId}
          </div>
          <p className="profile-title">
            {pick(lang, profile.title)} · {pick(lang, profile.location)}
          </p>
          {profile.level !== undefined && (
            <div className="profile-level">
              <span className="level-badge">
                <small>{t("profile.level")}</small>
                <strong>{profile.level}</strong>
              </span>
              <span className="level-bar">
                <span style={{ width: `${profile.levelProgress ?? 0}%` }} />
              </span>
              <small className="muted">
                {profile.level} {t("profile.years")}
              </small>
            </div>
          )}
          <p className="profile-stats">
            <Icon name="github" />
            {repos.length} {t("profile.repoCount")}
            <span className="dot" />
            <Icon name="star" />
            {stars}
          </p>
          <div className="profile-buttons">
            {buttons.map((b, i) => (
              <button key={b.label} className={i ? "btn-pill" : "btn-play"} {...np(0, i)}>
                <Icon name={b.icon} />
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section">
        <SectionTitle>{t("about")}</SectionTitle>
        <div className="panel about-card" {...np(1, 0)}>
          <p>{pick(lang, profile.about)}</p>
        </div>
      </section>

      {profile.experience.length > 0 && (
        <section className="page-section">
          <SectionTitle>{t("profile.experience")}</SectionTitle>
          <div className="row-scroll" data-row-scroll>
            {profile.experience.map((e, i) => (
              <div key={i} className="panel exp-card" {...np(2, i)}>
                <small className="exp-period">{e.period}</small>
                <strong>{pick(lang, e.role)}</strong>
                <span className="exp-company">{e.company}</span>
                <p>{pick(lang, e.summary)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {profile.skills.length > 0 && (
        <section className="page-section">
          <SectionTitle>{t("profile.skills")}</SectionTitle>
          <div className="panel skill-groups" {...np(3, 0)}>
            {profile.skills.map((g) => (
              <div key={g.group.en} className="skill-group">
                <small>{pick(lang, g.group)}</small>
                <div className="chips">
                  {g.items.map((x) => (
                    <span key={x} className="chip">
                      {x}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="page-section">
        <SectionTitle extra={<span className="section-extra">github.com/{githubUser}</span>}>{t("profile.repos")}</SectionTitle>
        <div className="row-scroll" data-row-scroll>
          {repos.map((r, i) => (
            <button key={r.name} className="mini-game repo-card" {...np(4, i)}>
              <span className="mini-art">
                <RepoArt name={r.name} />
              </span>
              <span className="mini-body">
                <strong>{r.name}</strong>
                <small className="repo-desc">{r.description}</small>
                <small className="repo-meta">
                  {r.language && <span>{r.language}</span>}
                  {r.stars > 0 && (
                    <span>
                      <Icon name="star" />
                      {r.stars}
                    </span>
                  )}
                </small>
              </span>
            </button>
          ))}
        </div>
      </section>

      {achievements.length > 0 && (
        <section className="page-section">
          <SectionTitle extra={<span className="section-extra">{consoleEarned} / {consoleTrophies.length}</span>}>{t("profile.achievements")}</SectionTitle>
          <div className="row-scroll" data-row-scroll>
            {achievements.map((a, i) => (
              <div key={a.id} className="panel ach-card" {...np(5, i)}>
                <span className={`trophy-badge tier-${a.tier}`}>
                  <TrophyIcon tier={a.tier} />
                </span>
                <small>{t(`kind.${a.kind}`)}</small>
                <strong>{pick(lang, a.name)}</strong>
                <span className="muted">
                  {a.issuer} · {a.date}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {facts > 0 && (
        <section className="page-section two-col">
          {profile.education.length > 0 && (
            <div className="panel" {...np(6, 0)}>
              <SectionTitle>{t("profile.education")}</SectionTitle>
              {profile.education.map((e) => (
                <div key={e.school} className="edu">
                  <strong>{e.school}</strong>
                  <span>{pick(lang, e.degree)}</span>
                  <small className="muted">{e.period}</small>
                </div>
              ))}
            </div>
          )}
          {profile.languages.length > 0 && (
            <div className="panel" {...np(6, profile.education.length ? 1 : 0)}>
              <SectionTitle>{t("profile.languages")}</SectionTitle>
              {profile.languages.map((l) => (
                <div key={l.name.en} className="edu">
                  <strong>{pick(lang, l.name)}</strong>
                  <span>{pick(lang, l.level)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </PageShell>
  );
}

const MOTIFS: Project["motif"][] = ["circuit", "grid", "rings", "orbit", "shards", "waves"];

/**
 * GitHub's generated social card for a repo. GitHub renders these on demand and drops some of a burst of requests,
 * so a failed load retries once, then falls back to generated art instead of a broken image.
 */
function RepoArt({ name }: { name: string }) {
  const [tries, setTries] = useState(0);
  if (tries > 1) return <CoverArt seed={name} motif={MOTIFS[name.length % MOTIFS.length]} palette={["#0b1020", "#1e3a8a", "#60a5fa"]} />;
  return (
    <img
      key={tries}
      className="art-img"
      src={`https://opengraph.githubassets.com/${tries + 1}/${githubUser}/${name}`}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => window.setTimeout(() => setTries((n) => n + 1), tries ? 0 : 1500)}
    />
  );
}

/* ------------------------------------------------------------------ trophies */

export function TrophiesPage({ onNav }: { onNav: (n: PageNav) => void }) {
  const { t, lang, earned, user } = useConsole();
  const scrollRef = useRef<HTMLDivElement>(null);
  const trophyGames = projects.filter((p) => p.trophies.length);
  // Certificates and awards are CV material, so only the recruiter sees them.
  const certs = user === "recruiter" ? achievements : [];
  const rows = [certs.length, consoleTrophies.length, trophyGames.length];
  const grid = useGrid(rows);
  useScrollToFocus(scrollRef, grid.pos);

  const activate = (pos: Pos) => {
    if (pos.r === 0) {
      const a = certs[pos.c];
      if (a.url) {
        sound.select();
        onNav({ to: "link", url: a.url, title: pick(lang, a.name), sample: a.sample });
      }
    } else if (pos.r === 2) onNav({ to: "game", project: trophyGames[pos.c] });
  };
  usePageInput(grid, onNav, activate);
  const np = (r: number, c: number) => navProps(grid.pos, r, c, grid.focus, () => activate({ r, c }));

  const counts = useMemo(() => {
    const c: Record<Tier, number> = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    certs.forEach((a) => c[a.tier]++);
    projects.forEach((p) => p.trophies.forEach((x) => x.earned && c[x.tier]++));
    consoleTrophies.forEach((x) => earned[x.id] && c[x.tier]++);
    return c;
  }, [earned, certs]);
  const total = counts.platinum + counts.gold + counts.silver + counts.bronze;

  return (
    <PageShell className="trophies-page" scrollRef={scrollRef} onBack={() => (sound.back(), onNav({ to: "back" }))} bg={<AmbientBg dim />} title={t("trophies")}>
      <section className="trophies-head">
        <span className="big-trophy">
          <TrophyIcon tier="platinum" />
        </span>
        <div>
          <h1>{t("trophies")}</h1>
          <p className="muted">
            {total} · {certs.length ? t("profile.achievements") : t("trophy.console")}
          </p>
          <TierCounts counts={counts} />
        </div>
      </section>

      {certs.length > 0 && (
        <section className="page-section">
          <SectionTitle>{t("profile.achievements")}</SectionTitle>
          <div className="row-scroll" data-row-scroll>
            {certs.map((a, i) => (
              <div key={a.id} className={`panel ach-card ach-${a.tier}`} {...np(0, i)}>
                <span className={`trophy-badge tier-${a.tier}`}>
                  <TrophyIcon tier={a.tier} />
                </span>
                <small>{t(`kind.${a.kind}`)}</small>
                <strong>{pick(lang, a.name)}</strong>
                <span className="muted">
                  {a.issuer} · {a.date}
                </span>
                <p>{pick(lang, a.detail)}</p>
                <SampleBadge show={a.sample} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="page-section">
        <SectionTitle extra={<span className="section-extra">{t("trophy.consoleNote")}</span>}>{t("trophy.console")}</SectionTitle>
        <div className="row-scroll" data-row-scroll>
          {consoleTrophies.map((x, i) => {
            const got = !!earned[x.id];
            return (
              <div key={x.id} className={`panel console-trophy ${got ? "is-earned" : "is-locked"}`} {...np(1, i)}>
                <span className={`trophy-badge tier-${x.tier}`}>{got ? <TrophyIcon tier={x.tier} /> : <Icon name="lock" />}</span>
                <strong>{pick(lang, x.name)}</strong>
                <small>{pick(lang, x.detail)}</small>
              </div>
            );
          })}
        </div>
      </section>

      {trophyGames.length > 0 && (
        <section className="page-section">
          <SectionTitle>{t("tab.games")}</SectionTitle>
          <div className="row-scroll" data-row-scroll>
            {trophyGames.map((p, i) => (
              <button key={p.id} className="mini-game" {...np(2, i)}>
                <span className="mini-art">
                  <CoverArt src={p.hero ?? p.cover} seed={p.id} motif={p.motif} palette={p.palette} />
                  <Logo text={p.title} spec={p.logo} className="tile-logo" />
                </span>
                <span className="mini-body">
                  <strong>{p.title}</strong>
                  <span className="mini-trophies">
                    {tierOrder.map((tier) => {
                      const n = p.trophies.filter((x) => x.tier === tier && x.earned).length;
                      return n ? (
                        <span key={tier} className="tier-count">
                          <TrophyIcon tier={tier} />
                          {n}
                        </span>
                      ) : null;
                    })}
                  </span>
                  <span className="mini-progress">
                    <span style={{ width: `${projectProgress(p)}%` }} />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}

/* ------------------------------------------------------------------ library */

type Filter = "all" | Project["status"];

function useColumns() {
  const [cols, setCols] = useState(5);
  useEffect(() => {
    const calc = () => setCols(window.innerWidth < 560 ? 2 : window.innerWidth < 900 ? 3 : window.innerWidth < 1300 ? 4 : 5);
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  return cols;
}

export function LibraryPage({ onNav }: { onNav: (n: PageNav) => void }) {
  const { t, award } = useConsole();
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => award("librarian"), [award]);
  const library = useLibrary();
  const [filter, setFilter] = useState<Filter>("all");
  // A status filter only shows when it narrows the list: no "Archived 0", no "Available" that equals "All".
  const filters: Filter[] = [
    "all",
    ...(["live", "dev", "archived"] as const).filter((f) => {
      const n = library.filter((p) => p.status === f).length;
      return n > 0 && n < library.length;
    }),
  ];
  const list = library.filter((p) => filter === "all" || p.status === filter);
  const cols = useColumns();
  const gridRows = Math.ceil(list.length / cols);
  const rows = [filters.length, ...Array.from({ length: gridRows }, (_, r) => Math.min(cols, list.length - r * cols))];
  const grid = useGrid(rows);
  useScrollToFocus(scrollRef, grid.pos);

  const activate = (pos: Pos) => {
    if (pos.r === 0) {
      sound.select();
      setFilter(filters[pos.c]);
    } else {
      const p = list[(pos.r - 1) * cols + pos.c];
      if (p) onNav({ to: "game", project: p });
    }
  };
  // L1 / R1 step through the filters from anywhere on the page.
  usePageInput(grid, onNav, activate, true, (a) => {
    if (a !== "l1" && a !== "r1") return false;
    const n = filters.indexOf(filter) + (a === "l1" ? -1 : 1);
    if (n < 0 || n >= filters.length) return true;
    sound.move();
    setFilter(filters[n]);
    grid.setPos({ r: 0, c: n });
    return true;
  });
  const np = (r: number, c: number) => navProps(grid.pos, r, c, grid.focus, () => activate({ r, c }));

  return (
    <PageShell className="library" scrollRef={scrollRef} onBack={() => (sound.back(), onNav({ to: "back" }))} bg={<AmbientBg dim />} title={t("library")}>
      <section className="library-head">
        <h1>{t("library")}</h1>
        <div className="filters">
          {filters.map((f, i) => (
            <button key={f} className={`filter ${filter === f ? "is-active" : ""}`} {...np(0, i)}>
              {f === "all" ? t("library.all") : t(`status.${f}`)}
              <span>{f === "all" ? library.length : library.filter((p) => p.status === f).length}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="library-grid" style={{ ["--cols" as string]: cols }}>
        {list.map((p, i) => (
          <button key={p.id} className="lib-item" {...np(1 + Math.floor(i / cols), i % cols)}>
            <span className="lib-art">
              <CoverArt src={p.cover} seed={p.id} motif={p.motif} palette={p.palette} />
              <Logo text={p.title} spec={p.logo} className="tile-logo" />
            </span>
            <span className="lib-name">{p.title}</span>
            {/* Everything here is owned; only a pre-order needs a label. */}
            {p.status !== "live" && <StatusChip status={p.status} />}
          </button>
        ))}
      </section>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ store */

/** Case- and accent-insensitive text for matching search queries ("Ragnarok" finds "Ragnarök"). */
const fold = (s: string) => s.toLocaleLowerCase("tr").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

export function StorePage({ onNav }: { onNav: (n: PageNav) => void }) {
  const { t, lang, owns, award, reducedMotion } = useConsole();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // "Curious" used to need the profile, which only the recruiter can open now; the store keeps platinum reachable.
  useEffect(() => award("curious"), [award]);
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);

  const forSale = projects.filter((p) => p.price);
  // The showcase: the best-rated released games you don't own yet (the catalog is ordered by rating).
  const featured = forSale.filter((p) => !owns(p) && p.status !== "dev").slice(0, 5);
  const genres = useMemo(() => {
    const n = new Map<string, number>();
    forSale.forEach((p) => p.genre.en.split(" · ").forEach((g) => n.set(g, (n.get(g) ?? 0) + 1)));
    return [...n].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([g]) => g);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const query = fold(q.trim());
  const filtering = !!query || !!genre;
  // The catalog first, then whatever IGDB finds beyond it (any PS5 or PS4 game).
  const remote = useStoreSearch(q);
  const results = [...forSale, ...remote.games].filter((p) => (!genre || p.genre.en.includes(genre)) && (!query || fold([p.title, p.genre.en, p.role.en, ...p.tech].join(" ")).includes(query) || remote.games.includes(p)));
  // Games for sale before the ones already in your library (sort is stable, so rating order holds).
  const top = forSale.filter((p) => p.status !== "dev").sort((a, b) => Number(owns(a)) - Number(owns(b)));
  const soon = forSale.filter((p) => p.status === "dev");
  const chips = [null, ...genres];
  const hero = featured.length ? featured[slide % featured.length] : undefined;
  const shelves: [string, Project[]][] = filtering
    ? [[results.length ? `${t("store.results")} · ${results.length}${remote.loading ? " …" : ""}` : remote.loading ? t("store.searching") : t("store.noResults"), results]]
    : [
        [t("store.top"), top],
        [t("store.soon"), soon],
      ];

  // Rows: search field, genre chips, showcase banner, then the shelves.
  const grid = useGrid([1, chips.length, !filtering && hero ? 1 : 0, ...shelves.map(([, l]) => l.length)]);
  useScrollToFocus(scrollRef, grid.pos);

  // The showcase turns every 7 seconds, and pauses while you search or with reduced motion.
  useEffect(() => {
    if (reducedMotion || filtering || featured.length < 2) return;
    const id = setTimeout(() => setSlide((n) => (n + 1) % featured.length), 7000);
    return () => clearTimeout(id);
  }, [slide, reducedMotion, filtering, featured.length]);

  const activate = (pos: Pos) => {
    if (pos.r === 0) {
      // Pointer and touch type into the field. Keys and pads type here directly too; pressing the field opens the
      // full search, whose on-screen keyboard is the only way to type with a controller.
      const m = document.documentElement.dataset.input;
      return m === "pointer" || m === "touch" ? inputRef.current?.focus() : onNav({ to: "search" });
    }
    if (pos.r === 1) {
      sound.select();
      return setGenre(chips[pos.c]);
    }
    const p = pos.r === 2 ? hero : shelves[pos.r - 3]?.[1][pos.c];
    if (p) onNav({ to: "game", project: p });
  };

  useLayer(
    (a: Action) => {
      if (a === "home") return onNav({ to: "cc" });
      if (a === "back") {
        sound.back();
        if (q || genre) return (setQ(""), setGenre(null));
        return onNav({ to: "back" });
      }
      if (grid.pos.r === 2 && (a === "left" || a === "right") && featured.length > 1) {
        sound.move();
        return setSlide((n) => (n + (a === "left" ? featured.length - 1 : 1)) % featured.length);
      }
      if (grid.move(a)) return;
      if (a === "confirm") activate(grid.pos);
    },
    true,
    // A physical keyboard types straight into the search, wherever the focus is.
    {
      text: (ev) => {
        setQ((v) => (ev.type === "backspace" ? v.slice(0, -1) : (v + ev.ch).slice(0, 40)));
        grid.setPos({ r: 0, c: 0 });
      },
    },
  );
  const np = (r: number, c: number) => navProps(grid.pos, r, c, grid.focus, () => activate({ r, c }));
  const priceTag = (p: Project) => (owns(p) ? t("store.owned") : formatPrice(p.price!, lang));

  return (
    <PageShell
      className="store"
      scrollRef={scrollRef}
      onBack={() => (sound.back(), onNav({ to: "back" }))}
      title={t("store")}
      bg={
        hero ? (
          <>
            <CoverArt key={hero.id} src={hero.hero ?? hero.cover} seed={hero.id} motif={hero.motif} palette={hero.palette} className="page-art store-ambient" />
            <div className="page-shade" />
          </>
        ) : (
          <AmbientBg dim />
        )
      }
    >
      <section className="store-top">
        <div className={`search-field store-search ${q ? "is-active" : ""}`} {...np(0, 0)}>
          <Icon name="search" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value.slice(0, 40))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") inputRef.current?.blur();
            }}
            placeholder={t("store.search")}
            aria-label={t("store.search")}
            enterKeyHint="search"
          />
          {q && (
            <button className="search-clear" onClick={(e) => (e.stopPropagation(), sound.back(), setQ(""))} aria-label={t("store.clear")}>
              <Icon name="plus" className="rot45" />
            </button>
          )}
        </div>
        <div className="store-chips">
          {chips.map((g, i) => (
            <button key={g ?? "all"} className={`filter ${genre === g ? "is-active" : ""}`} {...np(1, i)}>
              {g ?? t("library.all")}
            </button>
          ))}
        </div>
      </section>

      {!filtering && hero && (
        <button className="store-banner" {...np(2, 0)}>
          <CoverArt key={hero.id} src={hero.hero ?? hero.cover} seed={hero.id} motif={hero.motif} palette={hero.palette} className="store-banner-art" />
          <span className="store-banner-shade" />
          <span className="store-banner-body" key={`b-${hero.id}`}>
            <span className="store-kicker">
              <Icon name="bag" />
              {t("store.featured")}
            </span>
            <strong>{hero.title}</strong>
            <span className="store-banner-meta">
              {pick(lang, hero.genre)} · {hero.year}
              {hero.rating ? ` · ★ ${hero.rating}` : ""}
            </span>
            <span className="store-banner-text">{pick(lang, hero.tagline)}</span>
            <span className="store-banner-price">
              <Icon name="bag" />
              {priceTag(hero)}
            </span>
          </span>
          {featured.length > 1 && (
            <span className="store-dots">
              {featured.map((p, i) => (
                <i key={p.id} className={i === slide % featured.length ? "is-on" : ""} />
              ))}
            </span>
          )}
        </button>
      )}

      {shelves.map(([title, list], k) => (
        <section key={title} className="page-section">
          <SectionTitle>{title}</SectionTitle>
          {list.length > 0 && (
            <div className="row-scroll" data-row-scroll>
              {list.map((p, i) => (
                <button key={p.id} className="store-item" {...np(3 + k, i)}>
                  <span className="lib-art">
                    <CoverArt src={p.cover} seed={p.id} motif={p.motif} palette={p.palette} />
                    <Logo text={p.title} spec={p.logo} className="tile-logo" />
                  </span>
                  <span className="lib-name">{p.title}</span>
                  <span className={`store-price ${owns(p) ? "is-owned" : ""}`}>{priceTag(p)}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      ))}
      <p className="store-note">{t("store.demo")}</p>
    </PageShell>
  );
}
