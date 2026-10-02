"use client";
/** Power-on, rest, shutdown and user-select screens. */
import { useEffect, useRef, useState } from "react";
import { profile } from "@/content/portfolio";
import { useConsole } from "@/lib/console";
import { pick } from "@/lib/i18n";
import { useLayer, type Action } from "@/lib/input";
import { useGrid, navProps } from "@/lib/nav";
import { sound } from "@/lib/sound";
import { Icon } from "../Icons";
import { AmbientBg, Avatar, Hints } from "../ui";

/** Floating light dust on a canvas; cheap enough for phones. */
function Particles({ burst }: { burst: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const burstRef = useRef(burst);
  burstRef.current = burst;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const count = w < 700 ? 70 : 150;
    const ps = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random() * 0.8 + 0.2,
      a: Math.random() * Math.PI * 2,
    }));
    let raf = 0;
    let speed = 1;
    const reduced = document.documentElement.dataset.motion === "reduced";
    const draw = () => {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, w, h);
      speed += ((burstRef.current ? 14 : 1) - speed) * 0.04;
      for (const p of ps) {
        if (!reduced) {
          p.a += 0.004 * p.z;
          p.x += (Math.cos(p.a) * 0.00025 + (p.x - 0.5) * 0.0006 * (speed - 1)) * p.z;
          p.y += (-0.00035 * speed + (p.y - 0.5) * 0.0006 * (speed - 1)) * p.z;
          if (p.y < -0.05 || p.x < -0.05 || p.x > 1.05 || p.y > 1.05) {
            p.x = 0.5 + (Math.random() - 0.5) * (burstRef.current ? 0.2 : 1);
            p.y = burstRef.current ? 0.5 + (Math.random() - 0.5) * 0.2 : 1.05;
          }
        }
        const r = p.z * 1.6;
        const alpha = 0.15 + p.z * 0.55;
        ctx.beginPath();
        ctx.fillStyle = `rgba(170, 205, 255, ${alpha})`;
        ctx.shadowColor = "rgba(120,170,255,0.9)";
        ctx.shadowBlur = 8 * p.z;
        ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={ref} className="particles" aria-hidden="true" />;
}

export function BootScreen({ onDone }: { onDone: () => void }) {
  const { t } = useConsole();
  const [phase, setPhase] = useState<"idle" | "go">("idle");
  const go = () => {
    if (phase === "go") return;
    sound.unlock();
    sound.boot();
    setPhase("go");
    setTimeout(onDone, 2100);
  };
  useLayer(() => go());
  return (
    <div className={`screen boot boot-${phase}`} onClick={go}>
      <Particles burst={phase === "go"} />
      <div className="boot-light" />
      <div className="boot-center">
        <div className="boot-mark">
          <span className="boot-mark-ring" />
          <span className="boot-mark-text">AFU</span>
        </div>
        <div className="boot-brand">{t("boot.brand")}</div>
      </div>
      <div className="boot-press">
        <span className="only-keys">{t("boot.press")}</span>
        <span className="only-touch">{t("boot.tap")}</span>
      </div>
      <div className="boot-flash" />
    </div>
  );
}

export function OffScreen({ mode, onWake }: { mode: "off" | "rest" | "shutdown"; onWake: () => void }) {
  const { t } = useConsole();
  const [ready, setReady] = useState(mode !== "shutdown");
  useEffect(() => {
    if (mode !== "shutdown") return;
    const id = setTimeout(() => setReady(true), 2600);
    return () => clearTimeout(id);
  }, [mode]);
  const wake = () => {
    if (!ready) return;
    sound.unlock();
    onWake();
  };
  useLayer(() => wake());
  return (
    <div className={`screen off off-${mode} ${ready ? "is-ready" : ""}`} onClick={wake}>
      {mode === "shutdown" && !ready && (
        <div className="shutdown">
          <span className="spinner" />
          {t("shutdown")}
        </div>
      )}
      {mode === "rest" && (
        <div className="rest">
          <span className="rest-led" />
          <span>{t("rest.title")}</span>
        </div>
      )}
      {mode !== "rest" && ready && (
        <div className="off-msg">
          <span className="off-led" />
          <strong>{t("off.title")}</strong>
          <span>{t("off.hint")}</span>
        </div>
      )}
    </div>
  );
}

type Who = "owner" | "guest" | "recruiter";

export function UserSelect({ onPick }: { onPick: (who: Who) => void }) {
  const { t, lang } = useConsole();
  const users: { id: Who; name: string; note: string; icon?: string }[] = [
    { id: "guest", name: t("users.guest"), note: t("users.guestNote") },
    { id: "owner", name: profile.name, note: pick(lang, profile.title) },
    { id: "recruiter", name: t("users.recruiter"), note: t("users.recruiterNote"), icon: "file" },
  ];
  const grid = useGrid([users.length], { r: 0, c: 1 });
  const [leaving, setLeaving] = useState<Who | null>(null);
  const pickUser = (who: Who) => {
    if (leaving) return;
    sound.login();
    setLeaving(who);
    setTimeout(() => onPick(who), 900);
  };
  useLayer((a: Action) => {
    if (grid.move(a)) return;
    if (a === "confirm") pickUser(users[grid.pos.c].id);
  });
  return (
    <div className={`screen users ${leaving ? "is-leaving" : ""}`}>
      <AmbientBg />
      <div className="users-head">
        <span>{t("users.welcome")}</span>
        <h1>{t("users.title")}</h1>
      </div>
      <div className="users-row">
        {users.map((u, i) => (
          <button key={u.id} className={`user ${leaving === u.id ? "is-picked" : ""}`} {...navProps(grid.pos, 0, i, grid.focus, () => pickUser(u.id))}>
            {u.id === "owner" ? (
              <Avatar name={u.name} size="xl" ring />
            ) : (
              <span className={`avatar avatar-xl avatar-${u.id}`}>{u.icon ? <Icon name={u.icon} /> : <Icon name="users" />}</span>
            )}
            <strong>{u.name}</strong>
            <small>{u.note}</small>
          </button>
        ))}
      </div>
      <Hints back={false} cc={false} />
    </div>
  );
}
