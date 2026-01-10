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

    // Three-beep pattern with lower frequencies that penetrate bakery noise better
    // First beep: 400Hz
    oscillator.frequency.setValueAtTime(400, now);
    oscillator.frequency.setValueAtTime(0, now + 0.2);
    // Second beep: 600Hz
    oscillator.frequency.setValueAtTime(600, now + 0.35);
    oscillator.frequency.setValueAtTime(0, now + 0.55);
    // Third beep: 400Hz (repeat pattern for recognition)
    oscillator.frequency.setValueAtTime(400, now + 0.7);
    oscillator.frequency.setValueAtTime(0, now + 0.9);

    // Volume envelope (60% volume for better audibility in noisy environment)
    gainNode.gain.setValueAtTime(0, now);
    // First beep
    gainNode.gain.linearRampToValueAtTime(0.6, now + 0.02);
    gainNode.gain.setValueAtTime(0.6, now + 0.18);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
    // Second beep
    gainNode.gain.setValueAtTime(0, now + 0.35);
    gainNode.gain.linearRampToValueAtTime(0.6, now + 0.37);
    gainNode.gain.setValueAtTime(0.6, now + 0.53);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.55);
    // Third beep
    gainNode.gain.setValueAtTime(0, now + 0.7);
    gainNode.gain.linearRampToValueAtTime(0.6, now + 0.72);
    gainNode.gain.setValueAtTime(0.6, now + 0.88);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.9);

    oscillator.type = 'sine';
    oscillator.start(now);
    oscillator.stop(now + 0.9);
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
