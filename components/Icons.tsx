/** Original line icons, drawn on a 24px grid. */
import type { ReactElement } from "react";
import type { Tier } from "@/lib/types";

const paths: Record<string, ReactElement> = {
  bag: (
    <>
      <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" />
    </>
  ),
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" />
      <circle cx="12" cy="12" r="6.6" />
    </>
  ),
  home: <path d="M3.5 11 12 4l8.5 7M6 9.5V20h4.5v-5.5h3V20H18V9.5" />,
  bell: <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" />,
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
      <circle cx="17" cy="9.5" r="2.6" />
      <path d="M17.5 14.6c2.3.3 3.7 1.9 4 4.4" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3.5M8.5 20.5h7M9.5 17.5h5" />
    </>
  ),
  music: (
    <>
      <path d="M9 17.5V5.5l11-2v12" />
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="15.5" r="2.5" />
    </>
  ),
  volume: <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />,
  mute: <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM16 9.5l5 5M21 9.5l-5 5" />,
  power: <path d="M12 3v8.5M7 6.2a7.5 7.5 0 1 0 10 0" />,
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </>
  ),
  book: <path d="M4 5.5c3-1 6-1 8 .8 2-1.8 5-1.8 8-.8V19c-3-1-6-1-8 .8-2-1.8-5-1.8-8-.8zM12 6.3v13.5" />,
  cap: <path d="M2.5 9 12 4.5 21.5 9 12 13.5zM6.5 11v4.5c1.5 1.5 3.5 2.3 5.5 2.3s4-.8 5.5-2.3V11M21.5 9v5.5" />,
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="m16 10.5 5-3v9l-5-3" />
    </>
  ),
  github: <path d="M9 19c-4 1.3-4-2-5.5-2.5M14.5 21v-3.2c0-1 .1-1.6-.5-2.2 2.6-.3 5.5-1.3 5.5-5.8a4.5 4.5 0 0 0-1.2-3.1 4.2 4.2 0 0 0-.1-3.1s-1-.3-3.2 1.2a11 11 0 0 0-5.8 0C6.9 3.3 5.9 3.6 5.9 3.6a4.2 4.2 0 0 0-.1 3.1 4.5 4.5 0 0 0-1.2 3.1c0 4.5 2.9 5.5 5.5 5.8-.6.6-.6 1.2-.5 2.2V21" />,
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M7.5 10.5V17M7.5 7.2v.1M11.5 17v-6.5M11.5 13c0-1.6 1.1-2.6 2.5-2.6s2.5 1 2.5 2.6v4" />
    </>
  ),
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.2 6.8v.1" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </>
  ),
  x: <path d="M4.5 4h4.2l10.8 16h-4.2zM19.2 4l-6.3 7.1M4.8 20l6.3-7.1" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.3 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.3-3.5-8.5S9.6 5.9 12 3.5z" />
    </>
  ),
  file: <path d="M6 3h8l4.5 4.5V21H6zM14 3v4.5h4.5M9 12.5h6M9 16h6" />,
  play: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />,
  dots: (
    <>
      <circle cx="6" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="18" cy="12" r="1.3" fill="currentColor" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  chevronRight: <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
  chevronLeft: <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />,
  external: <path d="M13.5 4H20v6.5M20 4l-9 9M18 14v5.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1h5.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  moon: <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />,
  restart: <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v4.5H9" />,
  gamepad: (
    <>
      <path d="M7 7.5h10a4.5 4.5 0 0 1 4.3 3.2l1 3.8a2.8 2.8 0 0 1-4.8 2.6L15.8 15H8.2l-1.7 2.1a2.8 2.8 0 0 1-4.8-2.6l1-3.8A4.5 4.5 0 0 1 7 7.5z" />
      <path d="M7.5 10v3M6 11.5h3" />
      <circle cx="16" cy="10.5" r=".6" fill="currentColor" />
      <circle cx="17.5" cy="12.5" r=".6" fill="currentColor" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.5-1.8-.4-1.2.3-2.2 1.6-2.2h2a3.4 3.4 0 0 0 3.4-3.4c0-5.3-3.8-9.6-8.5-9.6z" />
      <circle cx="7.5" cy="11" r="1" fill="currentColor" />
      <circle cx="10" cy="7.3" r="1" fill="currentColor" />
      <circle cx="14.5" cy="7.3" r="1" fill="currentColor" />
    </>
  ),
  language: <path d="M3.5 5.5h9M8 3.5v2c0 4-2 7-4.5 8.5M5.5 9.5c1.2 2 3 3.5 5.5 4.3M12.5 20.5l4-10 4 10M14 17h5" />,
  motion: <path d="M3 12h4l2.5-6 5 12 2.5-6h4" />,
  accessibility: (
    <>
      <circle cx="12" cy="4.8" r="1.8" />
      <path d="M4.5 8.5c2.5.8 5 1.2 7.5 1.2s5-.4 7.5-1.2M12 9.7v4.5M12 14.2l-3 6.3M12 14.2l3 6.3" />
    </>
  ),
  monitor: (
    <>
      <rect x="2.5" y="4" width="19" height="12.5" rx="1.8" />
      <path d="M8.5 20.5h7M12 16.5v4" />
    </>
  ),
  wifi: <path d="M2.8 9.2a13.5 13.5 0 0 1 18.4 0M5.8 12.4a9 9 0 0 1 12.4 0M8.8 15.6a4.6 4.6 0 0 1 6.4 0M12 19.2v.1" />,
  storage: (
    <>
      <rect x="3" y="4" width="18" height="7" rx="1.8" />
      <rect x="3" y="13" width="18" height="7" rx="1.8" />
      <path d="M7 7.5h.1M7 16.5h.1M11 7.5h6M11 16.5h6" />
    </>
  ),
  chip: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </>
  ),
  keyboard: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M6 9.5h.1M9 9.5h.1M12 9.5h.1M15 9.5h.1M18 9.5h.1M6 12.5h.1M9 12.5h.1M12 12.5h.1M15 12.5h.1M18 12.5h.1M8 15.5h8" />
    </>
  ),
  backspace: <path d="M8.5 5.5H20a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H8.5L2.5 12zM11.5 9.5l5 5M16.5 9.5l-5 5" />,
  space: <path d="M4 10.5v3.5h16v-3.5" />,
  switcher: (
    <>
      <rect x="3" y="7" width="12" height="12" rx="2" />
      <path d="M7 4h12a2 2 0 0 1 2 2v10" />
    </>
  ),
  share: <path d="M12 3.5v11M7.5 8 12 3.5 16.5 8M5.5 12.5v6a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-6" />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3.2-3.2a4 4 0 0 0-5.7-5.7L11.8 6.5M14 10a4 4 0 0 0-5.7 0l-3.2 3.2a4 4 0 0 0 5.7 5.7l1.4-1.4" />,
  battery: (
    <>
      <rect x="2.5" y="7.5" width="17" height="9" rx="2" />
      <path d="M21.5 10.5v3" />
    </>
  ),
  pause: <path d="M8 5.5v13M16 5.5v13" strokeWidth="2.6" />,
  next: <path d="M6 5.5v13l9-6.5zM18 5.5v13" />,
  prev: <path d="M18 5.5v13l-9-6.5zM6 5.5v13" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.1" />
    </>
  ),
  camera: (
    <>
      <path d="M4 7.5h3l1.8-2.5h6.4L17 7.5h3a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5z" />
      <circle cx="12" cy="13" r="3.6" />
    </>
  ),
  fullscreen: <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />,
};

export type IconName = keyof typeof paths;

export function Icon({ name, className }: { name: IconName | string; className?: string }) {
  return (
    <svg className={`icon ${className ?? ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] ?? paths.globe}
    </svg>
  );
}

const tierColors: Record<Tier, [string, string]> = {
  bronze: ["#f0b27a", "#9a5b2b"],
  silver: ["#f1f5f9", "#8a96a8"],
  gold: ["#fde68a", "#c08a1e"],
  platinum: ["#e0f2fe", "#7aa7d6"],
};

/** Original trophy cup, colored by tier. */
export function TrophyIcon({ tier, className }: { tier: Tier; className?: string }) {
  const [a, b] = tierColors[tier];
  const gid = `tg-${tier}`;
  return (
    <svg className={`trophy-icon ${className ?? ""}`} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <path d="M7 3.5h10v5.2a5 5 0 0 1-10 0z" fill={`url(#${gid})`} />
      <path d="M7 5.5H4.3v1.2A3.6 3.6 0 0 0 7.6 10.3M17 5.5h2.7v1.2a3.6 3.6 0 0 1-3.3 3.6" fill="none" stroke={b} strokeWidth="1.3" />
      <rect x="11" y="13.2" width="2" height="3.8" fill={b} />
      <rect x="8" y="17" width="8" height="3.5" rx="0.8" fill={`url(#${gid})`} />
      <path d="M9 5.2c.3 2.2 1 3.4 2 4" stroke="#fff" strokeOpacity="0.7" strokeWidth="0.9" fill="none" strokeLinecap="round" />
    </svg>
  );
}
