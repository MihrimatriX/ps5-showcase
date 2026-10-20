"use client";
/**
 * One input model for keyboard, gamepad, mouse and touch.
 * Screens and overlays register a layer; only the most recently mounted enabled layer receives actions,
 * so an overlay naturally takes focus from the screen under it.
 */
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

export type Action =
  | "up"
  | "down"
  | "left"
  | "right"
  | "confirm"
  | "back"
  | "home"
  | "options"
  | "create"
  | "l1"
  | "r1"
  | "triangle"
  | "any";
type Handler = (a: Action) => void;
/** Typed characters for layers that take text (the search field). */
export type TextInput = { type: "char"; ch: string } | { type: "backspace" };
type Layer = { id: number; enabled: boolean; fn: { current: Handler }; text: { current: ((t: TextInput) => void) | undefined } };

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
  m: "options",
  ContextMenu: "options",
  c: "create",
  q: "l1",
  e: "r1",
  PageUp: "l1",
  PageDown: "r1",
  t: "triangle",
};

let nextId = 1;

/** Time of the last keyboard, pointer or gamepad input; the console dims the screen after a long pause. */
export const activity = { at: Date.now() };

function setModality(m: "keys" | "pointer" | "touch") {
  activity.at = Date.now();
  const el = document.documentElement;
  if (el.dataset.input !== m) el.dataset.input = m;
}

export function InputProvider({ children }: { children: ReactNode }) {
  const layers = useRef<Layer[]>([]);

  const top = () => {
    for (let i = layers.current.length - 1; i >= 0; i--) if (layers.current[i].enabled) return layers.current[i];
    return null;
  };
  const dispatch = (a: Action) => {
    top()?.fn.current(a);
  };
  const topRef = useRef(top);
  topRef.current = top;
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
      // A layer that takes text gets printable keys and Backspace as characters instead of actions.
      const text = !typing ? topRef.current()?.text.current : undefined;
      if (text && (e.key.length === 1 || e.key === "Backspace")) {
        e.preventDefault();
        setModality("keys");
        text(e.key === "Backspace" ? { type: "backspace" } : { type: "char", ch: e.key });
        return;
      }
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
    const onWheel = () => (activity.at = Date.now());
    window.addEventListener("wheel", onWheel, { passive: true });

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
        triangle: b(3),
        l1: b(4),
        r1: b(5),
        create: b(8),
        options: b(9),
        home: b(16),
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
      window.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <Ctx.Provider value={{ register, dispatch: (a) => dispatchRef.current(a) }}>{children}</Ctx.Provider>;
}

/**
 * Receive actions while this component is the top enabled layer.
 * `options` (the Options / ☰ button) arrives only if the layer asks for it; otherwise it acts like the PS button,
 * so controllers that don't expose a centre button can still reach the control center.
 * `text` makes the layer take typed characters (see TextInput).
 */
export function useLayer(fn: Handler, enabled = true, opts: { options?: boolean; text?: (t: TextInput) => void } = {}) {
  const ctx = useContext(Ctx);
  const fnRef = useRef<Handler>(fn);
  fnRef.current = (a) => {
    // The Create button works the same everywhere, so the console handles it rather than each screen.
    if (a === "create") return void window.dispatchEvent(new Event("console:create"));
    fn(a === "options" && !opts.options ? "home" : a);
  };
  const textRef = useRef(opts.text);
  textRef.current = opts.text;
  const layerRef = useRef<Layer | null>(null);
  useEffect(() => {
    if (!ctx) return;
    const layer: Layer = { id: nextId++, enabled, fn: fnRef, text: textRef };
    layerRef.current = layer;
    return ctx.register(layer);
    // Register once per mount; `enabled` is kept in sync below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx]);
  useEffect(() => {
    if (layerRef.current) layerRef.current.enabled = enabled;
  }, [enabled]);
}

/** A short haptic pulse on the first connected gamepad that supports it (DualSense / Xbox in Chromium). */
export function rumble(ms = 60, strong = 0.4, weak = 0.6) {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return;
  if (document.documentElement.dataset.haptics === "off") return;
  for (const pad of Array.from(navigator.getGamepads())) {
    const act = (pad as (Gamepad & { vibrationActuator?: { playEffect?: (t: string, p: object) => Promise<unknown> } }) | null)?.vibrationActuator;
    if (act?.playEffect) {
      act.playEffect("dual-rumble", { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
      return;
    }
  }
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
