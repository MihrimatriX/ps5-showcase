"use client";
/**
 * The Settings app, laid out like the console's: a list of categories, then a two-pane page
 * with sections on the left and the settings of the focused section on the right.
 * Every setting here really does something (see lib/console.tsx for what is stored).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { repos } from "@/content/github";
import { achievements, media, projects } from "@/content/portfolio";
import { consoleTrophies, useConsole, useLibrary, useNotifications, useNowPlaying, type Theme } from "@/lib/console";
import { pick } from "@/lib/i18n";
import { rumble, useLayer, type Action } from "@/lib/input";
import { sound, tracks } from "@/lib/sound";
import type { Project } from "@/lib/types";
import { Icon } from "../Icons";
import { AmbientBg, Clock, Hints, Switch } from "../ui";

type Opt = { label: string; value: string | number; swatch?: string };
type Item =
  | { kind: "toggle"; id: string; label: string; desc?: string; value: boolean; set: (v: boolean) => void }
  | { kind: "slider"; id: string; label: string; desc?: string; value: number; min: number; max: number; set: (v: number) => void }
  | { kind: "choice"; id: string; label: string; desc?: string; value: string | number; options: Opt[]; set: (v: string | number) => void }
  | { kind: "action"; id: string; label: string; desc?: string; value?: string; run: () => void; confirm?: string; danger?: boolean }
  | { kind: "info"; id: string; label: string; value: string }
  | { kind: "custom"; id: string; render: (focused: boolean) => ReactNode };
type Section = { id: string; label: string; items: Item[] };
type Category = { id: string; icon: string; label: string; desc: string; sections: Section[] };

type Net = { state: "idle" | "running" | "done"; ms?: number | null; online?: boolean };

export const APP_VERSION = "2.0.0";

export function SettingsApp({ onExit, onSwitchUser, onCC }: { onExit: () => void; onSwitchUser: () => void; onCC: () => void }) {
  const c = useConsole();
  const { lang, t } = c;
  const notes = useNotifications();
  const playing = useNowPlaying();
  const x = (tr: string, en: string) => (lang === "tr" ? tr : en);

  const [cat, setCat] = useState<number | null>(null);
  const [catIdx, setCatIdx] = useState(0);
  const [sec, setSec] = useState(0);
  const [pane, setPane] = useState<"sections" | "items">("sections");
  const [item, setItem] = useState(0);
  const [picker, setPicker] = useState<{ item: Extract<Item, { kind: "choice" }>; idx: number } | null>(null);
  const [confirm, setConfirm] = useState<{ text: string; run: () => void } | null>(null);
  const [net, setNet] = useState<Net>({ state: "idle" });
  const [lastAction, setLastAction] = useState<{ a: Action; at: number } | null>(null);
  const [full, setFull] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    on();
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(id);
  }, [notice]);

  const runNetTest = async () => {
    setNet({ state: "running" });
    const online = navigator.onLine;
    const times: number[] = [];
    for (let i = 0; i < 3 && online; i++) {
      const t0 = performance.now();
      try {
        await fetch(`${location.href.split("#")[0]}${location.href.includes("?") ? "&" : "?"}ping=${Date.now()}`, { method: "HEAD", cache: "no-store" });
        times.push(performance.now() - t0);
      } catch {
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 700));
    times.sort((a, b) => a - b);
    setNet({ state: "done", online, ms: times.length ? Math.round(times[Math.floor(times.length / 2)]) : null });
    sound.select();
  };

  const conn = (typeof navigator !== "undefined" ? (navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number; rtt?: number } }).connection : undefined) ?? undefined;

  const themes: Theme[] = ["cosmic", "aurora", "ember", "mono"];
  const onOff = (v: boolean) => (v ? t("on") : t("off"));

  const categories: Category[] = [
    {
      id: "accessibility",
      icon: "accessibility",
      label: x("Erişilebilirlik", "Accessibility"),
      desc: x("Yazı boyutu, kontrast, hareket ve titreşim", "Text size, contrast, motion and vibration"),
      sections: [
        {
          id: "display",
          label: x("Görüntü ve hareket", "Display and motion"),
          items: [
            {
              kind: "choice",
              id: "text",
              label: x("Yazı boyutu", "Text size"),
              desc: x("Arayüzün tamamını büyütür.", "Scales the whole interface up."),
              value: c.textSize,
              options: [
                { label: x("Normal", "Normal"), value: "normal" },
                { label: x("Büyük", "Large"), value: "large" },
              ],
              set: (v) => c.setPref("textSize", v as "normal" | "large"),
            },
            { kind: "toggle", id: "contrast", label: x("Yüksek kontrast", "High contrast"), desc: x("Panelleri koyulaştırır, odak çerçevesini kalınlaştırır.", "Darker panels and a thicker focus frame."), value: c.contrast, set: (v) => c.setPref("contrast", v) },
            { kind: "toggle", id: "motion", label: x("Hareketi azalt", "Reduce motion"), desc: x("Geçişleri ve hareketli arka planları sadeleştirir.", "Simplifies transitions and animated backgrounds."), value: c.reducedMotion, set: (v) => c.setPref("reducedMotion", v) },
          ],
        },
        {
          id: "controller",
          label: x("Kumanda", "Controller"),
          items: [{ kind: "toggle", id: "haptics", label: x("Titreşim", "Vibration"), desc: x("Kupalarda ve oyun açılışında kumanda titrer.", "The controller rumbles for trophies and game launches."), value: c.haptics, set: (v) => c.setPref("haptics", v) }],
        },
      ],
    },
    {
      id: "sound",
      icon: "volume",
      label: x("Ses", "Sound"),
      desc: x("Ses seviyesi, efektler ve müzik", "Volume, effects and music"),
      sections: [
        {
          id: "volume",
          label: x("Ses seviyesi", "Volume"),
          items: [
            { kind: "slider", id: "volume", label: x("Ana ses", "Master volume"), value: c.volume, min: 0, max: 10, set: (v) => (c.setPref("volume", v), sound.move()) },
            { kind: "toggle", id: "sfx", label: t("cc.sound"), desc: x("Gezinme, seçim ve kupa sesleri.", "Navigation, selection and trophy sounds."), value: c.sfx, set: (v) => c.setPref("sfx", v) },
            { kind: "action", id: "test", label: x("Sesi test et", "Test sound"), run: () => sound.trophy() },
          ],
        },
        {
          id: "music",
          label: x("Müzik", "Music"),
          items: [
            { kind: "toggle", id: "music", label: x("Arka plan müziği", "Background music"), desc: x("Tarayıcıda üretilen sakin bir ambiyans.", "A calm ambience generated in the browser."), value: c.music, set: (v) => c.setPref("music", v) },
            {
              kind: "choice",
              id: "track",
              label: x("Parça", "Track"),
              value: playing.track,
              options: tracks.map((tr, i) => ({ label: pick(lang, tr.name), value: i })),
              set: (v) => sound.setTrack(v as number),
            },
            { kind: "toggle", id: "themes", label: x("Oyun temaları", "Game themes"), desc: x("Ana ekranda seçili oyunun kendi teması çalar.", "The focused game's own theme plays on the home screen."), value: c.gameThemes, set: (v) => c.setPref("gameThemes", v) },
          ],
        },
      ],
    },
    {
      id: "screen",
      icon: "monitor",
      label: x("Ekran ve görüntü", "Screen and Video"),
      desc: x("Tema, arka plan, saat ve tam ekran", "Theme, background, clock and full screen"),
      sections: [
        {
          id: "theme",
          label: x("Tema", "Theme"),
          items: [
            {
              kind: "choice",
              id: "theme",
              label: x("Sistem teması", "System theme"),
              desc: x("Sistem ekranlarının rengi.", "The color of the system screens."),
              value: c.theme,
              options: themes.map((th) => ({ label: t(`theme.${th}`), value: th, swatch: th })),
              set: (v) => c.setPref("theme", v as Theme),
            },
            { kind: "toggle", id: "trailers", label: x("Fragmanları otomatik oynat", "Autoplay trailers"), desc: x("Seçili oyunun fragmanı arka planda sessizce oynar.", "The selected game's trailer plays silently in the background."), value: c.trailers, set: (v) => c.setPref("trailers", v) },
            { kind: "toggle", id: "waves", label: x("Dalga arka planı", "Wave background"), desc: x("Sistem ekranlarının arkasındaki hareketli ışık dalgası.", "The moving sea of light behind system screens."), value: c.waves, set: (v) => c.setPref("waves", v) },
          ],
        },
        {
          id: "output",
          label: x("Görüntü çıkışı", "Video output"),
          items: [
            {
              kind: "toggle",
              id: "fullscreen",
              label: x("Tam ekran", "Full screen"),
              desc: x("Tarayıcı çubuklarını gizler.", "Hides the browser's toolbars."),
              value: full,
              set: (v) => {
                if (v) void document.documentElement.requestFullscreen?.().catch(() => setNotice(x("Tarayıcı tam ekrana izin vermedi", "The browser refused full screen")));
                else if (document.fullscreenElement) void document.exitFullscreen();
              },
            },
            { kind: "info", id: "res", label: x("Çözünürlük", "Resolution"), value: typeof window !== "undefined" ? `${window.innerWidth} × ${window.innerHeight} · ${window.devicePixelRatio}x` : "" },
            { kind: "toggle", id: "clock", label: x("24 saat biçimi", "24-hour clock"), value: c.clock24, set: (v) => c.setPref("clock24", v) },
          ],
        },
      ],
    },
    {
      id: "notifications",
      icon: "bell",
      label: x("Bildirimler", "Notifications"),
      desc: x("Açılır bildirimler ve geçmiş", "Pop-ups and history"),
      sections: [
        {
          id: "popups",
          label: x("Bildirimler", "Notifications"),
          items: [
            { kind: "toggle", id: "popups", label: x("Açılır bildirimler", "Pop-up notifications"), desc: x("Kapalıyken kupalar yine kazanılır, sadece sessizce kaydedilir.", "When off, trophies are still earned, just logged quietly."), value: c.popups, set: (v) => c.setPref("popups", v) },
            { kind: "info", id: "count", label: x("Bildirim geçmişi", "Notification history"), value: `${notes.list.length}` },
            {
              kind: "action",
              id: "clear",
              label: x("Bildirimleri temizle", "Clear notifications"),
              run: () => {
                c.clearNotifications();
                setNotice(x("Bildirimler temizlendi", "Notifications cleared"));
              },
            },
          ],
        },
      ],
    },
    {
      id: "users",
      icon: "users",
      label: x("Kullanıcılar ve hesaplar", "Users and Accounts"),
      desc: x("Kullanıcı değiştir, kupaları yönet", "Switch user, manage trophies"),
      sections: [
        {
          id: "account",
          label: x("Hesap", "Account"),
          items: [
            { kind: "info", id: "who", label: x("Oturum açan", "Signed in as"), value: c.user === "owner" ? "AFU" : c.user === "guest" ? t("users.guest") : t("users.recruiter") },
            { kind: "action", id: "switch", label: x("Kullanıcı değiştir", "Switch user"), run: onSwitchUser },
          ],
        },
        {
          id: "trophies",
          label: t("trophies"),
          items: [
            { kind: "info", id: "progress", label: t("trophy.console"), value: `${Object.keys(c.earned).length} / ${consoleTrophies.length}` },
            {
              kind: "action",
              id: "reset",
              label: t("settings.reset"),
              danger: true,
              confirm: x("Kazandığın tüm konsol kupaları silinecek. Emin misin?", "All console trophies you've earned will be removed. Are you sure?"),
              run: () => {
                c.resetTrophies();
                setNotice(x("Kupalar sıfırlandı", "Trophies reset"));
              },
            },
          ],
        },
      ],
    },
    {
      id: "system",
      icon: "chip",
      label: x("Sistem", "System"),
      desc: x("Dil, güç tasarrufu, sistem bilgisi", "Language, power saving, console info"),
      sections: [
        {
          id: "language",
          label: x("Dil", "Language"),
          items: [
            {
              kind: "choice",
              id: "lang",
              label: x("Sistem dili", "System language"),
              value: lang,
              options: [
                { label: "Türkçe", value: "tr" },
                { label: "English", value: "en" },
              ],
              set: (v) => c.setLang(v as "tr" | "en"),
            },
          ],
        },
        {
          id: "power",
          label: x("Güç tasarrufu", "Power saving"),
          items: [
            {
              kind: "choice",
              id: "idle",
              label: x("Ekranı karart", "Dim the screen"),
              desc: x("Bu kadar süre hiçbir şeye dokunulmazsa ekran kararır.", "The screen dims after this long without input."),
              value: c.idleDim,
              options: [0, 1, 5, 10, 20].map((m) => ({ label: m ? x(`${m} dakika sonra`, `After ${m} min`) : x("Asla", "Never"), value: m })),
              set: (v) => c.setPref("idleDim", v as number),
            },
          ],
        },
        {
          id: "info",
          label: x("Konsol bilgisi", "Console information"),
          items: [
            { kind: "info", id: "version", label: x("Sistem yazılımı", "System software"), value: `${APP_VERSION} · ${x("Güncel", "Up to date")}` },
            { kind: "info", id: "browser", label: x("Tarayıcı", "Browser"), value: typeof navigator !== "undefined" ? browserName(navigator.userAgent) : "" },
            { kind: "info", id: "cpu", label: x("İşlemci çekirdeği", "CPU cores"), value: typeof navigator !== "undefined" ? `${navigator.hardwareConcurrency ?? "?"}` : "" },
            { kind: "info", id: "content", label: x("İçerik", "Content"), value: x(`${projects.length} oyun · ${repos.length} GitHub projesi`, `${projects.length} games · ${repos.length} GitHub projects`) },
            { kind: "info", id: "data", label: x("Oyun verisi", "Game data"), value: "Powered by IGDB.com" },
          ],
        },
        {
          id: "reset",
          label: x("Sıfırlama", "Reset options"),
          items: [
            {
              kind: "action",
              id: "defaults",
              label: x("Varsayılan ayarlara dön", "Restore default settings"),
              danger: true,
              confirm: x("Tüm ayarlar, kupalar ve geçmiş silinecek. Emin misin?", "All settings, trophies and history will be erased. Are you sure?"),
              run: () => {
                c.resetAll();
                setNotice(x("Varsayılanlar yüklendi", "Defaults restored"));
              },
            },
          ],
        },
      ],
    },
    {
      id: "storage",
      icon: "storage",
      label: x("Depolama", "Storage"),
      desc: x("Konsolda yer kaplayan oyunlar ve veriler", "Games and data on the console"),
      sections: [{ id: "console", label: x("Konsol depolaması", "Console storage"), items: [{ kind: "custom", id: "bar", render: () => <StorageView lang={lang} /> }] }],
    },
    {
      id: "network",
      icon: "wifi",
      label: x("Ağ", "Network"),
      desc: x("Bağlantı durumu ve internet testi", "Connection status and internet test"),
      sections: [
        {
          id: "status",
          label: x("Bağlantı durumu", "Connection status"),
          items: [
            {
              kind: "action",
              id: "test",
              label: x("İnternet bağlantısını test et", "Test internet connection"),
              value: net.state === "running" ? x("Test ediliyor…", "Testing…") : undefined,
              run: () => net.state !== "running" && void runNetTest(),
            },
            { kind: "info", id: "online", label: x("İnternet", "Internet"), value: net.state === "done" ? (net.online ? x("Bağlı", "Connected") : x("Bağlı değil", "Not connected")) : typeof navigator !== "undefined" && navigator.onLine ? x("Bağlı", "Connected") : x("Bağlı değil", "Not connected") },
            { kind: "info", id: "ping", label: x("Gecikme", "Latency"), value: net.state === "done" ? (net.ms != null ? `${net.ms} ms` : x("Ölçülemedi", "Couldn't measure")) : net.state === "running" ? "…" : "—" },
            { kind: "info", id: "type", label: x("Bağlantı türü", "Connection type"), value: conn?.effectiveType ? `${conn.effectiveType.toUpperCase()}${conn.downlink ? ` · ~${conn.downlink} Mbps` : ""}` : "—" },
          ],
        },
      ],
    },
    {
      id: "accessories",
      icon: "gamepad",
      label: x("Aksesuarlar", "Accessories"),
      desc: x("Kumanda testi, titreşim ve tuşlar", "Controller test, vibration and keys"),
      sections: [
        {
          id: "controllers",
          label: x("Kumandalar", "Controllers"),
          items: [
            { kind: "custom", id: "pad", render: () => <PadTester last={lastAction} lang={lang} /> },
            {
              kind: "action",
              id: "rumble",
              label: x("Titreşimi test et", "Test vibration"),
              run: () => {
                rumble(500, 1, 1);
                if (!navigator.getGamepads || !Array.from(navigator.getGamepads()).some(Boolean)) setNotice(x("Bağlı kumanda bulunamadı", "No controller connected"));
              },
            },
          ],
        },
        { id: "keys", label: x("Klavye", "Keyboard"), items: [{ kind: "custom", id: "keys", render: () => <KeyMap lang={lang} /> }] },
      ],
    },
  ];

  const category = cat === null ? null : categories[cat];
  const section = category?.sections[Math.min(sec, category.sections.length - 1)];
  const items = section?.items ?? [];

  const openCat = (i: number) => {
    sound.select();
    setCat(i);
    setCatIdx(i);
    setSec(0);
    setItem(0);
    setPane("sections");
  };

  const activate = (it: Item) => {
    if (it.kind === "toggle") {
      sound.select();
      it.set(!it.value);
    } else if (it.kind === "choice") {
      sound.select();
      setPicker({ item: it, idx: Math.max(0, it.options.findIndex((o) => o.value === it.value)) });
    } else if (it.kind === "action") {
      sound.select();
      if (it.confirm) setConfirm({ text: it.confirm, run: it.run });
      else it.run();
    }
  };

  const nudge = (it: Item, dir: 1 | -1) => {
    if (it.kind !== "slider") return false;
    const v = Math.max(it.min, Math.min(it.max, it.value + dir));
    if (v !== it.value) it.set(v);
    return true;
  };

  useLayer(
    (a) => {
      setLastAction({ a, at: performance.now() });
      if (a === "home") return onCC();
      if (!category) {
        if (a === "up" && catIdx > 0) (sound.move(), setCatIdx(catIdx - 1));
        else if (a === "down" && catIdx < categories.length - 1) (sound.move(), setCatIdx(catIdx + 1));
        else if (a === "confirm" || a === "right") openCat(catIdx);
        else if (a === "back" || a === "left") (sound.back(), onExit());
        return;
      }
      if (a === "l1" || a === "r1") {
        const n = sec + (a === "l1" ? -1 : 1);
        if (n >= 0 && n < category.sections.length) (sound.move(), setSec(n), setItem(0));
        return;
      }
      if (pane === "sections") {
        if (a === "up" && sec > 0) (sound.move(), setSec(sec - 1), setItem(0));
        else if (a === "down" && sec < category.sections.length - 1) (sound.move(), setSec(sec + 1), setItem(0));
        else if ((a === "right" || a === "confirm") && items.length) (sound.move(), setPane("items"), setItem(0));
        else if (a === "back" || a === "left") (sound.back(), setCat(null));
        return;
      }
      const it = items[item];
      if (a === "up" && item > 0) (sound.move(), setItem(item - 1));
      else if (a === "down" && item < items.length - 1) (sound.move(), setItem(item + 1));
      else if (a === "left") {
        if (!it || !nudge(it, -1)) (sound.back(), setPane("sections"));
      } else if (a === "right") {
        if (it) nudge(it, 1);
      } else if (a === "confirm" && it) activate(it);
      else if (a === "back") (sound.back(), setPane("sections"));
    },
    !picker && !confirm,
  );

  // Hover focus for the mouse.
  const pointer = () => document.documentElement.dataset.input === "pointer";
  const listRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = category ? itemsRef.current : listRef.current;
    const el = root?.querySelector<HTMLElement>(".is-focus");
    if (el && document.documentElement.dataset.input !== "pointer") el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [category, catIdx, item, sec, pane]);

  return (
    <div className={`screen settings-app ${category ? "is-cat" : "is-root"}`}>
      <AmbientBg dim field={false} />
      <header className="set-top">
        <button className="back-btn" onClick={() => (sound.back(), category ? setCat(null) : onExit())} aria-label={t("hint.back")}>
          <Icon name="chevronLeft" />
        </button>
        <span className="set-title">
          <Icon name={category ? category.icon : "gear"} />
          {category ? category.label : t("settings.title")}
        </span>
        <Clock />
      </header>

      {!category && (
        <div className="set-list" ref={listRef} role="menu">
          {categories.map((k, i) => (
            <button
              key={k.id}
              role="menuitem"
              className={`set-cat ${i === catIdx ? "is-focus" : ""}`}
              style={{ ["--d" as string]: `${i * 25}ms` }}
              onMouseEnter={() => pointer() && setCatIdx(i)}
              onClick={() => openCat(i)}
            >
              <span className="set-cat-icon">
                <Icon name={k.icon} />
              </span>
              <span className="set-cat-text">
                <strong>{k.label}</strong>
                <small>{k.desc}</small>
              </span>
              <Icon name="chevronRight" className="set-chev" />
            </button>
          ))}
        </div>
      )}

      {category && (
        <div className="set-page" key={category.id}>
          <nav className={`set-sections ${pane === "sections" ? "is-active" : ""}`}>
            {category.sections.map((s, i) => (
              <button
                key={s.id}
                className={`set-sec ${i === sec ? "is-sel" : ""} ${pane === "sections" && i === sec ? "is-focus" : ""}`}
                onMouseEnter={() => pointer() && (setPane("sections"), setSec(i))}
                onClick={() => (sound.move(), setSec(i), setItem(0), setPane("items"))}
              >
                {s.label}
              </button>
            ))}
          </nav>
          <div className="set-items" ref={itemsRef} key={section?.id}>
            <h2 className="set-items-title">{section?.label}</h2>
            {items.map((it, i) => {
              const focused = pane === "items" && i === item;
              const hover = () => pointer() && (setPane("items"), setItem(i));
              if (it.kind === "custom")
                return (
                  <div key={it.id} className={`set-custom ${focused ? "is-focus" : ""}`} onMouseEnter={hover}>
                    {it.render(focused)}
                  </div>
                );
              return (
                <div
                  key={it.id}
                  role="button"
                  tabIndex={-1}
                  className={`set-item set-${it.kind} ${focused ? "is-focus" : ""} ${it.kind === "action" && it.danger ? "is-danger" : ""}`}
                  onMouseEnter={hover}
                  onClick={(e) => {
                    setPane("items");
                    setItem(i);
                    if (it.kind === "slider") {
                      const r = (e.currentTarget.querySelector(".set-slider-track") as HTMLElement | null)?.getBoundingClientRect();
                      if (r && e.clientX >= r.left - 8) it.set(Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (it.max - it.min) + it.min));
                    } else activate(it);
                  }}
                >
                  <span className="set-item-text">
                    <strong>{it.label}</strong>
                    {"desc" in it && it.desc && <small>{it.desc}</small>}
                  </span>
                  <span className="set-item-value">
                    {it.kind === "toggle" && <Switch on={it.value} />}
                    {it.kind === "toggle" && <span className="sr">{onOff(it.value)}</span>}
                    {it.kind === "info" && <span className="set-info">{it.value}</span>}
                    {it.kind === "choice" && (
                      <>
                        <span className="set-info">{it.options.find((o) => o.value === it.value)?.label}</span>
                        <Icon name="chevronRight" />
                      </>
                    )}
                    {it.kind === "action" && (
                      <>
                        {it.value && <span className="set-info">{it.value}</span>}
                        {it.id === "test" && net.state === "running" ? <span className="spinner spinner-sm" /> : <Icon name="chevronRight" />}
                      </>
                    )}
                    {it.kind === "slider" && (
                      <>
                        <span className="set-slider-track">
                          <span style={{ width: `${((it.value - it.min) / (it.max - it.min)) * 100}%` }} />
                        </span>
                        <b className="set-slider-num">{it.value}</b>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {picker && (
        <Picker
          title={picker.item.label}
          options={picker.item.options}
          value={picker.item.value}
          onPick={(v) => {
            sound.select();
            picker.item.set(v);
            setPicker(null);
          }}
          onClose={() => (sound.back(), setPicker(null))}
        />
      )}
      {confirm && (
        <ConfirmDialog
          text={confirm.text}
          yes={x("Evet", "Yes")}
          no={x("Vazgeç", "Cancel")}
          onYes={() => {
            sound.select();
            confirm.run();
            setConfirm(null);
          }}
          onNo={() => (sound.back(), setConfirm(null))}
        />
      )}
      {notice && <div className="set-notice">{notice}</div>}
      <Hints />
    </div>
  );
}

function browserName(ua: string) {
  const m = /(Edg|OPR|Firefox|Chrome|Version)\/(\d+)/.exec(ua);
  const name = !m ? "?" : m[1] === "Edg" ? "Edge" : m[1] === "OPR" ? "Opera" : m[1] === "Version" ? "Safari" : m[1];
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac/.test(ua) ? "macOS" : /Win/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return `${name}${m ? ` ${m[2]}` : ""}${os ? ` · ${os}` : ""}`;
}

/* ------------------------------------------------------------------ picker & confirm */

function Picker({ title, options, value, onPick, onClose }: { title: string; options: Opt[]; value: string | number; onPick: (v: string | number) => void; onClose: () => void }) {
  const [idx, setIdx] = useState(Math.max(0, options.findIndex((o) => o.value === value)));
  useLayer((a) => {
    if (a === "up" && idx > 0) (sound.move(), setIdx(idx - 1));
    else if (a === "down" && idx < options.length - 1) (sound.move(), setIdx(idx + 1));
    else if (a === "confirm") onPick(options[idx].value);
    else if (a === "back" || a === "left" || a === "home") onClose();
  });
  return (
    <div className="set-modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="set-picker" role="listbox" aria-label={title}>
        <h3>{title}</h3>
        {options.map((o, i) => (
          <button
            key={String(o.value)}
            role="option"
            aria-selected={o.value === value}
            className={`${i === idx ? "is-focus" : ""} ${o.value === value ? "is-active" : ""}`}
            onMouseEnter={() => setIdx(i)}
            onClick={() => onPick(o.value)}
          >
            {o.swatch && <i className={`swatch-dot swatch-${o.swatch}`} />}
            <span>{o.label}</span>
            {o.value === value && <Icon name="check" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ConfirmDialog({ text, yes, no, onYes, onNo }: { text: string; yes: string; no: string; onYes: () => void; onNo: () => void }) {
  const [idx, setIdx] = useState(0);
  useLayer((a) => {
    if (a === "left" || a === "up") (sound.move(), setIdx(0));
    else if (a === "right" || a === "down") (sound.move(), setIdx(1));
    else if (a === "confirm") (idx === 0 ? onNo : onYes)();
    else if (a === "back" || a === "home") onNo();
  });
  return (
    <div className="set-modal" onClick={(e) => e.target === e.currentTarget && onNo()}>
      <div className="set-confirm" role="alertdialog">
        <p>{text}</p>
        <div>
          <button className={`btn-pill ${idx === 0 ? "is-focus" : ""}`} onMouseEnter={() => setIdx(0)} onClick={onNo}>
            {no}
          </button>
          <button className={`btn-play ${idx === 1 ? "is-focus" : ""}`} onMouseEnter={() => setIdx(1)} onClick={onYes}>
            {yes}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ storage */

/** Projects shown as installed games; their "size" grows with the hours that went into them. */
/** Install size in GB shown on the Storage page. */
export function gameSize(p: Project) {
  if (p.hours) return Math.round((p.hours * 0.38 + 3.2) * 10) / 10;
  // ponytail: IGDB has no install sizes, so real games get a stable 20–90 GB estimate from their id. Illustrative only.
  let h = 0;
  for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 20 + (h % 700) / 10;
}

function StorageView({ lang }: { lang: "tr" | "en" }) {
  const x = (tr: string, en: string) => (lang === "tr" ? tr : en);
  const total = 667.2;
  const games = useLibrary()
    .map((p) => ({ p, size: gameSize(p) }))
    .sort((a, b) => b.size - a.size);
  const gamesSize = games.reduce((s, g) => s + g.size, 0);
  const mediaSize = media.reduce((s, m) => s + m.minutes * 0.05, 0) + 1.2;
  let saved = 0;
  try {
    saved = Object.keys(localStorage).reduce((s, k) => s + (localStorage.getItem(k)?.length ?? 0) + k.length, 0);
  } catch {
    /* no storage */
  }
  const system = 28.4;
  const used = gamesSize + mediaSize + system;
  const parts = [
    { id: "games", label: x("Oyunlar ve uygulamalar", "Games and apps"), size: gamesSize },
    { id: "media", label: x("Medya galerisi", "Media gallery"), size: mediaSize },
    { id: "system", label: x("Sistem", "System"), size: system },
  ];
  const fmt = (n: number) => `${n.toLocaleString(lang === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits: 1 })} GB`;
  return (
    <div className="storage">
      <div className="storage-head">
        <strong>{fmt(Math.max(0, total - used))}</strong>
        <span className="muted">
          {x("boş", "free")} · {fmt(total)}
        </span>
      </div>
      <div className="storage-bar">
        {parts.map((p) => (
          <span key={p.id} className={`seg seg-${p.id}`} style={{ width: `${(p.size / total) * 100}%` }} />
        ))}
      </div>
      <div className="storage-legend">
        {parts.map((p) => (
          <span key={p.id}>
            <i className={`seg-${p.id}`} />
            {p.label} <b>{fmt(p.size)}</b>
          </span>
        ))}
        <span>
          <i className="seg-saved" />
          {x("Kayıtlı veriler", "Saved data")} <b>{(saved / 1024).toFixed(1)} KB</b>
        </span>
      </div>
      <div className="storage-games">
        {games.map(({ p, size }) => (
          <div key={p.id} className="storage-game">
            {p.cover ? (
              <img className="storage-swatch" src={p.cover} alt="" loading="lazy" />
            ) : (
              <span className="storage-swatch" style={{ background: `linear-gradient(135deg, ${p.palette[2]}, ${p.palette[1]})` }} />
            )}
            <span>{p.title}</span>
            <span className="storage-mini">
              <span style={{ width: `${(size / games[0].size) * 100}%`, background: p.palette[2] }} />
            </span>
            <b>{fmt(size)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ controller tester */

const padButtons: { id: string; label: string; action?: Action; index: number }[] = [
  { id: "cross", label: "✕", action: "confirm", index: 0 },
  { id: "circle", label: "○", action: "back", index: 1 },
  { id: "square", label: "□", index: 2 },
  { id: "triangle", label: "△", action: "triangle", index: 3 },
  { id: "l1", label: "L1", action: "l1", index: 4 },
  { id: "r1", label: "R1", action: "r1", index: 5 },
  { id: "l2", label: "L2", index: 6 },
  { id: "r2", label: "R2", index: 7 },
  { id: "create", label: "", action: "create", index: 8 },
  { id: "options", label: "", action: "options", index: 9 },
  { id: "l3", label: "", index: 10 },
  { id: "r3", label: "", index: 11 },
  { id: "up", label: "", action: "up", index: 12 },
  { id: "down", label: "", action: "down", index: 13 },
  { id: "left", label: "", action: "left", index: 14 },
  { id: "right", label: "", action: "right", index: 15 },
  { id: "ps", label: "", action: "home", index: 16 },
];

/** A live controller diagram: buttons light up from the Gamepad API, or from keys mapped to them. */
function PadTester({ last, lang }: { last: { a: Action; at: number } | null; lang: "tr" | "en" }) {
  const [state, setState] = useState<{ name: string | null; pressed: boolean[]; axes: number[] }>({ name: null, pressed: [], axes: [0, 0, 0, 0] });
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => {
    let raf = 0;
    let prev = "";
    const poll = () => {
      raf = requestAnimationFrame(poll);
      const pad = navigator.getGamepads ? Array.from(navigator.getGamepads()).find(Boolean) : null;
      const next = pad ? { name: pad.id.replace(/\s*\(.*?\)\s*/g, " ").trim(), pressed: pad.buttons.map((b) => b.pressed), axes: pad.axes.slice(0, 4).map((v) => Math.round(v * 20) / 20) } : { name: null, pressed: [], axes: [0, 0, 0, 0] };
      const key = JSON.stringify(next);
      if (key !== prev) {
        prev = key;
        setState(next);
      }
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => {
    if (!last) return;
    const b = padButtons.find((p) => p.action === last.a);
    if (!b) return;
    setFlash(b.id);
    const id = setTimeout(() => setFlash(null), 220);
    return () => clearTimeout(id);
  }, [last]);
  const on = (id: string) => {
    const b = padButtons.find((p) => p.id === id)!;
    return !!state.pressed[b.index] || flash === id;
  };
  const cls = (id: string) => `pb ${on(id) ? "is-on" : ""}`;
  const [lx, ly, rx, ry] = state.axes;
  return (
    <div className="pad-tester">
      <svg viewBox="0 0 320 200" className="pad-svg" aria-hidden="true">
        <path className="pad-body" d="M88 38h144c26 0 44 16 52 40l22 70c8 26-14 46-36 36-12-6-22-20-32-34-6-8-12-10-22-10H104c-10 0-16 2-22 10-10 14-20 28-32 34-22 10-44-10-36-36l22-70c8-24 26-40 52-40z" />
        <rect className={cls("l2")} x="70" y="10" width="44" height="16" rx="7" />
        <rect className={cls("r2")} x="206" y="10" width="44" height="16" rx="7" />
        <rect className={cls("l1")} x="72" y="28" width="40" height="8" rx="4" />
        <rect className={cls("r1")} x="208" y="28" width="40" height="8" rx="4" />
        <rect className={cls("create")} x="104" y="54" width="8" height="14" rx="3" />
        <rect className={cls("options")} x="208" y="54" width="8" height="14" rx="3" />
        <path className={cls("up")} d="M80 66h12v14l-6 6-6-6z" />
        <path className={cls("down")} d="M80 112h12V98l-6-6-6 6z" />
        <path className={cls("left")} d="M60 83h14l6 6-6 6H60z" />
        <path className={cls("right")} d="M112 83H98l-6 6 6 6h14z" />
        <circle className={cls("triangle")} cx="234" cy="70" r="9" />
        <circle className={cls("square")} cx="214" cy="90" r="9" />
        <circle className={cls("circle")} cx="254" cy="90" r="9" />
        <circle className={cls("cross")} cx="234" cy="110" r="9" />
        <text x="234" y="74" className="pb-label">△</text>
        <text x="214" y="94" className="pb-label">□</text>
        <text x="254" y="94" className="pb-label">○</text>
        <text x="234" y="114" className="pb-label">✕</text>
        <circle className="stick-well" cx="124" cy="132" r="18" />
        <circle className="stick-well" cx="196" cy="132" r="18" />
        <circle className={cls("l3")} cx={124 + lx * 10} cy={132 + ly * 10} r="11" />
        <circle className={cls("r3")} cx={196 + rx * 10} cy={132 + ry * 10} r="11" />
        <circle className={cls("ps")} cx="160" cy="132" r="6" />
        <rect className="pad-touch" x="122" y="44" width="76" height="40" rx="8" />
      </svg>
      <div className="pad-info">
        <strong>{state.name ?? (lang === "tr" ? "Kumanda bağlı değil" : "No controller connected")}</strong>
        <small className="muted">
          {state.name
            ? lang === "tr"
              ? "Tuşlara bas, şemada yanacaklar."
              : "Press buttons and they light up on the diagram."
            : lang === "tr"
              ? "Bir kumanda bağlayıp herhangi bir tuşa bas. Klavye tuşları da şemada görünür."
              : "Connect a controller and press any button. Keyboard keys show up on the diagram too."}
        </small>
      </div>
    </div>
  );
}

function KeyMap({ lang }: { lang: "tr" | "en" }) {
  const x = (tr: string, en: string) => (lang === "tr" ? tr : en);
  const rows: [string, string, string][] = [
    [x("Gezin", "Navigate"), "← ↑ → ↓ / WASD", x("Yön tuşları, sol çubuk", "D-pad, left stick")],
    [x("Seç", "Select"), "Enter / Space", "✕"],
    [x("Geri", "Back"), "Esc / Backspace", "○"],
    [x("Kontrol merkezi", "Control center"), "P", "PS"],
    [x("Seçenekler", "Options"), "M", "Options"],
    [x("Oluştur (paylaş)", "Create (share)"), "C", "Create"],
    [x("Önceki / sonraki sekme", "Previous / next tab"), "Q / E", "L1 / R1"],
    [x("Ara", "Search"), "T", "△"],
  ];
  return (
    <table className="keymap">
      <thead>
        <tr>
          <th />
          <th>{x("Klavye", "Keyboard")}</th>
          <th>{x("Kumanda", "Controller")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([a, k, p]) => (
          <tr key={a}>
            <td>{a}</td>
            <td>
              <kbd>{k}</kbd>
            </td>
            <td>{p}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
