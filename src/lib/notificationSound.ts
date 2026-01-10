let audioContext: AudioContext | null = null;

export function playNotificationSound(): void {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContext;
    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Two beeps: 600Hz then 800Hz
    oscillator.frequency.setValueAtTime(600, now);
    oscillator.frequency.setValueAtTime(800, now + 0.15);

    // Volume envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.01);
    gainNode.gain.setValueAtTime(0.5, now + 0.12);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.18);
    gainNode.gain.setValueAtTime(0.5, now + 0.28);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.3);

    oscillator.type = 'sine';
    oscillator.start(now);
    oscillator.stop(now + 0.3);
  } catch (error) {
    console.warn('Failed to play notification sound:', error);
  }
}
