// components/messaging/MessagesPage.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Search, Plus, ArrowLeft, MessageSquare } from "lucide-react";

import { ConversationList } from "./ConversationList";
import { ChatWindow } from "./ChatWindow";
import { NewConversationModal } from "./NewConversationModal";
import { ErrorDisplay } from "../ErrorDisplay";
import { safePushState } from "../../lib/safeNavigate";

import { useErrorNotifications } from "../../lib/error-notifications";
import { useRealtimeMessages } from "../../hooks/useRealtimeMessages";
import { useRealtimeMessageHandler } from "../../hooks/useRealtimeMessageHandler";
import { useOptimisticSendMessage } from "../../hooks/useOptimisticSendMessage";

import {
  getConversations,
  getMessages,
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
  type UIConversation as Conversation,
  type DisplayMessage,
} from "../../lib/messaging-adapters";

export function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  const { showError, showErrorWithRetry } = useErrorNotifications();

  // Current user id for own-message mapping
  useEffect(() => {
    getStaffMe().then((me) => setCurrentUserId(me?.user_id)).catch(() => {});
  }, []);

  // Load unread count - wrapped in useCallback
  const loadUnreadCount = useCallback(async (_opts?: { background?: boolean }) => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to load unread count:", err);
      // Silently fail on background updates to avoid disrupting UX
    }
  }, []);

  // Load conversations - wrapped in useCallback
  const loadConversations = useCallback(async (opts?: { background?: boolean }) => {
    try {
      if (!opts?.background) {
        setLoading(true);
        setError(null);
      }
      const data: RPCConversation[] = await getConversations();
      setConversations(data.map(toUIConversation));
    } catch (err) {
      console.error("Failed to load conversations:", err);
      if (!opts?.background) {
        setError(err);
        showErrorWithRetry(err, () => loadConversations(), {
          title: "Failed to Load Conversations",
          showRecoveryActions: true,
        });
      }
    } finally {
      if (!opts?.background) {
        setLoading(false);
      }
    }
  }, [showErrorWithRetry]);

  // Track selected conversation to prevent stale updates
  const selectedConversationRef = useRef<string | null>(null);
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Mark messages as read
  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      await markMessagesRead(conversationId);
      loadUnreadCount({ background: true });
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));
    } catch (err) {
      console.error("Failed to mark messages as read:", err);
    }
  }, [loadUnreadCount]);

  // Load messages - wrapped in useCallback
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const data: RPCMessage[] = await getMessages(conversationId);
      const transformed = data
        .map((m) => toUIMessage(m, currentUserId))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Only update if user hasn't switched conversations
      if (selectedConversationRef.current === conversationId) {
        setMessages(transformed);
        await markAsRead(conversationId);
        setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
      showError(err, {
        title: "Failed to Load Messages",
        showRecoveryActions: true,
      });
    }
  }, [currentUserId, showError, markAsRead]);

  // Realtime message handler - extracted to shared hook
  const handleNewMessage = useRealtimeMessageHandler({
    selectedConversationRef,
    currentUserId,
    setMessages,
    setConversations,
    markAsRead,
    loadConversations,
    loadUnreadCount,
  });

  // Debounced loadConversations to prevent excessive calls
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleConversationUpdate = useCallback(() => {
    // Clear any existing timeout
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    // Set new timeout
    debounceTimerRef.current = setTimeout(() => {
      loadConversations({ background: true });
    }, 150);
  }, [loadConversations]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const { isConnected } = useRealtimeMessages({
    conversationId: selectedConversation,
    onNewMessage: handleNewMessage,
    onConversationUpdate: handleConversationUpdate,
  });

  // Initial load
  useEffect(() => {
    loadConversations();
    loadUnreadCount();
  }, [loadConversations, loadUnreadCount]);

  // Load messages when a conversation is selected
  useEffect(() => {
    if (selectedConversation) loadMessages(selectedConversation);
  }, [selectedConversation, loadMessages]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(toId(conversationId));
  };

  const handleSendMessage = useOptimisticSendMessage({
    selectedConversation,
    currentUserId,
    setMessages,
    onSuccess: () => {
      loadConversations({ background: true });
      loadUnreadCount({ background: true });
    },
    onError: (err) => {
      showError(err, {
        title: "Failed to Send Message",
        showRecoveryActions: true,
      });
    },
  });

  const handleCreateConversation = async (participants: string[], isGroup: boolean) => {
    try {
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
    <div className="flex h-[calc(100vh-2rem)] bg-background min-h-0 overflow-hidden">
      {/* Sidebar */}
      <div className="flex-none w-72 min-w-[18rem] md:w-80 md:min-w-[20rem] border-r bg-card flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => safePushState('/')}
                className="h-10 w-10 p-0 mr-2"
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
            <Button size="sm" onClick={() => setShowNewConversation(true)} className="h-10 w-10 p-0">
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
      <div className="flex-1 min-w-0">
        {selectedConversation && selectedConv ? (
          <ChatWindow conversation={selectedConv} messages={messages} onSendMessage={handleSendMessage} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm px-6">
              <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="h-10 w-10 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Select a conversation</h3>
              <p className="text-sm text-muted-foreground">Choose a conversation from the sidebar or start a new one to begin messaging</p>
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