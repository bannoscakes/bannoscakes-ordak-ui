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
        className="p-0 w-[92vw] max-w-[1280px] h-[80vh] max-h-[85vh] overflow-hidden rounded-2xl"
      >
        <DialogHeader className="px-4 py-3 border-b bg-white">
          <DialogTitle>Messages</DialogTitle>
        </DialogHeader>

        {/* Full-height, two-column layout */}
        <div className="h-[calc(80vh-56px)]">
          <MainDashboardMessaging 
            onClose={() => onOpenChange(false)}
            initialConversationId={initialConversationId ?? null}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
