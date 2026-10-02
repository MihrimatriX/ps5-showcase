"use client";
/** Full-screen pages: a project's game hub, the profile (CV), trophies and the game library. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { achievements, profile, projects } from "@/content/portfolio";
import { consoleTrophies, useConsole } from "@/lib/console";
import { pick } from "@/lib/i18n";
import { useLayer, type Action } from "@/lib/input";
import { navProps, useGrid, useScrollToFocus, type Pos } from "@/lib/nav";
import { sound } from "@/lib/sound";
import type { Project, Tier } from "@/lib/types";
import { CoverArt } from "../CoverArt";
import { Icon, TrophyIcon } from "../Icons";
import { AmbientBg, Avatar, Clock, Hints, Logo, ProgressRing, SampleBadge, SectionTitle, StatusChip, TierCounts, projectProgress } from "../ui";

export type PageNav =
  | { to: "game"; project: Project }
  | { to: "link"; url: string; title: string; sample?: boolean }
  | { to: "trophies" }
  | { to: "contact" }
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

function usePageInput(grid: ReturnType<typeof useGrid>, onNav: (n: PageNav) => void, activate: (p: Pos) => void, enabled = true) {
  useLayer((a: Action) => {
    if (a === "home") return onNav({ to: "cc" });
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
  const { t, lang } = useConsole();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const buttons: { label: string; icon: string; primary?: boolean; run: () => void }[] = [];
  if (p.links.demo) buttons.push({ label: t("demo"), icon: "play", primary: true, run: () => onNav({ to: "link", url: p.links.demo!, title: p.title, sample: p.sample }) });
  if (p.links.repo) buttons.push({ label: t("source"), icon: "github", primary: !p.links.demo, run: () => onNav({ to: "link", url: p.links.repo!, title: p.title, sample: p.sample }) });
  buttons.push({ label: t("trophies"), icon: "trophy", run: () => grid.setPos({ r: 3, c: 0 }) });

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
  usePageInput(grid, onNav, activate, lightbox === null);
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
        <div className="game-progress">
          <ProgressRing value={projectProgress(p)} />
          <span>
            <small>{t("trophy.progress")}</small>
            <strong>
              {earned}/{p.trophies.length} {t("trophies").toLowerCase()}
            </strong>
          </span>
          <span>
            <small>{t("playtime")}</small>
            <strong>
              {p.hours} {t("hours")}
            </strong>
          </span>
        </div>
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
            <div>
              <dt>{t("playtime")}</dt>
              <dd>
                {p.hours} {t("hours")}
              </dd>
            </div>
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
    </PageShell>
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

  const rows = [2, 1, profile.experience.length, 1, projects.length, achievements.length, 2];
  const grid = useGrid(rows);
  useScrollToFocus(scrollRef, grid.pos);

  const counts = useMemo(() => {
    const c: Record<Tier, number> = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    achievements.forEach((a) => c[a.tier]++);
    projects.forEach((p) => p.trophies.forEach((x) => x.earned && c[x.tier]++));
    return c;
  }, []);

  const activate = (pos: Pos) => {
    if (pos.r === 0 && pos.c === 0) {
      sound.select();
      onNav({ to: "link", url: profile.cvUrl ?? "#", title: t("profile.cv"), sample: profile.sample });
    } else if (pos.r === 0 && pos.c === 1) {
      sound.select();
      onNav({ to: "contact" });
    } else if (pos.r === 4) onNav({ to: "game", project: projects[pos.c] });
    else if (pos.r === 5) {
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
        <Avatar name={profile.name} size="xl" ring />
        <div className="profile-id">
          <h1>{profile.name}</h1>
          <div className="profile-sub">
            <span className="online-dot" />
            {t("profile.online")} · {profile.onlineId}
            <SampleBadge show={profile.sample} />
          </div>
          <p className="profile-title">
            {pick(lang, profile.title)} · {pick(lang, profile.location)}
          </p>
          <div className="profile-level">
            <span className="level-badge">
              <small>{t("profile.level")}</small>
              <strong>{profile.level}</strong>
            </span>
            <span className="level-bar">
              <span style={{ width: `${profile.levelProgress}%` }} />
            </span>
            <small className="muted">
              {profile.level} {t("profile.years")}
            </small>
          </div>
          <TierCounts counts={counts} />
          <div className="profile-buttons">
            <button className="btn-play" {...np(0, 0)}>
              <Icon name="file" />
              {t("profile.cv")}
            </button>
            <button className="btn-pill" {...np(0, 1)}>
              <Icon name="mail" />
              {t("profile.contact")}
            </button>
          </div>
        </div>
      </section>

      <section className="page-section">
        <SectionTitle>{t("about")}</SectionTitle>
        <div className="panel about-card" {...np(1, 0)}>
          <p>{pick(lang, profile.about)}</p>
        </div>
      </section>

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

      <section className="page-section">
        <SectionTitle>{t("profile.skills")}</SectionTitle>
        <div className="panel skills" {...np(3, 0)}>
          {profile.skills.map((s, i) => (
            <div key={s.name} className="skill">
              <span>{s.name}</span>
              <span className="skill-bar">
                <span style={{ width: `${s.value}%`, animationDelay: `${i * 90}ms` }} />
              </span>
              <b>{s.value}</b>
            </div>
          ))}
        </div>
      </section>

      <section className="page-section">
        <SectionTitle>{t("profile.games")}</SectionTitle>
        <div className="row-scroll" data-row-scroll>
          {projects.map((p, i) => (
            <button key={p.id} className="mini-game" {...np(4, i)}>
              <span className="mini-art">
                <CoverArt src={p.cover} seed={p.id} motif={p.motif} palette={p.palette} />
                <Logo text={p.title} spec={p.logo} className="tile-logo" />
              </span>
              <span className="mini-body">
                <strong>{p.title}</strong>
                <span className="mini-progress">
                  <span style={{ width: `${projectProgress(p)}%` }} />
                </span>
                <small>
                  {Math.round(projectProgress(p))}% · {p.hours} {t("hours")}
                </small>
              </span>
            </button>
          ))}
        </div>
      </section>

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

      <section className="page-section two-col">
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
        <div className="panel" {...np(6, 1)}>
          <SectionTitle>{t("profile.languages")}</SectionTitle>
          {profile.languages.map((l) => (
            <div key={l.name.en} className="edu">
              <strong>{pick(lang, l.name)}</strong>
              <span>{pick(lang, l.level)}</span>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ trophies */

export function TrophiesPage({ onNav }: { onNav: (n: PageNav) => void }) {
  const { t, lang, earned } = useConsole();
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = [achievements.length, consoleTrophies.length, projects.length];
  const grid = useGrid(rows);
  useScrollToFocus(scrollRef, grid.pos);

  const activate = (pos: Pos) => {
    if (pos.r === 0) {
      const a = achievements[pos.c];
      if (a.url) {
        sound.select();
        onNav({ to: "link", url: a.url, title: pick(lang, a.name), sample: a.sample });
      }
    } else if (pos.r === 2) onNav({ to: "game", project: projects[pos.c] });
  };
  usePageInput(grid, onNav, activate);
  const np = (r: number, c: number) => navProps(grid.pos, r, c, grid.focus, () => activate({ r, c }));

  const counts = useMemo(() => {
    const c: Record<Tier, number> = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    achievements.forEach((a) => c[a.tier]++);
    projects.forEach((p) => p.trophies.forEach((x) => x.earned && c[x.tier]++));
    consoleTrophies.forEach((x) => earned[x.id] && c[x.tier]++);
    return c;
  }, [earned]);
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
            {total} · {t("profile.achievements")}
          </p>
          <TierCounts counts={counts} />
        </div>
      </section>

      <section className="page-section">
        <SectionTitle>{t("profile.achievements")}</SectionTitle>
        <div className="row-scroll" data-row-scroll>
          {achievements.map((a, i) => (
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

      <section className="page-section">
        <SectionTitle>{t("tab.games")}</SectionTitle>
        <div className="row-scroll" data-row-scroll>
          {projects.map((p, i) => (
            <button key={p.id} className="mini-game" {...np(2, i)}>
              <span className="mini-art">
                <CoverArt src={p.cover} seed={p.id} motif={p.motif} palette={p.palette} />
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
  const [filter, setFilter] = useState<Filter>("all");
  const filters: Filter[] = ["all", "live", "dev", "archived"];
  const list = projects.filter((p) => filter === "all" || p.status === filter);
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
  usePageInput(grid, onNav, activate);
  const np = (r: number, c: number) => navProps(grid.pos, r, c, grid.focus, () => activate({ r, c }));

  return (
    <PageShell className="library" scrollRef={scrollRef} onBack={() => (sound.back(), onNav({ to: "back" }))} bg={<AmbientBg dim />} title={t("library")}>
      <section className="library-head">
        <h1>{t("library")}</h1>
        <div className="filters">
          {filters.map((f, i) => (
            <button key={f} className={`filter ${filter === f ? "is-active" : ""}`} {...np(0, i)}>
              {f === "all" ? t("library.all") : t(`status.${f}`)}
              <span>{f === "all" ? projects.length : projects.filter((p) => p.status === f).length}</span>
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
            <StatusChip status={p.status} />
          </button>
        ))}
      </section>
    </PageShell>
  );
}
