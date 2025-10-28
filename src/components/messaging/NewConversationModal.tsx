import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { getStaffList, getStaffMe } from "../../lib/rpc-client";
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
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load staff once when opened (or when search changes if you support server-side filtering)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      setLoadingStaff(true);
      setErrorMsg(null);
      try {
        // Get current user and staff list in parallel with better error handling
        const [me, rows] = await Promise.allSettled([
          getStaffMe(),
          getStaffList(null, true)
        ]);

        if (cancelled) return;

        const currentUser = me.status === "fulfilled" ? me.value : null;
        const list = rows.status === "fulfilled" ? rows.value : [];

        const myUserId = toId(currentUser?.user_id);
        setCurrentUserId(myUserId);

        // If we couldn't get current user, show error and prevent conversation creation
        if (!myUserId) {
          setErrorMsg("Unable to identify current user. Please refresh and try again.");
          return;
        }

        // Map to a shape with user_id (UUID) — DO NOT pass email here
        // EXCLUDE current user from the list
        const mapped = (list || [])
          .filter((r: any) => toId(r.user_id) !== myUserId) // Exclude self
          .map((r: any) => ({
            user_id: toId(r.user_id),
            full_name: r.full_name ?? "Unknown",
            role: r.role ?? "Staff",
            email: r.email ?? null
          })) as StaffRow[];
        setStaff(mapped);
      } catch (e: any) {
        if (!cancelled) {
          console.error("Staff load error:", e);
          setErrorMsg(e?.message ?? "Failed to load staff");
          setStaff([]);
        }
      } finally {
        if (!cancelled) setLoadingStaff(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [open]);

  // Auto-refresh staff list when window regains focus
  useEffect(() => {
    if (!open) return;
    
    const onFocus = () => {
      // Reload staff on window focus if modal is open
      const run = async () => {
        try {
          const [me, rows] = await Promise.allSettled([
            getStaffMe(),
            getStaffList(null, true)
          ]);

          const currentUser = me.status === "fulfilled" ? me.value : null;
          const list = rows.status === "fulfilled" ? rows.value : [];

          const myUserId = toId(currentUser?.user_id);
          setCurrentUserId(myUserId);

          const mapped = (list || [])
            .filter((r: any) => toId(r.user_id) !== myUserId)
            .map((r: any) => ({
              user_id: toId(r.user_id),
              full_name: r.full_name ?? "Unknown",
              role: r.role ?? "Staff",
              email: r.email ?? null
            })) as StaffRow[];
          setStaff(mapped);
        } catch (e) {
          console.error("Staff refresh error:", e);
        }
      };
      run();
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [open]);

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

      // DEBUG: make sure we pass UUIDs (and no self)
      console.log("Creating conversation with IDs:", ids);
      console.log("Current user ID (excluded):", currentUserId);

      await onCreateConversation(ids, isGroup); // parent awaits RPC + selects convo
      setSelected([]); // clear only after success
      onClose();
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to create conversation");
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