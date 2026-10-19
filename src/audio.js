/**
 * CALM CELESTIAL AMBIENT MUSIC ENGINE (WEB AUDIO API)
 * Generates peaceful, meditative music inspired by ambient piano,
 * celestial celesta chimes, and lush analog string pad chord progressions.
 */

export class CosmicAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.masterGain = null;
    this.musicGain = null;
    this.delayNodeL = null;
    this.delayNodeR = null;
    this.feedbackGain = null;

    // Active music scheduling handles
    this.chordInterval = null;
    this.melodyTimeout = null;
    this.currentChordIndex = 0;
    this.activePadOscs = [];

    // Serene 4-Chord Ambient Progression (D Major 9 -> G Major 7 -> B Minor 9 -> A Add 9)
    this.chords = [
      {
        name: "Cosmos (Dmaj9)",
        pad: [146.83, 220.00, 369.99, 440.00], // D3, A3, F#4, A4
        melodyScale: [293.66, 369.99, 440.00, 554.37, 587.33, 659.25, 739.99] // D4, F#4, A4, C#5, D5, E5, F#5
      },
      {
        name: "Nebula (Gmaj7)",
        pad: [196.00, 246.94, 293.66, 369.99], // G3, B3, D4, F#4
        melodyScale: [246.94, 293.66, 369.99, 440.00, 493.88, 587.33, 739.99] // B3, D4, F#4, A4, B4, D5, F#5
      },
      {
        name: "Solitude (Bm9)",
        pad: [123.47, 185.00, 293.66, 440.00], // B2, F#3, D4, A4
        melodyScale: [293.66, 369.99, 440.00, 493.88, 554.37, 587.33, 659.25] // D4, F#4, A4, B4, C#5, D5, E5
      },
      {
        name: "Aurora (Aadd9)",
        pad: [110.00, 164.81, 293.66, 440.00], // A2, E3, D4, A4
        melodyScale: [220.00, 293.66, 369.99, 440.00, 554.37, 659.25, 880.00] // A3, D4, F#4, A4, C#5, E5, A5
      }
    ];
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // 1. Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // 2. Music Bus Gain
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    // 3. Stereo Spatial Delay & Reverb Network for Dreamy Ambience
    this.setupDelayReverb();
  }

  setupDelayReverb() {
    if (!this.ctx) return;

    // Stereo splitters
    const splitter = this.ctx.createChannelSplitter(2);
    const merger = this.ctx.createChannelMerger(2);

    // Left delay (380ms) and Right delay (570ms) for lush stereo width
    this.delayNodeL = this.ctx.createDelay(2.0);
    this.delayNodeR = this.ctx.createDelay(2.0);
    this.delayNodeL.delayTime.setValueAtTime(0.38, this.ctx.currentTime);
    this.delayNodeR.delayTime.setValueAtTime(0.57, this.ctx.currentTime);

    // Damping lowpass filter on delays for warm analog tape sound
    const delayFilter = this.ctx.createBiquadFilter();
    delayFilter.type = "lowpass";
    delayFilter.frequency.setValueAtTime(1600, this.ctx.currentTime);

    // Feedback loop
    this.feedbackGain = this.ctx.createGain();
    this.feedbackGain.gain.setValueAtTime(0.32, this.ctx.currentTime);

    // Reverb wet gain
    this.reverbWet = this.ctx.createGain();
    this.reverbWet.gain.setValueAtTime(0.48, this.ctx.currentTime);

    // Connect delay circuit
    this.musicGain.connect(this.delayNodeL);
    this.musicGain.connect(this.delayNodeR);

    this.delayNodeL.connect(delayFilter);
    this.delayNodeR.connect(delayFilter);
    delayFilter.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNodeL);
    this.feedbackGain.connect(this.delayNodeR);

    this.delayNodeL.connect(this.reverbWet);
    this.delayNodeR.connect(this.reverbWet);
    this.reverbWet.connect(this.masterGain);
  }

  async toggle() {
    if (!this.ctx) this.init();

    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    if (this.isPlaying) {
      this.stopMusic();
      this.isPlaying = false;
    } else {
      this.startMusic();
      this.isPlaying = true;
    }
    return this.isPlaying;
  }

  startMusic() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Smoothly fade in overall music gain
    this.musicGain.gain.setValueAtTime(0.001, now);
    this.musicGain.gain.linearRampToValueAtTime(0.55, now + 2.0);

    // Start with chord 0
    this.currentChordIndex = 0;
    this.playChordPad(this.chords[this.currentChordIndex]);

    // Schedule progressive chord transitions every 9 seconds
    this.chordInterval = setInterval(() => {
      if (!this.isPlaying) return;
      this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;
      this.playChordPad(this.chords[this.currentChordIndex]);
    }, 9000);

    // Start generative celestial piano/celesta melody drops
    this.scheduleNextMelodyNote();
  }

  playChordPad(chord) {
    if (!this.ctx || !this.isPlaying) return;
    const now = this.ctx.currentTime;
    const chordDuration = 9.5; // Slightly overlap with next chord

    // Fade out old pad voices
    const oldOscs = [...this.activePadOscs];
    this.activePadOscs = [];
    oldOscs.forEach(({ osc, gain }) => {
      try {
        gain.gain.linearRampToValueAtTime(0.0001, now + 2.5);
        osc.stop(now + 2.6);
      } catch (e) {}
    });

    // Create new warm swelling pad chord
    chord.pad.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const voiceGain = this.ctx.createGain();

      // Mix gentle sine and triangle waves for pure, warm timbre
      osc.type = idx === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, now);

      // Subtle detuning for analog chorus richness
      osc.detune.setValueAtTime((idx % 2 === 0 ? -3 : 3), now);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450 + idx * 80, now);
      filter.Q.setValueAtTime(1.0, now);

      // Slow, peaceful attack (2.8s) and sustain
      const targetVolume = 0.08 - idx * 0.012;
      voiceGain.gain.setValueAtTime(0.0001, now);
      voiceGain.gain.linearRampToValueAtTime(targetVolume, now + 2.8);
      voiceGain.gain.setValueAtTime(targetVolume, now + chordDuration - 2.5);
      voiceGain.gain.linearRampToValueAtTime(0.0001, now + chordDuration);

      osc.connect(filter);
      filter.connect(voiceGain);
      voiceGain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + chordDuration + 0.5);

      this.activePadOscs.push({ osc, gain: voiceGain });
    });
  }

  scheduleNextMelodyNote() {
    if (!this.isPlaying || !this.ctx) return;

    // Organic, peaceful interval between notes (1.6s to 3.2s)
    const delayMs = 1600 + Math.random() * 1600;

    this.melodyTimeout = setTimeout(() => {
      if (!this.isPlaying) return;

      const chord = this.chords[this.currentChordIndex];
      const scale = chord.melodyScale;
      // Pick a random harmonically consonant note
      const noteFreq = scale[Math.floor(Math.random() * scale.length)];

      this.playPianoNote(noteFreq);
      this.scheduleNextMelodyNote();
    }, delayMs);
  }

  /**
   * Synthesizes a soft, warm acoustic felt piano / celesta note
   */
  playPianoNote(freq, velocity = 0.28) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Fundamental Oscillator (Warm Body)
    const osc1 = this.ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(freq, now);

    // 2. Second Harmonic (Wood / Felt Acoustic Resonance)
    const osc2 = this.ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(freq * 2, now);

    // Filter to soften the upper frequencies (Felt Piano Muffle)
    const noteFilter = this.ctx.createBiquadFilter();
    noteFilter.type = "lowpass";
    noteFilter.frequency.setValueAtTime(1400, now);
    noteFilter.frequency.exponentialRampToValueAtTime(450, now + 1.8);

    // Amplitude Envelope: Instant soft hammer strike (15ms attack) + long bell decay (2.8s)
    const noteGain = this.ctx.createGain();
    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.linearRampToValueAtTime(velocity, now + 0.02);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

    const harmGain = this.ctx.createGain();
    harmGain.gain.setValueAtTime(0.18, now);

    osc1.connect(noteFilter);
    osc2.connect(harmGain);
    harmGain.connect(noteFilter);

    noteFilter.connect(noteGain);
    noteGain.connect(this.musicGain);

    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + 3.1);
    osc2.stop(now + 3.1);
  }

  stopMusic() {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;

    // Clear loops
    if (this.chordInterval) {
      clearInterval(this.chordInterval);
      this.chordInterval = null;
    }
    if (this.melodyTimeout) {
      clearTimeout(this.melodyTimeout);
      this.melodyTimeout = null;
    }

    // Fade out music cleanly over 1.2s
    this.musicGain.gain.linearRampToValueAtTime(0.0001, now + 1.2);

    setTimeout(() => {
      this.activePadOscs.forEach(({ osc }) => {
        try { osc.stop(); } catch (e) {}
      });
      this.activePadOscs = [];
    }, 1300);
  }

  /**
   * UI tactile feedback: Plays gentle, melodious chime in harmony with the current chord
   */
  playBeep(freq = 660, duration = 0.12, volume = 0.18) {
    if (!this.ctx) this.init();
    try {
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      this.playPianoNote(freq, volume);
    } catch (e) {}
  }
}
