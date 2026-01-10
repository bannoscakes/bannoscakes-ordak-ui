import { useHighPriorityNotifications } from '@/hooks/useHighPriorityNotifications';

export function HighPriorityNotificationProvider({ children }: { children: React.ReactNode }) {
  useHighPriorityNotifications();
  return <>{children}</>;
}
