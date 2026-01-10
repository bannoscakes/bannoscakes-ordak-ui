/**
 * Notification sound for high-priority order alerts.
 * Uses Web Audio API - no external files needed.
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // First beep: 800Hz
    oscillator.frequency.setValueAtTime(800, now);
    oscillator.frequency.setValueAtTime(0, now + 0.15);
    // Second beep: 1000Hz
    oscillator.frequency.setValueAtTime(1000, now + 0.25);
    oscillator.frequency.setValueAtTime(0, now + 0.4);

    // Volume envelope (30% volume, smooth fades)
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gainNode.gain.setValueAtTime(0.3, now + 0.14);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
    gainNode.gain.setValueAtTime(0, now + 0.25);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.26);
    gainNode.gain.setValueAtTime(0.3, now + 0.39);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.4);

    oscillator.type = 'sine';
    oscillator.start(now);
    oscillator.stop(now + 0.4);
  } catch (error) {
    console.warn('Failed to play notification sound:', error);
  }
}

export async function resumeAudioContext(): Promise<void> {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  } catch (error) {
    console.warn('Failed to resume AudioContext:', error);
  }
}

/**
 * Clear notification history from localStorage.
 * Useful for testing - allows notifications to trigger again for previously notified orders.
 */
export function clearNotificationHistory(): void {
  localStorage.removeItem('notified-high-priority-orders');
  console.log('Notification history cleared');
}
