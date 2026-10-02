/**
 * Every console sound is synthesized here with Web Audio; the app ships no audio files.
 * The context is created lazily on the first user gesture (browsers block it before that).
 */
type Voice = { type: OscillatorType; freq: number; to?: number; at?: number; dur: number; gain: number; glide?: number };

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private wet: GainNode | null = null;
  private ambientNodes: { stop: () => void } | null = null;
  sfx = true;
  music = false;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      const ctx = new Ctx();
      const master = ctx.createGain();
      master.gain.value = 0.7;
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

  /** Quiet generative pad for the home screen. */
  setMusic(on: boolean) {
    this.music = on;
    if (!on) {
      this.ambientNodes?.stop();
      this.ambientNodes = null;
      return;
    }
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.wet || this.ambientNodes) return;
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(0.05, now + 4);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.6;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 500;
    lfo.connect(lfoGain).connect(filter.frequency);
    filter.connect(out);
    out.connect(this.master);
    const send = ctx.createGain();
    send.gain.value = 1.2;
    out.connect(send).connect(this.wet);
    const oscs: OscillatorNode[] = [lfo];
    // Dmaj9 voicing, slowly breathing.
    [73.42, 146.83, 220, 277.18, 329.63, 440].forEach((f, i) => {
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
    lfo.start();
    this.ambientNodes = {
      stop: () => {
        const t = ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(out.gain.value, t);
        out.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        oscs.forEach((o) => o.stop(t + 1.3));
      },
    };
  }
}

export const sound = new SoundEngine();
