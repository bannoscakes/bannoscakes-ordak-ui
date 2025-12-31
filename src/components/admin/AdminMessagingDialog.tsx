import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MainDashboardMessaging } from "@/components/MainDashboardMessaging";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialConversationId?: string | null; // open a specific chat immediately
};

export function AdminMessagingDialog({ open, onOpenChange, initialConversationId }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent
        // Portal -> <body>, no Quick Actions constraints
        forceMount
        className="p-0 w-[92vw] max-w-[1280px] h-[80vh] max-h-[85vh] overflow-hidden rounded-2xl flex flex-col"
      >
        <DialogHeader className="px-4 py-3 border-b bg-white flex-shrink-0">
          <DialogTitle>Messages</DialogTitle>
        </DialogHeader>

        {/* Full-height, two-column layout - flex-1 fills remaining space */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <MainDashboardMessaging
            onClose={() => onOpenChange(false)}
            initialConversationId={initialConversationId ?? null}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
