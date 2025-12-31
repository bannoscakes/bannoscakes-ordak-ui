import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MainDashboardMessaging } from "@/components/MainDashboardMessaging";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialConversationId?: string | null; // open a specific chat immediately
};

export function AdminMessagingDialog({ open, onOpenChange, initialConversationId }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        Key insight: MainDashboardMessaging has h-full on root div.
        - In Staff Workspace: TabsContent has NO height → h-full has no effect → h-64 Card works
        - In Dialog: We must NOT give it a height context, so h-full has no effect
        Using h-auto wrapper breaks the height chain from DialogContent's grid/max-h-[85vh]
      */}
      <DialogContent className="sm:max-w-3xl">
        <div className="h-auto">
          <MainDashboardMessaging
            onClose={() => onOpenChange(false)}
            initialConversationId={initialConversationId ?? null}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
