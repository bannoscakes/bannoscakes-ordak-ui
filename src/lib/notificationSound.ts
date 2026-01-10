// Sound configuration constants
const BEEP_1_FREQUENCY = 600; // Hz
const BEEP_2_FREQUENCY = 800; // Hz
const BEEP_1_START = 0; // seconds
const BEEP_2_START = 0.15; // seconds
const VOLUME = 0.5; // 0-1 range
const SOUND_DURATION = 0.3; // seconds
const ATTACK_TIME = 0.01; // seconds (volume ramp up)
const BEEP_1_SUSTAIN = 0.12; // seconds
const BEEP_1_END = 0.15; // seconds
const BEEP_2_ATTACK = 0.18; // seconds
const BEEP_2_SUSTAIN = 0.28; // seconds

let audioContext: AudioContext | null = null;

export async function playNotificationSound(): Promise<void> {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContext;

    // Resume if suspended due to browser autoplay policy
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Two beeps: 600Hz then 800Hz
    oscillator.frequency.setValueAtTime(BEEP_1_FREQUENCY, now + BEEP_1_START);
    oscillator.frequency.setValueAtTime(BEEP_2_FREQUENCY, now + BEEP_2_START);

    // Volume envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(VOLUME, now + ATTACK_TIME);
    gainNode.gain.setValueAtTime(VOLUME, now + BEEP_1_SUSTAIN);
    gainNode.gain.linearRampToValueAtTime(0, now + BEEP_1_END);
    gainNode.gain.linearRampToValueAtTime(VOLUME, now + BEEP_2_ATTACK);
    gainNode.gain.setValueAtTime(VOLUME, now + BEEP_2_SUSTAIN);
    gainNode.gain.linearRampToValueAtTime(0, now + SOUND_DURATION);

    oscillator.type = 'sine';
    oscillator.start(now);
    oscillator.stop(now + SOUND_DURATION);

    // Clean up after sound completes
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };
  } catch (error) {
    console.warn('Failed to play notification sound:', error);
  }
}
