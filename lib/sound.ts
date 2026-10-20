/**
 * Every console sound is synthesized here with Web Audio; the app ships no audio files.
 * The context is created lazily on the first user gesture (browsers block it before that).
 */
type Voice = { type: OscillatorType; freq: number; to?: number; at?: number; dur: number; gain: number; glide?: number };

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private wet: GainNode | null = null;
  private pad: { stop: (fade?: number) => void } | null = null;
  private padKey = "";
  private themeTimer: ReturnType<typeof setTimeout> | null = null;
  sfx = true;
  music = false;
  /** 0..1, applied to everything through the master bus. */
  volume = 0.8;
  /** Index into `tracks` for the system (non-game) music. */
  track = 0;
  /** Seed of the game whose theme is playing, or null for the system track. */
  theme: string | null = null;
  private listeners = new Set<() => void>();

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      const ctx = new Ctx();
      const master = ctx.createGain();
      master.gain.value = 0.85 * this.volume;
      master.connect(ctx.destination);
      // Small generated room: noise with an exponential tail.
      const verb = ctx.createConvolver();
      const len = Math.floor(ctx.sampleRate * 2.6);
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
      }
      verb.buffer = buf;
      const wet = ctx.createGain();
      wet.gain.value = 0.35;
      wet.connect(verb).connect(master);
      this.ctx = ctx;
      this.master = master;
      this.wet = wet;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  /** Call from a user gesture so later sounds are allowed. */
  unlock() {
    this.ensure();
  }

  private play(voices: Voice[], opts: { wet?: number; force?: boolean } = {}) {
    if (!this.sfx && !opts.force) return;
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.wet) return;
    const now = ctx.currentTime + 0.005;
    for (const v of voices) {
      const start = now + (v.at ?? 0);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = v.type;
      osc.frequency.setValueAtTime(v.freq, start);
      if (v.to) osc.frequency.exponentialRampToValueAtTime(v.to, start + (v.glide ?? v.dur * 0.5));
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(v.gain, start + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, start + v.dur);
      osc.connect(g);
      g.connect(this.master);
      const send = ctx.createGain();
      send.gain.value = opts.wet ?? 0.5;
      g.connect(send).connect(this.wet);
      osc.start(start);
      osc.stop(start + v.dur + 0.05);
    }
  }

  move() {
    this.play(
      [
        { type: "sine", freq: 1320, to: 1760, dur: 0.07, gain: 0.05, glide: 0.03 },
        { type: "triangle", freq: 2640, dur: 0.04, gain: 0.012 },
      ],
      { wet: 0.25 },
    );
  }

  select() {
    this.play(
      [
        { type: "sine", freq: 880, dur: 0.18, gain: 0.07 },
        { type: "sine", freq: 1318.5, at: 0.05, dur: 0.28, gain: 0.06 },
        { type: "triangle", freq: 2637, at: 0.05, dur: 0.12, gain: 0.01 },
      ],
      { wet: 0.5 },
    );
  }

  back() {
    this.play([{ type: "sine", freq: 1046, to: 587, dur: 0.16, gain: 0.06, glide: 0.1 }], { wet: 0.35 });
  }

  open() {
    this.play(
      [
        { type: "sine", freq: 392, to: 784, dur: 0.6, gain: 0.05, glide: 0.35 },
        { type: "sine", freq: 587, at: 0.12, dur: 0.9, gain: 0.04 },
        { type: "sine", freq: 1175, at: 0.24, dur: 0.9, gain: 0.03 },
      ],
      { wet: 0.9 },
    );
  }

  /** Power-on swell: a slow chord that blooms into the reverb. */
  boot() {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.wet || !this.sfx) return;
    const now = ctx.currentTime + 0.02;
    const notes = [146.83, 220, 293.66, 369.99, 440, 659.25];
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(5200, now + 1.6);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 4.5);
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, now);
    bus.gain.exponentialRampToValueAtTime(0.16, now + 1.1);
    bus.gain.exponentialRampToValueAtTime(0.0001, now + 5.2);
    filter.connect(bus);
    bus.connect(this.master);
    const send = ctx.createGain();
    send.gain.value = 1;
    bus.connect(send).connect(this.wet);
    notes.forEach((f, i) => {
      for (const detune of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = i < 2 ? "sine" : "triangle";
        o.frequency.value = f;
        o.detune.value = detune;
        const g = ctx.createGain();
        g.gain.value = 0.12 / (1 + i * 0.4);
        o.connect(g).connect(filter);
        o.start(now + i * 0.06);
        o.stop(now + 5.5);
      }
    });
    this.play(
      [1760, 2217, 2637, 3520].map((f, i) => ({ type: "sine" as const, freq: f, at: 0.9 + i * 0.11, dur: 1.4, gain: 0.018 })),
      { wet: 1 },
    );
  }

  login() {
    this.play(
      [587.33, 739.99, 880, 1174.66].map((f, i) => ({ type: "sine" as const, freq: f, at: i * 0.07, dur: 0.9, gain: 0.05 })),
      { wet: 0.9 },
    );
  }

  trophy() {
    this.play(
      [
        { type: "sine", freq: 1318.5, dur: 1.2, gain: 0.06 },
        { type: "sine", freq: 1975.5, dur: 0.9, gain: 0.03 },
        { type: "sine", freq: 1568, at: 0.16, dur: 1.4, gain: 0.06 },
        { type: "sine", freq: 2349, at: 0.16, dur: 1, gain: 0.03 },
        { type: "triangle", freq: 3136, at: 0.3, dur: 0.6, gain: 0.012 },
      ],
      { wet: 0.8 },
    );
  }

  error() {
    this.play([{ type: "triangle", freq: 220, to: 180, dur: 0.18, gain: 0.05 }], { wet: 0.2 });
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(0.85 * this.volume, this.ctx.currentTime, 0.05);
  }

  /** Subscribe to music changes (track / theme / on-off) so the UI can show what's playing. */
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  /** Quiet generative pad: the system music, or a game's theme while its tile is focused. */
  setMusic(on: boolean) {
    if (this.music === on && (on ? this.pad : !this.pad)) return;
    this.music = on;
    if (!on) {
      this.pad?.stop(1.2);
      this.pad = null;
      this.padKey = "";
    } else this.refreshPad();
    this.emit();
  }

  nextTrack(dir: 1 | -1 = 1) {
    this.setTrack((this.track + dir + tracks.length) % tracks.length);
  }

  setTrack(i: number) {
    this.track = i;
    this.theme = null;
    if (this.themeTimer) clearTimeout(this.themeTimer);
    if (this.music) this.refreshPad();
    this.emit();
  }

  /** Play a game's theme (derived from its id) instead of the system track; null goes back. Debounced for fast scrolling. */
  setTheme(seed: string | null) {
    if (this.theme === seed) return;
    if (this.themeTimer) clearTimeout(this.themeTimer);
    this.themeTimer = setTimeout(() => {
      this.theme = seed;
      if (this.music) this.refreshPad();
      this.emit();
    }, 420);
  }

  private refreshPad() {
    const voicing = this.theme ? themeVoicing(this.theme) : tracks[this.track].notes;
    const key = this.theme ? `t:${this.theme}` : `s:${this.track}`;
    if (this.pad && key === this.padKey) return;
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.wet) return;
    this.pad?.stop(2.2);
    this.padKey = key;
    this.pad = this.startPad(ctx, voicing, this.theme ? hash(this.theme) : this.track);
  }

  private startPad(ctx: AudioContext, notes: number[], seed: number) {
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(0.05, now + 3);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 820 + (seed % 5) * 90;
    filter.Q.value = 0.6;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.04 + (seed % 7) * 0.006;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 480;
    lfo.connect(lfoGain).connect(filter.frequency);
    filter.connect(out);
    out.connect(this.master!);
    const send = ctx.createGain();
    send.gain.value = 1.2;
    out.connect(send).connect(this.wet!);
    const oscs: OscillatorNode[] = [lfo];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? "triangle" : "sine";
      o.frequency.value = f;
      o.detune.value = (i % 3) * 4 - 4;
      const g = ctx.createGain();
      g.gain.value = 0.25 / (1 + i * 0.5);
      const trem = ctx.createOscillator();
      trem.frequency.value = 0.07 + i * 0.023;
      const tremGain = ctx.createGain();
      tremGain.gain.value = g.gain.value * 0.6;
      trem.connect(tremGain).connect(g.gain);
      o.connect(g).connect(filter);
      o.start();
      trem.start();
      oscs.push(o, trem);
    });
    // A slow, sparse bell melody on top so the pad doesn't feel static.
    const bells = window.setInterval(() => {
      if (!this.music || document.hidden) return;
      const t = ctx.currentTime;
      const f = notes[2 + Math.floor(Math.random() * (notes.length - 2))] * (Math.random() < 0.5 ? 2 : 4);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.012, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 2.5);
    }, 2600 + (seed % 4) * 700);
    lfo.start();
    return {
      stop: (fade = 1.2) => {
        clearInterval(bells);
        const t = ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
        out.gain.exponentialRampToValueAtTime(0.0001, t + fade);
        oscs.forEach((o) => o.stop(t + fade + 0.1));
      },
    };
  }
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const semis = (root: number, steps: number[]) => steps.map((s) => root * Math.pow(2, s / 12));

/** System music: a few slow chords, each a "track" in the music card. */
export const tracks: { name: { tr: string; en: string }; notes: number[] }[] = [
  { name: { tr: "Kozmik sürüklenme", en: "Cosmic drift" }, notes: semis(73.42, [0, 12, 19, 23, 26, 31]) },
  { name: { tr: "Kuzey ışıkları", en: "Northern lights" }, notes: semis(87.31, [0, 12, 16, 23, 30, 35]) },
  { name: { tr: "Gece vardiyası", en: "Night shift" }, notes: semis(110, [0, 12, 15, 19, 26, 31]) },
  { name: { tr: "Kor", en: "Ember" }, notes: semis(77.78, [0, 12, 19, 26, 28, 35]) },
];

/** A game's theme: root and chord quality picked from its id, so each project always sounds the same. */
function themeVoicing(seed: string) {
  const h = hash(seed);
  const roots = [65.41, 69.3, 73.42, 77.78, 82.41, 87.31, 92.5, 98, 103.83, 110];
  const shapes = [
    [0, 12, 19, 23, 26, 31],
    [0, 12, 15, 19, 26, 31],
    [0, 12, 16, 23, 30, 35],
    [0, 7, 14, 19, 22, 27],
    [0, 12, 17, 24, 26, 31],
  ];
  return semis(roots[h % roots.length], shapes[(h >>> 4) % shapes.length]);
}

export const sound = new SoundEngine();
