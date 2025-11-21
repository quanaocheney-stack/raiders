
class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private bgmOscs: OscillatorNode[] = [];
  private bgmGain: GainNode | null = null;
  private initialized: boolean = false;
  private lastHitTime: number = 0;

  init() {
    if (this.initialized) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3; // Master volume
      this.masterGain.connect(this.ctx.destination);
      
      // Create noise buffer for explosions
      const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.initialized = true;
    } catch (e) {
      console.error("Audio init failed", e);
    }
  }

  playBGM(biomeIndex: number) {
    if (!this.ctx || !this.masterGain) return;
    this.stopBGM();

    this.bgmGain = this.ctx.createGain();
    // Drastically reduced volume to remove "noise" feel, almost silent but present for atmosphere
    this.bgmGain.gain.value = 0.02; 
    this.bgmGain.connect(this.masterGain);

    // Generate a chord based on biome
    const rootFreqs = [110, 98, 130, 82]; // Different roots for biomes
    const base = rootFreqs[biomeIndex % rootFreqs.length];
    const notes = [base, base * 1.5]; // Simple chord, removed complexity

    notes.forEach((freq, i) => {
       const osc = this.ctx!.createOscillator();
       osc.type = 'sine'; // Pure sine wave, no harshness
       osc.frequency.value = freq;
       osc.connect(this.bgmGain!);
       osc.start();
       this.bgmOscs.push(osc);
    });
  }

  stopBGM() {
      this.bgmOscs.forEach(o => {
          try { o.stop(); o.disconnect(); } catch(e){}
      });
      this.bgmOscs = [];
      if (this.bgmGain) {
          this.bgmGain.disconnect();
          this.bgmGain = null;
      }
  }

  startDrone() {
     // Deprecated
  }

  stopDrone() {
     // Deprecated
  }

  playSupplyDrop() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    // A low thrumming sound for arrival
    const now = this.ctx.currentTime;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.5);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + 0.8);
    
    osc.start(now);
    osc.stop(now + 0.8);
  }

  playHit(isCrit: boolean = false) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    
    // Rate limit hit sounds to prevent audio tearing/overload
    if (now - this.lastHitTime < 0.06) return;
    this.lastHitTime = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    // Short, high pitch tick for feedback
    osc.type = isCrit ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(isCrit ? 880 : 600, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
    
    gain.gain.setValueAtTime(isCrit ? 0.15 : 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playShoot(weaponType: 'RIFLE' | 'SHOTGUN' | 'SNIPER' | 'TURRET' | 'MISSILE' | 'PLASMA' | 'GAUSS' | 'LASER' | 'MINE' | 'CHAIN_LASER') {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    const now = this.ctx.currentTime;

    if (weaponType === 'RIFLE') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      filter.type = 'highpass';
      filter.frequency.value = 1000;
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      this.playNoise(0.05, 0.1); // Add mechanical kick
    } else if (weaponType === 'SHOTGUN') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
      this.playNoise(0.15, 0.15); // Heavier impact
    } else if (weaponType === 'SNIPER') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
      this.playNoise(0.1, 0.1);
    } else if (weaponType === 'TURRET') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (weaponType === 'MISSILE') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1000, now);
      osc.frequency.linearRampToValueAtTime(200, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (weaponType === 'PLASMA') {
       osc.type = 'sine';
       osc.frequency.setValueAtTime(1500, now);
       osc.frequency.exponentialRampToValueAtTime(500, now + 0.2);
       gain.gain.setValueAtTime(0.15, now);
       gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
       osc.start(now);
       osc.stop(now + 0.2);
    } else if (weaponType === 'GAUSS') {
       osc.type = 'triangle';
       osc.frequency.setValueAtTime(100, now);
       osc.frequency.linearRampToValueAtTime(1200, now + 0.05);
       gain.gain.setValueAtTime(0.2, now);
       gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
       osc.start(now);
       osc.stop(now + 0.15);
    } else if (weaponType === 'LASER') {
       // Improved Laser Sound: Higher pitch zap
       osc.type = 'sawtooth';
       osc.frequency.setValueAtTime(1200, now);
       osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
       filter.type = 'bandpass';
       filter.frequency.value = 2000;
       gain.gain.setValueAtTime(0.15, now);
       gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
       osc.start(now);
       osc.stop(now + 0.15);
    } else if (weaponType === 'MINE') {
       osc.type = 'sine';
       osc.frequency.setValueAtTime(800, now);
       osc.frequency.linearRampToValueAtTime(1000, now + 0.1);
       gain.gain.setValueAtTime(0.2, now);
       gain.gain.linearRampToValueAtTime(0, now + 0.1);
       osc.start(now);
       osc.stop(now + 0.1);
    } else if (weaponType === 'CHAIN_LASER') {
       // Sci-fi wobble zap
       osc.type = 'square';
       osc.frequency.setValueAtTime(800, now);
       osc.frequency.linearRampToValueAtTime(1600, now + 0.1);
       osc.frequency.linearRampToValueAtTime(800, now + 0.2);
       gain.gain.setValueAtTime(0.2, now);
       gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
       osc.start(now);
       osc.stop(now + 0.25);
    }
  }

  playExplosion(size: 'SMALL' | 'LARGE' = 'SMALL') {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const duration = size === 'LARGE' ? 0.8 : 0.4;
    const volume = size === 'LARGE' ? 0.5 : 0.25;
    
    const now = this.ctx.currentTime;

    // Noise component
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    source.start(now);
    source.stop(now + duration);

    // Sub-bass impact
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    
    subOsc.frequency.setValueAtTime(100, now);
    subOsc.frequency.exponentialRampToValueAtTime(10, now + duration);
    
    subGain.gain.setValueAtTime(volume * 1.5, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    subOsc.start(now);
    subOsc.stop(now + duration);
  }

  playPickup(type: 'LOOT' | 'HEALTH' | 'EQUIPMENT') {
    if (!this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    const now = this.ctx.currentTime;
    
    if (type === 'LOOT') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'HEALTH') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.1);
        osc.frequency.linearRampToValueAtTime(800, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'EQUIPMENT') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.1);
        osc.frequency.setValueAtTime(1760, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    }
  }
  
  playDamage() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    osc.start(now);
    osc.stop(now + 0.2);

    // Add noise crunch for damage
    this.playNoise(0.1, 0.1);
  }

  playUiClick() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playLevelUp() {
      if (!this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554, now + 0.1); // C#
      osc.frequency.setValueAtTime(659, now + 0.2); // E
      osc.frequency.setValueAtTime(880, now + 0.3); // A
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.3);
      gain.gain.linearRampToValueAtTime(0, now + 0.6);
      
      osc.start(now);
      osc.stop(now + 0.6);
  }

  private playNoise(duration: number, vol: number) {
      if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
      const source = this.ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      const gain = this.ctx.createGain();
      source.connect(gain);
      gain.connect(this.masterGain);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);
      source.start();
      source.stop(this.ctx.currentTime + duration);
  }
}

export const audio = new AudioService();
