"use client";
/** Console-wide state: language, settings, sound toggles and the visitor's own trophies. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { t as translate, type Key } from "./i18n";
import { sound } from "./sound";
import type { L, Lang, Tier } from "./types";

export type Theme = "cosmic" | "aurora" | "ember" | "mono";

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

type ConsoleState = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
  theme: Theme;
  setTheme: (t: Theme) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
  sfx: boolean;
  setSfx: (v: boolean) => void;
  music: boolean;
  setMusic: (v: boolean) => void;
  earned: Record<string, string>;
  award: (id: string) => void;
  resetTrophies: () => void;
  toasts: Toast[];
  opened: string[];
  markOpened: (projectId: string) => void;
};

const Ctx = createContext<ConsoleState | null>(null);
const STORE = "afu-console.v1";

type Saved = { lang?: Lang; theme?: Theme; reducedMotion?: boolean; sfx?: boolean; earned?: Record<string, string>; opened?: string[] };

function load(): Saved {
  try {
    return JSON.parse(localStorage.getItem(STORE) || "{}") as Saved;
  } catch {
    return {};
  }
}

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("tr");
  const [theme, setTheme] = useState<Theme>("cosmic");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [sfx, setSfxState] = useState(true);
  const [music, setMusicState] = useState(false);
  const [earned, setEarned] = useState<Record<string, string>>({});
  const [opened, setOpened] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const ready = useRef(false);
  const toastKey = useRef(0);

  useEffect(() => {
    const s = load();
    const browserLang: Lang = navigator.language?.toLowerCase().startsWith("tr") ? "tr" : "en";
    setLangState(s.lang ?? browserLang);
    if (s.theme) setTheme(s.theme);
    setReducedMotion(s.reducedMotion ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (s.sfx === false) {
      setSfxState(false);
      sound.sfx = false;
    }
    if (s.earned) setEarned(s.earned);
    if (s.opened) setOpened(s.opened);
    ready.current = true;
  }, []);

  useEffect(() => {
    if (!ready.current) return;
    try {
      localStorage.setItem(STORE, JSON.stringify({ lang, theme, reducedMotion, sfx, earned, opened }));
    } catch {
      /* storage unavailable: settings just won't persist */
    }
  }, [lang, theme, reducedMotion, sfx, earned, opened]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dataset.consoleTheme = theme;
    document.documentElement.dataset.motion = reducedMotion ? "reduced" : "full";
  }, [lang, theme, reducedMotion]);

  const earnedRef = useRef(earned);
  earnedRef.current = earned;
  const openedRef = useRef(opened);
  openedRef.current = opened;

  const award = useCallback((id: string) => {
    const prev = earnedRef.current;
    if (prev[id]) return;
    const next = { ...prev, [id]: new Date().toISOString() };
    const queue = [id];
    const others = consoleTrophies.filter((x) => x.id !== "platinum");
    if (!next.platinum && others.every((x) => next[x.id])) {
      next.platinum = new Date().toISOString();
      queue.push("platinum");
    }
    earnedRef.current = next;
    setEarned(next);
    queue.forEach((tid, i) => {
      const key = ++toastKey.current;
      setTimeout(() => {
        sound.trophy();
        setToasts((ts) => [...ts, { key, id: tid }]);
        setTimeout(() => setToasts((ts) => ts.filter((x) => x.key !== key)), 4600);
      }, 350 + i * 2200);
    });
  }, []);

  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      award("polyglot");
    },
    [award],
  );

  const markOpened = useCallback(
    (projectId: string) => {
      const prev = openedRef.current;
      const next = prev.includes(projectId) ? prev : [...prev, projectId];
      openedRef.current = next;
      setOpened(next);
      award("first-play");
      if (next.length >= 3) award("explorer");
    },
    [award],
  );

  const value = useMemo<ConsoleState>(
    () => ({
      lang,
      setLang,
      t: (k: Key) => translate(lang, k),
      theme,
      setTheme,
      reducedMotion,
      setReducedMotion,
      sfx,
      setSfx: (v) => {
        sound.sfx = v;
        setSfxState(v);
      },
      music,
      setMusic: (v) => {
        sound.setMusic(v);
        setMusicState(v);
      },
      earned,
      award,
      resetTrophies: () => {
        setEarned({});
        setOpened([]);
      },
      toasts,
      opened,
      markOpened,
    }),
    [lang, setLang, theme, reducedMotion, sfx, music, earned, award, toasts, opened, markOpened],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConsole() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConsole must be used inside ConsoleProvider");
  return c;
}
