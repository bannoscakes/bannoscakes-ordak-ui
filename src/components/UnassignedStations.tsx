import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { UserX } from "lucide-react";
import { useMemo } from "react";
import { useUnassignedCounts } from "../hooks/useDashboardQueries";

interface UnassignedStationsProps {
  store: "bannos" | "flourlane";
}

interface Station {
  name: string;
  count: number;
  color: string;
}

const getColorClasses = (color: string) => {
  const colorMap = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-950",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-700 dark:text-blue-300",
      icon: "text-blue-500 dark:text-blue-400"
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-950",
      border: "border-purple-200 dark:border-purple-800",
      text: "text-purple-700 dark:text-purple-300",
      icon: "text-purple-500 dark:text-purple-400"
    },
    pink: {
      bg: "bg-pink-50 dark:bg-pink-950",
      border: "border-pink-200 dark:border-pink-800",
      text: "text-pink-700 dark:text-pink-300",
      icon: "text-pink-500 dark:text-pink-400"
    },
    orange: {
      bg: "bg-orange-50 dark:bg-orange-950",
      border: "border-orange-200 dark:border-orange-800",
      text: "text-orange-700 dark:text-orange-300",
      icon: "text-orange-500 dark:text-orange-400"
    }
  };
  return colorMap[color as keyof typeof colorMap];
};

export function UnassignedStations({ store }: UnassignedStationsProps) {
  const { data, isLoading } = useUnassignedCounts(store);

  // Transform the RPC data to station format
  const { stations, totalUnassigned } = useMemo(() => {
    const defaultStations: Station[] = [
      { name: "Filling Unassigned", count: 0, color: "blue" },
      { name: "Covering Unassigned", count: 0, color: "purple" },
      { name: "Decoration Unassigned", count: 0, color: "pink" },
      { name: "Packing Unassigned", count: 0, color: "orange" }
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
      { name: "Filling Unassigned", count: counts.filling, color: "blue" },
      { name: "Covering Unassigned", count: counts.covering, color: "purple" },
      { name: "Decoration Unassigned", count: counts.decorating, color: "pink" },
      { name: "Packing Unassigned", count: counts.packing, color: "orange" }
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
          const colors = getColorClasses(station.color);
          
          return (
            <div key={index} className={`p-3 border-2 ${colors.border} ${colors.bg} rounded-lg hover:shadow-sm transition-all duration-200`}>
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