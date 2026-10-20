"use client";
/** Row/column focus for screens laid out as rows of items (keyboard + gamepad navigation). */
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Action } from "./input";
import { sound } from "./sound";

export type Pos = { r: number; c: number };

export function useGrid(rows: number[], initial: Pos = { r: 0, c: 0 }) {
  const [pos, setPos] = useState<Pos>(initial);
  const lastCol = useRef<Record<number, number>>({});
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const posRef = useRef(pos);
  posRef.current = pos;

  const set = useCallback((p: Pos) => {
    posRef.current = p;
    setPos(p);
  }, []);

  const move = useCallback(
    (a: Action): boolean => {
      const rs = rowsRef.current;
      const p = posRef.current;
      let next: Pos | null = null;
      if (a === "left" || a === "right") {
        const nc = p.c + (a === "left" ? -1 : 1);
        if (nc >= 0 && nc < (rs[p.r] ?? 0)) next = { r: p.r, c: nc };
      } else if (a === "up" || a === "down") {
        const dir = a === "up" ? -1 : 1;
        let nr = p.r + dir;
        while (nr >= 0 && nr < rs.length && rs[nr] === 0) nr += dir;
        if (nr >= 0 && nr < rs.length) next = { r: nr, c: Math.min(lastCol.current[nr] ?? 0, rs[nr] - 1) };
      }
      if (!next) return false;
      lastCol.current[next.r] = next.c;
      set(next);
      sound.move();
      return true;
    },
    [set],
  );

  const focus = useCallback(
    (r: number, c: number) => {
      const p = posRef.current;
      if (p.r === r && p.c === c) return;
      lastCol.current[r] = c;
      set({ r, c });
    },
    [set],
  );

  return { pos, move, focus, setPos: set };
}

/** Keep the focused element in view inside a scrolling container. */
export function useScrollToFocus(container: RefObject<HTMLElement | null>, pos: Pos) {
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    // Only keys and pads follow the focus. A mouse focuses on hover, and scrolling the hovered item away would put
    // another one under the cursor, which would scroll again: the page would run off by itself.
    const m = document.documentElement.dataset.input;
    if (m === "pointer" || m === "touch") return;
    const el = root.querySelector<HTMLElement>(`[data-nav="${pos.r}-${pos.c}"]`);
    if (!el) return;
    if (pos.r === 0) root.scrollTo({ top: 0, behavior: "smooth" });
    else el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    const row = el.closest<HTMLElement>("[data-row-scroll]");
    if (row) {
      const left = el.offsetLeft - row.clientWidth * 0.08;
      row.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    }
  }, [container, pos.r, pos.c]);
}

/** Props that make an element focusable by hover/tap and mark it for keyboard focus styling. */
export function navProps(pos: Pos, r: number, c: number, focus: (r: number, c: number) => void, onActivate: () => void) {
  const active = pos.r === r && pos.c === c;
  return {
    "data-nav": `${r}-${c}`,
    "data-focus": active ? "true" : undefined,
    onMouseEnter: () => {
      if (document.documentElement.dataset.input === "pointer") focus(r, c);
    },
    onClick: () => {
      focus(r, c);
      onActivate();
    },
  };
}
