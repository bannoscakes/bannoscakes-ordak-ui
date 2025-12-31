// components/messaging/ChatWindow.tsx
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Send, MessageSquare } from "lucide-react";
import { cn } from "../ui/utils";
import type { UIConversation, DisplayMessage } from "../../lib/messaging-adapters";
import { CURRENT_USER_SENTINEL } from "../../lib/messaging-adapters";
import {
  groupMessagesByDate,
  getAvatarColorHex,
  shouldGroupWithPrevious,
  formatMessageTime,
} from "../../lib/message-utils";

interface ChatWindowProps {
  conversation: UIConversation;
  messages: DisplayMessage[];
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

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {/* Header */}
      <div className="p-4 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {conversation.avatar && <AvatarImage src={conversation.avatar} />}
            <AvatarFallback className="text-white font-medium" style={{ backgroundColor: getAvatarColorHex(conversation.name || "Unknown") }}>
              {conversation.name?.trim()?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
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
      <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden bg-background">
        <div className="px-4 py-6">
          {messageGroups.length > 0 ? (
            messageGroups.map((group) => (
              <div key={group.date} className="space-y-1">
                {/* Date separator */}
                <div className="flex items-center justify-center py-4">
                  <span className="px-3 py-1 text-xs font-medium text-muted-foreground bg-muted/50 dark:bg-muted/30 rounded-full">
                    {group.label}
                  </span>
                </div>

                {/* Messages in this group */}
                {group.messages.map((m, idx) => {
                  const isOwn = m.senderId === CURRENT_USER_SENTINEL;
                  const prevMsg = idx > 0 ? group.messages[idx - 1] : undefined;
                  const isGrouped = shouldGroupWithPrevious(m, prevMsg);

                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex gap-2",
                        isOwn ? "justify-end" : "justify-start",
                        isGrouped ? "mt-0.5" : "mt-3"
                      )}
                    >
                      {/* Avatar (only for received, not grouped) */}
                      {!isOwn && (
                        <div className="w-8 flex-shrink-0">
                          {!isGrouped && (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback
                                className="text-white text-xs font-medium"
                                style={{ backgroundColor: getAvatarColorHex(m.senderName || "") }}
                              >
                                {m.senderName?.charAt(0)?.toUpperCase() ?? "?"}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}

                      {/* Message bubble */}
                      <div className={cn("flex flex-col", isOwn ? "items-end" : "items-start", "max-w-[70%]")}>
                        {/* Sender name (only for received, not grouped) */}
                        {!isOwn && !isGrouped && (
                          <span className="text-xs text-muted-foreground mb-1 ml-1">
                            {m.senderName || "Unknown"}
                          </span>
                        )}

                        {/* Bubble */}
                        <div
                          className={cn(
                            "break-words text-sm px-4 py-2.5 shadow-sm transition-shadow hover:shadow-md rounded-full",
                            isOwn
                              ? "bg-blue-500 text-white"
                              : "bg-muted dark:bg-muted/80"
                          )}
                        >
                          <p className="whitespace-pre-wrap">{m.text}</p>
                        </div>

                        {/* Timestamp (outside bubble for cleaner look) */}
                        {!isGrouped && (
                          <span className="text-[10px] text-muted-foreground mt-1 px-1">
                            {formatMessageTime(m.timestamp)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-64 text-center px-8">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="font-medium text-foreground mb-1">No messages yet</h3>
              <p className="text-sm text-muted-foreground">Send a message to start the conversation</p>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-background/80 backdrop-blur-sm">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Input
              placeholder="Type a message..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              className="rounded-full bg-muted/50 border-0 focus-visible:ring-1 px-4"
            />
          </div>
          <Button
            onClick={send}
            disabled={!draft.trim()}
            size="icon"
            className="h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-muted disabled:text-muted-foreground"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
