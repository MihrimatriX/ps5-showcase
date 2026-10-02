"use client";
/**
 * One input model for keyboard, gamepad, mouse and touch.
 * Screens and overlays register a layer; only the most recently mounted enabled layer receives actions,
 * so an overlay naturally takes focus from the screen under it.
 */
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

export type Action = "up" | "down" | "left" | "right" | "confirm" | "back" | "home" | "any";
type Handler = (a: Action) => void;
type Layer = { id: number; enabled: boolean; fn: { current: Handler } };

const Ctx = createContext<{ register: (l: Layer) => () => void; dispatch: (a: Action) => void } | null>(null);

const KEYS: Record<string, Action> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  Enter: "confirm",
  " ": "confirm",
  x: "confirm",
  Escape: "back",
  Backspace: "back",
  o: "back",
  p: "home",
  Home: "home",
};

let nextId = 1;

function setModality(m: "keys" | "pointer" | "touch") {
  const el = document.documentElement;
  if (el.dataset.input !== m) el.dataset.input = m;
}

export function InputProvider({ children }: { children: ReactNode }) {
  const layers = useRef<Layer[]>([]);

  const dispatch = (a: Action) => {
    for (let i = layers.current.length - 1; i >= 0; i--) {
      const l = layers.current[i];
      if (l.enabled) {
        l.fn.current(a);
        return;
      }
    }
  };
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const register = (l: Layer) => {
    layers.current.push(l);
    return () => {
      layers.current = layers.current.filter((x) => x.id !== l.id);
    };
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      if (typing && !["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(e.key)) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const action = KEYS[key] ?? (e.key === "Tab" || e.key.startsWith("F") ? null : "any");
      if (!action) return;
      setModality("keys");
      if (action !== "any") e.preventDefault();
      dispatchRef.current(action);
    };
    const onPointer = (e: PointerEvent) => setModality(e.pointerType === "touch" ? "touch" : "pointer");
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });

    // Gamepad: D-pad / left stick with key-repeat, face buttons, and the centre (home) button.
    let raf = 0;
    const held = new Map<string, number>();
    const poll = () => {
      raf = requestAnimationFrame(poll);
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const pad = Array.from(pads).find(Boolean);
      if (!pad) return;
      const b = (i: number) => !!pad.buttons[i]?.pressed;
      const ax = pad.axes[0] ?? 0;
      const ay = pad.axes[1] ?? 0;
      const state: Record<string, boolean> = {
        up: b(12) || ay < -0.6,
        down: b(13) || ay > 0.6,
        left: b(14) || ax < -0.6,
        right: b(15) || ax > 0.6,
        confirm: b(0),
        back: b(1),
        home: b(16) || b(9),
      };
      const now = performance.now();
      for (const [name, pressed] of Object.entries(state)) {
        const since = held.get(name);
        if (!pressed) {
          held.delete(name);
          continue;
        }
        const repeats = name === "up" || name === "down" || name === "left" || name === "right";
        if (since === undefined) {
          held.set(name, now + 380);
          setModality("keys");
          dispatchRef.current(name as Action);
        } else if (repeats && now >= since) {
          held.set(name, now + 110);
          dispatchRef.current(name as Action);
        }
      }
    };
    raf = requestAnimationFrame(poll);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("pointermove", onPointer);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <Ctx.Provider value={{ register, dispatch: (a) => dispatchRef.current(a) }}>{children}</Ctx.Provider>;
}

/** Receive actions while this component is the top enabled layer. */
export function useLayer(fn: Handler, enabled = true) {
  const ctx = useContext(Ctx);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const layerRef = useRef<Layer | null>(null);
  useEffect(() => {
    if (!ctx) return;
    const layer: Layer = { id: nextId++, enabled, fn: fnRef };
    layerRef.current = layer;
    return ctx.register(layer);
    // Register once per mount; `enabled` is kept in sync below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx]);
  useEffect(() => {
    if (layerRef.current) layerRef.current.enabled = enabled;
  }, [enabled]);
}

export function useDispatch() {
  const ctx = useContext(Ctx);
  return ctx?.dispatch ?? (() => {});
}

export type SwipeDir = "left" | "right" | "up" | "down";

/**
 * Swipe detection for touch screens. `left` means the finger moved left (i.e. go to the next item).
 * `steps` grows with distance and flick speed so a long swipe skips several tiles.
 */
export function useSwipe(onSwipe: (dir: SwipeDir, steps: number) => void, stepPx = 90) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const cb = useRef(onSwipe);
  cb.current = onSwipe;
  return {
    onTouchStart: (e: React.TouchEvent) => {
      const p = e.touches[0];
      start.current = { x: p.clientX, y: p.clientY, t: performance.now() };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const p = e.changedTouches[0];
      const dx = p.clientX - s.x;
      const dy = p.clientY - s.y;
      const horizontal = Math.abs(dx) > Math.abs(dy);
      const dist = horizontal ? Math.abs(dx) : Math.abs(dy);
      if (dist < 32) return;
      const fast = performance.now() - s.t < 220;
      const steps = Math.max(1, Math.round(dist / stepPx) + (fast ? 1 : 0));
      cb.current(horizontal ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down", steps);
    },
  };
}
