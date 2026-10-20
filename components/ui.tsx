"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { consoleTrophies, useConsole } from "@/lib/console";
import { pick } from "@/lib/i18n";
import type { Logo as LogoSpec, Project, Tier } from "@/lib/types";
import { Icon, TrophyIcon } from "./Icons";

export function Logo({ text, spec, className }: { text: string; spec: LogoSpec; className?: string }) {
  // --fit: longest word length, so tile logos can shrink until that word fits on one line.
  const style = { "--fit": Math.max(...text.split(/\s+/).map((w) => w.length)), "--len": text.length } as CSSProperties;
  if (spec.gradient) style.backgroundImage = `linear-gradient(100deg, ${spec.gradient[0]}, ${spec.gradient[1]})`;
  return (
    <div className={`logo logo-${spec.font} ${spec.caps ? "logo-caps" : ""} ${spec.gradient ? "logo-grad" : ""} ${className ?? ""}`} style={style}>
      {text}
    </div>
  );
}

export function Clock() {
  const { clock24, lang } = useConsole();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <span className="clock" />;
  return <span className="clock">{now.toLocaleTimeString(lang === "tr" ? "tr-TR" : "en-US", { hour: clock24 ? "2-digit" : "numeric", minute: "2-digit", hour12: !clock24 })}</span>;
}

/** A store price, e.g. "$69.99" / "69,99 $". */
export function formatPrice(usd: number, lang: "tr" | "en") {
  return usd.toLocaleString(lang === "tr" ? "tr-TR" : "en-US", { style: "currency", currency: "USD" });
}

/** "3 min ago" style label for notification times. */
export function timeAgo(iso: string, lang: "tr" | "en") {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  if (s < 60) return rtf.format(0, "second");
  if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  return rtf.format(-Math.round(s / 86400), "day");
}

/** Pill-shaped on/off switch, like the console's settings toggles. */
export function Switch({ on }: { on: boolean }) {
  return (
    <span className={`switch ${on ? "is-on" : ""}`} aria-hidden="true">
      <span />
    </span>
  );
}

/** Face-button glyphs drawn as plain geometry. */
export function Glyph({ kind }: { kind: "cross" | "circle" | "home" }) {
  return (
    <span className={`glyph glyph-${kind}`} aria-hidden="true">
      <svg viewBox="0 0 20 20">
        {kind === "cross" && <path d="M6 6l8 8M14 6l-8 8" />}
        {kind === "circle" && <circle cx="10" cy="10" r="4.6" />}
        {kind === "home" && <path d="M5 10.5 10 6l5 4.5M7 9.3V14h6V9.3" />}
      </svg>
    </span>
  );
}

export function Hints({ back = true, select = true, cc = true, extra }: { back?: boolean; select?: boolean; cc?: boolean; extra?: string }) {
  const { t } = useConsole();
  return (
    <div className="hints">
      {select && (
        <span>
          <Glyph kind="cross" />
          {t("hint.select")}
          <kbd>Enter</kbd>
        </span>
      )}
      {back && (
        <span>
          <Glyph kind="circle" />
          {extra ?? t("hint.back")}
          <kbd>Esc</kbd>
        </span>
      )}
      {cc && (
        <span>
          <Glyph kind="home" />
          {t("hint.cc")}
          <kbd>P</kbd>
        </span>
      )}
    </div>
  );
}

export function SampleBadge({ show }: { show?: boolean }) {
  const { t } = useConsole();
  if (!show) return null;
  return <span className="badge badge-sample">{t("sample")}</span>;
}

export function StatusChip({ status }: { status: Project["status"] }) {
  const { t } = useConsole();
  return <span className={`badge badge-${status}`}>{t(`status.${status}`)}</span>;
}

export function ProgressRing({ value, size = "md", children }: { value: number; size?: "sm" | "md" | "lg"; children?: React.ReactNode }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <span className={`ring ring-${size}`}>
      <svg viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} className="ring-track" />
        <circle cx="20" cy="20" r={r} className="ring-bar" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <span className="ring-label">{children ?? `${Math.round(value)}%`}</span>
    </span>
  );
}

export function projectProgress(p: Project) {
  if (!p.trophies.length) return 0;
  return (p.trophies.filter((x) => x.earned).length / p.trophies.length) * 100;
}

export function TierCounts({ counts }: { counts: Record<Tier, number> }) {
  return (
    <span className="tier-counts">
      {(["platinum", "gold", "silver", "bronze"] as Tier[]).map((tier) => (
        <span key={tier} className="tier-count">
          <TrophyIcon tier={tier} />
          {counts[tier]}
        </span>
      ))}
    </span>
  );
}

export function Avatar({ name, src, size = "md", ring }: { name: string; src?: string; size?: "sm" | "md" | "lg" | "xl"; ring?: boolean }) {
  return (
    <span className={`avatar avatar-${size} ${ring ? "avatar-ring" : ""}`}>
      {src ? <img className="avatar-photo" src={src} alt="" draggable={false} /> : <span>{name.slice(0, 1)}</span>}
    </span>
  );
}

/**
 * A game's trailer behind its key art, muted, once it has stayed selected for a moment (like the console's home screen).
 * Nothing loads with reduced motion, with the setting off, or on phone-sized screens (mobile data).
 */
export function Trailer({ id, delay = 2500 }: { id?: string; delay?: number }) {
  const { reducedMotion, trailers } = useConsole();
  const [on, setOn] = useState(false);
  const [playing, setPlaying] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    setOn(false);
    setPlaying(false);
    if (!id || reducedMotion || !trailers || window.matchMedia("(max-width: 760px)").matches) return;
    const timer = setTimeout(() => setOn(true), delay);
    return () => clearTimeout(timer);
  }, [id, delay, reducedMotion, trailers]);

  // The player is only shown once YouTube reports the video actually playing: a slow, blocked or failed
  // video leaves the key art alone instead of covering it with a black frame and a spinner.
  useEffect(() => {
    if (!on) return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || typeof e.data !== "string") return;
      let msg: { event?: string; info?: unknown };
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      const state = msg.event === "onStateChange" ? msg.info : msg.event === "infoDelivery" ? (msg.info as { playerState?: number } | null)?.playerState : undefined;
      // Shown only while playing: paused (Chrome pauses muted video in hidden tabs), ended or unstarted all fall
      // back to the key art. Buffering (3) keeps the current state so a short stall doesn't flicker.
      if (state === 1) setPlaying(true);
      else if (typeof state === "number" && state !== 3) setPlaying(false);
      if (msg.event === "onError") setOn(false);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [on]);

  if (!on || !id) return null;
  const origin = "https://www.youtube-nocookie.com";
  return (
    <div className={`trailer ${playing ? "is-ready" : ""}`} aria-hidden="true">
      <iframe
        ref={frame}
        src={`${origin}/embed/${id}?autoplay=1&mute=1&controls=0&start=4&playsinline=1&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3&enablejsapi=1`}
        title=""
        tabIndex={-1}
        allow="autoplay; encrypted-media"
        // Subscribe to the player's state events (the embed's postMessage protocol).
        onLoad={() => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: "trailer", channel: "widget" }), origin)}
      />
    </div>
  );
}

/**
 * A sheet of light points rolling like a slow sea, seen in perspective.
 * The signature idle background of the system screens; colors come from the theme.
 */
export function WaveField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    let color = "160,190,255";
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const c = getComputedStyle(document.documentElement).getPropertyValue("--glow2").trim();
      const m = /^#?([0-9a-f]{6})$/i.exec(c);
      if (m) color = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).join(",");
    };
    resize();
    window.addEventListener("resize", resize);
    const small = w < 700;
    const cols = small ? 46 : 90;
    const rows = small ? 22 : 34;
    const reduced = document.documentElement.dataset.motion === "reduced";
    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 33) return; // ~30 fps is plenty for a slow swell
      last = now;
      const t = reduced ? 0 : now / 1000;
      ctx.clearRect(0, 0, w, h);
      const horizon = h * 0.42;
      for (let j = 0; j < rows; j++) {
        const z = j / (rows - 1); // 0 = far, 1 = near
        const depth = 0.25 + z * z * 1.6;
        const yBase = horizon + z * z * h * 0.62;
        const alpha = 0.08 + z * 0.55;
        ctx.fillStyle = `rgba(${color},${alpha.toFixed(3)})`;
        for (let i = 0; i < cols; i++) {
          const u = i / (cols - 1) - 0.5;
          const x = w / 2 + u * w * (0.7 + depth * 1.1);
          const wave = Math.sin(u * 7 + t * 0.55 + z * 3.2) * 0.6 + Math.sin(u * 13 - t * 0.35 + z * 6) * 0.3 + Math.cos(z * 9 + t * 0.4) * 0.4;
          const y = yBase - wave * (14 + z * 46);
          if (x < -4 || x > w + 4) continue;
          const r = 0.5 + z * 1.4;
          ctx.fillRect(x - r / 2, y - r / 2, r, r);
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={ref} className="wavefield" aria-hidden="true" />;
}

/** Slow drifting light that sits behind system screens; tinted by the theme. */
export function AmbientBg({ dim, field = true }: { dim?: boolean; field?: boolean }) {
  return (
    <div className={`ambient ${dim ? "ambient-dim" : ""}`} aria-hidden="true">
      {field && <WaveField />}
      <div className="ambient-wave w1" />
      <div className="ambient-wave w2" />
      <div className="ambient-wave w3" />
      <div className="ambient-grain" />
    </div>
  );
}

export function TrophyToasts() {
  const { toasts, lang, t } = useConsole();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => {
        const tr = consoleTrophies.find((x) => x.id === toast.id);
        if (!tr) return null;
        return (
          <div key={toast.key} className="toast">
            <span className={`toast-icon tier-${tr.tier}`}>
              <TrophyIcon tier={tr.tier} />
            </span>
            <span className="toast-text">
              <small>{t("trophy.earned")}</small>
              <strong>{pick(lang, tr.name)}</strong>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Round button in the bottom centre that opens the control center; mainly for mouse and touch. */
export function HomeButton({ onClick }: { onClick: () => void }) {
  const { t } = useConsole();
  return (
    <button className="home-btn" onClick={onClick} aria-label={t("hint.cc")}>
      <span className="home-btn-mark">
        <Icon name="gamepad" />
      </span>
    </button>
  );
}

export function SectionTitle({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <h2 className="section-title">
      {children}
      {extra}
    </h2>
  );
}

/** Out-of-focus dust in front of the key art; drifts and shifts with the pointer for depth. */
export function Dust({ count = 14 }: { count?: number }) {
  const [specks] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      left: `${(i * 37) % 100}%`,
      top: `${(i * 53 + 11) % 100}%`,
      size: 6 + ((i * 29) % 26),
      delay: `${(i * 1.7) % 9}s`,
      dur: `${14 + ((i * 7) % 12)}s`,
      o: 0.15 + ((i * 13) % 30) / 100,
    })),
  );
  return (
    <div className="dust" aria-hidden="true">
      {specks.map((d, i) => (
        <span key={i} style={{ left: d.left, top: d.top, width: d.size, height: d.size, animationDelay: d.delay, animationDuration: d.dur, opacity: d.o }} />
      ))}
    </div>
  );
}

/** Feeds pointer position (-1..1) into CSS variables on the root for parallax. */
export function useParallax() {
  useEffect(() => {
    if (document.documentElement.dataset.motion === "reduced") return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const tick = () => {
      raf = requestAnimationFrame(tick);
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      const s = document.documentElement.style;
      s.setProperty("--mx", x.toFixed(4));
      s.setProperty("--my", y.toFixed(4));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);
}
