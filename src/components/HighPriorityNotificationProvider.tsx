import type { ReactNode } from 'react';
import { useHighPriorityNotifications } from '@/hooks/useHighPriorityNotifications';

export function HighPriorityNotificationProvider({ children }: { children: ReactNode }) {
  useHighPriorityNotifications();
  return <>{children}</>;
}
