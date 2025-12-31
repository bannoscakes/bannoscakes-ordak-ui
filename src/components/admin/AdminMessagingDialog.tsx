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
        // IMPORTANT: Inline styles used intentionally - Tailwind class merging in cn() prevents
        // height/width classes from overriding base dialog.tsx styles due to CSS specificity.
        // Do not refactor to Tailwind classes without testing thoroughly.
        forceMount
        className="p-0 overflow-hidden rounded-2xl flex flex-col"
        style={{ width: '800px', maxWidth: '90vw', minWidth: '600px', height: '600px', maxHeight: '80vh' }}
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
