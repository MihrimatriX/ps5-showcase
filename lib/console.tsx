"use client";
/** Console-wide state: language, settings, sound toggles and the visitor's own trophies. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { t as translate, type Key } from "./i18n";
import { rumble } from "./input";
import { sound } from "./sound";
import type { L, Lang, Tier } from "./types";

export type Theme = "cosmic" | "aurora" | "ember" | "mono";
export type User = "owner" | "guest" | "recruiter";

/** Everything the Settings app can change; persisted in localStorage. */
export type Prefs = {
  lang: Lang;
  theme: Theme;
  reducedMotion: boolean;
  sfx: boolean;
  music: boolean;
  /** 0..10 */
  volume: number;
  textSize: "normal" | "large";
  contrast: boolean;
  clock24: boolean;
  /** Minutes of inactivity before the screen dims; 0 = never. */
  idleDim: number;
  /** Show pop-up notifications (trophies are still earned and logged). */
  popups: boolean;
  haptics: boolean;
  /** Play each game's theme while its tile is focused (when music is on). */
  gameThemes: boolean;
  /** Animated wave field behind system screens. */
  waves: boolean;
};

export const defaultPrefs: Prefs = {
  lang: "tr",
  theme: "cosmic",
  reducedMotion: false,
  sfx: true,
  music: false,
  volume: 8,
  textSize: "normal",
  contrast: false,
  clock24: true,
  idleDim: 5,
  popups: true,
  haptics: true,
  gameThemes: true,
  waves: true,
};

export const consoleTrophies: { id: string; tier: Tier; name: L; detail: L }[] = [
  { id: "hello", tier: "bronze", name: { tr: "Hoş geldin", en: "Welcome" }, detail: { tr: "Konsola giriş yaptın", en: "Signed in to the console" } },
  { id: "first-play", tier: "bronze", name: { tr: "İlk oyun", en: "First game" }, detail: { tr: "Bir proje başlattın", en: "Started a project" } },
  { id: "explorer", tier: "silver", name: { tr: "Kaşif", en: "Explorer" }, detail: { tr: "Üç farklı proje açtın", en: "Opened three different projects" } },
  { id: "curious", tier: "bronze", name: { tr: "Meraklı", en: "Curious" }, detail: { tr: "Profili inceledin", en: "Checked out the profile" } },
  { id: "librarian", tier: "bronze", name: { tr: "Kütüphaneci", en: "Librarian" }, detail: { tr: "Kütüphaneye göz attın", en: "Browsed the library" } },
  { id: "reader", tier: "bronze", name: { tr: "Okur", en: "Reader" }, detail: { tr: "Medya sekmesine geçtin", en: "Switched to the media tab" } },
  { id: "polyglot", tier: "bronze", name: { tr: "Çok dilli", en: "Polyglot" }, detail: { tr: "Dili değiştirdin", en: "Changed the language" } },
  { id: "power-nap", tier: "silver", name: { tr: "Şekerleme", en: "Power nap" }, detail: { tr: "Dinlenme moduna girdin", en: "Entered rest mode" } },
  { id: "platinum", tier: "platinum", name: { tr: "Tam tur", en: "Grand tour" }, detail: { tr: "Tüm konsol kupalarını topladın", en: "Collected every console trophy" } },
];

export type Toast = { key: number; id: string };

type ConsoleState = Prefs & {
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void;
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
  setTheme: (t: Theme) => void;
  setReducedMotion: (v: boolean) => void;
  setSfx: (v: boolean) => void;
  setMusic: (v: boolean) => void;
  earned: Record<string, string>;
  award: (id: string) => void;
  resetTrophies: () => void;
  resetAll: () => void;
  toasts: Toast[];
  opened: string[];
  markOpened: (projectId: string) => void;
  /** Notifications read up to this ISO time; newer trophies count as unread. */
  seenAt: string;
  markSeen: () => void;
  clearedAt: string;
  clearNotifications: () => void;
  user: User;
  setUser: (u: User) => void;
};

const Ctx = createContext<ConsoleState | null>(null);
const STORE = "afu-console.v1";

type Saved = Partial<Prefs> & { earned?: Record<string, string>; opened?: string[]; seenAt?: string; clearedAt?: string };

function load(): Saved {
  try {
    return JSON.parse(localStorage.getItem(STORE) || "{}") as Saved;
  } catch {
    return {};
  }
}

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [earned, setEarned] = useState<Record<string, string>>({});
  const [opened, setOpened] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [seenAt, setSeenAt] = useState("");
  const [clearedAt, setClearedAt] = useState("");
  const [user, setUser] = useState<User>("owner");
  const ready = useRef(false);
  const toastKey = useRef(0);

  useEffect(() => {
    const s = load();
    const browserLang: Lang = navigator.language?.toLowerCase().startsWith("tr") ? "tr" : "en";
    const { earned: e, opened: o, seenAt: sa, clearedAt: ca, ...saved } = s;
    const next: Prefs = {
      ...defaultPrefs,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      lang: browserLang,
      ...(saved as Partial<Prefs>),
    };
    // Music needs a user gesture; it is started from the boot screen if the preference is on.
    setPrefs(next);
    sound.sfx = next.sfx;
    sound.setVolume(next.volume / 10);
    if (e) setEarned(e);
    if (o) setOpened(o);
    if (sa) setSeenAt(sa);
    if (ca) setClearedAt(ca);
    ready.current = true;
  }, []);

  useEffect(() => {
    if (!ready.current) return;
    try {
      localStorage.setItem(STORE, JSON.stringify({ ...prefs, earned, opened, seenAt, clearedAt }));
    } catch {
      /* storage unavailable: settings just won't persist */
    }
  }, [prefs, earned, opened, seenAt, clearedAt]);

  useEffect(() => {
    const d = document.documentElement;
    d.lang = prefs.lang;
    d.dataset.consoleTheme = prefs.theme;
    d.dataset.motion = prefs.reducedMotion ? "reduced" : "full";
    d.dataset.text = prefs.textSize;
    d.dataset.contrast = prefs.contrast ? "high" : "normal";
    d.dataset.haptics = prefs.haptics ? "on" : "off";
    d.dataset.waves = prefs.waves ? "on" : "off";
  }, [prefs]);

  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const earnedRef = useRef(earned);
  earnedRef.current = earned;
  const openedRef = useRef(opened);
  openedRef.current = opened;

  const setPref = useCallback(<K extends keyof Prefs>(k: K, v: Prefs[K]) => {
    if (k === "sfx") sound.sfx = v as boolean;
    if (k === "volume") sound.setVolume((v as number) / 10);
    if (k === "music") {
      sound.unlock();
      sound.setMusic(v as boolean);
    }
    setPrefs((p) => ({ ...p, [k]: v }));
  }, []);

  const award = useCallback((id: string) => {
    const prev = earnedRef.current;
    if (prev[id]) return;
    const next = { ...prev, [id]: new Date().toISOString() };
    const queue = [id];
    const others = consoleTrophies.filter((x) => x.id !== "platinum");
    if (!next.platinum && others.every((x) => next[x.id])) {
      next.platinum = new Date(Date.now() + 1).toISOString();
      queue.push("platinum");
    }
    earnedRef.current = next;
    setEarned(next);
    if (!prefsRef.current.popups) return;
    queue.forEach((tid, i) => {
      const key = ++toastKey.current;
      setTimeout(() => {
        sound.trophy();
        rumble(180, 0.3, 0.8);
        setToasts((ts) => [...ts, { key, id: tid }]);
        setTimeout(() => setToasts((ts) => ts.filter((x) => x.key !== key)), 4600);
      }, 350 + i * 2200);
    });
  }, []);

  const setLang = useCallback(
    (l: Lang) => {
      setPref("lang", l);
      award("polyglot");
    },
    [award, setPref],
  );

  const markOpened = useCallback(
    (projectId: string) => {
      const prev = openedRef.current;
      // Most recent first, like the switcher.
      const next = [projectId, ...prev.filter((x) => x !== projectId)];
      openedRef.current = next;
      setOpened(next);
      award("first-play");
      if (next.length >= 3) award("explorer");
    },
    [award],
  );

  const value = useMemo<ConsoleState>(
    () => ({
      ...prefs,
      prefs,
      setPref,
      setLang,
      t: (k: Key) => translate(prefs.lang, k),
      setTheme: (v) => setPref("theme", v),
      setReducedMotion: (v) => setPref("reducedMotion", v),
      setSfx: (v) => setPref("sfx", v),
      setMusic: (v) => setPref("music", v),
      earned,
      award,
      resetTrophies: () => {
        earnedRef.current = {};
        openedRef.current = [];
        setEarned({});
        setOpened([]);
        setSeenAt("");
        setClearedAt("");
      },
      resetAll: () => {
        try {
          localStorage.removeItem(STORE);
        } catch {
          /* ignore */
        }
        earnedRef.current = {};
        openedRef.current = [];
        setEarned({});
        setOpened([]);
        setSeenAt("");
        setClearedAt("");
        sound.setMusic(false);
        sound.sfx = true;
        sound.setVolume(defaultPrefs.volume / 10);
        setPrefs({ ...defaultPrefs, lang: prefsRef.current.lang });
      },
      toasts,
      opened,
      markOpened,
      seenAt,
      markSeen: () => setSeenAt(new Date().toISOString()),
      clearedAt,
      clearNotifications: () => {
        const now = new Date().toISOString();
        setClearedAt(now);
        setSeenAt(now);
      },
      user,
      setUser,
    }),
    [prefs, setPref, setLang, earned, award, toasts, opened, markOpened, seenAt, clearedAt, user],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** What the music engine is doing right now (re-renders when the track, theme or on/off state changes). */
export function useNowPlaying() {
  const [, force] = useState(0);
  useEffect(() => sound.subscribe(() => force((n) => n + 1)), []);
  return { on: sound.music, track: sound.track, theme: sound.theme };
}

/** Earned console trophies as notifications, newest first. */
export function useNotifications() {
  const { earned, seenAt, clearedAt } = useConsole();
  return useMemo(() => {
    const list = Object.entries(earned)
      .filter(([, at]) => !clearedAt || at > clearedAt)
      .sort((a, b) => b[1].localeCompare(a[1]))
      .map(([id, at]) => ({ id, at, trophy: consoleTrophies.find((x) => x.id === id) }))
      .filter((n): n is { id: string; at: string; trophy: (typeof consoleTrophies)[number] } => !!n.trophy);
    const unread = list.filter((n) => !seenAt || n.at > seenAt).length;
    return { list, unread };
  }, [earned, seenAt, clearedAt]);
}

export function useConsole() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConsole must be used inside ConsoleProvider");
  return c;
}
