import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { UserX } from "lucide-react";
import { useMemo } from "react";
import { useUnassignedCounts } from "../hooks/useDashboardQueries";
import { getStageColorParts } from "../lib/stage-colors";

interface UnassignedStationsProps {
  store: "bannos" | "flourlane";
}

interface Station {
  name: string;
  stage: string;
  count: number;
}

// Get color classes from stage-colors.ts (single source of truth)
const getColorClasses = (stageName: string) => {
  const parts = getStageColorParts(stageName);
  // Convert dot bg color (bg-blue-500) to text color (text-blue-500)
  const iconColor = parts.dot.replace("bg-", "text-");
  return {
    text: parts.text,
    icon: `${iconColor} dark:${iconColor.replace("-500", "-400")}`
  };
};

export function UnassignedStations({ store }: UnassignedStationsProps) {
  const { data, isLoading } = useUnassignedCounts(store);

  // Transform the RPC data to station format
  const { stations, totalUnassigned } = useMemo(() => {
    const defaultStations: Station[] = [
      { name: "Filling Unassigned", stage: "Filling", count: 0 },
      { name: "Covering Unassigned", stage: "Covering", count: 0 },
      { name: "Decorating Unassigned", stage: "Decorating", count: 0 },
      { name: "Packing Unassigned", stage: "Packing", count: 0 }
    ];

    if (!data) {
      return { stations: defaultStations, totalUnassigned: 0 };
    }

    const counts = {
      filling: data.find((d: { stage: string; count: number }) => d.stage === 'Filling')?.count || 0,
      covering: data.find((d: { stage: string; count: number }) => d.stage === 'Covering')?.count || 0,
      decorating: data.find((d: { stage: string; count: number }) => d.stage === 'Decorating')?.count || 0,
      packing: data.find((d: { stage: string; count: number }) => d.stage === 'Packing')?.count || 0
    };

    const stationData: Station[] = [
      { name: "Filling Unassigned", stage: "Filling", count: counts.filling },
      { name: "Covering Unassigned", stage: "Covering", count: counts.covering },
      { name: "Decorating Unassigned", stage: "Decorating", count: counts.decorating },
      { name: "Packing Unassigned", stage: "Packing", count: counts.packing }
    ];

    return {
      stations: stationData,
      totalUnassigned: stationData.reduce((total, station) => total + station.count, 0)
    };
  }, [data]);

  // Only show skeleton on initial load, not on refetch
  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-foreground text-base">
            Unassigned Tasks - {store === "bannos" ? "Bannos" : "Flourlane"}
          </h3>
          <p className="text-sm text-muted-foreground">Tasks waiting for staff assignment</p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {totalUnassigned} total
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {stations.map((station, index) => {
          const colors = getColorClasses(station.stage);
          
          return (
            <div key={index} className="p-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 bg-white/70 dark:bg-gray-950/70 md:backdrop-blur-sm border border-gray-200/50 dark:border-white/20">
              <div className="flex items-center justify-between mb-2">
                <UserX className={`h-4 w-4 ${colors.icon}`} />
                <span className={`text-sm font-medium ${colors.text}`}>{station.count}</span>
              </div>
              <div>
                <h4 className={`text-sm font-medium ${colors.text}`}>{station.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {station.count > 0 ? "Awaiting assignment" : "All assigned"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}