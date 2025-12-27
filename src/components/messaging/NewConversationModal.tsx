import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { getStaffMe } from "../../lib/rpc-client";
import { useStaffList } from "../../hooks/useSettingsQueries";
import { toId } from "../../lib/messaging-adapters";

interface StaffRow {
  user_id: string;   // MUST be UUID
  full_name: string;
  role: string;
  email?: string | null;
}

interface NewConversationModalProps {
  open: boolean;
  onClose: () => void;
  // Parent will do the actual RPC (your MessagesPage/MainDashboardMessaging already implements this)
  onCreateConversation: (participantIds: string[], isGroup: boolean) => Promise<void> | void;
}

export function NewConversationModal({ open, onClose, onCreateConversation }: NewConversationModalProps) {
  const [isGroup, setIsGroup] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch staff list using React Query (auto-refreshes on window focus)
  const { data: staffData = [], isLoading: loadingStaff, isError: isStaffError } = useStaffList();

  // Fetch current user when modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const fetchCurrentUser = async () => {
      try {
        const me = await getStaffMe();
        if (cancelled) return;

        const myUserId = toId(me?.user_id);
        setCurrentUserId(myUserId);

        if (!myUserId) {
          setErrorMsg("Unable to identify current user. Please refresh and try again.");
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to get current user:", e);
          setErrorMsg("Unable to identify current user. Please refresh and try again.");
        }
      }
    };

    fetchCurrentUser();
    return () => { cancelled = true; };
  }, [open]);

  // Map and filter staff data (exclude current user)
  const staff = useMemo((): StaffRow[] => {
    if (!currentUserId) return [];
    return staffData
      .filter(r => toId(r.user_id) !== currentUserId)
      .map(r => ({
        user_id: toId(r.user_id),
        full_name: r.full_name ?? "Unknown",
        role: r.role ?? "Staff",
        email: r.email ?? null
      }));
  }, [staffData, currentUserId]);

  // Client-side filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(s =>
      s.full_name.toLowerCase().includes(q) ||
      (s.email ?? "").toLowerCase().includes(q)
    );
  }, [search, staff]);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      // Guard: ensure we have current user ID
      if (!currentUserId) {
        setErrorMsg("Unable to identify current user. Please refresh and try again.");
        return;
      }

      // Extra guard: filter out current user from selected participants
      const ids = selected.filter(id => id !== currentUserId);
      
      // Guard: require exactly 1 participant for direct, >=2 for group (excluding self)
      if (!isGroup && ids.length !== 1) {
        setErrorMsg("Select exactly one person for a direct message.");
        return;
      }
      if (isGroup && ids.length < 2) {
        setErrorMsg("Select at least two people for a group.");
        return;
      }

      await onCreateConversation(ids, isGroup); // parent awaits RPC + selects convo
      setSelected([]); // clear only after success
      onClose();
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to create conversation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="md:max-w-[700px] max-h-[85vh] overflow-hidden">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">New Conversation</h2>
            <p className="text-sm text-muted-foreground">
              Start a direct message or group chat.
            </p>
          </div>

          {/* Type selector (optional - lock to Direct if you want) */}
          <div className="flex gap-4">
            <Button
              variant={!isGroup ? "default" : "outline"}
              onClick={() => setIsGroup(false)}
              size="sm"
            >
              Direct Message
            </Button>
            <Button
              variant={isGroup ? "default" : "outline"}
              onClick={() => setIsGroup(true)}
              size="sm"
            >
              Group Chat
            </Button>
          </div>

          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="border rounded-lg h-64 overflow-y-auto">
            {loadingStaff ? (
              <div className="p-4 text-sm text-muted-foreground">Loading staff…</div>
            ) : isStaffError ? (
              <div className="p-10 text-center text-destructive">Failed to load staff list</div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">No staff available</div>
            ) : (
              <ul className="divide-y">
                {filtered.map((s) => {
                  const checked = selected.includes(s.user_id);
                  return (
                    <li
                      key={s.user_id}
                      className="flex items-center gap-3 p-3 hover:bg-accent/40 cursor-pointer"
                      onClick={() => toggle(s.user_id)}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(s.user_id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{s.full_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {s.role}{s.email ? ` • ${s.email}` : ""}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {errorMsg && <div className="text-sm text-destructive">{errorMsg}</div>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (!isGroup && selected.filter(id => id !== currentUserId).length < 1) || (isGroup && selected.filter(id => id !== currentUserId).length < 2)}
            >
              {isSubmitting ? "Creating…" : "Create Conversation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}