// Web Audio API Sound Synthesizer

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private init() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (
          window as Window &
            typeof globalThis & {
              webkitAudioContext?: typeof AudioContext;
            }
        ).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMutedState(): boolean {
    return this.isMuted;
  }

  // Play a short retro beep for pin collision
  public playBounce(velocityFactor: number = 0.5) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    // Limit velocity scale
    const v = Math.min(Math.max(velocityFactor, 0.1), 1.0);

    osc.type = "sine";
    // Slide frequency down for a juicy synth bounce
    const baseFreq = 300 + v * 400;
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(v * 0.15, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  // Play a crisp click for UI buttons
  public playClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.03);

    gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  // Play an ascending chime when a ball crosses the finish line
  public playGoal(rank: number) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const baseNotes = [523.25, 659.25, 783.99]; // C5, E5, G5
    const pitch = baseNotes[Math.min(rank - 1, 2)] || 523.25;

    const now = this.ctx.currentTime;

    // Trigger 3 quick notes in an arpeggio
    const playNote = (freq: number, delay: number) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + delay);

      gainNode.gain.setValueAtTime(0, now + delay);
      gainNode.gain.linearRampToValueAtTime(0.12, now + delay + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25);

      osc.start(now + delay);
      osc.stop(now + delay + 0.3);
    };

    playNote(pitch, 0);
    playNote(pitch * 1.25, 0.06); // Major third higher
    playNote(pitch * 1.5, 0.12); // Perfect fifth higher
  }

  // Play a triumphant synth fanfare when the race ends
  public playFanfare() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [
      { f: 523.25, d: 0.0, l: 0.12 }, // C5
      { f: 659.25, d: 0.12, l: 0.12 }, // E5
      { f: 783.99, d: 0.24, l: 0.12 }, // G5
      { f: 1046.5, d: 0.36, l: 0.35 }, // C6
      { f: 783.99, d: 0.71, l: 0.12 }, // G5
      { f: 1046.5, d: 0.83, l: 0.6 }, // C6 (held)
    ];

    notes.forEach((note) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator(); // Sub-oscillator for warmth
      const gainNode = this.ctx.createGain();

      osc.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.type = "sawtooth";
      osc2.type = "triangle";

      osc.frequency.setValueAtTime(note.f, now + note.d);
      osc2.frequency.setValueAtTime(note.f / 2, now + note.d);

      gainNode.gain.setValueAtTime(0, now + note.d);
      gainNode.gain.linearRampToValueAtTime(0.1, now + note.d + 0.02);
      gainNode.gain.linearRampToValueAtTime(0.08, now + note.d + note.l - 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + note.d + note.l);

      osc.start(now + note.d);
      osc.stop(now + note.d + note.l);
      osc2.start(now + note.d);
      osc2.stop(now + note.d + note.l);
    });
  }
}

export const sound = new SoundManager();
export default sound;
