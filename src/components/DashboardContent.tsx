import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { MetricCards } from "./MetricCards";
import { UnassignedStations } from "./UnassignedStations";
import { ProductionStatus } from "./ProductionStatus";
import { RecentOrders } from "./RecentOrders";
import { ProductionTimeline } from "./ProductionTimeline";
import { QuickActions } from "./QuickActions";
import { EquipmentStatus } from "./EquipmentStatus";
import type { StatsByStore } from "@/types/stage";

interface DashboardContentProps {
  stats?: StatsByStore;
  onRefresh?: () => Promise<void>;
}

export function DashboardContent({ stats, onRefresh }: DashboardContentProps) {
  const [activeStore, setActiveStore] = useState("bannos");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Production Overview</h1>
          <p className="text-sm text-muted-foreground">Monitor both store operations - Staff and Inventory available in sidebar</p>
        </div>
      </div>

      <Tabs value={activeStore} onValueChange={setActiveStore} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="bannos" className="font-medium">
            Bannos Store
          </TabsTrigger>
          <TabsTrigger value="flourlane" className="font-medium">
            Flourlane Store
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bannos" className="space-y-6 mt-6">
          <MetricCards store="bannos" />
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8 space-y-6">
              <UnassignedStations store="bannos" />
              <ProductionStatus store="bannos" />
              <RecentOrders store="bannos" />
            </div>
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <QuickActions store="bannos" />
              <ProductionTimeline store="bannos" />
              <EquipmentStatus store="bannos" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="flourlane" className="space-y-6 mt-6">
          <MetricCards store="flourlane" />
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8 space-y-6">
              <UnassignedStations store="flourlane" />
              <ProductionStatus store="flourlane" />
              <RecentOrders store="flourlane" />
            </div>
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <QuickActions store="flourlane" />
              <ProductionTimeline store="flourlane" />
              <EquipmentStatus store="flourlane" />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}