"use client";
/** Control center, settings, search and the "opening a link" splash. */
import { useEffect, useMemo, useRef, useState } from "react";
import { media, profile, projects, socials } from "@/content/portfolio";
import { consoleTrophies, useConsole, type Theme } from "@/lib/console";
import { pick } from "@/lib/i18n";
import { useLayer } from "@/lib/input";
import { sound } from "@/lib/sound";
import type { Lang, Project } from "@/lib/types";
import { CoverArt } from "./CoverArt";
import { Icon, TrophyIcon } from "./Icons";
import { Avatar, Clock, Logo } from "./ui";

export type CCAction =
  | { to: "home" }
  | { to: "trophies" }
  | { to: "settings" }
  | { to: "power"; mode: "rest" | "off" | "restart" }
  | { to: "link"; url: string; title: string; sample?: boolean };

type Sub = "contact" | "power" | null;

export function ControlCenter({ current, onClose, onAction, startIn }: { current: Project | null; onClose: () => void; onAction: (a: CCAction) => void; startIn?: Sub }) {
  const { t, lang, music, setMusic, sfx, setSfx, earned } = useConsole();
  const icons = ["home", "trophies", "contact", "music", "sound", "settings", "power"] as const;
  const [row, setRow] = useState(1);
  const [col, setCol] = useState(startIn === "contact" ? 2 : 0);
  const [sub, setSub] = useState<Sub>(startIn ?? null);
  const [subIdx, setSubIdx] = useState(0);
  const [closing, setClosing] = useState(false);

  const lastTrophy = useMemo(() => {
    const ids = Object.entries(earned).sort((a, b) => b[1].localeCompare(a[1]));
    return ids.length ? consoleTrophies.find((x) => x.id === ids[0][0]) ?? null : null;
  }, [earned]);

  const close = () => {
    sound.back();
    setClosing(true);
    setTimeout(onClose, 220);
  };

  const subItems: { label: string; icon: string; run: () => void; hint?: string }[] =
    sub === "contact"
      ? socials.map((s) => ({ label: s.label, hint: s.handle, icon: s.id === "blog" ? "globe" : s.id, run: () => onAction({ to: "link", url: s.url, title: s.label, sample: s.sample }) }))
      : sub === "power"
        ? [
            { label: t("power.rest"), icon: "moon", run: () => onAction({ to: "power", mode: "rest" }) },
            { label: t("power.off"), icon: "power", run: () => onAction({ to: "power", mode: "off" }) },
            { label: t("power.restart"), icon: "restart", run: () => onAction({ to: "power", mode: "restart" }) },
          ]
        : [];

  const runIcon = (i: number) => {
    const id = icons[i];
    sound.select();
    if (id === "home") onAction({ to: "home" });
    else if (id === "trophies") onAction({ to: "trophies" });
    else if (id === "settings") onAction({ to: "settings" });
    else if (id === "music") setMusic(!music);
    else if (id === "sound") setSfx(!sfx);
    else if (id === "contact" || id === "power") {
      setSub(sub === id ? null : id);
      setSubIdx(0);
    }
  };

  const cards = 3;
  const runCard = (i: number) => {
    sound.select();
    if (i === 0) onAction({ to: "home" });
    else onAction({ to: "trophies" });
  };

  useLayer((a) => {
    if (sub) {
      if (a === "up" && subIdx > 0) (sound.move(), setSubIdx(subIdx - 1));
      else if (a === "down" && subIdx < subItems.length - 1) (sound.move(), setSubIdx(subIdx + 1));
      else if (a === "down" || a === "back" || a === "left" || a === "right") (sound.back(), setSub(null));
      else if (a === "confirm") (sound.select(), subItems[subIdx].run());
      else if (a === "home") close();
      return;
    }
    if (a === "back" || a === "home") return close();
    if (a === "up" && row === 1) (sound.move(), setRow(0), setCol(Math.min(col, cards - 1)));
    else if (a === "down" && row === 0) (sound.move(), setRow(1));
    else if (a === "left" && col > 0) (sound.move(), setCol(col - 1));
    else if (a === "right" && col < (row === 0 ? cards : icons.length) - 1) (sound.move(), setCol(col + 1));
    else if (a === "confirm") (row === 0 ? runCard(col) : runIcon(col));
  });

  const iconLabel: Record<(typeof icons)[number], string> = {
    home: t("cc.home"),
    trophies: t("cc.trophies"),
    contact: t("cc.contact"),
    music: `${t("cc.music")} · ${music ? t("on") : t("off")}`,
    sound: `${t("cc.sound")} · ${sfx ? t("on") : t("off")}`,
    settings: t("cc.settings"),
    power: t("cc.power"),
  };
  const iconName: Record<(typeof icons)[number], string> = {
    home: "home",
    trophies: "trophy",
    contact: "users",
    music: "music",
    sound: sfx ? "volume" : "mute",
    settings: "gear",
    power: "power",
  };

  const focusCard = (i: number) => document.documentElement.dataset.input === "pointer" && (setRow(0), setCol(i));
  const focusIcon = (i: number) => document.documentElement.dataset.input === "pointer" && (setRow(1), setCol(i));

  return (
    <div className={`cc ${closing ? "is-closing" : ""}`}>
      <div className="cc-backdrop" onClick={close} />
      <div className="cc-panel">
        <div className="cc-cards">
          <button className={`cc-card cc-now ${row === 0 && col === 0 ? "is-focus" : ""}`} onMouseEnter={() => focusCard(0)} onClick={() => runCard(0)}>
            {current ? (
              <>
                <CoverArt src={current.hero ?? current.cover} seed={current.id} motif={current.motif} palette={current.palette} className="cc-card-art" />
                <span className="cc-card-body">
                  <small>{t("cc.nowPlaying")}</small>
                  <Logo text={current.title} spec={current.logo} className="cc-logo" />
                </span>
              </>
            ) : (
              <span className="cc-card-body">
                <small>{t("cc.nowPlaying")}</small>
                <strong>{t("cc.onHome")}</strong>
              </span>
            )}
          </button>
          <button className={`cc-card ${row === 0 && col === 1 ? "is-focus" : ""}`} onMouseEnter={() => focusCard(1)} onClick={() => runCard(1)}>
            <span className="cc-card-icon">
              <TrophyIcon tier={lastTrophy?.tier ?? "bronze"} />
            </span>
            <span className="cc-card-body">
              <small>{t("trophy.console")}</small>
              <strong>
                {Object.keys(earned).length}/{consoleTrophies.length}
              </strong>
              <span className="cc-bar">
                <span style={{ width: `${(Object.keys(earned).length / consoleTrophies.length) * 100}%` }} />
              </span>
            </span>
          </button>
          <button className={`cc-card ${row === 0 && col === 2 ? "is-focus" : ""}`} onMouseEnter={() => focusCard(2)} onClick={() => runCard(2)}>
            <span className="cc-card-icon">
              <Icon name="bell" />
            </span>
            <span className="cc-card-body">
              <small>{t("cc.notifications")}</small>
              <strong>{lastTrophy ? `${t("trophy.earned")}: ${pick(lang, lastTrophy.name)}` : t("cc.noNotifications")}</strong>
            </span>
          </button>
        </div>
        <div className="cc-bar-row">
          <div className="cc-icons">
            {icons.map((id, i) => (
              <div key={id} className="cc-icon-wrap">
                {sub === id && (
                  <div className="menu cc-sub" role="menu">
                    {subItems.map((it, k) => (
                      <button key={it.label} role="menuitem" className={k === subIdx ? "is-focus" : ""} onMouseEnter={() => setSubIdx(k)} onClick={() => (sound.select(), it.run())}>
                        <Icon name={it.icon} />
                        <span>
                          {it.label}
                          {it.hint && <small>{it.hint}</small>}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  className={`cc-icon ${row === 1 && col === i ? "is-focus" : ""} ${(id === "music" && music) || (id === "sound" && sfx) ? "is-on" : ""}`}
                  aria-label={iconLabel[id]}
                  onMouseEnter={() => focusIcon(i)}
                  onClick={() => (setRow(1), setCol(i), runIcon(i))}
                >
                  <Icon name={iconName[id]} />
                </button>
                <span className="cc-icon-label">{iconLabel[id]}</span>
              </div>
            ))}
          </div>
          <div className="cc-status">
            <Avatar name={profile.name} size="sm" />
            <Clock />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ settings */

const themes: Theme[] = ["cosmic", "aurora", "ember", "mono"];

export function Settings({ onClose }: { onClose: () => void }) {
  const { t, lang, setLang, theme, setTheme, reducedMotion, setReducedMotion, sfx, setSfx, music, setMusic, resetTrophies } = useConsole();
  const [row, setRow] = useState(0);
  const rows = [
    {
      id: "language",
      icon: "language",
      label: t("settings.language"),
      options: [
        { label: "Türkçe", active: lang === "tr", run: () => setLang("tr" as Lang) },
        { label: "English", active: lang === "en", run: () => setLang("en" as Lang) },
      ],
    },
    {
      id: "theme",
      icon: "palette",
      label: t("settings.theme"),
      options: themes.map((th) => ({ label: t(`theme.${th}`), active: theme === th, run: () => setTheme(th), swatch: th })),
    },
    {
      id: "motion",
      icon: "motion",
      label: t("settings.motion"),
      options: [
        { label: t("settings.full"), active: !reducedMotion, run: () => setReducedMotion(false) },
        { label: t("settings.reduced"), active: reducedMotion, run: () => setReducedMotion(true) },
      ],
    },
    {
      id: "sfx",
      icon: "volume",
      label: t("cc.sound"),
      options: [
        { label: t("on"), active: sfx, run: () => setSfx(true) },
        { label: t("off"), active: !sfx, run: () => setSfx(false) },
      ],
    },
    {
      id: "music",
      icon: "music",
      label: t("cc.music"),
      options: [
        { label: t("on"), active: music, run: () => setMusic(true) },
        { label: t("off"), active: !music, run: () => setMusic(false) },
      ],
    },
    {
      id: "reset",
      icon: "restart",
      label: t("settings.reset"),
      options: [{ label: t("settings.reset"), active: false, run: () => resetTrophies() }],
    },
  ];

  const cycle = (dir: 1 | -1) => {
    const r = rows[row];
    const cur = Math.max(0, r.options.findIndex((o) => o.active));
    const next = r.options[(cur + dir + r.options.length) % r.options.length];
    if (r.id === "reset") return;
    sound.move();
    next.run();
  };

  useLayer((a) => {
    if (a === "up" && row > 0) (sound.move(), setRow(row - 1));
    else if (a === "down" && row < rows.length - 1) (sound.move(), setRow(row + 1));
    else if (a === "left") cycle(-1);
    else if (a === "right") cycle(1);
    else if (a === "confirm") {
      sound.select();
      if (rows[row].id === "reset") rows[row].options[0].run();
      else cycle(1);
    } else if (a === "back" || a === "home") (sound.back(), onClose());
  });

  return (
    <div className="sheet-wrap" onClick={(e) => e.target === e.currentTarget && (sound.back(), onClose())}>
      <div className="sheet settings" role="dialog" aria-label={t("settings.title")}>
        <header className="sheet-head">
          <Icon name="gear" />
          <h2>{t("settings.title")}</h2>
          <button className="icon-btn" onClick={() => (sound.back(), onClose())} aria-label={t("hint.back")}>
            <Icon name="plus" className="rot45" />
          </button>
        </header>
        {rows.map((r, i) => (
          <div key={r.id} className={`setting ${row === i ? "is-focus" : ""}`} onMouseEnter={() => setRow(i)}>
            <span className="setting-label">
              <Icon name={r.icon} />
              {r.label}
            </span>
            <span className="setting-options">
              {r.options.map((o) => (
                <button key={o.label} className={`opt ${o.active ? "is-active" : ""} ${"swatch" in o ? `swatch swatch-${o.swatch}` : ""}`} onClick={() => (sound.select(), setRow(i), o.run())}>
                  {"swatch" in o && <i />}
                  {o.label}
                </button>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ search */

type Result = { key: string; title: string; sub: string; icon: string; project?: Project; url?: string; sample?: boolean };

export function Search({ onClose, onProject, onLink }: { onClose: () => void; onProject: (p: Project) => void; onLink: (url: string, title: string, sample?: boolean) => void }) {
  const { t, lang } = useConsole();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  const all: Result[] = useMemo(
    () => [
      ...projects.map((p) => ({ key: p.id, title: p.title, sub: `${pick(lang, p.genre)} · ${p.tech.slice(0, 3).join(", ")}`, icon: "gamepad", project: p })),
      ...media.map((m) => ({ key: m.id, title: pick(lang, m.title), sub: `${t(`kind.${m.kind}`)} · ${pick(lang, m.summary)}`, icon: m.kind === "tutorial" ? "cap" : "book", url: m.url, sample: m.sample })),
      ...socials.map((s) => ({ key: s.id, title: s.label, sub: s.handle, icon: s.id === "blog" ? "globe" : s.id, url: s.url, sample: s.sample })),
    ],
    [lang, t],
  );
  const results = useMemo(() => {
    const n = q.trim().toLocaleLowerCase(lang);
    if (!n) return all.slice(0, 8);
    return all.filter((r) => `${r.title} ${r.sub}`.toLocaleLowerCase(lang).includes(n) || r.project?.tech.some((x) => x.toLowerCase().includes(n)));
  }, [q, all, lang]);

  const open = (r: Result) => {
    if (r.project) onProject(r.project);
    else if (r.url) (sound.select(), onLink(r.url, r.title, r.sample));
  };

  useLayer((a) => {
    if (a === "up") (setIdx((i) => Math.max(0, i - 1)), sound.move());
    else if (a === "down") (setIdx((i) => Math.min(results.length - 1, i + 1)), sound.move());
    else if (a === "confirm" && results[idx]) open(results[idx]);
    else if (a === "back" || a === "home") (sound.back(), onClose());
  });

  return (
    <div className="sheet-wrap search-wrap" onClick={(e) => e.target === e.currentTarget && (sound.back(), onClose())}>
      <div className="sheet search" role="dialog" aria-label={t("search.title")}>
        <label className="search-box">
          <Icon name="search" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            placeholder={t("search.placeholder")}
            aria-label={t("search.placeholder")}
          />
        </label>
        <div className="results">
          {results.length === 0 && <p className="muted empty">{t("search.empty")}</p>}
          {results.map((r, i) => (
            <button key={r.key} className={`result ${i === idx ? "is-focus" : ""}`} onMouseEnter={() => setIdx(i)} onClick={() => open(r)}>
              {r.project ? (
                <span className="result-art">
                  <CoverArt src={r.project.cover} seed={r.project.id} motif={r.project.motif} palette={r.project.palette} />
                </span>
              ) : (
                <span className="result-icon">
                  <Icon name={r.icon} />
                </span>
              )}
              <span className="result-text">
                <strong>{r.title}</strong>
                <small>{r.sub}</small>
              </span>
              <Icon name="chevronRight" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ link splash */

export function LinkSplash({ url, title, blocked, placeholder, onClose }: { url: string; title: string; blocked: boolean; placeholder: boolean; onClose: () => void }) {
  const { t } = useConsole();
  useEffect(() => {
    if (blocked) return;
    const id = setTimeout(onClose, placeholder ? 2200 : 1500);
    return () => clearTimeout(id);
  }, [blocked, placeholder, onClose]);
  useLayer((a) => {
    if (a === "back" || a === "home") (sound.back(), onClose());
    else if (a === "confirm" && blocked && !placeholder) {
      window.open(url, "_blank", "noopener");
      onClose();
    }
  });
  return (
    <div className="splash" onClick={onClose}>
      <div className="splash-card">
        <span className="spinner" />
        <strong>{title}</strong>
        <small>{placeholder ? t("placeholderLink") : t("leaving")}</small>
        {blocked && !placeholder && (
          <a className="btn-play" href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => (e.stopPropagation(), onClose())}>
            <Icon name="external" />
            {t("open")}
          </a>
        )}
      </div>
    </div>
  );
}
