export function playCompletionSound() {
  if (typeof window === 'undefined') return;

  // Check user settings in localStorage, default to true
  const isEnabled = localStorage.getItem('sundra_completion_sound') !== 'false';
  if (!isEnabled) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // Fundamental tone: starts at C6 (1046.50Hz) and slides to E6 (1318.51Hz) for an uplifting, bouncy feel
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.50, now);
    osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08);
    
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.03); // Quick attack
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35); // Fast decay
    
    // Harmonic helper tone: starts at G6 (1567.98Hz) and slides to C7 (2093.00Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1567.98, now);
    osc2.frequency.exponentialRampToValueAtTime(2093.00, now + 0.1);
    
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.06, now + 0.04); // Slightly slower attack
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5); // Longer ring
    
    // Connect nodes to output
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    // Trigger playback
    osc1.start(now);
    osc1.stop(now + 0.4);
    
    osc2.start(now);
    osc2.stop(now + 0.6);
  } catch (error) {
    console.warn('Failed to play completion sound:', error);
  }
}
