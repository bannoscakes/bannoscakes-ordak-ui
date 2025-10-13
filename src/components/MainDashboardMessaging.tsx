// components/MainDashboardMessaging.tsx
import { useState, useEffect, useCallback } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
// import { ScrollArea } from "./ui/scroll-area"; // Removed - using native scroll
import { Search, Plus, MessageSquare, X } from "lucide-react";

import { NewConversationModal } from "./messaging/NewConversationModal";
import { ErrorDisplay } from "./ErrorDisplay";
import { useErrorNotifications } from "../lib/error-notifications";
import { useRealtimeMessages } from "../hooks/useRealtimeMessages";

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
} from "../lib/rpc-client";

import {
  toUIConversation,
  toUIMessage,
  toId,
  CURRENT_USER_SENTINEL,
  type UIConversation as Conversation,
  type UIMessage as Message,
} from "../lib/messaging-adapters";

import type { Message as BaseMessage } from "../types/messages";
import { isOptimistic } from "../features/messages/utils";

import type { RealtimeMessageRow } from "../lib/messaging-types";
import { ChatWindow } from "./messaging/ChatWindow";

interface MainDashboardMessagingProps {
  onClose?: () => void;
}

export function MainDashboardMessaging({ onClose }: MainDashboardMessagingProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  const { showError, showErrorWithRetry } = useErrorNotifications();

  useEffect(() => {
    getStaffMe().then((me) => setCurrentUserId(me?.user_id)).catch(() => {});
  }, []);

  // Realtime
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

    // ✅ Background updates - no loading spinner flicker
    loadConversations({ background: true });
    loadUnreadCount({ background: true });
  };

  // Debounced loadConversations to prevent excessive calls
  const debouncedLoadConversations = useCallback(() => {
    const timeoutId = setTimeout(() => {
      // ✅ Background updates - no loading spinner flicker
      loadConversations({ background: true });
    }, 150);
    return () => clearTimeout(timeoutId);
  }, []);

  const handleConversationUpdate = () => {
    debouncedLoadConversations();
  };

  const { isConnected } = useRealtimeMessages({
    conversationId: selectedConversation,
    onNewMessage: handleNewMessage,
    onConversationUpdate: handleConversationUpdate,
  });

  // Initial
  useEffect(() => {
    loadConversations();
    loadUnreadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      setIsExpanded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation, currentUserId]);

  const loadConversations = async (opts?: { background?: boolean }) => {
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
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const data: RPCMessage[] = await getMessages(conversationId);
      const transformed = data
        .map((m) => toUIMessage(m, currentUserId))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessages(transformed);

      await markAsRead(conversationId);
      // Note: markAsRead already calls loadUnreadCount with background: true
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));
    } catch (err) {
      console.error("Failed to load messages:", err);
      showError(err, {
        title: "Failed to Load Messages",
        showRecoveryActions: true,
      });
    }
  };

  const loadUnreadCount = async (opts?: { background?: boolean }) => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to load unread count:", err);
      // Silently fail on background updates to avoid disrupting UX
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      await markMessagesRead(conversationId);
      // ✅ Background update - no loading spinner flicker
      loadUnreadCount({ background: true });
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));
    } catch (err) {
      console.error("Failed to mark messages as read:", err);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(toId(conversationId));
    setIsExpanded(true);
  };

  const handleSendMessage = async (text: string) => {
    if (!selectedConversation || !text.trim()) return;
    const body = text.trim();

    // 1. Optimistic bubble - show message instantly
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      text: body,
      timestamp: new Date().toISOString(),
      senderId: CURRENT_USER_SENTINEL,
      senderName: "You",
      read: true,
    };

    setMessages((prev) => {
      if (prev.some((m) => m.id === tempId)) return prev;
      return [...prev, optimistic].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    });

    try {
      // 2. RPC call
      const messageId = await sendMessage(selectedConversation, body);

      // 3. Update last message preview
      await loadConversations();
      setConversations((prev) => prev.map((c) => (c.id === selectedConversation ? { ...c, unreadCount: 0 } : c)));
    } catch (err) {
      console.error("Failed to send message:", err);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      showError(err, {
        title: "Failed to Send Message",
        showRecoveryActions: true,
      });
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
    <div className="space-y-4">
      {/* Status and Actions Header */}
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
          <Button size="sm" onClick={() => setShowNewConversation(true)} className="h-8 w-8 p-0">
            <Plus className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

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
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={conversation.avatar} />
                      <AvatarFallback>
                        {conversation.name.charAt(0).toUpperCase()}
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
                  <div className="text-center text-muted-foreground py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No conversations yet</p>
                    <p className="text-xs">Click + to start a new conversation</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      ) : (
        // Expanded view - full messaging interface
        <div className="grid grid-cols-12 gap-4 h-[70vh] min-h-0">
          {/* Conversations Sidebar */}
          <div className="col-span-4 border rounded-lg bg-card flex flex-col min-h-0 min-w-0 overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Conversations</h4>
                <Button size="sm" variant="ghost" onClick={() => setIsExpanded(false)} className="h-6 w-6 p-0">
                  <X className="h-4 w-4" />
                </Button>
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
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                      selectedConversation === conversation.id ? 'bg-accent' : ''
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={conversation.avatar} />
                      <AvatarFallback>{conversation.name.charAt(0).toUpperCase()}</AvatarFallback>
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
          </div>

          {/* Chat Area */}
          <div className="col-span-8 border rounded-lg bg-card flex flex-col min-h-0 min-w-0">
            {selectedConversation && selectedConv ? (
              <ChatWindow conversation={selectedConv} messages={messages} onSendMessage={handleSendMessage} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-8 w-8 mx-auto mb-4 opacity-50" />
                  <h3>Select a conversation</h3>
                  <p className="text-sm">Choose a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
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