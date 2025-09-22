import { UnassignedStations } from "./UnassignedStations";
import { ProductionStatus } from "./ProductionStatus";
import { QueueTable } from "./QueueTable";
import { MetricCards } from "./MetricCards";
import { ProductionTimeline } from "./ProductionTimeline";
import { StaffOverview } from "./StaffOverview";

interface FlourlaneProductionPageProps {
  initialFilter?: string | null;
  stats?: Record<string, number>;
  onRefresh?: () => Promise<void>;
}

export function FlourlaneProductionPage({ initialFilter, stats, onRefresh }: FlourlaneProductionPageProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Flourlane Production</h1>
          <p className="text-sm text-muted-foreground">
            Cake shop production management
            {initialFilter === 'unassigned' && ' - Unassigned Orders'}
          </p>
        </div>
      </div>

      <MetricCards store="flourlane" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <UnassignedStations store="flourlane" />
          <ProductionStatus store="flourlane" />
          <QueueTable store="flourlane" initialFilter={initialFilter} />
        </div>
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <StaffOverview />
          <ProductionTimeline store="flourlane" />
        </div>
      </div>
    </div>
  );
}