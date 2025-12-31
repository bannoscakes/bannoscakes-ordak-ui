// components/MainDashboardMessaging.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
// import { ScrollArea } from "./ui/scroll-area"; // Removed - using native scroll
import { Search, Plus, MessageSquare, X } from "lucide-react";
import { cn } from "./ui/utils";
import { getAvatarColorHex } from "../lib/message-utils";

import { NewConversationModal } from "./messaging/NewConversationModal";
import { ErrorDisplay } from "./ErrorDisplay";
import { useErrorNotifications } from "../lib/error-notifications";
import { useRealtimeMessages } from "../hooks/useRealtimeMessages";
import { useOptimisticSendMessage } from "../hooks/useOptimisticSendMessage";

import {
  getConversations,
  getMessages,
  markMessagesRead,
  getUnreadCount,
  createConversation,
  getStaffMe,
  type Message as RPCMessage,
  type Conversation as RPCConversation,
} from "../lib/rpc-client";

import {
  toUIConversation,
  toUIMessage,
  toId,
  CURRENT_USER_SENTINEL,
  type UIConversation as Conversation,
  type UIMessage as Message,
  type DisplayMessage,
} from "../lib/messaging-adapters";

import type { RealtimeMessageRow } from "../lib/messaging-types";
import { ChatWindow } from "./messaging/ChatWindow";

interface MainDashboardMessagingProps {
  onClose?: () => void;
  initialConversationId?: string | null;
}

export function MainDashboardMessaging({ onClose, initialConversationId }: MainDashboardMessagingProps) {
  // Dialog mode is determined by presence of onClose callback (passed from AdminMessagingDialog)
  const isDialogMode = !!onClose;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(isDialogMode); // Force expanded in dialog mode
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  const { showError, showErrorWithRetry } = useErrorNotifications();

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

  // Handle initial conversation selection
  useEffect(() => {
    if (initialConversationId) {
      // Wait for conversations to load before setting selected conversation
      if (conversations.length > 0) {
        setSelectedConversation(initialConversationId);
        setIsExpanded(true);
      }
    } else if (!isDialogMode) {
      // Only reset to compact view if NOT in dialog mode
      setSelectedConversation(null);
      setIsExpanded(false);
    }
  }, [initialConversationId, conversations.length, isDialogMode]);

  // Realtime handlers
  const handleNewMessage = useCallback((row: RealtimeMessageRow) => {
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

    // ✅ Background updates - no loading spinner flicker
    loadConversations({ background: true });
    loadUnreadCount({ background: true });
  }, [currentUserId, selectedConversation, markAsRead, loadConversations, loadUnreadCount]);

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

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      setIsExpanded(true);
    }
  }, [selectedConversation, loadMessages]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(toId(conversationId));
    setIsExpanded(true);
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
      setIsExpanded(true);
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
    // Show two-column skeleton in dialog mode to match the expanded layout
    if (isDialogMode) {
      return (
        <div className="flex h-full overflow-hidden rounded-2xl border">
          {/* Sidebar skeleton */}
          <div className="w-72 min-w-[18rem] border-r bg-card p-4 animate-pulse">
            <div className="h-6 bg-muted rounded w-32 mb-4"></div>
            <div className="h-10 bg-muted rounded w-full mb-4"></div>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-3 bg-muted rounded w-32"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Chat area skeleton */}
          <div className="flex-1 bg-background p-4 animate-pulse flex flex-col">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b">
              <div className="h-10 w-10 bg-muted rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-3 bg-muted rounded w-16"></div>
              </div>
            </div>
            <div className="flex-1"></div>
            <div className="h-10 bg-muted rounded w-full mt-auto"></div>
          </div>
        </div>
      );
    }

    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-10 bg-muted rounded w-full"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <ErrorDisplay
          error={error}
          title="Failed to Load Messages"
          onRetry={loadConversations}
          variant="card"
          showDetails={process.env.NODE_ENV === 'development'}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Status and Actions Header - only show in non-dialog mode */}
      {!isDialogMode && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
              title={isConnected ? 'Connected' : 'Disconnected'}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setShowNewConversation(true)} className="h-10 w-10 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {!isExpanded ? (
        // Compact view - conversation list only
        <Card className="p-4">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="h-64 overflow-y-auto">
              <div className="space-y-2">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation.id)}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-accent/80 hover:shadow-sm transition-all"
                  >
                    <Avatar className="h-10 w-10">
                      {conversation.avatar && <AvatarImage src={conversation.avatar} />}
                      <AvatarFallback className="text-white font-medium" style={{ backgroundColor: getAvatarColorHex(conversation.name || "Unknown") }}>
                        {conversation.name?.trim()?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="truncate text-sm font-medium">{conversation.name}</h4>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.lastMessage?.text ?? "No messages yet"}
                      </p>
                    </div>
                  </div>
                ))}

                {filteredConversations.length === 0 && (
                  <div className="flex flex-col items-center justify-center text-center py-8 px-4">
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                      <MessageSquare className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No conversations yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Click + to start a new conversation</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      ) : (
        // Expanded view - full messaging interface
        <div className="flex w-full overflow-hidden rounded-2xl border flex-1 min-h-0">
          {/* Conversations Sidebar */}
          <aside className="flex-none w-72 min-w-[18rem] h-full border-r bg-card flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">Conversations</h4>
                  {/* Connection status - visible in both dialog and non-dialog expanded mode */}
                  <div
                    className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                    title={isConnected ? 'Connected' : 'Disconnected'}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setShowNewConversation(true)} className="h-10 w-10 p-0" aria-label="New conversation">
                    <Plus className="h-4 w-4" />
                  </Button>
                  {!isDialogMode && (
                    <Button size="sm" variant="ghost" onClick={() => setIsExpanded(false)} className="h-10 w-10 p-0" aria-label="Collapse messaging">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-2">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                      "hover:bg-accent/80 hover:shadow-sm",
                      selectedConversation === conversation.id ? "bg-accent shadow-sm" : "bg-transparent"
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      {conversation.avatar && <AvatarImage src={conversation.avatar} />}
                      <AvatarFallback className="text-white font-medium" style={{ backgroundColor: getAvatarColorHex(conversation.name || "Unknown") }}>
                        {conversation.name?.trim()?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="truncate text-sm">{conversation.name}</h4>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.lastMessage?.text ?? "No messages yet"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Chat Area */}
          <section className="flex-1 min-w-0 h-full bg-background flex flex-col">
            {selectedConversation && selectedConv ? (
              <ChatWindow conversation={selectedConv} messages={messages} onSendMessage={handleSendMessage} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-xs px-6">
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1">Select a conversation</h3>
                  <p className="text-sm text-muted-foreground">Choose a conversation to start messaging</p>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* New Conversation Modal */}
      <NewConversationModal
        open={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        onCreateConversation={handleCreateConversation}
      />
    </div>
  );
}