import { toast } from 'sonner';
import type { Message } from '../components/messaging/types';

interface MessageNotificationOptions {
  showToast?: boolean;
  playSound?: boolean;
  updateBadge?: boolean;
}

/**
 * Show notification for new message
 */
export const showMessageNotification = (
  message: Message,
  conversationName: string,
  options: MessageNotificationOptions = {}
) => {
  const {
    showToast = true,
    playSound = true,
    updateBadge = true
  } = options;

  // Show toast notification
  if (showToast) {
    toast.info(`New message from ${conversationName}`, {
      description: message.text.length > 50 
        ? `${message.text.substring(0, 50)}...` 
        : message.text,
      duration: 5000,
    });
  }

  // Play notification sound
  if (playSound) {
    playNotificationSound();
  }

  // Update browser tab title with unread count
  if (updateBadge) {
    updateTabTitle();
  }
};

/**
 * Play notification sound
 */
const playNotificationSound = () => {
  try {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
};

/**
 * Update browser tab title with unread count
 */
const updateTabTitle = () => {
  const originalTitle = document.title;
  const hasUnread = originalTitle.includes('●');
  
  if (!hasUnread) {
    document.title = `● ${originalTitle}`;
    
    // Reset title after 5 seconds
    setTimeout(() => {
      if (document.title === `● ${originalTitle}`) {
        document.title = originalTitle;
      }
    }, 5000);
  }
};

/**
 * Clear tab title badge
 */
export const clearTabTitleBadge = () => {
  const title = document.title;
  if (title.startsWith('● ')) {
    document.title = title.substring(2);
  }
};

/**
 * Check if user is currently focused on the app
 */
export const isAppFocused = (): boolean => {
  return document.hasFocus();
};

/**
 * Check if user is currently viewing the messages page
 */
export const isMessagesPageActive = (): boolean => {
  return window.location.pathname.includes('messages') || 
         window.location.search.includes('view=messages');
};

/**
 * Show notification only if appropriate
 */
export const showConditionalNotification = (
  message: Message,
  conversationName: string,
  options: MessageNotificationOptions = {}
) => {
  // Don't show notifications if user is actively using the app
  if (isAppFocused() && isMessagesPageActive()) {
    return;
  }

  showMessageNotification(message, conversationName, options);
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

/**
 * Show browser notification (requires permission)
 */
export const showBrowserNotification = (
  message: Message,
  conversationName: string
) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(`New message from ${conversationName}`, {
      body: message.text.length > 100 
        ? `${message.text.substring(0, 100)}...` 
        : message.text,
      icon: '/favicon.ico',
      tag: `message-${message.id}`, // Prevent duplicate notifications
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    // Focus window when notification is clicked
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};
