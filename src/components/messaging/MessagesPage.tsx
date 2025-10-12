// components/messaging/MessagesPage.tsx
import { useEffect, useState, useCallback } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Search, Send, Plus, ArrowLeft } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

import { ConversationList } from "./ConversationList";
import { ChatWindow } from "./ChatWindow";
import { NewConversationModal } from "./NewConversationModal";
import { ErrorDisplay } from "../ErrorDisplay";

import { useErrorNotifications } from "../../lib/error-notifications";
import { useRealtimeMessages } from "../../hooks/useRealtimeMessages";
import { useDebouncedCallback } from "../../lib/useDebouncedCallback";

import {
  getConversations,
  getMessages,
  sendMessage,
  markMessagesRead,
  getUnreadCount,
  createConversation,
  getStaffMe,
  type Message as RPCMessage,
  type Conversation as RPCConversation,
} from "../../lib/rpc-client";

import {
  toUIConversation,
  toUIMessage,
  toId,
  CURRENT_USER_SENTINEL,
  type UIConversation as Conversation,
  type UIMessage as Message,
} from "../../lib/messaging-adapters";

import type { RealtimeMessageRow } from "../../lib/messaging-types";

export function MessagesPage() {
  const { user, loading: authLoading } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  const { showError, showErrorWithRetry } = useErrorNotifications();

  // Navigation function to return to dashboard
  const handleBackToDashboard = () => {
    try {
      window.history.pushState({}, '', '/');
      window.location.reload();
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  // Current user id for own-message mapping - wait for auth to complete
  useEffect(() => {
    if (!authLoading && user) {
      getStaffMe().then((me) => setCurrentUserId(me?.user_id)).catch(() => {});
    }
  }, [authLoading, user]);


  // Realtime handlers
  const handleNewMessage = (row: RealtimeMessageRow) => {
    const uiMsg: Message = {
      id: toId(row.id),
      text: row.body ?? "",
      timestamp: row.created_at,
      senderId: row.sender_id === currentUserId ? CURRENT_USER_SENTINEL : toId(row.sender_id),
      senderName: row.sender_name || "Unknown",
      read: row.sender_id === currentUserId,
    };

    if (selectedConversation && selectedConversation === toId(row.conversation_id)) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === uiMsg.id)) return prev;
        const next = [...prev, uiMsg].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return next;
      });
      markAsRead(selectedConversation).catch(console.error);
      setConversations((prev) => prev.map((c) => (c.id === selectedConversation ? { ...c, unreadCount: 0 } : c)));
    }

    // Keep list + global badges fresh
    loadConversations();
    loadUnreadCount();
  };

  // ✅ debounce background refreshes triggered by realtime
  const [debouncedRefresh, cancelRefresh] = useDebouncedCallback(
    () => loadConversations(false),
    150
  );

  const handleConversationUpdate = () => {
    cancelRefresh();
    debouncedRefresh();
  };

  const { isConnected } = useRealtimeMessages({
    conversationId: selectedConversation,
    onNewMessage: handleNewMessage,
    onConversationUpdate: handleConversationUpdate,
  });

  // Initial load - wait for auth to complete
  useEffect(() => {
    if (!authLoading && user) {
      loadConversations(true);
      loadUnreadCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // Load messages when a conversation is selected
  useEffect(() => {
    if (selectedConversation) loadMessages(selectedConversation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation, currentUserId]);

  // ✅ separate initial vs background loading to avoid flicker
  const loadConversations = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const data: RPCConversation[] = await getConversations();
      setConversations(data.map(toUIConversation));
    } catch (err) {
      console.error("Failed to load conversations:", err);
      setError(err);
      showErrorWithRetry(err, loadConversations, {
        title: "Failed to Load Conversations",
        showRecoveryActions: true,
      });
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const data: RPCMessage[] = await getMessages(conversationId);
      const transformed = data
        .map((m) => toUIMessage(m, currentUserId))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessages(transformed);

      await markAsRead(conversationId);
      loadUnreadCount();
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));
    } catch (err) {
      console.error("Failed to load messages:", err);
      showError(err, {
        title: "Failed to Load Messages",
        showRecoveryActions: true,
      });
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to load unread count:", err);
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      await markMessagesRead(conversationId);
      loadUnreadCount();
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));
    } catch (err) {
      console.error("Failed to mark messages as read:", err);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(toId(conversationId));
  };

  // ✅ optimistic send that reconciles temp -> server id
  const handleSendMessage = async (text: string) => {
    if (!selectedConversation || !text.trim()) return;
    const body = text.trim();
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      text: body,
      timestamp: new Date().toISOString(),
      senderId: CURRENT_USER_SENTINEL,
      senderName: "You",
      read: true,
    };
    setMessages(prev =>
      prev.some(m => m.id === tempId) ? prev :
        [...prev, optimistic].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    );
    try {
      const messageId = await sendMessage(selectedConversation, body);
      // ✅ replace the optimistic bubble with real one
      setMessages(prev => prev.map(m => (m.id === tempId ? { ...m, id: String(messageId) } : m)));
      await loadConversations(false); // background refresh; no skeleton flicker
    } catch (err) {
      console.error("Failed to send message:", err);
      showError(err, { title: "Failed to Send Message", showRecoveryActions: true });
    }
  };

  const handleCreateConversation = async (participants: string[], isGroup: boolean) => {
    try {
      console.log("onCreateConversation participants:", participants); // should be UUIDs, not emails
      const id = await createConversation(
        participants,
        isGroup ? "Group Chat" : undefined,
        isGroup ? "group" : "direct"
      );

      // optimistic: show the new convo instantly
      setConversations(prev => [
        {
          id: String(id),
          name: isGroup ? "Group Chat" : "Direct Message",
          type: isGroup ? "group" : "direct",
          participants: [],
          participantCount: isGroup ? participants.length + 1 : 2,
          lastMessage: undefined,
          unreadCount: 0,
          isOnline: false,
          isPinned: false,
        },
        ...prev,
      ]);

      await loadConversations();               // reconcile with server
      setSelectedConversation(String(id));     // focus it now
      setShowNewConversation(false);
    } catch (e) {
      console.error("createConversation failed:", e);
      throw e; // lets the modal show the error
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConv = conversations.find((c) => c.id === selectedConversation);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-2rem)] bg-background items-center justify-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-10 bg-muted rounded w-full"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-2rem)] bg-background items-center justify-center p-4">
        <ErrorDisplay
          error={error}
          title="Failed to Load Messages"
          onRetry={loadConversations}
          variant="card"
          showDetails={process.env.NODE_ENV === 'development'}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] bg-background min-h-0">
      {/* Sidebar */}
      <div className="w-80 border-r bg-card flex flex-col min-h-0 min-w-0 overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToDashboard}
                className="h-8 w-8 p-0 mr-2"
                title="Back to Dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2>Messages</h2>
              {unreadCount > 0 && <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>}
              <div
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
                title={isConnected ? "Connected" : "Disconnected"}
              />
            </div>
            <Button size="sm" onClick={() => setShowNewConversation(true)} className="h-8 w-8 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ConversationList
          conversations={filteredConversations}
          selectedId={selectedConversation}
          onSelect={handleSelectConversation}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1">
        {selectedConversation && selectedConv ? (
          <ChatWindow conversation={selectedConv} messages={messages} onSendMessage={handleSendMessage} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="h-8 w-8" />
              </div>
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        open={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        onCreateConversation={handleCreateConversation}
      />
    </div>
  );
}