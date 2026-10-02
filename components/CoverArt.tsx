"use client";
/** Procedural key art: every project gets a deterministic SVG scene from its palette and motif. */
import { useId, type ReactElement } from "react";
import type { Motif } from "@/lib/types";

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Props = {
  seed: string;
  motif: Motif;
  palette: [string, string, string];
  variant?: number;
  className?: string;
  animated?: boolean;
  /** A real image (screenshot or key art). When set it replaces the generated scene. */
  src?: string;
};

export function CoverArt({ src, ...rest }: Props) {
  if (src) return <img className={`art-img ${rest.className ?? ""}`} src={src} alt="" loading="lazy" decoding="async" draggable={false} />;
  return <Scene {...rest} />;
}

function Scene({ seed, motif, palette, variant = 0, className, animated }: Omit<Props, "src">) {
  const uid = useId().replace(/[:«»]/g, "");
  const r = rng(`${seed}:${variant}`);
  const [bg, mid, acc] = palette;
  const id = (n: string) => `${uid}-${n}`;
  const url = (n: string) => `url(#${id(n)})`;
  let scene: ReactElement;

  const stars = (n: number, maxY = 90) =>
    Array.from({ length: n }, (_, i) => (
      <circle
        key={`s${i}`}
        className={animated && i % 3 === 0 ? "twinkle" : undefined}
        style={animated ? { animationDelay: `${(r() * 4).toFixed(2)}s` } : undefined}
        cx={(r() * 160).toFixed(1)}
        cy={(r() * maxY).toFixed(1)}
        r={(r() * 0.45 + 0.1).toFixed(2)}
        fill="#fff"
        opacity={(r() * 0.6 + 0.25).toFixed(2)}
      />
    ));

  switch (motif) {
    case "orbit": {
      const px = 95 + r() * 30;
      const py = 30 + r() * 25;
      const pr = 18 + r() * 10;
      scene = (
        <>
          <rect width="160" height="90" fill={url("rad")} />
          {stars(70)}
          <circle cx={px} cy={py} r={pr * 2.2} fill={url("glow")} opacity="0.55" />
          <circle cx={px} cy={py} r={pr} fill={url("planet")} />
          <ellipse cx={px} cy={py} rx={pr * 1.9} ry={pr * 0.42} fill="none" stroke={acc} strokeOpacity="0.55" strokeWidth="0.8" transform={`rotate(-18 ${px} ${py})`} />
          <ellipse cx={px} cy={py} rx={pr * 2.3} ry={pr * 0.55} fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="0.4" transform={`rotate(-18 ${px} ${py})`} />
          <circle cx={px - pr * 2.4} cy={py + pr * 0.9} r={pr * 0.18} fill={acc} opacity="0.9" />
        </>
      );
      break;
    }
    case "grid": {
      const hz = 56;
      const lines = [];
      for (let i = 0; i < 14; i++) {
        const y = hz + Math.pow(i / 13, 2) * (90 - hz);
        lines.push(<line key={`h${i}`} x1="0" x2="160" y1={y} y2={y} stroke={acc} strokeOpacity={0.25 + i * 0.05} strokeWidth="0.35" />);
      }
      for (let i = -12; i <= 12; i++) {
        lines.push(<line key={`v${i}`} x1={80 + i * 2.2} y1={hz} x2={80 + i * 18} y2="90" stroke={acc} strokeOpacity="0.55" strokeWidth="0.35" />);
      }
      scene = (
        <>
          <rect width="160" height="90" fill={url("sky")} />
          {stars(40, 50)}
          <circle cx="80" cy={hz - 2} r="24" fill={url("sun")} mask={`url(#${id("stripes")})`} />
          <circle cx="80" cy={hz - 2} r="40" fill={url("glow")} opacity="0.5" />
          <rect y={hz} width="160" height={90 - hz} fill={bg} />
          <g className={animated ? "grid-scroll" : undefined}>{lines}</g>
          <rect y={hz - 0.4} width="160" height="0.8" fill={acc} opacity="0.9" />
        </>
      );
      break;
    }
    case "waves": {
      const waves = Array.from({ length: 6 }, (_, i) => {
        const base = 40 + i * 8;
        const amp = 4 + r() * 7;
        const ph = r() * Math.PI * 2;
        let d = `M0 ${base}`;
        for (let x = 0; x <= 160; x += 4) d += ` L${x} ${(base + Math.sin(x / 18 + ph) * amp + Math.sin(x / 7 + ph * 2) * amp * 0.25).toFixed(2)}`;
        d += " L160 90 L0 90 Z";
        return <path key={i} d={d} fill={i % 2 ? acc : mid} opacity={0.18 + i * 0.1} className={animated ? `wave wave-${i % 3}` : undefined} />;
      });
      scene = (
        <>
          <rect width="160" height="90" fill={url("sky")} />
          {stars(30, 40)}
          <circle cx={40 + r() * 80} cy="26" r="30" fill={url("glow")} opacity="0.6" />
          {waves}
        </>
      );
      break;
    }
    case "shards": {
      const shards = Array.from({ length: 26 }, (_, i) => {
        const cx = r() * 160;
        const cy = r() * 90;
        const s = 4 + r() * 18;
        const a = r() * Math.PI * 2;
        const pts = [0, 1, 2].map((k) => {
          const ang = a + (k * Math.PI * 2) / 3 + (r() - 0.5) * 0.9;
          const rad = s * (0.5 + r() * 0.8);
          return `${(cx + Math.cos(ang) * rad).toFixed(1)},${(cy + Math.sin(ang) * rad).toFixed(1)}`;
        });
        return <polygon key={i} points={pts.join(" ")} fill={i % 3 === 0 ? url("shardA") : url("shardB")} opacity={(0.15 + r() * 0.55).toFixed(2)} className={animated && i % 4 === 0 ? "float" : undefined} style={animated ? { animationDelay: `${(r() * 6).toFixed(2)}s` } : undefined} />;
      });
      scene = (
        <>
          <rect width="160" height="90" fill={url("rad")} />
          {stars(30)}
          {shards}
          <polygon points="112,12 132,46 112,80 96,46" fill={url("shardA")} opacity="0.95" />
          <polygon points="112,12 132,46 112,46" fill="#fff" opacity="0.25" />
          <circle cx="112" cy="46" r="36" fill={url("glow")} opacity="0.45" />
        </>
      );
      break;
    }
    case "rings": {
      const cx = 100 + r() * 20;
      const cy = 45;
      scene = (
        <>
          <rect width="160" height="90" fill={url("rad")} />
          {stars(40)}
          <circle cx={cx} cy={cy} r="40" fill={url("glow")} opacity="0.6" />
          {Array.from({ length: 11 }, (_, i) => (
            <circle key={i} cx={cx} cy={cy} r={6 + i * 6.5} fill="none" stroke={i % 3 === 0 ? "#fff" : acc} strokeOpacity={0.75 - i * 0.06} strokeWidth={i % 3 === 0 ? 0.35 : 0.6} strokeDasharray={i % 2 ? `${2 + r() * 8} ${1 + r() * 4}` : undefined} className={animated ? `spin spin-${i % 3}` : undefined} style={{ transformOrigin: `${cx}px ${cy}px` }} />
          ))}
          <circle cx={cx} cy={cy} r="4" fill="#fff" />
        </>
      );
      break;
    }
    case "dunes": {
      const dunes = Array.from({ length: 5 }, (_, i) => {
        const base = 50 + i * 9;
        const ph = r() * 6;
        let d = `M0 ${base}`;
        for (let x = 0; x <= 160; x += 5) d += ` L${x} ${(base - Math.sin(x / (26 + i * 6) + ph) * (6 + i)).toFixed(2)}`;
        d += " L160 90 L0 90 Z";
        return <path key={i} d={d} fill={i % 2 ? mid : bg} opacity={0.55 + i * 0.1} />;
      });
      scene = (
        <>
          <rect width="160" height="90" fill={url("sky")} />
          {stars(25, 35)}
          <circle cx={45 + r() * 70} cy="30" r="13" fill={url("sun")} />
          <circle cx="80" cy="34" r="60" fill={url("glow")} opacity="0.4" />
          {dunes}
        </>
      );
      break;
    }
    case "city": {
      const blds = [];
      let x = 0;
      let i = 0;
      while (x < 160) {
        const w = 6 + r() * 12;
        const h = 18 + r() * 45;
        blds.push(<rect key={`b${i}`} x={x} y={90 - h} width={w - 0.8} height={h} fill={bg} opacity="0.92" />);
        for (let wy = 90 - h + 3; wy < 88; wy += 4) for (let wx = x + 1.5; wx < x + w - 2; wx += 3) if (r() > 0.62) blds.push(<rect key={`w${i}-${wx}-${wy}`} x={wx} y={wy} width="1.1" height="1.6" fill={acc} opacity={0.5 + r() * 0.5} />);
        x += w;
        i++;
      }
      scene = (
        <>
          <rect width="160" height="90" fill={url("sky")} />
          {stars(40, 40)}
          <circle cx="120" cy="24" r="10" fill={url("sun")} />
          {blds}
        </>
      );
      break;
    }
    case "circuit":
    default: {
      const traces = Array.from({ length: 22 }, (_, i) => {
        let px = Math.round(r() * 32) * 5;
        let py = Math.round(r() * 18) * 5;
        let d = `M${px} ${py}`;
        for (let k = 0; k < 4; k++) {
          if (k % 2) px += (r() > 0.5 ? 1 : -1) * Math.round(2 + r() * 6) * 5;
          else py += (r() > 0.5 ? 1 : -1) * Math.round(1 + r() * 4) * 5;
          d += ` L${px} ${py}`;
        }
        return (
          <g key={i}>
            <path d={d} fill="none" stroke={acc} strokeOpacity={0.25 + r() * 0.5} strokeWidth="0.5" className={animated && i % 3 === 0 ? "trace" : undefined} />
            <circle cx={px} cy={py} r="1" fill={acc} />
          </g>
        );
      });
      scene = (
        <>
          <rect width="160" height="90" fill={url("rad")} />
          <circle cx="110" cy="45" r="45" fill={url("glow")} opacity="0.5" />
          {traces}
        </>
      );
    }
  }

  // Variants reuse the scene but frame a different part of it, like screenshots from the same game.
  let viewBox = "0 0 160 90";
  if (variant) {
    const zr = rng(`${seed}:frame:${variant}`);
    const z = 1.35 + zr() * 0.9;
    const w = 160 / z;
    const h = 90 / z;
    viewBox = `${((160 - w) * zr()).toFixed(1)} ${((90 - h) * zr()).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
  }
  return (
    <svg className={className} viewBox={viewBox} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id={id("rad")} cx="70%" cy="45%" r="85%">
          <stop offset="0" stopColor={mid} />
          <stop offset="1" stopColor={bg} />
        </radialGradient>
        <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={bg} />
          <stop offset="1" stopColor={mid} />
        </linearGradient>
        <radialGradient id={id("glow")}>
          <stop offset="0" stopColor={acc} stopOpacity="0.9" />
          <stop offset="1" stopColor={acc} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("planet")} cx="30%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.25" stopColor={acc} />
          <stop offset="1" stopColor={bg} />
        </radialGradient>
        <linearGradient id={id("sun")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="1" stopColor={acc} />
        </linearGradient>
        <linearGradient id={id("shardA")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor={acc} />
        </linearGradient>
        <linearGradient id={id("shardB")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={acc} />
          <stop offset="1" stopColor={mid} />
        </linearGradient>
        <linearGradient id={id("ray")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.35" stopColor={acc} stopOpacity="0.18" />
          <stop offset="1" stopColor={acc} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id("fog")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mid} stopOpacity="0" />
          <stop offset="1" stopColor={bg} stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id={id("bokeh")}>
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.6" stopColor={acc} stopOpacity="0.18" />
          <stop offset="1" stopColor={acc} stopOpacity="0" />
        </radialGradient>
        <filter id={id("soft")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <mask id={id("stripes")}>
          <rect width="160" height="90" fill="#fff" />
          {Array.from({ length: 6 }, (_, i) => (
            <rect key={i} y={44 + i * 3.2} width="160" height={0.6 + i * 0.35} fill="#000" />
          ))}
        </mask>
      </defs>
      {scene}
      <Atmosphere id={id} url={url} seed={seed} variant={variant} animated={animated} motif={motif} />
    </svg>
  );
}

/** Light rays, low fog and out-of-focus specks: the depth layer that makes flat shapes read as key art. */
function Atmosphere({ id, url, seed, variant, animated, motif }: { id: (n: string) => string; url: (n: string) => string; seed: string; variant: number; animated?: boolean; motif: Motif }) {
  const r = rng(`${seed}:air:${variant}`);
  const sx = 95 + r() * 50;
  const rays = Array.from({ length: 6 }, (_, i) => {
    const spread = -0.9 + i * 0.32 + (r() - 0.5) * 0.15;
    const w = 2 + r() * 5;
    const len = 130;
    const x1 = sx + Math.sin(spread) * len;
    const y1 = -8 + Math.cos(spread) * len;
    return <polygon key={i} points={`${sx},-8 ${(x1 - w).toFixed(1)},${y1.toFixed(1)} ${(x1 + w).toFixed(1)},${y1.toFixed(1)}`} fill={url("ray")} opacity={(0.1 + r() * 0.18).toFixed(2)} />;
  });
  const specks = Array.from({ length: 9 }, (_, i) => (
    <circle
      key={i}
      cx={(r() * 160).toFixed(1)}
      cy={(r() * 90).toFixed(1)}
      r={(1.5 + r() * 4).toFixed(1)}
      fill={url("bokeh")}
      opacity={(0.25 + r() * 0.45).toFixed(2)}
      className={animated ? "float" : undefined}
      style={animated ? { animationDelay: `${(r() * 7).toFixed(2)}s`, animationDuration: `${(8 + r() * 8).toFixed(1)}s` } : undefined}
    />
  ));
  const groundFog = motif !== "grid";
  return (
    <g pointerEvents="none">
      <g className={animated ? "rays" : undefined} style={{ transformOrigin: `${sx}px -8px`, mixBlendMode: "screen" }}>
        {rays}
      </g>
      {groundFog && (
        <g filter={`url(#${id("soft")})`}>
          <ellipse cx={40 + r() * 30} cy="88" rx="70" ry="10" fill={url("fog")} opacity="0.7" />
          <ellipse cx={100 + r() * 30} cy="92" rx="80" ry="12" fill={url("fog")} opacity="0.6" />
        </g>
      )}
      <g style={{ mixBlendMode: "screen" }}>{specks}</g>
    </g>
  );
}
