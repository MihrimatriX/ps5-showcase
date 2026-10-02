"use client";
/** Control center, the Create menu, the idle dimmer and the "opening a link" splash. */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { profile, projects, socials } from "@/content/portfolio";
import { consoleTrophies, useConsole, useNotifications, useNowPlaying } from "@/lib/console";
import { pick } from "@/lib/i18n";
import { useLayer } from "@/lib/input";
import { sound, tracks } from "@/lib/sound";
import type { Project } from "@/lib/types";
import { CoverArt } from "./CoverArt";
import { Icon, TrophyIcon } from "./Icons";
import { Avatar, Clock, Logo, Switch, timeAgo } from "./ui";

export type CCAction =
  | { to: "home" }
  | { to: "trophies" }
  | { to: "settings" }
  | { to: "game"; project: Project }
  | { to: "power"; mode: "rest" | "off" | "restart" }
  | { to: "link"; url: string; title: string; sample?: boolean };

const icons = ["home", "switcher", "notifications", "gamebase", "music", "accessibility", "sound", "power"] as const;
type IconId = (typeof icons)[number];

type PItem = {
  key: string;
  label: string;
  hint?: string;
  icon?: string;
  art?: ReactNode;
  /** Shows a switch; confirm flips it. */
  toggle?: boolean;
  /** Shows a 0..max bar; left/right change it. */
  slider?: { value: number; max: number; set: (v: number) => void };
  run?: () => void;
};

export function ControlCenter({ current, onClose, onAction, startIn }: { current: Project | null; onClose: () => void; onAction: (a: CCAction) => void; startIn?: "contact" }) {
  const c = useConsole();
  const { t, lang, earned } = c;
  const notes = useNotifications();
  const playing = useNowPlaying();
  const x = (tr: string, en: string) => (lang === "tr" ? tr : en);
  const [row, setRow] = useState(1);
  const [col, setCol] = useState(startIn === "contact" ? icons.indexOf("gamebase") : 0);
  const [sub, setSub] = useState<IconId | null>(startIn === "contact" ? "gamebase" : null);
  const [subIdx, setSubIdx] = useState(0);
  const [closing, setClosing] = useState(false);
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);

  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean; addEventListener: (e: string, f: () => void) => void }> };
    let alive = true;
    nav.getBattery?.()
      .then((b) => {
        const upd = () => alive && setBattery({ level: b.level, charging: b.charging });
        upd();
        b.addEventListener("levelchange", upd);
        b.addEventListener("chargingchange", upd);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Opening the notifications list marks them as read.
  useEffect(() => {
    if (sub === "notifications" && notes.unread) c.markSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub]);

  const close = () => {
    sound.back();
    setClosing(true);
    setTimeout(onClose, 220);
  };

  const recent = useMemo(() => c.opened.map((id) => projects.find((p) => p.id === id)).filter(Boolean) as Project[], [c.opened]);
  const musicName = playing.theme ? `${projects.find((p) => p.id === playing.theme)?.title ?? ""} · ${x("Tema", "Theme")}` : pick(lang, tracks[playing.track].name);

  const items: Record<IconId, PItem[]> = {
    home: [],
    switcher: recent.length
      ? recent.slice(0, 5).map((p) => ({
          key: p.id,
          label: p.title,
          hint: pick(lang, p.genre),
          art: <CoverArt src={p.cover} seed={p.id} motif={p.motif} palette={p.palette} />,
          run: () => onAction({ to: "game", project: p }),
        }))
      : [{ key: "none", label: x("Henüz bir oyun açmadın", "You haven't opened a game yet"), hint: x("Ana ekrana dön", "Go to the home screen"), icon: "home", run: () => onAction({ to: "home" }) }],
    notifications: [
      ...(notes.list.length
        ? notes.list.slice(0, 5).map((n) => ({
            key: n.id,
            label: pick(lang, n.trophy.name),
            hint: `${t("trophy.earned")} · ${timeAgo(n.at, lang)}`,
            art: (
              <span className={`pop-trophy tier-${n.trophy.tier}`}>
                <TrophyIcon tier={n.trophy.tier} />
              </span>
            ),
            run: () => onAction({ to: "trophies" }),
          }))
        : [{ key: "none", label: t("cc.noNotifications"), icon: "bell" }]),
      ...(notes.list.length ? [{ key: "clear", label: x("Tümünü temizle", "Clear all"), icon: "plus", run: () => c.clearNotifications() }] : []),
    ],
    gamebase: socials.map((s) => ({ key: s.id, label: s.label, hint: s.handle, icon: s.id === "blog" ? "globe" : s.id, run: () => onAction({ to: "link", url: s.url, title: s.label, sample: s.sample }) })),
    music: [
      { key: "play", label: c.music ? x("Duraklat", "Pause") : x("Çal", "Play"), hint: musicName, icon: c.music ? "pause" : "play", run: () => c.setMusic(!c.music) },
      { key: "next", label: x("Sonraki parça", "Next track"), hint: pick(lang, tracks[(playing.track + 1) % tracks.length].name), icon: "next", run: () => sound.nextTrack(1) },
      { key: "themes", label: x("Oyun temaları", "Game themes"), toggle: c.gameThemes, run: () => c.setPref("gameThemes", !c.gameThemes) },
    ],
    accessibility: [
      { key: "motion", label: x("Hareketi azalt", "Reduce motion"), toggle: c.reducedMotion, run: () => c.setPref("reducedMotion", !c.reducedMotion) },
      { key: "contrast", label: x("Yüksek kontrast", "High contrast"), toggle: c.contrast, run: () => c.setPref("contrast", !c.contrast) },
      { key: "text", label: x("Büyük yazı", "Large text"), toggle: c.textSize === "large", run: () => c.setPref("textSize", c.textSize === "large" ? "normal" : "large") },
    ],
    sound: [
      { key: "volume", label: x("Ses seviyesi", "Volume"), icon: c.volume ? "volume" : "mute", slider: { value: c.volume, max: 10, set: (v) => (c.setPref("volume", v), sound.move()) } },
      { key: "sfx", label: t("cc.sound"), toggle: c.sfx, run: () => c.setPref("sfx", !c.sfx) },
      { key: "settings", label: x("Ses ayarları", "Sound settings"), icon: "gear", run: () => onAction({ to: "settings" }) },
    ],
    power: [
      { key: "rest", label: t("power.rest"), icon: "moon", run: () => onAction({ to: "power", mode: "rest" }) },
      { key: "off", label: t("power.off"), icon: "power", run: () => onAction({ to: "power", mode: "off" }) },
      { key: "restart", label: t("power.restart"), icon: "restart", run: () => onAction({ to: "power", mode: "restart" }) },
    ],
  };
  const subItems = sub ? items[sub] : [];

  const iconLabel: Record<IconId, string> = {
    home: t("cc.home"),
    switcher: x("Değiştirici", "Switcher"),
    notifications: t("cc.notifications"),
    gamebase: t("cc.contact"),
    music: t("cc.music"),
    accessibility: x("Erişilebilirlik", "Accessibility"),
    sound: x("Ses", "Sound"),
    power: t("cc.power"),
  };
  const iconName: Record<IconId, string> = {
    home: "home",
    switcher: "switcher",
    notifications: "bell",
    gamebase: "users",
    music: "music",
    accessibility: "accessibility",
    sound: c.volume && c.sfx ? "volume" : "mute",
    power: "power",
  };

  const runIcon = (i: number) => {
    const id = icons[i];
    sound.select();
    if (id === "home") return onAction({ to: "home" });
    setSub(sub === id ? null : id);
    setSubIdx(0);
  };

  const runItem = (it: PItem) => {
    if (it.slider) return;
    if (!it.run) return sound.error();
    sound.select();
    it.run();
  };

  const cards = 3;
  const runCard = (i: number) => {
    sound.select();
    if (i === 0) current ? onClose() : onAction({ to: "home" });
    else if (i === 1) onAction({ to: "trophies" });
    else c.setMusic(!c.music);
  };

  useLayer((a) => {
    if (sub) {
      const it = subItems[subIdx];
      if (a === "up" && subIdx > 0) (sound.move(), setSubIdx(subIdx - 1));
      else if (a === "down" && subIdx < subItems.length - 1) (sound.move(), setSubIdx(subIdx + 1));
      else if ((a === "left" || a === "right") && it?.slider) {
        const v = Math.max(0, Math.min(it.slider.max, it.slider.value + (a === "left" ? -1 : 1)));
        if (v !== it.slider.value) it.slider.set(v);
      } else if (a === "left" || a === "right") {
        // Move to the neighbouring icon and open its card, like sliding along the bar.
        const n = col + (a === "left" ? -1 : 1);
        if (n >= 0 && n < icons.length) {
          sound.move();
          setCol(n);
          setSub(icons[n] === "home" ? null : icons[n]);
          setSubIdx(0);
        }
      } else if (a === "down" || a === "back") (sound.back(), setSub(null));
      else if (a === "confirm" && it) runItem(it);
      else if (a === "home") close();
      return;
    }
    if (a === "back" || a === "home") return close();
    if (a === "up" && row === 1) (sound.move(), setRow(0), setCol(Math.min(col, cards - 1)));
    else if (a === "down" && row === 0) (sound.move(), setRow(1));
    else if (a === "left" && col > 0) (sound.move(), setCol(col - 1));
    else if (a === "right" && col < (row === 0 ? cards : icons.length) - 1) (sound.move(), setCol(col + 1));
    else if (a === "confirm") row === 0 ? runCard(col) : runIcon(col);
  });

  const pointer = () => document.documentElement.dataset.input === "pointer";
  const focusCard = (i: number) => pointer() && !sub && (setRow(0), setCol(i));
  const focusIcon = (i: number) => pointer() && !sub && (setRow(1), setCol(i));
  const consoleEarned = Object.keys(earned).length;

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
              <>
                <span className="cc-card-icon">
                  <Icon name="home" />
                </span>
                <span className="cc-card-body">
                  <small>{t("cc.nowPlaying")}</small>
                  <strong>{t("cc.onHome")}</strong>
                </span>
              </>
            )}
          </button>
          <button className={`cc-card ${row === 0 && col === 1 ? "is-focus" : ""}`} onMouseEnter={() => focusCard(1)} onClick={() => runCard(1)}>
            <span className="cc-card-icon">
              <TrophyIcon tier={consoleEarned === consoleTrophies.length ? "platinum" : consoleEarned > 4 ? "gold" : "bronze"} />
            </span>
            <span className="cc-card-body">
              <small>{t("trophy.console")}</small>
              <strong>
                {consoleEarned}/{consoleTrophies.length}
              </strong>
              <span className="level-bar cc-bar">
                <span style={{ width: `${(consoleEarned / consoleTrophies.length) * 100}%` }} />
              </span>
            </span>
          </button>
          <button className={`cc-card cc-music ${c.music ? "is-playing" : ""} ${row === 0 && col === 2 ? "is-focus" : ""}`} onMouseEnter={() => focusCard(2)} onClick={() => runCard(2)}>
            <span className="cc-card-icon">
              <Icon name={c.music ? "pause" : "play"} />
            </span>
            <span className="cc-card-body">
              <small>{t("cc.music")}</small>
              <strong>{musicName}</strong>
              <span className="eq" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </span>
            </span>
          </button>
        </div>
        <div className="cc-bar-row">
          <div className="cc-icons">
            {icons.map((id, i) => (
              <div key={id} className="cc-icon-wrap">
                {sub === id && (
                  <div className="cc-pop" role="menu" aria-label={iconLabel[id]}>
                    <h4>{iconLabel[id]}</h4>
                    {items[id].map((it, k) => (
                      <button
                        key={it.key}
                        role="menuitem"
                        className={`cc-pop-item ${k === subIdx ? "is-focus" : ""} ${it.run || it.slider ? "" : "is-static"}`}
                        onMouseEnter={() => setSubIdx(k)}
                        onClick={(e) => {
                          setSubIdx(k);
                          if (it.slider) {
                            const r = (e.currentTarget.querySelector(".cc-slider") as HTMLElement | null)?.getBoundingClientRect();
                            if (r) it.slider.set(Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * it.slider.max));
                          } else runItem(it);
                        }}
                      >
                        {it.art ? <span className="cc-pop-art">{it.art}</span> : it.icon ? <Icon name={it.icon} className={it.icon === "plus" ? "rot45" : ""} /> : null}
                        <span className="cc-pop-text">
                          {it.label}
                          {it.hint && <small>{it.hint}</small>}
                          {it.slider && (
                            <span className="cc-slider">
                              <span style={{ width: `${(it.slider.value / it.slider.max) * 100}%` }} />
                            </span>
                          )}
                        </span>
                        {it.toggle !== undefined && <Switch on={it.toggle} />}
                        {it.slider && <b className="cc-pop-num">{it.slider.value}</b>}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  className={`cc-icon ${row === 1 && col === i ? "is-focus" : ""} ${sub === id ? "is-open" : ""} ${id === "music" && c.music ? "is-on" : ""}`}
                  aria-label={iconLabel[id]}
                  onMouseEnter={() => focusIcon(i)}
                  onClick={() => (setRow(1), setCol(i), runIcon(i))}
                >
                  <Icon name={iconName[id]} />
                  {id === "notifications" && notes.unread > 0 && <span className="cc-badge">{notes.unread}</span>}
                </button>
                <span className="cc-icon-label">{iconLabel[id]}</span>
              </div>
            ))}
          </div>
          <div className="cc-status">
            <Avatar name={profile.name} size="sm" />
            {battery && (
              <span className={`cc-battery ${battery.charging ? "is-charging" : ""}`} title={`${Math.round(battery.level * 100)}%`}>
                <Icon name="battery" />
                <i style={{ width: `${battery.level * 62}%` }} />
              </span>
            )}
            <Clock />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ create menu */

/** The Create button's menu. There is no game footage to capture, so it shares the console instead. */
export function CreateMenu({ onClose, title }: { onClose: () => void; title: string }) {
  const { lang } = useConsole();
  const x = (tr: string, en: string) => (lang === "tr" ? tr : en);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState<string | null>(null);
  const url = typeof location !== "undefined" ? location.href.split("#")[0] : "";
  const canShare = typeof navigator !== "undefined" && !!navigator.share;
  const items = [
    {
      key: "copy",
      icon: "link",
      label: x("Bağlantıyı kopyala", "Copy link"),
      run: async () => {
        try {
          await navigator.clipboard.writeText(url);
          setDone(x("Bağlantı panoya kopyalandı", "Link copied to the clipboard"));
        } catch {
          setDone(url);
        }
      },
    },
    ...(canShare
      ? [
          {
            key: "share",
            icon: "share",
            label: x("Paylaş", "Share"),
            run: async () => {
              try {
                await navigator.share({ title, url });
                onClose();
              } catch {
                /* cancelled */
              }
            },
          },
        ]
      : []),
    {
      key: "full",
      icon: "fullscreen",
      label: x("Tam ekran", "Full screen"),
      run: async () => {
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else await document.documentElement.requestFullscreen();
          onClose();
        } catch {
          setDone(x("Tarayıcı tam ekrana izin vermedi", "The browser refused full screen"));
        }
      },
    },
  ];
  useLayer((a) => {
    if (a === "left" && idx > 0) (sound.move(), setIdx(idx - 1));
    else if (a === "right" && idx < items.length - 1) (sound.move(), setIdx(idx + 1));
    else if (a === "confirm") (sound.select(), void items[idx].run());
    else if (a === "back" || a === "home" || a === "down") (sound.back(), onClose());
  });
  return (
    <div className="create" onClick={(e) => e.target === e.currentTarget && (sound.back(), onClose())}>
      <div className="create-bar">
        <span className="create-title">
          <Icon name="camera" />
          {x("Oluştur", "Create")}
        </span>
        <div className="create-items">
          {items.map((it, i) => (
            <button key={it.key} className={`create-item ${i === idx ? "is-focus" : ""}`} onMouseEnter={() => setIdx(i)} onClick={() => (sound.select(), void it.run())}>
              <span className="create-icon">
                <Icon name={it.icon} />
              </span>
              <span>{it.label}</span>
            </button>
          ))}
        </div>
        {done && <span className="create-done">{done}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ idle dimmer */

/** The screen dims after a while without input; the first press only wakes it. */
export function Dimmer({ onWake }: { onWake: () => void }) {
  useLayer(() => onWake());
  return <div className="dimmer" onPointerDown={onWake} onWheel={onWake} />;
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
