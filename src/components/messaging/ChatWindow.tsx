// components/messaging/ChatWindow.tsx
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
// ❌ remove: import { ScrollArea } from "../ui/scroll-area";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Send } from "lucide-react";
import type { UIConversation, UIMessage } from "../../lib/messaging-adapters";
import { CURRENT_USER_SENTINEL } from "../../lib/messaging-adapters";

interface ChatWindowProps {
  conversation: UIConversation;
  messages: UIMessage[];
  onSendMessage: (message: string) => void;
}

export function ChatWindow({ conversation, messages, onSendMessage }: ChatWindowProps) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, conversation.id]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    onSendMessage(text);
    setDraft("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={conversation.avatar} />
            <AvatarFallback>{conversation.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{conversation.name}</h3>
            <p className="text-xs text-muted-foreground">
              {conversation.type === "group"
                ? `${conversation.participantCount ?? conversation.participants.length} members`
                : "Direct message"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages (native scroll) */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden">
        <div className="p-4 space-y-3">
          {messages.map((m) => {
            const isOwn = m.senderId === CURRENT_USER_SENTINEL;
            return (
              <div key={m.id} className={`flex gap-3 ${isOwn ? "justify-end" : "justify-start"}`}>
                {!isOwn && (
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>{m.senderName?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[70%] break-words rounded-lg p-3 text-sm ${isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {!isOwn && <p className="text-xs opacity-70 mb-1">{m.senderName || "Unknown"}</p>}
                  <p>{m.text}</p>
                  <p className={`text-xs mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                  </p>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1"
          />
          <Button onClick={send} disabled={!draft.trim()} size="sm">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}