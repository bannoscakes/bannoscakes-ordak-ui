import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ClipboardList } from "lucide-react";
import { OrdersListView } from "./OrdersListView";

export function OrdersPage() {
  const [activeStore, setActiveStore] = useState<"bannos" | "flourlane">("bannos");

  return (
    <div className="p-6 space-y-6">
      {/* Header - matches DashboardContent pattern */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-medium text-foreground">Orders</h1>
            <p className="text-sm text-muted-foreground">View and manage all orders</p>
          </div>
        </div>
      </div>

      {/* Store selector - pill tabs like Dashboard */}
      <Tabs value={activeStore} onValueChange={(v) => setActiveStore(v as "bannos" | "flourlane")} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="bannos" className="font-medium">
            Bannos Store
          </TabsTrigger>
          <TabsTrigger value="flourlane" className="font-medium">
            Flourlane Store
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bannos" className="mt-6">
          <OrdersListView store="bannos" />
        </TabsContent>

        <TabsContent value="flourlane" className="mt-6">
          <OrdersListView store="flourlane" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
