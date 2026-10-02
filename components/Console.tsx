"use client";
/** The console itself: which screen is up, the overlays on top of it, and the transitions between them. */
import { useCallback, useEffect, useRef, useState } from "react";
import { ConsoleProvider, useConsole } from "@/lib/console";
import { InputProvider } from "@/lib/input";
import { sound } from "@/lib/sound";
import type { Project } from "@/lib/types";
import { CoverArt } from "./CoverArt";
import { ControlCenter, LinkSplash, Search, Settings, type CCAction } from "./Overlays";
import { Home, initialHome, type HomeNav, type HomeState } from "./screens/Home";
import { GameHub, LibraryPage, ProfilePage, TrophiesPage, type PageNav } from "./screens/Pages";
import { BootScreen, OffScreen, UserSelect } from "./screens/System";
import { HomeButton, Logo, TrophyToasts, useParallax } from "./ui";

type Screen =
  | { name: "boot" }
  | { name: "off"; mode: "off" | "rest" | "shutdown" }
  | { name: "users" }
  | { name: "home" }
  | { name: "game"; project: Project }
  | { name: "profile" }
  | { name: "trophies" }
  | { name: "library" };

type Launch = { project: Project; rect: { x: number; y: number; w: number; h: number }; phase: "grow" | "splash" | "out" };
type Splash = { url: string; title: string; blocked: boolean; placeholder: boolean };

export default function App() {
  return (
    <InputProvider>
      <ConsoleProvider>
        <Console />
      </ConsoleProvider>
    </InputProvider>
  );
}

function Console() {
  const { award, markOpened, t } = useConsole();
  useParallax();
  const [screen, setScreen] = useState<Screen>({ name: "boot" });
  const [stack, setStack] = useState<Screen[]>([]);
  const [home, setHome] = useState<HomeState>(initialHome);
  const [cc, setCc] = useState<null | { startIn?: "contact" }>(null);
  const [settings, setSettings] = useState(false);
  const [search, setSearch] = useState(false);
  const [splash, setSplash] = useState<Splash | null>(null);
  const [launch, setLaunch] = useState<Launch | null>(null);
  const [screenKey, setScreenKey] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const screenRef = useRef(screen);
  screenRef.current = screen;
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const setStackNow = (next: Screen[]) => {
    stackRef.current = next;
    setStack(next);
  };

  const go = useCallback((next: Screen, push = true) => {
    const cur = screenRef.current;
    if (push && cur.name !== "boot" && cur.name !== "off" && cur.name !== "users") setStackNow([...stackRef.current.slice(-10), cur]);
    screenRef.current = next;
    setScreen(next);
    setScreenKey((k) => k + 1);
  }, []);

  const back = useCallback(() => {
    const s = stackRef.current;
    const prev: Screen = s[s.length - 1] ?? { name: "home" };
    setStackNow(s.slice(0, -1));
    screenRef.current = prev;
    setScreen(prev);
    setScreenKey((k) => k + 1);
  }, []);

  const toHome = useCallback(() => {
    setStackNow([]);
    go({ name: "home" }, false);
  }, [go]);

  /** Grow the focused tile to full screen, show the title card, then open the game hub. */
  const launchGame = useCallback(
    (project: Project) => {
      if (launch) return;
      const el = document.querySelector<HTMLElement>("[data-launch-src] .tile-box") ?? document.querySelector<HTMLElement>('[data-focus="true"]');
      const r = el?.getBoundingClientRect();
      const rect = r ? { x: r.left, y: r.top, w: r.width, h: r.height } : { x: window.innerWidth / 2 - 60, y: window.innerHeight / 2 - 60, w: 120, h: 120 };
      sound.open();
      setCc(null);
      setSearch(false);
      setLaunch({ project, rect, phase: "grow" });
      later(() => setLaunch((l) => l && { ...l, phase: "splash" }), 60);
      later(() => {
        go({ name: "game", project });
        markOpened(project.id);
        setLaunch((l) => l && { ...l, phase: "out" });
      }, 1500);
      later(() => setLaunch(null), 2100);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [launch, go, markOpened],
  );

  const openLink = useCallback((url: string, title: string, sample?: boolean) => {
    const placeholder = !url || url === "#";
    let blocked = false;
    if (!placeholder) {
      const w = window.open(url, "_blank");
      if (w) w.opener = null;
      else blocked = true;
    } else sound.error();
    setSplash({ url, title, blocked, placeholder: placeholder || false });
    void sample;
  }, []);

  const onHomeNav = (n: HomeNav) => {
    switch (n.to) {
      case "game":
        return launchGame(n.project);
      case "profile":
      case "trophies":
      case "library":
        sound.select();
        return go({ name: n.to });
      case "link":
        return openLink(n.url, n.title, n.sample);
      case "search":
        sound.select();
        return setSearch(true);
      case "settings":
        sound.select();
        return setSettings(true);
      case "cc":
        sound.select();
        return setCc({});
    }
  };

  const onPageNav = (n: PageNav) => {
    switch (n.to) {
      case "game":
        return launchGame(n.project);
      case "link":
        return openLink(n.url, n.title, n.sample);
      case "trophies":
        return go({ name: "trophies" });
      case "contact":
        return setCc({ startIn: "contact" });
      case "cc":
        sound.select();
        return setCc({});
      case "back":
        return back();
    }
  };

  const onCC = (a: CCAction) => {
    switch (a.to) {
      case "home":
        setCc(null);
        return toHome();
      case "trophies":
        setCc(null);
        return go({ name: "trophies" });
      case "settings":
        setCc(null);
        return setSettings(true);
      case "link":
        return openLink(a.url, a.title, a.sample);
      case "power":
        setCc(null);
        setStackNow([]);
        if (a.mode === "rest") {
          award("power-nap");
          // Let the trophy toast show before the screen goes dark.
          later(() => go({ name: "off", mode: "rest" }, false), 2600);
        } else if (a.mode === "off") go({ name: "off", mode: "shutdown" }, false);
        else go({ name: "boot" }, false);
        sound.setMusic(false);
    }
  };

  const current = screen.name === "game" ? screen.project : null;
  const showHomeButton = !["boot", "off", "users"].includes(screen.name) && !cc;

  let view: React.ReactNode;
  switch (screen.name) {
    case "boot":
      view = <BootScreen onDone={() => go({ name: "users" }, false)} />;
      break;
    case "off":
      view = <OffScreen mode={screen.mode} onWake={() => go({ name: "boot" }, false)} />;
      break;
    case "users":
      view = (
        <UserSelect
          onPick={(who) => {
            award("hello");
            if (who === "recruiter") {
              setStackNow([{ name: "home" }]);
              go({ name: "profile" }, false);
            } else {
              setStackNow([]);
              go({ name: "home" }, false);
            }
          }}
        />
      );
      break;
    case "home":
      view = <Home state={home} setState={(fn) => setHome(fn)} onNav={onHomeNav} />;
      break;
    case "game":
      view = <GameHub project={screen.project} onNav={onPageNav} />;
      break;
    case "profile":
      view = <ProfilePage onNav={onPageNav} />;
      break;
    case "trophies":
      view = <TrophiesPage onNav={onPageNav} />;
      break;
    case "library":
      view = <LibraryPage onNav={onPageNav} />;
      break;
  }

  return (
    <div className="console">
      <div className={`stage stage-${screen.name}`} key={screenKey}>
        {view}
      </div>
      {launch && <LaunchFx launch={launch} />}
      {showHomeButton && <HomeButton onClick={() => (sound.select(), setCc({}))} />}
      {cc && <ControlCenter current={current} startIn={cc.startIn} onClose={() => setCc(null)} onAction={onCC} />}
      {settings && <Settings onClose={() => setSettings(false)} />}
      {search && (
        <Search
          onClose={() => setSearch(false)}
          onProject={(p) => launchGame(p)}
          onLink={(url, title, sample) => {
            setSearch(false);
            openLink(url, title, sample);
          }}
        />
      )}
      {splash && <LinkSplash {...splash} onClose={() => setSplash(null)} />}
      <TrophyToasts />
      <noscript>{t("boot.press")}</noscript>
    </div>
  );
}

function LaunchFx({ launch }: { launch: Launch }) {
  const { project: p, rect, phase } = launch;
  const style =
    phase === "grow"
      ? { left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: 14 }
      : { left: 0, top: 0, width: "100%", height: "100%", borderRadius: 0 };
  return (
    <div className={`launch launch-${phase}`}>
      <div className="launch-box" style={style}>
        <CoverArt src={p.hero ?? p.cover} seed={p.id} motif={p.motif} palette={p.palette} className="launch-art" animated />
        <div className="launch-title">
          <Logo text={p.title} spec={p.logo} className="launch-logo" />
          <span className="launch-bar">
            <span />
          </span>
        </div>
      </div>
    </div>
  );
}
