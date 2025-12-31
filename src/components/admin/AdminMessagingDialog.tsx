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
        className="p-0 overflow-hidden rounded-2xl flex flex-col"
        style={{ width: '800px', maxWidth: '90vw', height: '500px', maxHeight: '60vh' }}
      >
        <DialogHeader className="px-4 py-3 border-b bg-white">
          <DialogTitle>Messages</DialogTitle>
        </DialogHeader>

        {/* Full-height messaging content */}
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
