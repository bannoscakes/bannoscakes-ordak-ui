import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { Search, Send, Plus, Pin, MoreVertical } from "lucide-react";
import { ConversationList } from "./ConversationList";
import { ChatWindow } from "./ChatWindow";
import { NewConversationModal } from "./NewConversationModal";

export interface Message {
  id: string;
  text: string;
  timestamp: string;
  senderId: string;
  senderName: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  name: string;
  type: "direct" | "group" | "broadcast";
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  isOnline?: boolean;
  isPinned?: boolean;
  avatar?: string;
}

export function MessagesPage() {
  // TODO: Replace with real data from API
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);

  // TODO: Implement real data fetching
  useEffect(() => {
    // This will be replaced with actual API calls
    // fetchConversations();
    // fetchMessages();
  }, []);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
    // TODO: Mark messages as read
    // markMessagesAsRead(conversationId);
  };

  const handleSendMessage = (text: string) => {
    if (!selectedConversation) return;
    
    // TODO: Implement real message sending
    // sendMessage(selectedConversation, text);
  };

  const handleCreateConversation = (participants: string[], isGroup: boolean) => {
    // TODO: Implement real conversation creation
    // createConversation(participants, isGroup);
    setShowNewConversation(false);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  return (
    <div className="flex h-[calc(100vh-2rem)] bg-background">
      {/* Conversations Sidebar */}
      <div className="w-80 border-r bg-card">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2>Messages</h2>
            <Button
              size="sm"
              onClick={() => setShowNewConversation(true)}
              className="h-8 w-8 p-0"
            >
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
          <ChatWindow
            conversation={selectedConv}
            messages={messages.filter(m => 
              // TODO: Filter messages by conversation
              true
            )}
            onSendMessage={handleSendMessage}
          />
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