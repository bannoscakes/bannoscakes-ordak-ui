/**
 * Types for realtime messaging payloads
 * These match the actual database table structures from Supabase realtime
 */

// Realtime row coming directly from the "messages" table subscription
export interface RealtimeMessageRow {
  id: number;
  conversation_id: string;
  body: string;
  sender_id: string;
  sender_name: string;
  created_at: string;
  // Often not present in realtime unless you've added it via a trigger/view:
  is_own_message?: boolean;
}

export interface RealtimeConversationRow {
  id: string;
  name: string | null;
  type: 'direct' | 'group' | 'broadcast';
  created_by: string;
  created_at: string;
  updated_at: string;
}
