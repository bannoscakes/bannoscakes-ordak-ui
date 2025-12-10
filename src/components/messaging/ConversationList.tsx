// components/messaging/ConversationList.tsx
import { useMemo, useCallback } from "react";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Pin, MessageSquare } from "lucide-react";
import { cn } from "../ui/utils";
import { getAvatarColorHex } from "../../lib/message-utils";
import type { UIConversation as Conversation } from "../../lib/messaging-adapters";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversationId: string) => void;
}

export function ConversationList({ 
  conversations, 
  selectedId, 
  onSelect 
}: ConversationListProps) {

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    let diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) diffMs = 0;

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "now";
    if (diffHours < 1) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  // Sort: pinned first, then unread, then by lastMessage recency desc, then name asc
  const ordered = useMemo(() => {
    const score = (c: Conversation) => {
      const pinnedScore = c.isPinned ? 1 : 0;
      const unreadScore = c.unreadCount > 0 ? 1 : 0;
      const ts = c.lastMessage?.timestamp ? new Date(c.lastMessage.timestamp).getTime() : 0;
      return { pinnedScore, unreadScore, ts };
    };
    return [...conversations].sort((a, b) => {
      const sa = score(a), sb = score(b);
      if (sa.pinnedScore !== sb.pinnedScore) return sb.pinnedScore - sa.pinnedScore;
      if (sa.unreadScore !== sb.unreadScore) return sb.unreadScore - sa.unreadScore;
      if (sa.ts !== sb.ts) return sb.ts - sa.ts;
      return a.name.localeCompare(b.name);
    });
  }, [conversations]);

  const handleClick = useCallback((id: string) => onSelect(id), [onSelect]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(id);
    }
  }, [onSelect]);

  if (ordered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center px-6">
        <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <MessageSquare className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No conversations yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Start a new conversation to begin
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" role="listbox" aria-label="Conversations">
      <div className="p-2">
        {ordered.map((conversation) => {
          const isSelected = selectedId === conversation.id;
          const firstLetter = conversation.name?.trim()?.charAt(0)?.toUpperCase() || "?";
          const lastTs = conversation.lastMessage?.timestamp;
          return (
            <div
              key={conversation.id}
              role="option"
              aria-selected={isSelected}
              tabIndex={0}
              onClick={() => handleClick(conversation.id)}
              onKeyDown={(e) => handleKeyDown(e, conversation.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                "hover:bg-accent/80 hover:shadow-sm",
                isSelected ? "bg-accent shadow-sm" : "bg-transparent"
              )}
            >
              <Avatar className="h-12 w-12">
                {conversation.avatar && <AvatarImage src={conversation.avatar} />}
                <AvatarFallback className="text-white font-medium" style={{ backgroundColor: getAvatarColorHex(conversation.name || "Unknown") }}>
                  {firstLetter}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 min-w-0">
                    <h4
                      className={`truncate ${conversation.unreadCount > 0 ? "font-semibold" : ""}`}
                      title={conversation.name}
                    >
                      {conversation.name}
                    </h4>
                    {conversation.isPinned && <Pin className="h-3 w-3 text-muted-foreground shrink-0" />}
                    {conversation.isOnline && (
                      <div className="w-2 h-2 bg-green-500 rounded-full shrink-0" title="Online" />
                    )}
                  </div>
                  {lastTs && (
                    <span className="text-xs text-muted-foreground shrink-0" title={new Date(lastTs).toLocaleString()}>
                      {formatTimestamp(lastTs)}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.lastMessage?.text ?? "No messages yet"}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] text-xs shrink-0" title={`${conversation.unreadCount} unread`}>
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}