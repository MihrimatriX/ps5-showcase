"use client";
/**
 * Full-screen search, like the console's: a query field, result rows, and an on-screen keyboard
 * that works with a controller. A physical keyboard types straight into the field; on touch screens
 * the device's own keyboard is used instead.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { media, projects, socials } from "@/content/portfolio";
import { useConsole, useStoreSearch } from "@/lib/console";
import { pick } from "@/lib/i18n";
import { useLayer, type TextInput } from "@/lib/input";
import { sound } from "@/lib/sound";
import type { Project } from "@/lib/types";
import { CoverArt } from "../CoverArt";
import { Icon } from "../Icons";
import { AmbientBg, Clock, Hints, Logo } from "../ui";

type Result = { key: string; title: string; sub: string; project?: Project; art?: { src?: string; seed: string; motif: Project["motif"]; palette: Project["palette"] }; icon?: string; url?: string; sample?: boolean };
type Row = { id: string; title: string; items: Result[] };

const letters = {
  tr: ["1234567890", "qwertyuıopğü", "asdfghjklşi", "zxcvbnmöç."],
  en: ["1234567890", "qwertyuiop", "asdfghjkl'", "zxcvbnm,.-"],
};
type Key = { id: string; label: string; ch?: string; icon?: string; wide?: number };

export function SearchScreen({
  onExit,
  onProject,
  onLink,
  onCC,
}: {
  onExit: () => void;
  onProject: (p: Project) => void;
  onLink: (url: string, title: string, sample?: boolean) => void;
  onCC: () => void;
}) {
  const { t, lang, opened, user } = useConsole();
  const x = (tr: string, en: string) => (lang === "tr" ? tr : en);
  const [q, setQ] = useState("");
  const [zone, setZone] = useState<"kb" | number>("kb");
  const [kb, setKb] = useState({ r: 2, c: 0 });
  const [col, setCol] = useState<Record<number, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  /** True right after typing on a physical keyboard, so Enter means "search" rather than pressing the focused key. */
  const typed = useRef(false);
  const touch = typeof document !== "undefined" && document.documentElement.dataset.input === "touch";

  useEffect(() => {
    if (touch) inputRef.current?.focus();
  }, [touch]);

  const keys: Key[][] = useMemo(
    () => [
      ...letters[lang].slice(0, 4).map((row) => row.split("").map((ch) => ({ id: ch, label: ch, ch }))),
      [
        { id: "space", label: x("Boşluk", "Space"), ch: " ", icon: "space", wide: 4 },
        { id: "back", label: x("Sil", "Delete"), icon: "backspace", wide: 2 },
        { id: "clear", label: x("Temizle", "Clear"), wide: 2 },
        { id: "done", label: x("Bitti", "Done"), wide: 2 },
      ],
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );

  const all: Result[] = useMemo(
    () => [
      ...projects.map((p) => ({ key: `p-${p.id}`, title: p.title, sub: `${pick(lang, p.genre)} · ${p.tech.slice(0, 3).join(", ")}`, project: p, art: { src: p.cover, seed: p.id, motif: p.motif, palette: p.palette } })),
      ...media.map((m) => ({ key: `m-${m.id}`, title: pick(lang, m.title), sub: `${t(`kind.${m.kind}`)} · ${pick(lang, m.summary)}`, art: { src: m.image, seed: m.id, motif: m.motif, palette: m.palette }, url: m.url, sample: m.sample })),
      ...socials.filter((s) => user === "recruiter" || s.id !== "cv").map((s) => ({ key: `s-${s.id}`, title: s.label, sub: s.handle, icon: s.id === "blog" ? "globe" : s.id, url: s.url, sample: s.sample })),
    ],
    [lang, t, user],
  );

  // Games beyond the catalog, from IGDB; they open in the store page with a Buy button.
  const remote = useStoreSearch(q);
  const rows: Row[] = useMemo(() => {
    const n = q.trim().toLocaleLowerCase(lang);
    if (!n) {
      const recent = opened.map((id) => all.find((r) => r.project?.id === id)).filter(Boolean) as Result[];
      return [
        ...(recent.length ? [{ id: "recent", title: x("Son oynananlar", "Recently played"), items: recent }] : []),
        { id: "games", title: t("tab.games"), items: all.filter((r) => r.project) },
        { id: "media", title: t("tab.media"), items: all.filter((r) => !r.project) },
      ];
    }
    // Title, genre, tags and the developer ("Insomniac" finds Spider-Man 2).
    const hit = (r: Result) => `${r.title} ${r.sub} ${r.project ? pick(lang, r.project.role) : ""}`.toLocaleLowerCase(lang).includes(n) || !!r.project?.tech.some((x) => x.toLocaleLowerCase(lang).includes(n));
    const found = all.filter(hit);
    return [
      { id: "games", title: t("tab.games"), items: found.filter((r) => r.project) },
      {
        id: "store",
        title: t("store"),
        items: remote.games.map((p) => ({ key: `r-${p.id}`, title: p.title, sub: pick(lang, p.genre), project: p, art: { src: p.cover, seed: p.id, motif: p.motif, palette: p.palette } })),
      },
      { id: "media", title: x("Medya ve bağlantılar", "Media and links"), items: found.filter((r) => !r.project) },
    ].filter((r) => r.items.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, all, lang, opened, t, remote.games]);

  // If the rows change under the focus (typing), keep the focus valid.
  useEffect(() => {
    if (zone !== "kb" && zone >= rows.length) setZone(rows.length ? rows.length - 1 : "kb");
  }, [rows, zone]);

  const typePhysical = (ev: TextInput) => {
    typed.current = true;
    type(ev);
  };
  const type = (ev: TextInput) => {
    if (ev.type === "backspace") setQ((v) => v.slice(0, -1));
    else setQ((v) => (v + ev.ch).slice(0, 40));
  };

  const pressKey = (k: Key) => {
    sound.move();
    if (k.ch) type({ type: "char", ch: k.ch });
    else if (k.id === "back") type({ type: "backspace" });
    else if (k.id === "clear") setQ("");
    else if (k.id === "done") {
      if (rows.length) setZone(0);
      else onExit();
    }
  };

  const open = (r: Result) => {
    if (r.project) onProject(r.project);
    else if (r.url) (sound.select(), onLink(r.url, r.title, r.sample));
  };

  /** Keyboard columns are uneven; move between rows by horizontal position, not index. */
  const kbMove = (dr: number) => {
    const from = keys[kb.r];
    const pos = from.slice(0, kb.c).reduce((s, k) => s + (k.wide ?? 1), 0) + (from[kb.c].wide ?? 1) / 2;
    const r = kb.r + dr;
    const row = keys[r];
    const fromW = from.reduce((s, k) => s + (k.wide ?? 1), 0);
    const toW = row.reduce((s, k) => s + (k.wide ?? 1), 0);
    const target = (pos / fromW) * toW;
    let acc = 0;
    let c = row.length - 1;
    for (let i = 0; i < row.length; i++) {
      acc += row[i].wide ?? 1;
      if (acc >= target) {
        c = i;
        break;
      }
    }
    setKb({ r, c });
  };

  const colOf = (r: number) => Math.min(col[r] ?? 0, (rows[r]?.items.length ?? 1) - 1);

  useLayer(
    (a) => {
      if (a === "home") return onCC();
      const wasTyping = typed.current;
      typed.current = false;
      if (a === "confirm" && wasTyping && zone === "kb") return pressKey(keys[keys.length - 1][3]);
      if (a === "back") {
        if (zone !== "kb") return (sound.back(), setZone("kb"));
        if (q) return (sound.back(), setQ((v) => v.slice(0, -1)));
        return (sound.back(), onExit());
      }
      if (a === "triangle") return (sound.move(), setQ(""));
      if (zone === "kb") {
        if (a === "left" && kb.c > 0) (sound.move(), setKb({ ...kb, c: kb.c - 1 }));
        else if (a === "right" && kb.c < keys[kb.r].length - 1) (sound.move(), setKb({ ...kb, c: kb.c + 1 }));
        else if (a === "down" && kb.r < keys.length - 1) (sound.move(), kbMove(1));
        else if (a === "up") {
          if (kb.r > 0) (sound.move(), kbMove(-1));
          else if (rows.length) (sound.move(), setZone(rows.length - 1));
        } else if (a === "confirm") pressKey(keys[kb.r][kb.c]);
        return;
      }
      const r = zone;
      const c = colOf(r);
      if (a === "left" && c > 0) (sound.move(), setCol({ ...col, [r]: c - 1 }));
      else if (a === "right" && c < rows[r].items.length - 1) (sound.move(), setCol({ ...col, [r]: c + 1 }));
      else if (a === "up" && r > 0) (sound.move(), setZone(r - 1));
      else if (a === "down") (sound.move(), setZone(r < rows.length - 1 ? r + 1 : "kb"));
      else if (a === "confirm") open(rows[r].items[c]);
    },
    true,
    { text: typePhysical },
  );

  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (zone === "kb" || document.documentElement.dataset.input === "pointer") return;
    const el = resultsRef.current?.querySelector<HTMLElement>(`[data-row="${zone}"] .is-focus`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [zone, col]);

  const pointer = () => document.documentElement.dataset.input === "pointer";
  const total = rows.reduce((s, r) => s + r.items.length, 0);

  return (
    <div className={`screen search-app ${touch ? "is-touch" : ""}`}>
      <AmbientBg dim field={false} />
      <header className="set-top">
        <button className="back-btn" onClick={() => (sound.back(), onExit())} aria-label={t("hint.back")}>
          <Icon name="chevronLeft" />
        </button>
        <label className={`search-field ${zone === "kb" ? "is-active" : ""}`}>
          <Icon name="search" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value.slice(0, 40))}
            onKeyDown={(e) => {
              if (e.key === "Enter") inputRef.current?.blur();
            }}
            placeholder={t("search.placeholder")}
            aria-label={t("search.placeholder")}
            enterKeyHint="search"
          />
          {q && (
            <button className="search-clear" onClick={() => (sound.back(), setQ(""))} aria-label={x("Temizle", "Clear")}>
              <Icon name="plus" className="rot45" />
            </button>
          )}
        </label>
        <Clock />
      </header>

      <div className="search-results" ref={resultsRef}>
        {q && <p className="search-count muted">{total ? x(`"${q}" için ${total} sonuç`, `${total} results for "${q}"`) : ""}</p>}
        {rows.length === 0 && (
          <div className="search-empty">
            <Icon name="search" />
            <strong>{t("search.empty")}</strong>
            <small className="muted">{x("Başka bir oyun adı, tür ya da stüdyo dene (ör. RPG, Racing, Insomniac).", "Try another game, genre or studio (e.g. RPG, Racing, Insomniac).")}</small>
          </div>
        )}
        {rows.map((row, r) => (
          <section key={row.id} className="search-row" data-row={r}>
            <h3>{row.title}</h3>
            <div className="search-tiles">
              {row.items.map((it, i) => {
                const focused = zone === r && colOf(r) === i;
                return (
                  <button
                    key={it.key}
                    className={`search-tile ${focused ? "is-focus" : ""}`}
                    onMouseEnter={() => pointer() && (setZone(r), setCol({ ...col, [r]: i }))}
                    onClick={() => open(it)}
                  >
                    <span className="search-art">
                      {it.art ? (
                        <>
                          <CoverArt src={it.art.src} seed={it.art.seed} motif={it.art.motif} palette={it.art.palette} />
                          {it.project && <Logo text={it.project.title} spec={it.project.logo} className="tile-logo" />}
                        </>
                      ) : (
                        <span className={`search-app-icon app-${it.key.slice(2)}`}>
                          <Icon name={it.icon ?? "globe"} />
                        </span>
                      )}
                    </span>
                    <span className="search-tile-text">
                      <strong>{it.title}</strong>
                      <small>{it.sub}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {!touch && (
        <div className={`osk ${zone === "kb" ? "is-active" : ""}`} role="group" aria-label={x("Ekran klavyesi", "On-screen keyboard")}>
          {keys.map((row, r) => (
            <div key={r} className="osk-row">
              {row.map((k, c) => (
                <button
                  key={k.id}
                  className={`osk-key ${zone === "kb" && kb.r === r && kb.c === c ? "is-focus" : ""} ${k.ch ? "" : "osk-fn"} ${k.id === "done" ? "osk-done" : ""}`}
                  style={{ flexGrow: k.wide ?? 1 }}
                  onMouseEnter={() => pointer() && (setZone("kb"), setKb({ r, c }))}
                  onClick={() => (setZone("kb"), setKb({ r, c }), pressKey(k))}
                  aria-label={k.label}
                >
                  {k.icon ? <Icon name={k.icon} /> : k.id.length === 1 ? k.label : <span className="osk-word">{k.label}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      <Hints extra={zone === "kb" && q ? x("Sil", "Delete") : undefined} />
    </div>
  );
}
